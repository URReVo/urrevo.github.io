import XCTest
@testable import ImposterGames

final class ContentModelTests: XCTestCase {
    func testGameCatalogDecodes() throws {
        let json = """
        {
          "schemaVersion": 1,
          "platformVersion": "73",
          "games": [{
            "id": "charades",
            "title": "Scharade",
            "icon": "🎬",
            "description": "Test",
            "meta": "2–12 Spieler",
            "path": "games/charades/"
          }]
        }
        """
        let value = try JSONDecoder().decode(GameCatalog.self, from: Data(json.utf8))
        XCTAssertEqual(value.platformVersion, "73")
        XCTAssertEqual(value.games.first?.id, "charades")
    }

    func testCharadesPayloadDecodes() throws {
        let json = """
        {
          "schemaVersion": 1,
          "count": 1,
          "categories": [{"name":"Tiere","emoji":"🐾","count":1}],
          "items": [{"id":"sch-0001","cat":"Tiere","term":"Elefant"}]
        }
        """
        let value = try JSONDecoder().decode(CharadesPayload.self, from: Data(json.utf8))
        XCTAssertEqual(value.count, 1)
        XCTAssertEqual(value.items.first?.term, "Elefant")
    }
}
