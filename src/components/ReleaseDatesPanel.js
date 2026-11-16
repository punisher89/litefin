import Component from '../core/Component.js';
import { api } from '../api/index.js';
import { i18n } from '../utils/i18n.js';
import { storage } from '../utils/StorageService.js';
import { releaseDates } from '../utils/ReleaseDates.js';

const cache = new Map();
const unavailable = new Set();

/** Add the confirmed release moments to an existing native details hero. */
export default class ReleaseDatesPanel extends Component {
    constructor(container, item) {
        super({ container: container.querySelector('#hero-info') });
        this.item = item || {};
        this.mount();
        this._active = true;
        // Favorite/metadata updates can replace the hero's contents without
        // navigating away. Keep the already-resolved dates on that same page.
        this._observer = new MutationObserver(() => {
            const hero = container.querySelector('#hero-info');
            if (this._active && hero && this.el && this.el.parentNode !== hero) hero.appendChild(this.el);
        });
        this._observer.observe(container, { childList: true, subtree: true });
        this.region = storage.getItem('pref:seerrRegion') || 'US';
        this._render(releaseDates(this.item, {}, this.region));
        this._load();
    }

    render() {
        return '<div class="details-release-dates"></div>';
    }

    async _load() {
        if (!['Movie', 'Series'].includes(this.item.Type)) return;
        const id = this.item.ProviderIds?.Tmdb || this.item._tmdbId;
        if (!id || !/^\d+$/.test(String(id))) return;
        const session = `${api.serverUrl}|${api.userId}`;
        const path = this.item.Type === 'Movie' ? `/movie/${id}/release_dates` : `/tv/${id}`;
        const key = session + path;
        try {
            let record = cache.get(key);
            if (!record || Date.now() - record.time > 3600000) {
                if (unavailable.has(session)) return;
                const data = await api.get('/JellyfinEnhanced/tmdb' + path, null, { suppressUnauthorized: true });
                record = { data, time: Date.now() };
                if (cache.size >= 300) cache.delete(cache.keys().next().value);
                cache.set(key, record);
            }
            if (this._active && `${api.serverUrl}|${api.userId}` === session)
                this._render(releaseDates(this.item, record.data, this.region));
        } catch {
            unavailable.add(session);
        }
    }

    _render(dates) {
        if (!this._active || !dates.length) return;
        if (!this.el) return;
        this.el.innerHTML = '';
        dates.forEach((entry) => {
            const parts = entry.date.split('-').map(Number);
            const formatted = new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString(i18n.currentLang, {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            const label = document.createElement('span');
            label.textContent = `${i18n.t(entry.kind)}${entry.country ? ' (' + entry.country + ')' : ''}: ${formatted}`;
            this.el.appendChild(label);
        });
    }

    destroy() {
        this._active = false;
        this._observer.disconnect();
        super.destroy();
    }
}
