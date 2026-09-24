import Foundation

struct ContentCategory: Codable, Hashable, Identifiable {
    let name: String
    let emoji: String
    let count: Int

    var id: String { name }
}

struct CharadesTerm: Codable, Hashable, Identifiable {
    let id: String
    let cat: String
    let term: String
}

struct CharadesPayload: Codable {
    let schemaVersion: Int
    let count: Int
    let categories: [ContentCategory]
    let items: [CharadesTerm]
}
