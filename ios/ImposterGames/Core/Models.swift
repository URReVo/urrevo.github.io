import Foundation

struct GameCatalog: Decodable {
    let schemaVersion: Int
    let platformVersion: String
    let games: [GameDescriptor]
}

struct GameDescriptor: Decodable, Identifiable, Hashable {
    let id: String
    let title: String
    let icon: String
    let description: String
    let meta: String
    let path: String
}

struct CountEnvelope: Decodable {
    let schemaVersion: Int
    let count: Int
}

struct TermCategory: Decodable, Identifiable, Hashable {
    var id: String { name }
    let name: String
    let emoji: String
    let count: Int
}

struct CharadesPayload: Decodable {
    let schemaVersion: Int
    let count: Int
    let categories: [TermCategory]
    let items: [CharadesTerm]
}

struct CharadesTerm: Decodable, Identifiable, Hashable {
    let id: String
    let cat: String
    let term: String
}
