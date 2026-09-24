import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const assert=(value,message)=>{if(!value)throw new Error(message);};

const required=[
  "ios/project.yml",
  "ios/ImposterGames/App/ImposterGamesApp.swift",
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
for(const file of required)assert(fs.existsSync(path.join(root,file)),"Missing iOS preparation file: "+file);

const project=read("ios/project.yml");
for(const file of ["games.json","circa-questions.json","classic-words.json","who-am-i.json","charades.json"]){
  assert(project.includes("../data/"+file),"Xcode project does not share production data: "+file);
}
assert(!project.toLowerCase().includes("wkwebview"),"iOS project must not use WKWebView");

const swiftFiles=required.filter(x=>x.endsWith(".swift")).map(read).join("\n");
assert(!/WKWebView|SFSafariViewController/.test(swiftFiles),"Native iOS source contains a web wrapper");
assert(swiftFiles.includes("CMMotionManager"),"Native Core Motion integration missing");
assert(swiftFiles.includes("motion.gravity.z"),"Signed native gravity direction missing");
assert(swiftFiles.includes("CHHapticEngine"),"Native Core Haptics integration missing");

const charades=JSON.parse(read("data/charades.json"));
assert(charades.count===300&&charades.items.length===300,"Shared Scharade data count mismatch");
assert(new Set(charades.items.map(x=>x.id)).size===300,"Shared Scharade IDs are not unique");
assert(new Set(charades.items.map(x=>String(x.term).toLocaleLowerCase("de-DE"))).size===300,"Shared Scharade terms are not unique");

const buildWorkflow=read(".github/workflows/ios.yml");
assert(buildWorkflow.includes("runs-on: macos-26"),"iOS CI must use macOS runner");
assert(buildWorkflow.includes("xcodegen generate"),"iOS CI XcodeGen step missing");
assert(buildWorkflow.includes("build-for-testing"),"iOS CI compile/test-bundle step missing");
assert(buildWorkflow.includes("CODE_SIGNING_ALLOWED=NO"),"Unsigned CI build guard missing");

const ipaWorkflow=read(".github/workflows/ios-ipa.yml");
assert(ipaWorkflow.includes("xcodebuild")&&ipaWorkflow.includes("-exportArchive"),"Signed IPA export workflow missing");
assert(ipaWorkflow.includes("apple-actions/import-codesign-certs@v7"),"Signing certificate import missing");
assert(ipaWorkflow.includes("IOS_PROVISIONING_PROFILE_BASE64"),"Provisioning profile secret missing");
assert(ipaWorkflow.includes("upload-artifact@v7"),"IPA artifact upload missing");

console.log("iOS readiness validation OK · native SwiftUI · shared production data · Core Motion · Core Haptics · IPA workflow");
