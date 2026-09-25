import SwiftUI

struct CharadesView: View {
    @StateObject private var model: CharadesGameModel
    @ObservedObject private var store: AppStore
    @State private var confirmLeave = false

    init(repository: ContentRepository, store: AppStore) {
        _store = ObservedObject(wrappedValue: store)
        _model = StateObject(wrappedValue: CharadesGameModel(repository: repository, store: store))
    }

    var body: some View {
        ZStack {
            AppTheme.background.ignoresSafeArea()

            switch model.phase {
            case .setup:
                setupView
            case .handoff:
                handoffView
            case .countdown:
                countdownView
            case .playing:
                playView
            case .turnResult:
                turnResultView
            case .finalResult:
                finalResultView
            }
        }
        .navigationTitle("Scharade")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar(model.phase == .playing || model.phase == .countdown ? .hidden : .visible, for: .navigationBar)
        .toolbar {
            ToolbarItemGroup(placement: .topBarTrailing) {
                Button {
                    store.setPreference("sound", value: !store.data.preferences.sound)
                } label: {
                    Image(systemName: store.data.preferences.sound ? "speaker.wave.2.fill" : "speaker.slash.fill")
                }

                if model.phase != .setup {
                    Button {
                        confirmLeave = true
                    } label: {
                        Image(systemName: "xmark")
                    }
                }
            }
        }
        .alert("Scharade verlassen?", isPresented: $confirmLeave) {
            Button("Abbrechen", role: .cancel) {}
            Button("Verlassen", role: .destructive) { model.backToSetup() }
        } message: {
            Text("Die aktuelle Partie wird beendet.")
        }
        .onDisappear {
            if model.phase == .playing || model.phase == .countdown {
                model.finishTurn()
            }
        }
    }

    private var setupView: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                VStack(spacing: 7) {
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

                CategorySelector(
                    categories: model.payload.categories,
                    selection: $model.selectedCategories,
                    tint: AppTheme.charades,
                    onChange: model.categoriesChanged
                )

                VStack(alignment: .leading, spacing: 10) {
                    SectionEyebrow(text: "RUNDENDAUER")
                    HStack(spacing: 7) {
                        ForEach([30, 45, 60, 90, 120], id: \.self) { seconds in
                            Button {
                                model.selectDuration(seconds)
                            } label: {
                                Text("\(seconds)s")
                                    .font(.caption.weight(.black))
                                    .frame(maxWidth: .infinity)
                                    .frame(height: 44)
                                    .foregroundStyle(model.duration == seconds ? AppTheme.text : AppTheme.muted)
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
                }

                PlayerSetupEditor(
                    players: $model.players,
                    minimum: 2,
                    maximum: 12,
                    tint: AppTheme.charades,
                    onChange: model.saveSetup
                )

                HStack(spacing: 12) {
                    Image(systemName: "waveform.path")
                        .font(.title2)
                        .foregroundStyle(AppTheme.charades)

                    VStack(alignment: .leading, spacing: 3) {
                        Text("Wippen + Tasten")
                            .font(.subheadline.weight(.bold))
                            .foregroundStyle(AppTheme.text)
                        Text("Eine Wertung braucht eine deutliche Bewegung. Danach sind Wippen und Tasten 3 Sekunden gesperrt. Touch bleibt der Fallback.")
                            .font(.caption)
                            .foregroundStyle(AppTheme.muted)
                    }
                }
                .padding(14)
                .appPanel(cornerRadius: 17)

                if let error = model.errorMessage {
                    Text(error)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(AppTheme.danger)
                }

                PrimaryGameButton(
                    title: "Partie starten",
                    tint: AppTheme.charades,
                    enabled: model.availableCount > 0,
                    action: { model.startParty() }
                )
            }
            .padding(16)
            .padding(.bottom, 24)
        }
    }

    private var handoffView: some View {
        VStack(spacing: 18) {
            GameHeaderBar(
                title: model.currentPlayer?.name ?? "Spieler",
                subtitle: "Spieler \(model.playerIndex + 1) von \(model.players.count)"
            )

            Spacer()

            Text(model.currentPlayer?.avatar ?? "😎")
                .font(.system(size: 76))
            Text("Handy an die Stirn")
                .font(.system(size: 31, weight: .black, design: .rounded))
                .foregroundStyle(AppTheme.text)
            Text(model.currentPlayer?.name ?? "Spieler")
                .font(.title2.weight(.black))
                .foregroundStyle(AppTheme.charades)

            Text("Du bist dran. Halte das Handy gleich mit dem Display nach außen an deine Stirn.")
                .font(.body)
                .foregroundStyle(AppTheme.muted)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 26)

            Text("Nach vorne: Richtig · zur Stirn zurück: Überspringen. Danach wieder in die Mittelposition.")
                .font(.caption.weight(.semibold))
                .foregroundStyle(AppTheme.muted)
                .multilineTextAlignment(.center)
                .padding(12)
                .frame(maxWidth: .infinity)
                .background(AppTheme.card, in: RoundedRectangle(cornerRadius: 15))

            Spacer()

            PrimaryGameButton(title: "Sensor aktivieren & starten", tint: AppTheme.charades, action: model.beginTurn)
        }
        .padding(16)
        .padding(.bottom, 12)
    }

