import { api } from '../api/index.js';
import { posterQualityHtml } from '../utils/PosterQuality.js';
import { i18n } from '../utils/i18n.js';

const seriesCache = new Map();

/** Keeps technical labels attached when artwork/version selection is refreshed. */
export default class PosterQualityPanel {
    constructor(poster, item, sourceId) {
        this.poster = poster;
        this.item = item;
        this.sourceId = sourceId;
        this._active = true;
        this._session = `${api.serverUrl}|${api.userId}`;
        this._observer = new MutationObserver(() => this._render());
        this._observer.observe(poster, { childList: true });
        this._render();
        if (item.Type === 'Series') this._loadEpisode();
    }

    async _loadEpisode() {
        const key = this._session + '/' + this.item.Id;
        let cached = seriesCache.get(key);
        if (!cached || Date.now() - cached.time > 3600000) {
            if (seriesCache.size > 100) seriesCache.delete(seriesCache.keys().next().value);
            cached = {
                time: Date.now(),
                promise: api
                    .getItems({
                        ParentId: this.item.Id,
                        IncludeItemTypes: 'Episode',
                        Recursive: true,
                        Limit: 1,
                        SortBy: 'SortName',
                        Fields: 'MediaSources,MediaStreams,Width,Height,Path',
                        EnableTotalRecordCount: false
                    })
                    .then((result) => result.Items?.[0])
                    .catch(() => null)
            };
            seriesCache.set(key, cached);
        }
        const episode = await cached.promise;
        if (!this._active || this._session !== `${api.serverUrl}|${api.userId}` || !episode) return;
        this.item = episode;
        this._sample = true;
        this._render();
    }

    _render() {
        if (!this._active) return;
        const html = posterQualityHtml(this.item, this.sourceId);
        if (html === this._html && this.poster.querySelector('.poster-quality-tags')) return;
        this._html = html;
        this.poster.querySelector('.poster-quality-tags')?.remove();
        if (html) {
            this.poster.insertAdjacentHTML('beforeend', html);
            if (this._sample) this.poster.querySelector('.poster-quality-tags').title = i18n.t('SeriesSampleQuality');
        }
    }

    destroy() {
        this._active = false;
        this._observer.disconnect();
        this.poster.querySelector('.poster-quality-tags')?.remove();
    }
}
