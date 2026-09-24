import SwiftUI

struct CharadesView: View {
    @EnvironmentObject private var content: ContentRepository
    @StateObject private var tilt = TiltDetector()

    @State private var current: CharadesTerm?
    @State private var correct = 0
    @State private var skipped = 0
    @State private var selectedCategory = "Alle"

    private var availableTerms: [CharadesTerm] {
        let all = content.charades?.items ?? []
        return selectedCategory == "Alle" ? all : all.filter { $0.cat == selectedCategory }
    }

    var body: some View {
        VStack(spacing: 18) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("SCHARADE")
                        .font(.caption2.weight(.heavy))
                        .foregroundStyle(.secondary)
                    Text("Native Sensorprobe")
                        .font(.title2.bold())
                }
                Spacer()
                Text("✓ \(correct) · ↷ \(skipped)")
                    .font(.subheadline.bold())
            }

            Picker("Kategorie", selection: $selectedCategory) {
                Text("Alle").tag("Alle")
                ForEach(content.charades?.categories ?? []) { category in
                    Text("\(category.emoji) \(category.name)").tag(category.name)
                }
            }
            .pickerStyle(.menu)
            .onChange(of: selectedCategory) { _, _ in
                nextTerm()
            }

            VStack(spacing: 10) {
                Text(current?.cat.uppercased() ?? "BEREIT")
                    .font(.caption.weight(.heavy))
                    .foregroundStyle(.secondary)
                Text(current?.term ?? "Sensor starten")
                    .font(.system(size: 38, weight: .black, design: .rounded))
                    .minimumScaleFactor(0.55)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: .infinity, minHeight: 170)
                Text(tilt.status)
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(.secondary)
            }
            .padding(22)
            .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 28, style: .continuous))

            Toggle("Wipp-Richtung tauschen", isOn: $tilt.directionFlipped)

            HStack(spacing: 12) {
                Button("Überspringen") {
                    guard !tilt.isLocked else { return }
                    handle(.skipped)
                    tilt.lockAfterTouchAction()
                }
                .buttonStyle(.bordered)
                .disabled(tilt.isLocked)

                Button("Richtig") {
                    guard !tilt.isLocked else { return }
                    handle(.correct)
                    tilt.lockAfterTouchAction()
                }
                .buttonStyle(.borderedProminent)
                .disabled(tilt.isLocked)
            }

            HStack(spacing: 12) {
                Button(tilt.isRunning ? "Sensor neu kalibrieren" : "Sensor starten") {
                    if tilt.isRunning {
                        tilt.recalibrate()
                    } else {
                        if current == nil { nextTerm() }
                        tilt.start { action in
                            handle(action)
                        }
                    }
                }
                .buttonStyle(.borderedProminent)

                if tilt.isRunning {
                    Button("Stop") {
                        tilt.stop()
                    }
                    .buttonStyle(.bordered)
                }
            }

            Spacer()
        }
        .padding(18)
        .navigationTitle("Scharade")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            if current == nil { nextTerm() }
            NativeHaptics.shared.prepare()
        }
        .onDisappear {
            tilt.stop()
        }
    }

    private func handle(_ action: TiltDetector.Action) {
        switch action {
        case .correct:
            correct += 1
            NativeHaptics.shared.correct()
        case .skipped:
            skipped += 1
            NativeHaptics.shared.skipped()
        }
        nextTerm()
    }

    private func nextTerm() {
        current = availableTerms.randomElement()
    }
}
