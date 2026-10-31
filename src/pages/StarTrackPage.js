import Page from './Page.js';
import { api } from '../api/index.js';
import { router } from '../core/Router.js';
import { serverPluginClient } from '../plugins/ServerPluginClient.js';
import { focusManager } from '../ui/FocusManager.js';
import { i18n } from '../utils/i18n.js';
import { logger } from '../utils/Logger.js';
import '../styles/startrack.css';

const log = logger.create('StarTrackPage');
const ROOT = '/Plugins/StarTrack';
const TABS = [
    ['ratings', 'Мои оценки', 'My Ratings', '/MyRatings?limit=100'],
    ['reviews', 'Отзывы', 'Reviews', '/Recent?limit=100'],
    ['watchlist', 'Посмотреть позже', 'Watchlist', '/MyWatchlist'],
    ['diary', 'Дневник', 'Diary', '/MyDiary?limit=100'],
    ['favorites', 'Избранное', 'Favourites', '/MyFavorites'],
    ['likes', 'Понравилось', 'Liked', '/MyLikes'],
    ['recommendations', 'Для меня', 'For You', '/Recommendations?limit=30'],
    ['lists', 'Мои списки', 'My Lists', '/Lists']
];

function esc(value) {
    return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function field(object, key, fallback) {
    if (!object) return fallback;
    if (object[key] != null) return object[key];
    const upper = key.charAt(0).toUpperCase() + key.slice(1);
    return object[upper] == null ? fallback : object[upper];
}
function mediaId(record) {
    return typeof record === 'string' ? record : field(record, 'itemId', field(record, 'id', ''));
}
function rating(value) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? String(Math.round(n * 10) / 10).replace(/\.0$/, '') : '';
}

export default class StarTrackPage extends Page {
    constructor() {
        super();
        this._isAsyncPage = true;
        this._tab = 'ratings';
        this._cache = Object.create(null);
        this._records = [];
        this._entries = [];
        this._lists = [];
        this._list = null;
        this._listEntries = [];
        this._loading = false;
        this._error = '';
    }

    _ru() {
        return String((typeof document !== 'undefined' && document.documentElement.lang) ||
            i18n.currentLang || 'en').toLowerCase().indexOf('ru') === 0;
    }
    _t(ru, en) { return this._ru() ? ru : en; }

    render() {
        const tabs = TABS.map((tab) => '<button class="startrack-tab' +
            (tab[0] === this._tab ? ' active' : '') + '" type="button" tabindex="0" data-startrack-tab="' +
            tab[0] + '">' + this._t(tab[1], tab[2]) + '</button>').join('');
        return '<div class="page startrack-page"><main class="page-content startrack-page-content">' +
            '<header class="startrack-header"><div><div class="startrack-eyebrow">STARTRACK · PERSONAL MOVIE JOURNAL</div>' +
            '<h1>' + this._t('Моя киноколлекция', 'My Movie Journal') + '</h1>' +
            '<p>' + this._t('Оценки, список просмотра, дневник и персональные рекомендации.',
                'Your ratings, watchlist, diary and personal recommendations.') + '</p></div>' +
            '<button class="startrack-refresh" id="startrack-refresh" type="button" tabindex="0">↻ ' +
            this._t('Обновить', 'Refresh') + '</button></header>' +
            '<nav class="startrack-tabs" id="startrack-tabs">' + tabs + '</nav>' +
            '<section class="startrack-content" id="startrack-content" aria-live="polite">' +
            '<div class="startrack-loading">' + this._t('Загружаем…', 'Loading…') + '</div>' +
            '</section></main></div>';
    }

    async onInit() {
        this.title = this._t('Мои оценки', 'My Ratings');
        this._bindEvents();
        this._registerFocus();
        await this._load(this._tab);
        this.markReady();
    }

