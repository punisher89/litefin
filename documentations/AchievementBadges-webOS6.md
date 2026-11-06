# Achievement Badges in Litefin (LG webOS 6)

This branch adds a **native Litefin TV screen** that consumes the server-side [Achievement Badges for Jellyfin](https://github.com/punisher89/AchievementBadges_for_Jellyfin) API. It does not bundle the .NET DLL in the TV application.

## Requirements
- LG TV running **webOS 6.0** with Litefin's **Normal** build tier.
- A **Jellyfin** server with the Achievement Badges server plugin installed and enabled (not Emby).
- Logged-in Jellyfin user with permission to view their own achievements.
- TV access to the same Jellyfin server used for media browsing.

## UI policy
- Achievements live **only on the separate `#/achievements` page**, accessible from the Litefin sidebar.
- **No badge overlays or achievements integration on movie/series cards or detail pages.**
- The included concept mockup is illustrative. The actual page uses the existing Litefin sidebar rather than replacing the TV shell.

## TV integration
- `#/achievements`: TV-focused achievements page, lazy-loaded on demand.
- The **Achievements / Достижения** sidebar entry appears only when `GET /Plugins/AchievementBadges/test` confirms the server plugin is reachable.
- Rank, score, badge progress, bank, daily/weekly quests and leaderboard.
- Badges can be equipped/unequipped with OK/Enter on the TV remote; locked badges show their description.
- No access token is passed through a URL query string; all requests use Litefin's existing authenticated `ApiClient`.
- Russian/English interface (other languages currently fall back to English). Badge titles use plugin `?lang=ru`/ `en` localization.
- Optional endpoints fail independently; badges remain viewable if quests/bank/leaderboard are unavailable.

**Not in this first iteration:** full shop, cosmetics, friend messaging, admin configuration, and in-player unlock toast. The mockup is a concept, not a claim that all these extended surfaces are already implemented.

## Build / installation

```bash
npm ci
npm run lint
npm test
npm run build:normal
npm run package:webos-normal
```

Use the generated webOS Modern `.ipk` for webOS 6. The package is produced by Litefin's Gulp/webOS packaging pipeline. Install and test it on a real LG webOS 6 television or the matching emulator.

## Manual verification matrix
1. Without the server plugin: sidebar entry stays hidden, and visiting `#/achievements` directly shows a nonfatal unavailable message.
2. With the plugin installed: sidebar entry becomes visible after user authentication; opening it loads badges and current rank.
3. Navigate using only D-pad/OK/Back, including the sidebar, tabs, filters, and badge grid. Ensure no stranded focus.
4. Equip an earned badge, return to the page, and verify it remains equipped; try to equip an unavailable or restricted badge to verify graceful error handling.
5. Switch Jellyfin users, then verify that rank, score and badges always belong to the newly authenticated user.
6. Verify Russian and English display, 1920×1080 and 3840×2160 TV scaling, and long badge descriptions.
7. Disconnect network mid-request and reconnect; use Retry.
8. Verify memory usage, focus visibility, back-navigation and no startup performance regression on real webOS 6.

## Security notes
- Server-side ownership, authorization and rate limits remain authoritative.
- UI uses HTML escaping for plugin-provided strings.
- No manual completion/unlock or admin APIs are called by the TV client.
- Do not embed the plugin's `StandalonePage` with token-in-URL; its own source warns about token exposure through browser history and proxy logs.
