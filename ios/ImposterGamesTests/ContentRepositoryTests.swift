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

    func testCircaDatasetMatchesProduction() throws {
        let payload = try ContentRepository().circa()

        XCTAssertEqual(payload.count, 520)
        XCTAssertEqual(payload.items.count, 520)
        XCTAssertEqual(Set(payload.items.map(\.qid)).count, 520)
        XCTAssertTrue(payload.items.allSatisfy { $0.max > 0 && $0.step > 0 })
    }

    func testClassicDatasetMatchesProduction() throws {
        let payload = try ContentRepository().classic()

        XCTAssertEqual(payload.count, 250)
        XCTAssertEqual(payload.items.count, 250)
        XCTAssertEqual(Set(payload.items.map(\.wid)).count, 250)
        XCTAssertEqual(Set(payload.items.map { $0.word.lowercased() }).count, 250)
    }

    func testWhoAmIDatasetMatchesProduction() throws {
        let payload = try ContentRepository().whoAmI()

        XCTAssertEqual(payload.count, 275)
        XCTAssertEqual(payload.items.count, 275)
        XCTAssertEqual(payload.categories.count, 11)
        XCTAssertEqual(Set(payload.items.map(\.id)).count, 275)
        XCTAssertEqual(Set(payload.items.map { $0.term.lowercased() }).count, 275)
    }

    func testCharadesDatasetMatchesProduction() throws {
        let payload = try ContentRepository().charades()

        XCTAssertEqual(payload.count, 300)
        XCTAssertEqual(payload.items.count, 300)
        XCTAssertEqual(payload.categories.count, 12)
        XCTAssertEqual(Set(payload.items.map(\.id)).count, 300)
        XCTAssertEqual(Set(payload.items.map { $0.term.lowercased() }).count, 300)
    }

    @MainActor
    func testNativeBackupV3RoundTrip() throws {
        let suiteName = "ImposterGamesTests-" + UUID().uuidString
        guard let defaults = UserDefaults(suiteName: suiteName) else {
            XCTFail("Could not create isolated UserDefaults suite")
            return
        }
        defer {
            defaults.removePersistentDomain(forName: suiteName)
        }

        let store = AppStore(defaults: defaults)
        let backup = try store.createBackupData()
        let object = try XCTUnwrap(try JSONSerialization.jsonObject(with: backup) as? [String: Any])

        XCTAssertEqual(object["format"] as? String, "imposter-games-backup")
        XCTAssertEqual((object["formatVersion"] as? NSNumber)?.intValue, 3)

        let integrity = try XCTUnwrap(object["integrity"] as? [String: Any])
        XCTAssertEqual(integrity["algorithm"] as? String, "SHA-256")
        XCTAssertEqual((integrity["sha256"] as? String)?.count, 64)

        XCTAssertNoThrow(try store.importBackupData(backup))
        XCTAssertFalse(store.data.profiles.isEmpty)
    }
}
