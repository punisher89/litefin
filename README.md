# Litefin — Achievement Badges build for webOS 6 Normal

[Download the ready-to-install IPK](https://github.com/punisher89/litefin/raw/refs/heads/builds/achievement-badges-webos6-normal/Litefin-2.0.300-webOS-Normal-r2.ipk)

- Package: `Litefin-2.0.300-webOS-Normal-r2.ipk`
- App ID: `org.litefin.app`
- Version: `2.0.300`
- Build revision: `r2`
- Build tier: Normal, intended for webOS 6
- Source: [`8f5b4a2a9145ac1551a3a619d0038f74f05b0953`](https://github.com/punisher89/litefin/commit/8f5b4a2a9145ac1551a3a619d0038f74f05b0953)
- Source changes: [PR #4](https://github.com/punisher89/litefin/pull/4)
- Command: `npm run package:webos-normal`

Install AchievementBadges on your Jellyfin server to use the Achievements page.
This test build passed 1,132 tests and frontend checks in Chromium 79 with a mock API.
It still requires validation on an LG TV and a live Jellyfin server.
The new page uses the installed plugin's UI. Global player badge overlays are not included.

The SHA-256 checksum is recorded in `SHA256SUMS`.

## r2 changes

- Removed Open achievements and Try again from the toolbar.
- Added Test notification using the upstream synthetic Rare toast, with no badge/profile mutation.
- Automatically focuses the page. Down/Right from the toolbar enters the plugin controls.
- Smooth focus scrolling and eased Magic Remote wheel input, respecting reduced-motion preferences.
- Verified in Chromium 79 with the actual page module and upstream plugin scripts against a mock API.
