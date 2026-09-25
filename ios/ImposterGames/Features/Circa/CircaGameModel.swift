import Combine
import Foundation

struct CircaPerformance: Identifiable, Hashable {
    let index: Int
    let name: String
    let avatar: String
    let guess: Double
    let target: Double
    let error: Double

    var id: Int { index }
}

@MainActor
final class CircaGameModel: ObservableObject {
    enum Phase: Equatable {
        case setup
        case intro
        case handoff
        case question
        case normalReveal
        case answers
        case result
    }

    @Published var phase: Phase = .setup
    @Published var players: [PlayerDraft]
    @Published var selectedCategories: Set<String>
    @Published var difficulty: String
    @Published var round = 0
    @Published var activeIndex = 0
    @Published var currentGuess = 0.0
    @Published var normalQuestionVisible = false
    @Published var impostorRevealed = false
    @Published var outcome: Bool?
    @Published var errorMessage: String?

    let payload: CircaPayload
    let categories: [ContentCategory]

    private let store: AppStore
    private var deckProgress: [String: [String]]
    private var currentQuestion: CircaQuestion?
    private var guesses: [Double?] = []
    private var impostorIndex = 0
    private var impostorSessionCounts: [Int] = []
    private var impostorRecent: [Int] = []
    private var runId = "run_" + UUID().uuidString.lowercased()
    private var introTask: Task<Void, Never>?

    init(repository: ContentRepository, store: AppStore) {
        self.store = store

        do {
            let loaded = try repository.circa()
            payload = loaded
            categories = Self.buildCategories(loaded.items)
        } catch {
            payload = CircaPayload(schemaVersion: 1, game: "circa", count: 0, items: [])
            categories = []
            errorMessage = error.localizedDescription
        }

        deckProgress = GameStorage.load("circa.deckProgress.v1", as: [String: [String]].self, default: [:])
        let storedCategories = GameStorage.load("circa.categories.v1", as: [String].self, default: ["Alle"])
        selectedCategories = Set(storedCategories.isEmpty ? ["Alle"] : storedCategories)
        let storedDifficulty = GameStorage.load("circa.difficulty.v1", as: String.self, default: "mittel")
        difficulty = ["leicht", "mittel", "schwer", "zufaellig"].contains(storedDifficulty) ? storedDifficulty : "mittel"

        let snapshot = GameStorage.load(
            "circa.players.v1",
            as: GamePlayerSnapshot.self,
            default: GamePlayerSnapshot(players: [])
        )

        if snapshot.players.count >= 3 {
            players = Array(snapshot.players.prefix(12))
        } else {
            players = Self.drafts(from: store.preferredPlayers(limit: 3), count: 3)
        }

        if let preset = store.consumeLaunchPreset(for: "circa") {
            let count = min(12, max(3, preset.playerCount))
            selectedCategories = Set(preset.categories.isEmpty ? ["Alle"] : preset.categories)
            difficulty = preset.difficulty
            players = Self.drafts(from: store.preferredPlayers(limit: count), count: count)
        }

        if let group = store.consumeLaunchGroup(), !group.isEmpty {
            let count = min(12, max(3, group.count))
            players = Self.drafts(from: group, count: count)
        }

        normalizeSelection()
        saveSetup()
    }

    var current: CircaQuestion? { currentQuestion }
    var currentPlayer: PlayerDraft? { players.indices.contains(activeIndex) ? players[activeIndex] : nil }
    var currentIsImpostor: Bool { activeIndex == impostorIndex }
    var currentQuestionText: String {
        guard let currentQuestion else { return "" }
        return currentIsImpostor ? currentQuestion.imp : currentQuestion.normal
    }
    var currentUnit: String {
        guard let currentQuestion else { return "" }
        return currentIsImpostor ? currentQuestion.impUnit : currentQuestion.normalUnit
    }
    var sliderMax: Double { currentQuestion?.max ?? 1 }
    var sliderStep: Double { currentQuestion?.step ?? 1 }
    var impostor: PlayerDraft? { players.indices.contains(impostorIndex) ? players[impostorIndex] : nil }
    var performances: [CircaPerformance] { performanceRows() }

    var availableCount: Int {
        payload.items.filter { item in
            categoryAllowed(item.cat) && Self.difficultyFits(item, difficulty: difficulty)
        }.count
    }

