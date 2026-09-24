import CoreHaptics
import UIKit

@MainActor
final class HapticsService {
    static let shared = HapticsService()

    private var engine: CHHapticEngine?
    private let correctGenerator = UINotificationFeedbackGenerator()
    private let skipGenerator = UIImpactFeedbackGenerator(style: .medium)
    private let selectionGenerator = UISelectionFeedbackGenerator()

    private init() {
        guard CHHapticEngine.capabilitiesForHardware().supportsHaptics else { return }
        engine = try? CHHapticEngine()
        engine?.isAutoShutdownEnabled = true
    }

    func prepare() {
        _ = startCoreHaptics()
        correctGenerator.prepare()
        skipGenerator.prepare()
        selectionGenerator.prepare()
    }

    func correct() {
        if !playTransient(intensity: 1.0, sharpness: 0.82) {
            correctGenerator.notificationOccurred(.success)
            correctGenerator.prepare()
        }
    }

    func skipped() {
        if !playTransient(intensity: 0.72, sharpness: 0.32) {
            skipGenerator.impactOccurred(intensity: 0.78)
            skipGenerator.prepare()
        }
    }

    func selection() {
        if !playTransient(intensity: 0.34, sharpness: 0.48) {
            selectionGenerator.selectionChanged()
            selectionGenerator.prepare()
        }
    }

    private func startCoreHaptics() -> Bool {
        guard let engine else { return false }

        do {
            try engine.start()
            return true
        } catch {
            return false
        }
    }

    private func playTransient(intensity: Float, sharpness: Float) -> Bool {
        guard startCoreHaptics(), let engine else { return false }

        let event = CHHapticEvent(
            eventType: .hapticTransient,
            parameters: [
                CHHapticEventParameter(parameterID: .hapticIntensity, value: intensity),
                CHHapticEventParameter(parameterID: .hapticSharpness, value: sharpness)
            ],
            relativeTime: 0
        )

        do {
            let pattern = try CHHapticPattern(events: [event], parameters: [])
            let player = try engine.makePlayer(with: pattern)
            try player.start(atTime: CHHapticTimeImmediate)
            return true
        } catch {
            return false
        }
    }
}
