/**
 * ============================================================================
 * Host the server plugin's complete Jellyfin Web UI in its own document.
 * Scripts, styles, translations and assets come from the installed plugin,
 * keeping its UI and API versions in sync without copying a partial frontend.
 * ============================================================================
 */

import { installAchievementCompatibility } from './AchievementBadgesCompat.js';
import AchievementBadgesScroller from './AchievementBadgesScroller.js';

const PLUGIN_PATH = '/Plugins/AchievementBadges';

/** Resolve only paths under the selected Jellyfin server, retaining its base URL. */
export function achievementUrl(serverUrl, path) {
    return serverUrl.replace(/\/+$/, '') + '/' + path.replace(/^\/+/, '');
}

/** Find the next control geometrically, including dynamically created dialogs. */
export function nextAchievementControl(current, controls, direction) {
    const origin = current.getBoundingClientRect();
    const ox = origin.left + origin.width / 2;
    const oy = origin.top + origin.height / 2;
    let best = null;
    let score = Infinity;
    controls.forEach((control) => {
        if (control === current) return;
        const box = control.getBoundingClientRect();
        const dx = box.left + box.width / 2 - ox;
        const dy = box.top + box.height / 2 - oy;
        const primary = direction === 'left' ? -dx : direction === 'right' ? dx : direction === 'up' ? -dy : dy;
        const cross = direction === 'left' || direction === 'right' ? Math.abs(dy) : Math.abs(dx);
        if (primary <= 1) return;
        const candidate = primary + cross * 3;
        if (candidate < score) {
            best = control;
            score = candidate;
        }
    });
    return best;
}

export default class AchievementBadgesHost {
    /** @param {Object} options - Current session, fetch, storage and navigation adapters. */
    constructor(options) {
        this.options = options;
        this._requests = new Set();
        this._avatars = new Map();
        this._disposed = false;
    }

