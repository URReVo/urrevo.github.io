import SwiftUI

@main
struct ImposterGamesApp: App {
    @StateObject private var store = AppStore()

    var body: some Scene {
        WindowGroup {
            RootView(store: store)
                .preferredColorScheme(.dark)
        }
    }
}
