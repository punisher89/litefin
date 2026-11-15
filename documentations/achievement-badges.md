# Achievement Badges

Open **Achievements** in Litefin's sidebar, or navigate to `#/achievements`.
The entry can be reordered or hidden in the sidebar settings, in both layouts.

Install [AchievementBadges for Jellyfin](https://github.com/ZL154/AchievementBadges_for_Jellyfin)
on the same Jellyfin server first. The plugin must expose `public-config` and
the `client-script/sidebar`, `standalone`, and `enhance` bundles. No Jellyfin Web
file patching or JS Injector installation is required for the Litefin page.

Litefin hosts all three original frontend bundles from the installed plugin
in a separate document. This preserves My Badges, Quests, Recap, Leaderboard,
Compare, Activity, Wrapped, Stats, Loadout/shop, Settings, friends, messaging,
profile cards, effects and plugin feature/privacy settings. Features available
to a user remain controlled by the server plugin. The server still computes
and stores all achievements, quests, cosmetics and social data.

The interface follows the plugin's own Classic/Revamp style and language
settings. The Litefin menu and toolbar are localized independently. Upstream
does not currently ship a Russian UI translation; its English fallback is
preserved. The Material Icons font is bundled locally so icons work without
Google Fonts access. Its Apache 2.0 license is in
`src/assets/licenses/MaterialIcons-LICENSE.txt`.

Litefin supplies the current session token in request headers, including for
Jellyfin 12, and preserves a Jellyfin base path such as `/jellyfin`. No token
is placed in the iframe URL or written to `jellyfin_credentials`. Local UI
preferences are namespaced by server and user. Custom server request headers
are forwarded for plugin API calls. Static bundles/assets must be accessible
under Jellyfin's plugin endpoints, as in Jellyfin Web. Cross-origin clients
need the normal Jellyfin CORS configuration. Proxies that also protect static
assets may require a same-origin deployment.

Use **Open achievements** to transfer keyboard/remote focus into the page.
Arrow keys move between controls. Escape / TV Back returns to the Litefin
toolbar (or closes an open badge dialog); the next Back uses Litefin's normal
navigation. The plugin's Back Home link opens Litefin Home. Leaving the page
removes its document, timers and observers and aborts outstanding requests.

The server serves its own JavaScript without Litefin's Babel transpilation.
Compatibility on older TVs therefore also depends on the installed plugin's
browser requirements. This integration does not replace server dashboard
administration or add global badge overlays to Litefin's video player.

## webOS 6 Normal

The target package is `npm run package:webos-normal` (Normal bundle).
webOS 6 uses Chromium 79. The host converts numeric OKLCH colors to sRGB,
expands `inset` into four physical edges, and supplies spacing for key flex
rows. It applies the same fixes to styles added later by dialogs and friends.
Some advanced blend/blur decoration may differ on this older engine. The
TV page enlarges controls and provides an explicit focus outline; locked
badge cards can also be opened with OK. User avatars load through authenticated
blob requests instead of putting the session token in image URLs.

## Validation

Run `npm test`, `npm run locale:check -- --all --no-untranslated`, and `npm run package:webos-normal`. The host tests
cover base URLs, authenticated writes, refreshed tokens, session switching,
request cancellation, and directional navigation. A live Jellyfin deployment
is still required to verify actual awards, purchases, attachments, sharing,
privacy rules and messaging end to end.

Frontend contract inspected against upstream commit
`8939cd412d28a8d3ba0b54fc338c21847e83e6bd`.

Browser integration was exercised with the actual upstream bundles and a mock
API in current Chromium and Chromium 79.0.3945.0: badge rendering, all ten
page tabs, an authenticated equip write, keyboard navigation, a full-size
chase dialog, Back Home, and teardown without continued polling. The Normal
IPK builds successfully. These checks do not emulate LG hardware or its
virtual keyboard. The repository's locale checker also reports pre-existing
missing keys unrelated to this page.
