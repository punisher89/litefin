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

## Extended tabs added
- **Shop / Магазин** — fetches the live score-shop catalog, shows the user's bank, owned cosmetics, prices and explicitly confirms purchases.
- **Cosmetics / Оформление** — displays owned cosmetics, supports equip/unequip of themes, frames, rank titles, avatars, backgrounds and profile borders; includes the three server power-up types and their inventory/actions.
- **Friends / Друзья** — lists friends and pending requests, discovers permitted server users, sends invitations, accepts requests, removes friends, and opens direct messages.
- **Messages / Сообщения** — lists existing conversations, displays message history, and sends 1:1 or group chat text. Text entry uses a TV-focusable textarea and the platform keyboard.
- **Quests / Задания** — daily/weekly quest reroll buttons honor server-reported remaining rerolls.
- **Toasts / Уведомления** — deferred, background poll of `/unlocks-since` after player stop, foreground resume and at a 90-second cadence; device-scope is passed to the server. Previously earned badges never appear as brand-new on first connect.

The client intentionally **does not load AchievementBadges' server HTML/JS** or put achievement overlays on movie or series detail cards. This keeps the TV UI lightweight.

**Currently out of scope:** the full plugin admin configuration, file/image attachment uploads, shop cosmetics as animated MP4 backgrounds, advanced friends chat editing/attachments, and per-item badge injection. The cosmetic selection persists on the server; the TV's previews are simplified static representations for the Normal build.

## Build / installation

```bash
npm ci
npm run lint
npm test
npm run build:normal
npm run package:webos-normal
```

Use the generated webOS Normal `.ipk` for webOS 6. The package is produced by Litefin's Gulp/webOS packaging pipeline. Install and test it on a real LG webOS 6 television or the matching emulator.

## Manual verification matrix
1. Without the server plugin: sidebar entry stays hidden, and visiting `#/achievements` directly shows a nonfatal unavailable message.
2. With the plugin installed: sidebar entry becomes visible after user authentication; opening it loads badges and current rank.
3. Navigate using only D-pad/OK/Back, including the sidebar, tabs, filters, shop cards, friends list, and chat input. Ensure no stranded focus.
4. Equip an earned badge, return to the page, and verify it remains equipped; try to equip an unavailable or restricted badge to verify graceful error handling.
5. Switch Jellyfin users, then verify that rank, score and badges always belong to the newly authenticated user.
6. Verify Russian and English display, 1920×1080 and 3840×2160 TV scaling, and long badge descriptions.
7. Disconnect network mid-request and reconnect; use Retry.
8. Verify memory usage, focus visibility, back-navigation and no startup performance regression on real webOS 6.
9. Purchase one low-cost cosmetic with confirmation; verify server balance and ownership, equip/unequip and reopen the app.
10. Confirm a power-up requires a confirmation and the inventory decrements correctly; test daily/weekly quest rerolls.
11. Use two Jellyfin accounts to send/accept friend requests, send a DM and group text, and verify permission boundaries.
12. Earn a fresh badge by real playback; verify one notification, correct device filtering and no historical-notification flood.
13. Repeat after profile switching, PIN lock, network loss, 429 rate limit, and on the webOS 6 Normal IPK.

## Security notes
- Server-side ownership, authorization and rate limits remain authoritative.
- UI uses HTML escaping for plugin-provided strings.
- No manual completion/unlock or admin APIs are called by the TV client.
- Do not embed the plugin's `StandalonePage` with token-in-URL; its own source warns about token exposure through browser history and proxy logs.