    /** Mount the unmodified sidebar, page and notification bundles, in upstream order. */
    async mount(container) {
        const session = this.options.getSession();
        if (!session.serverUrl || !session.accessToken || !session.userId) throw new Error('Authentication required');
        this._session = session;
        const config = await this._fetch(achievementUrl(session.serverUrl, PLUGIN_PATH + '/public-config'));
        if (!config.ok) throw new Error('AchievementBadges is unavailable (' + config.status + ')');
        const settings = await config.json();
        if (!settings || typeof settings.LeaderboardEnabled !== 'boolean') {
            throw new Error('Invalid AchievementBadges response');
        }
        if (this._disposed) return;

        const frame = document.createElement('iframe');
        this.frame = frame;
        frame.title = this.options.title;
        frame.className = 'achievements-frame';
        frame.setAttribute('referrerpolicy', 'no-referrer');
        // A same-origin blank document keeps the plugin's globals, CSS, timers,
        // observers and hash routing separate from Litefin. No token in its URL.
        await new Promise((resolve) => {
            frame.onload = resolve;
            frame.src = 'about:blank';
            container.appendChild(frame);
        });
        frame.onload = null;
        if (this._disposed) return;
        const win = frame.contentWindow;
        const doc = win.document;
        doc.open();
        doc.write(
            '<!doctype html><html><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"></head><body></body></html>'
        );
        doc.close();
        win.history.replaceState(null, '', '#/achievements');
        doc.documentElement.lang = this.options.language || 'en';
        if (this.options.tvMode) doc.documentElement.setAttribute('data-litefin-tv', 'true');
        const base = doc.createElement('base');
        base.href = achievementUrl(session.serverUrl, '/web/');
        doc.head.appendChild(base);

        // Functions read the active session, rather than persisting a second
        // Jellyfin login or overwriting jellyfin_credentials in localStorage.
        win.ApiClient = {
            accessToken: () => this._activeSession().accessToken,
            getCurrentUserId: () => this._activeSession().userId,
            deviceId: () => this.options.deviceId || 'litefin',
            getUrl: (path) => achievementUrl(session.serverUrl, path),
            getUserImageUrl: (id) => this._avatarUrl(id)
        };
        win.fetch = (url, init) => this._fetch(url, init);
        // Use Litefin's polyfills on older TV engines as well.
        ['Promise', 'Headers', 'Request', 'Response', 'AbortController', 'URL', 'URLSearchParams'].forEach((name) => {
            if (!win[name] && window[name]) win[name] = window[name];
        });
        const storage = this.options.storage;
        const prefix = 'achievement-badges:' + encodeURIComponent(session.serverUrl) + ':' + session.userId + ':';
        Object.defineProperty(win, 'localStorage', {
            configurable: true,
            value: {
                getItem: (key) => storage.getItem(prefix + key),
                setItem: (key, value) => storage.setItem(prefix + key, value),
                removeItem: (key) => storage.removeItem(prefix + key)
            }
        });
        this._scroller = new AchievementBadgesScroller(win);
        const style = doc.createElement('style');
        style.textContent = `
            @font-face{font-family:'Material Icons';font-style:normal;font-weight:400;
                src:url('${this.options.fontUrl}') format('truetype');font-display:block;}
            html,body{margin:0;background:#0f1115;color:#fff;font-family:Arial,sans-serif;}
            .material-icons{font-family:'Material Icons';font-weight:normal;font-style:normal;
                font-size:24px;line-height:1;letter-spacing:normal;text-transform:none;
                display:inline-block;white-space:nowrap;word-wrap:normal;direction:ltr;
                font-feature-settings:'liga';-webkit-font-feature-settings:'liga';}
            html body #achievementBadgesStandaloneRoot :focus,html body #abFriendsDrawer :focus {
                outline:3px solid #7c9aff!important;outline-offset:3px;}
            html[data-litefin-tv] body {font-size:20px;}
            html[data-litefin-tv] body #achievementBadgesStandaloneRoot .ab-tab,
            html[data-litefin-tv] body #achievementBadgesStandaloneRoot .ab-btn,
            html[data-litefin-tv] body #achievementBadgesStandaloneRoot .ab-input,
            html[data-litefin-tv] body #achievementBadgesStandaloneRoot .ab-select {
                font-size:16px!important;min-height:44px!important;height:auto!important;}

            #achievementBadgesStandaloneRoot{top:0!important;left:0!important;right:0!important;bottom:0!important;}
        `;
        doc.head.appendChild(style);
        this._removeCompatibility = installAchievementCompatibility(win, async (url) => {
            const response = await this._fetch(url);
            if (!response.ok) throw new Error('AchievementBadges stylesheet unavailable');
            return response.text();
        });
        doc.addEventListener('keydown', (event) => this._onKey(event));
        doc.addEventListener('click', (event) => this._onClick(event));
        win.addEventListener('hashchange', () => this._onHash());
        // Cache-bust each visit: upstream serves these URLs immutable for a day.
        const version = '?v=litefin-' + Date.now();
        for (const name of ['sidebar', 'standalone', 'enhance']) {
            if (this._disposed) return;
            await this._loadScript(
                doc,
                achievementUrl(session.serverUrl, PLUGIN_PATH + '/client-script/' + name) + version
            );
        }
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
                if (this._disposed || !this.frame) return;
                image.url = URL.createObjectURL(blob);
                this.frame.contentDocument.querySelectorAll('[style]').forEach((el) => {
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

    _loadScript(doc, url) {
        return new Promise((resolve, reject) => {
            const script = doc.createElement('script');
            const timeout = setTimeout(() => finish(new Error('AchievementBadges script timed out')), 30000);
            const finish = (error) => {
                clearTimeout(timeout);
                script.onload = script.onerror = null;
                this._cancelScript = null;
                if (error) reject(error);
                else resolve();
            };
            this._cancelScript = () => finish(new Error('AchievementBadges closed'));
            script.onload = () => finish();
            script.onerror = () => finish(new Error('Could not load AchievementBadges script'));
            script.src = url;
            doc.body.appendChild(script);
        });
    }

    _controls() {
        const doc = this.frame.contentDocument;
        doc.querySelectorAll('.ab-card[style*="pointer"]').forEach((card) => {
            card.tabIndex = 0;
            card.setAttribute('role', 'button');
        });
        const modal = doc.querySelector('.ab-modal-backdrop, #abFriendsDrawer[style*="display: flex"]');
        return Array.from(
            (modal || doc).querySelectorAll('button, a[href], input, select, textarea, [tabindex]')
        ).filter(
            (el) =>
                !el.disabled &&
                el.tabIndex >= 0 &&
                el.getBoundingClientRect().width > 0 &&
                el.getBoundingClientRect().height > 0
        );
    }

    /** Transfer focus from Litefin into the plugin document. */
    focus() {
        if (!this.frame || this._disposed) return;
        const control = this._controls()[0];
        if (control) this._focusControl(control);
        else this.frame.focus();
    }

    /** Preview the plugin's real toast animation without awarding a badge. */
    testNotification() {
        if (this._disposed || !this.frame) return false;
        const win = this.frame.contentWindow;
        if (typeof win.abAchievementTestToast !== 'function') return false;
        win.abAchievementTestToast('rare');
        return true;
    }

    _focusControl(control) {
        this._scroller.cancel();
        // focus() scrolled instantly before scrollIntoView could animate.
        control.focus({ preventScroll: true });
        control.scrollIntoView({
            behavior: this._scroller.reducedMotion() ? 'auto' : 'smooth',
            block: 'nearest',
            inline: 'nearest'
        });
    }

    _onKey(event) {
        const code = event.keyCode;
        if (event.key === 'Escape' || code === 10009 || code === 461) {
            // Let the plugin close its own dialog first; otherwise return to
            // Litefin's toolbar so another Back uses normal router history.
            const close = Array.from(
                this.frame.contentDocument.querySelectorAll('.ab-modal-close, [data-ab-pc-close], #abFriendsClose')
            ).find((el) => el.getBoundingClientRect().width > 0);
            if (close) close.click();
            else this.options.onExit();
            event.preventDefault();
            return;
        }
        if (
            event.keyCode === 13 &&
            event.target.getAttribute('role') === 'button' &&
            event.target.tagName !== 'BUTTON'
        ) {
            event.preventDefault();
            event.target.click();
            return;
        }
        const direction = { 37: 'left', 38: 'up', 39: 'right', 40: 'down' }[code];
        const target = event.target;
        if (!direction) return;
        const horizontal = direction === 'left' || direction === 'right';
        if (target.tagName === 'TEXTAREA') return;
        if (target.tagName === 'SELECT' && !horizontal) return;
        if (target.tagName === 'INPUT' && horizontal && !/^(checkbox|radio|button|submit)$/.test(target.type)) return;
        const controls = this._controls();
        const next = controls.includes(target) ? nextAchievementControl(target, controls, direction) : controls[0];
        if (next) {
            event.preventDefault();
            this._focusControl(next);
        } else if (direction === 'left' || direction === 'up') {
            event.preventDefault();
            this.options.onExit();
        }
    }

    _onHash() {
        const hash = this.frame.contentWindow.location.hash;
        const match = /\/(?:details|item)\?id=([^&]+)/i.exec(hash);
        if (match) this.options.onNavigate('/details/' + encodeURIComponent(decodeURIComponent(match[1])));
    }

    _onClick(event) {
        const link = event.target.closest && event.target.closest('a[href]');
        if (!link) return;
        if (link.classList.contains('ab-back')) {
            event.preventDefault();
            this.options.onNavigate('/home');
        } else {
            const match = /#\/?(?:details|item)\?id=([^&]+)/i.exec(link.href);
            if (match) {
                event.preventDefault();
                this.options.onNavigate('/details/' + encodeURIComponent(decodeURIComponent(match[1])));
            }
        }
    }

    /** Remove the entire browsing context, stopping all upstream timers/observers. */
    destroy() {
        this._disposed = true;
        if (this._scroller) this._scroller.destroy();
        if (this._removeCompatibility) this._removeCompatibility();
        if (this._cancelScript) this._cancelScript();
        this._requests.forEach((controller) => controller.abort());
        this._requests.clear();
        this._avatars.forEach((image) => {
            if (image.url.startsWith('blob:')) URL.revokeObjectURL(image.url);
        });
        this._avatars.clear();
        if (this.frame) {
            this.frame.remove();
            this.frame = null;
        }
    }
}
