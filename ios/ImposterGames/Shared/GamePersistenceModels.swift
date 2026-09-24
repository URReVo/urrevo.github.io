import Foundation

struct GamePlayerSnapshot: Codable {
    var players: [PlayerDraft]
}

struct StringArrayMap: Codable {
    var values: [String: [String]]
}
