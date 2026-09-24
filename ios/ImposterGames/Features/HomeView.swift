import SwiftUI

struct HomeView: View {
    @EnvironmentObject private var content: ContentRepository

    private let columns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12)
    ]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("IMPOSTER GAMES")
                            .font(.caption2.weight(.heavy))
                            .foregroundStyle(.secondary)
                        Text("Was spielen wir?")
                            .font(.largeTitle.bold())
                        Text("Native iOS-Basis · SwiftUI")
                            .foregroundStyle(.secondary)
                    }

                    if let error = content.loadError {
                        Text(error)
                            .font(.footnote)
                            .foregroundStyle(.red)
                    }

                    LazyVGrid(columns: columns, spacing: 12) {
                        ForEach(content.catalog?.games ?? []) { game in
                            NavigationLink {
                                destination(for: game)
                            } label: {
                                GameCard(game: game, count: content.count(for: game.id))
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                .padding(18)
            }
            .background(Color(uiColor: .systemGroupedBackground))
        }
    }

    @ViewBuilder
    private func destination(for game: GameDescriptor) -> some View {
        if game.id == "charades" {
            CharadesView()
        } else {
            GamePlaceholderView(game: game, count: content.count(for: game.id))
        }
    }
}

private struct GameCard: View {
    let game: GameDescriptor
    let count: Int?

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(game.icon)
                .font(.system(size: 34))
            Text(game.title)
                .font(.headline.weight(.heavy))
                .foregroundStyle(.primary)
                .multilineTextAlignment(.leading)
            Text(game.meta)
                .font(.caption)
                .foregroundStyle(.secondary)
            Spacer(minLength: 2)
            if let count {
                Text("\(count) Inhalte")
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, minHeight: 165, alignment: .topLeading)
        .padding(16)
        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 24, style: .continuous))
    }
}
