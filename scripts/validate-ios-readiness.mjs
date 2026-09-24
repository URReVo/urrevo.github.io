import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const assert=(value,message)=>{if(!value)throw new Error(message);};

const required=[
  "ios/project.yml",
  "ios/ImposterGames/App/ImposterGamesApp.swift",
  "ios/ImposterGames/App/RootView.swift",
  "ios/ImposterGames/Models/AppModels.swift",
  "ios/ImposterGames/Models/ContentModels.swift",
  "ios/ImposterGames/Models/GameDefinition.swift",
  "ios/ImposterGames/Services/AppStore.swift",
  "ios/ImposterGames/Services/GameStorage.swift",
  "ios/ImposterGames/Services/ContentRepository.swift",
  "ios/ImposterGames/Services/CharadesMotionController.swift",
  "ios/ImposterGames/Services/HapticsService.swift",
  "ios/ImposterGames/Services/SoundService.swift",
  "ios/ImposterGames/Shared/GameComponents.swift",
  "ios/ImposterGames/Features/Home/HomeView.swift",
  "ios/ImposterGames/Features/Home/PresetEditorView.swift",
  "ios/ImposterGames/Features/Profile/ProfilesView.swift",
  "ios/ImposterGames/Features/Stats/StatsView.swift",
  "ios/ImposterGames/Features/Sessions/SessionDetailView.swift",
  "ios/ImposterGames/Features/Settings/SettingsView.swift",
  "ios/ImposterGames/Features/Settings/BackupDocument.swift",
  "ios/ImposterGames/Features/Circa/CircaView.swift",
  "ios/ImposterGames/Features/Circa/CircaGameModel.swift",
  "ios/ImposterGames/Features/Classic/ClassicView.swift",
  "ios/ImposterGames/Features/Classic/ClassicGameModel.swift",
  "ios/ImposterGames/Features/WhoAmI/WhoAmIView.swift",
  "ios/ImposterGames/Features/WhoAmI/WhoAmIGameModel.swift",
  "ios/ImposterGames/Features/Charades/CharadesView.swift",
  "ios/ImposterGames/Features/Charades/CharadesGameModel.swift",
  "ios/ImposterGamesTests/ContentRepositoryTests.swift",
  "ios/scripts/sync-content.sh",
  ".github/workflows/ios-build.yml"
];
for(const file of required)assert(fs.existsSync(path.join(root,file)),"Missing native parity file: "+file);

const forbidden=[
  "ios/ImposterGames/Core/Models.swift",
  "ios/ImposterGames/Core/ContentRepository.swift",
  "ios/ImposterGames/Core/NativeHaptics.swift",
  "ios/ImposterGames/Core/TiltDetector.swift",
  "ios/ImposterGames/Features/HomeView.swift",
  "ios/ImposterGames/Features/CharadesView.swift",
  "ios/ImposterGames/Features/GamePlaceholderView.swift",
  "ios/ImposterGames/Features/Placeholder/GamePlaceholderView.swift",
  ".github/workflows/ios.yml",
  ".github/workflows/ios-ipa.yml"
];
for(const file of forbidden)assert(!fs.existsSync(path.join(root,file)),"Obsolete iOS scaffold remains: "+file);

const project=read("ios/project.yml");
assert(!project.includes("PRODUCT_NAME: Imposter Games"),"PRODUCT_NAME must match target name so XCTest can resolve TEST_HOST");
assert(project.includes("ImposterGames/Resources/Content"),"Synced production content resource folder missing");
assert(project.includes("buildPhase: resources"),"Production JSON must be copied into the iOS app bundle as resources");

