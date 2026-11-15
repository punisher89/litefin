/** Header-authenticated requests used by the native Achievement Badges component. */
export function achievementUrl(serverUrl, path) {
    return serverUrl.replace(/\/+$/, '') + '/' + path.replace(/^\/+/, '');
}
export default class AchievementBadgesClient {
    constructor(options) {
        this.options = options;
        this._session = { ...options.getSession() };
        this._requests = new Set();
        this._avatars = new Map();
        this._disposed = false;
    }
    fetch(url, init) {
        return this._fetch(url, init);
    }
    avatarUrl(id) {
        return this._avatarUrl(id);
    }
    _activeSession() {
        const session = this.options.getSession();
        if (
            this._disposed ||
            session.userId !== this._session.userId ||
            session.serverUrl !== this._session.serverUrl
        ) {
            throw new Error('AchievementBadges session ended');
        }
        return session;
    }

    _avatarUrl(id) {
        if (this._avatars.has(id)) return this._avatars.get(id).url;
        // CSS background images cannot carry Authorization headers. Return a
        // transparent placeholder until an authenticated blob is available.
        const placeholder =
            'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7#' + encodeURIComponent(id);
        const image = { url: placeholder };
        this._avatars.set(id, image);
        this._fetch(achievementUrl(this._session.serverUrl, '/Users/' + encodeURIComponent(id) + '/Images/Primary'))
            .then((response) => {
                if (!response.ok) throw new Error('Avatar unavailable');
                return response.blob();
            })
            .then((blob) => {
                if (this._disposed || !this.root) return;
                image.url = URL.createObjectURL(blob);
                this.root.querySelectorAll('[style]').forEach((el) => {
                    const background = el.style.backgroundImage;
                    if (background.includes(placeholder))
                        el.style.backgroundImage = background.replace(placeholder, image.url);
                });
            })
            .catch(() => {}); // The plugin already displays initials as a fallback.
        return image.url;
    }

    async _fetch(url, init = {}) {
        const session = this._activeSession();
        const target = String(url);
        const isServer = target.startsWith(session.serverUrl.replace(/\/+$/, '') + '/');
        if (!isServer) throw new Error('AchievementBadges requested an unexpected server');
        const headers = new Headers(init.headers || {});
        if (isServer) {
            headers.set('Authorization', 'MediaBrowser Token="' + session.accessToken + '"');
            const extra = this.options.getHeaders ? this.options.getHeaders(target) : {};
            Object.keys(extra).forEach((key) => headers.set(key, extra[key]));
        }
        const controller = new AbortController();
        this._requests.add(controller);
        const abort = () => controller.abort();
        if (init.signal) {
            if (init.signal.aborted) abort();
            else init.signal.addEventListener('abort', abort);
        }
        const timeout = setTimeout(abort, 30000);
        try {
            // Jellyfin authenticates with headers. credentials:include breaks
            // wildcard CORS on a web/TV client hosted outside the server origin.
            return await this.options.fetch(target, {
                ...init,
                headers,
                credentials: 'same-origin',
                signal: controller.signal
            });
        } finally {
            clearTimeout(timeout);
            if (init.signal) init.signal.removeEventListener('abort', abort);
            this._requests.delete(controller);
        }
    }

    destroy() {
        this._disposed = true;
        this._requests.forEach((controller) => controller.abort());
        this._requests.clear();
        this._avatars.forEach((image) => {
            if (image.url.startsWith('blob:')) URL.revokeObjectURL(image.url);
        });
        this._avatars.clear();
        this.root = null;
    }
}
