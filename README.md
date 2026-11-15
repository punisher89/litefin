# Litefin — webOS 6 Normal, r3

[Download the ready-to-install r3 IPK](https://github.com/punisher89/litefin/raw/refs/heads/builds/achievement-badges-webos6-normal/Litefin-2.0.300-webOS-Normal-r3.ipk)

- App ID: `org.litefin.app`
- Internal version: `2.0.300`; build revision: `r3`
- Build tier: Normal, intended for webOS 6
- Source: [`f10a03dbabd71841090dcbf5323ce2a7fcd4b967`](https://github.com/punisher89/litefin/commit/f10a03dbabd71841090dcbf5323ce2a7fcd4b967)
- Changes: [PR #4](https://github.com/punisher89/litefin/pull/4)
- Build: `npm run package:webos-normal`

## Features

- Native Litefin Achievements component in the shared DOM, with Litefin focus,
  scrolling, modal trapping and navigation state. No iframe or remotely loaded
  frontend scripts. All ten original plugin tabs are bundled locally.
- Test notification button styled with the page; uses the synthetic toast,
  without awarding achievements or changing profile data.
- Quality and community scores on Home, Continue Watching and Next Up posters.
  A series quality label represents an episode (other episodes may differ).
- Explicit TMDB scores beneath Discover posters.
- Cast ages now/at death, a deceased marker, and age at filming when a real
  production date exists. Otherwise it says At release; dates are not invented.
- Confirmed premiere, theatrical and digital dates on movie/series details.
  Optional Jellyfin-Enhanced TMDB metadata fills release categories when configured.

The AchievementBadges server plugin is still required for its backend API.
Jellyfin-Enhanced is optional for batched cast facts and TMDB release dates;
standard Jellyfin/Seerr metadata is used when available. Unknown dates are omitted.

Validation: 1,133 tests passed, ESLint passed, and actual compiled components
were exercised in Chromium 79 against a mock API, including all ten tabs,
zero iframes, native directional/Enter/modal navigation, synthetic notification,
poster metadata, actor ages, release dates surviving hero refresh, and teardown.
LG hardware, virtual keyboard and live server operations still need device validation.
Global achievement overlays over the video player are not part of the page integration.

The MIT-licensed bundled achievement renderer and Material Icons font notices
are included in the IPK's `assets/licenses` folder. SHA-256 hashes for this and
previous revisions are in `SHA256SUMS`. Previous r1/r2 packages are retained here.
