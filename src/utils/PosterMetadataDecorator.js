import { api } from '../api/index.js';
import CardRenderer from './CardRenderer.js';
import { hasServerPosterTag, mergeServerArtwork } from './ServerPosterArtwork.js';

const types = new Set(['Movie', 'Series', 'Season', 'Episode', 'Video', 'BoxSet']);
const key = (id) =>
    String(id || '')
        .replace(/-/g, '')
        .toLowerCase();
const field = (data, name) => data?.[name] ?? data?.[name[0].toLowerCase() + name.slice(1)];

/** Native image path used by the supplied 2.0.150 client: the server draws
 * every tag, logo, language flag, award and per-item look into the image.
 * No client interpretation of tag-data or recreation of the badges.
 */
export default class PosterMetadataDecorator {
    constructor(container) {
        this.container = container;
        this._active = true;
        this._items = new Map();
        this._session = `${api.serverUrl}|${api.userId}`;
    }

    _valid() {
        return this._active && this._session === `${api.serverUrl}|${api.userId}`;
    }

    isNativeEnabled() {
        if (!this._modePromise)
            this._modePromise = (async () => {
                try {
                    const config = await api.get('/JellyfinEnhanced/public-config', null, {
                        suppressUnauthorized: true,
                        timeout: 5000
                    });
                    if (!this._valid() || field(config, 'NativePosterTagsEnabled') !== true) return false;
                    const user = await api
                        .get(
                            '/JellyfinEnhanced/user-settings/' + encodeURIComponent(api.userId) + '/settings.json',
                            null,
                            { suppressUnauthorized: true, timeout: 5000 }
                        )
                        .catch(() => null);
                    return this._valid() && field(user, 'UseNativePosterTags') !== false;
                } catch {
                    return false;
                }
            })();
        return this._modePromise;
    }

    async prepare(items) {
        if (!Array.isArray(items) || !items.length) return items;
        const enabled = await this.isNativeEnabled();
        if (!this._valid()) return items;
        if (!enabled) return items.map((item) => ({ ...item, _nativePosterTagsEnabled: false }));
        const candidates = items.filter(
            (item) => types.has(item.Type) && item.Id && !String(item.Id).startsWith('tmdb-')
        );
        this._fetch(candidates.map((item) => item.Id));
        const result = await Promise.all(
            items.map(async (item) => {
                if (!types.has(item.Type)) return item;
                const fresh = await this._items.get(key(item.Id));
                return { ...mergeServerArtwork(item, fresh), _nativePosterTagsEnabled: true };
            })
        );
        if (!this._valid()) return items;
        const parentIds = result
            .filter(
                (item) =>
                    ['Episode', 'Season'].includes(item.Type) &&
                    item.SeriesId &&
                    !hasServerPosterTag(item.SeriesPrimaryImageTag)
            )
            .map((item) => item.SeriesId);
        this._fetch(parentIds);
        const completed = await Promise.all(
            result.map(async (item) => {
                if (!item.SeriesId || hasServerPosterTag(item.SeriesPrimaryImageTag)) return item;
                const parent = await this._items.get(key(item.SeriesId));
                return parent
                    ? {
                          ...item,
                          SeriesPrimaryImageTag: parent.ImageTags?.Primary || item.SeriesPrimaryImageTag,
                          SeriesThumbImageTag: parent.ImageTags?.Thumb || item.SeriesThumbImageTag
                      }
                    : item;
            })
        );
        return this._valid() ? completed : items;
    }

    _fetch(ids) {
        const missing = [...new Set(ids.map(key))].filter((id) => id && !this._items.has(id));
        // Standard QueryResult<BaseItemDto> is stamped by Enhanced; companion
        // merged/batch wrapper responses are not always recognised by that filter.
        for (let start = 0; start < missing.length; start += 100) {
            const batch = missing.slice(start, start + 100);
            const request = api
                .getItems(
                    {
                        Ids: batch.join(','),
                        Limit: batch.length,
                        Fields: 'ImageBlurHashes,SeriesPrimaryImageTag,SeriesThumbImageTag',
                        EnableImageTypes: 'Primary,Thumb,Backdrop',
                        ImageTypeLimit: 1,
                        EnableTotalRecordCount: false
                    },
                    { timeout: 6000, suppressUnauthorized: true }
                )
                .then((response) => new Map((response?.Items || []).map((item) => [key(item.Id), item])))
                .catch(() => new Map());
            batch.forEach((id) =>
                this._items.set(
                    id,
                    request.then((result) => result.get(id) || null)
                )
            );
        }
    }

    renderCard(item, options) {
        return CardRenderer.createCardHtml(item, options);
    }

    destroy() {
        this._active = false;
        this._items.clear();
    }
}
