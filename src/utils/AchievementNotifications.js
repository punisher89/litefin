/**
 * ============================================================================
 * Litefin - Achievement Badges Notifications
 * ============================================================================
 * Lightweight client-side polling for the Jellyfin Achievement Badges plugin.
 * Toasts are rendered in Litefin itself, including while the video player is
 * active. The plugin remains the source of truth for unlocks and preferences.
 * ============================================================================
 */

import { api } from '../api/ApiClient.js';
import { storage } from './StorageService.js';
import { localizeAchievementBadge } from './AchievementBadgeLocalization.js';
import { logger } from './Logger.js';

const log = logger.create('AchievementNotifications');
const POLL_INTERVAL_MS = 5000;
const PREFS_TTL_MS = 5 * 60 * 1000;
const MAX_SEEN_IDS = 300;
const RARITY_ORDER = {
    common: 0,
    uncommon: 1,
    rare: 2,
    epic: 3,
    legendary: 4,
    mythic: 5
};
const RARITY_COLORS = {
    common: '#8293a7',
    uncommon: '#279c72',
    rare: '#367fce',
    epic: '#8a68d7',
    legendary: '#c18a16',
    mythic: '#b72d49'
};

class AchievementNotifications {
    constructor() {
        this._userId = null;
        this._deviceId = '';
        this._timer = null;
        this._polling = false;
        this._cursor = null;
        this._firstPoll = false;
        this._prefs = null;
        this._prefsFetchedAt = 0;
        this._features = null;
        this._featuresFetchedAt = 0;
        this._seen = new Set();
        this._queue = [];
        this._visible = false;
        this._toastTimer = null;
        this._audioContext = null;
        this._lastWarningAt = 0;
    }

    init() {
        const userId = api.userId;
        if (!userId || !api.accessToken) return;

        if (this._userId === userId && this._timer) return;

        this.destroy();
        this._userId = userId;
        this._deviceId = api.deviceId || '';

        const suffix = String(userId) + ':' + String(this._deviceId || 'default');
        this._cursorKey = 'litefin:achievement-toast-cursor:' + suffix;
        this._seenKey = 'litefin:achievement-toast-seen:' + suffix;

        const savedCursor = storage.getItem(this._cursorKey);
        this._cursor = savedCursor || new Date().toISOString();
        this._firstPoll = !savedCursor;

        try {
            const savedSeen = JSON.parse(storage.getItem(this._seenKey) || '[]');
            if (Array.isArray(savedSeen)) this._seen = new Set(savedSeen.slice(-MAX_SEEN_IDS));
        } catch (_) {
            this._seen = new Set();
        }

        this._ensureStyles();
        this._timer = window.setInterval(() => this._poll(), POLL_INTERVAL_MS);
        this._poll();
        log.info('Achievement Badges notifications initialized');
    }

    /**
     * Show a local demonstration toast without creating or unlocking a server badge.
     * Called directly from a user-initiated button press so optional audio can play.
     */
    showTest() {
        const russian = /^ru(?:-|$)/i.test(document.documentElement.lang || '');
        this._ensureStyles();
        this._queue.unshift({
            badges: [{
                Id: 'litefin-local-notification-test',
                Rarity: 'legendary',
                Title: russian ? 'Тестовое уведомление' : 'Test notification',
                Description: russian
                    ? 'Проверка уведомлений Achievement Badges в Litefin.'
                    : 'Achievement Badges notifications are working in Litefin.',
                ScorePoints: 0
            }]
        });
        this._drainQueue(this._prefs || {});
    }

    destroy() {
        if (this._timer) {
            window.clearInterval(this._timer);
            this._timer = null;
        }
        if (this._toastTimer) {
            window.clearTimeout(this._toastTimer);
            this._toastTimer = null;
        }
        const container = document.getElementById('litefin-achievement-toast-container');
        if (container && container.parentNode) container.parentNode.removeChild(container);

        this._userId = null;
        this._deviceId = '';
        this._cursor = null;
        this._firstPoll = false;
        this._prefs = null;
        this._prefsFetchedAt = 0;
        this._features = null;
        this._featuresFetchedAt = 0;
        this._seen.clear();
        this._queue = [];
        this._visible = false;
        this._polling = false;
    }

