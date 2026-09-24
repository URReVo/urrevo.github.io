import SwiftUI

struct GamePlaceholderView: View {
    let game: GameDefinition

    var body: some View {
        ZStack {
            AppTheme.background.ignoresSafeArea()

            VStack(spacing: 18) {
                Text(game.emoji)
                    .font(.system(size: 68))

                Text(game.title)
                    .font(.largeTitle.weight(.black))
                    .foregroundStyle(AppTheme.text)
                    .multilineTextAlignment(.center)

                Text("Die native Zielstruktur und die gemeinsamen Spieldaten sind bereits vorbereitet. Dieses Spiel wird im nächsten Portierungsschritt vollständig in SwiftUI umgesetzt.")
                    .font(.body)
                    .foregroundStyle(AppTheme.muted)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 24)

                Label("Kein WebView", systemImage: "checkmark.seal.fill")
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(game.tint)
            }
            .padding(24)
        }
        .navigationTitle(game.title)
        .navigationBarTitleDisplayMode(.inline)
    }
}
