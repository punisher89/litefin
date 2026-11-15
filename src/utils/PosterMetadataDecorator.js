import { api } from '../api/index.js';
import { resolveResumeSettings } from './ResumeMetadataSettings.js';
import ResumeMetadataOverlay from '../components/ResumeMetadataOverlay.js';
import CardRenderer from './CardRenderer.js';
import { lazyLoader } from './LazyLoader.js';
import { serverPosterArtwork, mergeServerArtwork } from './ServerPosterArtwork.js';

const cache = new Map();

/** Companion row wrappers can bypass Enhanced's DTO filter. Resolve native
 * artwork from standard authenticated item responses, only for nearby cards.
 */
export default class PosterMetadataDecorator {
    constructor(container) {
        this.container = container;
        this._records = new Map();
        this._resumeFacts = new Map();
        this._overlays = new Map();
        this._seen = new WeakSet();
        this._queue = [];
        this._running = 0;
        this._active = true;
        this._session = `${api.serverUrl}|${api.userId}`;
        this._io = new IntersectionObserver(
            (entries) =>
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        this._io.unobserve(entry.target);
                        this._queue.push(entry.target);
                        this._drain();
                    }
                }),
            { root: container.querySelector('.page-content'), rootMargin: '400px' }
        );
        this._observer = new MutationObserver(() => this._scan());
        this._observer.observe(container, { childList: true, subtree: true });
        this._scan();
    }

    renderCard(item, options) {
        const key = item.Id + '|' + options.contextType;
        const record = this._records.get(key);
        const artworkItem = record?.fresh ? mergeServerArtwork(item, record.fresh) : item;
        this._records.set(key, { item: artworkItem, options, fresh: record?.fresh });
        return CardRenderer.createCardHtml(artworkItem, options);
    }

    _scan() {
        this._overlays.forEach((overlay, card) => {
            if (!this.container.contains(card)) {
                overlay.destroy();
                this._overlays.delete(card);
            }
        });
        this.container.querySelectorAll('[data-poster-series-id]').forEach((card) => {
            if (this._seen.has(card)) return;
            this._seen.add(card);
            this._io.observe(card);
        });
    }

    _cached(id) {
        const key = this._session + '/' + id;
        let record = cache.get(key);
        if (!record || Date.now() - record.time > 600000) {
            if (cache.size >= 300) cache.delete(cache.keys().next().value);
            record = {
                time: Date.now(),
                promise: api.getItem(id, { Fields: 'ImageBlurHashes,SeriesPrimaryImageTag' }).catch(() => null)
            };
            cache.set(key, record);
        }
        return record.promise;
    }

    _resumePreferences() {
        if (!this._settingsPromise)
            this._settingsPromise = Promise.all([
                api.get('/JellyfinEnhanced/public-config', null, { suppressUnauthorized: true }).catch(() => null),
                api
                    .get('/JellyfinEnhanced/user-settings/' + encodeURIComponent(api.userId) + '/settings.json', null, {
                        suppressUnauthorized: true
                    })
                    .catch(() => null)
            ]);
        return this._settingsPromise;
    }

    async _resumeData(id) {
        const key = this._session + '/resume-metadata/' + id;
        let record = this._resumeFacts.get(key);
        if (!record || Date.now() - record.time > 600000) {
            const promise = (async () => {
                try {
                    const response = await api.post('/JellyfinEnhanced/tag-data/' + api.userId, [id], {
                        suppressUnauthorized: true
                    });
                    const items = response?.Items || response?.items;
                    const data = items?.find(
                        (entry) =>
                            String(entry.Id || entry.id)
                                .replace(/-/g, '')
                                .toLowerCase() === String(id).replace(/-/g, '').toLowerCase()
                    );
                    if (data) return data;
                    // A successful filtered response may intentionally hide tags for this title.
                    if (Array.isArray(items)) return null;
                } catch {
                    /* Older servers can still provide their own media DTO. */
                }
                try {
                    return await api.getItem(id, {
                        Fields: 'MediaSources,MediaStreams,CommunityRating,CriticRating,OfficialRating'
                    });
                } catch {
                    return null;
                }
            })();
            record = { time: Date.now(), promise };
            if (this._resumeFacts.size >= 300) this._resumeFacts.delete(this._resumeFacts.keys().next().value);
            this._resumeFacts.set(key, record);
        }
        return record.promise;
    }

    _drain() {
        while (this._active && this._running < 4 && this._queue.length) {
            const card = this._queue.shift();
            this._running++;
            this._decorate(card).finally(() => {
                this._running--;
                this._drain();
            });
        }
    }

    async _decorate(card) {
        const key = card.dataset.itemId + '|' + card.dataset.contextType;
        const record = this._records.get(key);
        const valid = () =>
            this._active && this.container.contains(card) && this._session === `${api.serverUrl}|${api.userId}`;
        if (!record || !valid()) return;
        if (record.options.contextType === 'resume') {
            // Do not refresh, replace, crop or resize the current resume image.
            const wide =
                record.options.isLandscape ||
                document.documentElement.getAttribute('data-layout-media-rows') === 'expanded';
            if (serverPosterArtwork(record.item, wide, CardRenderer._getPrefs().preferEpisodeImages)) return;
            const [config, user] = await this._resumePreferences();
            if (!valid()) return;
            const settings = resolveResumeSettings(config, user, record.item.Type);
            if (!settings.enabled || !Object.values(settings.groups).some((group) => group.enabled)) return;
            const data = await this._resumeData(card.dataset.itemId);
            if (data && valid() && !this._overlays.has(card))
                this._overlays.set(card, new ResumeMetadataOverlay(card, record.item, data, settings));
            return;
        }
        const landscape =
            record.options.isLandscape ||
            document.documentElement.getAttribute('data-layout-media-rows') === 'expanded';
        const fresh = await this._cached(card.dataset.itemId);
        if (!fresh || !valid()) return;
        let item = mergeServerArtwork(record.item, fresh);
        // Series thumbs in an episode DTO are not stamped by all plugin versions.
        if (['Episode', 'Season'].includes(item.Type) && item.SeriesId) {
            const series = await this._cached(item.SeriesId);
            if (!valid()) return;
            if (series)
                item = {
                    ...item,
                    SeriesPrimaryImageTag: series.ImageTags?.Primary || item.SeriesPrimaryImageTag,
                    SeriesThumbImageTag: series.ImageTags?.Thumb || item.SeriesThumbImageTag,
                    SeriesBackdropImageTags: series.BackdropImageTags || item.SeriesBackdropImageTags
                };
        }
        record.fresh = item;
        record.item = item;
        if (!landscape && !serverPosterArtwork(item, false, CardRenderer._getPrefs().preferEpisodeImages)) return;
        const temp = document.createElement('div');
        temp.innerHTML = CardRenderer.createCardHtml(item, record.options);
        const wrapper = card.querySelector('.card-image');
        if (!wrapper) return;
        const oldImage = wrapper.querySelector('img.lazy, img.poster-layer, img[data-src], img.loaded');
        const newImage = temp.querySelector(
            '.card-image img.lazy, .card-image img.poster-layer, .card-image img[data-src]'
        );
        if (!newImage) return;
        const newUrl = newImage.dataset.src;
        if (oldImage && (oldImage.dataset.src || oldImage.getAttribute('src')) === newUrl) return;
        lazyLoader.clearContainer(wrapper);
        wrapper.querySelectorAll('img, .blurhash-canvas').forEach((image) => image.remove());
        temp.querySelectorAll('.card-image > img, .card-image > .blurhash-canvas').forEach((image) =>
            wrapper.appendChild(image)
        );
        lazyLoader.observe(wrapper);
    }

    destroy() {
        this._active = false;
        this._queue.length = 0;
        this._records.clear();
        this._resumeFacts.clear();
        this._overlays.forEach((overlay) => overlay.destroy());
        this._overlays.clear();
        this._observer.disconnect();
        this._io.disconnect();
    }
}
