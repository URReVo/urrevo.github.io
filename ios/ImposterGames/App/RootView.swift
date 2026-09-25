import SwiftUI

struct RootView: View {
    @ObservedObject var store: AppStore
    private let repository = ContentRepository()
    @State private var selectedTab = 0
    @State private var activeGame: GameDefinition.Kind?

    var body: some View {
        TabView(selection: $selectedTab) {
            HomeView(
                repository: repository,
                store: store,
                selectedTab: $selectedTab,
                onOpenGame: { activeGame = $0 }
            )
                .tag(0)
                .tabItem {
                    Label("Spiele", systemImage: "gamecontroller.fill")
                }

            ProfilesView(store: store)
                .tag(1)
                .tabItem {
                    Label("Spieler", systemImage: "person.2.fill")
                }

            StatsView(store: store)
                .tag(2)
                .tabItem {
                    Label("Statistik", systemImage: "chart.bar.fill")
                }

            SettingsView(store: store)
                .tag(3)
                .tabItem {
                    Label("Einstellungen", systemImage: "gearshape.fill")
                }
        }
        .tint(AppTheme.accent)
        .onAppear {
            HapticsService.shared.prepare()
        }
        .fullScreenCover(
            isPresented: Binding(
                get: { activeGame != nil },
                set: { if !$0 { activeGame = nil } }
            )
        ) {
            if let activeGame {
                GameHostView(
                    kind: activeGame,
                    repository: repository,
                    store: store,
                    onDismiss: { self.activeGame = nil }
                )
            }
        }
    }
}
