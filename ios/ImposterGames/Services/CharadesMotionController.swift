import CoreMotion
import Foundation
import QuartzCore

enum CharadesMotionDecision: Equatable {
    case correct
    case skipped
}

@MainActor
final class CharadesMotionController: ObservableObject {
    @Published private(set) var statusText = "Sensor bereit"
    @Published private(set) var isAvailable = true
    @Published private(set) var isRunning = false
    @Published private(set) var directionsFlipped = false

    var onDecision: ((CharadesMotionDecision) -> Void)?

    private let manager = CMMotionManager()
    private var baselineGravityZ: Double?
    private var armed = false
    private var candidate: CharadesMotionDecision?
    private var candidateSince: CFTimeInterval?
    private var lockedUntil: CFTimeInterval = 0

    private let correctThreshold = 0.70
    private let skipThreshold = 0.50
    private let neutralThreshold = 0.18
    private let confirmationDuration: CFTimeInterval = 0.18
    private let cooldownDuration: CFTimeInterval = 3.0

    func start() {
        stop()

        guard manager.isDeviceMotionAvailable else {
            isAvailable = false
            statusText = "Bewegungssensor nicht verfügbar · Tasten verwenden"
            return
        }

        isAvailable = true
        isRunning = true
        baselineGravityZ = nil
        armed = false
        candidate = nil
        candidateSince = nil
        lockedUntil = 0
        statusText = "Handy kurz ruhig halten …"

        manager.deviceMotionUpdateInterval = 1.0 / 60.0
        manager.startDeviceMotionUpdates(to: .main) { [weak self] motion, error in
            guard error == nil, let gravityZ = motion?.gravity.z else {
                if let error {
                    Task { @MainActor [weak self] in
                        self?.statusText = "Sensorfehler: \(error.localizedDescription)"
                    }
                }
                return
            }

            Task { @MainActor [weak self] in
                self?.consume(gravityZ: gravityZ)
            }
        }
    }

    func stop() {
        if manager.isDeviceMotionActive {
            manager.stopDeviceMotionUpdates()
        }
        isRunning = false
        baselineGravityZ = nil
        armed = false
        candidate = nil
        candidateSince = nil
        lockedUntil = 0
    }

    func flipDirections() {
        directionsFlipped.toggle()
        armed = false
        candidate = nil
        candidateSince = nil
        statusText = directionsFlipped
            ? "Richtungen getauscht · kurz neutral halten"
            : "Standardrichtung · kurz neutral halten"
    }

    private func consume(gravityZ: Double) {
        let now = CACurrentMediaTime()

        guard let baselineGravityZ else {
            self.baselineGravityZ = gravityZ
            statusText = "Kalibriert · kurz neutral halten"
            return
        }

        let delta = gravityZ - baselineGravityZ
        let absoluteDelta = abs(delta)

        if now < lockedUntil {
            armed = false
            candidate = nil
            candidateSince = nil
            let remaining = max(1, Int(ceil(lockedUntil - now)))
            statusText = "Nächste Wertung in \(remaining) s"
            return
        }

        if !armed {
            if absoluteDelta <= neutralThreshold {
                armed = true
                statusText = "Bereit · vor = richtig · zurück = überspringen"
            }
            return
        }

        var decision: CharadesMotionDecision?
        if delta >= correctThreshold {
            decision = .correct
        } else if delta <= -skipThreshold {
            decision = .skipped
        }

        guard var decision else {
            candidate = nil
            candidateSince = nil
            return
        }

        if directionsFlipped {
            decision = decision == .correct ? .skipped : .correct
        }

        if candidate != decision {
            candidate = decision
            candidateSince = now
            return
        }

        guard let candidateSince, now - candidateSince >= confirmationDuration else {
            return
        }

        armed = false
        candidate = nil
        self.candidateSince = nil
        lockedUntil = now + cooldownDuration
        statusText = decision == .correct ? "✓ Richtig" : "↷ Übersprungen"
        onDecision?(decision)
    }
}