    async _poll() {
        if (!this._userId || this._polling || api.userId !== this._userId) return;

        // Like the Jellyfin web client, the first visit seeds the cursor instead
        // of replaying achievements unlocked before this Litefin device started.
        if (this._firstPoll) {
            this._firstPoll = false;
            storage.setItem(this._cursorKey, this._cursor);
            return;
        }

        this._polling = true;
        try {
            const now = Date.now();
            if (!this._prefs || now - this._prefsFetchedAt > PREFS_TTL_MS) {
                this._prefs = await api
                    .get('Plugins/AchievementBadges/users/' + this._userId + '/preferences')
                    .catch(() => null);
                this._prefsFetchedAt = now;
            }

            if (!this._features || now - this._featuresFetchedAt > PREFS_TTL_MS) {
                this._features = await api.get('Plugins/AchievementBadges/admin/ui-features').catch(() => null);
                this._featuresFetchedAt = now;
            }

            const params = { since: this._cursor };
            if (this._deviceId) params.deviceId = this._deviceId;

            const response = await api.get(
                'Plugins/AchievementBadges/users/' + this._userId + '/unlocks-since',
                params
            );

            if (response && response.Now) {
                this._cursor = response.Now;
                storage.setItem(this._cursorKey, this._cursor);
            }

            const prefs = this._prefs || {};
            const globalEnabled = !this._features || this._features.EnableUnlockToasts !== false;
            const personalEnabled = prefs.EnableUnlockToasts !== false;

            if (globalEnabled && personalEnabled && Array.isArray(response && response.Badges)) {
                const minimum = String(prefs.MinimumToastRarity || prefs.minimumToastRarity || 'all').toLowerCase();
                const minOrder = minimum === 'all' ? 0 : (RARITY_ORDER[minimum] || 0);
                const fresh = [];

                response.Badges.forEach((badge) => {
                    if (!badge || !badge.Id) return;
                    const key = String(badge.Id) + '|' + String(badge.UnlockedAt || '');
                    if (this._seen.has(key)) return;

                    this._seen.add(key);
                    const rarity = String(badge.Rarity || 'common').toLowerCase();
                    if ((RARITY_ORDER[rarity] || 0) >= minOrder) fresh.push(badge);
                });

                this._persistSeen();
                if (fresh.length) this._queueBadges(fresh, prefs);
            }

            if (prefs.EnableMilestoneToasts !== false) {
                const milestones = await api
                    .get('Plugins/AchievementBadges/users/' + this._userId + '/check-milestones')
                    .catch(() => null);
                if (milestones && Array.isArray(milestones.NewlyReached)) {
                    milestones.NewlyReached.forEach((percentage) => {
                        this._queue.push({ milestone: Number(percentage) || 0 });
                    });
                    this._drainQueue(prefs);
                }
            }
        } catch (error) {
            const now = Date.now();
            if (now - this._lastWarningAt > 60000) {
                this._lastWarningAt = now;
                log.debug('Achievement Badges polling unavailable:', error && error.message ? error.message : error);
            }
        } finally {
            this._polling = false;
        }
    }

    _persistSeen() {
        const values = Array.from(this._seen).slice(-MAX_SEEN_IDS);
        this._seen = new Set(values);
        storage.setItem(this._seenKey, JSON.stringify(values));
    }

    _queueBadges(badges, prefs) {
        const video = document.querySelector('video');
        const watching = !!(video && !video.paused && !video.ended);
        const muteVisualDuringPlayback = prefs.MuteToastsDuringPlayback === true
            || prefs.muteToastsDuringPlayback === true;
        if (watching && muteVisualDuringPlayback) return;

        const grouping = String(prefs.UnlockToastGrouping || prefs.unlockToastGrouping || 'grouped').toLowerCase();
        if (grouping === 'individual' || badges.length === 1) {
            badges.forEach((badge) => this._queue.push({ badges: [badge] }));
        } else {
            this._queue.push({ badges });
        }
        this._drainQueue(prefs);
    }