    var selectedCategoryLabel: String {
        selectedCategories.contains("Alle")
            ? "Alle Kategorien"
            : selectedCategories.sorted().joined(separator: ", ")
    }

    var difficultyName: String {
        switch difficulty {
        case "leicht": return "Leicht"
        case "schwer": return "Schwer"
        case "zufaellig": return "Zufällig"
        default: return "Mittel"
        }
    }

    var difficultyHint: String {
        switch difficulty {
        case "leicht": return "Ähnliche Zielwerte – der Impostor kann sich leichter verstecken"
        case "schwer": return "Deutlich größerer Abstand – schwieriger für den Impostor"
        case "zufaellig": return "Alles kann drankommen – von sehr nah bis deutlich auseinander"
        default: return "Spürbarer Abstand zwischen den beiden Zielwerten"
        }
    }

    func saveSetup() {
        GameStorage.save(GamePlayerSnapshot(players: players), suffix: "circa.players.v1")
        GameStorage.save(Array(selectedCategories), suffix: "circa.categories.v1")
        GameStorage.save(difficulty, suffix: "circa.difficulty.v1")
    }

    func selectDifficulty(_ value: String) {
        guard ["leicht", "mittel", "schwer", "zufaellig"].contains(value) else { return }
        difficulty = value
        GameStorage.save(value, suffix: "circa.difficulty.v1")
        feedbackSelection()
    }

    func categoriesChanged() {
        normalizeSelection()
        GameStorage.save(Array(selectedCategories), suffix: "circa.categories.v1")
        feedbackSelection()
    }

    func startParty() {
        guard validatePlayers() else { return }
        players = store.resolvedPlayers(players)
        saveSetup()
        _ = store.beginSession(players: players, game: "circa")
        resetFairness()
        round = 0
        runId = "run_" + UUID().uuidString.lowercased()
        nextRound()
    }

