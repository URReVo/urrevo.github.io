import SwiftUI

struct ClassicView: View {
    @StateObject private var model: ClassicGameModel
    @ObservedObject private var store: AppStore
    @State private var confirmFreshRound = false
    @State private var confirmLeave = false

    init(repository: ContentRepository, store: AppStore) {
        _store = ObservedObject(wrappedValue: store)
        _model = StateObject(wrappedValue: ClassicGameModel(repository: repository, store: store))
    }

    var body: some View {
        ZStack {
            AppTheme.background.ignoresSafeArea()

            switch model.phase {
            case .setup:
                setupView
            case .intro:
                introView
            case .handoff:
                handoffView
            case .role:
                roleView
            case .discussion:
                discussionView
            case .result:
                resultView
            }
        }
        .navigationTitle("Klassisches Imposter")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItemGroup(placement: .topBarTrailing) {
                Button {
                    store.setPreference("sound", value: !store.data.preferences.sound)
                } label: {
                    Image(systemName: store.data.preferences.sound ? "speaker.wave.2.fill" : "speaker.slash.fill")
                }

                if model.phase != .setup {
                    Button {
                        confirmFreshRound = true
                    } label: {
                        Image(systemName: "arrow.clockwise")
                    }
                }
            }
        }
        .alert("Neue Runde starten?", isPresented: $confirmFreshRound) {
            Button("Abbrechen", role: .cancel) {}
            Button("Neue Runde") { model.nextRound() }
        } message: {
            Text("Die aktuelle Classic-Runde wird abgebrochen.")
        }
        .alert("Partie verlassen?", isPresented: $confirmLeave) {
            Button("Abbrechen", role: .cancel) {}
            Button("Verlassen", role: .destructive) { model.leaveToSetup() }
        } message: {
            Text("Du kehrst zum Classic-Setup zurück.")
        }
    }

    private var setupView: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                VStack(spacing: 7) {
                    Text("🎭")
                        .font(.system(size: 58))
                    Text("Klassisches Imposter")
                        .font(.system(size: 30, weight: .black, design: .rounded))
                        .foregroundStyle(AppTheme.text)
                    Text("Alle kennen das geheime Wort – außer dem Impostor.")
                        .font(.subheadline)
                        .foregroundStyle(AppTheme.muted)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)

                CategorySelector(
                    categories: model.categories,
                    selection: $model.selectedCategories,
                    tint: AppTheme.classic,
                    onChange: model.categoriesChanged
                )

                VStack(alignment: .leading, spacing: 10) {
                    SectionEyebrow(text: "IMPOSTOR-OPTIONEN")

                    Toggle(isOn: Binding(
                        get: { model.hintEnabled },
                        set: { model.setHint($0) }
                    )) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Impostor-Hinweis")
                                .font(.subheadline.weight(.bold))
                                .foregroundStyle(AppTheme.text)
                            Text(model.hintEnabled ? "Der Impostor erhält einen Hinweis zum Wort." : "Der Impostor sieht keinen Hinweis.")
                                .font(.caption)
                                .foregroundStyle(AppTheme.muted)
                        }
                    }
                    .tint(AppTheme.classic)
                    .padding(14)
                    .background(AppTheme.card, in: RoundedRectangle(cornerRadius: 15))

                    Menu {
                        ForEach(ClassicGameModel.timerOptions, id: \.self) { seconds in
                            Button(seconds == 0 ? "Aus" : timerText(seconds)) {
                                model.setTimer(seconds)
                            }
                        }
                    } label: {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Diskussions-Timer")
                                    .font(.subheadline.weight(.bold))
                                    .foregroundStyle(AppTheme.text)
                                Text(model.timerLabel)
                                    .font(.caption)
                                    .foregroundStyle(AppTheme.muted)
                            }
                            Spacer()
                            Image(systemName: "chevron.up.chevron.down")
                                .foregroundStyle(AppTheme.classic)
                        }
                        .padding(14)
                        .background(AppTheme.card, in: RoundedRectangle(cornerRadius: 15))
                    }
                }

                PlayerSetupEditor(
                    players: $model.players,
                    minimum: 3,
                    maximum: 12,
                    tint: AppTheme.classic,
                    onChange: model.saveSetup
                )

                if let error = model.errorMessage {
                    Text(error)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(AppTheme.danger)
                }

                PrimaryGameButton(
                    title: "Spiel starten",
                    tint: AppTheme.classic,
                    enabled: model.availableCount > 0,
                    action: model.startParty
                )
            }
            .padding(16)
            .padding(.bottom, 24)
        }
    }

    private var introView: some View {
        VStack(spacing: 14) {
            Spacer()
            Text("🎭")
                .font(.system(size: 72))
            SectionEyebrow(text: model.current?.cat.uppercased() ?? "IMPOSTOR")
            Text("Runde \(model.round)")
                .font(.system(size: 38, weight: .black, design: .rounded))
                .foregroundStyle(AppTheme.text)
            Text("IMPOSTOR")
                .font(.headline.weight(.black))
                .foregroundStyle(AppTheme.classic)
            Spacer()
        }
        .padding(20)
    }

    private var handoffView: some View {
        VStack(spacing: 16) {
            GameHeaderBar(
                title: model.current?.cat ?? "Classic",
                subtitle: "Runde \(model.round)",
                trailingTitle: "Verlassen",
                onTrailing: { confirmLeave = true }
            )

            Spacer()

            Text(model.currentPlayer?.avatar ?? "😎")
                .font(.system(size: 78))
            Text("Handy an")
                .font(.headline)
                .foregroundStyle(AppTheme.muted)
            Text(model.currentPlayer?.name ?? "Spieler")
                .font(.system(size: 34, weight: .black, design: .rounded))
                .foregroundStyle(AppTheme.text)

            Spacer()

            PrimaryGameButton(title: "Ich bin bereit", tint: AppTheme.classic, action: model.openRole)
        }
        .padding(16)
        .padding(.bottom, 12)
    }

    private var roleView: some View {
        VStack(spacing: 16) {
            HStack {
                Text(model.currentPlayer?.avatar ?? "😎")
                    .font(.title)
                VStack(alignment: .leading, spacing: 1) {
                    Text(model.currentPlayer?.name ?? "Spieler")
                        .font(.headline.weight(.black))
                        .foregroundStyle(AppTheme.text)
                    Text("\(model.activeIndex + 1)/\(model.players.count)")
                        .font(.caption)
                        .foregroundStyle(AppTheme.muted)
                }
                Spacer()
            }

            Spacer()

            VStack(spacing: 13) {
                SectionEyebrow(text: model.currentIsImpostor ? "DEINE ROLLE" : "GEHEIMES WORT")
                Text(model.currentIsImpostor ? "DU BIST DER IMPOSTOR" : (model.current?.word ?? ""))
                    .font(.system(size: model.currentIsImpostor ? 32 : 46, weight: .black, design: .rounded))
                    .minimumScaleFactor(0.55)
                    .lineLimit(nil)
                    .fixedSize(horizontal: false, vertical: true)
                    .multilineTextAlignment(.center)
                    .foregroundStyle(model.currentIsImpostor ? AppTheme.danger : AppTheme.text)
                    .padding(.horizontal, 8)

                if model.currentIsImpostor {
                    Text(model.hintEnabled
                         ? "Hinweis: \(model.current?.hint ?? "")"
                         : "Du kennst das geheime Wort nicht. Hör gut zu und füge dich unauffällig ein.")
                        .font(.body.weight(model.hintEnabled ? .bold : .regular))
                        .foregroundStyle(model.hintEnabled ? AppTheme.classic : AppTheme.muted)
                        .multilineTextAlignment(.center)
                } else {
                    Text("Merke dir dein Wort und verrate es niemandem.")
                        .font(.body)
                        .foregroundStyle(AppTheme.muted)
                        .multilineTextAlignment(.center)
                }
            }
            .frame(maxWidth: .infinity, minHeight: 280)
            .padding(22)
            .background(
                LinearGradient(
                    colors: [
                        (model.currentIsImpostor ? AppTheme.danger : AppTheme.classic).opacity(0.14),
                        AppTheme.card
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                ),
                in: RoundedRectangle(cornerRadius: 28)
            )

            Spacer()

            PrimaryGameButton(
                title: "Verstanden",
                tint: AppTheme.classic,
                action: model.roleDone
            )
        }
        .padding(16)
        .padding(.bottom, 12)
    }

    private var discussionView: some View {
        VStack(spacing: 18) {
            GameHeaderBar(
                title: "Diskussion",
                subtitle: "Runde \(model.round)",
                trailingTitle: "Verlassen",
                onTrailing: { confirmLeave = true }
            )

            Spacer()

            Text(model.discussionStarter?.avatar ?? "😎")
                .font(.system(size: 72))
            Text(model.discussionStarter?.name ?? "Spieler")
                .font(.system(size: 30, weight: .black, design: .rounded))
                .foregroundStyle(AppTheme.text)
            Text("beginnt")
                .font(.headline.weight(.bold))
                .foregroundStyle(AppTheme.classic)

            Text("Beschreibt das geheime Wort der Reihe nach, ohne es direkt zu nennen. Findet heraus, wer blufft.")
                .font(.body)
                .foregroundStyle(AppTheme.muted)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 20)

            if model.timerSeconds > 0 {
                VStack(spacing: 10) {
                    Text(model.remainingLabel)
                        .font(.system(size: 42, weight: .black, design: .monospaced))
                        .foregroundStyle(model.timerRemaining == 0 ? AppTheme.danger : AppTheme.text)

                    ProgressView(value: Double(model.timerRemaining), total: Double(max(1, model.timerSeconds)))
                        .tint(model.timerRemaining < 20 ? AppTheme.danger : AppTheme.classic)

                    Button {
                        model.toggleTimerPause()
                    } label: {
                        Label(model.timerPaused ? "Fortsetzen" : "Pause", systemImage: model.timerPaused ? "play.fill" : "pause.fill")
                            .font(.subheadline.weight(.bold))
                    }
                    .buttonStyle(.bordered)
                    .tint(AppTheme.classic)
                    .disabled(model.timerRemaining == 0)
                }
                .padding(16)
                .appPanel()
            }

            Spacer()

            PrimaryGameButton(title: "Auflösung", tint: AppTheme.classic, action: model.reveal)
        }
        .padding(16)
        .padding(.bottom, 12)
    }

    private var resultView: some View {
        VStack(spacing: 18) {
            Spacer()

            Text(model.impostor?.avatar ?? "🎭")
                .font(.system(size: 82))

            SectionEyebrow(text: "IMPOSTOR")
            Text("\(model.impostor?.name ?? "Spieler") war der Impostor")
                .font(.system(size: 30, weight: .black, design: .rounded))
                .foregroundStyle(AppTheme.text)
                .multilineTextAlignment(.center)

            PanelCard {
                VStack(spacing: 6) {
                    Text("GEHEIMES WORT")
                        .font(.caption2.weight(.black))
                        .tracking(1)
                        .foregroundStyle(AppTheme.muted)
                    Text(model.current?.word ?? "")
                        .font(.system(size: 38, weight: .black, design: .rounded))
                        .foregroundStyle(AppTheme.classic)
                }
                .frame(maxWidth: .infinity)
            }

            Spacer()

            HStack(spacing: 10) {
                Button {
                    model.leaveToSetup()
                } label: {
                    Text("Zum Start")
                        .font(.headline.weight(.bold))
                        .frame(maxWidth: .infinity)
                        .frame(height: 54)
                        .foregroundStyle(AppTheme.text)
                        .background(AppTheme.card, in: RoundedRectangle(cornerRadius: 16))
                }
                .buttonStyle(.plain)

                PrimaryGameButton(title: "Nächste Runde", tint: AppTheme.classic, action: model.nextRound)
            }
        }
        .padding(16)
        .padding(.bottom, 12)
    }

    private func timerText(_ seconds: Int) -> String {
        guard seconds > 0 else { return "Aus" }
        return String(format: "%d:%02d", seconds / 60, seconds % 60)
    }
}
