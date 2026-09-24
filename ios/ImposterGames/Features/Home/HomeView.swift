import SwiftUI

struct HomeView: View {
    let repository: ContentRepository

    private let columns = [
        GridItem(.flexible(), spacing: 10),
        GridItem(.flexible(), spacing: 10)
    ]

    var body: some View {
        NavigationStack {
            ZStack {
                AppTheme.background.ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 22) {
                        header

                        LazyVGrid(columns: columns, spacing: 10) {
                            ForEach(GameDefinition.all) { game in
                                NavigationLink {
                                    destination(for: game)
                                } label: {
                                    GameCard(game: game)
                                }
                                .buttonStyle(.plain)
                            }
                        }

                        nativeStatus
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 12)
                    .padding(.bottom, 30)
                }
            }
            .toolbar(.hidden, for: .navigationBar)
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("IMPOSTER GAMES")
                .font(.caption2.weight(.black))
                .tracking(1.1)
                .foregroundStyle(AppTheme.muted)

            Text("Native iOS")
                .font(.system(size: 32, weight: .black, design: .rounded))
                .foregroundStyle(AppTheme.text)

            Text("SwiftUI · Core Motion · echte Haptik")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(AppTheme.muted)
        }
    }

    private var nativeStatus: some View {
        HStack(spacing: 12) {
            Image(systemName: "iphone.gen3")
                .font(.title2)
                .foregroundStyle(AppTheme.charades)

            VStack(alignment: .leading, spacing: 3) {
                Text("Native Basis aktiv")
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(AppTheme.text)
                Text("Scharade ist der erste vollständig native Technik-Proof.")
                    .font(.caption)
                    .foregroundStyle(AppTheme.muted)
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppTheme.panel, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
    }

    @ViewBuilder
    private func destination(for game: GameDefinition) -> some View {
        switch game.kind {
        case .charades:
            CharadesView(repository: repository)
        case .circa, .classic, .whoAmI:
            GamePlaceholderView(game: game)
        }
    }
}

private struct GameCard: View {
    let game: GameDefinition

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text(game.emoji)
                    .font(.system(size: 27))
                    .frame(width: 48, height: 48)
                    .background(Color.white.opacity(0.06), in: RoundedRectangle(cornerRadius: 15, style: .continuous))

                Spacer()

                Text(game.badge)
                    .font(.system(size: 9, weight: .black))
                    .tracking(0.5)
                    .foregroundStyle(AppTheme.muted)
            }

            Text(game.title)
                .font(.system(size: 22, weight: .black, design: .rounded))
                .foregroundStyle(AppTheme.text)
                .lineLimit(2)
                .padding(.top, 18)

            Text(game.subtitle)
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(AppTheme.muted)
                .padding(.top, 7)

            Spacer(minLength: 16)

            HStack {
                Text("Öffnen")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(AppTheme.text.opacity(0.86))
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.caption.weight(.black))
                    .foregroundStyle(game.tint)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, minHeight: 210, alignment: .leading)
        .background(
            LinearGradient(
                colors: [game.tint.opacity(0.16), AppTheme.card],
                startPoint: .topTrailing,
                endPoint: .bottomLeading
            ),
            in: RoundedRectangle(cornerRadius: 24, style: .continuous)
        )
        .overlay {
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .stroke(Color.white.opacity(0.07), lineWidth: 1)
        }
    }
}
