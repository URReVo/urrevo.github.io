import Foundation

enum GameStorage {
    static let prefix = "imposterGames.v73.game."

    static let knownSuffixes = [
        "circa.players.v1",
        "classic.players.v1",
        "circa.categories.v1",
        "classic.categories.v1",
        "circa.deckProgress.v1",
        "circa.difficulty.v1",
        "circa.playerStats.v1",
        "circa.deviceStats.v1",
        "circa.completedQuestions.v1",
        "classic.deck.v1",
        "classic.hint.v1",
        "classic.timer.v1",
        "whoami.players.v1",
        "whoami.categories.v1",
        "whoami.deck.v1",
        "charades.players.v1",
        "charades.categories.v1",
        "charades.deck.v1",
        "charades.timer.v1",
        "charades.motionFlip.v2",
        "v72Migration.v1"
    ]

    static func load<T: Decodable>(_ suffix: String, as type: T.Type, default fallback: T) -> T {
        guard let data = UserDefaults.standard.data(forKey: prefix + suffix) else { return fallback }
        return (try? JSONDecoder().decode(type, from: data)) ?? fallback
    }

    static func save<T: Encodable>(_ value: T, suffix: String) {
        guard let data = try? JSONEncoder().encode(value) else { return }
        UserDefaults.standard.set(data, forKey: prefix + suffix)
    }

    static func remove(_ suffix: String) {
        UserDefaults.standard.removeObject(forKey: prefix + suffix)
    }

    static func clear() {
        knownSuffixes.forEach { remove($0) }
    }

    static func snapshot() -> [String: JSONValue] {
        var result: [String: JSONValue] = [:]

        for suffix in knownSuffixes {
            guard let data = UserDefaults.standard.data(forKey: prefix + suffix),
                  let object = try? JSONSerialization.jsonObject(with: data, options: [.fragmentsAllowed]),
                  let value = JSONValue.fromFoundation(object) else {
                continue
            }
            result[suffix] = value
        }

        return result
    }

    static func restore(_ snapshot: [String: JSONValue]) {
        clear()

        let encoder = JSONEncoder()
        for suffix in knownSuffixes {
            guard let value = snapshot[suffix],
                  let data = try? encoder.encode(value) else {
                continue
            }
            UserDefaults.standard.set(data, forKey: prefix + suffix)
        }

        if UserDefaults.standard.data(forKey: prefix + "v72Migration.v1") == nil {
            let marker: [String: JSONValue] = [
                "completed": .bool(true),
                "restored": .bool(true),
                "at": .string(ISO8601DateFormatter().string(from: Date()))
            ]
            if let data = try? JSONEncoder().encode(marker) {
                UserDefaults.standard.set(data, forKey: prefix + "v72Migration.v1")
            }
        }
    }
}
