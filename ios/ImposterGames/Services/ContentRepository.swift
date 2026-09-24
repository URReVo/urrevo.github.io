import Foundation

enum ContentRepositoryError: LocalizedError {
    case missingResource(String)
    case invalidResource(String, Error)

    var errorDescription: String? {
        switch self {
        case .missingResource(let name):
            return "Ressource \(name).json wurde nicht gefunden."
        case .invalidResource(let name, let error):
            return "Ressource \(name).json konnte nicht gelesen werden: \(error.localizedDescription)"
        }
    }
}

private final class BundleToken: NSObject {}

struct ContentRepository {
    private let bundle: Bundle

    init(bundle: Bundle = Bundle(for: BundleToken.self)) {
        self.bundle = bundle
    }

    func charades() throws -> CharadesPayload {
        try decode("charades", as: CharadesPayload.self)
    }

    func hasResource(named name: String) -> Bool {
        resourceURL(named: name) != nil
    }

    private func resourceURL(named name: String) -> URL? {
        bundle.url(forResource: name, withExtension: "json")
            ?? bundle.url(forResource: name, withExtension: "json", subdirectory: "Content")
            ?? bundle.url(forResource: name, withExtension: "json", subdirectory: "Resources/Content")
    }

    private func decode<T: Decodable>(_ name: String, as type: T.Type) throws -> T {
        guard let url = resourceURL(named: name) else {
            throw ContentRepositoryError.missingResource(name)
        }

        do {
            let data = try Data(contentsOf: url)
            return try JSONDecoder().decode(T.self, from: data)
        } catch {
            throw ContentRepositoryError.invalidResource(name, error)
        }
    }
}
