import SwiftUI

struct HomeView: View {
    let repository: ContentRepository
    @ObservedObject var store: AppStore
    @Binding var selectedTab: Int
    let onOpenGame: (GameDefinition.Kind) -> Void

    @State private var selectedPreset: QuickPreset?
    @State private var selectedSession: GameSession?
    @State private var showPresetEditor = false

    private let columns = [
        GridItem(.flexible(), spacing: 10),
        GridItem(.flexible(), spacing: 10)
    ]

    var body: some View {
        NavigationStack {
            ZStack {
                AppTheme.background.ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        header
                        hero

                        LazyVGrid(columns: columns, spacing: 10) {
                            ForEach(GameDefinition.all) { game in
                                Button {
                                    openGame(game.kind)
                                } label: {
                                    HomeGameCard(game: game)
                                }
                                .buttonStyle(.plain)
                            }
                        }

                        presetSection

                        if let active = store.activeSession {
                            activeSessionSection(active)
                        }

                        if let last = store.lastFinishedSession {
                            lastSessionSection(last)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 10)
                    .padding(.bottom, 28)
                }
            }
            .toolbar(.hidden, for: .navigationBar)
        }
        .sheet(item: $selectedPreset) { preset in
            presetSheet(preset)
        }
        .sheet(item: $selectedSession) { session in
            NavigationStack {
                SessionDetailView(session: session, store: store) { group, game in
                    selectedSession = nil
                    store.prepareLaunch(preset: nil, group: group)
                    routeSessionGame(game)
                }
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Schließen") { selectedSession = nil }
                    }
                }
            }
            .preferredColorScheme(.dark)
        }
        .sheet(isPresented: $showPresetEditor) {
            PresetEditorView(
                store: store,
                editing: nil,
                onSaved: { showPresetEditor = false },
                onCancel: { showPresetEditor = false }
            )
        }
    }

    private var header: some View {
        HStack(spacing: 10) {
            Button {
                selectedTab = 1
            } label: {
                HStack(spacing: 10) {
                    Text(store.selectedProfile.avatar)
                        .font(.title2)
                        .frame(width: 46, height: 46)
                        .background(Color.white.opacity(0.05), in: RoundedRectangle(cornerRadius: 14))
                    VStack(alignment: .leading, spacing: 1) {
                        Text(greeting)
                            .font(.caption)
                            .foregroundStyle(AppTheme.muted)
                        Text(store.selectedProfile.name)
                            .font(.subheadline.weight(.black))
                            .foregroundStyle(AppTheme.text)
                    }
                    Image(systemName: "chevron.right")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(AppTheme.muted)
                }
            }
            .buttonStyle(.plain)

            Spacer()

            Button {
                selectedTab = 3
            } label: {
                Image(systemName: "gearshape.fill")
                    .font(.headline)
                    .frame(width: 44, height: 44)
                    .foregroundStyle(AppTheme.text)
                    .background(AppTheme.card, in: Circle())
            }
            .buttonStyle(.plain)
        }
    }

    private var hero: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 5) {
                SectionEyebrow(text: "IMPOSTER GAMES")
                Text("Was spielen wir?")
                    .font(.system(size: 29, weight: .black, design: .rounded))
                    .foregroundStyle(AppTheme.text)
                Text("Direkt starten oder eine vorbereitete Runde wählen.")
                    .font(.subheadline)
                    .foregroundStyle(AppTheme.muted)
            }
            Spacer()
            Text("🎭")
                .font(.system(size: 45))
        }
        .padding(17)
        .background(
            LinearGradient(
                colors: [AppTheme.accent.opacity(0.13), AppTheme.panel],
                startPoint: .topTrailing,
                endPoint: .bottomLeading
            ),
            in: RoundedRectangle(cornerRadius: 22)
        )
        .overlay {
            RoundedRectangle(cornerRadius: 22)
                .stroke(Color.white.opacity(0.06))
        }
    }

    private var presetSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    SectionEyebrow(text: "SCHNELLSTART")
                    Text("Presets")
                        .font(.title3.weight(.black))
                        .foregroundStyle(AppTheme.text)
                }
                Spacer()
                Button("+ Eigenes") {
                    showPresetEditor = true
                }
                .font(.subheadline.weight(.bold))
                .foregroundStyle(AppTheme.accent)
            }

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 9) {
                    ForEach(store.allPresets) { preset in
                        Button {
                            selectedPreset = preset
                        } label: {
                            VStack(alignment: .leading, spacing: 7) {
                                Text(preset.icon)
                                    .font(.title2)
                                Text(preset.name)
                                    .font(.subheadline.weight(.black))
                                    .foregroundStyle(AppTheme.text)
                                    .lineLimit(1)
                                Text(preset.summary)
                                    .font(.caption2)
                                    .foregroundStyle(AppTheme.muted)
                                    .lineLimit(2)
                            }
                            .padding(13)
                            .frame(width: 154, height: 116, alignment: .topLeading)
                            .background(AppTheme.card, in: RoundedRectangle(cornerRadius: 17))
                            .overlay {
                                RoundedRectangle(cornerRadius: 17)
                                    .stroke(Color.white.opacity(0.05))
                            }
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }

    private func activeSessionSection(_ session: GameSession) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    SectionEyebrow(text: "AKTUELLE SESSION")
                    Text("Session läuft")
                        .font(.title3.weight(.black))
                        .foregroundStyle(AppTheme.text)
                }
                Spacer()
                Button("Beenden") {
                    _ = store.endSession()
                }
                .font(.subheadline.weight(.bold))
                .foregroundStyle(AppTheme.danger)
            }

            Button {
                selectedSession = session
            } label: {
                sessionCard(session, active: true)
            }
            .buttonStyle(.plain)

            Button {
                store.prepareLaunch(preset: nil, group: store.group(for: session))
                routeSessionGame(session.lastGame)
            } label: {
                Text("Session fortsetzen")
                    .font(.subheadline.weight(.black))
                    .frame(maxWidth: .infinity)
                    .frame(height: 48)
                    .foregroundStyle(Color.black.opacity(0.85))
                    .background(AppTheme.success, in: RoundedRectangle(cornerRadius: 15))
            }
            .buttonStyle(.plain)
        }
    }

    private func lastSessionSection(_ session: GameSession) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    SectionEyebrow(text: "LETZTE SESSION")
                    Text("Letzte Runde")
                        .font(.title3.weight(.black))
                        .foregroundStyle(AppTheme.text)
                }
                Spacer()
                Button("Ansehen") {
                    selectedSession = session
                }
                .font(.subheadline.weight(.bold))
                .foregroundStyle(AppTheme.accent)
            }

            Button {
                selectedSession = session
            } label: {
                sessionCard(session, active: false)
            }
            .buttonStyle(.plain)
        }
    }

    private func sessionCard(_ session: GameSession, active: Bool) -> some View {
        HStack(spacing: 12) {
            Text(active ? "🟢" : "🏆")
                .font(.title2)
                .frame(width: 44, height: 44)
                .background(Color.white.opacity(0.05), in: RoundedRectangle(cornerRadius: 13))

            VStack(alignment: .leading, spacing: 2) {
                Text("\(session.rounds.count) \(session.rounds.count == 1 ? "Runde" : "Runden")")
                    .font(.headline.weight(.black))
                    .foregroundStyle(AppTheme.text)
                Text(session.rounds.last.map { $0.game == "classic" ? "Zuletzt: Classic" : "Zuletzt: Circa" } ?? "Noch keine Runde abgeschlossen")
                    .font(.caption)
                    .foregroundStyle(AppTheme.muted)
            }

            Spacer()
            Image(systemName: "chevron.right")
                .font(.caption.weight(.black))
                .foregroundStyle(AppTheme.muted)
        }
        .padding(13)
        .background(AppTheme.card, in: RoundedRectangle(cornerRadius: 17))
    }

    private func presetSheet(_ preset: QuickPreset) -> some View {
        NavigationStack {
            ZStack {
                AppTheme.background.ignoresSafeArea()

                VStack(spacing: 16) {
                    Spacer()
                    Text(preset.icon)
                        .font(.system(size: 66))
                    SectionEyebrow(text: "PRESET")
                    Text(preset.name)
                        .font(.system(size: 31, weight: .black, design: .rounded))
                        .foregroundStyle(AppTheme.text)
                    Text(preset.summary)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(AppTheme.muted)
                        .multilineTextAlignment(.center)

                    PanelCard {
                        Text("Spielerzahl und Spieleinstellungen werden beim Start direkt vorausgefüllt.")
                            .font(.subheadline)
                            .foregroundStyle(AppTheme.muted)
                            .multilineTextAlignment(.center)
                            .frame(maxWidth: .infinity)
                    }

                    Spacer()

                    PrimaryGameButton(title: "Mit Preset starten", tint: AppTheme.accent) {
                        selectedPreset = nil
                        store.prepareLaunch(preset: preset)
                        openGame(preset.game == "classic" ? .classic : .circa)
                    }

                    if !preset.builtIn {
                        Button(role: .destructive) {
                            store.deletePreset(preset.id)
                            selectedPreset = nil
                        } label: {
                            Text("Eigenes Preset löschen")
                                .font(.headline.weight(.bold))
                                .frame(maxWidth: .infinity)
                                .frame(height: 48)
                        }
                        .buttonStyle(.bordered)
                        .tint(AppTheme.danger)
                    }
                }
                .padding(18)
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Schließen") { selectedPreset = nil }
                }
            }
        }
        .preferredColorScheme(.dark)
    }

    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: Date())
        if hour < 11 { return "Guten Morgen" }
        if hour < 18 { return "Guten Tag" }
        return "Guten Abend"
    }

    private func openGame(_ kind: GameDefinition.Kind) {
        if store.data.preferences.sound {
            SoundService.shared.selection(enabled: true)
        }
        if store.data.preferences.haptics {
            HapticsService.shared.selection()
        }
        onOpenGame(kind)
    }

    private func routeSessionGame(_ game: String?) {
        onOpenGame(game == "classic" ? .classic : .circa)
    }

    @ViewBuilder
    private func destination(for kind: GameDefinition.Kind) -> some View {
        switch kind {
        case .circa:
            CircaView(repository: repository, store: store)
        case .classic:
            ClassicView(repository: repository, store: store)
        case .whoAmI:
            WhoAmIView(repository: repository, store: store)
        case .charades:
            CharadesView(repository: repository, store: store)
        }
    }
}