    _drainQueue(prefs) {
        if (this._visible || !this._queue.length) return;
        const next = this._queue.shift();
        this._visible = true;
        this._renderToast(next, prefs || this._prefs || {});
    }

    _ensureStyles() {
        if (document.getElementById('litefin-achievement-toast-style')) return;

        const style = document.createElement('style');
        style.id = 'litefin-achievement-toast-style';
        style.textContent = [
            '#litefin-achievement-toast-container{position:fixed;top:28px;right:28px;width:420px;max-width:calc(100vw - 36px);z-index:2147483647;pointer-events:none;display:flex;flex-direction:column;align-items:flex-end;font-family:Arial,sans-serif;}',
            '.lf-ab-toast{width:100%;min-height:104px;box-sizing:border-box;display:flex;align-items:center;gap:16px;padding:13px 18px 13px 14px;border-radius:16px;border:1px solid rgba(255,255,255,.2);background:linear-gradient(112deg,rgba(13,19,29,.98),rgba(34,43,57,.97));box-shadow:0 12px 34px rgba(0,0,0,.5);color:#fff;opacity:0;transform:translateX(38px) scale(.97);transition:opacity .32s ease,transform .42s cubic-bezier(.2,.8,.2,1);overflow:hidden;}',
            '.lf-ab-toast.lf-ab-visible{opacity:1;transform:translateX(0) scale(1);}',
            '.lf-ab-orb{width:70px;height:70px;min-width:70px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:34px;background:radial-gradient(circle at 32% 26%,rgba(255,255,255,.42),transparent 54%),var(--lf-ab-rarity,#8293a7);box-shadow:0 0 24px var(--lf-ab-glow,rgba(130,147,167,.35)),inset 0 0 15px rgba(255,255,255,.15);}',
            '.lf-ab-copy{min-width:0;flex:1;display:flex;flex-direction:column;gap:5px;}',
            '.lf-ab-eyebrow{font-size:12px;line-height:1.2;letter-spacing:1.1px;text-transform:uppercase;font-weight:700;color:rgba(255,255,255,.78);}',
            '.lf-ab-title{font-size:19px;line-height:1.2;font-weight:800;white-space:normal;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;}',
            '.lf-ab-detail{font-size:13px;line-height:1.25;color:rgba(255,255,255,.78);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
            '.lf-ab-points{font-size:13px;font-weight:800;color:#fff;margin-top:1px;}',
            '.lf-ab-toast.lf-ab-exit{opacity:0;transform:translateX(28px) scale(.98);}',
            '@media (prefers-reduced-motion:reduce){.lf-ab-toast{transition:none;transform:none}.lf-ab-toast.lf-ab-visible{transform:none}}'
        ].join('');
        document.head.appendChild(style);
    }

    _getContainer() {
        let container = document.getElementById('litefin-achievement-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'litefin-achievement-toast-container';
            container.setAttribute('role', 'status');
            container.setAttribute('aria-live', 'polite');
            (document.body || document.documentElement).appendChild(container);
        }
        return container;
    }

