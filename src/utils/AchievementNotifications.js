/**
 * Lightweight achievements notification watcher.
 * Uses the user's own Jellyfin server API, respects server device notification policy
 * and never fetches badge history as new on first boot.
 */
import { achievementBadges } from '../api/AchievementBadgesClient.js';
import { api } from '../api/ApiClient.js';
import { auth } from '../api/AuthManager.js';
import { eventBus } from '../core/EventBus.js';
import { storage } from '../utils/StorageService.js';
import { achievementCornerToasts } from './AchievementCornerToasts.js';
import { i18n } from './i18n.js';
import { logger } from '../utils/Logger.js';

const log = logger.create('AchievementNotifications');
const POLL_INTERVAL = 90000;

export class AchievementNotifications {
    constructor() {
        this._started = false;
        this._interval = null;
        this._inflight = false;
        this._user = null;
        this._since = '';
        this._enabled = true;
        this._preferences = null;
        this._lastUnread = null;
        this._features = null;
        this._prefsFetchedAt = 0;
        this._playing = false;
        this._onPlay = () => { this._playing = true; achievementCornerToasts.setPlaybackPlaying(true); };
        this._onAuth = () => this._syncUser();
        this._onPlayback = () => { this._playing = false; achievementCornerToasts.setPlaybackPlaying(false); this.check(); };
        this._onPause = () => { this._playing = false; achievementCornerToasts.setPlaybackPlaying(false); };
        this._onVisibility = () => { if (!document.hidden) this.check(); };
    }

    // Compatibility with the unchanged game-center App lifecycle.
    init() { this.start(); }
    destroy() { this.stop(); }

    start() {
        if (this._started) return;
        this._started = true;
        eventBus.on('auth:login', this._onAuth);
        eventBus.on('auth:restored', this._onAuth);
        eventBus.on('auth:logout', this._onAuth);
        eventBus.on('player:stop', this._onPlayback);
        eventBus.on('player:play', this._onPlay);
        eventBus.on('player:pause', this._onPause);
        document.addEventListener('visibilitychange', this._onVisibility);
        this._syncUser();
        this._interval = setInterval(() => this.check(), POLL_INTERVAL);
    }

    stop() {
        if (!this._started) return;
        this._started = false;
        clearInterval(this._interval);
        this._interval = null;
        eventBus.off('auth:login', this._onAuth);
        eventBus.off('auth:restored', this._onAuth);
        eventBus.off('auth:logout', this._onAuth);
        eventBus.off('player:stop', this._onPlayback);
        eventBus.off('player:play', this._onPlay);
        eventBus.off('player:pause', this._onPause);
        document.removeEventListener('visibilitychange', this._onVisibility);
        achievementCornerToasts.clear();
    }

    _syncUser() {
        const user = auth.isAuthenticated() ? api.userId : null;
        if (this._user === user) return;
        this._user = user;
        this._since = '';
        this._enabled = true;
        this._preferences = null;
        this._lastUnread = null;
        this._features = null;
        this._prefsFetchedAt = 0;
        this._playing = false;
        achievementCornerToasts.setPlaybackPlaying(false);
        achievementCornerToasts.clear();
        if (!user) return;
        const stored = storage.getItem('achievementBadges:seen:' + (api.serverUrl || '') + ':' + user);
        // On first connection, start at current time; historic unlocks must not appear as new.
        this._since = stored || new Date().toISOString();
        this._store();
    }

    _store() {
        if (this._user && this._since) {
            storage.setItem('achievementBadges:seen:' + (api.serverUrl || '') + ':' + this._user, this._since);
        }
    }

