# Litefin — webOS 6 Normal, r12 (movie web-tag trial)

[Download ready-to-install r12 IPK](https://github.com/punisher89/litefin/raw/refs/heads/builds/achievement-badges-webos6-normal/Litefin-2.0.300-webOS-Normal-r12.ipk)

- App ID: `org.litefin.app`
- Internal version: `2.0.300`; build revision: `r12`
- Target: webOS 6 Normal / Chromium 79
- Source: [`165adbbc4aa39aa8fd79ac312a6d43fbd52f03dd`](https://github.com/punisher89/litefin/commit/165adbbc4aa39aa8fd79ac312a6d43fbd52f03dd)
- Changes: [PR #4](https://github.com/punisher89/litefin/pull/4)
- Build: `npm run package:webos-normal`

## Movie metadata without a server patch

This trial changes only movies in Continue Watching. Adapted original
Jellyfin-Enhanced web renderers draw labels on their ordinary wide artwork:
quality detection and colors, genre icons, audio-language flags, age ratings,
community/critic ratings and MDBList provider logos/scores when enabled.
The movie keeps its original image node, URL, fit, frame and progress while the
labels load. A movie with only a Backdrop also receives labels; there is no need
to put a vertical Primary poster into its horizontal frame.

Episodes retain the working r11 server-native images. Other Home rows, movie
and series details, awards and achievements retain their existing behavior.
No server plugin modification or manual reapplication after plugin auto-updates
is required. Native master/user switches still control feature availability.

The client reads public/current-user settings and user-scoped tag-data in
nearby-card batches. It reads optional tag-styles and MDBList ratings APIs.
Settings are never written; tag-data POST is a read-only lookup. Missing or
filtered data is not replaced with unfiltered raw facts. Observer/component/CSS
state is released on Home exit. No extra focus targets or pointer handlers are
added. Renderer code is bundled; no remote scripts are downloaded or executed.

Group visibility/scopes, corners, group order/caps, quality category controls and
rating source selection are adapted to the movie overlay. Re-enter Home after
changing personal preferences. This is web rendering: native band/caption
layouts, per-item native looks and native-only extra groups are not reproduced.
Quality/audio detection may differ from native images. Audio flags follow the
original web renderer (up to three). MDBList scores use its original web
normalized 0–100 formatting, e.g. 81 rather than 8.1; generic community ratings
keep the original community/critic renderer. The visual match with the user's
native server images still needs evaluation on the actual TV.

## Existing details and achievements

- Native collapsible Awards section on movie/series and Discover details,
  confirmed wins/nominations, years and recipients with remote navigation.
  Requires the Enhanced awards API, Show Awards and a TMDB ID.
- TMDB ratings below Discover posters.
- Cast ages now/at death, deceased marker and production age when known;
  otherwise explicitly At release. Unknown dates are omitted.
- Confirmed premiere, theatrical and digital dates; optional Enhanced TMDB proxy.
- Native Achievements page with ten tabs, shared focus/scrolling/modal handling
  and a synthetic notification test. No iframe or remote frontend scripts.
- Russian core UI, server custom translations and six localized rarity levels.
  Upstream strings without Russian translations fall back to English.

The AchievementBadges server backend remains required. Global achievement
notifications over the video player are outside this page work.

## Validation and source notices

All 1,155 Node tests and ESLint pass. Compiled components exercised in Chromium
79 with a mock API: original web quality labels, three loaded visible MDBList
logos, movie artwork-node/URL preservation, horizontal frames, Backdrop-only
movies, series remaining native, no extra focus targets, personal group/corner/
source changes after re-entry, teardown without subsequent requests, all ten
achievement tabs, focus/modal handling, notification, translated rarities,
awards and actor ages/release dates. The production IPK was extracted and
checked for app/version, movie/native code paths and included GPL notices.
Physical LG hardware and the user's live server were not tested here.

Adapted Jellyfin-Enhanced web renderers are GPL-3.0; their source and change
notice are in src/plugins/jellyfin-enhanced-web, with notices also in the IPK.
Existing MIT AchievementBadges and Apache Material Icons notices remain included.
SHA-256 hashes are in `SHA256SUMS`; earlier r1–r11 packages are retained.
