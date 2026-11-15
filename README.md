# Litefin — webOS 6 Normal, r8

[Download the ready-to-install r8 IPK](https://github.com/punisher89/litefin/raw/refs/heads/builds/achievement-badges-webos6-normal/Litefin-2.0.300-webOS-Normal-r8.ipk)

- App ID: `org.litefin.app`
- Internal version: `2.0.300`; build revision: `r8`
- Target: webOS 6 Normal
- Source: [`56eeb64b3794beb51f37ecb848ecfda1d95b5ea3`](https://github.com/punisher89/litefin/commit/56eeb64b3794beb51f37ecb848ecfda1d95b5ea3)
- Changes: [PR #4](https://github.com/punisher89/litefin/pull/4)
- Build: `npm run package:webos-normal`

## Home poster artwork

Recently Added and other Home video rows use actual server-rendered metadata
artwork. Continue Watching keeps its existing image and renders metadata labels
on top when it has no native annotations. Signed Enhanced Primary/Thumb variants take
precedence over ordinary backdrops; expandable posters keep annotated wide
artwork too. Visible cards hydrate image tags through standard authenticated
item endpoints when Litefin batch/merged wrappers bypass the Enhanced DTO filter.
Episode landscape cards resolve signed series thumbnails and preserve spoiler
preferences. Horizontal cards never select a vertical movie/series poster as
a signed fallback. Without an annotated wide image, the normal wide image is
retained. Latest season cards are now hydrated too; portrait episode and season
cards refresh their parent series poster, and the required SeriesPrimaryImageTag
field is explicitly requested. The complete server tag and user marker are retained.

The separate Litefin score star is removed. For Continue Watching, the lightweight overlay uses the read-only Enhanced
`tag-data/{userId}` API: resolution, source, HDR/Dolby Vision, codec, audio/channels,
certification and source-labelled ratings. Pascal/camel-case DTOs are supported.
The exact existing image node, source, fit, dimensions and card geometry stay
unchanged. Existing native annotations are not duplicated. Score privacy applies;
missing fields are omitted. Older plugin versions fall back to actual Jellyfin
media metadata without fictional provider scores.

Jellyfin-Enhanced **Native poster tags** is required for annotations baked into
server images on other rows, independently of the new Continue Watching overlay.
Browser-only Jellyfin Web overlays cannot run in Litefin.

## Details and achievements

- Native collapsible Awards section on movie/series and Discover details:
  confirmed wins, nominations, years and recipients, traversable with a TV remote.
  Uses the Jellyfin-Enhanced awards API; enable **Show Awards** on the server.
  The title needs a TMDB ID. Empty/disabled/unavailable results stay hidden.
- Identified TMDB scores below Discover posters.
- Cast ages now/at death, deceased marker, production age when known;
  otherwise explicitly At release. Unknown dates are omitted.
- Confirmed premiere, theatrical and digital dates, optionally enriched by
  the Enhanced TMDB proxy. No physical release is substituted for digital.
- Native Achievements page with all ten tabs, shared focus/scrolling/modal
  handling and a synthetic notification test. No iframe or remote frontend scripts.
- Scoped translation markers, Russian core UI, custom server translation
  support, and all six localized rarity levels across cards and tooltips.
  Upstream strings without Russian translations fall back to English.

The AchievementBadges server plugin remains required for its backend API.
Global achievement overlays over the video player are outside this page work.

Validation: 1,148 Node tests and ESLint pass. Actual compiled components checked
in Chromium 79: ten tabs, native focus and modal trapping, synthetic notification,
six translated rarities, hydration of signed movie and series Thumb URLs from
plain batch-row data, resume overlay with image node, URL, inline style and dimensions unchanged,
horizontal fallback without portrait substitution,
latest-season/episode parent poster hydration, absence of the separate rating star, awards expansion and
D-pad row navigation, age/date rendering, refresh persistence and teardown.
The IPK was inspected for production component/API/locale markers. Physical LG
hardware and live server operations still require device validation.

Bundled MIT AchievementBadges and Apache Material Icons notices are included.
SHA-256 hashes are in `SHA256SUMS`; previous r1–r7 packages are retained.
