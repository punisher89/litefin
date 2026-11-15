import Component from '../core/Component.js';
import { api } from '../api/index.js';
import { focusManager } from '../ui/FocusManager.js';
import { i18n } from '../utils/i18n.js';
import { normalizeAwards } from '../utils/Awards.js';

const cache = new Map();

/** Server-backed awards with native focus and no browser-side API credentials. */
export default class AwardsPanel extends Component {
    constructor(container, item, onReady = null) {
        super({ container: container.querySelector('#hero-info') });
        this.item = item;
        this._onReady = onReady;
        this.mount();
        this._active = true;
        this.el.hidden = true;
        this._observer = new MutationObserver(() => {
            const host = container.querySelector('#hero-info');
            if (this._active && host && this.el?.parentNode !== host) host.appendChild(this.el);
        });
        this._observer.observe(container, { childList: true, subtree: true });
        this._load();
    }

    render() {
        return '<section class="details-awards"><button type="button" class="details-awards-toggle focusable" tabindex="0" aria-expanded="false"></button><div class="details-awards-list" hidden></div></section>';
    }

    async _load() {
        const id = this.item.ProviderIds?.Tmdb || this.item._tmdbId;
        const type = this.item.Type === 'Movie' ? 'movie' : this.item.Type === 'Series' ? 'tv' : null;
        if (!type || !/^\d+$/.test(String(id))) return;
        const session = `${api.serverUrl}|${api.userId}`;
        const path = `/JellyfinEnhanced/awards/${type}/${id}`;
        const key = session + path;
        let record = cache.get(key);
        if (!record || Date.now() - record.time > (record.data ? 3600000 : 60000)) {
            record = { time: Date.now() };
            record.promise = api
                .get(path, null, { suppressUnauthorized: true })
                .then((data) => {
                    record.data = normalizeAwards(data);
                    return record.data;
                })
                .catch(() => null);
            if (cache.size >= 200) cache.delete(cache.keys().next().value);
            cache.set(key, record);
        }
        const data = await record.promise;
        if (!data || !this._active || session !== `${api.serverUrl}|${api.userId}`) return;
        this._populate(data);
    }

    _populate(data) {
        const button = this.el.querySelector('button');
        button.textContent = `${i18n.t('DetailsAwards')} · ${i18n.t('AwardsWins')}: ${data.wins} · ${i18n.t('AwardsNominations')}: ${data.nominations}`;
        const list = this.el.querySelector('.details-awards-list');
        data.rows.forEach((award) => {
            const row = document.createElement('div');
            row.className = 'details-award-row focusable';
            row.tabIndex = 0;
            const title = document.createElement('strong');
            title.textContent = award.name;
            const detail = document.createElement('span');
            detail.textContent = [
                i18n.t(award.result === 'won' ? 'AwardsWon' : 'AwardsNominated'),
                award.year,
                award.recipients.join(', ')
            ]
                .filter(Boolean)
                .join(' · ');
            row.appendChild(title);
            row.appendChild(detail);
            list.appendChild(row);
        });
        button.onclick = () => {
            list.hidden = !list.hidden;
            button.setAttribute('aria-expanded', String(!list.hidden));
            focusManager.invalidateCache('details-awards');
        };
        this.el.hidden = false;
        this._onReady?.();
    }

    destroy() {
        this._active = false;
        this._observer.disconnect();
        if (this.el) this.el.querySelector('button').onclick = null;
        super.destroy();
    }
}