    _bindEvents() {
        this.el.addEventListener('click', (event) => {
            const target = event.target;
            if (!target || !target.closest) return;
            const tab = target.closest('[data-startrack-tab]');
            if (tab) { this._load(tab.getAttribute('data-startrack-tab')); return; }
            if (target.closest('#startrack-refresh')) {
                this._cache = Object.create(null);
                this._load(this._tab, true);
                return;
            }
            if (target.closest('[data-startrack-back]')) {
                this._list = null;
                this._listEntries = [];
                this._renderContent();
                return;
            }
            if (target.closest('[data-startrack-create-list]')) {
                void this._createList();
                return;
            }
            const list = target.closest('[data-startrack-list-id]');
            if (list) { this._openList(list.getAttribute('data-startrack-list-id')); return; }
            const action = target.closest('[data-startrack-action]');
            if (action) { this._action(action); return; }
            const card = target.closest('.media-card');
            if (card && card.dataset.itemId) {
                const type = card.dataset.itemType || card.dataset.type || '';
                router.navigate((type === 'Person' || type === 'MusicArtist' || type === 'Artist'
                    ? '/person/' : '/details/') + encodeURIComponent(card.dataset.itemId));
            }
        });
    }

    _registerFocus() {
        const header = this.$('.startrack-header');
        const tabs = this.$('#startrack-tabs');
        const content = this.$('#startrack-content');
        if (header) this.registerFocusSection('my-ratings-header', header, {
            orientation: 'horizontal', selector: '#startrack-refresh', leaveDown: 'my-ratings-tabs', leaveLeft: 'sidebar'
        });
        if (tabs) this.registerFocusSection('my-ratings-tabs', tabs, {
            orientation: 'horizontal', selector: '.startrack-tab', leaveUp: 'my-ratings-header',
            leaveDown: 'my-ratings-content', leaveLeft: 'sidebar'
        });
        if (content) this.registerFocusSection('my-ratings-content', content, {
            orientation: 'grid', selector: '.media-card, .startrack-action, .startrack-list-card, .startrack-back, .startrack-list-control, .startrack-list-delete, .startrack-list-remove',
            leaveUp: 'my-ratings-tabs', leaveLeft: 'sidebar'
        });
        this.setActiveSection('my-ratings-tabs');
    }

    async _load(tabId, force) {
        const tab = TABS.find((entry) => entry[0] === tabId);
        if (!tab || !this.el) return;
        this._tab = tabId;
        this._list = null;
        this._listEntries = [];
        this._error = '';
        this._loading = true;
        this._updateTabs();
        this._renderContent();

        if (!force && this._cache[tabId]) {
            this._records = this._cache[tabId].records;
            this._entries = this._cache[tabId].entries;
            this._lists = this._cache[tabId].lists;
            this._loading = false;
            this._renderContent();
            return;
        }

        try {
            const data = await serverPluginClient.call(ROOT + tab[3]);
            this._records = Array.isArray(data) ? data : [];
            this._lists = tabId === 'lists' ? this._records : [];
            const visibleRecords = tabId === 'reviews'
                ? this._records.filter((record) => String(field(record, 'review', '') || '').trim())
                : this._records;
            this._entries = tabId === 'lists' ? [] : await this._hydrate(visibleRecords);
            this._cache[tabId] = { records: this._records, entries: this._entries, lists: this._lists };
        } catch (error) {
            log.warn('StarTrack API request failed:', error);
            this._error = this._t('Не удалось получить данные StarTrack. Проверь серверный плагин.',
                'Could not load StarTrack data. Check the server plugin.');
            this._records = [];
            this._entries = [];
            this._lists = [];
        }
        this._loading = false;
        this._renderContent();
    }

    async _hydrate(records) {
        const ids = [];
        const seen = Object.create(null);
        records.forEach((record) => {
            const id = mediaId(record);
            if (id && !seen[id]) { seen[id] = true; ids.push(id); }
        });
        if (!ids.length) return [];
        // Single Jellyfin call for all poster records; no per-item request burst.
        const result = await api.getItems({
            Ids: ids.join(','), Limit: ids.length,
            Fields: 'DateCreated,ProductionYear,CommunityRating,Overview,UserData,MediaSourceCount'
        });
        const byId = Object.create(null);
        (Array.isArray(result && result.Items) ? result.Items : []).forEach((item) => {
            if (item && item.Id) byId[item.Id] = item;
        });
        return records.reduce((items, record) => {
            const id = mediaId(record);
            if (id && byId[id]) items.push({ item: byId[id], record: record });
            return items;
        }, []);
    }

