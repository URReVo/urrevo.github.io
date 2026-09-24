import CoreMotion
import Combine
import Foundation

final class TiltDetector: ObservableObject {
    enum Action {
        case correct
        case skipped
    }

    @Published private(set) var isRunning = false
    @Published private(set) var isLocked = false
    @Published private(set) var status = "Sensor nicht gestartet"
    @Published var directionFlipped = false

    private let manager = CMMotionManager()
    private var baselineZ: Double?
    private var latestZ: Double?
    private var armed = false
    private var candidate: Action?
    private var candidateSince: Date?
    private var lockedUntil = Date.distantPast
    private var onAction: ((Action) -> Void)?

    private let correctThreshold = 0.70
    private let skipThreshold = 0.50
    private let neutralThreshold = 0.18
    private let confirmationInterval: TimeInterval = 0.18
    private let actionCooldown: TimeInterval = 3.0

    func start(onAction: @escaping (Action) -> Void) {
        guard manager.isDeviceMotionAvailable else {
            status = "Bewegungssensor nicht verfügbar"
            return
        }

        stop()
        self.onAction = onAction
        manager.deviceMotionUpdateInterval = 1.0 / 50.0
        isRunning = true
        status = "Kurz ruhig halten · Sensor kalibriert"

        manager.startDeviceMotionUpdates(to: .main) { [weak self] motion, error in
            guard let self else { return }
            if let error {
                self.status = "Sensorfehler: \(error.localizedDescription)"
                return
            }
            guard let motion else { return }
            self.consume(gravityZ: motion.gravity.z)
        }
    }

    func stop() {
        manager.stopDeviceMotionUpdates()
        baselineZ = nil
        latestZ = nil
        armed = false
        candidate = nil
        candidateSince = nil
        lockedUntil = .distantPast
        isRunning = false
        isLocked = false
        onAction = nil
    }

    func recalibrate() {
        guard let latestZ else { return }
        baselineZ = latestZ
        armed = false
        candidate = nil
        candidateSince = nil
        status = "Neu kalibriert · kurz ruhig halten"
    }

    func lockAfterTouchAction() {
        lockedUntil = Date().addingTimeInterval(actionCooldown)
        isLocked = true
        armed = false
        candidate = nil
        candidateSince = nil
        status = "3 Sekunden Pause"
    }

    private func consume(gravityZ: Double) {
        latestZ = gravityZ
        guard let baselineZ else {
            self.baselineZ = gravityZ
            status = "Bereit · vor = richtig · zurück = überspringen"
            return
        }

        let now = Date()
        let delta = gravityZ - baselineZ
        let absolute = abs(delta)

        if now < lockedUntil {
            isLocked = true
            armed = false
            candidate = nil
            candidateSince = nil
            return
        }

        if !armed {
            if absolute <= neutralThreshold {
                armed = true
                isLocked = false
                status = "Bereit · vor = richtig · zurück = überspringen"
            }
            return
        }

        var action: Action?
        if delta >= correctThreshold {
            action = .correct
        } else if delta <= -skipThreshold {
            action = .skipped
        } else {
            candidate = nil
            candidateSince = nil
            return
        }

        if directionFlipped {
            action = action == .correct ? .skipped : .correct
        }

        guard let action else { return }
        if candidate != action {
            candidate = action
            candidateSince = now
            return
        }

        guard let candidateSince, now.timeIntervalSince(candidateSince) >= confirmationInterval else {
            return
        }

        armed = false
        candidate = nil
        self.candidateSince = nil
        lockedUntil = now.addingTimeInterval(actionCooldown)
        isLocked = true
        status = action == .correct ? "✓ Richtig" : "↷ Übersprungen"
        onAction?(action)
    }
}
