import SwiftUI
import UniformTypeIdentifiers

struct SettingsView: View {
    @ObservedObject var store: AppStore

    @State private var isExporting = false
    @State private var isImporting = false
    @State private var exportDocument = BackupDocument()
    @State private var exportFilename = "Imposter-Games-Backup.json"
    @State private var statusText = ""
    @State private var statusIsError = false
    @State private var confirmReset = false

    var body: some View {
        NavigationStack {
            ZStack {
                AppTheme.background.ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 18) {
                        VStack(alignment: .leading, spacing: 5) {
                            SectionEyebrow(text: "EINSTELLUNGEN")
                            Text("App-Verhalten")
                                .font(.system(size: 31, weight: .black, design: .rounded))
                                .foregroundStyle(AppTheme.text)
                        }

                        VStack(spacing: 0) {
                            settingToggle(
                                title: "Sound",
                                subtitle: "Gilt für alle Spiele",
                                isOn: Binding(
                                    get: { store.data.preferences.sound },
                                    set: { store.setPreference("sound", value: $0) }
                                )
                            )
                            Divider().overlay(Color.white.opacity(0.06))
                            settingToggle(
                                title: "Haptik",
                                subtitle: "Native Core-Haptics-Rückmeldungen",
                                isOn: Binding(
                                    get: { store.data.preferences.haptics },
                                    set: { store.setPreference("haptics", value: $0) }
                                )
                            )
                            Divider().overlay(Color.white.opacity(0.06))
                            settingToggle(
                                title: "Animationen",
                                subtitle: "Übergänge und Reveal-Effekte",
                                isOn: Binding(
                                    get: { store.data.preferences.animations },
                                    set: { store.setPreference("animations", value: $0) }
                                )
                            )
                        }
                        .padding(.horizontal, 14)
                        .background(AppTheme.card, in: RoundedRectangle(cornerRadius: 18))

                        SectionEyebrow(text: "DATEN")

                        VStack(spacing: 0) {
                            actionRow(
                                icon: "square.and.arrow.up",
                                title: "Daten exportieren",
                                subtitle: "Backup mit Profilen, Sessions, Statistik, Einstellungen und Spielfortschritt"
                            ) {
                                exportBackup()
                            }

                            Divider().overlay(Color.white.opacity(0.06))

                            actionRow(
                                icon: "square.and.arrow.down",
                                title: "Daten importieren",
                                subtitle: "Ein zuvor exportiertes V3-Backup wiederherstellen"
                            ) {
                                isImporting = true
                            }

                            Divider().overlay(Color.white.opacity(0.06))

                            actionRow(
                                icon: "trash",
                                title: "Lokale App-Daten zurücksetzen",
                                subtitle: "Profile, Sessions, Statistik und V73-Spielfortschritt löschen",
                                danger: true
                            ) {
                                confirmReset = true
                            }
                        }
                        .background(AppTheme.card, in: RoundedRectangle(cornerRadius: 18))

                        if !statusText.isEmpty {
                            Text(statusText)
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(statusIsError ? AppTheme.danger : AppTheme.success)
                                .padding(.horizontal, 2)
                        }

                        VStack(alignment: .leading, spacing: 5) {
                            Text("Imposter Games · \(AppStore.versionLabel)")
                                .font(.headline.weight(.black))
                                .foregroundStyle(AppTheme.text)
                            Text("Native SwiftUI · vier lokale Partyspiele")
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(AppTheme.muted)
                            Text("Deine Daten bleiben lokal auf diesem Gerät und können als V3-Backup exportiert werden.")
                                .font(.caption)
                                .foregroundStyle(AppTheme.muted)
                        }
                        .padding(16)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(
                            LinearGradient(
                                colors: [AppTheme.accent.opacity(0.11), AppTheme.panel],
                                startPoint: .topTrailing,
                                endPoint: .bottomLeading
                            ),
                            in: RoundedRectangle(cornerRadius: 19)
                        )
                    }
                    .padding(16)
                    .padding(.bottom, 30)
                }
            }
            .fileExporter(
                isPresented: $isExporting,
                document: exportDocument,
                contentType: .json,
                defaultFilename: exportFilename
            ) { result in
                switch result {
                case .success:
                    setStatus("Backup wurde exportiert.", error: false)
                case .failure(let error):
                    setStatus("Export fehlgeschlagen: \(error.localizedDescription)", error: true)
                }
            }
            .fileImporter(
                isPresented: $isImporting,
                allowedContentTypes: [.json],
                allowsMultipleSelection: false
            ) { result in
                importBackup(result)
            }
            .alert("Lokale App-Daten zurücksetzen?", isPresented: $confirmReset) {
                Button("Abbrechen", role: .cancel) {}
                Button("Alles löschen", role: .destructive) {
                    store.resetAllData()
                    setStatus("Lokale App-Daten wurden zurückgesetzt.", error: false)
                }
            } message: {
                Text("Profile, Sessions, Statistiken, Einstellungen und alle V73-Spielstände werden gelöscht.")
            }
        }
    }

    private func settingToggle(title: String, subtitle: String, isOn: Binding<Bool>) -> some View {
        Toggle(isOn: isOn) {
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline.weight(.black))
                    .foregroundStyle(AppTheme.text)
                Text(subtitle)
                    .font(.caption)
                    .foregroundStyle(AppTheme.muted)
            }
        }
        .tint(AppTheme.accent)
        .frame(minHeight: 62)
    }

    private func actionRow(
        icon: String,
        title: String,
        subtitle: String,
        danger: Bool = false,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.headline)
                    .foregroundStyle(danger ? AppTheme.danger : AppTheme.accent)
                    .frame(width: 34)

                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.subheadline.weight(.black))
                        .foregroundStyle(danger ? AppTheme.danger : AppTheme.text)
                    Text(subtitle)
                        .font(.caption)
                        .foregroundStyle(AppTheme.muted)
                        .multilineTextAlignment(.leading)
                }

                Spacer()
                Image(systemName: "chevron.right")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(AppTheme.muted)
            }
            .padding(.horizontal, 14)
            .frame(minHeight: 70)
        }
        .buttonStyle(.plain)
    }

    private func exportBackup() {
        do {
            let data = try store.createBackupData()
            exportDocument = BackupDocument(data: data)
            exportFilename = store.backupFilename().replacingOccurrences(of: ".json", with: "")
            isExporting = true
        } catch {
            setStatus("Backup konnte nicht erstellt werden: \(error.localizedDescription)", error: true)
        }
    }

    private func importBackup(_ result: Result<[URL], Error>) {
        switch result {
        case .failure(let error):
            setStatus("Import fehlgeschlagen: \(error.localizedDescription)", error: true)

        case .success(let urls):
            guard let url = urls.first else {
                setStatus("Import fehlgeschlagen: Keine Datei ausgewählt.", error: true)
                return
            }

            let accessed = url.startAccessingSecurityScopedResource()
            defer {
                if accessed { url.stopAccessingSecurityScopedResource() }
            }

            do {
                let data = try Data(contentsOf: url)
                try store.importBackupData(data)
                setStatus(
                    "Backup wiederhergestellt · \(store.data.profiles.count) Profile · \(store.data.stats.rounds) Runden.",
                    error: false
                )
            } catch {
                setStatus("Backup abgelehnt: \(error.localizedDescription)", error: true)
            }
        }
    }

    private func setStatus(_ text: String, error: Bool) {
        statusText = text
        statusIsError = error
    }
}
