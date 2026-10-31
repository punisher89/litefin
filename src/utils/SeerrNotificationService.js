import { seerr } from '../api/seerrClient.js';
import { storage } from './StorageService.js';
import { eventBus } from '../core/EventBus.js';
import { toast } from '../ui/Toast.js';
import { logger } from './Logger.js';
import { i18n } from './i18n.js';

const log = logger.create('SeerrNotifications');
const POLL_INTERVAL_MS = 120000;
const MAX_NOTIFICATIONS = 80;

function safeDate(value) {
    const date = value ? new Date(value) : new Date();
    return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function mediaTypeOf(media, request) {
    const type = media?.mediaType || request?.mediaType || request?.type;
    if (type === 'tv' || type === 'series' || type === 2 || type === '2') return 'tv';
    return 'movie';
}

function mediaTitle(media, fallback) {
    return media?.title || media?.name || (media?.tmdbId ? `TMDB #${media.tmdbId}` : fallback);
}

/**
 * Low-frequency Seerr polling while Litefin is open. No API keys are stored
 * on the TV; all reads continue through the authenticated Jellyfin companion
 * endpoint. Polls pause while the app is hidden to save TV resources.
 */
class SeerrNotificationService {
    constructor() {
        this._started = false;
        this._polling = false;
        this._timer = null;
        this._visibilityHandler = null;
        this._currentUser = null;
        this._storageKey = 'seerr:notifications:v1';
        this._snapshotKey = 'seerr:notifications:snapshot:v1';
        this._notifications = [];
        this._snapshot = null;
    }

    _read(key, fallback) {
        try {
            const raw = storage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (error) {
            log.warn('Unable to read saved Seerr notification data', error);
            return fallback;
        }
    }

    _persist() {
        storage.setItem(this._storageKey, JSON.stringify(this._notifications.slice(0, MAX_NOTIFICATIONS)));
        storage.setItem(this._snapshotKey, JSON.stringify(this._snapshot || { requests: {}, issues: {} }));
    }

    _emit() {
        const unread = this._notifications.filter((entry) => !entry.read).length;
        eventBus.emit('seerr:notificationsChanged', {
            unread,
            notifications: this.getNotifications()
        });
    }

    getNotifications() {
        return this._notifications.slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    }

    getUnreadCount() {
        return this._notifications.reduce((count, entry) => count + (entry.read ? 0 : 1), 0);
    }

    async start() {
        if (this._started) return;
        this._started = true;
        try {
            this._currentUser = await seerr.currentUser();
            const userId = this._currentUser?.id != null ? String(this._currentUser.id) : 'default';
            this._storageKey = `seerr:notifications:v1:${userId}`;
            this._snapshotKey = `seerr:notifications:snapshot:v1:${userId}`;
            this._notifications = this._read(this._storageKey, []);
            this._snapshot = this._read(this._snapshotKey, null);
            await this.poll();

            this._visibilityHandler = () => {
                if (document.visibilityState !== 'hidden') void this.poll();
            };
            if (typeof document !== 'undefined') {
                document.addEventListener('visibilitychange', this._visibilityHandler);
            }
            this._timer = setInterval(() => {
                if (typeof document === 'undefined' || document.visibilityState !== 'hidden') {
                    void this.poll();
                }
            }, POLL_INTERVAL_MS);
            this._emit();
        } catch (error) {
            this._started = false;
            log.warn('Could not start Seerr notification polling', error);
        }
    }

    stop() {
        this._started = false;
        if (this._timer) {
            clearInterval(this._timer);
            this._timer = null;
        }
        if (this._visibilityHandler && typeof document !== 'undefined') {
            document.removeEventListener('visibilitychange', this._visibilityHandler);
            this._visibilityHandler = null;
        }
    }

    async poll() {
        if (!this._started || this._polling || (typeof document !== 'undefined' && document.visibilityState === 'hidden')) {
            return;
        }
        this._polling = true;
        try {
            const snapshot = await seerr.notificationSnapshot(this._currentUser || {});
            const next = this._buildSnapshot(snapshot);
            if (snapshot.issues == null && this._snapshot) next.issues = this._snapshot.issues || {};
            if (!this._snapshot) {
                // The first successful read is a baseline, not a flood of old events.
                this._snapshot = next;
                this._persist();
                this._emit();
                return;
            }

            const generated = [];
            const previousRequests = this._snapshot.requests || {};
            Object.keys(next.requests).forEach((id) => {
                const current = next.requests[id];
                const previous = previousRequests[id];
                if (!previous) {
                    // Admins see requests created by other household users. A user's
                    // own newly submitted request is already confirmed by the request modal.
                    if (String(current.requesterId || '') !== String(this._currentUser?.id || '')) {
                        generated.push(this._requestNotification(current, 'new'));
                    }
                    return;
                }
                if (current.requestStatus !== previous.requestStatus || current.mediaStatus !== previous.mediaStatus) {
                    generated.push(this._requestNotification(current, 'changed'));
                }
            });

            const previousIssues = this._snapshot.issues || {};
            Object.keys(next.issues).forEach((id) => {
                const current = next.issues[id];
                const previous = previousIssues[id];
                if (!previous) {
                    if (String(current.creatorId || '') !== String(this._currentUser?.id || '')) {
                        generated.push(this._issueNotification(current, 'new'));
                    }
                    return;
                }
                if (current.commentSignature && current.commentSignature !== previous.commentSignature &&
                    String(current.commentUserId || '') !== String(this._currentUser?.id || '')) {
                    generated.push(this._issueNotification(current, 'comment'));
                }
            });

            if (generated.length) {
                const knownIds = new Set(this._notifications.map((entry) => entry.id));
                const fresh = generated.filter((entry) => entry && !knownIds.has(entry.id));
                if (fresh.length) {
                    this._notifications = fresh.concat(this._notifications).slice(0, MAX_NOTIFICATIONS);
                    if (typeof document === 'undefined' || document.visibilityState !== 'hidden') {
                        const key = fresh.length === 1 ? 'SeerrNotificationNewActivity' : 'SeerrNotificationNewCount';
                        const fallback = fresh.length === 1 ? 'New Seerr activity' : `${fresh.length} new Seerr updates`;
                        toast.show(i18n.t(key) && i18n.t(key) !== key ? i18n.t(key) : fallback);
                    }
                }
            }

            this._snapshot = next;
            this._persist();
            this._emit();
        } catch (error) {
            log.debug('Seerr notification poll failed; the next interval will retry', error);
        } finally {
            this._polling = false;
        }
    }

    _buildSnapshot(payload) {
        const requests = {};
        (payload?.requests || []).forEach((request) => {
            const media = request?.media || {};
            const id = request && (request.id || request.requestId);
            if (id == null) return;
            const tmdbId = media.tmdbId || media.id || request.tmdbId || request.mediaId || null;
            const mediaType = mediaTypeOf(media, request);
            requests[String(id)] = {
                id: String(id),
                requestStatus: Number(request.status || 0),
                mediaStatus: Number(media.status || 0),
                title: mediaTitle(media, `TMDB #${tmdbId || id}`),
                tmdbId: tmdbId ? String(tmdbId) : '',
                mediaType,
                requesterId: request.requestedBy?.id || request.requestedBy?.userId || '',
                updatedAt: request.updatedAt || media.updatedAt || request.createdAt || ''
            };
        });

        const issues = {};
        (payload?.issues || []).forEach((issue) => {
            if (!issue || issue.id == null) return;
            const comments = Array.isArray(issue.comments) ? issue.comments : [];
            const lastComment = comments.length ? comments[comments.length - 1] : null;
            const media = issue.media || {};
            issues[String(issue.id)] = {
                id: String(issue.id),
                title: mediaTitle(media, `Issue #${issue.id}`),
                tmdbId: media.tmdbId ? String(media.tmdbId) : '',
                mediaType: mediaTypeOf(media, {}),
                commentSignature: lastComment ? `${lastComment.id || ''}:${lastComment.message || ''}:${lastComment.createdAt || ''}` : '',
                commentUserId: lastComment?.user?.id || lastComment?.userId || '',
                creatorId: issue.createdBy?.id || issue.createdBy?.userId || '',
                updatedAt: issue.updatedAt || issue.createdAt || ''
            };
        });
        return { requests, issues };
    }

    _requestNotification(request, kind) {
        const requestLabel = Number(request.requestStatus) === 1 ? 'awaiting approval'
            : Number(request.requestStatus) === 2 ? 'approved'
            : Number(request.requestStatus) === 3 ? 'declined'
            : Number(request.mediaStatus) === 5 ? 'available'
            : Number(request.mediaStatus) === 3 || Number(request.mediaStatus) === 4 ? 'processing'
            : Number(request.mediaStatus) === 2 ? 'queued'
            : kind === 'new' ? 'received' : 'updated';
        const messageKeys = {
            'awaiting approval': 'SeerrNotificationStatusAwaiting',
            approved: 'SeerrNotificationStatusApproved',
            declined: 'SeerrNotificationStatusDeclined',
            available: 'SeerrNotificationStatusAvailable',
            processing: 'SeerrNotificationStatusProcessing',
            queued: 'SeerrNotificationStatusQueued',
            received: 'SeerrNotificationRequestNew',
            updated: 'SeerrNotificationStatusUpdated'
        };
        const signature = `${request.requestStatus}-${request.mediaStatus}-${request.updatedAt}`;
        return {
            id: `request:${request.id}:${signature}`,
            kind: 'request',
            title: request.title,
            messageKey: messageKeys[requestLabel] || 'SeerrNotificationStatusUpdated',
            message: `${requestLabel}: ${request.title}`,
            createdAt: safeDate(request.updatedAt),
            mediaType: request.mediaType,
            tmdbId: request.tmdbId,
            requestId: request.id,
            read: false
        };
    }

    _issueNotification(issue, kind) {
        return {
            id: `issue:${issue.id}:${issue.commentSignature || issue.updatedAt}`,
            kind: 'issue',
            title: issue.title,
            messageKey: kind === 'comment' ? 'SeerrNotificationIssueReply' : 'SeerrNotificationIssueNew',
            message: kind === 'comment' ? `New reply: ${issue.title}` : `New issue: ${issue.title}`,
            createdAt: safeDate(issue.updatedAt),
            issueId: issue.id,
            tmdbId: issue.tmdbId,
            mediaType: issue.mediaType,
            read: false
        };
    }

    markRead(id) {
        let changed = false;
        this._notifications = this._notifications.map((entry) => {
            if (entry.id !== id || entry.read) return entry;
            changed = true;
            return { ...entry, read: true };
        });
        if (changed) {
            this._persist();
            this._emit();
        }
    }

    markAllRead() {
        if (!this.getUnreadCount()) return;
        this._notifications = this._notifications.map((entry) => ({ ...entry, read: true }));
        this._persist();
        this._emit();
    }
}

export const seerrNotificationService = new SeerrNotificationService();
