import CoreHaptics
import UIKit

final class NativeHaptics {
    static let shared = NativeHaptics()

    private var engine: CHHapticEngine?
    private let supportsCoreHaptics = CHHapticEngine.capabilitiesForHardware().supportsHaptics

    private init() {
        prepare()
    }

    func prepare() {
        guard supportsCoreHaptics else { return }
        do {
            let engine = try CHHapticEngine()
            engine.isAutoShutdownEnabled = true
            try engine.start()
            self.engine = engine
        } catch {
            self.engine = nil
        }
    }

    func correct() {
        play(intensity: 0.95, sharpness: 0.85, fallback: .success)
    }

    func skipped() {
        play(intensity: 0.55, sharpness: 0.25, fallback: .warning)
    }

    private func play(intensity: Float, sharpness: Float, fallback: UINotificationFeedbackGenerator.FeedbackType) {
        guard supportsCoreHaptics, let engine else {
            UINotificationFeedbackGenerator().notificationOccurred(fallback)
            return
        }

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
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(fallback)
        }
    }
}
