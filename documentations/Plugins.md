# Plugin System

Litefin features a modular plugin system that allows extending the application's functionality without modifying the core codebase. Plugins can inject UI elements, listen to playback events, and communicate with Jellyfin server plugins.

## Architecture

The plugin system is built around three main components:

1.  **PluginManager** (`src/plugins/PluginManager.js`): The central hub that loads bundled plugins, manages their lifecycle (init/enable/disable/destroy), and broadcasts app events.
2.  **PluginAPI** (`src/plugins/PluginAPI.js`): A sandboxed interface provided to each plugin. Plugins should only interact with Litefin through this API to ensure stability and compatibility.
3.  **ServerPluginClient** (`src/plugins/ServerPluginClient.js`): A specialized client that detects and communicates with server-side Jellyfin plugins (like Intro Skipper) via hybrid detection strategy (admin `/Plugins` query + endpoint probing for non-admin users).

## Bundled Plugins

Litefin ships with 4 bundled plugins registered in `PluginManager.js`:

| Plugin ID         | Description                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------- |
| `skip-intro`      | Skip buttons for TV show intros and recaps via server-side Intro Skipper                          |
| `syncplay`        | Real-time synchronized group playback via WebSockets                                              |
| `local-intros`    | Play custom local video files before media content                                                |
| `mdblist-ratings` | Fetch and display IMDb, Rotten Tomatoes, Metacritic, Trakt, TMDB, and Letterboxd ratings on cards |

## Creating a Plugin

### 1. Directory Structure

Create a new directory for your plugin in `src/plugins/installed/`:

```
src/plugins/installed/my-plugin/
├── index.js      (Main entry point)
└── styles.css    (Optional styling)
```

### 2. Plugin Implementation

Your `index.js` must export a default object that implements the plugin interface:

```javascript
export default {
    id: 'my-plugin',
    name: 'My Awesome Plugin',
    version: '1.0.0',
    description: 'Adds a custom button to the OSD.',

    // Optional: Declare a dependency on a server-side plugin
    serverDependency: 'intro-skipper',

    async init(api) {
        api.log.info('Plugin initialized!');

        // Listen to playback events
        api.on('player:timeupdate', (data) => {
            // handle update
        });

        // Add a widget to the Player OSD
        api.addOSDWidget({
            id: 'my-widget',
            render: () => {
                const btn = document.createElement('div');
                btn.className = 'osd-button';
                btn.innerText = 'Click Me';
                return btn;
            },
            onSelect: () => {
                api.showToast('Button clicked!');
            }
        });
    },

    onPlayerStart(item, api) {
        api.log.info('Playback started:', item.Name);
    },

    destroy(api) {
        api.log.info('Plugin shutting down');
    }
};
```

### 3. Lifecycle Hooks

- `init(api)`: Called when the plugin is loaded and enabled.
- `prepareItemPlayback(item, playbackContext, api)`: Called before playback starts, allowing the plugin to modify the playback context or item.
- `onPlayerStart(item, player, osd, api)`: Triggered when a new media item starts playing.
- `onTimeUpdate(pos, dur, api)`: High-frequency update during playback (via `notifyTimeUpdate`).
- `onPlayerStop(api)`: Cleanup when playback ends.
- `onPageLoad(pageId, pageEl, api)`: Triggered when a non-player page (e.g., 'home', 'details') is loaded.
- `onPageUnload(pageId, api)`: Triggered when a page is closed.
- `destroy(api)`: Final cleanup (automatic subscriptions are cleaned up by the API).

Additional PluginManager methods: `getPlugin(pluginId)`, `isEnabled(pluginId)`, `getPluginIds()`, `getPluginList()`, `setPluginEnabled(pluginId, enabled)`, `checkServerDependency(pluginId)`, `handleWidgetKey(key, focusedEl)`.

### 4. Registration

Register your plugin in `src/plugins/PluginManager.js` by adding it to the `BUNDLED_PLUGINS` array:

```javascript
const BUNDLED_PLUGINS = [
    // ... existing plugins
    {
        id: 'my-plugin',
        load: () => import('./installed/my-plugin/index.js')
    }
];
```

## Integrating with Server Plugins

Litefin uses a **Hybrid Detection Strategy** to find server-side plugins:

1.  **Admin Users**: Litefin queries `/Plugins` to get a list of all installed server plugins.
2.  **Non-Admin Users**: Since regular users cannot view the plugin list, Litefin performs **Endpoint Probing**. It attempts to call a characteristic endpoint of the server plugin. A successful response confirms the plugin is present.

### Adding a Server Probe

If your Litefin plugin depends on a new server plugin, register a probe in `src/plugins/ServerPluginClient.js`:

```javascript
const KNOWN_PROBES = {
    'my-server-plugin': {
        probeEndpoint: (itemId) => `/Items/${itemId}/MyPluginData`
    }
};
```

### Using Server Data in a Plugin

Once a `serverDependency` is declared, your plugin's `init()` will only be called if the server plugin is detected. You can then use the `api.serverPlugins` client:

```javascript
async onPlayerStart(item, api) {
    const data = await api.serverPlugins.call(`/Episode/${item.Id}/MyData`);
    // ...
}
```

## Server-Side Plugins

Litefin pairs with dedicated server-side plugins to unlock advanced capabilities:

### 1. Litefin Server Plugin ([Jellyfin](https://github.com/MoazSalem/litefin-plugin) / [Emby](https://github.com/MoazSalem/litefin-plugin-emby))
Extends your server with features that require elevated or backend network access:
- **Seerr Discovery & Requests**: Proxies Jellyseerr / Overseerr requests without exposing API keys to client devices.
- **Where to Watch (Streaming Availability)**: Queries TMDB streaming provider catalogs (Netflix, Prime, Disney+, etc.) grouped by subscription and rental.
- **MDBList Ratings Aggregation**: Enriches media items with multi-source ratings (Rotten Tomatoes, IMDb, Metacritic, Trakt, Letterboxd).

### 2. Litefin Client Plugin (`Litefin.Client.Plugin`)
Embeds Litefin directly inside your Jellyfin server web interface:
- **Repository Manifest**: `https://github.com/MoazSalem/litefin/releases/latest/download/litefin-plugin-manifest.json`
- **Manual Sideloading**: Drop `Litefin.Client.Plugin.dll` and `manifest.json` into `/plugins/Litefin_Client/`.
- Accessible at `http://<server-ip>:<port>/litefin`.

## Security & Sandbox

Plugins are **sandboxed** via the `PluginAPI`.

- **DO NOT** import internal Litefin modules directly (e.g., `src/core/Router.js`).
- **DO** use `api.on()` (auto-unsubscribed), `api.showToast()`, `api.getStorage()`, `api.addOSDWidget()`, and `api.serverPlugins` for all operations.
- This ensures your plugin doesn't break if Litefin's internal directory structure changes.

## Client Feature Bridges

Some Jellyfin server plugins expose data that Litefin renders natively instead of injecting their web-client scripts.

### Achievement Badges

The Game Center page and unlock notifications are implemented in Litefin:
- Page: `src/pages/AchievementsPage.js`
- Localization: `src/utils/AchievementBadgeLocalization.js`
- Notifications: `src/utils/AchievementNotifications.js`

The server-side Achievement Badges plugin remains the source of truth for progress, scores, quests, rewards, purchases, cosmetics, and user permissions. Litefin calls its user-scoped `/Plugins/AchievementBadges/*` routes. The client page already covers the summary, rank, badge catalog, quests, leaderboard, score bank, power-ups, shop, cosmetics, gifts, and unlock notifications.

### Jellyfin Enhanced Poster Tags

Litefin includes a lightweight adapter for poster tags:
- Metadata adapter and renderer: `src/utils/EnhancedPosterTags.js`
- Card overlay styles: `src/styles/enhanced-poster-tags.css`
- Homepage integration: `src/pages/HomePage.js`
- Card integration: `src/utils/CardRenderer.js`

The adapter reads the public plugin configuration and the active user's settings, then requests tag metadata through `POST /JellyfinEnhanced/tag-data/{userId}` in batches of up to 200 item IDs. It respects the server's Native Poster Tags master switch, per-user opt-out, supported tag groups and configured positions. Settings are cached for 5 minutes, item metadata for 10 minutes, and negative results for 2 minutes. The item cache is cleared when a new homepage render pipeline starts so Spoiler Guard and library-access filtering are re-evaluated.

If an item's Primary image tag already contains Jellyfin Enhanced's native `-jet` token, Litefin leaves that image to the server compositor and does not draw a second HTML overlay. This avoids duplicate tags. The client adapter does not load Jellyfin Enhanced's injected web scripts, which avoids relying on JavaScript syntax unsupported by older TV browser engines.

The adapter renders quality, genre, language, rating, and age-rating groups on homepage rows, shared `MediaGrid` search/result cards, virtualized horizontal rows (including Discover and Favorites), and the Library page grid. Existing server-stamped native posters are left untouched. The adapter decorates already-rendered virtual cards in place, preserving TV focus and avoiding a full row rebuild. Seerr/TMDB results first use a backing Jellyfin media ID (`_jellyfinMediaId`) when Seerr provides one. Otherwise, Litefin builds a per-user, 10-minute cached lookup from Jellyfin `/Items?HasTmdbId=true` results, requesting only `ProviderIds` (no images), then matches TMDB ID and media type locally. Synthetic `tmdb-*` IDs are never sent to Jellyfin Enhanced. Unrequested or not-yet-imported catalogue entries have no local media streams, so technical quality/audio tags are not available for them.


## StarTrack native integration

Litefin includes a native StarTrack client bridge when the StarTrack Jellyfin server plugin is installed and active.

- The **My Ratings** navigation entry appears only after the server plugin is detected.
- The page uses the authenticated `/Plugins/StarTrack/*` JSON API; it does not embed StarTrack's injected Jellyfin Web JavaScript or put the access token in a URL.
- Ratings, watchlist, diary, favourites, liked titles, recommendations and lists are hydrated through a batched Jellyfin `/Items?Ids=...` request.
- Removing a rating, watchlist entry, like or diary entry uses the corresponding authenticated StarTrack API endpoint.
- External Letterboxd, Trakt, Simkl and other sync settings remain controlled by the StarTrack server plugin and are not enabled by Litefin automatically.

Server plugin repository: `https://raw.githubusercontent.com/ZL154/jellyfin-plugin-startrack/main/manifest.json`

## Community add-on catalogue

Settings → Plugins contains a curated list of project links. Server-side DLL plugins must be installed through Jellyfin Dashboard → Plugins. Injected Jellyfin Web UI extensions are not automatically loaded by Litefin. Litefin does not download or execute arbitrary third-party client JavaScript.
