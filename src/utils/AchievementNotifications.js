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
import { toast } from '../ui/Toast.js';
import { logger } from '../utils/Logger.js';

const log = logger.create('AchievementNotifications');
const POLL_INTERVAL = 90000;

class AchievementNotifications {
    constructor() {
        this._started = false;
        this._interval = null;
        this._inflight = false;
        this._user = null;
        this._since = '';
        this._enabled = true;
        this._onAuth = () => this._syncUser();
        this._onPlayback = () => this.check();
        this._onVisibility = () => { if (!document.hidden) this.check(); };
    }

    start() {
        if (this._started) return;
        this._started = true;
        eventBus.on('auth:login', this._onAuth);
        eventBus.on('auth:restored', this._onAuth);
        eventBus.on('auth:logout', this._onAuth);
        eventBus.on('player:stop', this._onPlayback);
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
        document.removeEventListener('visibilitychange', this._onVisibility);
    }

    _syncUser() {
        const user = auth.isAuthenticated() ? api.userId : null;
        if (this._user === user) return;
        this._user = user;
        this._since = '';
        this._enabled = true;
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
            const response = await achievementBadges.getUnlocksSince(since, api.deviceId);
            if (user !== this._user) return;
            const list = Array.isArray(response?.Badges) ? response.Badges : [];
            const now = response?.Now || new Date().toISOString();
            this._since = String(now);
            this._store();
            // Cap notifications to avoid flooding user after offline periods.
            list.slice(0, 3).reverse().forEach((badge) => {
                toast.show('🏆 ' + (badge.Title || (badge.Key || 'Achievement')), 6500, {
                    id: 'achievement-' + (badge.Id || badge.Key || ''),
                });
            });
        } catch (err) {
            if (err.status === 404) this._enabled = false;
            log.debug('Achievement unlock poll skipped', err);
        } finally {
            this._inflight = false;
        }
    }
}

export const achievementNotifications = new AchievementNotifications();
