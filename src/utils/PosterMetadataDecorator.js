import { api } from '../api/index.js';
import CardRenderer from './CardRenderer.js';
import { detailsIcons } from './Icons.js';
import { i18n } from './i18n.js';
import { shouldShowScore } from './visibility.js';

const cache = new Map();

/** Lazy fallback for series without video streams and unrated resume episodes. */
export default class PosterMetadataDecorator {
    constructor(container) {
        this.container = container;
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

    _scan() {
        this.container.querySelectorAll('[data-poster-series-id]').forEach((card) => {
            if (this._seen.has(card)) return;
            this._seen.add(card);
            if (!card.querySelector('.quality-badge') || !card.querySelector('.poster-rating-badge'))
                this._io.observe(card);
        });
    }

    _cached(key, load) {
        const scoped = this._session + key;
        let record = cache.get(scoped);
        if (!record || Date.now() - record.time > 3600000) {
            if (cache.size > 300) cache.delete(cache.keys().next().value);
            record = { promise: load().catch(() => null), time: Date.now() };
            cache.set(scoped, record);
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
        const seriesId = card.dataset.posterSeriesId;
        const isSeries = card.dataset.posterMediaType === 'Series';
        const isMovie = card.dataset.posterMediaType === 'Movie';
        let fallbackItem = null;
        const valid = () =>
            this._active && this.container.contains(card) && `${api.serverUrl}|${api.userId}` === this._session;
        if (!card.querySelector('.quality-badge')) {
            const item = await this._cached(
                isSeries ? '/quality/' + seriesId : '/item/' + card.dataset.itemId,
                async () => {
                    if (!isSeries)
                        return api.getItem(card.dataset.itemId, {
                            Fields: 'MediaStreams,Width,Height,CommunityRating,UserData'
                        });
                    const result = await api.getItems({
                        ParentId: seriesId,
                        IncludeItemTypes: 'Episode',
                        Recursive: true,
                        Limit: 1,
                        SortBy: 'SortName',
                        Fields: 'Width,Height,MediaStreams',
                        EnableTotalRecordCount: false
                    });
                    return result.Items?.[0] || null;
                }
            );
            fallbackItem = isSeries ? null : item;
            if (valid() && item) {
                const wrapper = document.createElement('div');
                wrapper.innerHTML = CardRenderer.getQualityBadgeHtml(item, true);
                const badge = wrapper.firstElementChild;
                if (badge) {
                    if (isSeries) badge.title = i18n.t('SeriesSampleQuality');
                    card.querySelector('.card-image')?.appendChild(badge);
                }
            }
        }
        if (!valid()) return;
        if ((seriesId || isMovie) && !card.querySelector('.poster-rating-badge')) {
            const series = isMovie
                ? fallbackItem ||
                  (await this._cached('/item/' + card.dataset.itemId, () =>
                      api.getItem(card.dataset.itemId, { Fields: 'MediaStreams,Width,Height,CommunityRating,UserData' })
                  ))
                : await this._cached('/rating/' + seriesId, () =>
                      api.getItem(seriesId, { Fields: 'CommunityRating,UserData' })
                  );
            const rating = Number(series?.CommunityRating);
            if (valid() && rating > 0 && rating <= 10 && shouldShowScore(series)) {
                const badge = document.createElement('div');
                badge.className = 'poster-rating-badge';
                badge.innerHTML = detailsIcons.ratingStar + rating.toFixed(1);
                card.querySelector('.card-image')?.appendChild(badge);
            }
        }
    }

    destroy() {
        this._active = false;
        this._queue.length = 0;
        this._observer.disconnect();
        this._io.disconnect();
    }
}
