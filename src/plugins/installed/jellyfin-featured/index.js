/**
 * Native home-feed adapter for Jellyfin Featured.
 *
 * Reads the plugin's authenticated /featured/items endpoint and renders a
 * compact, D-pad friendly row inside Litefin's native Home page.
 */
import './jellyfin-featured.css';

const CACHE_TTL = 5 * 60 * 1000;

function text(value) {
    return value == null ? '' : String(value);
}

export default {
    id: 'jellyfin-featured',
    name: 'Jellyfin Featured',
    version: '1.0.0',
    description: 'Показывает подборку Jellyfin Featured в нативной главной странице Litefin.',
    serverDependency: 'jellyfin-featured',
    defaultEnabled: true,

    _items: [],
    _loadedAt: 0,
    _loading: null,
    _itemsScopeKey: null,
    _wrapper: null,

    init(api) {
        this.api = api;
        this.settings = api.getStorage();
        this._wrapper = null;

        api.addFeaturedWidget({
            id: 'featured-feed',
            name: 'Featured',
            order: 5,
            focusOptions: {
                orientation: 'horizontal',
                leaveLeft: 'sidebar'
            },
            render: () => this._renderShell(),
            onMount: (wrapper) => {
                this._wrapper = wrapper;
                void this._load(api);
            },
            onUnmount: () => {
                this._wrapper = null;
            }
        });
        api.log.info('Jellyfin Featured native adapter registered');
    },

    _renderShell() {
        const root = document.createElement('section');
        root.className = 'featured-native-widget';

        const heading = document.createElement('h2');
        heading.className = 'featured-native-widget__title';
        heading.textContent = 'Для вас';

        const status = document.createElement('p');
        status.className = 'featured-native-widget__status';
        status.textContent = 'Загрузка подборки…';

        const cards = document.createElement('div');
        cards.className = 'featured-native-widget__items';

        root.appendChild(heading);
        root.appendChild(status);
        root.appendChild(cards);
        return root;
    },

    _getScopeKey(api) {
        const userId = api.getCurrentUserId();
        if (!userId) return null;
        return String(api.serverUrl || '') + '|' + String(userId);
    },

    async _load(api) {
        const scopeKey = this._getScopeKey(api);
        if (!scopeKey) return [];

        if (this._loading && this._loading.scopeKey === scopeKey) {
            return this._loading.promise;
        }

        if (this._itemsScopeKey !== scopeKey) {
            // Featured is personalized; do not reuse another profile's feed.
            this._items = [];
            this._itemsScopeKey = scopeKey;
            this._loadedAt = 0;
            this._renderItems();
        }

        if (Date.now() - this._loadedAt < CACHE_TTL) {
            this._renderItems();
            return this._items;
        }

        const request = { scopeKey, promise: null };
        request.promise = (async () => {
            try {
                const response = await api.serverPlugins.call('/featured/items');
                if (this._loading !== request || this._getScopeKey(api) !== scopeKey) return [];

                const items = response?.Items || response?.items;
                this._items = Array.isArray(items) ? items : [];
                this._loadedAt = Date.now();
                this._renderItems();
                return this._items;
            } catch (err) {
                if (this._loading === request && this._getScopeKey(api) === scopeKey) {
                    api.log.warn('Jellyfin Featured feed request failed:', err && err.message);
                    this._renderError();
                }
                return [];
            } finally {
                if (this._loading === request) this._loading = null;
            }
        })();
        this._loading = request;
        return request.promise;
    },

    _renderItems() {
        const root = this._wrapper;
        if (!root || !root.isConnected) return;

        const status = root.querySelector('.featured-native-widget__status');
        const cards = root.querySelector('.featured-native-widget__items');
        if (!status || !cards) return;

        cards.textContent = '';
        if (!this._items.length) {
            status.textContent = 'Сейчас нет доступных рекомендаций';
            return;
        }

        status.textContent = '';
        const itemLimit = Math.max(1, Math.min(16, Number(this.settings && this.settings.get('itemLimit')) || 8));
        const showMetadata = !this.settings || this.settings.get('showMetadata') !== 'false';
        this._items.slice(0, itemLimit).forEach((item) => {
            const itemId = item && (item.Id || item.id);
            if (!itemId) return;

            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'focusable featured-native-card';
            button.tabIndex = 0;
            button.dataset.itemId = text(itemId);
            button.addEventListener('click', () => this.api.openItem(itemId));

            const hasImage = item.HasImage !== undefined ? item.HasImage : item.hasImage;
            const imageType = item.ImageType || item.imageType || 'Primary';
            if (hasImage) {
                const image = document.createElement('img');
                image.className = 'featured-native-card__image';
                image.loading = 'lazy';
                image.alt = '';
                image.src = this.api.getImageUrl(itemId, imageType, {
                    maxWidth: 520,
                    quality: 85
                });
                image.onerror = () => { image.style.visibility = 'hidden'; };
                button.appendChild(image);
            }

            const title = document.createElement('span');
            title.className = 'featured-native-card__name';
            title.textContent = text(item.Name || item.name);
            button.appendChild(title);

            const metadata = [];
            const productionYear = item.ProductionYear || item.productionYear;
            const officialRating = item.OfficialRating || item.officialRating || item.official_rating;
            const communityRating = item.CommunityRating ?? item.communityRating ?? item.community_rating;
            if (showMetadata && productionYear) metadata.push(text(productionYear));
            if (showMetadata && officialRating) metadata.push(text(officialRating));
            if (showMetadata && communityRating != null) {
                metadata.push('★ ' + Number(communityRating).toFixed(1));
            }
            if (metadata.length) {
                const details = document.createElement('span');
                details.className = 'featured-native-card__meta';
                details.textContent = metadata.join(' · ');
                button.appendChild(details);
            }
            cards.appendChild(button);
        });
    },

    _renderError() {
        const status = this._wrapper?.querySelector('.featured-native-widget__status');
        if (status) status.textContent = 'Не удалось загрузить подборку';
    },

    destroy() {
        this._wrapper = null;
        this._loading = null;
    }
};
