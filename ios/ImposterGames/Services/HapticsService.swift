import UIKit

@MainActor
final class HapticsService {
    static let shared = HapticsService()

    private let correctGenerator = UINotificationFeedbackGenerator()
    private let skipGenerator = UIImpactFeedbackGenerator(style: .medium)
    private let selectionGenerator = UISelectionFeedbackGenerator()

    private init() {}

    func prepare() {
        correctGenerator.prepare()
        skipGenerator.prepare()
        selectionGenerator.prepare()
    }

    func correct() {
        correctGenerator.notificationOccurred(.success)
        correctGenerator.prepare()
    }

    func skipped() {
        skipGenerator.impactOccurred(intensity: 0.78)
        skipGenerator.prepare()
    }

    func selection() {
        selectionGenerator.selectionChanged()
        selectionGenerator.prepare()
    }
}
