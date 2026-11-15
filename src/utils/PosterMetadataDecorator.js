import { api } from '../api/index.js';
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
        this._observer.disconnect();
        this._io.disconnect();
    }
}