    func nextRound() {
        introTask?.cancel()
        outcome = nil
        normalQuestionVisible = false
        impostorRevealed = false

        guard let question = pickQuestion() else {
            errorMessage = "Für diese Auswahl sind keine Fragen verfügbar."
            phase = .setup
            return
        }

        currentQuestion = question
        guesses = Array(repeating: nil, count: players.count)
        impostorIndex = selectImpostor()
        activeIndex = 0
        currentGuess = 0
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

    func showQuestion() {
        guard phase == .handoff else { return }
        currentGuess = 0
        phase = .question
        SoundService.shared.handoff(enabled: store.data.preferences.sound)
        if store.data.preferences.haptics { HapticsService.shared.impact() }
    }

    func saveGuess() {
        guard phase == .question, guesses.indices.contains(activeIndex) else { return }
        let bounded = min(sliderMax, max(0, currentGuess))
        guesses[activeIndex] = bounded
        SoundService.shared.lock(enabled: store.data.preferences.sound)
        if store.data.preferences.haptics { HapticsService.shared.selection() }

        if activeIndex < players.count - 1 {
            activeIndex += 1
            currentGuess = 0
            phase = .handoff
        } else {
            normalQuestionVisible = false
            phase = .normalReveal
        }
    }

    func revealNormalQuestionOrContinue() {
        guard phase == .normalReveal else { return }
        if !normalQuestionVisible {
            normalQuestionVisible = true
            SoundService.shared.reveal(enabled: store.data.preferences.sound)
            if store.data.preferences.haptics { HapticsService.shared.reveal() }
        } else {
            phase = .answers
        }
    }

    func revealImpostorOrResolve() {
        guard phase == .answers else { return }
        if !impostorRevealed {
            impostorRevealed = true
            SoundService.shared.reveal(enabled: store.data.preferences.sound)
            if store.data.preferences.haptics { HapticsService.shared.impact() }
        } else {
            enterResult()
        }
    }

    func setOutcome(_ escaped: Bool) {
        guard phase == .result else { return }
        outcome = escaped
        recordCurrentRound(outcome: escaped)
        feedbackSelection()
    }

    func leaveToSetup() {
        introTask?.cancel()
        phase = .setup
        currentQuestion = nil
        round = 0
        guesses = []
        outcome = nil
        normalQuestionVisible = false
        impostorRevealed = false
        resetFairness()
    }

    func guess(for index: Int) -> Double {
        guard guesses.indices.contains(index) else { return 0 }
        return guesses[index] ?? 0
    }

    func target(for index: Int) -> Double {
        guard let currentQuestion else { return 0 }
        return index == impostorIndex ? currentQuestion.impValue : currentQuestion.normalValue
    }

    func formatEstimate(_ value: Double) -> String {
        let places = decimalPlaces(sliderStep)
        let formatter = NumberFormatter()
        formatter.locale = Locale(identifier: "de_DE")
        formatter.minimumFractionDigits = 0
        formatter.maximumFractionDigits = places
        return formatter.string(from: NSNumber(value: value)) ?? String(value)
    }

    func legacyLeaderboard(metric: String) -> [(profile: PlayerProfile, value: Int)] {
        store.data.profiles.compactMap { profile in
            let stats = store.stats(for: profile.id)
            let value: Int
            switch metric {
            case "farthest": value = stats.farthest
            case "impostor": value = stats.impostor
            case "impostorWins": value = stats.impostorEscapes
            default: value = stats.closest
            }
            return value > 0 ? (profile, value) : nil
        }
        .sorted {
            if $0.value != $1.value { return $0.value > $1.value }
            return $0.profile.name.localizedCaseInsensitiveCompare($1.profile.name) == .orderedAscending
        }
    }

    private func enterResult() {
        phase = .result
        SoundService.shared.correct(enabled: store.data.preferences.sound)
        if store.data.preferences.haptics { HapticsService.shared.reveal() }
        recordCurrentRound(outcome: nil)
    }

    private func recordCurrentRound(outcome: Bool?) {
        guard let currentQuestion else { return }
        let performance = performanceRows()
        var byIndex: [Int: CircaPerformance] = [:]
        performance.forEach { byIndex[$0.index] = $0 }

        let rows = players.indices.map { index -> SessionRoundPlayer in
            let info = byIndex[index]
            return SessionRoundPlayer(
                profileId: players[index].profileId ?? "",
                role: index == impostorIndex ? "impostor" : "normal",
                guess: guesses.indices.contains(index) ? guesses[index] : nil,
                target: target(for: index),
                error: info?.error,
                closest: performance.first?.index == index,
                farthest: performance.last?.index == index,
                perfect: abs((guesses[index] ?? 0) - target(for: index)) < 0.000001
            )
        }

        let roundRecord = SessionRound(
            roundKey: "\(runId)::circa::\(round)",
            game: "circa",
            at: AppStore.now(),
            category: currentQuestion.cat,
            difficulty: difficulty,
            qid: currentQuestion.qid,
            wid: nil,
            word: nil,
            hintEnabled: nil,
            timer: nil,
            impostorId: players[impostorIndex].profileId,
            impostorEscaped: outcome,
            players: rows
        )
        store.recordRound(roundRecord)
    }

    private func performanceRows() -> [CircaPerformance] {
        guard currentQuestion != nil else { return [] }
        return players.indices.map { index in
            let guess = guesses.indices.contains(index) ? (guesses[index] ?? 0) : 0
            let target = target(for: index)
            let error = Self.errorPercent(guess: guess, target: target)
            return CircaPerformance(
                index: index,
                name: players[index].name,
                avatar: players[index].avatar,
                guess: guess,
                target: target,
                error: error
            )
        }
        .sorted {
            if $0.error != $1.error { return $0.error < $1.error }
            return $0.index < $1.index
        }
    }

    private func pickQuestion() -> CircaQuestion? {
        let requestedCategories: [String]
        if selectedCategories.contains("Alle") {
            requestedCategories = categories.map(\.name)
        } else {
            requestedCategories = Array(selectedCategories)
        }

        let usableCategories = requestedCategories.filter { category in
            payload.items.contains { $0.cat == category && Self.difficultyFits($0, difficulty: difficulty) }
        }
        guard let category = usableCategories.randomElement() else { return nil }

        let eligible = payload.items.filter {
            $0.cat == category && Self.difficultyFits($0, difficulty: difficulty)
        }
        guard !eligible.isEmpty else { return nil }

        let key = category + "::" + difficulty
        var used = deckProgress[key] ?? []
        let usedSet = Set(used)
        let usedItems = payload.items.filter { usedSet.contains($0.qid) }

        var usedConcepts = Set<String>()
        for item in usedItems {
            usedConcepts.insert(Self.conceptKey(item.normal))
            usedConcepts.insert(Self.conceptKey(item.imp))
        }

        let unplayed = eligible.filter { !usedSet.contains($0.qid) }
        var pool = unplayed.filter {
            !usedConcepts.contains(Self.conceptKey($0.normal)) &&
            !usedConcepts.contains(Self.conceptKey($0.imp))
        }

        if pool.isEmpty && !unplayed.isEmpty {
            pool = unplayed
        }

        if pool.isEmpty {
            used = []
            pool = eligible
        }

        guard let chosen = pool.randomElement() else { return nil }
        used.append(chosen.qid)
        deckProgress[key] = used
        GameStorage.save(deckProgress, suffix: "circa.deckProgress.v1")
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

        return Self.boundedProbabilities(weights: weights, minP: minP, maxP: maxP)
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
            return
        }
        selectedCategories = Set(selectedCategories.filter { valid.contains($0) })
        if selectedCategories.isEmpty { selectedCategories = ["Alle"] }
    }

