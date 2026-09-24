import SwiftUI

struct SessionDetailView: View {
    let session: GameSession
    @ObservedObject var store: AppStore
    var onReplay: (([PlayerProfile], String?) -> Void)?

    var body: some View {
        ZStack {
            AppTheme.background.ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    PanelCard {
                        VStack(alignment: .leading, spacing: 7) {
                            SectionEyebrow(text: "SESSION")
                            Text(session.endedAt == nil ? "Session läuft" : "Session beendet")
                                .font(.title2.weight(.black))
                                .foregroundStyle(AppTheme.text)
                            Text("\(session.rounds.count) \(session.rounds.count == 1 ? "Runde" : "Runden")")
                                .font(.subheadline.weight(.bold))
                                .foregroundStyle(AppTheme.muted)
                            Text(dateText)
                                .font(.caption)
                                .foregroundStyle(AppTheme.muted)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    sectionTitle("MITGESPIELT")
                    FlowPlayers(profiles: profiles)

                    if !session.awards.isEmpty {
                        sectionTitle("AWARDS")
                        VStack(spacing: 8) {
                            ForEach(session.awards) { award in
                                HStack(spacing: 12) {
                                    Text(award.icon)
                                        .font(.title2)
                                        .frame(width: 42, height: 42)
                                        .background(Color.white.opacity(0.05), in: RoundedRectangle(cornerRadius: 12))
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(award.title)
                                            .font(.subheadline.weight(.black))
                                            .foregroundStyle(AppTheme.text)
                                        Text((store.profile(id: award.profileId)?.name ?? "Spieler") + " · " + award.detail)
                                            .font(.caption)
                                            .foregroundStyle(AppTheme.muted)
                                    }
                                    Spacer()
                                }
                                .padding(12)
                                .background(AppTheme.card, in: RoundedRectangle(cornerRadius: 15))
                            }
                        }
                    }

                    sectionTitle("RUNDEN")
                    VStack(spacing: 8) {
                        if session.rounds.isEmpty {
                            Text("Noch keine abgeschlossene Runde.")
                                .font(.subheadline)
                                .foregroundStyle(AppTheme.muted)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(14)
                                .background(AppTheme.card, in: RoundedRectangle(cornerRadius: 15))
                        } else {
                            ForEach(Array(session.rounds.enumerated()), id: \.element.id) { index, round in
                                roundCard(round, index: index)
                            }
                        }
                    }

                    if let onReplay, !profiles.isEmpty {
                        PrimaryGameButton(title: "Noch einmal mit dieser Gruppe", tint: AppTheme.accent) {
                            onReplay(profiles, session.lastGame)
                        }
                    }
                }
                .padding(16)
                .padding(.bottom, 24)
            }
        }
        .navigationTitle("Session")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var profiles: [PlayerProfile] {
        store.group(for: session)
    }

    private var dateText: String {
        guard let date = ISO8601DateFormatter().date(from: session.startedAt) else {
            return session.startedAt
        }
        return date.formatted(date: .abbreviated, time: .shortened)
    }

    private func sectionTitle(_ text: String) -> some View {
        SectionEyebrow(text: text)
    }

    private func roundCard(_ round: SessionRound, index: Int) -> some View {
        HStack(spacing: 12) {
            Text(round.game == "classic" ? "🎭" : "🎯")
                .font(.title2)
                .frame(width: 44, height: 44)
                .background(Color.white.opacity(0.05), in: RoundedRectangle(cornerRadius: 13))

            VStack(alignment: .leading, spacing: 3) {
                Text("Runde \(index + 1) · " + (round.game == "classic" ? "Classic" : "Circa"))
                    .font(.subheadline.weight(.black))
                    .foregroundStyle(AppTheme.text)

                if round.game == "classic" {
                    Text([round.category, round.word].compactMap { $0 }.joined(separator: " · "))
                        .font(.caption)
                        .foregroundStyle(AppTheme.muted)
                } else {
                    Text([round.category, difficultyLabel(round.difficulty)].compactMap { $0 }.joined(separator: " · "))
                        .font(.caption)
                        .foregroundStyle(AppTheme.muted)
                }
            }
            Spacer()

            if let impostor = store.profile(id: round.impostorId) {
                Text(impostor.avatar)
                    .font(.title3)
            }
        }
        .padding(13)
        .background(AppTheme.card, in: RoundedRectangle(cornerRadius: 15))
    }

    private func difficultyLabel(_ value: String?) -> String? {
        switch value {
        case "leicht": return "Leicht"
        case "mittel": return "Mittel"
        case "schwer": return "Schwer"
        case "zufaellig": return "Zufall"
        default: return nil
        }
    }
}

private struct FlowPlayers: View {
    let profiles: [PlayerProfile]

    var body: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 120), spacing: 8)], spacing: 8) {
            ForEach(profiles) { profile in
                HStack(spacing: 8) {
                    Text(profile.avatar)
                    Text(profile.name)
                        .font(.caption.weight(.bold))
                        .foregroundStyle(AppTheme.text)
                        .lineLimit(1)
                    Spacer(minLength: 0)
                }
                .padding(.horizontal, 11)
                .frame(height: 42)
                .background(AppTheme.card, in: RoundedRectangle(cornerRadius: 13))
            }
        }
    }
}
