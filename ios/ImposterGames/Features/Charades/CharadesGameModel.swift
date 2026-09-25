import Combine
import Foundation

struct CharadesRoundItem: Identifiable, Hashable {
    let id = UUID()
    let term: CharadesTerm
    let decision: CharadesMotionDecision
}

struct CharadesTurnResult: Identifiable, Hashable {
    let playerIndex: Int
    let player: PlayerDraft
    let correct: Int
    let skipped: Int
    let items: [CharadesRoundItem]

    var id: String { player.id }
}

@MainActor
final class CharadesGameModel: ObservableObject {
    enum Phase: Equatable {
        case setup
        case handoff
        case countdown
        case playing
        case turnResult
        case finalResult
    }

    @Published var phase: Phase = .setup
    @Published var players: [PlayerDraft]
    @Published var selectedCategories: Set<String>
    @Published var duration: Int
    @Published var remaining = 60
    @Published var countdownText = "3"
    @Published var currentTerm: CharadesTerm?
    @Published var correct = 0
    @Published var skipped = 0
    @Published var history: [CharadesRoundItem] = []
    @Published var results: [CharadesTurnResult] = []
    @Published var playerIndex = 0
    @Published var errorMessage: String?

    let payload: CharadesPayload
    let motion = CharadesMotionController()

    private let store: AppStore
    private var deckProgress: [String: [String]]
    private var timer: Timer?
    private var countdownTask: Task<Void, Never>?

    init(repository: ContentRepository, store: AppStore) {
        self.store = store

        do {
            payload = try repository.charades()
        } catch {
            payload = CharadesPayload(schemaVersion: 1, count: 0, categories: [], items: [])
            errorMessage = error.localizedDescription
        }

        let storedCategories = GameStorage.load("charades.categories.v1", as: [String].self, default: ["Alle"])
        selectedCategories = Set(storedCategories.isEmpty ? ["Alle"] : storedCategories)

        let storedDuration = GameStorage.load("charades.timer.v1", as: Int.self, default: 60)
        duration = [30, 45, 60, 90, 120].contains(storedDuration) ? storedDuration : 60

        deckProgress = GameStorage.load("charades.deck.v1", as: [String: [String]].self, default: [:])

        let snapshot = GameStorage.load(
            "charades.players.v1",
            as: GamePlayerSnapshot.self,
            default: GamePlayerSnapshot(players: [])
        )
        if snapshot.players.count >= 2 {
            players = Array(snapshot.players.prefix(12))
        } else {
            players = Self.drafts(from: store.preferredPlayers(limit: 3), count: 3)
        }

        if let group = store.consumeLaunchGroup(), !group.isEmpty {
            let count = min(12, max(2, group.count))
            players = Self.drafts(from: group, count: count)
        }

        let flipped = GameStorage.load("charades.motionFlip.v2", as: Bool.self, default: false)
        motion.setDirectionsFlipped(flipped)
        motion.onDecision = { [weak self] decision in
            self?.apply(decision)
        }

        normalizeSelection()
        saveSetup()
    }

    var currentPlayer: PlayerDraft? {
        players.indices.contains(playerIndex) ? players[playerIndex] : nil
    }

    var availableCount: Int { filteredTerms.count }

    var currentTurnResult: CharadesTurnResult? {
        results.first(where: { $0.playerIndex == playerIndex })
    }

    var leaderboard: [CharadesTurnResult] {
        results.sorted {
            if $0.correct != $1.correct { return $0.correct > $1.correct }
            if $0.skipped != $1.skipped { return $0.skipped < $1.skipped }
            return $0.playerIndex < $1.playerIndex
        }
    }

    func saveSetup() {
        GameStorage.save(GamePlayerSnapshot(players: players), suffix: "charades.players.v1")
        GameStorage.save(Array(selectedCategories), suffix: "charades.categories.v1")
        GameStorage.save(duration, suffix: "charades.timer.v1")
    }

    func categoriesChanged() {
        normalizeSelection()
        GameStorage.save(Array(selectedCategories), suffix: "charades.categories.v1")
        feedbackSelection()
    }

    func selectDuration(_ seconds: Int) {
        guard [30, 45, 60, 90, 120].contains(seconds) else { return }
        duration = seconds
        GameStorage.save(seconds, suffix: "charades.timer.v1")
        feedbackSelection()
    }

    func startParty(useExistingPlayers: Bool = false) {
        if !useExistingPlayers {
            guard validatePlayers() else { return }
            players = store.resolvedPlayers(players)
            saveSetup()
        }

        guard !filteredTerms.isEmpty else {
            errorMessage = "Für diese Auswahl sind keine Begriffe verfügbar."
            phase = .setup
            return
        }

        stopRuntime()
        results = []
        playerIndex = 0
        phase = .handoff
        SoundService.shared.nextRound(enabled: store.data.preferences.sound)
    }

    func beginTurn() {
        guard phase == .handoff else { return }
        correct = 0
        skipped = 0
        history = []
        remaining = duration
        currentTerm = drawOne()

        guard currentTerm != nil else {
            errorMessage = "Keine Begriffe für diese Auswahl verfügbar."
            phase = .setup
            return
        }

        if store.data.preferences.haptics { HapticsService.shared.impact() }
        runCountdown()
    }

