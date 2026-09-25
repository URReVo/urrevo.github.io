import Combine
import Foundation

@MainActor
final class ClassicGameModel: ObservableObject {
    enum Phase: Equatable {
        case setup
        case intro
        case handoff
        case role
        case discussion
        case result
    }

    @Published var phase: Phase = .setup
    @Published var players: [PlayerDraft]
    @Published var selectedCategories: Set<String>
    @Published var hintEnabled: Bool
    @Published var timerSeconds: Int
    @Published var timerRemaining = 0
    @Published var timerPaused = false
    @Published var round = 0
    @Published var activeIndex = 0
    @Published var errorMessage: String?

    let payload: ClassicPayload
    let categories: [ContentCategory]

    private let store: AppStore
    private var deckProgress: [String: [String]]
    private var currentWord: ClassicWord?
    private var impostorIndex = 0
    private var discussionStarterIndex = 0
    private var impostorSessionCounts: [Int] = []
    private var impostorRecent: [Int] = []
    private var runId = "run_" + UUID().uuidString.lowercased()
    private var introTask: Task<Void, Never>?
    private var timer: Timer?

    init(repository: ContentRepository, store: AppStore) {
        self.store = store

        do {
            let loaded = try repository.classic()
            payload = loaded
            categories = Self.buildCategories(loaded.items)
        } catch {
            payload = ClassicPayload(schemaVersion: 1, game: "classic", count: 0, items: [])
            categories = []
            errorMessage = error.localizedDescription
        }

        deckProgress = GameStorage.load("classic.deck.v1", as: [String: [String]].self, default: [:])
        let storedCategories = GameStorage.load("classic.categories.v1", as: [String].self, default: ["Alle"])
        selectedCategories = Set(storedCategories.isEmpty ? ["Alle"] : storedCategories)
        hintEnabled = GameStorage.load("classic.hint.v1", as: Bool.self, default: true)
        let timerValue = GameStorage.load("classic.timer.v1", as: Int.self, default: 0)
        timerSeconds = Self.timerOptions.contains(timerValue) ? timerValue : 0

        let snapshot = GameStorage.load(
            "classic.players.v1",
            as: GamePlayerSnapshot.self,
            default: GamePlayerSnapshot(players: [])
        )
        if snapshot.players.count >= 3 {
            players = Array(snapshot.players.prefix(12))
        } else {
            players = Self.drafts(from: store.preferredPlayers(limit: 3), count: 3)
        }

        if let preset = store.consumeLaunchPreset(for: "classic") {
            let count = min(12, max(3, preset.playerCount))
            selectedCategories = Set(preset.categories.isEmpty ? ["Alle"] : preset.categories)
            hintEnabled = preset.hint
            timerSeconds = Self.timerOptions.contains(preset.timer) ? preset.timer : 0
            players = Self.drafts(from: store.preferredPlayers(limit: count), count: count)
        }

        if let group = store.consumeLaunchGroup(), !group.isEmpty {
            let count = min(12, max(3, group.count))
            players = Self.drafts(from: group, count: count)
        }

        normalizeSelection()
        saveSetup()
    }

    static let timerOptions = [0, 60, 90, 120, 150, 180, 210, 240, 270, 300]

    var current: ClassicWord? { currentWord }
    var currentPlayer: PlayerDraft? { players.indices.contains(activeIndex) ? players[activeIndex] : nil }
    var currentIsImpostor: Bool { activeIndex == impostorIndex }
    var impostor: PlayerDraft? { players.indices.contains(impostorIndex) ? players[impostorIndex] : nil }
    var discussionStarter: PlayerDraft? { players.indices.contains(discussionStarterIndex) ? players[discussionStarterIndex] : nil }

    var availableCount: Int {
        payload.items.filter { categoryAllowed($0.cat) }.count
    }

    var timerLabel: String {
        Self.timerLabel(timerSeconds)
    }

    var remainingLabel: String {
        Self.timerLabel(timerRemaining)
    }

    func saveSetup() {
        GameStorage.save(GamePlayerSnapshot(players: players), suffix: "classic.players.v1")
        GameStorage.save(Array(selectedCategories), suffix: "classic.categories.v1")
        GameStorage.save(hintEnabled, suffix: "classic.hint.v1")
        GameStorage.save(timerSeconds, suffix: "classic.timer.v1")
    }

    func categoriesChanged() {
        normalizeSelection()
        GameStorage.save(Array(selectedCategories), suffix: "classic.categories.v1")
        feedbackSelection()
    }

    func setHint(_ enabled: Bool) {
        hintEnabled = enabled
        GameStorage.save(enabled, suffix: "classic.hint.v1")
        feedbackSelection()
    }

    func setTimer(_ seconds: Int) {
        guard Self.timerOptions.contains(seconds) else { return }
        timerSeconds = seconds
        GameStorage.save(seconds, suffix: "classic.timer.v1")
        feedbackSelection()
    }

    func startParty() {
        guard validatePlayers() else { return }
        players = store.resolvedPlayers(players)
        saveSetup()
        _ = store.beginSession(players: players, game: "classic")
        resetFairness()
        round = 0
        runId = "run_" + UUID().uuidString.lowercased()
        nextRound()
    }

