import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const assert=(value,message)=>{if(!value)throw new Error(message);};

const required=[
  "ios/project.yml",
  "ios/ImposterGames/App/ImposterGamesApp.swift",
  "ios/ImposterGames/App/RootView.swift",
  "ios/ImposterGames/Models/ContentModels.swift",
  "ios/ImposterGames/Models/GameDefinition.swift",
  "ios/ImposterGames/Services/ContentRepository.swift",
  "ios/ImposterGames/Services/CharadesMotionController.swift",
  "ios/ImposterGames/Services/HapticsService.swift",
  "ios/ImposterGames/Features/Home/HomeView.swift",
  "ios/ImposterGames/Features/Charades/CharadesView.swift",
  "ios/ImposterGames/Features/Charades/CharadesGameModel.swift",
  "ios/ImposterGames/Features/Placeholder/GamePlaceholderView.swift",
  "ios/ImposterGamesTests/ContentRepositoryTests.swift",
  "ios/scripts/sync-content.sh",
  ".github/workflows/ios-build.yml"
];
for(const file of required)assert(fs.existsSync(path.join(root,file)),"Missing iOS preparation file: "+file);

const forbidden=[
  "ios/ImposterGames/Core/Models.swift",
  "ios/ImposterGames/Core/ContentRepository.swift",
  "ios/ImposterGames/Core/NativeHaptics.swift",
  "ios/ImposterGames/Core/TiltDetector.swift",
  "ios/ImposterGames/Features/HomeView.swift",
  "ios/ImposterGames/Features/CharadesView.swift",
  "ios/ImposterGames/Features/GamePlaceholderView.swift",
  ".github/workflows/ios.yml",
  ".github/workflows/ios-ipa.yml"
];
for(const file of forbidden)assert(!fs.existsSync(path.join(root,file)),"Duplicate iOS scaffold remains: "+file);

const project=read("ios/project.yml");
assert(!project.includes("PRODUCT_NAME: Imposter Games"),"PRODUCT_NAME must match target name so XCTest can resolve TEST_HOST");
assert(project.includes("ImposterGames/Resources/Content"),"Synced production content resource folder missing");

const swiftFiles=required.filter(x=>x.endsWith(".swift")).map(read).join("\n");
assert(!/WKWebView|SFSafariViewController/.test(swiftFiles),"Native iOS source contains a web wrapper");
assert(swiftFiles.includes("CMMotionManager"),"Native Core Motion integration missing");
assert(swiftFiles.includes("motion?.gravity.z"),"Signed native gravity direction missing");
assert(swiftFiles.includes("UIImpactFeedbackGenerator")||swiftFiles.includes("CHHapticEngine"),"Native iOS haptics missing");
assert(swiftFiles.includes("cooldownDuration: CFTimeInterval = 3.0"),"Native Scharade 3-second cooldown missing");
assert(swiftFiles.includes("submitTouchDecision"),"Native touch cooldown path missing");

for(const file of ["circa-questions.json","classic-words.json","who-am-i.json","charades.json"]){
  const rootData=read("data/"+file);
  const iosData=read("ios/ImposterGames/Resources/Content/"+file);
  assert(rootData===iosData,"iOS content is out of sync: "+file);
}

const charades=JSON.parse(read("data/charades.json"));
assert(charades.count===300&&charades.items.length===300,"Shared Scharade data count mismatch");
assert(new Set(charades.items.map(x=>x.id)).size===300,"Shared Scharade IDs are not unique");
assert(new Set(charades.items.map(x=>String(x.term).toLocaleLowerCase("de-DE"))).size===300,"Shared Scharade terms are not unique");

const workflow=read(".github/workflows/ios-build.yml");
assert(workflow.includes("runs-on: macos-26"),"iOS CI must use macOS runner");
assert(workflow.includes("xcodegen generate"),"iOS CI XcodeGen step missing");
assert(workflow.includes("xcodebuild"),"iOS xcodebuild step missing");
assert(workflow.includes("signed_ipa"),"Manual signed IPA option missing");
assert(workflow.includes("-exportArchive"),"Signed IPA export step missing");
assert(workflow.includes("upload-artifact@v7"),"iOS artifact upload missing");

console.log("iOS readiness validation OK · one native scaffold · shared production data · motion · haptics · signed IPA workflow");
