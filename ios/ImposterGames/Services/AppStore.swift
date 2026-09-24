import Combine
import CoreFoundation
import CryptoKit
import Foundation

@MainActor
final class AppStore: ObservableObject {
    static let storageKey = "imposterGames.appState.v1"
    static let versionLabel = "V73R14"
    static let avatars = ["😎", "🕵️", "🥷", "🤠", "👻", "🤖", "🦊", "🐼", "🐸", "🦁", "🐙", "🦄"]

    @Published private(set) var data: AppData
    @Published var launchPreset: QuickPreset?
    @Published var launchGroup: [PlayerProfile]?

    private let defaults: UserDefaults
    private let encoder: JSONEncoder
    private let decoder: JSONDecoder

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        self.encoder = JSONEncoder()
        self.decoder = JSONDecoder()

        if let stored = defaults.data(forKey: Self.storageKey),
           let decoded = try? decoder.decode(AppData.self, from: stored),
           !decoded.profiles.isEmpty {
            self.data = Self.normalized(decoded)
        } else {
            self.data = Self.defaultData()
        }

        persist(data)
    }

    var selectedProfile: PlayerProfile {
        data.profiles.first(where: { $0.id == data.selectedProfileId }) ?? data.profiles[0]
    }

    var activeSession: GameSession? {
        guard let id = data.activeSessionId else { return nil }
        return data.sessions.first(where: { $0.id == id && $0.endedAt == nil })
    }

    var lastFinishedSession: GameSession? {
        data.sessions.reversed().first(where: { $0.endedAt != nil })
    }

    var allPresets: [QuickPreset] {
        Self.builtInPresets + data.presets
    }

    func profile(id: String?) -> PlayerProfile? {
        guard let id else { return nil }
        return data.profiles.first(where: { $0.id == id })
            ?? data.profileArchive[id]
    }

    func stats(for profileId: String) -> ProfileStats {
        data.profileStats[profileId] ?? ProfileStats()
    }

    func setSelectedProfile(_ id: String) {
        guard data.profiles.contains(where: { $0.id == id }) else { return }
        mutate {
            $0.selectedProfileId = id
            $0.primaryProfileId = id
        }
    }

    @discardableResult
    func addProfile(name: String, avatar: String) -> String {
        let clean = Self.cleanName(name)
        if let existing = data.profiles.first(where: {
            $0.name.compare(clean, options: [.caseInsensitive, .diacriticInsensitive], locale: Locale(identifier: "de_DE")) == .orderedSame
        }) {
            return existing.id
        }

        let id = Self.uid("player")
        mutate {
            $0.profiles.append(
                PlayerProfile(
                    id: id,
                    name: clean.isEmpty ? "Spieler" : clean,
                    avatar: Self.validAvatar(avatar),
                    aliases: [],
                    createdAt: Self.now()
                )
            )
            $0.profileStats[id] = $0.profileStats[id] ?? ProfileStats()
        }
        return id
    }

    @discardableResult
    func updateProfile(id: String, name: String, avatar: String) -> Bool {
        let clean = Self.cleanName(name)
        guard !clean.isEmpty,
              let index = data.profiles.firstIndex(where: { $0.id == id }),
              !data.profiles.contains(where: {
                  $0.id != id &&
                  $0.name.compare(clean, options: [.caseInsensitive, .diacriticInsensitive], locale: Locale(identifier: "de_DE")) == .orderedSame
              }) else {
            return false
        }

        mutate { working in
            let oldName = working.profiles[index].name
            if oldName.compare(clean, options: [.caseInsensitive, .diacriticInsensitive], locale: Locale(identifier: "de_DE")) != .orderedSame,
               !Self.isGenericPlayerName(oldName),
               !working.profiles[index].aliases.contains(where: {
                   $0.compare(oldName, options: [.caseInsensitive, .diacriticInsensitive], locale: Locale(identifier: "de_DE")) == .orderedSame
               }) {
                working.profiles[index].aliases.append(oldName)
                working.profiles[index].aliases = Array(working.profiles[index].aliases.suffix(8))
            }
            working.profiles[index].name = clean
            working.profiles[index].avatar = Self.validAvatar(avatar)
        }
        return true
    }

    @discardableResult
    func deleteProfile(_ id: String) -> Bool {
        guard data.profiles.count > 1,
              let index = data.profiles.firstIndex(where: { $0.id == id }) else {
            return false
        }

        mutate { working in
            let removed = working.profiles.remove(at: index)
            working.profileArchive[id] = removed
            if working.selectedProfileId == id || working.primaryProfileId == id {
                working.selectedProfileId = working.profiles[0].id
                working.primaryProfileId = working.profiles[0].id
            }
        }
        return true
    }

    func preferredPlayers(limit: Int) -> [PlayerProfile] {
        var profiles = data.profiles
        if let selectedIndex = profiles.firstIndex(where: { $0.id == data.selectedProfileId }), selectedIndex > 0 {
            let selected = profiles.remove(at: selectedIndex)
            profiles.insert(selected, at: 0)
        }
        return Array(profiles.prefix(max(0, limit)))
    }

    func resolvedPlayers(_ players: [PlayerDraft]) -> [PlayerDraft] {
        var working = data
        var resolved: [PlayerDraft] = []

        for var player in players {
            let id = Self.ensureProfile(player, in: &working)
            player.profileId = id
            resolved.append(player)
        }

        data = working
        persist(working)
        return resolved
    }

    func beginSession(players: [PlayerDraft], game: String) -> String {
        var working = data
        var resolvedIds: [String] = []

        for player in players {
            let id = Self.ensureProfile(player, in: &working)
            if !resolvedIds.contains(id) { resolvedIds.append(id) }
        }

        let sessionId: String
        if let activeId = working.activeSessionId,
           let index = working.sessions.firstIndex(where: { $0.id == activeId && $0.endedAt == nil }) {
            for id in resolvedIds where !working.sessions[index].profileIds.contains(id) {
                working.sessions[index].profileIds.append(id)
            }
            if !resolvedIds.isEmpty {
                working.sessions[index].lastProfileIds = resolvedIds
            }
            working.sessions[index].lastGame = game
            sessionId = working.sessions[index].id
        } else {
            sessionId = Self.uid("session")
            let session = GameSession(
                id: sessionId,
                startedAt: Self.now(),
                endedAt: nil,
                profileIds: resolvedIds,
                lastProfileIds: resolvedIds,
                rounds: [],
                awards: [],
                lastGame: game
            )
            working.sessions.append(session)
            if working.sessions.count > 50 {
                working.sessions.removeFirst(working.sessions.count - 50)
            }
            working.activeSessionId = sessionId
        }

        data = working
        persist(working)
        return sessionId
    }

    func setActiveSessionGame(_ game: String) {
        guard let activeId = data.activeSessionId,
              let index = data.sessions.firstIndex(where: { $0.id == activeId && $0.endedAt == nil }) else {
            return
        }
        mutate { $0.sessions[index].lastGame = game }
    }

    func recordRound(_ round: SessionRound) {
        var working = data

        if working.activeSessionId == nil ||
            !working.sessions.contains(where: { $0.id == working.activeSessionId && $0.endedAt == nil }) {
            let ids = round.players.map(\.profileId).uniqued()
            let id = Self.uid("session")
            working.sessions.append(
                GameSession(
                    id: id,
                    startedAt: Self.now(),
                    endedAt: nil,
                    profileIds: ids,
                    lastProfileIds: ids,
                    rounds: [],
                    awards: [],
                    lastGame: round.game
                )
            )
            working.activeSessionId = id
        }

        guard let activeId = working.activeSessionId,
              let sessionIndex = working.sessions.firstIndex(where: { $0.id == activeId }) else {
            return
        }

        if let existing = working.sessions[sessionIndex].rounds.firstIndex(where: { $0.roundKey == round.roundKey }) {
            let previous = working.sessions[sessionIndex].rounds[existing]
            Self.applyContribution(previous, direction: -1, to: &working)
            working.sessions[sessionIndex].rounds[existing] = round
        } else {
            working.sessions[sessionIndex].rounds.append(round)
        }

        Self.applyContribution(round, direction: 1, to: &working)
        working.sessions[sessionIndex].lastGame = round.game

        let ids = round.players.map(\.profileId).uniqued()
        for id in ids where !working.sessions[sessionIndex].profileIds.contains(id) {
            working.sessions[sessionIndex].profileIds.append(id)
        }
        if !ids.isEmpty {
            working.sessions[sessionIndex].lastProfileIds = ids
        }

        Self.evaluateAchievements(&working)
        data = working
        persist(working)
    }

    @discardableResult
    func endSession() -> GameSession? {
        guard let activeId = data.activeSessionId,
              let index = data.sessions.firstIndex(where: { $0.id == activeId && $0.endedAt == nil }) else {
            return nil
        }

        var working = data
        working.sessions[index].endedAt = Self.now()
        working.sessions[index].awards = Self.computeAwards(working.sessions[index])
        let finished = working.sessions[index]
        working.activeSessionId = nil
        Self.evaluateAchievements(&working)
        data = working
        persist(working)
        return finished
    }

    func sessions(for profileId: String?) -> [GameSession] {
        let all = Array(data.sessions.reversed())
        guard let profileId else { return all }
        return all.filter { $0.profileIds.contains(profileId) }
    }

    func achievementViews(profileId: String?) -> [AchievementViewData] {
        if let profileId {
            let stats = data.profileStats[profileId] ?? ProfileStats()
            let ended = data.sessions.contains {
                $0.endedAt != nil && !$0.rounds.isEmpty && $0.profileIds.contains(profileId)
            }
            return Self.achievementRows(
                rounds: stats.rounds,
                classicRounds: stats.classicRounds,
                perfect: stats.perfect,
                escapes: stats.impostorEscapes,
                categories: stats.categories.count,
                endedSession: ended,
                legacyPerfectUnknown: stats.legacyPerfectUnknown,
                legacyCategoryUnknown: stats.legacyCategoryUnknown
            )
        }

        let maxEscapes = data.profileStats.values.map(\.impostorEscapes).max() ?? 0
        let ended = data.sessions.contains { $0.endedAt != nil && !$0.rounds.isEmpty }
        return Self.achievementRows(
            rounds: data.stats.rounds,
            classicRounds: data.stats.classicRounds,
            perfect: data.stats.perfectEstimates,
            escapes: maxEscapes,
            categories: data.stats.categories.count,
            endedSession: ended,
            legacyPerfectUnknown: false,
            legacyCategoryUnknown: false
        )
    }

    func setPreference(_ key: String, value: Bool) {
        mutate { working in
            switch key {
            case "sound": working.preferences.sound = value
            case "haptics": working.preferences.haptics = value
            case "animations": working.preferences.animations = value
            default: break
            }
        }
    }

    @discardableResult
    func savePreset(_ preset: QuickPreset) -> QuickPreset {
        var normalized = preset
        normalized.id = normalized.id.hasPrefix("custom") ? normalized.id : Self.uid("custom")
        normalized.builtIn = false
        normalized.name = String(normalized.name.trimmingCharacters(in: .whitespacesAndNewlines).prefix(22))
        if normalized.name.isEmpty { normalized.name = "Eigenes Preset" }
        normalized.icon = String(normalized.icon.prefix(8))
        normalized.game = normalized.game == "classic" ? "classic" : "circa"
        normalized.playerCount = min(12, max(3, normalized.playerCount))
        normalized.categories = normalized.categories.isEmpty ? ["Alle"] : Array(normalized.categories.prefix(10))
        if !["leicht", "mittel", "schwer", "zufaellig"].contains(normalized.difficulty) {
            normalized.difficulty = "mittel"
        }
        if ![0, 60, 90, 120, 150, 180, 210, 240, 270, 300].contains(normalized.timer) {
            normalized.timer = 0
        }
        normalized.summary = normalized.game == "classic"
            ? "Classic · \(normalized.playerCount) Spieler" + (normalized.timer > 0 ? " · \(normalized.timer / 60) Min." : "")
            : "Circa · \(normalized.playerCount) Spieler · \(normalized.categories.first ?? "Alle")"

        mutate { working in
            if let index = working.presets.firstIndex(where: { $0.id == normalized.id }) {
                working.presets[index] = normalized
            } else {
                working.presets.append(normalized)
            }
        }
        return normalized
    }

    func deletePreset(_ id: String) {
        mutate { $0.presets.removeAll(where: { $0.id == id && !$0.builtIn }) }
    }

    func prepareLaunch(preset: QuickPreset?, group: [PlayerProfile]? = nil) {
        launchPreset = preset
        launchGroup = group
    }

    func consumeLaunchPreset(for game: String) -> QuickPreset? {
        guard let preset = launchPreset, preset.game == game else { return nil }
        launchPreset = nil
        return preset
    }

    func consumeLaunchGroup() -> [PlayerProfile]? {
        defer { launchGroup = nil }
        return launchGroup
    }

    func group(for session: GameSession) -> [PlayerProfile] {
        let ids = session.lastProfileIds.isEmpty ? session.profileIds : session.lastProfileIds
        return ids.compactMap { profile(id: $0) }
    }

    func resetAllData() {
        let fresh = Self.defaultData()
        data = fresh
        launchPreset = nil
        launchGroup = nil
        GameStorage.clear()
        GameStorage.save(
            ["completed": JSONValue.bool(true), "reset": .bool(true), "at": .string(Self.now())],
            suffix: "v72Migration.v1"
        )
        persist(fresh)
    }

    func createBackupData() throws -> Data {
        var envelope = NativeBackupEnvelope(
            format: "imposter-games-backup",
            formatVersion: 3,
            exportedAt: Self.now(),
            data: data,
            gameStorage: GameStorage.snapshot(),
            integrity: nil
        )

        let digest = try Self.backupDigest(envelope)
        envelope.integrity = BackupIntegrity(
            algorithm: "SHA-256",
            canonical: "sorted-json-v1",
            sha256: digest
        )

        let output = JSONEncoder()
        output.outputFormatting = [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
        return try output.encode(envelope)
    }

    func importBackupData(_ backupData: Data) throws {
        guard let object = try JSONSerialization.jsonObject(with: backupData) as? [String: Any],
              object["format"] as? String == "imposter-games-backup",
              (object["formatVersion"] as? NSNumber)?.intValue == 3,
              let integrity = object["integrity"] as? [String: Any],
              integrity["algorithm"] as? String == "SHA-256",
              let expected = integrity["sha256"] as? String else {
            throw BackupError.invalidFormat
        }

        var payload: [String: Any] = [:]
        payload["format"] = object["format"]
        payload["formatVersion"] = object["formatVersion"]
        payload["exportedAt"] = object["exportedAt"] ?? NSNull()
        payload["data"] = object["data"] ?? NSNull()
        payload["gameStorage"] = object["gameStorage"] ?? [:]

        let actual = Self.sha256Hex(Self.canonicalJSON(payload))
        guard actual.caseInsensitiveCompare(expected) == .orderedSame else {
            throw BackupError.integrity
        }

        var decoded = try decoder.decode(NativeBackupEnvelope.self, from: backupData)
        guard !decoded.data.profiles.isEmpty else { throw BackupError.noProfiles }
        decoded.data = Self.normalized(decoded.data)
        decoded.data.activeSessionId = decoded.data.activeSessionId.flatMap { id in
            decoded.data.sessions.contains(where: { $0.id == id && $0.endedAt == nil }) ? id : nil
        }

        data = decoded.data
        launchPreset = nil
        launchGroup = nil
        GameStorage.restore(decoded.gameStorage)
        persist(decoded.data)
    }

    func backupFilename() -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return "Imposter-Games-Backup-\(formatter.string(from: Date())).json"
    }

    private func mutate(_ body: (inout AppData) -> Void) {
        var working = data
        body(&working)
        data = working
        persist(working)
    }

    private func persist(_ value: AppData) {
        guard let encoded = try? encoder.encode(value) else { return }
        defaults.set(encoded, forKey: Self.storageKey)
    }

    private static func defaultData() -> AppData {
        let id = uid("player")
        return AppData(
            schemaVersion: 1,
            selectedProfileId: id,
            primaryProfileId: id,
            profiles: [
                PlayerProfile(
                    id: id,
                    name: "Spieler",
                    avatar: "😎",
                    aliases: [],
                    createdAt: now()
                )
            ],
            profileStats: [id: ProfileStats()],
            profileArchive: [:],
            stats: GlobalStats(),
            sessions: [],
            activeSessionId: nil,
            achievements: [:],
            presets: [],
            preferences: AppPreferences(),
            imports: [
                "native": .bool(true),
                "v72MigrationCompleted": .bool(true)
            ]
        )
    }

    private static func normalized(_ source: AppData) -> AppData {
        var value = source
        if value.profiles.isEmpty { return defaultData() }

        if !value.profiles.contains(where: { $0.id == value.selectedProfileId }) {
            value.selectedProfileId = value.profiles[0].id
        }
        value.primaryProfileId = value.selectedProfileId

        for profile in value.profiles {
            if value.profileStats[profile.id] == nil {
                value.profileStats[profile.id] = ProfileStats()
            }
        }

        value.sessions = Array(value.sessions.suffix(50))
        return value
    }

    private static func cleanName(_ value: String) -> String {
        String(value.trimmingCharacters(in: .whitespacesAndNewlines).prefix(24))
    }

    private static func validAvatar(_ value: String) -> String {
        avatars.contains(value) ? value : "😎"
    }

    private static func isGenericPlayerName(_ value: String) -> Bool {
        value.range(of: #"^spieler(?:\s+\d+)?$"#, options: [.regularExpression, .caseInsensitive]) != nil
    }

    private static func uid(_ prefix: String) -> String {
        prefix + "_" + UUID().uuidString.replacingOccurrences(of: "-", with: "").lowercased()
    }

    static func now() -> String {
        ISO8601DateFormatter().string(from: Date())
    }

    private static func ensureProfile(_ draft: PlayerDraft, in data: inout AppData) -> String {
        if let profileId = draft.profileId,
           data.profiles.contains(where: { $0.id == profileId }) {
            data.profileStats[profileId] = data.profileStats[profileId] ?? ProfileStats()
            return profileId
        }

        let clean = cleanName(draft.name)
        if let existing = data.profiles.first(where: {
            $0.name.compare(clean, options: [.caseInsensitive, .diacriticInsensitive], locale: Locale(identifier: "de_DE")) == .orderedSame
        }) {
            data.profileStats[existing.id] = data.profileStats[existing.id] ?? ProfileStats()
            return existing.id
        }

        let id = uid("player")
        data.profiles.append(
            PlayerProfile(
                id: id,
                name: clean.isEmpty ? "Spieler" : clean,
                avatar: validAvatar(draft.avatar),
                aliases: [],
                createdAt: now()
            )
        )
        data.profileStats[id] = ProfileStats()
        return id
    }

    private static func applyContribution(_ round: SessionRound, direction: Int, to data: inout AppData) {
        data.stats.rounds = max(0, data.stats.rounds + direction)
        if round.game == "circa" {
            data.stats.circaRounds = max(0, data.stats.circaRounds + direction)
        }
        if round.game == "classic" {
            data.stats.classicRounds = max(0, data.stats.classicRounds + direction)
        }

        for player in round.players {
            var stats = data.profileStats[player.profileId] ?? ProfileStats()
            stats.rounds = max(0, stats.rounds + direction)
            if round.game == "circa" { stats.circaRounds = max(0, stats.circaRounds + direction) }
            if round.game == "classic" { stats.classicRounds = max(0, stats.classicRounds + direction) }
            if player.role == "impostor" { stats.impostor = max(0, stats.impostor + direction) }
            if player.role == "impostor", round.impostorEscaped == true {
                stats.impostorEscapes = max(0, stats.impostorEscapes + direction)
            }
            if player.closest == true { stats.closest = max(0, stats.closest + direction) }
            if player.farthest == true { stats.farthest = max(0, stats.farthest + direction) }
            if player.perfect == true {
                stats.perfect = max(0, stats.perfect + direction)
                data.stats.perfectEstimates = max(0, data.stats.perfectEstimates + direction)
            }

            if direction > 0 {
                if round.game == "circa", let qid = round.qid { stats.circaQids.appendUnique(qid) }
                if round.game == "classic", let wid = round.wid { stats.classicWids.appendUnique(wid) }
                if let category = round.category { stats.categories.appendUnique(category) }
            }

            if round.game == "circa", let error = player.error, error.isFinite {
                stats.errorSum = max(0, stats.errorSum + Double(direction) * error)
                stats.errorSamples = max(0, stats.errorSamples + direction)
            }

            data.profileStats[player.profileId] = stats
        }

        if direction > 0 {
            if round.game == "circa", let qid = round.qid { data.stats.circaQids.appendUnique(qid) }
            if round.game == "classic", let wid = round.wid { data.stats.classicWids.appendUnique(wid) }
            if let category = round.category { data.stats.categories.appendUnique(category) }
        }
    }

    private static func evaluateAchievements(_ data: inout AppData) {
        let rows = achievementRows(
            rounds: data.stats.rounds,
            classicRounds: data.stats.classicRounds,
            perfect: data.stats.perfectEstimates,
            escapes: data.profileStats.values.map(\.impostorEscapes).max() ?? 0,
            categories: data.stats.categories.count,
            endedSession: data.sessions.contains { $0.endedAt != nil && !$0.rounds.isEmpty },
            legacyPerfectUnknown: false,
            legacyCategoryUnknown: false
        )

        for row in rows where row.unlocked {
            if data.achievements[row.id] == nil {
                data.achievements[row.id] = .object(["unlockedAt": .string(now())])
            }
        }
    }

    private static func achievementRows(
        rounds: Int,
        classicRounds: Int,
        perfect: Int,
        escapes: Int,
        categories: Int,
        endedSession: Bool,
        legacyPerfectUnknown: Bool,
        legacyCategoryUnknown: Bool
    ) -> [AchievementViewData] {
        [
            AchievementViewData(
                id: "first-session",
                icon: "🎬",
                title: "Erster Abend",
                text: "Eine Session mit mindestens einer Runde abgeschlossen",
                unlocked: endedSession,
                progress: endedSession ? "1/1" : "0/1"
            ),
            AchievementViewData(
                id: "perfect",
                icon: "🎯",
                title: "Punktlandung",
                text: "Eine Circa-Schätzung exakt treffen",
                unlocked: perfect >= 1,
                progress: perfect >= 1 ? "1/1" : (legacyPerfectUnknown ? "V72: nicht erfasst" : "0/1")
            ),
            AchievementViewData(
                id: "escape-3",
                icon: "🕵️",
                title: "Unentdeckt",
                text: "3× als Imposter davonkommen",
                unlocked: escapes >= 3,
                progress: "\(min(3, escapes))/3"
            ),
            AchievementViewData(
                id: "all-categories",
                icon: "🗺️",
                title: "Alles gesehen",
                text: "Alle 10 Kategorien mindestens einmal",
                unlocked: categories >= 10,
                progress: "\(min(10, categories))/10" + (categories < 10 && legacyCategoryUnknown ? " · V72 teils" : "")
            ),
            AchievementViewData(
                id: "hundred-rounds",
                icon: "💯",
                title: "Veteran",
                text: "100 Runden insgesamt spielen",
                unlocked: rounds >= 100,
                progress: "\(min(100, rounds))/100"
            ),
            AchievementViewData(
                id: "classic-50",
                icon: "🎭",
                title: "Schauspieler",
                text: "50 Classic-Runden spielen",
                unlocked: classicRounds >= 50,
                progress: "\(min(50, classicRounds))/50"
            )
        ]
    }

    private static func computeAwards(_ session: GameSession) -> [SessionAward] {
        var best: (String, Double)?
        var wild: (String, Double)?
        var escapes: [String: Int] = [:]
        var impostors: [String: Int] = [:]

        for round in session.rounds {
            for player in round.players {
                if player.role == "impostor" {
                    impostors[player.profileId, default: 0] += 1
                    if round.impostorEscaped == true {
                        escapes[player.profileId, default: 0] += 1
                    }
                }

                if round.game == "circa", let error = player.error, error.isFinite {
                    if best == nil || error < best!.1 { best = (player.profileId, error) }
                    if wild == nil || error > wild!.1 { wild = (player.profileId, error) }
                }
            }
        }

        var awards: [SessionAward] = []
        if let best {
            awards.append(SessionAward(type: "best", icon: "🎯", title: "Beste Schätzung", profileId: best.0, detail: formatPercent(best.1) + " daneben"))
        }
        if let deception = escapes.max(by: { $0.value < $1.value }) {
            awards.append(SessionAward(type: "deception", icon: "🕵️", title: "Täuschungsmeister", profileId: deception.key, detail: "\(deception.value)× unentdeckt"))
        }
        if let wild {
            awards.append(SessionAward(type: "wild", icon: "😵", title: "Wildeste Schätzung", profileId: wild.0, detail: formatPercent(wild.1, whole: true) + " daneben"))
        }
        if let frequent = impostors.max(by: { $0.value < $1.value }) {
            awards.append(SessionAward(type: "impostor", icon: "🔥", title: "Dauerverdächtig", profileId: frequent.key, detail: "\(frequent.value)× Imposter"))
        }
        return Array(awards.prefix(4))
    }

    private static func formatPercent(_ value: Double, whole: Bool = false) -> String {
        let formatter = NumberFormatter()
        formatter.locale = Locale(identifier: "de_DE")
        formatter.maximumFractionDigits = whole ? 0 : 1
        formatter.minimumFractionDigits = 0
        return (formatter.string(from: NSNumber(value: value)) ?? String(value)) + " %"
    }

    static let builtInPresets: [QuickPreset] = [
        QuickPreset(id: "builtin-quick", builtIn: true, name: "Schnelle Runde", icon: "⚡️", game: "circa", playerCount: 4, categories: ["Alle"], difficulty: "zufaellig", hint: true, timer: 0, summary: "Circa · 4 Spieler · Zufall"),
        QuickPreset(id: "builtin-party", builtIn: true, name: "Party", icon: "🥳", game: "classic", playerCount: 6, categories: ["Alle"], difficulty: "mittel", hint: true, timer: 180, summary: "Classic · 6 Spieler · 3 Min."),
        QuickPreset(id: "builtin-spicy", builtIn: true, name: "Spicy", icon: "🌶️", game: "circa", playerCount: 5, categories: ["Spicy 🌶️"], difficulty: "mittel", hint: true, timer: 0, summary: "Circa · 5 Spieler · Spicy")
    ]

    private static func backupDigest(_ envelope: NativeBackupEnvelope) throws -> String {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys, .withoutEscapingSlashes]
        let data = try encoder.encode(envelope)
        guard var object = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw BackupError.invalidFormat
        }
        object.removeValue(forKey: "integrity")

        var payload: [String: Any] = [:]
        payload["format"] = object["format"]
        payload["formatVersion"] = object["formatVersion"]
        payload["exportedAt"] = object["exportedAt"] ?? NSNull()
        payload["data"] = object["data"] ?? NSNull()
        payload["gameStorage"] = object["gameStorage"] ?? [:]
        return sha256Hex(canonicalJSON(payload))
    }

    private static func sha256Hex(_ string: String) -> String {
        let digest = SHA256.hash(data: Data(string.utf8))
        return digest.map { String(format: "%02x", $0) }.joined()
    }

    private static func canonicalJSON(_ value: Any) -> String {
        if value is NSNull { return "null" }

        if let dictionary = value as? [String: Any] {
            let parts = dictionary.keys.sorted().compactMap { key -> String? in
                guard let encodedKey = jsonScalar(key) else { return nil }
                return encodedKey + ":" + canonicalJSON(dictionary[key] ?? NSNull())
            }
            return "{" + parts.joined(separator: ",") + "}"
        }

        if let array = value as? [Any] {
            return "[" + array.map(canonicalJSON).joined(separator: ",") + "]"
        }

        if let string = value as? String {
            return jsonScalar(string) ?? "\"\""
        }

        if let number = value as? NSNumber {
            if CFGetTypeID(number) == CFBooleanGetTypeID() {
                return number.boolValue ? "true" : "false"
            }
            return jsonScalar(number) ?? "0"
        }

        if let bool = value as? Bool {
            return bool ? "true" : "false"
        }

        return "null"
    }

    private static func jsonScalar(_ value: Any) -> String? {
        guard let data = try? JSONSerialization.data(withJSONObject: [value], options: []),
              var string = String(data: data, encoding: .utf8),
              string.count >= 2 else {
            return nil
        }
        string.removeFirst()
        string.removeLast()
        return string
    }
}

enum BackupError: LocalizedError {
    case invalidFormat
    case integrity
    case noProfiles

    var errorDescription: String? {
        switch self {
        case .invalidFormat: return "Das Backup hat nicht das erwartete V3-Format."
        case .integrity: return "Die SHA-256-Prüfsumme des Backups stimmt nicht."
        case .noProfiles: return "Das Backup enthält keine gültigen Profile."
        }
    }
}

private extension Array where Element == String {
    mutating func appendUnique(_ value: String) {
        if !contains(value) { append(value) }
    }

    func uniqued() -> [String] {
        var result: [String] = []
        for value in self where !result.contains(value) {
            result.append(value)
        }
        return result
    }
}
