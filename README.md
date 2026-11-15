# Litefin — webOS 6 Normal, r10

[Download the ready-to-install r10 IPK](https://github.com/punisher109/litefin/raw/refs/heads/builds/achievement-badges-webos6-normal/Litefin-2.0.300-webOS-Normal-r10.ipk)

- App ID: `org.litefin.app`
- Internal version: `2.0.300`; build revision: `r10`
- Target: webOS 6 Normal
- Source: [`b4fb53672e319274906ec9465044e336c222b874`](https://github.com/punisher109/litefin/commit/b4fb53672e319274906ec9465044e336c222b874)
- Changes: [PR #4](https://github.com/punisher109/litefin/pull/4)
- Build: `npm run package:webos-normal`

## Personal metadata settings

Continue Watching now reads Enhanced public-config and the current user's
settings.json once per Home page instance. Personal values override public
defaults; null inherits. Supported controls include the native master/user
switches; quality, genre, language, rating and age groups; Continue Watching
and item-type scopes; four corner positions/Corners profile off slots; order,
caps, scale and spacing; quality-category switches/order; rating sources,
minimum score and score color; audio/subtitle language display and priorities.
Band/caption layouts are not replicated by the client overlay.

To configure, use the SAME account in Jellyfin Web as in Litefin. Open the
**Enhanced Panel** from the drawer, or **Jellyfin Enhanced** in the Jellyfin 12
avatar menu, then **Media Tags**. Choose groups and corner positions, save,
and reopen Litefin's Home page. Server/user native tag switches must permit
the feature. The client only reads settings; no settings are written to the server.

Browser checks also change user settings and recreate Home: disabled groups
vanish, rating source selection changes, groups move to chosen corners and
settings are fetched once again. Existing image nodes and URLs stay unchanged.

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
Resume badges now use the installed plugin's own rating-source PNG logos
(IMDb, TMDB, Rotten Tomatoes, etc.), numeric scores on dark pills, and its quality
palette read as color data from the public quality resource. No downloaded
JavaScript is executed and no Enhanced script/logo assets are bundled. Composite
audio badges keep matching source labels/colors; rating logos have fixed inline
sizing and opacity independent of card-artwork CSS. Existing episode-code badges
keep their space.

The exact existing image node, source, fit, dimensions and card geometry stay
unchanged. Existing native annotations are not duplicated. Score privacy applies;
missing fields are omitted. Older plugin versions fall back to actual Jellyfin
media metadata without fictional provider scores.

Jellyfin-Enhanced **Native poster tags** is required for annotations baked into
server images on other rows, while the Continue Watching overlay follows the same master/user visibility choices.
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

Validation: 1,158 Node tests and ESLint pass. Actual compiled components checked
in Chromium 79: ten tabs, native focus and modal trapping, synthetic notification,
six translated rarities, hydration of signed movie and series Thumb URLs from
plain batch-row data, resume overlay with image node, URL, inline style and dimensions unchanged,
server palette extraction, actual plugin PNG loading, visible 14px rating logos,
horizontal fallback without portrait substitution,
latest-season/episode parent poster hydration, absence of the separate rating star, awards expansion and
D-pad row navigation, age/date rendering, refresh persistence and teardown.
The IPK was inspected for production component/API/locale markers. Physical LG
hardware and live server operations still require device validation.

Bundled MIT AchievementBadges and Apache Material Icons notices are included.
SHA-256 hashes are in `SHA256SUMS`; previous r1–r9 packages are retained.
