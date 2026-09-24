import SwiftUI

struct PresetEditorView: View {
    @ObservedObject var store: AppStore
    var editing: QuickPreset?
    let onSaved: () -> Void
    let onCancel: () -> Void

    @State private var name = ""
    @State private var game = "circa"
    @State private var playerCount = 4
    @State private var category = "Alle"
    @State private var difficulty = "mittel"
    @State private var hint = true
    @State private var timer = 0

    private let circaCategories = [
        "Alle", "Allgemein", "Geografie", "Technik", "Natur",
        "Alltag", "Sport", "Auto", "Essen", "Popkultur", "Spicy 🌶️"
    ]

    var body: some View {
        NavigationStack {
            ZStack {
                AppTheme.background.ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 18) {
                        SectionEyebrow(text: "EIGENES PRESET")

                        TextField("Name", text: $name)
                            .font(.body.weight(.semibold))
                            .foregroundStyle(AppTheme.text)
                            .padding(.horizontal, 14)
                            .frame(height: 50)
                            .background(AppTheme.card, in: RoundedRectangle(cornerRadius: 15))

                        Picker("Spiel", selection: $game) {
                            Text("Circa Imposter").tag("circa")
                            Text("Klassisches Imposter").tag("classic")
                        }
                        .pickerStyle(.segmented)

                        VStack(alignment: .leading, spacing: 8) {
                            SectionEyebrow(text: "SPIELER")
                            Stepper(value: $playerCount, in: 3...12) {
                                Text("\(playerCount) Spieler")
                                    .font(.headline.weight(.bold))
                                    .foregroundStyle(AppTheme.text)
                            }
                            .padding(14)
                            .background(AppTheme.card, in: RoundedRectangle(cornerRadius: 15))
                        }

                        if game == "circa" {
                            VStack(alignment: .leading, spacing: 10) {
                                SectionEyebrow(text: "CIRCA")
                                Menu {
                                    ForEach(circaCategories, id: \.self) { item in
                                        Button(item) { category = item }
                                    }
                                } label: {
                                    menuRow(title: "Kategorie", value: category)
                                }

                                Menu {
                                    Button("Leicht") { difficulty = "leicht" }
                                    Button("Mittel") { difficulty = "mittel" }
                                    Button("Schwer") { difficulty = "schwer" }
                                    Button("Zufall") { difficulty = "zufaellig" }
                                } label: {
                                    menuRow(title: "Schwierigkeit", value: difficultyLabel)
                                }
                            }
                        } else {
                            VStack(alignment: .leading, spacing: 10) {
                                SectionEyebrow(text: "CLASSIC")
                                Toggle("Impostor-Hinweis aktiv", isOn: $hint)
                                    .font(.subheadline.weight(.bold))
                                    .foregroundStyle(AppTheme.text)
                                    .tint(AppTheme.classic)
                                    .padding(14)
                                    .background(AppTheme.card, in: RoundedRectangle(cornerRadius: 15))

                                Menu {
                                    ForEach(ClassicGameModel.timerOptions, id: \.self) { seconds in
                                        Button(timerLabel(seconds)) { timer = seconds }
                                    }
                                } label: {
                                    menuRow(title: "Timer", value: timerLabel(timer))
                                }
                            }
                        }

                        PrimaryGameButton(
                            title: "Preset speichern",
                            tint: AppTheme.accent,
                            enabled: !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                        ) {
                            save()
                        }
                    }
                    .padding(16)
                    .padding(.bottom, 24)
                }
            }
            .navigationTitle(editing == nil ? "Schnellstart speichern" : "Preset bearbeiten")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Abbrechen", action: onCancel)
                }
            }
            .onAppear(perform: loadEditing)
        }
        .preferredColorScheme(.dark)
    }

    private func menuRow(title: String, value: String) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.caption)
                    .foregroundStyle(AppTheme.muted)
                Text(value)
                    .font(.subheadline.weight(.black))
                    .foregroundStyle(AppTheme.text)
            }
            Spacer()
            Image(systemName: "chevron.up.chevron.down")
                .foregroundStyle(AppTheme.accent)
        }
        .padding(14)
        .background(AppTheme.card, in: RoundedRectangle(cornerRadius: 15))
    }

    private var difficultyLabel: String {
        switch difficulty {
        case "leicht": return "Leicht"
        case "schwer": return "Schwer"
        case "zufaellig": return "Zufall"
        default: return "Mittel"
        }
    }

    private func timerLabel(_ seconds: Int) -> String {
        guard seconds > 0 else { return "Aus" }
        return String(format: "%d:%02d", seconds / 60, seconds % 60)
    }

    private func loadEditing() {
        guard let editing else { return }
        name = editing.name
        game = editing.game
        playerCount = editing.playerCount
        category = editing.categories.first ?? "Alle"
        difficulty = editing.difficulty
        hint = editing.hint
        timer = editing.timer
    }

    private func save() {
        let preset = QuickPreset(
            id: editing?.id ?? "custom_" + UUID().uuidString.lowercased(),
            builtIn: false,
            name: name,
            icon: editing?.icon ?? "⭐️",
            game: game,
            playerCount: playerCount,
            categories: game == "circa" ? [category] : ["Alle"],
            difficulty: difficulty,
            hint: hint,
            timer: timer,
            summary: ""
        )
        _ = store.savePreset(preset)
        onSaved()
    }
}