    _renderToast(payload, prefs) {
        const container = this._getContainer();
        const isMilestone = typeof payload.milestone === 'number';
        const russian = /^ru(?:-|$)/i.test(document.documentElement.lang || '');
        const copyText = (ru, en) => russian ? ru : en;
        const badges = payload.badges || [];
        const badge = badges[0] || {};
        const rarity = isMilestone ? 'legendary' : String(badge.Rarity || 'common').toLowerCase();
        const color = RARITY_COLORS[rarity] || RARITY_COLORS.common;

        const toast = document.createElement('div');
        toast.className = 'lf-ab-toast';
        toast.style.setProperty('--lf-ab-rarity', color);
        toast.style.setProperty('--lf-ab-glow', color + '66');

        const orb = document.createElement('div');
        orb.className = 'lf-ab-orb';
        orb.textContent = isMilestone ? '🎯' : '🏆';

        const copy = document.createElement('div');
        copy.className = 'lf-ab-copy';

        const eyebrow = document.createElement('div');
        eyebrow.className = 'lf-ab-eyebrow';
        eyebrow.textContent = isMilestone ? copyText('Достигнут рубеж', 'Achievement milestone') : (rarity === 'common' || rarity === 'uncommon' ? copyText('Достижение получено', 'Achievement unlocked') : copyText('Редкое достижение получено', 'Rare achievement unlocked'));

        const title = document.createElement('div');
        title.className = 'lf-ab-title';

        const detail = document.createElement('div');
        detail.className = 'lf-ab-detail';

        const points = document.createElement('div');
        points.className = 'lf-ab-points';

        if (isMilestone) {
            title.textContent = copyText('Новый игровой рубеж', 'Library milestone reached');
            detail.textContent = payload.milestone + copyText('% достижений выполнено', '% of achievements completed');
        } else if (badges.length > 1) {
            title.textContent = badges.length + copyText(' достижений получено', ' achievements unlocked');
            detail.textContent = badges.slice(0, 3).map((entry) => {
                const localized = localizeAchievementBadge(entry, document.documentElement.lang || 'en');
                return localized.Title || localized.title || copyText('Достижение', 'Achievement');
            }).join(' · ');
            if (badges.length > 3) detail.textContent += ' +' + (badges.length - 3);
        } else {
            const localized = localizeAchievementBadge(badge, document.documentElement.lang || 'en');
            title.textContent = localized.Title || localized.title || copyText('Достижение получено', 'Achievement unlocked');
            detail.textContent = localized.Description || localized.description || copyText('Продолжай смотреть, чтобы открыть новые достижения.', 'Keep watching to unlock more achievements.');
        }

        const totalPoints = badges.reduce((sum, entry) => sum + (Number(entry.ScorePoints || entry.scorePoints) || 0), 0);
        if (totalPoints > 0) {
            points.textContent = '+' + totalPoints + copyText(' очков', ' points');
            copy.appendChild(points);
        }

        copy.appendChild(eyebrow);
        copy.appendChild(title);
        copy.appendChild(detail);
        toast.appendChild(orb);
        toast.appendChild(copy);
        container.appendChild(toast);

        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => toast.classList.add('lf-ab-visible'));
        });

        const video = document.querySelector('video');
        const watching = !!(video && !video.paused && !video.ended);
        const muteDuringPlayback = prefs.MuteToastSoundDuringPlayback !== false
            && prefs.muteToastSoundDuringPlayback !== false;
        if (prefs.EnableSound !== false && !(watching && muteDuringPlayback)) {
            this._playChime(rarity);
        }

        this._toastTimer = window.setTimeout(() => {
            toast.classList.add('lf-ab-exit');
            window.setTimeout(() => {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
                this._visible = false;
                this._toastTimer = null;
                this._drainQueue(this._prefs || {});
            }, 450);
        }, 8200);
    }

    _playChime(rarity) {
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) return;
            if (!this._audioContext) this._audioContext = new AudioContextClass();
            const context = this._audioContext;
            if (context.state === 'suspended') context.resume().catch(() => {});

            const notes = (RARITY_ORDER[rarity] || 0) >= 2 ? [659.25, 783.99, 1046.5] : [523.25, 659.25, 783.99];
            const start = context.currentTime;
            notes.forEach((frequency, index) => {
                const oscillator = context.createOscillator();
                const gain = context.createGain();
                const at = start + index * 0.11;
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(frequency, at);
                gain.gain.setValueAtTime(0.0001, at);
                gain.gain.linearRampToValueAtTime(0.13, at + 0.025);
                gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.19);
                oscillator.connect(gain);
                gain.connect(context.destination);
                oscillator.start(at);
                oscillator.stop(at + 0.2);
            });
        } catch (_) {
            // Audio can be blocked until the user interacts with the TV app.
        }
    }
}

export const achievementNotifications = new AchievementNotifications();
export default achievementNotifications;
