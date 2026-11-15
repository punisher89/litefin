# Litefin — webOS 6 Normal, r5

[Download the ready-to-install r5 IPK](https://github.com/punisher89/litefin/raw/refs/heads/builds/achievement-badges-webos6-normal/Litefin-2.0.300-webOS-Normal-r5.ipk)

- App ID: `org.litefin.app`
- Internal version: `2.0.300`; build revision: `r5`
- Build tier: Normal, intended for webOS 6
- Source: [`5ad95e71dd7c36119e3cff315c472c73294cc5fc`](https://github.com/punisher89/litefin/commit/5ad95e71dd7c36119e3cff315c472c73294cc5fc)
- Changes: [PR #4](https://github.com/punisher89/litefin/pull/4)
- Build: `npm run package:webos-normal`

## Features

- Native Litefin Achievements component in the shared DOM, with Litefin focus,
  scrolling, modal trapping and navigation state. No iframe or remotely loaded
  frontend scripts. All ten original plugin tabs are bundled locally.
- Test notification button styled with the page; uses the synthetic toast,
  without awarding achievements or changing profile data.
- Isolated achievement translation markers prevent Litefin from overwriting
  plugin text or child controls. Bundled Russian core UI and English fallback;
  custom server translations remain supported. Default language follows Litefin.
- Technical quality tags come from server-rendered poster artwork. No added
  client technical stack on Home, Continue Watching, Next Up or large detail
  posters. Movie/series detail presentation is restored to before r4.
  Enable Jellyfin-Enhanced Native poster tags on the server/user for these
  labels; ordinary Jellyfin Web JS overlays do not run in Litefin.
- Community scores on Home, Continue Watching and Next Up posters.
- All six rarity labels are localized in badge cards, equipped cards,
  showcase cards, pinned goals, recent unlocks and badge tooltips.
- Explicit TMDB scores beneath Discover posters.
- Cast ages now/at death, a deceased marker, and age at filming when a real
  production date exists. Otherwise it says At release; dates are not invented.
- Confirmed premiere, theatrical and digital dates on movie/series details.
  Optional Jellyfin-Enhanced TMDB metadata fills release categories when configured.

The AchievementBadges server plugin is still required for its backend API.
Jellyfin-Enhanced is optional for batched cast facts and TMDB release dates;
standard Jellyfin/Seerr metadata is used when available. Unknown dates are omitted.

Validation: 1,135 tests passed, ESLint passed, and actual compiled components
were exercised in Chromium 79 against a mock API, including all ten tabs,
zero iframes, native directional/Enter/modal navigation, synthetic notification,
Russian labels surviving global DOM translation, six localized rarity levels across badge/equipped/showcase/pinned cards,
server image tags preserved without added technical overlays, poster metadata, actor ages, release dates surviving hero refresh, and teardown including temporary attachment URL cleanup.
LG hardware, virtual keyboard and live server operations still need device validation.
Global achievement overlays over the video player are not part of the page integration.

The MIT-licensed bundled achievement renderer and Material Icons font notices
are included in the IPK's `assets/licenses` folder. SHA-256 hashes for this and
previous revisions are in `SHA256SUMS`. Previous r1/r2/r3/r4 packages are retained here.