    func applyTouch(_ decision: CharadesMotionDecision) {
        guard phase == .playing, !motion.isLocked else { return }
        motion.submitTouchDecision(decision)
    }

    func apply(_ decision: CharadesMotionDecision) {
        guard phase == .playing, let currentTerm else { return }

        history.append(CharadesRoundItem(term: currentTerm, decision: decision))
        switch decision {
        case .correct:
            correct += 1
            SoundService.shared.correct(enabled: store.data.preferences.sound)
            if store.data.preferences.haptics { HapticsService.shared.correct() }
        case .skipped:
            skipped += 1
            SoundService.shared.warning(enabled: store.data.preferences.sound)
            if store.data.preferences.haptics { HapticsService.shared.skipped() }
        }

        self.currentTerm = drawOne()
        if self.currentTerm == nil {
            finishTurn()
        }
    }

    func finishTurn() {
        guard phase == .playing || phase == .countdown else { return }
        stopRuntime()

        guard let player = currentPlayer else {
            phase = .setup
            return
        }

        let result = CharadesTurnResult(
            playerIndex: playerIndex,
            player: player,
            correct: correct,
            skipped: skipped,
            items: history
        )

        if let index = results.firstIndex(where: { $0.playerIndex == playerIndex }) {
            results[index] = result
        } else {
            results.append(result)
        }

        phase = .turnResult
        SoundService.shared.reveal(enabled: store.data.preferences.sound)
        if store.data.preferences.haptics { HapticsService.shared.reveal() }
    }

    func advancePlayer() {
        guard phase == .turnResult else { return }
        if playerIndex >= players.count - 1 {
            phase = .finalResult
            SoundService.shared.nextRound(enabled: store.data.preferences.sound)
            if store.data.preferences.haptics { HapticsService.shared.impact() }
        } else {
            playerIndex += 1
            phase = .handoff
            feedbackSelection()
        }
    }

    func flipMotionDirection() {
        motion.flipDirections()
        GameStorage.save(motion.directionsFlipped, suffix: "charades.motionFlip.v2")
        feedbackSelection()
    }

    func backToSetup() {
        stopRuntime()
        results = []
        history = []
        currentTerm = nil
        playerIndex = 0
        phase = .setup
    }

    func sameGroupAgain() {
        startParty(useExistingPlayers: true)
    }

    private func runCountdown() {
        stopRuntime()
        phase = .countdown
        countdownText = "3"

        countdownTask = Task { [weak self] in
            guard let self else { return }
            for value in ["3", "2", "1"] {
                guard !Task.isCancelled else { return }
                self.countdownText = value
                SoundService.shared.selection(enabled: self.store.data.preferences.sound)
                try? await Task.sleep(nanoseconds: self.store.data.preferences.animations ? 700_000_000 : 30_000_000)
            }

            guard !Task.isCancelled else { return }
            self.countdownText = "LOS"
            SoundService.shared.nextRound(enabled: self.store.data.preferences.sound)
            try? await Task.sleep(nanoseconds: self.store.data.preferences.animations ? 420_000_000 : 30_000_000)
            guard !Task.isCancelled else { return }
            self.startPlaying()
        }
    }

    private func startPlaying() {
        phase = .playing
        remaining = duration
        HapticsService.shared.prepare()
        motion.start()

        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
            Task { @MainActor [weak self] in
                guard let self, self.phase == .playing else { return }
                if self.remaining > 1 {
                    self.remaining -= 1
                } else {
                    self.remaining = 0
                    self.finishTurn()
                }
            }
        }
    }

    private func stopRuntime() {
        countdownTask?.cancel()
        countdownTask = nil
        timer?.invalidate()
        timer = nil
        motion.stop()
    }

    private var filteredTerms: [CharadesTerm] {
        if selectedCategories.contains("Alle") { return payload.items }
        return payload.items.filter { selectedCategories.contains($0.cat) }
    }

    private func drawOne() -> CharadesTerm? {
        let pool = filteredTerms
        guard !pool.isEmpty else { return nil }

        let key = selectedCategories.contains("Alle")
            ? "Alle"
            : selectedCategories.sorted().joined(separator: "|")

        var used = deckProgress[key] ?? []
        let usedSet = Set(used)
        var available = pool.filter { !usedSet.contains($0.id) }

        if available.isEmpty {
            used = []
            available = pool
        }

        guard let chosen = available.randomElement() else { return nil }
        used.append(chosen.id)
        deckProgress[key] = used
        GameStorage.save(deckProgress, suffix: "charades.deck.v1")
        return chosen
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
        let valid = Set(payload.categories.map(\.name))
        if selectedCategories.contains("Alle") {
            selectedCategories = ["Alle"]
        } else {
            selectedCategories = Set(selectedCategories.filter { valid.contains($0) })
            if selectedCategories.isEmpty { selectedCategories = ["Alle"] }
        }
    }

    private func feedbackSelection() {
        SoundService.shared.selection(enabled: store.data.preferences.sound)
        if store.data.preferences.haptics { HapticsService.shared.selection() }
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
