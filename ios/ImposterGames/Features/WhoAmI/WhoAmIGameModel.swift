import Combine
import Foundation

struct WhoAmIAssignment: Identifiable, Hashable {
    let player: PlayerDraft
    let term: WhoAmITerm

    var id: String { player.id }
}

@MainActor
final class WhoAmIGameModel: ObservableObject {
    enum Phase: Equatable {
        case setup
        case handoff
        case viewer
        case play
        case result
    }

    @Published var phase: Phase = .setup
    @Published var players: [PlayerDraft]
    @Published var selectedCategories: Set<String>
    @Published var assignments: [WhoAmIAssignment] = []
    @Published var activeViewer = 0
    @Published var round = 0
    @Published var errorMessage: String?

    let payload: WhoAmIPayload
    private let store: AppStore
    private var deckProgress: [String: [String]]

    init(repository: ContentRepository, store: AppStore) {
        self.store = store

        do {
            payload = try repository.whoAmI()
        } catch {
            payload = WhoAmIPayload(schemaVersion: 1, count: 0, categories: [], items: [])
            errorMessage = error.localizedDescription
        }

        deckProgress = GameStorage.load("whoami.deck.v1", as: [String: [String]].self, default: [:])
        let storedCategories = GameStorage.load("whoami.categories.v1", as: [String].self, default: ["Alle"])
        selectedCategories = Set(storedCategories.isEmpty ? ["Alle"] : storedCategories)

        let snapshot = GameStorage.load(
            "whoami.players.v1",
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

        normalizeSelection()
        saveSetup()
    }

    var activePlayer: PlayerDraft? {
        players.indices.contains(activeViewer) ? players[activeViewer] : nil
    }

    var availableCount: Int { selectedPool.count }

    func saveSetup() {
        GameStorage.save(GamePlayerSnapshot(players: players), suffix: "whoami.players.v1")
        GameStorage.save(Array(selectedCategories), suffix: "whoami.categories.v1")
    }

    func categoriesChanged() {
        normalizeSelection()
        GameStorage.save(Array(selectedCategories), suffix: "whoami.categories.v1")
        feedbackSelection()
    }

    func startRound(useExistingPlayers: Bool = false) {
        if !useExistingPlayers {
            guard validatePlayers() else { return }
            players = store.resolvedPlayers(players)
            saveSetup()
        }

        guard let terms = drawTerms(amount: players.count) else {
            errorMessage = "Für diese Auswahl sind nicht genug unterschiedliche Begriffe vorhanden."
            phase = .setup
            return
        }

        round += 1
        assignments = players.indices.map { index in
            WhoAmIAssignment(player: players[index], term: terms[index])
        }
        activeViewer = 0
        phase = .handoff
        SoundService.shared.nextRound(enabled: store.data.preferences.sound)
        if store.data.preferences.haptics { HapticsService.shared.selection() }
    }

    func showViewer() {
        guard phase == .handoff else { return }
        phase = .viewer
        SoundService.shared.handoff(enabled: store.data.preferences.sound)
    }

    func finishViewer() {
        guard phase == .viewer else { return }
        if activeViewer < players.count - 1 {
            activeViewer += 1
            phase = .handoff
            if store.data.preferences.haptics { HapticsService.shared.selection() }
        } else {
            phase = .play
            SoundService.shared.nextRound(enabled: store.data.preferences.sound)
        }
    }

    func revealAll() {
        guard phase == .play else { return }
        phase = .result
        SoundService.shared.reveal(enabled: store.data.preferences.sound)
        if store.data.preferences.haptics { HapticsService.shared.reveal() }
    }

    func backToSetup() {
        phase = .setup
        assignments = []
        activeViewer = 0
    }

    private var selectedPool: [WhoAmITerm] {
        if selectedCategories.contains("Alle") { return payload.items }
        return payload.items.filter { selectedCategories.contains($0.cat) }
    }

    private func drawTerms(amount: Int) -> [WhoAmITerm]? {
        let pool = selectedPool
        guard pool.count >= amount else { return nil }

        let key = selectedCategories.contains("Alle")
            ? "Alle"
            : selectedCategories.sorted().joined(separator: "|")

        var used = deckProgress[key] ?? []
        let usedSet = Set(used)
        var available = pool.filter { !usedSet.contains($0.id) }

        if available.count < amount {
            used = []
            available = pool
        }

        let picked = Array(available.shuffled().prefix(amount))
        guard picked.count == amount else { return nil }

        used.append(contentsOf: picked.map(\.id))
        deckProgress[key] = used
        GameStorage.save(deckProgress, suffix: "whoami.deck.v1")
        return picked
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
