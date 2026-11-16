# Native achievements and card metadata (webOS 6 Normal)

Open **Achievements** in Litefin's sidebar or `#/achievements`.

The page is a Litefin `Page` containing `AchievementBadgesPanel`, a normal
`Component`. It mounts into Litefin's DOM and uses its FocusManager, modal
traps, NavigationState and ScrollController. There is no iframe, separate
browser context, remote JavaScript bootstrap, or second login. The test
notification button uses the page's button style and the original synthetic
Rare toast; it never awards a badge or changes profile data.

The complete vanilla-JS page, friends/messaging and notification renderers
are bundled from AchievementBadges commit
`8939cd412d28a8d3ba0b54fc338c21847e83e6bd`, with their MIT license under
`src/plugins/achievement-badges/vendor/LICENSE.txt`. The standalone bootstrap
is replaced by the Component mount lifecycle. Their DOM/storage/scheduling
adapters are scoped to that component and removed on navigation. Script
updates now ship with Litefin instead of downloading the server's frontend
on every visit. All ten original tabs, user settings, feature/privacy rules,
shop/loadout, profile cards and social functionality retain the plugin API.

**AchievementBadges must still be installed on the Jellyfin server** to
calculate/store awards and provide its API, translations and media assets.
The native page does not require Jellyfin Web injection. Global overlays in
Litefin's video player are outside the page integration.

Current session authentication stays in headers; base URLs such as
`/jellyfin` and custom server headers are preserved. UI preferences keep the
same server/user namespace as previous Litefin builds. User avatars use
header-authenticated blobs. Local Material Icons include their Apache 2.0
license in `src/assets/licenses/MaterialIcons-LICENSE.txt`.

Chromium 79 fallbacks convert OKLCH literals to sRGB, expand inset positioning
and supply older flex spacing. Some advanced decorative effects still depend
on the TV engine. The Classic/Revamp choice, language and reduced-motion
settings remain available. Achievement DOM translation markers use their own
namespace so the global Litefin translator cannot replace text or remove child
controls. Default language follows Litefin; explicit per-user plugin language
choices still apply. English fallbacks and Russian core UI strings are bundled;
server custom translations override them. Upstream-only strings without a Russian
translation fall back to English. The test button and metadata labels are localized.

## Posters and details

Home rows use Jellyfin-Enhanced's server-rendered image variants, following the
supplied 2.0.150 IPK. The server draws the complete metadata, logos, flags and
layout into the image using its own settings. Litefin no longer reconstructs a
subset from tag-data, downloads badge palettes/logos or adds a separate score star.

Each Home page reads `/JellyfinEnhanced/public-config` and the signed-in user's
`/JellyfinEnhanced/user-settings/{userId}/settings.json` once to check the native
master/user switches. Standard authenticated `/Items` DTO batches refresh image
tags, since companion merged/batch wrappers can bypass Enhanced's DTO filter.
As in 2.0.150, the optional Litefin batch-Latest path is skipped in native mode.
Image hydration batches and deduplicates IDs, preserves playback/user data and
discards late results after teardown or a server/user switch.

Continue Watching uses a signed episode Primary or an available signed wide
Thumb. A Thumb can reuse the native suffix issued for the SAME item's Primary,
retaining the Thumb's own file hash; signatures are never copied between owners.
Horizontal frames, image fit, progress bars and navigation remain in place. A
vertical movie/series Primary is never substituted into a horizontal frame. If
no annotated wide source exists, the normal wide artwork remains. Native episode
screenshots follow 2.0.150's native-image choice. The duplicate client episode
badge is omitted on annotated Resume art; the episode code remains in its subtitle.

Recently Added also hydrates seasons, episode parent posters and signed series
image tags. The complete server native tag and user marker are retained, including
in expanded artwork. The client does not interpret group order, caps, colors or
layout: those belong to the server renderer, so available metadata uses the same
native appearance rather than a client approximation.

Existing Jellyfin-Enhanced native settings continue to apply; no server update or
settings change is required for a server already working with 2.0.150. Litefin
only reads settings. Re-enter Home to reload tags after changing preferences.
Browser-only Jellyfin Web overlays require the plugin's native image mode to
appear in an independent TV client.

Movie/series details (including Discover details) have a native **Awards**
section backed by `/JellyfinEnhanced/awards/movie|tv/{tmdbId}`. It displays confirmed
wins/nominations and expandable rows with award names, year and recipients;
rows can be traversed with the TV remote. Server **Show Awards** must be enabled
and the title needs a TMDB ID. Disabled/unavailable or empty awards are hidden.
The client does not use its own Wikidata/TMDB credentials or invent award facts.
The panel survives hero refresh and releases observers/navigation on exit.

Rarity text uses the same localized labels in badge cards, equipped cards,
showcases, pinned goals, recent unlocks and badge tooltips. API values and
rarity classes remain unchanged for filtering, rewards and colors.

Discover displays explicitly sourced **TMDB** vote averages below its film/TV
posters. Generic Jellyfin community scores are not relabeled as TMDB scores.
Score visibility settings remain respected.

Cast and guest-star posters show age at production when a real filming date
is present. Otherwise they show **At release**, using the exact premiere date
instead of inventing a shooting date. Living actors show their current age;
deceased actors show their age at death and a small dagger. Unknown/invalid
dates are omitted. A posthumous release does not imply a fictional filming age.
Facts are fetched for near-visible cast cards, cached, and batched through
Jellyfin-Enhanced `people/info` when available. Standard Jellyfin person
metadata and Seerr person facts provide fallbacks. No browser TMDB API key
is embedded in the client.

Details pages show confirmed premiere, theatrical and digital release dates.
Seerr detail metadata is preserved when supplied. The optional
`JellyfinEnhanced/tmdb` proxy can fill TMDB release categories using its
server-side TMDB configuration. Region-specific release dates identify their
country; the client uses its Seerr region preference (US fallback). Without
that optional data source, existing confirmed dates still display. A TV air
date or physical-disc release is never substituted for a digital release.

## Validation

Build with `npm run package:webos-normal`; run `npm test` and ESLint on changed
modules. Node tests cover session security, native artwork selection/hydration, card scores, calendar-age
boundaries, deceased/posthumous cases, date validation and TMDB release types.
Browser checks use actual bundled components and original plugin API shapes
in Chromium 79: zero iframes, all ten tabs, native focus/modal trapping,
synthetic notifications, metadata rendering, and teardown without background
polling. Live purchases, messaging/attachments, optional metadata availability
and LG hardware/virtual keyboard still require validation on the target TV.