    _updateTabs() {
        this.$$('#startrack-tabs .startrack-tab').forEach((button) => {
            const active = button.getAttribute('data-startrack-tab') === this._tab;
            button.classList.toggle('active', active);
            button.setAttribute('aria-selected', active ? 'true' : 'false');
        });
    }

    _renderContent() {
        const el = this.$('#startrack-content');
        if (!el) return;
        if (this._loading) {
            el.innerHTML = '<div class="startrack-loading">' + this._t('Загружаем…', 'Loading…') + '</div>';
        } else if (this._error) {
            el.innerHTML = '<div class="startrack-error">' + esc(this._error) + '</div>';
        } else if (this._list) {
            el.innerHTML = this._renderList();
        } else if (this._tab === 'lists') {
            el.innerHTML = this._renderLists();
        } else if (!this._entries.length) {
            el.innerHTML = this._renderEmpty();
        } else if (this._tab === 'favorites') {
            el.innerHTML = this._renderFavorites();
        } else {
            el.innerHTML = '<div class="startrack-grid">' +
                this._entries.map((entry) => this._renderEntry(entry)).join('') + '</div>';
        }
        focusManager.invalidateCache('my-ratings-content');
    }

    _renderEmpty() {
        const titles = {
            ratings: ['Оценок пока нет', 'No ratings yet'],
            reviews: ['Отзывов пока нет', 'No reviews yet'],
            watchlist: ['Список пока пуст', 'Your watchlist is empty'],
            diary: ['Дневник пока пуст', 'Your diary is empty'],
            favorites: ['Избранного пока нет', 'No favourites yet'],
            likes: ['Пока ничего не понравилось', 'No liked titles yet'],
            recommendations: ['Пока нет рекомендаций', 'No recommendations yet']
        };
        const pair = titles[this._tab] || ['Здесь пока пусто', 'Nothing here yet'];
        return '<div class="startrack-empty"><div class="startrack-empty-icon">★</div><h2>' +
            this._t(pair[0], pair[1]) + '</h2><p>' +
            this._t('Открой страницу фильма или сериала, чтобы добавить его в свою коллекцию.',
                'Open a title details page to add it to your collection.') + '</p></div>';
    }

    _button(action, id, label, entryId) {
        let attrs = ' data-startrack-action="' + esc(action) + '"';
        if (id) attrs += ' data-item-id="' + esc(id) + '"';
        if (entryId) attrs += ' data-entry-id="' + esc(entryId) + '"';
        return '<button class="startrack-action" type="button" tabindex="0"' + attrs + '>' + esc(label) + '</button>';
    }

