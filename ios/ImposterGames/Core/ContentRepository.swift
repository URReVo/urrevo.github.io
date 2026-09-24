import Foundation
import Combine

final class ContentRepository: ObservableObject {
    @Published private(set) var catalog: GameCatalog?
    @Published private(set) var charades: CharadesPayload?
    @Published private(set) var counts: [String: Int] = [:]
    @Published private(set) var loadError: String?

    private let bundle: Bundle
    private let decoder = JSONDecoder()

    init(bundle: Bundle = .main) {
        self.bundle = bundle
        load()
    }

    func load() {
        do {
            let catalog: GameCatalog = try decode("games.json")
            let charades: CharadesPayload = try decode("charades.json")
            let circa: CountEnvelope = try decode("circa-questions.json")
            let classic: CountEnvelope = try decode("classic-words.json")
            let who: CountEnvelope = try decode("who-am-i.json")

            guard charades.count == charades.items.count else {
                throw ContentError.invalidCount("charades.json")
            }

            self.catalog = catalog
            self.charades = charades
            self.counts = [
                "circa-imposter": circa.count,
                "classic-imposter": classic.count,
                "who-am-i": who.count,
                "charades": charades.count
            ]
            self.loadError = nil
        } catch {
            self.loadError = error.localizedDescription
        }
    }

    func count(for gameID: String) -> Int? {
        counts[gameID]
    }

    private func decode<T: Decodable>(_ filename: String) throws -> T {
        let file = filename as NSString
        let name = file.deletingPathExtension
        let ext = file.pathExtension
        guard let url = bundle.url(forResource: name, withExtension: ext) else {
            throw ContentError.missingResource(filename)
        }
        let data = try Data(contentsOf: url)
        return try decoder.decode(T.self, from: data)
    }
}

enum ContentError: LocalizedError {
    case missingResource(String)
    case invalidCount(String)

    var errorDescription: String? {
        switch self {
        case .missingResource(let name):
            return "Ressource fehlt: \(name)"
        case .invalidCount(let name):
            return "Ungültiger Datensatz: \(name)"
        }
    }
}
