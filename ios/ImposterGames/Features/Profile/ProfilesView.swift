import SwiftUI

struct ProfilesView: View {
    @ObservedObject var store: AppStore

    @State private var editing: PlayerProfile?
    @State private var creating = false
    @State private var draftName = ""
    @State private var draftAvatar = "😎"

    var body: some View {
        NavigationStack {
            ZStack {
                AppTheme.background.ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        VStack(alignment: .leading, spacing: 5) {
                            SectionEyebrow(text: "SPIELER")
                            Text("Lokale Profile")
                                .font(.system(size: 31, weight: .black, design: .rounded))
                                .foregroundStyle(AppTheme.text)
                            Text("Tippe auf ein Profil, um es für den Launcher auszuwählen. Statistiken bleiben über eine feste Profil-ID erhalten.")
                                .font(.subheadline)
                                .foregroundStyle(AppTheme.muted)
                        }

                        VStack(spacing: 8) {
                            ForEach(store.data.profiles) { profile in
                                profileRow(profile)
                            }
                        }
                    }
                    .padding(16)
                    .padding(.bottom, 28)
                }
            }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        startCreate()
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: Binding(
                get: { creating || editing != nil },
                set: { open in if !open { creating = false; editing = nil } }
            )) {
                profileEditor
            }
        }
    }

    private func profileRow(_ profile: PlayerProfile) -> some View {
        let selected = store.selectedProfile.id == profile.id

        return HStack(spacing: 12) {
            Button {
                store.setSelectedProfile(profile.id)
                if store.data.preferences.haptics { HapticsService.shared.selection() }
            } label: {
                HStack(spacing: 12) {
                    Text(profile.avatar)
                        .font(.title2)
                        .frame(width: 46, height: 46)
                        .background(Color.white.opacity(0.05), in: RoundedRectangle(cornerRadius: 14))

                    VStack(alignment: .leading, spacing: 2) {
                        Text(profile.name)
                            .font(.body.weight(.black))
                            .foregroundStyle(AppTheme.text)
                        Text(selected ? "Ausgewählt" : "Antippen zum Auswählen")
                            .font(.caption)
                            .foregroundStyle(selected ? AppTheme.success : AppTheme.muted)
                    }

                    Spacer()

                    if selected {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(AppTheme.success)
                    }
                }
            }
            .buttonStyle(.plain)

            Button {
                startEdit(profile)
            } label: {
                Image(systemName: "pencil")
                    .font(.subheadline.weight(.bold))
                    .frame(width: 38, height: 38)
                    .foregroundStyle(AppTheme.accent)
                    .background(AppTheme.raised, in: Circle())
            }
            .buttonStyle(.plain)
        }
        .padding(13)
        .background(
            selected ? AppTheme.success.opacity(0.08) : AppTheme.card,
            in: RoundedRectangle(cornerRadius: 17)
        )
        .overlay {
            RoundedRectangle(cornerRadius: 17)
                .stroke(selected ? AppTheme.success.opacity(0.42) : Color.white.opacity(0.05))
        }
    }

    private var profileEditor: some View {
        NavigationStack {
            ZStack {
                AppTheme.background.ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 18) {
                        SectionEyebrow(text: editing == nil ? "NEUES PROFIL" : "SPIELERPROFIL")

                        TextField("Name", text: $draftName)
                            .textInputAutocapitalization(.words)
                            .autocorrectionDisabled()
                            .font(.body.weight(.semibold))
                            .foregroundStyle(AppTheme.text)
                            .padding(.horizontal, 14)
                            .frame(height: 50)
                            .background(AppTheme.card, in: RoundedRectangle(cornerRadius: 15))

                        SectionEyebrow(text: "AVATAR")
                        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 4), spacing: 8) {
                            ForEach(AppStore.avatars, id: \.self) { avatar in
                                Button {
                                    draftAvatar = avatar
                                } label: {
                                    Text(avatar)
                                        .font(.system(size: 28))
                                        .frame(maxWidth: .infinity)
                                        .frame(height: 58)
                                        .background(
                                            draftAvatar == avatar ? AppTheme.accent.opacity(0.17) : AppTheme.card,
                                            in: RoundedRectangle(cornerRadius: 15)
                                        )
                                        .overlay {
                                            RoundedRectangle(cornerRadius: 15)
                                                .stroke(draftAvatar == avatar ? AppTheme.accent.opacity(0.75) : Color.white.opacity(0.05))
                                        }
                                }
                                .buttonStyle(.plain)
                            }
                        }

                        PrimaryGameButton(title: "Profil speichern", tint: AppTheme.accent, enabled: !draftName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty) {
                            saveProfile()
                        }

                        if let editing, store.data.profiles.count > 1 {
                            Button(role: .destructive) {
                                if store.deleteProfile(editing.id) {
                                    self.editing = nil
                                }
                            } label: {
                                Text("Profil löschen")
                                    .font(.headline.weight(.bold))
                                    .frame(maxWidth: .infinity)
                                    .frame(height: 50)
                            }
                            .buttonStyle(.bordered)
                            .tint(AppTheme.danger)
                        }
                    }
                    .padding(16)
                }
            }
            .navigationTitle(editing == nil ? "Profil hinzufügen" : "Profil bearbeiten")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Abbrechen") {
                        creating = false
                        editing = nil
                    }
                }
            }
        }
        .preferredColorScheme(.dark)
    }

    private func startCreate() {
        editing = nil
        draftName = ""
        draftAvatar = AppStore.avatars[store.data.profiles.count % AppStore.avatars.count]
        creating = true
    }

    private func startEdit(_ profile: PlayerProfile) {
        creating = false
        editing = profile
        draftName = profile.name
        draftAvatar = profile.avatar
    }

    private func saveProfile() {
        let clean = String(draftName.trimmingCharacters(in: .whitespacesAndNewlines).prefix(24))
        guard !clean.isEmpty else { return }

        if let editing {
            if store.updateProfile(id: editing.id, name: clean, avatar: draftAvatar) {
                self.editing = nil
            }
        } else {
            let id = store.addProfile(name: clean, avatar: draftAvatar)
            store.setSelectedProfile(id)
            creating = false
        }
    }
}
