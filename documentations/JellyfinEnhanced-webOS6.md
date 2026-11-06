# Jellyfin Enhanced metadata in Litefin (LG webOS 6 Normal)

Ported from [feature/game-center-notifications](https://github.com/punisher89/litefin/tree/feature/game-center-notifications) to the existing AchievementBadges branch, without merging the other feature branch or touching its unrelated work.

## Requirements
- LG webOS 6, build tier **Normal**.
- Jellyfin server with [Jellyfin-Enhanced](https://github.com/punisher89/Jellyfin-Enhanced) installed and its native poster tag API enabled.
- Per-user Jellyfin Enhanced options for quality/ratings tags as applicable. The client reads public config, per-user settings and authenticated `/JellyfinEnhanced/tag-data/{userId}`.
- Optional Jellyfin Enhanced `/JellyfinEnhanced/people/info` for actor/crew ages.

## What the TV renders
- Shared poster render path: 4K/1080p, HDR/Dolby Vision, audio flags, server-reported community/critic ratings and optional genre, audio language, age rating tags — **only for what the server actually reports and enables**.
- Home page poster rows, continuation/next-up, library grids, common card rows and search grids use a shared helper with bounded batch requests, settings & metadata caching and graceful fallback.
- Seerr cards associated with an actual local Jellyfin library item can show Jellyfin Enhanced quality tags. **Remote Seerr titles not present in the Jellyfin library do not invent technical quality data**.
- Movie/series cast and episode guest-star cards: age at release, age now (or at death), and birthplace when supplied by the plugin.
- Seerr movie/TV detail page: TMDb rating and available IMDb/Rotten Tomatoes critic/audience ratings are positioned next to the **title**, not hidden in the lower metadata row.

## Safety/performance
- The client does not execute Jellyfin Enhanced's web UI JavaScript; it consumes user-scoped data APIs.
- Skip posters that already have native JE composite tag stamps to avoid double badges.
- Cap server requests to 200 tag IDs per batch and cache both positive and negative responses.
- Actor lookups are bounded to batches of 100 and only run for visible cast sections. Missing metadata never hides media cards.
- No fallback rating is fabricated. Respect visibility/permissions and missing plugin endpoints.
- Overlay CSS uses top/right/bottom/left instead of the `inset` shorthand for Chromium 79-era TV compatibility.

## Validation checklist
1. With Jellyfin Enhanced absent: all posters, casts and Seerr pages still render normally.
2. With the server tag API enabled: quality and ratings appear on home, library, search and horizontal virtual rows.
3. Confirm native poster image tags never cause duplicate overlaid labels.
4. Compare quality tags on 4K HDR / 1080p SDR and multiple-media-source items; don't confuse remote Seerr posters with local media quality.
5. Confirm age labels for living/deceased actors and ages at release; verify actors without metadata remain usable.
6. Confirm TMDb/IMDb/Rotten Tomatoes scores next to the Seerr title, with only available sources shown.
7. Test D-pad focus and card scrolling with tags present on a physical LG webOS 6 TV.
8. Run `npm ci && npm run build:normal && npm run package:webos-normal` and tests prior to merging.

**Validation status:** static JavaScript parser checks completed for modified modules. Node unit tests, packaged Normal IPK and on-device validation have not yet run.