const swiftFiles=required.filter(x=>x.endsWith(".swift")).map(read).join("\n");
assert(!/WKWebView|SFSafariViewController/.test(swiftFiles),"Native iOS source contains a web wrapper");
assert(!swiftFiles.includes("GamePlaceholderView"),"Native launcher must not contain game placeholders");
assert(swiftFiles.includes("CircaView(repository:"),"Native Circa route missing");
assert(swiftFiles.includes("ClassicView(repository:"),"Native Classic route missing");
assert(swiftFiles.includes("WhoAmIView(repository:"),"Native Who Am I route missing");
assert(swiftFiles.includes("CharadesView(repository:"),"Native Scharade route missing");
assert(swiftFiles.includes("CMMotionManager"),"Native Core Motion integration missing");
assert(swiftFiles.includes("motion?.gravity.z"),"Signed native gravity direction missing");
assert(swiftFiles.includes("import CoreHaptics")&&swiftFiles.includes("CHHapticEngine"),"Native Core Haptics integration missing");
assert(swiftFiles.includes("UIImpactFeedbackGenerator"),"UIKit haptics fallback missing");
assert(swiftFiles.includes("cooldownDuration: CFTimeInterval = 3.0"),"Native Scharade 3-second cooldown missing");
assert(swiftFiles.includes("confirmationDuration: CFTimeInterval = 0.18"),"Native Scharade 180-ms confirmation missing");
assert(swiftFiles.includes("submitTouchDecision"),"Native touch cooldown path missing");
assert(swiftFiles.includes("imposter-games-backup"),"Native Backup V3 format missing");
assert(swiftFiles.includes("formatVersion: 3"),"Native Backup V3 version missing");
assert(swiftFiles.includes("SHA256.hash"),"Native SHA-256 backup integrity missing");
assert(swiftFiles.includes("ProfilesView(store:"),"Native profiles tab missing");
assert(swiftFiles.includes("StatsView(store:"),"Native stats tab missing");
assert(swiftFiles.includes("SettingsView(store:"),"Native settings tab missing");
assert(swiftFiles.includes("PresetEditorView"),"Native preset editor missing");
assert(swiftFiles.includes("SessionDetailView"),"Native session details missing");

for(const file of ["circa-questions.json","classic-words.json","who-am-i.json","charades.json"]){
  const rootData=read("data/"+file);
  const iosData=read("ios/ImposterGames/Resources/Content/"+file);
  assert(rootData===iosData,"iOS content is out of sync: "+file);
}

const circa=JSON.parse(read("data/circa-questions.json"));
const classic=JSON.parse(read("data/classic-words.json"));
const who=JSON.parse(read("data/who-am-i.json"));
const charades=JSON.parse(read("data/charades.json"));
assert(circa.count===520&&circa.items.length===520,"Shared Circa data count mismatch");
assert(classic.count===250&&classic.items.length===250,"Shared Classic data count mismatch");
assert(who.count===275&&who.items.length===275,"Shared Who Am I data count mismatch");
assert(charades.count===300&&charades.items.length===300,"Shared Scharade data count mismatch");
assert(new Set(circa.items.map(x=>x.qid)).size===520,"Shared Circa QIDs are not unique");
assert(new Set(classic.items.map(x=>x.wid)).size===250,"Shared Classic WIDs are not unique");
assert(new Set(who.items.map(x=>x.id)).size===275,"Shared Who Am I IDs are not unique");
assert(new Set(charades.items.map(x=>x.id)).size===300,"Shared Scharade IDs are not unique");

const workflow=read(".github/workflows/ios-build.yml");
assert(workflow.includes("runs-on: macos-26"),"iOS CI must use macOS runner");
assert(workflow.includes("xcodegen generate"),"iOS CI XcodeGen step missing");
assert(workflow.includes("Run unit tests")&&workflow.includes("test-without-building"),"Native XCTest execution missing from iOS CI");
assert(workflow.includes("xcrun simctl bootstatus"),"iOS CI must boot a real simulator before XCTest");
assert(workflow.includes("unsigned-device-ipa:"),"Unsigned iPhone sideload job missing");
assert(workflow.includes("generic/platform=iOS"),"Unsigned sideload build must target a real iPhone device SDK");
assert(workflow.includes("ImposterGames-iOS-Sideload"),"Unsigned sideload IPA artifact missing");
assert(workflow.includes("signed_ipa"),"Manual signed IPA option missing");
assert(workflow.includes("-exportArchive"),"Signed IPA export step missing");
assert(workflow.includes("upload-artifact@v7"),"iOS artifact upload missing");

console.log("iOS parity validation OK · four native games · profiles · sessions · stats · presets · Backup V3 · Core Motion · Core Haptics · XCTest · sideload IPA");
