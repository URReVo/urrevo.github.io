import SwiftUI

struct StatsView: View {
    @ObservedObject var store: AppStore
    @State private var scope = "profile"

    private var personal: Bool { scope == "profile" }
    private var selectedStats: ProfileStats { store.stats(for: store.selectedProfile.id) }

    var body: some View {
        NavigationStack {
            ZStack {
                AppTheme.background.ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 18) {
                        VStack(alignment: .leading, spacing: 5) {
                            SectionEyebrow(text: "STATISTIK")
                            Text("Deine Spielwelt")
                                .font(.system(size: 31, weight: .black, design: .rounded))
                                .foregroundStyle(AppTheme.text)
                        }

                        Picker("Statistikansicht", selection: $scope) {
                            Text("Spieler").tag("profile")
                            Text("Gesamt").tag("global")
                        }
                        .pickerStyle(.segmented)

                        VStack(alignment: .leading, spacing: 6) {
                            Text(personal ? "Gespielt · \(store.selectedProfile.name)" : "Gespielt · Gesamt")
                                .font(.caption.weight(.black))
                                .foregroundStyle(AppTheme.muted)
                            Text("\(totalRounds)")
                                .font(.system(size: 48, weight: .black, design: .rounded))
                                .foregroundStyle(AppTheme.text)
                            Text(personal ? "Runden des ausgewählten Profils" : "Runden auf diesem Gerät")
                                .font(.caption)
                                .foregroundStyle(AppTheme.muted)
                        }
                        .padding(18)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(
                            LinearGradient(
                                colors: [AppTheme.accent.opacity(0.13), AppTheme.card],
                                startPoint: .topTrailing,
                                endPoint: .bottomLeading
                            ),
                            in: RoundedRectangle(cornerRadius: 22)
                        )

                        HStack(spacing: 10) {
                            progressCard(
                                value: circaProgress,
                                detail: "\(circaUnique) / 520 Circa",
                                tint: AppTheme.circa
                            )
                            progressCard(
                                value: classicProgress,
                                detail: "\(classicUnique) / 250 Classic",
                                tint: AppTheme.classic
                            )
                        }

                        SectionEyebrow(text: "SPIELE")
                        VStack(spacing: 0) {
                            metricRow(icon: "🎯", title: "Circa Imposter", value: "\(circaRounds)")
                            Divider().overlay(Color.white.opacity(0.06))
                            metricRow(icon: "🎭", title: "Klassisches Imposter", value: "\(classicRounds)")
                            Divider().overlay(Color.white.opacity(0.06))
                            metricRow(icon: "🎯", title: "Perfekte Schätzungen", value: "\(perfectCount)")
                            Divider().overlay(Color.white.opacity(0.06))
                            metricRow(icon: "🗺️", title: "Kategorien gespielt", value: "\(categoryCount) / 10")
                        }
                        .padding(.horizontal, 14)
                        .background(AppTheme.card, in: RoundedRectangle(cornerRadius: 18))

                        HStack {
                            SectionEyebrow(text: "VERLAUF")
                            Spacer()
                            Text("max. 50 lokal")
                                .font(.caption2)
                                .foregroundStyle(AppTheme.muted)
                        }

                        let sessions = visibleSessions
                        if sessions.isEmpty {
                            Text("Noch keine Sessions gespeichert.")
                                .font(.subheadline)
                                .foregroundStyle(AppTheme.muted)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(14)
                                .background(AppTheme.card, in: RoundedRectangle(cornerRadius: 16))
                        } else {
                            VStack(spacing: 8) {
                                ForEach(sessions) { session in
                                    NavigationLink {
                                        SessionDetailView(session: session, store: store)
                                    } label: {
                                        sessionRow(session)
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }

                        SectionEyebrow(text: "ACHIEVEMENTS")
                        VStack(spacing: 8) {
                            ForEach(store.achievementViews(profileId: personal ? store.selectedProfile.id : nil)) { achievement in
                                achievementRow(achievement)
                            }
                        }
                    }
                    .padding(16)
                    .padding(.bottom, 30)
                }
            }
        }
    }

    private var totalRounds: Int {
        personal ? selectedStats.rounds : store.data.stats.rounds
    }

    private var circaRounds: Int {
        personal ? selectedStats.circaRounds : store.data.stats.circaRounds
    }

    private var classicRounds: Int {
        personal ? selectedStats.classicRounds : store.data.stats.classicRounds
    }

    private var perfectCount: Int {
        personal ? selectedStats.perfect : store.data.stats.perfectEstimates
    }

    private var categoryCount: Int {
        personal ? selectedStats.categories.count : store.data.stats.categories.count
    }

    private var circaUnique: Int {
        personal ? selectedStats.circaQids.count : store.data.stats.circaQids.count
    }

    private var classicUnique: Int {
        personal ? selectedStats.classicWids.count : store.data.stats.classicWids.count
    }

    private var circaProgress: Int {
        min(100, Int((Double(circaUnique) / 520.0 * 100).rounded()))
    }

    private var classicProgress: Int {
        min(100, Int((Double(classicUnique) / 250.0 * 100).rounded()))
    }

    private var visibleSessions: [GameSession] {
        Array(store.sessions(for: personal ? store.selectedProfile.id : nil).prefix(12))
    }

    private func progressCard(value: Int, detail: String, tint: Color) -> some View {
        VStack(alignment: .leading, spacing: 5) {
            Text("\(value)%")
                .font(.system(size: 29, weight: .black, design: .rounded))
                .foregroundStyle(tint)
            Text(detail)
                .font(.caption.weight(.semibold))
                .foregroundStyle(AppTheme.muted)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppTheme.card, in: RoundedRectangle(cornerRadius: 17))
    }

    private func metricRow(icon: String, title: String, value: String) -> some View {
        HStack {
            Text(icon)
            Text(title)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(AppTheme.text)
            Spacer()
            Text(value)
                .font(.headline.weight(.black))
                .foregroundStyle(AppTheme.text)
        }
        .frame(height: 49)
    }

    private func sessionRow(_ session: GameSession) -> some View {
        HStack(spacing: 11) {
            Text(session.endedAt == nil ? "🟢" : "🏆")
                .font(.title3)
            VStack(alignment: .leading, spacing: 2) {
                Text(session.endedAt == nil ? "Aktuelle Session" : sessionDate(session))
                    .font(.subheadline.weight(.black))
                    .foregroundStyle(AppTheme.text)
                Text("\(session.rounds.count) \(session.rounds.count == 1 ? "Runde" : "Runden") · \(store.group(for: session).count) Spieler")
                    .font(.caption)
                    .foregroundStyle(AppTheme.muted)
            }
            Spacer()
            Image(systemName: "chevron.right")
                .font(.caption.weight(.bold))
                .foregroundStyle(AppTheme.muted)
        }
        .padding(13)
        .background(AppTheme.card, in: RoundedRectangle(cornerRadius: 16))
    }

    private func achievementRow(_ achievement: AchievementViewData) -> some View {
        HStack(spacing: 12) {
            Text(achievement.icon)
                .font(.title2)
                .frame(width: 44, height: 44)
                .background(Color.white.opacity(0.05), in: RoundedRectangle(cornerRadius: 13))
            VStack(alignment: .leading, spacing: 2) {
                Text(achievement.title)
                    .font(.subheadline.weight(.black))
                    .foregroundStyle(achievement.unlocked ? AppTheme.text : AppTheme.muted)
                Text(achievement.text)
                    .font(.caption2)
                    .foregroundStyle(AppTheme.muted)
            }
            Spacer()
            Text(achievement.progress)
                .font(.caption.weight(.black))
                .foregroundStyle(achievement.unlocked ? AppTheme.success : AppTheme.muted)
        }
        .padding(12)
        .background(
            achievement.unlocked ? AppTheme.success.opacity(0.07) : AppTheme.card,
            in: RoundedRectangle(cornerRadius: 16)
        )
    }

    private func sessionDate(_ session: GameSession) -> String {
        guard let date = ISO8601DateFormatter().date(from: session.startedAt) else {
            return "Session"
        }
        return date.formatted(date: .abbreviated, time: .shortened)
    }
}
