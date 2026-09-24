import SwiftUI

struct GameDefinition: Identifiable {
    enum Kind: String {
        case circa
        case classic
        case whoAmI
        case charades
    }

    let kind: Kind
    let title: String
    let subtitle: String
    let emoji: String
    let badge: String
    let tint: Color

    var id: String { kind.rawValue }

    static let all: [GameDefinition] = [
        GameDefinition(
            kind: .circa,
            title: "Circa Imposter",
            subtitle: "3–12 Spieler · Schätzen & täuschen",
            emoji: "🎯",
            badge: "SCHÄTZEN",
            tint: Color(red: 0.30, green: 0.49, blue: 1.00)
        ),
        GameDefinition(
            kind: .classic,
            title: "Klassisches Imposter",
            subtitle: "3–12 Spieler · Wort & Hinweis",
            emoji: "🎭",
            badge: "KLASSISCH",
            tint: Color(red: 0.95, green: 0.60, blue: 0.20)
        ),
        GameDefinition(
            kind: .whoAmI,
            title: "Wer bin ich?",
            subtitle: "2–12 Spieler · Gemeinsam raten",
            emoji: "❓",
            badge: "RATEN",
            tint: Color(red: 0.55, green: 0.43, blue: 1.00)
        ),
        GameDefinition(
            kind: .charades,
            title: "Scharade",
            subtitle: "2–12 Spieler · Stirn & Wippen",
            emoji: "🎬",
            badge: "STIRN",
            tint: Color(red: 0.34, green: 0.78, blue: 0.67)
        )
    ]
}
