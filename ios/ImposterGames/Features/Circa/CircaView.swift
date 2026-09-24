import SwiftUI

struct CircaView: View {
    @StateObject private var model: CircaGameModel
    @ObservedObject private var store: AppStore
    @State private var showStats = false
    @State private var statsMetric = "closest"
    @State private var confirmFreshRound = false
    @State private var confirmLeave = false

    init(repository: ContentRepository, store: AppStore) {
        _store = ObservedObject(wrappedValue: store)
        _model = StateObject(wrappedValue: CircaGameModel(repository: repository, store: store))
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
            case .question:
                questionView
            case .normalReveal:
                normalRevealView
            case .answers:
                answersView
            case .result:
                resultView
            }
        }
        .navigationTitle("Circa Imposter")
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
        .sheet(isPresented: $showStats) {
            statsSheet
        }
        .alert("Neue Runde starten?", isPresented: $confirmFreshRound) {
            Button("Abbrechen", role: .cancel) {}
            Button("Neue Runde") { model.nextRound() }
        } message: {
            Text("Die aktuelle Runde wird abgebrochen.")
        }
        .alert("Partie verlassen?", isPresented: $confirmLeave) {
            Button("Abbrechen", role: .cancel) {}
            Button("Verlassen", role: .destructive) { model.leaveToSetup() }
        } message: {
            Text("Du kehrst zum Circa-Setup zurück.")
        }
    }

    private var setupView: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                gameHero

                CategorySelector(
                    categories: model.categories,
                    selection: $model.selectedCategories,
                    tint: AppTheme.circa,
                    onChange: model.categoriesChanged
                )

                VStack(alignment: .leading, spacing: 10) {
                    SectionEyebrow(text: "SCHWIERIGKEIT")
                    HStack(spacing: 7) {
                        difficultyButton("leicht", title: "Leicht")
                        difficultyButton("mittel", title: "Mittel")
                        difficultyButton("schwer", title: "Schwer")
                        difficultyButton("zufaellig", title: "Zufall")
                    }
                    Text(model.difficultyHint)
                        .font(.caption)
                        .foregroundStyle(AppTheme.muted)
                }

                PlayerSetupEditor(
                    players: $model.players,
                    minimum: 3,
                    maximum: 12,
                    tint: AppTheme.circa,
                    onChange: model.saveSetup
                )

                if let error = model.errorMessage {
                    Text(error)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(AppTheme.danger)
                }

                HStack(spacing: 10) {
                    Button {
                        showStats = true
                    } label: {
                        Label("Statistik", systemImage: "chart.bar.fill")
                            .font(.subheadline.weight(.bold))
                            .frame(maxWidth: .infinity)
                            .frame(height: 50)
                            .foregroundStyle(AppTheme.text)
                            .background(AppTheme.card, in: RoundedRectangle(cornerRadius: 15, style: .continuous))
                    }
                    .buttonStyle(.plain)

                    PrimaryGameButton(
                        title: "Starten · \(model.availableCount) Fragen",
                        tint: AppTheme.circa,
                        enabled: model.availableCount > 0,
                        action: model.startParty
                    )
                }
            }
            .padding(16)
            .padding(.bottom, 24)
        }
    }

    private var gameHero: some View {
        VStack(spacing: 7) {
            Text("🎯")
                .font(.system(size: 58))
            Text("Circa Imposter")
                .font(.system(size: 31, weight: .black, design: .rounded))
                .foregroundStyle(AppTheme.text)
            Text("Alle schätzen – aber eine Person bekommt heimlich eine andere Frage.")
                .font(.subheadline)
                .foregroundStyle(AppTheme.muted)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
    }

    private func difficultyButton(_ value: String, title: String) -> some View {
        Button {
            model.selectDifficulty(value)
        } label: {
            Text(title)
                .font(.caption.weight(.black))
                .frame(maxWidth: .infinity)
                .frame(height: 43)
                .foregroundStyle(model.difficulty == value ? AppTheme.text : AppTheme.muted)
                .background(
                    model.difficulty == value ? AppTheme.circa.opacity(0.17) : AppTheme.card,
                    in: RoundedRectangle(cornerRadius: 13, style: .continuous)
                )
                .overlay {
                    RoundedRectangle(cornerRadius: 13, style: .continuous)
                        .stroke(model.difficulty == value ? AppTheme.circa.opacity(0.72) : Color.white.opacity(0.05))
                }
        }
        .buttonStyle(.plain)
    }

    private var introView: some View {
        VStack(spacing: 14) {
            Spacer()
            Text("🎯")
                .font(.system(size: 72))
            SectionEyebrow(text: model.current?.cat.uppercased() ?? "CIRCA")
            Text("Runde \(model.round)")
                .font(.system(size: 38, weight: .black, design: .rounded))
                .foregroundStyle(AppTheme.text)
            Text(model.difficultyName)
                .font(.headline.weight(.bold))
                .foregroundStyle(AppTheme.circa)
            Spacer()
        }
        .padding(20)
    }

    private var handoffView: some View {
        VStack(spacing: 16) {
            GameHeaderBar(
                title: model.selectedCategoryLabel,
                subtitle: "Runde \(model.round) · \(model.difficultyName)",
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

            PrimaryGameButton(title: "Ich bin bereit", tint: AppTheme.circa, action: model.showQuestion)
        }
        .padding(16)
        .padding(.bottom, 12)
    }

    private var questionView: some View {
        VStack(spacing: 13) {
            GameHeaderBar(
                title: model.currentPlayer?.name ?? "Spieler",
                subtitle: "\(model.activeIndex + 1)/\(model.players.count)",
                trailingTitle: "Verlassen",
                onTrailing: { confirmLeave = true }
            )

            VStack(spacing: 12) {
                Text(model.currentIsImpostor ? "DEINE FRAGE" : "DEINE FRAGE")
                    .font(.caption2.weight(.black))
                    .tracking(1)
                    .foregroundStyle(AppTheme.circa)
                Text(model.currentQuestionText)
                    .font(.system(size: 29, weight: .black, design: .rounded))
                    .minimumScaleFactor(0.55)
                    .multilineTextAlignment(.center)
                    .foregroundStyle(AppTheme.text)
                    .padding(.horizontal, 8)
                Text("Einheit: \(model.currentUnit.isEmpty ? "–" : model.currentUnit)")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(AppTheme.muted)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .padding(18)
            .background(
                LinearGradient(
                    colors: [AppTheme.circa.opacity(0.15), AppTheme.card],
                    startPoint: .top,
                    endPoint: .bottom
                ),
                in: RoundedRectangle(cornerRadius: 28, style: .continuous)
            )
            .overlay {
                RoundedRectangle(cornerRadius: 28, style: .continuous)
                    .stroke(Color.white.opacity(0.07))
            }

            VStack(spacing: 7) {
                Text(model.formatEstimate(model.currentGuess))
                    .font(.system(size: 36, weight: .black, design: .rounded))
                    .foregroundStyle(AppTheme.text)
                Text(model.currentUnit)
                    .font(.caption.weight(.bold))
                    .foregroundStyle(AppTheme.muted)

                Slider(
                    value: $model.currentGuess,
                    in: 0...max(1, model.sliderMax),
                    step: max(0.0001, model.sliderStep)
                )
                .tint(AppTheme.circa)

                HStack {
                    Text("0")
                    Spacer()
                    Text(model.formatEstimate(model.sliderMax))
                }
                .font(.caption2.weight(.bold))
                .foregroundStyle(AppTheme.muted)
            }
            .padding(.horizontal, 4)

            PrimaryGameButton(title: "Schätzung speichern", tint: AppTheme.circa, action: model.saveGuess)
        }
        .padding(16)
        .padding(.bottom, 10)
    }

    private var normalRevealView: some View {
        VStack(spacing: 16) {
            Spacer()

            SectionEyebrow(text: model.normalQuestionVisible ? "DAS WAR DIE RICHTIGE FRAGE" : "WELCHE FRAGE HATTEN DIE MEISTEN?")
            Text(model.normalQuestionVisible ? (model.current?.normal ?? "") : "?")
                .font(.system(size: model.normalQuestionVisible ? 30 : 72, weight: .black, design: .rounded))
                .minimumScaleFactor(0.55)
                .multilineTextAlignment(.center)
                .foregroundStyle(AppTheme.text)
                .padding(22)
                .frame(maxWidth: .infinity, minHeight: 260)
                .background(AppTheme.card, in: RoundedRectangle(cornerRadius: 28, style: .continuous))

            Text(model.normalQuestionVisible ? "Einheit: \(model.current?.normalUnit ?? "–")" : "Die gemeinsame Frage bleibt noch einen Moment verdeckt.")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(AppTheme.muted)
                .multilineTextAlignment(.center)

            Spacer()

            PrimaryGameButton(
                title: model.normalQuestionVisible ? "Schätzungen anzeigen" : "Richtige Frage aufdecken",
                tint: AppTheme.circa,
                action: model.revealNormalQuestionOrContinue
            )
        }
        .padding(16)
        .padding(.bottom, 12)
    }

    private var answersView: some View {
        VStack(spacing: 14) {
            VStack(spacing: 4) {
                SectionEyebrow(text: "SCHÄTZUNGEN")
                Text(model.current?.normal ?? "")
                    .font(.headline.weight(.black))
                    .foregroundStyle(AppTheme.text)
                    .multilineTextAlignment(.center)
                Text("Einheit: \(model.current?.normalUnit ?? "–")")
                    .font(.caption)
                    .foregroundStyle(AppTheme.muted)
            }

            ScrollView {
                VStack(spacing: 8) {
                    ForEach(model.players.indices, id: \.self) { index in
                        let isImpostor = model.impostorRevealed && model.impostor?.id == model.players[index].id
                        HStack(spacing: 10) {
                            Text(model.players[index].avatar)
                                .font(.title2)
                            Text(model.players[index].name)
                                .font(.subheadline.weight(.bold))
                                .foregroundStyle(AppTheme.text)
                            Spacer()
                            Text(model.formatEstimate(model.guess(for: index)))
                                .font(.headline.weight(.black))
                                .foregroundStyle(isImpostor ? AppTheme.danger : AppTheme.text)
                            if isImpostor {
                                Text("×")
                                    .font(.title2.weight(.black))
                                    .foregroundStyle(AppTheme.danger)
                            }
                        }
                        .padding(13)
                        .background(
                            isImpostor ? AppTheme.danger.opacity(0.12) : AppTheme.card,
                            in: RoundedRectangle(cornerRadius: 15, style: .continuous)
                        )
                    }
                }
            }

            PrimaryGameButton(
                title: model.impostorRevealed ? "Auflösung" : "Impostor aufdecken",
                tint: model.impostorRevealed ? AppTheme.accent : AppTheme.circa,
                action: model.revealImpostorOrResolve
            )
        }
        .padding(16)
        .padding(.bottom, 10)
    }

    private var resultView: some View {
        ScrollView {
            VStack(spacing: 15) {
                PanelCard {
                    VStack(spacing: 8) {
                        SectionEyebrow(text: "RICHTIGE FRAGE")
                        Text(model.current?.normal ?? "")
                            .font(.headline.weight(.black))
                            .foregroundStyle(AppTheme.text)
                            .multilineTextAlignment(.center)
                        Text(model.current?.normalAnswer ?? "")
                            .font(.title2.weight(.black))
                            .foregroundStyle(AppTheme.success)
                    }
                    .frame(maxWidth: .infinity)
                }

                PanelCard {
                    VStack(spacing: 8) {
                        SectionEyebrow(text: "IMPOSTOR-FRAGE")
                        Text(model.current?.imp ?? "")
                            .font(.headline.weight(.black))
                            .foregroundStyle(AppTheme.text)
                            .multilineTextAlignment(.center)
                        Text(model.current?.impAnswer ?? "")
                            .font(.title2.weight(.black))
                            .foregroundStyle(AppTheme.accent)
                    }
                    .frame(maxWidth: .infinity)
                }

                if let closest = model.performances.first, let wild = model.performances.last {
                    HStack(spacing: 10) {
                        awardCard(icon: "🎯", title: "AM NÄCHSTEN", name: closest.name, error: closest.error, tint: AppTheme.success)
                        awardCard(icon: "😵", title: "WILDESTE", name: wild.name, error: wild.error, tint: AppTheme.accent)
                    }
                }

                PanelCard {
                    VStack(spacing: 12) {
                        Text(model.impostor?.avatar ?? "🎭")
                            .font(.system(size: 46))
                        Text(model.impostor?.name ?? "Impostor")
                            .font(.title2.weight(.black))
                            .foregroundStyle(AppTheme.text)
                        Text("Ist der Impostor unentdeckt geblieben?")
                            .font(.subheadline)
                            .foregroundStyle(AppTheme.muted)
                            .multilineTextAlignment(.center)

                        HStack(spacing: 9) {
                            outcomeButton("Ja", value: true)
                            outcomeButton("Nein", value: false)
                        }
                    }
                    .frame(maxWidth: .infinity)
                }

                if model.outcome != nil {
                    HStack(spacing: 10) {
                        Button {
                            model.leaveToSetup()
                        } label: {
                            Text("Setup")
                                .font(.headline.weight(.bold))
                                .frame(maxWidth: .infinity)
                                .frame(height: 52)
                                .background(AppTheme.card, in: RoundedRectangle(cornerRadius: 15))
                        }
                        .buttonStyle(.plain)
                        .foregroundStyle(AppTheme.text)

                        PrimaryGameButton(title: "Nächste Runde", tint: AppTheme.circa, action: model.nextRound)
                    }
                }
            }
            .padding(16)
            .padding(.bottom, 24)
        }
    }

    private func awardCard(icon: String, title: String, name: String, error: Double, tint: Color) -> some View {
        VStack(spacing: 5) {
            Text(icon)
                .font(.title2)
            Text(title)
                .font(.caption2.weight(.black))
                .foregroundStyle(tint)
            Text(name)
                .font(.headline.weight(.black))
                .foregroundStyle(AppTheme.text)
                .lineLimit(1)
            Text(error.formatted(.number.precision(.fractionLength(0...1))) + " % daneben")
                .font(.caption2)
                .foregroundStyle(AppTheme.muted)
        }
        .frame(maxWidth: .infinity)
        .padding(13)
        .background(AppTheme.card, in: RoundedRectangle(cornerRadius: 17))
    }

    private func outcomeButton(_ title: String, value: Bool) -> some View {
        let selected = model.outcome == value
        return Button {
            model.setOutcome(value)
        } label: {
            Text(title)
                .font(.headline.weight(.black))
                .frame(maxWidth: .infinity)
                .frame(height: 48)
                .foregroundStyle(selected ? Color.black : AppTheme.text)
                .background(
                    selected ? (value ? AppTheme.success : AppTheme.accent) : AppTheme.card,
                    in: RoundedRectangle(cornerRadius: 14)
                )
        }
        .buttonStyle(.plain)
    }

    private var statsSheet: some View {
        NavigationStack {
            ZStack {
                AppTheme.background.ignoresSafeArea()
                VStack(spacing: 14) {
                    Picker("Statistik", selection: $statsMetric) {
                        Text("Nah dran").tag("closest")
                        Text("Weit weg").tag("farthest")
                        Text("Impostor").tag("impostor")
                        Text("Siege").tag("impostorWins")
                    }
                    .pickerStyle(.segmented)

                    let rows = model.legacyLeaderboard(metric: statsMetric)
                    if rows.isEmpty {
                        ContentUnavailableView(
                            "Noch keine Daten",
                            systemImage: "chart.bar",
                            description: Text("Nach gespielten Circa-Runden erscheint hier die Rangliste.")
                        )
                    } else {
                        List(Array(rows.enumerated()), id: \.element.profile.id) { index, row in
                            HStack {
                                Text("#\(index + 1)")
                                    .font(.caption.weight(.black))
                                    .foregroundStyle(AppTheme.muted)
                                    .frame(width: 30)
                                Text(row.profile.avatar)
                                Text(row.profile.name)
                                    .font(.body.weight(.bold))
                                Spacer()
                                Text("\(row.value)×")
                                    .font(.headline.weight(.black))
                                    .foregroundStyle(AppTheme.circa)
                            }
                            .listRowBackground(AppTheme.card)
                        }
                        .scrollContentBackground(.hidden)
                    }
                }
                .padding(16)
            }
            .navigationTitle("Circa Statistik")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Fertig") { showStats = false }
                }
            }
        }
        .preferredColorScheme(.dark)
    }
}