    _renderEntry(entry) {
        const item = entry.item;
        const record = entry.record || {};
        const id = mediaId(record) || item.Id;
        let meta = '';
        let action = '';
        if (this._tab === 'ratings') {
            meta = '<span class="startrack-score">★ ' + esc(rating(field(record, 'stars', ''))) + '</span>' +
                '<span class="startrack-date">' + esc(this._date(field(record, 'ratedAt', ''))) + '</span>';
            if (field(record, 'review', '')) meta += '<span class="startrack-review">' + esc(field(record, 'review', '')) + '</span>';
            action = this._button('remove-rating', id, this._t('Удалить оценку', 'Remove rating'));
        } else if (this._tab === 'watchlist') {
            meta = '<span class="startrack-entry-label">' + this._t('В списке просмотра', 'On your watchlist') + '</span>';
            action = this._button('remove-watchlist', id, this._t('Убрать', 'Remove'));
        } else if (this._tab === 'diary') {
            const stars = field(record, 'stars', null);
            if (stars) meta += '<span class="startrack-score">★ ' + esc(rating(stars)) + '</span>';
            meta += '<span class="startrack-date">' + esc(this._date(field(record, 'watchedAt', ''))) + '</span>';
            if (field(record, 'rewatch', false)) meta += '<span class="startrack-rewatch">' + this._t('Пересмотр', 'Rewatch') + '</span>';
            action = this._button('remove-diary', '', this._t('Удалить запись', 'Delete entry'), field(record, 'id', ''));
        } else if (this._tab === 'likes') {
            meta = '<span class="startrack-entry-label">♥ ' + this._t('Понравилось', 'Liked') + '</span>';
            action = this._button('remove-like', id, this._t('Убрать', 'Remove'));
        } else if (this._tab === 'favorites') {
            meta = '<span class="startrack-entry-label">★ ' + this._t('Избранное', 'Top pick') + '</span>';
            action = this._button('remove-favorite', id, this._t('Убрать', 'Remove'));
        } else if (this._tab === 'reviews') {
            const stars = field(record, 'stars', null);
            if (stars) meta += '<span class="startrack-score">★ ' + esc(rating(stars)) + '</span>';
            meta += '<span class="startrack-review-author">' + esc(field(record, 'userName', this._t('Пользователь', 'Member'))) + '</span>';
            meta += '<span class="startrack-date">' + esc(this._date(field(record, 'ratedAt', ''))) + '</span>';
            meta += '<span class="startrack-review">' + esc(field(record, 'review', '')) + '</span>';
        } else if (this._tab === 'recommendations') {
            meta = '<span class="startrack-entry-label">' + esc(field(record, 'reason', this._t('Подобрано для тебя', 'Picked for you'))) + '</span>';
            action = this._button('add-watchlist', id, this._t('Посмотреть позже', 'Add to watchlist'));
        }
        return '<article class="startrack-entry">' + this._renderMediaCard(item, false, 'poster', 'home') +
            '<div class="startrack-entry-meta">' + meta + action + '</div></article>';
    }

    _currentUserId() {
        const value = typeof api.userId === 'function' ? api.userId() : api.userId || api._userId;
        return String(value || '').replace(/-/g, '').toLowerCase();
    }

    _renderFavorites() {
        const labels = {
            Movie: this._t('Топ-4 фильмов', 'Top 4 Movies'),
            Series: this._t('Топ-4 сериалов', 'Top 4 Series'),
            Season: this._t('Топ-4 сезонов', 'Top 4 Seasons'),
            Episode: this._t('Топ-4 эпизодов', 'Top 4 Episodes')
        };
        const order = ['Movie', 'Series', 'Season', 'Episode'];
        const groups = Object.create(null);
        this._entries.forEach((entry) => {
            const type = String(field(entry.item, 'type', 'Other') || 'Other');
            if (!groups[type]) groups[type] = [];
            groups[type].push(entry);
        });
        return order.concat(Object.keys(groups).filter((type) => order.indexOf(type) < 0)).filter((type) => groups[type] && groups[type].length)
            .map((type) => '<section class="startrack-favorites-group"><h2>' +
                esc(labels[type] || type) + '</h2><div class="startrack-grid">' +
                groups[type].map((entry) => this._renderEntry(entry)).join('') + '</div></section>')
            .join('');
    }

