import Foundation
import Combine

struct CharadesRoundItem: Identifiable {
    let id = UUID()
    let term: CharadesTerm
    let decision: CharadesMotionDecision
}

@MainActor
final class CharadesGameModel: ObservableObject {
    enum Phase {
        case setup
        case ready
        case playing
        case result
    }

    @Published var phase: Phase = .setup
    @Published var selectedCategories: Set<String> = ["Alle"]
    @Published var duration = 60
    @Published var remaining = 60
    @Published var currentTerm: CharadesTerm?
    @Published var correct = 0
    @Published var skipped = 0
    @Published var history: [CharadesRoundItem] = []
    @Published var loadError: String?

    let payload: CharadesPayload
    let motion = CharadesMotionController()

    private var deck: [CharadesTerm] = []
    private var timer: Timer?

    init(repository: ContentRepository) {
        do {
            payload = try repository.charades()
        } catch {
            payload = CharadesPayload(schemaVersion: 1, count: 0, categories: [], items: [])
            loadError = error.localizedDescription
        }

        motion.onDecision = { [weak self] decision in
            self?.apply(decision)
        }
    }

    var availableCount: Int {
        filteredTerms.count
    }

    func toggleCategory(_ name: String) {
        HapticsService.shared.selection()

        if name == "Alle" {
            selectedCategories = ["Alle"]
            return
        }

        selectedCategories.remove("Alle")

        if selectedCategories.contains(name) {
            selectedCategories.remove(name)
        } else {
            selectedCategories.insert(name)
        }

        if selectedCategories.isEmpty {
            selectedCategories = ["Alle"]
        }
    }

    func selectDuration(_ seconds: Int) {
        duration = seconds
        HapticsService.shared.selection()
    }

    func prepareRound() {
        guard !filteredTerms.isEmpty else {
            loadError = "Für diese Auswahl sind keine Begriffe verfügbar."
            return
        }

        loadError = nil
        phase = .ready
    }

    func startRound() {
        correct = 0
        skipped = 0
        history = []
        remaining = duration
        rebuildDeck()
        nextTerm()
        phase = .playing

        HapticsService.shared.prepare()
        motion.start()

        timer?.invalidate()
        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
            Task { @MainActor [weak self] in
                guard let self else { return }
                if self.remaining > 1 {
                    self.remaining -= 1
                } else {
                    self.remaining = 0
                    self.finishRound()
                }
            }
        }
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
            HapticsService.shared.correct()
        case .skipped:
            skipped += 1
            HapticsService.shared.skipped()
        }

        nextTerm()
    }

    func finishRound() {
        timer?.invalidate()
        timer = nil
        motion.stop()
        phase = .result
    }

    func reset() {
        timer?.invalidate()
        timer = nil
        motion.stop()
        currentTerm = nil
        history = []
        phase = .setup
    }

    private var filteredTerms: [CharadesTerm] {
        if selectedCategories.contains("Alle") {
            return payload.items
        }

        return payload.items.filter { selectedCategories.contains($0.cat) }
    }

    private func rebuildDeck() {
        deck = filteredTerms.shuffled()
    }

    private func nextTerm() {
        if deck.isEmpty {
            rebuildDeck()
        }
        currentTerm = deck.popLast()
    }
}