    func nextRound() {
        stopTimer()
        introTask?.cancel()

        guard let word = pickWord() else {
            errorMessage = "Für diese Auswahl sind keine Wörter verfügbar."
            phase = .setup
            return
        }

        currentWord = word
        impostorIndex = selectImpostor()
        discussionStarterIndex = Int.random(in: 0..<players.count)
        activeIndex = 0
        round += 1
        phase = .intro
        SoundService.shared.nextRound(enabled: store.data.preferences.sound)

        let delay: UInt64 = store.data.preferences.animations ? 1_050_000_000 : 1
        introTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: delay)
            guard let self, !Task.isCancelled, self.phase == .intro else { return }
            self.phase = .handoff
        }
    }

    func openRole() {
        guard phase == .handoff else { return }
        phase = .role
        SoundService.shared.handoff(enabled: store.data.preferences.sound)
        if store.data.preferences.haptics { HapticsService.shared.impact() }
    }

    func roleDone() {
        guard phase == .role else { return }
        if activeIndex < players.count - 1 {
            activeIndex += 1
            phase = .handoff
            if store.data.preferences.haptics { HapticsService.shared.selection() }
            if store.data.preferences.haptics { HapticsService.shared.selection() }
        } else {
            phase = .discussion
            startTimer()
        }
    }

    func reveal() {
        guard phase == .discussion, let currentWord else { return }
        stopTimer()
        phase = .result

        let rows = players.indices.map { index in
            SessionRoundPlayer(
                profileId: players[index].profileId ?? "",
                role: index == impostorIndex ? "impostor" : "normal",
                guess: nil,
                target: nil,
                error: nil,
                closest: nil,
                farthest: nil,
                perfect: nil
            )
        }

        store.recordRound(
            SessionRound(
                roundKey: "\(runId)::classic::\(round)",
                game: "classic",
                at: AppStore.now(),
                category: currentWord.cat,
                difficulty: nil,
                qid: nil,
                wid: currentWord.wid,
                word: currentWord.word,
                hintEnabled: hintEnabled,
                timer: timerSeconds,
                impostorId: players[impostorIndex].profileId,
                impostorEscaped: nil,
                players: rows
            )
        )

        SoundService.shared.reveal(enabled: store.data.preferences.sound)
        if store.data.preferences.haptics { HapticsService.shared.reveal() }
    }

    func toggleTimerPause() {
        guard timerSeconds > 0, phase == .discussion, timerRemaining > 0 else { return }
        timerPaused.toggle()
        if store.data.preferences.haptics { HapticsService.shared.selection() }
    }

    func leaveToSetup() {
        introTask?.cancel()
        stopTimer()
        currentWord = nil
        phase = .setup
        round = 0
        resetFairness()
    }

    private func startTimer() {
        stopTimer()
        timerRemaining = timerSeconds
        timerPaused = false
        guard timerSeconds > 0 else { return }

        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
            Task { @MainActor [weak self] in
                guard let self, self.phase == .discussion, !self.timerPaused else { return }
                if self.timerRemaining > 1 {
                    self.timerRemaining -= 1
                } else {
                    self.timerRemaining = 0
                    self.stopTimer()
                    SoundService.shared.warning(enabled: self.store.data.preferences.sound)
                    if self.store.data.preferences.haptics { HapticsService.shared.impact() }
                }
            }
        }
    }

    private func stopTimer() {
        timer?.invalidate()
        timer = nil
        timerPaused = false
    }

    private func pickWord() -> ClassicWord? {
        let eligibleCategories = categories.map(\.name).filter { categoryAllowed($0) }
        guard let category = eligibleCategories.randomElement() else { return nil }

        let eligible = payload.items.filter { $0.cat == category }
        guard !eligible.isEmpty else { return nil }

        let key = "classic::" + category
        var used = deckProgress[key] ?? []
        var pool = eligible.filter { !used.contains($0.wid) }

        if pool.isEmpty {
            used = []
            pool = eligible
        }

        guard let chosen = pool.randomElement() else { return nil }
        used.append(chosen.wid)
        deckProgress[key] = used
        GameStorage.save(deckProgress, suffix: "classic.deck.v1")
        return chosen
    }

    private func selectImpostor() -> Int {
        ensureFairness()
        let probabilities = impostorProbabilities()
        let roll = Double.random(in: 0..<1)
        var cursor = 0.0
        var chosen = max(0, probabilities.count - 1)

        for (index, probability) in probabilities.enumerated() {
            cursor += probability
            if roll < cursor {
                chosen = index
                break
            }
        }

        impostorSessionCounts[chosen] += 1
        impostorRecent.append(chosen)
        if impostorRecent.count > 2 { impostorRecent.removeFirst() }
        return chosen
    }

    private func impostorProbabilities() -> [Double] {
        ensureFairness()
        let count = players.count
        guard count == 3 || count == 4 else {
            return Array(repeating: 1.0 / Double(max(1, count)), count: count)
        }

        let minP = count == 3 ? 0.25 : 0.20
        let maxP = count == 3 ? 0.45 : 0.35
        let totalSelections = impostorSessionCounts.reduce(0, +)
        let expected = Double(totalSelections) / Double(count)

        let weights = impostorSessionCounts.indices.map { index -> Double in
            let deficit = expected - Double(impostorSessionCounts[index])
            var weight = Foundation.exp(1.20 * deficit)
            if impostorRecent.last == index { weight *= 0.62 }
            return weight
        }

        return boundedProbabilities(weights: weights, minP: minP, maxP: maxP)
    }

    private func boundedProbabilities(weights: [Double], minP: Double, maxP: Double) -> [Double] {
        let count = weights.count
        guard count > 0 else { return [] }
        if minP * Double(count) > 1.000000000001 || maxP * Double(count) < 0.999999999999 {
            return Array(repeating: 1.0 / Double(count), count: count)
        }

        let clean = weights.map { max(1e-100, min(1e100, $0.isFinite && $0 > 0 ? $0 : 1e-100)) }
        var result = Array(repeating: 0.0, count: count)
        var active = Array(0..<count)
        var remaining = 1.0

        while !active.isEmpty {
            let sum = max(active.reduce(0.0) { $0 + clean[$1] }, Double.leastNonzeroMagnitude)
            var next: [Int] = []
            var changed = false

            for index in active {
                let share = remaining * clean[index] / sum
                if share < minP - 1e-12 {
                    result[index] = minP
                    remaining -= minP
                    changed = true
                } else if share > maxP + 1e-12 {
                    result[index] = maxP
                    remaining -= maxP
                    changed = true
                } else {
                    next.append(index)
                }
            }

            if !changed {
                let finalSum = max(active.reduce(0.0) { $0 + clean[$1] }, Double.leastNonzeroMagnitude)
                for index in active {
                    result[index] = remaining * clean[index] / finalSum
                }
                break
            }
            active = next
        }

        return result
    }

    private func ensureFairness() {
        if impostorSessionCounts.count != players.count { resetFairness() }
    }

    private func resetFairness() {
        impostorSessionCounts = Array(repeating: 0, count: players.count)
        impostorRecent = []
    }

    private func validatePlayers() -> Bool {
        let names = players.map { String($0.name.trimmingCharacters(in: .whitespacesAndNewlines).prefix(24)) }
        guard names.allSatisfy({ !$0.isEmpty }) else {
            errorMessage = "Bitte für jeden Spieler einen Namen eintragen."
            return false
        }
        let lowered = names.map { $0.lowercased(with: Locale(identifier: "de_DE")) }
        guard Set(lowered).count == lowered.count else {
            errorMessage = "Jeder Spieler braucht einen anderen Namen."
            return false
        }
        for index in players.indices { players[index].name = names[index] }
        errorMessage = nil
        return true
    }

    private func normalizeSelection() {
        let valid = Set(categories.map(\.name))
        if selectedCategories.contains("Alle") {
            selectedCategories = ["Alle"]
        } else {
            selectedCategories = Set(selectedCategories.filter { valid.contains($0) })
            if selectedCategories.isEmpty { selectedCategories = ["Alle"] }
        }
    }

    private func categoryAllowed(_ category: String) -> Bool {
        selectedCategories.contains("Alle") || selectedCategories.contains(category)
    }

    private func feedbackSelection() {
        SoundService.shared.selection(enabled: store.data.preferences.sound)
        if store.data.preferences.haptics { HapticsService.shared.selection() }
    }

    private static func timerLabel(_ seconds: Int) -> String {
        guard seconds > 0 else { return "Aus" }
        return String(format: "%d:%02d", seconds / 60, seconds % 60)
    }

    private static func buildCategories(_ items: [ClassicWord]) -> [ContentCategory] {
        let icons: [String: String] = [
            "Allgemein": "🧠",
            "Geografie": "🌍",
            "Technik": "⚡",
            "Natur": "🌿",
            "Alltag": "☕",
            "Sport": "🏆",
            "Auto": "🏎️",
            "Essen": "🍕",
            "Popkultur": "🎬",
            "Spicy 🌶️": "🌶️"
        ]
        var order: [String] = []
        var counts: [String: Int] = [:]
        for item in items {
            if counts[item.cat] == nil { order.append(item.cat) }
            counts[item.cat, default: 0] += 1
        }
        return order.map { ContentCategory(name: $0, emoji: icons[$0] ?? "✨", count: counts[$0] ?? 0) }
    }

    private static func drafts(from profiles: [PlayerProfile], count: Int) -> [PlayerDraft] {
        var result: [PlayerDraft] = []
        for index in 0..<count {
            if profiles.indices.contains(index) {
                let profile = profiles[index]
                result.append(PlayerDraft(profileId: profile.id, name: profile.name, avatar: profile.avatar))
            } else {
                result.append(PlayerDraft(name: "Spieler \(index + 1)", avatar: AppStore.avatars[index % AppStore.avatars.count]))
            }
        }
        return result
    }
}
