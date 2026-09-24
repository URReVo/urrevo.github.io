import SwiftUI

struct GamePlaceholderView: View {
    let game: GameDescriptor
    let count: Int?

    var body: some View {
        VStack(spacing: 16) {
            Text(game.icon)
                .font(.system(size: 64))
            Text(game.title)
                .font(.largeTitle.bold())
            Text(game.description)
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
            if let count {
                Text("\(count) Inhalte aus der produktiven Web-Datenbank sind bereits eingebunden.")
                    .font(.footnote)
                    .multilineTextAlignment(.center)
                    .foregroundStyle(.secondary)
            }
            Text("Die native Spielmechanik wird auf dieser gemeinsamen Basis portiert.")
                .font(.footnote.weight(.semibold))
                .multilineTextAlignment(.center)
                .padding(.top, 8)
        }
        .padding(24)
        .navigationTitle(game.title)
        .navigationBarTitleDisplayMode(.inline)
    }
}
