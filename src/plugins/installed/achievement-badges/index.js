/**
 * Native Litefin adapter for the Jellyfin Achievement Badges server plugin.
 *
 * The client reads user-owned badge information only. Unlocking, scoring,
 * quests, shop transactions, cosmetics and friends remain server-owned.
 */

import './achievement-badges.css';
import { i18n } from '../../../utils/i18n.js';

const CACHE_TTL = 2 * 60 * 1000;

function asArray(value) {
    if (Array.isArray(value)) return value;
    if (value && Array.isArray(value.Items)) return value.Items;
    return [];
}

function badgeTitle(badge) {
    return String(badge && (badge.Title || badge.title || badge.Key || badge.key || badge.Id) || 'Значок');
}

export default {
    id: 'achievement-badges',
    name: 'Achievement Badges',
    version: '1.0.0',
    description: 'Экипированные и недавно открытые значки на главной странице Litefin.',
    serverDependency: 'achievement-badges',
    defaultEnabled: true,

    _data: { equipped: [], recent: [] },
    _lastFetched: 0,
    _loading: null,
    _dataScopeKey: null,
    _mountedWrapper: null,

    init(api) {
        this.api = api;
        this._mountedWrapper = null;

        api.addHomeWidget({
            id: 'achievement-summary',
            name: 'Achievement Badges',
            order: 20,
            focusOptions: {
                orientation: 'vertical',
                leaveLeft: 'sidebar'
            },
            render: () => this._createHomeWidget(api),
            onMount: (wrapper) => {
                this._mountedWrapper = wrapper;
                void this._refresh(api);
            },
            onUnmount: () => {
                this._mountedWrapper = null;
            }
        });

        api.log.info('Achievement Badges native widget registered');
    },

    _getScopeKey(api) {
        const userId = api.getCurrentUserId();
        if (!userId) return null;
        return String(api.serverUrl || '') + '|' + String(userId);
    },

    async _refresh(api) {
        const userId = api.getCurrentUserId();
        const scopeKey = this._getScopeKey(api);
        if (!userId || !scopeKey) return null;

        if (this._loading && this._loading.scopeKey === scopeKey) {
            return this._loading.promise;
        }

        if (this._dataScopeKey !== scopeKey) {
            // Never show another profile's badges while the new profile loads.
            this._data = { equipped: [], recent: [] };
            this._dataScopeKey = scopeKey;
            this._lastFetched = 0;
            this._updateHomeWidget();
        }

        if (Date.now() - this._lastFetched < CACHE_TTL) {
            this._updateHomeWidget();
            return this._data;
        }

        const userPath = '/Plugins/AchievementBadges/users/' + encodeURIComponent(userId);
        const request = { scopeKey, promise: null };
        request.promise = (async () => {
            try {
                const lang = String(i18n.currentLang || 'en').toLowerCase();
                const responses = await Promise.all([
                    api.serverPlugins.call(userPath + '/equipped?lang=' + encodeURIComponent(lang)),
                    api.serverPlugins.call(userPath + '/recent-unlocks?limit=3')
                ]);

                // Ignore a late response after a profile/server switch or plugin restart.
                if (this._loading !== request || this._getScopeKey(api) !== scopeKey) return null;

                this._data = {
                    equipped: asArray(responses[0]),
                    recent: asArray(responses[1])
                };
                this._lastFetched = Date.now();
                this._updateHomeWidget();
                return this._data;
            } catch (err) {
                if (this._loading === request && this._getScopeKey(api) === scopeKey) {
                    api.log.warn('Achievement Badges data request failed:', err && err.message);
                }
                return null;
            } finally {
                if (this._loading === request) this._loading = null;
            }
        })();
        this._loading = request;
        return request.promise;
    },

    _createHomeWidget() {
        const root = document.createElement('section');
        root.className = 'achievement-summary-widget';

        const heading = document.createElement('h2');
        heading.className = 'achievement-summary-widget__title';
        heading.textContent = 'Достижения';

        const summary = document.createElement('p');
        summary.className = 'achievement-summary-widget__summary';
        summary.textContent = 'Загрузка значков…';

        const badges = document.createElement('div');
        badges.className = 'achievement-summary-widget__badges';

        const details = document.createElement('p');
        details.className = 'achievement-summary-widget__details';
        details.hidden = true;

        const action = document.createElement('button');
        action.type = 'button';
        action.className = 'focusable achievement-summary-widget__action';
        action.tabIndex = 0;
        action.textContent = 'Показать список значков';
        action.addEventListener('click', () => {
            details.hidden = !details.hidden;
            action.textContent = details.hidden ? 'Показать список значков' : 'Скрыть список значков';
        });

        root.appendChild(heading);
        root.appendChild(summary);
        root.appendChild(badges);
        root.appendChild(details);
        root.appendChild(action);
        return root;
    },

    _updateHomeWidget() {
        const wrapper = this._mountedWrapper;
        if (!wrapper || !wrapper.isConnected) return;

        const summary = wrapper.querySelector('.achievement-summary-widget__summary');
        const badges = wrapper.querySelector('.achievement-summary-widget__badges');
        const details = wrapper.querySelector('.achievement-summary-widget__details');
        if (!summary || !badges) return;

        const equipped = this._data.equipped || [];
        const recent = this._data.recent || [];
        summary.textContent = 'Экипировано: ' + equipped.length +
            ' · Недавние открытия: ' + recent.length;

        badges.textContent = '';
        const visibleBadges = (recent.length ? recent : equipped).slice(0, 3);
        if (!visibleBadges.length) {
            const empty = document.createElement('span');
            empty.className = 'achievement-summary-widget__empty';
            empty.textContent = 'Пока нет открытых значков';
            badges.appendChild(empty);
            return;
        }

        visibleBadges.forEach((badge) => {
            const chip = document.createElement('span');
            chip.className = 'achievement-summary-widget__badge';
            chip.textContent = badgeTitle(badge);
            badges.appendChild(chip);
        });

        if (details) {
            const allBadges = equipped.concat(recent);
            const names = allBadges.map(badgeTitle);
            details.textContent = names.length ? names.join(' · ') : 'Значков пока нет';
        }
    },

    destroy() {
        this._mountedWrapper = null;
        this._loading = null;
    }
};
