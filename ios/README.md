# Native iOS preparation

This directory contains the native SwiftUI foundation for Imposter Games. It is intentionally separate from the production PWA.

## Architecture

- SwiftUI application, no WebView.
- Minimum deployment target: iOS 18.
- Shared game content comes directly from the repository root `data/*.json`.
- Scharade already has a native Core Motion sensor path and native Core Haptics feedback.
- Circa, Classic and Wer bin ich? are wired into the launcher and shared content repository; their native game flows are the next migration step.
- Xcode project files are generated from `project.yml` with XcodeGen and are not committed.

## CI

`.github/workflows/ios.yml` generates the project and compiles the app plus test bundle on a GitHub macOS runner with code signing disabled.

`.github/workflows/ios-ipa.yml` is a manual signed build. Before using it, configure:

Repository variables:
- `IOS_TEAM_ID`
- `IOS_BUNDLE_ID` (default project value is `de.urrevo.impostergames`)

Repository secrets:
- `IOS_CERTIFICATE_BASE64` — base64-encoded Apple `.p12`
- `IOS_CERTIFICATE_PASSWORD`
- `IOS_PROVISIONING_PROFILE_BASE64` — base64-encoded matching `.mobileprovision`

The signed workflow exports an `.ipa` as a GitHub Actions artifact. Use a development or Ad Hoc provisioning profile depending on how the iPhone is registered.

## Local generation on macOS

```bash
brew install xcodegen
cd ios
xcodegen generate
open ImposterGames.xcodeproj
```
