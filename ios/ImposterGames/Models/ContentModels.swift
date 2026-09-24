import Foundation

struct ContentCategory: Codable, Hashable, Identifiable {
    let name: String
    let emoji: String
    let count: Int

    var id: String { name }
}

struct CircaQuestion: Codable, Hashable, Identifiable {
    let cat: String
    let normal: String
    let imp: String
    let normalValue: Double
    let normalAnswer: String
    let impValue: Double
    let impAnswer: String
    let max: Double
    let step: Double
    let qid: String
    let normalUnit: String
    let impUnit: String

    var id: String { qid }
}

struct CircaPayload: Codable {
    let schemaVersion: Int
    let game: String
    let count: Int
    let items: [CircaQuestion]
}

struct ClassicWord: Codable, Hashable, Identifiable {
    let cat: String
    let word: String
    let wid: String
    let hint: String

    var id: String { wid }
}

struct ClassicPayload: Codable {
    let schemaVersion: Int
    let game: String
    let count: Int
    let items: [ClassicWord]
}

struct WhoAmITerm: Codable, Hashable, Identifiable {
    let id: String
    let cat: String
    let term: String
}

struct WhoAmIPayload: Codable {
    let schemaVersion: Int
    let count: Int
    let categories: [ContentCategory]
    let items: [WhoAmITerm]
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
