import SwiftUI

struct RootView: View {
    @ObservedObject var store: AppStore
    private let repository = ContentRepository()
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            HomeView(repository: repository, store: store, selectedTab: $selectedTab)
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
    }
}
