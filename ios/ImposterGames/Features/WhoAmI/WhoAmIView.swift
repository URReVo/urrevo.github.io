import SwiftUI

struct WhoAmIView: View {
    @StateObject private var model: WhoAmIGameModel
    @ObservedObject private var store: AppStore
    @State private var confirmFreshRound = false

    init(repository: ContentRepository, store: AppStore) {
        _store = ObservedObject(wrappedValue: store)
        _model = StateObject(wrappedValue: WhoAmIGameModel(repository: repository, store: store))
    }

    var body: some View {
        ZStack {
            AppTheme.background.ignoresSafeArea()

            switch model.phase {
            case .setup:
                setupView
            case .handoff:
                handoffView
            case .viewer:
                viewerView
            case .play:
                playView
            case .result:
                resultView
            }
        }
        .navigationTitle("Wer bin ich?")
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
            Button("Neue Runde") { model.startRound(useExistingPlayers: true) }
        } message: {
            Text("Die aktuelle Runde wird verworfen.")
        }
    }

    private var setupView: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                VStack(spacing: 7) {
                    Text("❓")
                        .font(.system(size: 58))
                    Text("Wer bin ich?")
                        .font(.system(size: 31, weight: .black, design: .rounded))
                        .foregroundStyle(AppTheme.text)
                    Text("Du siehst die Begriffe der anderen – nur deinen eigenen nicht.")
                        .font(.subheadline)
                        .foregroundStyle(AppTheme.muted)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)

                CategorySelector(
                    categories: model.payload.categories,
                    selection: $model.selectedCategories,
                    tint: AppTheme.whoAmI,
                    onChange: model.categoriesChanged
                )

                PlayerSetupEditor(
                    players: $model.players,
                    minimum: 2,
                    maximum: 12,
                    tint: AppTheme.whoAmI,
                    onChange: model.saveSetup
                )

                if let error = model.errorMessage {
                    Text(error)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(AppTheme.danger)
                }

                PrimaryGameButton(
                    title: "Begriffe verteilen",
                    tint: AppTheme.whoAmI,
                    enabled: model.availableCount >= model.players.count,
                    action: { model.startRound() }
                )
            }
            .padding(16)
            .padding(.bottom, 24)
        }
    }

    private var handoffView: some View {
        VStack(spacing: 16) {
            GameHeaderBar(
                title: "Runde \(model.round)",
                subtitle: "\(model.activeViewer + 1)/\(model.players.count)"
            )

            Spacer()

            Text(model.activePlayer?.avatar ?? "😎")
                .font(.system(size: 78))
            Text("Handy an")
                .font(.headline)
                .foregroundStyle(AppTheme.muted)
            Text(model.activePlayer?.name ?? "Spieler")
                .font(.system(size: 34, weight: .black, design: .rounded))
                .foregroundStyle(AppTheme.text)

            Text("Nur diese Person darf jetzt auf den Bildschirm schauen.")
                .font(.subheadline)
                .foregroundStyle(AppTheme.muted)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 26)

            Spacer()

            PrimaryGameButton(title: "Ich bin bereit", tint: AppTheme.whoAmI, action: model.showViewer)
        }
        .padding(16)
        .padding(.bottom, 12)
    }

    private var viewerView: some View {
        VStack(spacing: 14) {
            HStack {
                Text(model.activePlayer?.avatar ?? "😎")
                    .font(.title)
                VStack(alignment: .leading, spacing: 1) {
                    Text(model.activePlayer?.name ?? "Spieler")
                        .font(.headline.weight(.black))
                        .foregroundStyle(AppTheme.text)
                    Text("\(model.activeViewer + 1)/\(model.players.count)")
                        .font(.caption)
                        .foregroundStyle(AppTheme.muted)
                }
                Spacer()
            }

            Text("Dein eigener Begriff bleibt verborgen.")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(AppTheme.muted)

            ScrollView {
                VStack(spacing: 8) {
                    ForEach(Array(model.assignments.enumerated()), id: \.element.id) { index, assignment in
                        let own = index == model.activeViewer
                        HStack(spacing: 11) {
                            Text(assignment.player.avatar)
                                .font(.title2)
                                .frame(width: 42)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(assignment.player.name + (own ? " · DU" : ""))
                                    .font(.caption.weight(.bold))
                                    .foregroundStyle(AppTheme.muted)
                                Text(own ? "???" : assignment.term.term)
                                    .font(.headline.weight(.black))
                                    .lineLimit(nil)
                                    .fixedSize(horizontal: false, vertical: true)
                                    .foregroundStyle(own ? AppTheme.whoAmI : AppTheme.text)
                            }
                            Spacer()
                        }
                        .padding(13)
                        .background(
                            own ? AppTheme.whoAmI.opacity(0.13) : AppTheme.card,
                            in: RoundedRectangle(cornerRadius: 15)
                        )
                        .overlay {
                            RoundedRectangle(cornerRadius: 15)
                                .stroke(own ? AppTheme.whoAmI.opacity(0.65) : Color.white.opacity(0.05))
                        }
                    }
                }
            }

            PrimaryGameButton(
                title: model.activeViewer == model.players.count - 1 ? "Gesehen · Fertig" : "Gesehen · Weitergeben",
                tint: AppTheme.whoAmI,
                action: model.finishViewer
            )
        }
        .padding(16)
        .padding(.bottom, 10)
    }

    private var playView: some View {
        VStack(spacing: 18) {
            Spacer()

            Text("❓")
                .font(.system(size: 80))
            Text("Alle haben geschaut.")
                .font(.system(size: 36, weight: .black, design: .rounded))
                .foregroundStyle(AppTheme.text)
            Text("Fragt, ratet und diskutiert jetzt miteinander. Die App greift nicht in eure Runde ein.")
                .font(.body)
                .foregroundStyle(AppTheme.muted)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 24)

            PanelCard {
                VStack(spacing: 6) {
                    SectionEyebrow(text: "REGEL")
                    Text("Öffnet die Auflösung erst, wenn ihr fertig seid.")
                        .font(.subheadline.weight(.bold))
                        .foregroundStyle(AppTheme.text)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
            }

            Spacer()

            PrimaryGameButton(title: "Auflösen", tint: AppTheme.whoAmI, action: model.revealAll)
        }
        .padding(16)
        .padding(.bottom, 12)
    }

    private var resultView: some View {
        VStack(spacing: 14) {
            SectionEyebrow(text: "AUFLÖSUNG")
            Text("Das wart ihr.")
                .font(.system(size: 30, weight: .black, design: .rounded))
                .foregroundStyle(AppTheme.text)

            ScrollView {
                VStack(spacing: 8) {
                    ForEach(model.assignments) { assignment in
                        HStack(spacing: 11) {
                            Text(assignment.player.avatar)
                                .font(.title2)
                                .frame(width: 42)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(assignment.player.name + " · " + assignment.term.cat)
                                    .font(.caption.weight(.bold))
                                    .foregroundStyle(AppTheme.muted)
                                Text(assignment.term.term)
                                    .font(.headline.weight(.black))
                                    .foregroundStyle(AppTheme.text)
                            }
                            Spacer()
                        }
                        .padding(13)
                        .background(AppTheme.card, in: RoundedRectangle(cornerRadius: 15))
                    }
                }
            }

            HStack(spacing: 10) {
                Button {
                    model.backToSetup()
                } label: {
                    Text("Spieler & Kategorien")
                        .font(.headline.weight(.bold))
                        .frame(maxWidth: .infinity)
                        .frame(height: 54)
                        .foregroundStyle(AppTheme.text)
                        .background(AppTheme.card, in: RoundedRectangle(cornerRadius: 16))
                }
                .buttonStyle(.plain)

                PrimaryGameButton(
                    title: "Neue Runde",
                    tint: AppTheme.whoAmI,
                    action: { model.startRound(useExistingPlayers: true) }
                )
            }
        }
        .padding(16)
        .padding(.bottom, 10)
    }
}
