import SwiftUI

struct CharadesView: View {
    @StateObject private var model: CharadesGameModel

    init(repository: ContentRepository) {
        _model = StateObject(wrappedValue: CharadesGameModel(repository: repository))
    }

    var body: some View {
        ZStack {
            AppTheme.background.ignoresSafeArea()

            switch model.phase {
            case .setup:
                setupView
            case .ready:
                readyView
            case .playing:
                playView
            case .result:
                resultView
            }
        }
        .navigationTitle("Scharade")
        .navigationBarTitleDisplayMode(.inline)
        .onDisappear {
            if model.phase == .playing {
                model.finishRound()
            }
        }
    }

    private var setupView: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                VStack(spacing: 8) {
                    Text("🎬")
                        .font(.system(size: 58))
                    Text("Scharade")
                        .font(.system(size: 32, weight: .black, design: .rounded))
                        .foregroundStyle(AppTheme.text)
                    Text("Handy an die Stirn. Die anderen erklären – du errätst den Begriff.")
                        .font(.subheadline)
                        .foregroundStyle(AppTheme.muted)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)

                sectionLabel("KATEGORIE")

                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                    categoryButton(name: "Alle", emoji: "✨")

                    ForEach(model.payload.categories) { category in
                        categoryButton(name: category.name, emoji: category.emoji)
                    }
                }

                sectionLabel("RUNDENDAUER")

                HStack(spacing: 7) {
                    ForEach([30, 45, 60, 90, 120], id: \.self) { seconds in
                        Button {
                            model.selectDuration(seconds)
                        } label: {
                            Text("\(seconds)s")
                                .font(.caption.weight(.black))
                                .frame(maxWidth: .infinity)
                                .frame(height: 44)
                                .background(
                                    model.duration == seconds ? AppTheme.charades.opacity(0.20) : AppTheme.card,
                                    in: RoundedRectangle(cornerRadius: 13, style: .continuous)
                                )
                                .overlay {
                                    RoundedRectangle(cornerRadius: 13, style: .continuous)
                                        .stroke(model.duration == seconds ? AppTheme.charades.opacity(0.75) : Color.white.opacity(0.06))
                                }
                        }
                        .buttonStyle(.plain)
                    }
                }

                HStack(spacing: 12) {
                    Image(systemName: "waveform.path")
                        .font(.title2)
                        .foregroundStyle(AppTheme.charades)

                    VStack(alignment: .leading, spacing: 3) {
                        Text("Native Sensorik + Haptik")
                            .font(.subheadline.weight(.bold))
                            .foregroundStyle(AppTheme.text)
                        Text("Core Motion erkennt beide Wipprichtungen. Nach jeder Wertung gelten 3 Sekunden Sperre und Neutralposition.")
                            .font(.caption)
                            .foregroundStyle(AppTheme.muted)
                    }
                }
                .padding(14)
                .background(AppTheme.panel, in: RoundedRectangle(cornerRadius: 17, style: .continuous))

                if let loadError = model.loadError {
                    Text(loadError)
                        .font(.caption)
                        .foregroundStyle(.red)
                }

                Button {
                    model.prepareRound()
                } label: {
                    Text("Runde vorbereiten · \(model.availableCount) Begriffe")
                        .font(.headline.weight(.black))
                        .frame(maxWidth: .infinity)
                        .frame(height: 54)
                        .foregroundStyle(Color.black.opacity(0.84))
                        .background(AppTheme.charades, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                }
                .buttonStyle(.plain)
                .disabled(model.availableCount == 0)
            }
            .padding(16)
            .padding(.bottom, 24)
        }
    }

    private var readyView: some View {
        VStack(spacing: 18) {
            Spacer()

            Text("😎")
                .font(.system(size: 70))

            Text("Handy an die Stirn")
                .font(.system(size: 30, weight: .black, design: .rounded))
                .foregroundStyle(AppTheme.text)

            Text("Display nach außen. Nach vorne wippen = Richtig, zur Stirn zurück = Überspringen.")
                .font(.body)
                .foregroundStyle(AppTheme.muted)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 26)

            Spacer()

            Button {
                model.startRound()
            } label: {
                Text("Start")
                    .font(.headline.weight(.black))
                    .frame(maxWidth: .infinity)
                    .frame(height: 56)
                    .foregroundStyle(Color.black.opacity(0.84))
                    .background(AppTheme.charades, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            }
            .buttonStyle(.plain)
            .padding(.horizontal, 16)
            .padding(.bottom, 18)
        }
    }

    private var playView: some View {
        VStack(spacing: 10) {
            HStack {
                Text("\(model.remaining)s")
                    .font(.subheadline.weight(.black))
                    .foregroundStyle(AppTheme.text)

                Spacer()

                Text("✓ \(model.correct) · ↷ \(model.skipped)")
                    .font(.caption.weight(.black))
                    .foregroundStyle(AppTheme.muted)

                Button("Beenden") {
                    model.finishRound()
                }
                .font(.caption.weight(.bold))
                .foregroundStyle(AppTheme.accent)
            }

            Spacer(minLength: 4)

            VStack(spacing: 12) {
                Text(model.currentTerm?.cat.uppercased() ?? "KATEGORIE")
                    .font(.caption2.weight(.black))
                    .tracking(1)
                    .foregroundStyle(AppTheme.charades.opacity(0.82))

                Text(model.currentTerm?.term ?? "…")
                    .font(.system(size: 48, weight: .black, design: .rounded))
                    .minimumScaleFactor(0.45)
                    .multilineTextAlignment(.center)
                    .foregroundStyle(AppTheme.text)
                    .padding(.horizontal, 8)

                Text(model.motion.statusText)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(AppTheme.muted)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .padding(20)
            .background(
                LinearGradient(
                    colors: [AppTheme.charades.opacity(0.15), AppTheme.card],
                    startPoint: .top,
                    endPoint: .bottom
                ),
                in: RoundedRectangle(cornerRadius: 30, style: .continuous)
            )
            .overlay {
                RoundedRectangle(cornerRadius: 30, style: .continuous)
                    .stroke(Color.white.opacity(0.08))
            }

            HStack {
                Text(model.motion.isAvailable ? "Core Motion aktiv" : "Touch-Fallback")
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(AppTheme.muted)

                Spacer()

                Button("↕ Richtung tauschen") {
                    model.motion.flipDirections()
                    HapticsService.shared.selection()
                }
                .font(.caption2.weight(.bold))
                .foregroundStyle(AppTheme.charades)
            }
            .padding(.horizontal, 2)

            HStack(spacing: 9) {
                Button {
                    model.applyTouch(.skipped)
                } label: {
                    Label("Überspringen", systemImage: "arrow.uturn.forward")
                        .font(.subheadline.weight(.black))
                        .frame(maxWidth: .infinity)
                        .frame(height: 58)
                        .foregroundStyle(AppTheme.text)
                        .background(Color.red.opacity(0.15), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                }
                .disabled(model.motion.isLocked)

                Button {
                    model.applyTouch(.correct)
                } label: {
                    Label("Richtig", systemImage: "checkmark")
                        .font(.subheadline.weight(.black))
                        .frame(maxWidth: .infinity)
                        .frame(height: 58)
                        .foregroundStyle(Color.black.opacity(0.84))
                        .background(AppTheme.charades, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                }
                .disabled(model.motion.isLocked)
            }
            .buttonStyle(.plain)
        }
        .padding(16)
        .padding(.bottom, 10)
    }

    private var resultView: some View {
        VStack(spacing: 16) {
            Text("RUNDE BEENDET")
                .font(.caption2.weight(.black))
                .tracking(1)
                .foregroundStyle(AppTheme.muted)

            Text("\(model.correct) richtig")
                .font(.system(size: 34, weight: .black, design: .rounded))
                .foregroundStyle(AppTheme.text)

            Text("\(model.skipped) übersprungen")
                .font(.subheadline.weight(.bold))
                .foregroundStyle(AppTheme.muted)

            List(model.history) { item in
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(item.term.term)
                            .font(.subheadline.weight(.bold))
                        Text(item.term.cat)
                            .font(.caption2)
                            .foregroundStyle(AppTheme.muted)
                    }

                    Spacer()

                    Text(item.decision == .correct ? "✓ Richtig" : "↷ Übersprungen")
                        .font(.caption.weight(.black))
                        .foregroundStyle(item.decision == .correct ? Color.green : AppTheme.accent)
                }
                .listRowBackground(AppTheme.card)
            }
            .scrollContentBackground(.hidden)

            Button {
                model.reset()
            } label: {
                Text("Neue Runde")
                    .font(.headline.weight(.black))
                    .frame(maxWidth: .infinity)
                    .frame(height: 54)
                    .foregroundStyle(Color.black.opacity(0.84))
                    .background(AppTheme.charades, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            }
            .buttonStyle(.plain)
            .padding(.horizontal, 16)
            .padding(.bottom, 10)
        }
        .padding(.top, 16)
    }

    private func sectionLabel(_ text: String) -> some View {
        Text(text)
            .font(.caption2.weight(.black))
            .tracking(1)
            .foregroundStyle(AppTheme.muted)
    }

    private func categoryButton(name: String, emoji: String) -> some View {
        let selected = model.selectedCategories.contains(name)

        return Button {
            model.toggleCategory(name)
        } label: {
            HStack(spacing: 8) {
                Text(emoji)
                Text(name)
                    .font(.caption.weight(.bold))
                    .lineLimit(1)
                Spacer(minLength: 0)
            }
            .foregroundStyle(selected ? AppTheme.text : AppTheme.muted)
            .padding(.horizontal, 12)
            .frame(height: 48)
            .background(
                selected ? AppTheme.charades.opacity(0.16) : AppTheme.card,
                in: RoundedRectangle(cornerRadius: 14, style: .continuous)
            )
            .overlay {
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(selected ? AppTheme.charades.opacity(0.65) : Color.white.opacity(0.06))
            }
        }
        .buttonStyle(.plain)
    }
}