    _renderLists() {
        const currentUserId = this._currentUserId();
        const cards = this._lists.map((list) => {
            const id = field(list, 'id', '');
            const name = field(list, 'name', this._t('Без названия', 'Untitled list'));
            const description = field(list, 'description', '');
            const rows = field(list, 'items', []);
            const isOwner = !!currentUserId && String(field(list, 'ownerId', '')).replace(/-/g, '').toLowerCase() === currentUserId;
            const visibility = field(list, 'isPrivate', false)
                ? this._t('Личный', 'Private')
                : field(list, 'collaborative', true)
                    ? this._t('Совместный', 'Collaborative')
                    : this._t('Обычный', 'Standard');
            const meta = [field(list, 'ownerName', ''), visibility].filter(Boolean).join(' · ');
            return '<article class="startrack-list-card-wrap">' +
                '<button class="startrack-list-card" type="button" tabindex="0" data-startrack-list-id="' +
                esc(id) + '"><span class="startrack-list-icon">☷</span><strong>' + esc(name) + '</strong>' +
                (description ? '<span>' + esc(description) + '</span>' : '') +
                (meta ? '<small>' + esc(meta) + '</small>' : '') +
                '<small>' + (Array.isArray(rows) ? rows.length : 0) + ' ' + this._t('элементов', 'items') + '</small></button>' +
                (isOwner ? '<button class="startrack-list-delete" type="button" tabindex="0" data-startrack-action="delete-list" data-list-id="' + esc(id) + '">' +
                    this._t('Удалить список', 'Delete list') + '</button>' : '') +
                '</article>';
        }).join('');

        return '<div class="startrack-list-create">' +
            '<input class="startrack-list-control" id="startrack-list-name" type="text" maxlength="120" autocomplete="off" placeholder="' +
                this._t('Название нового списка', 'New list name') + '" aria-label="' + this._t('Название списка', 'List name') + '">' +
            '<input class="startrack-list-control" id="startrack-list-description" type="text" maxlength="2000" autocomplete="off" placeholder="' +
                this._t('Описание (необязательно)', 'Description (optional)') + '" aria-label="' + this._t('Описание списка', 'List description') + '">' +
            '<button class="startrack-list-control startrack-action" type="button" tabindex="0" data-startrack-create-list="true">' +
                this._t('Создать список', 'Create list') + '</button>' +
            '<span class="startrack-list-create-message" id="startrack-list-create-message" aria-live="polite"></span>' +
            '</div>' +
            (cards ? '<div class="startrack-list-grid">' + cards + '</div>' :
                '<div class="startrack-empty"><div class="startrack-empty-icon">☷</div><h2>' +
                this._t('Списков пока нет', 'No lists yet') + '</h2><p>' +
                this._t('Создай первый список, чтобы собирать фильмы и сериалы.', 'Create your first list to collect movies and series.') +
                '</p></div>');
    }

    async _openList(id) {
        if (!id) return;
        this._error = '';
        this._loading = true;
        this._renderContent();
        try {
            this._list = await serverPluginClient.call(ROOT + '/Lists/' + encodeURIComponent(id));
            const rows = field(this._list, 'items', []);
            this._listEntries = await this._hydrate(Array.isArray(rows) ? rows : []);
        } catch (error) {
            log.warn('StarTrack list failed to load:', error);
            this._error = this._t('Не удалось открыть список.', 'Could not open this list.');
        }
        this._loading = false;
        this._renderContent();
    }

    _renderList() {
        const title = field(this._list, 'name', this._t('Список', 'List'));
        const currentUserId = this._currentUserId();
        const ownerId = String(field(this._list, 'ownerId', '')).replace(/-/g, '').toLowerCase();
        const isOwner = !!currentUserId && ownerId === currentUserId;
        const cards = this._listEntries.map((entry) => {
            const record = entry.record || {};
            const id = mediaId(record) || entry.item.Id;
            const addedBy = String(field(record, 'addedBy', '')).replace(/-/g, '').toLowerCase();
            const canRemove = isOwner || (!!currentUserId && addedBy === currentUserId);
            const by = field(record, 'addedByName', '');
            const date = this._date(field(record, 'addedAt', ''));
            const meta = [by, date].filter(Boolean).join(' · ');
            return '<article class="startrack-entry">' + this._renderMediaCard(entry.item, false, 'poster', 'home') +
                '<div class="startrack-entry-meta">' + (meta ? '<span class="startrack-date">' + esc(meta) + '</span>' : '') +
                (canRemove ? '<button class="startrack-action startrack-list-remove" type="button" tabindex="0" data-startrack-action="remove-list-item" data-item-id="' + esc(id) + '">' +
                    this._t('Убрать из списка', 'Remove from list') + '</button>' : '') +
                '</div></article>';
        }).join('');
        const deleteButton = isOwner
            ? '<button class="startrack-list-delete" type="button" tabindex="0" data-startrack-action="delete-list" data-list-id="' +
                esc(field(this._list, 'id', '')) + '">' + this._t('Удалить список', 'Delete list') + '</button>'
            : '';
        return '<div class="startrack-list-toolbar"><button class="startrack-back" type="button" tabindex="0" data-startrack-back="true">‹ ' +
            this._t('Все списки', 'All lists') + '</button><h2>' + esc(title) + '</h2>' + deleteButton + '</div>' +
            (cards ? '<div class="startrack-grid">' + cards + '</div>' :
                '<div class="startrack-empty">' + this._t('Список пуст.', 'This list is empty.') + '</div>');
    }

