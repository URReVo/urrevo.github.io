import SwiftUI

struct RootView: View {
    private let repository = ContentRepository()

    var body: some View {
        HomeView(repository: repository)
    }
}
