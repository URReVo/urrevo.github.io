import SwiftUI

struct SectionEyebrow: View {
    let text: String

    var body: some View {
        Text(text)
            .font(.caption2.weight(.black))
            .tracking(1.1)
            .foregroundStyle(AppTheme.muted)
    }
}

struct PanelCard<Content: View>: View {
    @ViewBuilder let content: Content

    var body: some View {
        content
            .padding(16)
            .background(AppTheme.panel, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 20, style: .continuous)
                    .stroke(Color.white.opacity(0.06))
            }
    }
}

struct PrimaryGameButton: View {
    let title: String
    var tint: Color = AppTheme.accent
    var enabled = true
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.headline.weight(.black))
                .frame(maxWidth: .infinity)
                .frame(height: 54)
                .foregroundStyle(Color.black.opacity(enabled ? 0.86 : 0.4))
                .background(tint.opacity(enabled ? 1 : 0.35), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        }
        .buttonStyle(.plain)
        .disabled(!enabled)
    }
}

struct PlayerSetupEditor: View {
    @Binding var players: [PlayerDraft]
    let minimum: Int
    let maximum: Int
    let tint: Color
    var onChange: (() -> Void)?

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                SectionEyebrow(text: "SPIELER")
                Spacer()
                HStack(spacing: 8) {
                    counterButton(symbol: "minus", enabled: players.count > minimum) {
                        if players.count > minimum {
                            players.removeLast()
                            onChange?()
                        }
                    }
                    Text("\(players.count)")
                        .font(.headline.weight(.black))
                        .foregroundStyle(AppTheme.text)
                        .frame(minWidth: 26)
                    counterButton(symbol: "plus", enabled: players.count < maximum) {
                        if players.count < maximum {
                            let index = players.count
                            players.append(
                                PlayerDraft(
                                    name: "Spieler \(index + 1)",
                                    avatar: AppStore.avatars[index % AppStore.avatars.count]
                                )
                            )
                            onChange?()
                        }
                    }
                }
            }

            VStack(spacing: 8) {
                ForEach(players.indices, id: \.self) { index in
                    HStack(spacing: 10) {
                        Button {
                            let current = AppStore.avatars.firstIndex(of: players[index].avatar) ?? index
                            players[index].avatar = AppStore.avatars[(current + 1) % AppStore.avatars.count]
                            onChange?()
                        } label: {
                            Text(players[index].avatar)
                                .font(.title2)
                                .frame(width: 46, height: 46)
                                .background(Color.white.opacity(0.06), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                        }
                        .buttonStyle(.plain)

                        TextField("Spieler \(index + 1)", text: $players[index].name)
                            .textInputAutocapitalization(.words)
                            .autocorrectionDisabled()
                            .font(.body.weight(.semibold))
                            .foregroundStyle(AppTheme.text)
                            .padding(.horizontal, 13)
                            .frame(height: 46)
                            .background(AppTheme.card, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                            .overlay {
                                RoundedRectangle(cornerRadius: 14, style: .continuous)
                                    .stroke(Color.white.opacity(0.06))
                            }
                            .onSubmit { onChange?() }
                    }
                }
            }
        }
    }

    private func counterButton(symbol: String, enabled: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: symbol)
                .font(.caption.weight(.black))
                .frame(width: 34, height: 34)
                .foregroundStyle(enabled ? AppTheme.text : AppTheme.muted.opacity(0.4))
                .background(enabled ? tint.opacity(0.15) : AppTheme.card, in: Circle())
        }
        .buttonStyle(.plain)
        .disabled(!enabled)
    }
}

struct CategorySelector: View {
    let categories: [ContentCategory]
    @Binding var selection: Set<String>
    let tint: Color
    var onChange: (() -> Void)?

    private let columns = [
        GridItem(.flexible(), spacing: 8),
        GridItem(.flexible(), spacing: 8)
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionEyebrow(text: "KATEGORIE")
            LazyVGrid(columns: columns, spacing: 8) {
                categoryButton(name: "Alle", emoji: "✨")
                ForEach(categories) { category in
                    categoryButton(name: category.name, emoji: category.emoji)
                }
            }
        }
    }

    private func categoryButton(name: String, emoji: String) -> some View {
        let selected = selection.contains(name)
        return Button {
            if name == "Alle" {
                selection = ["Alle"]
            } else {
                selection.remove("Alle")
                if selection.contains(name) {
                    selection.remove(name)
                } else {
                    selection.insert(name)
                }
                if selection.isEmpty { selection = ["Alle"] }
            }
            onChange?()
        } label: {
            HStack(spacing: 8) {
                Text(emoji)
                Text(name)
                    .font(.caption.weight(.bold))
                    .lineLimit(1)
                Spacer(minLength: 0)
            }
            .foregroundStyle(selected ? AppTheme.text : AppTheme.muted)
            .padding(.horizontal, 12)
            .frame(height: 48)
            .background(selected ? tint.opacity(0.16) : AppTheme.card, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(selected ? tint.opacity(0.7) : Color.white.opacity(0.06))
            }
        }
        .buttonStyle(.plain)
    }
}

struct GameHeaderBar: View {
    let title: String
    var subtitle: String?
    var trailingTitle: String?
    var onTrailing: (() -> Void)?

    var body: some View {
        HStack(spacing: 10) {
            VStack(alignment: .leading, spacing: 1) {
                Text(title)
                    .font(.subheadline.weight(.black))
                    .foregroundStyle(AppTheme.text)
                if let subtitle {
                    Text(subtitle)
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(AppTheme.muted)
                }
            }
            Spacer()
            if let trailingTitle, let onTrailing {
                Button(trailingTitle, action: onTrailing)
                    .font(.caption.weight(.bold))
                    .foregroundStyle(AppTheme.accent)
            }
        }
    }
}

extension View {
    func appPanel(cornerRadius: CGFloat = 20) -> some View {
        background(AppTheme.panel, in: RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .stroke(Color.white.opacity(0.06))
            }
    }
}
