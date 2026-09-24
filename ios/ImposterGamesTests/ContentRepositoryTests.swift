import XCTest
@testable import ImposterGames

final class ContentRepositoryTests: XCTestCase {
    func testRequiredContentResourcesExist() {
        let repository = ContentRepository()

        XCTAssertTrue(repository.hasResource(named: "circa-questions"))
        XCTAssertTrue(repository.hasResource(named: "classic-words"))
        XCTAssertTrue(repository.hasResource(named: "who-am-i"))
        XCTAssertTrue(repository.hasResource(named: "charades"))
    }

    func testCharadesDatasetMatchesProduction() throws {
        let payload = try ContentRepository().charades()

        XCTAssertEqual(payload.count, 300)
        XCTAssertEqual(payload.items.count, 300)
        XCTAssertEqual(payload.categories.count, 12)
        XCTAssertEqual(Set(payload.items.map(\.id)).count, 300)
        XCTAssertEqual(Set(payload.items.map { $0.term.lowercased() }).count, 300)
    }
}
