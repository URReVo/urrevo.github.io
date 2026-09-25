import SwiftUI

struct GameHostView: View {
    let kind: GameDefinition.Kind
    let repository: ContentRepository
    @ObservedObject var store: AppStore
    let onDismiss: () -> Void

    var body: some View {
        NavigationStack {
            game
                .toolbar(.hidden, for: .tabBar)
                .toolbar {
                    ToolbarItem(placement: .topBarLeading) {
                        Button {
                            if store.data.preferences.haptics {
                                HapticsService.shared.selection()
                            }
                            onDismiss()
                        } label: {
                            Label("Spiele", systemImage: "chevron.left")
                                .font(.subheadline.weight(.bold))
                        }
                    }
                }
        }
        .preferredColorScheme(.dark)
        .interactiveDismissDisabled()
    }

    @ViewBuilder
    private var game: some View {
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
