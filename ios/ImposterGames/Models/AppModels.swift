import Foundation

struct PlayerProfile: Codable, Identifiable, Hashable {
    var id: String
    var name: String
    var avatar: String
    var aliases: [String]
    var createdAt: String
    var deletedAt: String? = nil
}

struct ProfileStats: Codable, Hashable {
    var rounds = 0
    var circaRounds = 0
    var classicRounds = 0
    var impostor = 0
    var impostorEscapes = 0
    var closest = 0
    var farthest = 0
    var perfect = 0
    var errorSum = 0.0
    var errorSamples = 0
    var circaQids: [String] = []
    var classicWids: [String] = []
    var categories: [String] = []
    var legacyPerfectUnknown = false
    var legacyCategoryUnknown = false
}

struct GlobalStats: Codable, Hashable {
    var rounds = 0
    var circaRounds = 0
    var classicRounds = 0
    var perfectEstimates = 0
    var circaQids: [String] = []
    var classicWids: [String] = []
    var categories: [String] = []
}

struct AppPreferences: Codable, Hashable {
    var sound = true
    var haptics = true
    var animations = true
}

struct SessionRoundPlayer: Codable, Hashable {
    var profileId: String
    var role: String
    var guess: Double?
    var target: Double?
    var error: Double?
    var closest: Bool?
    var farthest: Bool?
    var perfect: Bool?
}

struct SessionRound: Codable, Identifiable, Hashable {
    var roundKey: String
    var game: String
    var at: String
    var category: String?
    var difficulty: String?
    var qid: String?
    var wid: String?
    var word: String?
    var hintEnabled: Bool?
    var timer: Int?
    var impostorId: String?
    var impostorEscaped: Bool?
    var players: [SessionRoundPlayer]

    var id: String { roundKey }
}

struct SessionAward: Codable, Identifiable, Hashable {
    var type: String
    var icon: String
    var title: String
    var profileId: String
    var detail: String

    var id: String { "\(type)::\(profileId)::\(title)" }
}

struct GameSession: Codable, Identifiable, Hashable {
    var id: String
    var startedAt: String
    var endedAt: String?
    var profileIds: [String]
    var lastProfileIds: [String]
    var rounds: [SessionRound]
    var awards: [SessionAward]
    var lastGame: String?
}

struct QuickPreset: Codable, Identifiable, Hashable {
    var id: String
    var builtIn: Bool
    var name: String
    var icon: String
    var game: String
    var playerCount: Int
    var categories: [String]
    var difficulty: String
    var hint: Bool
    var timer: Int
    var summary: String
}

struct AppData: Codable, Hashable {
    var schemaVersion: Int
    var selectedProfileId: String
    var primaryProfileId: String
    var profiles: [PlayerProfile]
    var profileStats: [String: ProfileStats]
    var profileArchive: [String: PlayerProfile]
    var stats: GlobalStats
    var sessions: [GameSession]
    var activeSessionId: String?
    var achievements: [String: Bool]
    var presets: [QuickPreset]
    var preferences: AppPreferences
    var imports: [String: String]
}

struct PlayerDraft: Codable, Identifiable, Hashable {
    var id: String
    var profileId: String?
    var name: String
    var avatar: String

    init(profileId: String? = nil, name: String, avatar: String, id: String = UUID().uuidString) {
        self.id = id
        self.profileId = profileId
        self.name = name
        self.avatar = avatar
    }

    private enum CodingKeys: String, CodingKey {
        case id, profileId, name, avatar
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decodeIfPresent(String.self, forKey: .id) ?? UUID().uuidString
        profileId = try container.decodeIfPresent(String.self, forKey: .profileId)
        name = try container.decodeIfPresent(String.self, forKey: .name) ?? "Spieler"
        avatar = try container.decodeIfPresent(String.self, forKey: .avatar) ?? "😎"
    }
}

struct AchievementViewData: Identifiable, Hashable {
    var id: String
    var icon: String
    var title: String
    var text: String
    var unlocked: Bool
    var progress: String
}

struct NativeBackupEnvelope: Codable {
    var format: String
    var formatVersion: Int
    var exportedAt: String
    var data: AppData
    var gameStorage: [String: JSONValue]
    var integrity: BackupIntegrity?
}

struct BackupIntegrity: Codable {
    var algorithm: String
    var canonical: String
    var sha256: String
}

enum JSONValue: Codable, Equatable {
    case string(String)
    case number(Double)
    case bool(Bool)
    case object([String: JSONValue])
    case array([JSONValue])
    case null

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if container.decodeNil() {
            self = .null
        } else if let value = try? container.decode(Bool.self) {
            self = .bool(value)
        } else if let value = try? container.decode(Double.self) {
            self = .number(value)
        } else if let value = try? container.decode(String.self) {
            self = .string(value)
        } else if let value = try? container.decode([String: JSONValue].self) {
            self = .object(value)
        } else if let value = try? container.decode([JSONValue].self) {
            self = .array(value)
        } else {
            throw DecodingError.dataCorruptedError(in: container, debugDescription: "Unsupported JSON value")
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .string(let value): try container.encode(value)
        case .number(let value): try container.encode(value)
        case .bool(let value): try container.encode(value)
        case .object(let value): try container.encode(value)
        case .array(let value): try container.encode(value)
        case .null: try container.encodeNil()
        }
    }
}

extension JSONValue {
    var foundationObject: Any {
        switch self {
        case .string(let value): return value
        case .number(let value): return value
        case .bool(let value): return value
        case .object(let value): return value.mapValues { $0.foundationObject }
        case .array(let value): return value.map { $0.foundationObject }
        case .null: return NSNull()
        }
    }

    static func fromFoundation(_ value: Any) -> JSONValue? {
        switch value {
        case let value as String: return .string(value)
        case let value as Bool: return .bool(value)
        case let value as NSNumber: return .number(value.doubleValue)
        case let value as [String: Any]:
            return .object(value.compactMapValues(JSONValue.fromFoundation))
        case let value as [Any]:
            return .array(value.compactMap(JSONValue.fromFoundation))
        case _ as NSNull: return .null
        default: return nil
        }
    }
}
