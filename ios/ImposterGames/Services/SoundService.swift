import AudioToolbox
import Foundation

@MainActor
final class SoundService {
    static let shared = SoundService()

    private init() {}

    func selection(enabled: Bool) {
        guard enabled else { return }
        AudioServicesPlaySystemSound(1104)
    }

    func handoff(enabled: Bool) {
        guard enabled else { return }
        AudioServicesPlaySystemSound(1105)
    }

    func lock(enabled: Bool) {
        guard enabled else { return }
        AudioServicesPlaySystemSound(1156)
    }

    func reveal(enabled: Bool) {
        guard enabled else { return }
        AudioServicesPlaySystemSound(1111)
    }

    func correct(enabled: Bool) {
        guard enabled else { return }
        AudioServicesPlaySystemSound(1057)
    }

    func nextRound(enabled: Bool) {
        guard enabled else { return }
        AudioServicesPlaySystemSound(1113)
    }

    func warning(enabled: Bool) {
        guard enabled else { return }
        AudioServicesPlaySystemSound(1073)
    }
}
