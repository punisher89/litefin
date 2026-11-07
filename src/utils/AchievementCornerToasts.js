/**
 * AchievementBadges toast presentation for LG webOS 6 Normal.
 * Compact corner placement following the original Jellyfin plugin's
 * per-user ToastPosition / server DefaultToastPosition settings.
 * No overlays on movie cards; this is a screen-level notification only.
 */
const VALID_PLACEMENTS = ['top-right', 'top-center', 'top-left', 'bottom-right', 'bottom-center', 'bottom-left'];
const RARITY_COLORS = {
    common: '#9ea4b4', uncommon: '#65c48f', rare: '#59a9fa',
    epic: '#b586ff', legendary: '#f2c568', mythic: '#ed76bc'
};

class AchievementCornerToasts {
    constructor() {
        this._container = null;
        this._style = null;
        this._queue = [];
        this._active = null;
        this._timer = null;
        this._user = null;
        this._position = 'top-right';
    }

    configure(userId, preferences = {}, publicConfig = {}) {
        if (this._user !== userId) {
            this.clear();
            this._user = userId;
        }
        const preferred = String(preferences.ToastPosition || '').toLowerCase().trim();
        const fallback = String(publicConfig.DefaultToastPosition || 'top-right').toLowerCase().trim();
        this._position = VALID_PLACEMENTS.includes(preferred) ? preferred :
            VALID_PLACEMENTS.includes(fallback) ? fallback : 'top-right';
        if (this._container) this._container.setAttribute('data-position', this._position);
    }

    clear() {
        if (this._timer) clearTimeout(this._timer);
        this._timer = null;
        this._queue = [];
        this._active = null;
        if (this._container) this._container.textContent = '';
    }

    _mount() {
        if (this._container && this._container.isConnected) return;
        if (!this._style) {
            this._style = document.createElement('style');
            this._style.textContent = `
                #litefin-ab-corner {
                    position: fixed !important; z-index: 2147483000 !important;
                    display: flex; flex-direction: column; pointer-events: none;
                    gap: 12px; max-width: calc(100vw - 32px);
                    top: 66px; right: 24px; bottom: auto; left: auto;
                }
                #litefin-ab-corner[data-position="top-left"] { top: 66px; left: 24px; right: auto; bottom: auto; }
                #litefin-ab-corner[data-position="top-center"] { top: 66px; left: 50%; right: auto; bottom: auto; transform: translateX(-50%); }
                #litefin-ab-corner[data-position="bottom-left"] { bottom: 24px; left: 24px; top: auto; right: auto; }
                #litefin-ab-corner[data-position="bottom-right"] { bottom: 24px; right: 24px; top: auto; left: auto; }
                #litefin-ab-corner[data-position="bottom-center"] { bottom: 24px; left: 50%; top: auto; right: auto; transform: translateX(-50%); }
                .litefin-ab-toast {
                    box-sizing: border-box; display: flex; align-items: center; gap: 14px;
                    width: 385px; max-width: calc(100vw - 48px); min-height: 78px;
                    padding: 14px 18px; border-radius: 16px;
                    border: 1px solid var(--ab-accent, #9f78d7);
                    border-left: 4px solid var(--ab-accent, #9f78d7);
                    background: rgba(19, 18, 29, .97); color: #fff;
                    box-shadow: 0 12px 40px rgba(0,0,0,.5), 0 0 18px var(--ab-glow, rgba(142,103,210,.2));
                    font-family: sans-serif; line-height: 1.3;
                    animation: litefinAbAppear .28s ease-out both;
                }
                .litefin-ab-toast-icon {
                    width: 48px; height: 48px; flex: 0 0 48px;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 28px; border: 2px solid var(--ab-accent, #9f78d7);
                    border-radius: 50%; background: rgba(120,100,165,.18);
                }
                .litefin-ab-toast-copy { min-width: 0; flex: 1; }
                .litefin-ab-toast-head { color: var(--ab-accent, #d6c1ff); font-size: 13px; font-weight: 700; }
                .litefin-ab-toast-title { font-size: 18px; font-weight: 700; margin-top: 3px; overflow-wrap: anywhere; }
                .litefin-ab-toast-detail { font-size: 13px; color: #c1bacb; margin-top: 4px; max-height: 34px; overflow: hidden; }
                @keyframes litefinAbAppear { from {opacity:0; transform:translateY(-12px)} to {opacity:1; transform:translateY(0)} }
                @media (prefers-reduced-motion: reduce) { .litefin-ab-toast {animation:none;} }
            `;
            document.head.appendChild(this._style);
        }
        this._container = document.createElement('div');
        this._container.id = 'litefin-ab-corner';
        this._container.setAttribute('data-position', this._position);
        this._container.setAttribute('aria-live', 'polite');
        this._container.setAttribute('aria-atomic', 'true');
        document.body.appendChild(this._container);
    }

    showBadge(badge, language = 'en') {
        const rarity = String(badge?.Rarity || 'common').toLowerCase();
        this._enqueue({
            icon: '🏆',
            heading: language === 'ru' ? 'Достижение открыто!' : 'Achievement unlocked!',
            title: String(badge?.Title || badge?.Key || 'Achievement'),
            detail: String(badge?.Description || ''),
            color: RARITY_COLORS[rarity] || RARITY_COLORS.common
        });
    }

    showMessage(count, language = 'en') {
        this._enqueue({
            icon: '✉',
            heading: language === 'ru' ? 'Сообщения' : 'Messages',
            title: language === 'ru' ? (count === 1 ? 'Новое сообщение' : 'Новых сообщений: ' + count) :
                (count === 1 ? 'New message' : 'New messages: ' + count),
            detail: '',
            color: '#bc92f7'
        });
    }

    _enqueue(data) {
        if (this._queue.length >= 5) this._queue.shift();
        this._queue.push(data);
        if (!this._active) this._next();
    }

    _next() {
        if (!this._queue.length) {
            this._active = null;
            if (this._container) this._container.textContent = '';
            return;
        }
        this._mount();
        this._active = this._queue.shift();
        const d = this._active;
        const el = document.createElement('div');
        el.className = 'litefin-ab-toast';
        el.style.setProperty('--ab-accent', d.color);
        const icon = document.createElement('div');
        icon.className = 'litefin-ab-toast-icon';
        icon.textContent = d.icon;
        const copy = document.createElement('div');
        copy.className = 'litefin-ab-toast-copy';
        const header = document.createElement('div');
        header.className = 'litefin-ab-toast-head';
        header.textContent = d.heading;
        const title = document.createElement('div');
        title.className = 'litefin-ab-toast-title';
        title.textContent = d.title;
        copy.appendChild(header);
        copy.appendChild(title);
        if (d.detail) {
            const desc = document.createElement('div');
            desc.className = 'litefin-ab-toast-detail';
            desc.textContent = d.detail;
            copy.appendChild(desc);
        }
        el.appendChild(icon);
        el.appendChild(copy);
        this._container.textContent = '';
        this._container.appendChild(el);
        // Match the original plugin's single visible toast and ~11 s duration.
        this._timer = setTimeout(() => {
            this._timer = null;
            this._active = null;
            this._next();
        }, 11000);
    }
}

export const achievementCornerToasts = new AchievementCornerToasts();
