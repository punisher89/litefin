# Plugin System

Litefin features a modular plugin system that allows extending the application's functionality without modifying the core codebase. Plugins can inject UI elements, listen to playback events, and communicate with Jellyfin server plugins.

## Architecture

The plugin system is built around three main components:

1.  **PluginManager** (`src/plugins/PluginManager.js`): The central hub that loads bundled plugins, manages their lifecycle (init/enable/disable/destroy), and broadcasts app events.
2.  **PluginAPI** (`src/plugins/PluginAPI.js`): A stable compatibility facade provided to each plugin. It is not a security sandbox; bundled plugin code still runs in the app origin.
3.  **ServerPluginClient** (`src/plugins/ServerPluginClient.js`): A specialized client that detects and communicates with server-side Jellyfin plugins (like Intro Skipper) via hybrid detection strategy (admin `/Plugins` query + endpoint probing for non-admin users).
4.  **PluginExtensionHost** (`src/plugins/PluginExtensionHost.js`): Mounts native plugin widgets into documented Home, Details, and Person page slots, and owns D-pad focus / teardown lifecycle.
5.  **PluginCatalog** (`src/plugins/PluginCatalog.js`): Curated Awesome Jellyfin compatibility registry. It distinguishes native adapters from Web-only plugins that need individual ports.

## Bundled Plugins

Litefin currently registers 8 bundled plugins in `PluginManager.js`:

| Plugin ID         | Description                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------- |
| `skip-intro`      | Skip buttons for TV show intros and recaps via server-side Intro Skipper                          |
| `syncplay`        | Real-time synchronized group playback via WebSockets                                              |
| `local-intros`    | Play custom local video files before media content                                                |
| `mdblist-ratings` | Fetch and display IMDb, Rotten Tomatoes, Metacritic, Trakt, TMDB, and Letterboxd ratings on cards |
| `achievement-badges` | Read-only native Home integration for equipped and recently unlocked badges |
| `actor-plus` | Native, D-pad-friendly actor profile highlights on Litefin's Person page |
| `jellyfin-featured` | Reads `/featured/items` and renders the configured, personalized feed in a native Home widget |
| `jellyfin-enhanced` | Native first subset: resolution, HDR, and audio-format chips on movie detail pages |

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

## Native UI extension slots

The PluginAPI exposes native page slots. An extension returns an `HTMLElement`
from its synchronous `render(context, api)` callback. The host manages insertion,
page teardown, and optional D-pad focus registration.

| API method | Slot | Litefin page |
| --- | --- | --- |
| `api.addFeaturedWidget(widget)` | `home:featured` | Home, after the native hero placeholder |
| `api.addHomeWidget(widget)` | `home:widgets` | Home, before library rows |
| `api.addDetailsWidget(widget)` | `details:content` | Media details |
| `api.addPersonWidget(widget)` | `person:profile` | Actor / Person profile |

Widget descriptor fields:

- `id` (required): unique within the plugin.
- `render(context, api)` (required): returns an `HTMLElement` or `null`.
- `order` (optional): lower values mount first.
- `focusOptions` (optional): FocusManager options; the host unregisters them on unmount.
- `onMount(wrapper, context, api)` / `onUnmount(wrapper, context, api)` (optional): lifecycle callbacks.
- `deferUntilReady` (optional): wait for the page's `ready` promise before calling render.

Example:

```javascript
export default {
    id: 'example-widget',
    init(api) {
        api.addHomeWidget({
            id: 'hello',
            order: 10,
            render() {
                const root = document.createElement('section');
                root.textContent = 'Hello from Litefin';
                return root;
            }
        });
    }
};
```

## Awesome Jellyfin compatibility

The Settings > Plugins catalog reports Litefin-side support. It does not claim
that every Jellyfin server plugin's Web UI can run unchanged in a native TV app.

| Integration | Litefin status | Notes |
| --- | --- | --- |
| Achievement Badges | Native read-only adapter | Reads equipped and recent badges through authenticated user endpoints. Unlocking, score, quests, shop, cosmetics and friends remain server-owned and are not yet reproduced in Litefin. |
| MDBList Ratings | Existing native adapter | The existing adapter continues to fetch ratings, awards and feature labels from MDBList Server Plugin. |
| ActorPlus | Native adaptation | Uses Litefin's Person page and filmography. ActorPlus's Jellyfin Web hover UI is not loaded. |
| Jellyfin Featured | Native adapter | Reads the configured feed from `/featured/items` and displays it in Litefin's native Home UI; does not use frontend injection. |
| Jellyfin Enhanced | Partial native adapter | Displays resolution, HDR, and audio format from media fields already fetched by DetailsPage. Other Enhanced features still require individual ports. |

## Runtime trust boundary

`PluginAPI` is a compatibility facade, **not a JavaScript security sandbox**.
Bundled plugins execute in the Litefin application origin and must be reviewed
and trusted before inclusion in a release. The Extension Host limits where
native UI is mounted and manages its lifecycle; it does not isolate JavaScript.

- **DO NOT** import internal Litefin modules directly (e.g., `src/core/Router.js`).
- **DO** use `api.on()` (auto-unsubscribed), `api.showToast()`, `api.getStorage()`,
  the native UI slot methods, `api.addOSDWidget()`, and `api.serverPlugins`.
- Do not load remote scripts, use `eval`, or store a server administrator API key in a client plugin.