    private func categoryAllowed(_ category: String) -> Bool {
        selectedCategories.contains("Alle") || selectedCategories.contains(category)
    }

    private func feedbackSelection() {
        SoundService.shared.selection(enabled: store.data.preferences.sound)
        if store.data.preferences.haptics { HapticsService.shared.selection() }
    }

    private func decimalPlaces(_ value: Double) -> Int {
        if abs(value.rounded() - value) < 0.000001 { return 0 }
        if abs(value * 10 - (value * 10).rounded()) < 0.000001 { return 1 }
        return 2
    }

    private static func difficultyFits(_ item: CircaQuestion, difficulty: String) -> Bool {
        if difficulty == "zufaellig" { return true }
        let low = min(abs(item.normalValue), abs(item.impValue))
        let high = max(abs(item.normalValue), abs(item.impValue))
        guard low > 0 else { return difficulty == "schwer" }
        let ratio = high / low
        if difficulty == "leicht" { return ratio <= 1.30 }
        if difficulty == "mittel" { return ratio > 1.30 && ratio <= 1.80 }
        return ratio > 1.80
    }

    private static func conceptKey(_ text: String) -> String {
        var value = text
            .folding(options: [.diacriticInsensitive, .caseInsensitive], locale: Locale(identifier: "de_DE"))
            .lowercased()
        value = value.replacingOccurrences(of: "[–—\\-?!.,:;()]", with: " ", options: .regularExpression)
        value = value.replacingOccurrences(of: "\\b(grob|ungefahr|etwa|geschatzt|circa|ca)\\b", with: " ", options: .regularExpression)
        value = value.replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
        return value.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private static func errorPercent(guess: Double, target: Double) -> Double {
        if target == 0 { return abs(guess - target) * 100 }
        return abs(guess - target) / abs(target) * 100
    }

    private static func boundedProbabilities(weights: [Double], minP: Double, maxP: Double) -> [Double] {
        let count = weights.count
        guard count > 0 else { return [] }
        if minP * Double(count) > 1.000000000001 || maxP * Double(count) < 0.999999999999 {
            return Array(repeating: 1.0 / Double(count), count: count)
        }

        let clean = weights.map { value -> Double in
            guard value.isFinite, value > 0 else { return 1e-100 }
            return min(1e100, max(1e-100, value))
        }

        var result = Array(repeating: 0.0, count: count)
        var active = Array(0..<count)
        var remaining = 1.0

        while !active.isEmpty {
            let sumWeight = active.reduce(0.0) { $0 + clean[$1] }
            var next: [Int] = []
            var changed = false

            for index in active {
                let share = remaining * clean[index] / max(sumWeight, Double.leastNonzeroMagnitude)
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
                let finalWeight = active.reduce(0.0) { $0 + clean[$1] }
                for index in active {
                    result[index] = remaining * clean[index] / max(finalWeight, Double.leastNonzeroMagnitude)
                }
                remaining = 0
                break
            }
            active = next
        }

        var diff = 1 - result.reduce(0, +)
        if abs(diff) > 1e-12 {
            for index in result.indices where abs(diff) > 1e-12 {
                let room = diff > 0 ? maxP - result[index] : result[index] - minP
                guard room > 0 else { continue }
                let move = min(abs(diff), room)
                if diff > 0 {
                    result[index] += move
                    diff -= move
                } else {
                    result[index] -= move
                    diff += move
                }
            }
        }

        return result
    }

    private static func buildCategories(_ items: [CircaQuestion]) -> [ContentCategory] {
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

        return order.map {
            ContentCategory(name: $0, emoji: icons[$0] ?? "✨", count: counts[$0] ?? 0)
        }
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