    async _action(button) {
        const action = button.getAttribute('data-startrack-action');
        const id = button.getAttribute('data-item-id');
        const entryId = button.getAttribute('data-entry-id');
        button.disabled = true;
        try {
            if (action === 'remove-rating' && id) await serverPluginClient.call(ROOT + '/Ratings/' + encodeURIComponent(id), 'DELETE');
            else if (action === 'remove-watchlist' && id) await serverPluginClient.call(ROOT + '/Watchlist/' + encodeURIComponent(id), 'DELETE');
            else if (action === 'remove-like' && id) await serverPluginClient.call(ROOT + '/Likes/' + encodeURIComponent(id), 'DELETE');
            else if (action === 'remove-diary' && entryId) await serverPluginClient.call(ROOT + '/Diary/' + encodeURIComponent(entryId), 'DELETE');
            else if (action === 'remove-favorite' && id) {
                const remaining = this._records.filter((value) => String(value).toLowerCase() !== String(id).toLowerCase());
                await serverPluginClient.call(ROOT + '/MyFavorites', 'POST', { itemIds: remaining });
            } else if (action === 'add-watchlist' && id) {
                await serverPluginClient.call(ROOT + '/Watchlist/' + encodeURIComponent(id), 'POST', {});
            } else if (action === 'remove-list-item' && id && this._list) {
                const listId = field(this._list, 'id', '');
                await serverPluginClient.call(ROOT + '/Lists/' + encodeURIComponent(listId) +
                    '/Items/' + encodeURIComponent(id), 'DELETE');
                this._cache = Object.create(null);
                await this._openList(listId);
                return;
            } else if (action === 'delete-list') {
                const listId = button.getAttribute('data-list-id') || field(this._list, 'id', '');
                if (!listId) return;
                if (this._pendingDeleteListId !== listId) {
                    this._pendingDeleteListId = listId;
                    button.textContent = this._t('Нажми ещё раз для удаления', 'Press again to delete');
                    button.disabled = false;
                    return;
                }
                await serverPluginClient.call(ROOT + '/Lists/' + encodeURIComponent(listId), 'DELETE');
                this._pendingDeleteListId = null;
            } else { button.disabled = false; return; }
            this._cache = Object.create(null);
            await this._load(this._tab, true);
        } catch (error) {
            log.warn('StarTrack action failed:', error);
            button.disabled = false;
            button.textContent = this._t('Не удалось выполнить', 'Action failed');
        }
    }

    async _createList() {
        const nameField = this.$('#startrack-list-name');
        const descriptionField = this.$('#startrack-list-description');
        const message = this.$('#startrack-list-create-message');
        const button = this.$('[data-startrack-create-list]');
        const name = nameField ? String(nameField.value || '').trim() : '';
        const description = descriptionField ? String(descriptionField.value || '').trim() : '';
        if (!name) {
            if (message) message.textContent = this._t('Введи название списка.', 'Enter a list name.');
            return;
        }
        if (button) button.disabled = true;
        try {
            await serverPluginClient.call(ROOT + '/Lists', 'POST', {
                name: name,
                description: description || null,
                collaborative: true,
                isPrivate: false
            });
            this._pendingDeleteListId = null;
            this._cache = Object.create(null);
            await this._load('lists', true);
        } catch (error) {
            log.warn('StarTrack list creation failed:', error);
            if (message) message.textContent = this._t('Не удалось создать список.', 'Could not create the list.');
            if (button) button.disabled = false;
        }
    }

    _date(value) {
        if (!value) return '';
        const d = new Date(value);
        if (!Number.isFinite(d.getTime())) return '';
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return this._ru() ? day + '.' + month + '.' + d.getFullYear() : month + '/' + day + '/' + d.getFullYear();
    }
}
