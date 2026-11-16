# Litefin — webOS 6 Normal, r11

[Download the ready-to-install r11 IPK](https://github.com/punisher89/litefin/raw/refs/heads/builds/achievement-badges-webos6-normal/Litefin-2.0.300-webOS-Normal-r11.ipk)

- App ID: `org.litefin.app`
- Internal version: `2.0.300`; build revision: `r11`
- Target: webOS 6 Normal
- Source: [`25f1923b65e76ffe7ce3b278b6142d6bef2c3dcd`](https://github.com/punisher89/litefin/commit/25f1923b65e76ffe7ce3b278b6142d6bef2c3dcd)
- Changes: [PR #4](https://github.com/punisher89/litefin/pull/4)
- Build: `npm run package:webos-normal`

## Original native metadata path restored

Home now follows the supplied working 2.0.150 IPK: Jellyfin-Enhanced draws the
metadata into its server-rendered images. The hand-built Continue Watching
layer, tag-data parsing, badge palette/logo downloads and client interpretation
of groups/corners have been removed. Server metadata determines the actual
appearance and available groups, including those the client reconstruction missed.

The client checks the native master/user switches once per Home page instance.
Standard authenticated Items DTO batches refresh signed image tags; the optional
Litefin batch-Latest path is skipped in native mode, matching 2.0.150. IDs are
batched/deduplicated, playback state is retained and stale session/page completions
are discarded. Seasons and parent series posters are hydrated too.

Continue Watching uses signed episode Primary or available wide Thumb images,
retaining the complete native signature/user marker. A Thumb may reuse a native
suffix issued for the SAME item's Primary, preserving its own image file hash.
The existing horizontal frame, fit, progress and remote navigation are preserved;
vertical movie posters are never fitted inside wide cards. If no annotated wide
source exists, normal wide artwork remains. Duplicate client episode badges
are omitted on native Resume artwork; the episode code stays in the subtitle.

No Jellyfin Server/plugin update or settings change is required for a server
already working with 2.0.150. Existing Enhanced native settings continue to apply.
Litefin reads settings only. Re-enter Home after changing server preferences.
A browser-only Web overlay still requires Enhanced's native image mode for use
in an independent TV client.

## Details and achievements

- Native collapsible Awards section for movie/series and Discover details;
  confirmed wins/nominations, years and recipients with remote navigation.
  Uses the Enhanced awards API and requires Show Awards and a TMDB ID.
- TMDB ratings below Discover posters.
- Cast ages now/at death, deceased marker and production age when known;
  otherwise explicitly At release. Unknown dates are omitted.
- Confirmed premiere, theatrical and digital dates; optional Enhanced TMDB proxy.
- Native Achievements page with all ten tabs, shared focus/scrolling/modal
  handling and a synthetic notification test. No iframe or remote frontend scripts.
- Russian core UI, custom server translations and six localized rarity levels.
  Upstream strings without Russian translations fall back to English.

The AchievementBadges server backend remains required. Global achievement
overlays over the video player are outside this page work.

## Validation

All 1,148 Node tests and ESLint pass. Actual compiled components were checked in
Chromium 79 with a mock API: native movie Thumb/episode Primary URLs, same-owner
native Thumb suffix, standard DTO hydration, horizontal frames, no manual
metadata layer or tag-data/palette/logo requests, ten achievement tabs, native
focus and modal trap, synthetic notification, six translated rarities, awards
expansion and D-pad navigation, actor ages, release dates and teardown.
The production IPK was extracted and checked for app/version, native API markers
and absence of the removed metadata layer. Physical LG hardware and the user's
live server have not been tested in this environment.

Bundled MIT AchievementBadges and Apache Material Icons notices are included.
SHA-256 hashes are in `SHA256SUMS`; previous r1–r10 packages are retained.