private struct HomeGameCard: View {
    let game: GameDefinition

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text(game.emoji)
                    .font(.system(size: 27))
                    .frame(width: 48, height: 48)
                    .background(Color.white.opacity(0.06), in: RoundedRectangle(cornerRadius: 15))
                Spacer()
                Text(game.badge)
                    .font(.system(size: 9, weight: .black))
                    .tracking(0.5)
                    .foregroundStyle(AppTheme.muted)
            }

            Text(game.title)
                .font(.system(size: 21, weight: .black, design: .rounded))
                .foregroundStyle(AppTheme.text)
                .lineLimit(2)
                .padding(.top, 16)

            Text(game.subtitle)
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(AppTheme.muted)
                .padding(.top, 6)
                .lineLimit(2)

            Spacer(minLength: 13)

            HStack {
                Text("Spielen")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(AppTheme.text.opacity(0.86))
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.caption.weight(.black))
                    .foregroundStyle(game.tint)
            }
        }
        .padding(15)
        .frame(maxWidth: .infinity, minHeight: 194, alignment: .leading)
        .background(
            LinearGradient(
                colors: [game.tint.opacity(0.16), AppTheme.card],
                startPoint: .topTrailing,
                endPoint: .bottomLeading
            ),
            in: RoundedRectangle(cornerRadius: 23)
        )
        .overlay {
            RoundedRectangle(cornerRadius: 23)
                .stroke(Color.white.opacity(0.07))
        }
    }
}
