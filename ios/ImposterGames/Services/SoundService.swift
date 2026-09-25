import AVFoundation
import Foundation

@MainActor
final class SoundService {
    static let shared = SoundService()

    private struct Tone {
        let frequency: Double
        let duration: Double
        let gain: Double
        let delay: Double
    }

    private let engine = AVAudioEngine()
    private let player = AVAudioPlayerNode()
    private let format = AVAudioFormat(standardFormatWithSampleRate: 44_100, channels: 1)!
    private var engineConfigured = false

    private init() {
        configureAudio()
    }

    func selection(enabled: Bool) {
        play([Tone(frequency: 520, duration: 0.045, gain: 0.18, delay: 0)], enabled: enabled)
    }

    func handoff(enabled: Bool) {
        play([
            Tone(frequency: 420, duration: 0.055, gain: 0.19, delay: 0),
            Tone(frequency: 630, duration: 0.065, gain: 0.20, delay: 0.055)
        ], enabled: enabled)
    }

    func lock(enabled: Bool) {
        play([Tone(frequency: 300, duration: 0.07, gain: 0.18, delay: 0)], enabled: enabled)
    }

    func reveal(enabled: Bool) {
        play([
            Tone(frequency: 470, duration: 0.07, gain: 0.20, delay: 0),
            Tone(frequency: 760, duration: 0.10, gain: 0.23, delay: 0.065)
        ], enabled: enabled)
    }

    func correct(enabled: Bool) {
        play([
            Tone(frequency: 660, duration: 0.065, gain: 0.22, delay: 0),
            Tone(frequency: 880, duration: 0.11, gain: 0.25, delay: 0.055)
        ], enabled: enabled)
    }

    func nextRound(enabled: Bool) {
        play([
            Tone(frequency: 330, duration: 0.05, gain: 0.17, delay: 0),
            Tone(frequency: 495, duration: 0.055, gain: 0.19, delay: 0.05),
            Tone(frequency: 660, duration: 0.08, gain: 0.21, delay: 0.105)
        ], enabled: enabled)
    }

    func warning(enabled: Bool) {
        play([
            Tone(frequency: 250, duration: 0.07, gain: 0.20, delay: 0),
            Tone(frequency: 190, duration: 0.09, gain: 0.19, delay: 0.06)
        ], enabled: enabled)
    }

    private func play(_ tones: [Tone], enabled: Bool) {
        guard enabled else { return }
        configureAudio()

        for tone in tones {
            DispatchQueue.main.asyncAfter(deadline: .now() + tone.delay) { [weak self] in
                self?.playTone(tone)
            }
        }
    }

    private func configureAudio() {
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(.playback, mode: .default, options: [.mixWithOthers])
            try session.setActive(true)
        } catch {
            // Audio still gets a chance to work through AVAudioEngine.
        }

        if !engineConfigured {
            engine.attach(player)
            engine.connect(player, to: engine.mainMixerNode, format: format)
            engine.prepare()
            engineConfigured = true
        }

        if !engine.isRunning {
            try? engine.start()
        }
    }

    private func playTone(_ tone: Tone) {
        configureAudio()

        let sampleRate = format.sampleRate
        let frameCount = AVAudioFrameCount(max(1, Int(sampleRate * tone.duration)))
        guard let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frameCount),
              let channel = buffer.floatChannelData?[0] else {
            return
        }

        buffer.frameLength = frameCount

        for frame in 0..<Int(frameCount) {
            let time = Double(frame) / sampleRate
            let attack = min(1.0, time / 0.006)
            let releaseWindow = max(0.018, min(0.04, tone.duration * 0.45))
            let release = min(1.0, max(0.0, (tone.duration - time) / releaseWindow))
            let envelope = attack * release
            channel[frame] = Float(sin(2.0 * .pi * tone.frequency * time) * tone.gain * envelope)
        }

        player.scheduleBuffer(buffer)
        if !player.isPlaying {
            player.play()
        }
    }
}
