import SwiftUI

@main
struct ImposterGamesApp: App {
    @StateObject private var content = ContentRepository()

    var body: some Scene {
        WindowGroup {
            HomeView()
                .environmentObject(content)
                .preferredColorScheme(.dark)
        }
    }
}