    private var countdownView: some View {
        VStack(spacing: 14) {
            Spacer()
            Text(model.currentPlayer?.avatar ?? "😎")
                .font(.system(size: 64))
            Text(model.countdownText)
                .font(.system(size: model.countdownText == "LOS" ? 70 : 96, weight: .black, design: .rounded))
                .foregroundStyle(model.countdownText == "LOS" ? AppTheme.charades : AppTheme.text)
                .contentTransition(.numericText())
            Text("Handy ruhig an der Stirn halten")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(AppTheme.muted)
            Spacer()
        }
        .padding(20)
    }

    private var playView: some View {
        GeometryReader { geometry in
            Group {
                if geometry.size.width > geometry.size.height {
                    landscapePlayView
                } else {
                    portraitPlayView
                }
            }
            .frame(width: geometry.size.width, height: geometry.size.height)
        }
        .padding(12)
    }

    private var portraitPlayView: some View {
        VStack(spacing: 10) {
            playMetaBar
            playerIdentity
            termCard
            motionBar
            actionButtons
        }
    }

    private var landscapePlayView: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 12) {
                Text("\(model.remaining)s")
                    .font(.system(size: 30, weight: .black, design: .rounded))
                    .foregroundStyle(AppTheme.text)

                playerIdentity

                Text("✓ \(model.correct) · ↷ \(model.skipped)")
                    .font(.subheadline.weight(.black))
                    .foregroundStyle(AppTheme.muted)

                Spacer()

                Button("Beenden") {
                    model.finishTurn()
                }
                .font(.subheadline.weight(.bold))
                .foregroundStyle(AppTheme.accent)
            }
            .frame(width: 118, alignment: .leading)

            termCard

            VStack(spacing: 10) {
                Text(model.motion.isAvailable ? "Core Motion aktiv" : "Touch-Fallback")
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(AppTheme.muted)
                    .multilineTextAlignment(.center)

                Button(model.motion.directionsFlipped ? "↕ Getauscht" : "↕ Richtung tauschen") {
                    model.flipMotionDirection()
                }
                .font(.caption2.weight(.bold))
                .foregroundStyle(AppTheme.charades)

                Spacer(minLength: 4)
                actionButtonsVertical
            }
            .frame(width: 178)
        }
    }

    private var playMetaBar: some View {
        HStack {
            Text("\(model.remaining)s")
                .font(.subheadline.weight(.black))
                .foregroundStyle(AppTheme.text)

            Spacer()

            Text("✓ \(model.correct) · ↷ \(model.skipped)")
                .font(.caption.weight(.black))
                .foregroundStyle(AppTheme.muted)

            Button("Beenden") {
                model.finishTurn()
            }
            .font(.caption.weight(.bold))
            .foregroundStyle(AppTheme.accent)
        }
    }

    private var playerIdentity: some View {
        VStack(spacing: 3) {
            Text(model.currentPlayer?.avatar ?? "😎")
                .font(.title2)
            Text(model.currentPlayer?.name ?? "Spieler")
                .font(.caption.weight(.bold))
                .foregroundStyle(AppTheme.muted)
                .lineLimit(1)
        }
    }

    private var termCard: some View {
        VStack(spacing: 12) {
            Text(model.currentTerm?.cat.uppercased() ?? "KATEGORIE")
                .font(.caption2.weight(.black))
                .tracking(1)
                .foregroundStyle(AppTheme.charades.opacity(0.85))

            Text(model.currentTerm?.term ?? "…")
                .font(.system(size: 48, weight: .black, design: .rounded))
                .minimumScaleFactor(0.35)
                .lineLimit(4)
                .multilineTextAlignment(.center)
                .foregroundStyle(AppTheme.text)
                .padding(.horizontal, 8)

            Text(model.motion.statusText)
                .font(.caption.weight(.semibold))
                .foregroundStyle(AppTheme.muted)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(18)
        .background(
            LinearGradient(
                colors: [AppTheme.charades.opacity(0.15), AppTheme.card],
                startPoint: .top,
                endPoint: .bottom
            ),
            in: RoundedRectangle(cornerRadius: 28, style: .continuous)
        )
        .overlay {
            RoundedRectangle(cornerRadius: 28, style: .continuous)
                .stroke(Color.white.opacity(0.08))
        }
    }

    private var motionBar: some View {
        HStack {
            Text(model.motion.isAvailable ? "Core Motion aktiv" : "Touch-Fallback")
                .font(.caption2.weight(.bold))
                .foregroundStyle(AppTheme.muted)

            Spacer()

            Button(model.motion.directionsFlipped ? "↕ Getauscht" : "↕ Richtung tauschen") {
                model.flipMotionDirection()
            }
            .font(.caption2.weight(.bold))
            .foregroundStyle(AppTheme.charades)
        }
    }

    private var actionButtons: some View {
        HStack(spacing: 9) {
            skipButton
            correctButton
        }
        .buttonStyle(.plain)
    }

    private var actionButtonsVertical: some View {
        VStack(spacing: 9) {
            skipButton
            correctButton
        }
        .buttonStyle(.plain)
    }

    private var skipButton: some View {
        Button {
            model.applyTouch(.skipped)
        } label: {
            Text("Überspringen")
                .font(.subheadline.weight(.black))
                .frame(maxWidth: .infinity)
                .frame(height: 56)
                .foregroundStyle(AppTheme.text)
                .background(AppTheme.danger.opacity(0.15), in: RoundedRectangle(cornerRadius: 16))
        }
        .disabled(model.motion.isLocked)
    }

    private var correctButton: some View {
        Button {
            model.applyTouch(.correct)
        } label: {
            Text("Richtig")
                .font(.subheadline.weight(.black))
                .frame(maxWidth: .infinity)
                .frame(height: 56)
                .foregroundStyle(Color.black.opacity(0.84))
                .background(AppTheme.charades, in: RoundedRectangle(cornerRadius: 16))
        }
        .disabled(model.motion.isLocked)
    }

    private var turnResultView: some View {
        VStack(spacing: 14) {
            if let result = model.currentTurnResult {
                Text(result.player.avatar)
                    .font(.system(size: 58))
                Text(result.player.name)
                    .font(.title2.weight(.black))
                    .foregroundStyle(AppTheme.text)

                HStack(spacing: 10) {
                    scoreCard(value: result.correct, label: "Richtig", tint: AppTheme.success)
                    scoreCard(value: result.skipped, label: "Übersprungen", tint: AppTheme.accent)
                }

                List(result.items) { item in
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
                            .foregroundStyle(item.decision == .correct ? AppTheme.success : AppTheme.accent)
                    }
                    .listRowBackground(AppTheme.card)
                }
                .scrollContentBackground(.hidden)

                PrimaryGameButton(
                    title: model.playerIndex == model.players.count - 1 ? "Gesamtergebnis" : "Nächster Spieler",
                    tint: AppTheme.charades,
                    action: model.advancePlayer
                )
            }
        }
        .padding(16)
        .padding(.bottom, 10)
    }

    private var finalResultView: some View {
        VStack(spacing: 14) {
            Text("🏆")
                .font(.system(size: 56))
            SectionEyebrow(text: "GESAMTERGEBNIS")
            Text("Scharade")
                .font(.system(size: 31, weight: .black, design: .rounded))
                .foregroundStyle(AppTheme.text)

            ScrollView {
                VStack(spacing: 8) {
                    ForEach(Array(model.leaderboard.enumerated()), id: \.element.id) { index, row in
                        HStack(spacing: 11) {
                            Text("#\(index + 1)")
                                .font(.caption.weight(.black))
                                .foregroundStyle(AppTheme.muted)
                                .frame(width: 30)
                            Text(row.player.avatar)
                                .font(.title2)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(row.player.name)
                                    .font(.headline.weight(.black))
                                    .foregroundStyle(AppTheme.text)
                                Text("\(row.skipped) übersprungen")
                                    .font(.caption)
                                    .foregroundStyle(AppTheme.muted)
                            }
                            Spacer()
                            Text("\(row.correct)")
                                .font(.system(size: 28, weight: .black, design: .rounded))
                                .foregroundStyle(AppTheme.charades)
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

                PrimaryGameButton(title: "Noch eine Partie", tint: AppTheme.charades, action: model.sameGroupAgain)
            }
        }
        .padding(16)
        .padding(.bottom, 10)
    }

    private func scoreCard(value: Int, label: String, tint: Color) -> some View {
        VStack(spacing: 3) {
            Text("\(value)")
                .font(.system(size: 32, weight: .black, design: .rounded))
                .foregroundStyle(tint)
            Text(label)
                .font(.caption.weight(.bold))
                .foregroundStyle(AppTheme.muted)
        }
        .frame(maxWidth: .infinity)
        .padding(12)
        .background(AppTheme.card, in: RoundedRectangle(cornerRadius: 16))
    }
}