    async check() {
        if (!this._started || !this._user || !this._enabled || this._inflight || document.hidden) return;
        // Never leak private notifications on user picker, login or PIN-gated screens.
        const route = (window.location.hash || '').split('?')[0];
        if (route === '#/profiles' || route === '#/login' || route === '#/offline') return;
        if (!auth.isAuthenticated() || api.userId !== this._user || api.isEmby()) return;
        const user = this._user;
        const since = this._since;
        this._inflight = true;
        try {
            // Refresh preferences periodically, including changes saved on another device.
            if (!this._preferences || Date.now() - this._prefsFetchedAt > 300000) {
                const [prefs, server, flags] = await Promise.all([
                    achievementBadges.getPreferences(),
                    achievementBadges.getPublicConfig().catch(() => ({})),
                    achievementBadges.getUiFeatures().catch(() => ({}))
                ]);
                if (user !== this._user) return;
                this._preferences = prefs || {};
                this._features = flags || {};
                this._prefsFetchedAt = Date.now();
                achievementCornerToasts.configure(user, this._preferences, server || {});
            }
            const preferences = this._preferences || {};
            const response = await achievementBadges.getUnlocksSince(since, api.deviceId);
            if (user !== this._user) return;
            const list = Array.isArray(response?.Badges) ? response.Badges : [];
            const now = response?.Now || new Date().toISOString();
            this._since = String(now);
            this._store();
            // Cap notifications to avoid flooding user after offline periods.
            const order = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, mythic: 5 };
            const minRarity = String(preferences.MinimumToastRarity || 'all').toLowerCase();
            const rank = minRarity === 'all' ? 0 : (order[minRarity] ?? 0);
            const language = String(i18n.currentLang || '').toLowerCase().startsWith('ru') ? 'ru' : 'en';
            if (this._features?.EnableUnlockToasts !== false &&
                preferences.EnableUnlockToasts !== false &&
                !(this._playing && preferences.MuteToastsDuringPlayback)) {
                const seenKey = 'achievementBadges:shown:' + (api.serverUrl || '') + ':' + user;
                let seen = {};
                try { seen = JSON.parse(storage.getItem(seenKey) || '{}'); } catch (_) { seen = {}; }
                const fresh = [];
                list.forEach(badge => {
                    if (!badge || !badge.Id) return;
                    const key = String(badge.Id) + '|' + String(badge.UnlockedAt || '');
                    if (seen[key]) return;
                    seen[key] = Date.now();
                    if ((order[String(badge.Rarity || 'common').toLowerCase()] ?? 0) >= rank) fresh.push(badge);
                });
                const keys = Object.keys(seen);
                if (keys.length > 400) {
                    keys.sort((a, b) => seen[a] - seen[b]);
                    keys.slice(0, keys.length - 320).forEach(key => delete seen[key]);
                }
                storage.setItem(seenKey, JSON.stringify(seen));
                achievementCornerToasts.showBatch(fresh.slice(0, 12), language);
            }
            if (this._features?.EnableMilestoneToasts !== false &&
                preferences.EnableMilestoneToasts !== false) {
                try {
                    const milestones = await achievementBadges.checkMilestones();
                    if (user !== this._user) return;
                    const newly = Array.isArray(milestones?.NewlyReached) ? milestones.NewlyReached : [];
                    newly.slice(0, 4).forEach(pct => achievementCornerToasts.showMilestone(pct, language));
                } catch (e) {
                    log.debug('Milestone notifications unavailable', e);
                }
            }
            if (preferences.MessageNotifications !== false) {
                try {
                    const unread = await achievementBadges.getUnreadCount();
                    if (user !== this._user) return;
                    const count = Number(unread?.Count || 0);
                    if (this._lastUnread !== null && count > this._lastUnread &&
                        !(this._playing && preferences.MuteMessageNotificationsDuringPlayback)) {
                        const russian = String(i18n.currentLang || '').toLowerCase().startsWith('ru');
                        achievementCornerToasts.showMessage(count, russian ? 'ru' : 'en');
                    }
                    this._lastUnread = count;
                } catch (error) { log.debug('Message count poll skipped', error); }
            }
        } catch (err) {
            if (err.status === 404) this._enabled = false;
            log.debug('Achievement unlock poll skipped', err);
        } finally {
            this._inflight = false;
        }
    }
}

export const achievementNotifications = new AchievementNotifications();
