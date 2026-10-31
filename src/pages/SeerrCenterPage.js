import Page from './Page.js';
import { seerr } from '../api/seerrClient.js';
import { router } from '../core/Router.js';
import { focusManager } from '../ui/FocusManager.js';
import { logger } from '../utils/Logger.js';
import { i18n } from '../utils/i18n.js';
import { escapeHtml } from '../utils/Utils.js';
import { toast } from '../ui/Toast.js';
import { eventBus } from '../core/EventBus.js';
import { seerrNotificationService } from '../utils/SeerrNotificationService.js';
import '../styles/seerr-center.css';

const log = logger.create('SeerrCenterPage');
const TABS = ['requests', 'issues', 'notifications', 'watchlist'];

function tr(key, fallback) {
    const value = i18n.t(key);
    return value && value !== key ? value : fallback;
}

function dateLabel(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    try {
        return new Intl.DateTimeFormat(i18n.currentLang || undefined, {
            dateStyle: 'medium',
            timeStyle: 'short'
        }).format(date);
    } catch (_) {
        return date.toLocaleString();
    }
}

function requestStatus(request) {
    const requestState = Number(request._requestStatus || 0);
    const mediaState = Number(request._mediaStatus || request._seerrStatus || 0);
    if (requestState === 3) return { key: 'SeerrCenterDeclined', fallback: 'Отклонено', tone: 'declined' };
    if (requestState === 1) return { key: 'SeerrCenterAwaitingApproval', fallback: 'Ожидает одобрения', tone: 'pending' };
    if (mediaState === 6) return { key: 'SeerrCenterFailed', fallback: 'Ошибка', tone: 'declined' };
    if (mediaState === 5) return { key: 'SeerrStatusAvailable', fallback: 'Доступно', tone: 'available' };
    if (mediaState === 3 || mediaState === 4) return { key: 'SeerrStatusProcessing', fallback: 'Загружается', tone: 'processing' };
    if (mediaState === 2) return { key: 'SeerrStatusPending', fallback: 'В очереди', tone: 'pending' };
    if (requestState === 2) return { key: 'SeerrCenterApproved', fallback: 'Одобрено', tone: 'processing' };
    return { key: 'SeerrStatusNotRequested', fallback: 'Не запрошено', tone: 'neutral' };
}

function issueTypeLabel(type) {
    return ({
        1: tr('SeerrIssueVideo', 'Видео'),
        2: tr('SeerrIssueAudio', 'Звук'),
        3: tr('SeerrIssueSubtitles', 'Субтитры'),
        4: tr('SeerrIssueOther', 'Другое')
    })[Number(type)] || tr('SeerrIssueOther', 'Другое');
}

export default class SeerrCenterPage extends Page {
    constructor() {
        super();
        this._isAsyncPage = true;
        this._tab = 'requests';
        this._filter = 'all';
        this._mediaFilter = 'all';
        this._skip = 0;
        this._items = [];
        this._issues = [];
        this._issueFilter = 'open';
        this._issueSort = 'added';
        this._issuePageSize = 20;
        this._issueSkip = 0;
        this._issuePageInfo = null;
        this._issueMediaDetails = new Map();
        this._watchlist = [];
        this._watchlistFilter = 'all';
        this._watchlistSort = 'release';
        this._counts = {};
        this._currentUser = null;
        this._isAdmin = false;
        this._canManageRequests = false;
        this._canManageIssues = false;
        this._canViewIssues = false;
        this._canCreateIssues = false;
        this._loading = false;
        this._issueDetails = null;
        this._destroyed = false;
        this._onNotificationsChanged = () => {
            this._updateNotificationBadge();
            if (this._tab === 'notifications') this._renderNotifications();
        };
    }

    render() {
        return `
            <div class="page seerr-center-page">
                <main class="page-content seerr-center-content">
                    <header class="seerr-center-header">
                        <div class="seerr-center-brand">
                            <div class="seerr-center-heading-copy">
                                <div class="seerr-center-eyebrow">SEERR <span>/</span> LITEFIN</div>
                                <h1 id="seerr-center-title">${escapeHtml(tr('SeerrCenterTab_requests', 'Запросы'))}</h1>
                                <p id="seerr-center-subtitle">${escapeHtml(tr('SeerrCenterRequestsSubtitle', 'Управление запросами фильмов и сериалов.'))}</p>
                            </div>
                        </div>
                        <button type="button" class="seerr-center-refresh focusable" data-center-action="refresh" tabindex="0">
                            <span aria-hidden="true">↻</span> ${escapeHtml(tr('Refresh', 'Обновить'))}
                        </button>
                    </header>
                    <nav class="seerr-center-tabs" role="tablist" aria-label="${escapeHtml(tr('SeerrCenterTabs', 'Разделы Seerr'))}">
                        ${TABS.map((tab) => `
                            <button type="button" class="seerr-center-tab${tab === this._tab ? ' active' : ''}" role="tab"
                                aria-selected="${tab === this._tab ? 'true' : 'false'}" data-center-tab="${tab}" tabindex="0">
                                <span class="seerr-center-tab-icon" aria-hidden="true">${{ requests: '▤', issues: '⚑', notifications: '♢', watchlist: '◷' }[tab]}</span>
                                <span>${escapeHtml(tr(`SeerrCenterTab_${tab}`, { requests: 'Запросы', issues: 'Проблемы', notifications: 'Уведомления', watchlist: 'Watchlist' }[tab]))}</span>
                                ${tab === 'notifications' ? '<span class="seerr-center-unread-count" data-center-unread>0</span>' : ''}
                            </button>
                        `).join('')}
                    </nav>
                    <section class="seerr-center-stats" id="seerr-center-stats"></section>
                    <section class="seerr-center-panel" id="seerr-center-panel" aria-live="polite">
                        <div class="seerr-center-loading"><span class="seerr-center-spinner"></span>${escapeHtml(tr('Loading', 'Загрузка…'))}</div>
                    </section>
                </main>
            </div>
        `;
    }

    async onInit() {
        this.title = tr('SeerrCenterTitle', 'Центр Seerr');
        this._bindEvents();
        eventBus.on('seerr:notificationsChanged', this._onNotificationsChanged);
        this._updateNotificationBadge();
        this.setLoading(true);
        try {
            const available = await seerr.isAvailable();
            if (!available) {
                this._showMessage(tr('SeerrNotConfigured', 'Seerr не настроен или недоступен.'));
                return;
            }
            this._currentUser = await seerr.currentUser();
            const permissions = Number(this._currentUser?.permissions || 0);
            this._canManageRequests = !!(permissions & (2 | 16));
            this._canManageIssues = !!(permissions & (2 | 1048576));
            this._canViewIssues = !!(permissions & (2 | 1048576 | 2097152));
            this._canCreateIssues = !!(permissions & (2 | 4194304));
            this._isAdmin = this._canManageRequests;
            await this._loadTab(this._tab);
        } catch (error) {
            log.warn('Unable to initialize Seerr Center', error);
            this._showMessage(tr('SeerrLoadFailed', 'Не удалось загрузить данные Seerr.'));
        } finally {
            this.setLoading(false);
            this.markReady();
        }
    }

    _bindEvents() {
        this.el.addEventListener('change', (event) => {
            const select = event.target && event.target.closest ? event.target.closest('[data-center-select]') : null;
            if (!select) return;
            const type = select.getAttribute('data-center-select');
            if (type === 'issue-filter') this._issueFilter = select.value || 'open';
            else if (type === 'issue-sort') this._issueSort = select.value || 'added';
            else if (type === 'issue-page-size') this._issuePageSize = Math.max(5, Math.min(100, Number(select.value) || 20));
            else if (type === 'request-filter') this._filter = select.value || 'all';
            else if (type === 'request-media') this._mediaFilter = select.value || 'all';
            else return;
            if (type.startsWith('issue-')) {
                this._issueSkip = 0;
                void this._loadIssues(false);
            } else {
                this._skip = 0;
                void this._loadRequests(false);
            }
        });
        this.el.addEventListener('click', (event) => {
            const target = event.target && event.target.closest ? event.target.closest('button,[data-request-id],[data-issue-id],[data-watchlist-id]') : null;
            if (!target) return;
            const tab = target.getAttribute('data-center-tab');
            if (tab) {
                this._tab = tab;
                this._issueDetails = null;
                this._updateTabs();
                void this._loadTab(tab);
                return;
            }
            const action = target.getAttribute('data-center-action');
            if (action === 'refresh') {
                void this._loadTab(this._tab, true);
                return;
            }
            if (action === 'load-more') {
                this._skip += 20;
                void this._loadRequests(true);
                return;
            }
            if (action === 'issue-load-more') {
                this._issueSkip += this._issuePageSize;
                void this._loadIssues(true);
                return;
            }
            if (action === 'filter') {
                this._filter = target.getAttribute('data-filter') || 'all';
                this._skip = 0;
                void this._loadRequests(false);
                return;
            }
            if (action === 'media-filter') {
                this._mediaFilter = target.getAttribute('data-media-filter') || 'all';
                this._skip = 0;
                void this._loadRequests(false);
                return;
            }
            if (action === 'request-details') {
                router.navigate(`/seerr/${target.dataset.mediaType || 'movie'}/${target.dataset.tmdbId}`);
                return;
            }
            if (action === 'request-cancel') {
                void this._cancelRequest(target.getAttribute('data-request-id'));
                return;
            }
            if (action === 'request-approve' || action === 'request-decline' || action === 'request-retry') {
                void this._requestAction(action, target.getAttribute('data-request-id'));
                return;
            }
            if (action === 'issue-filter') {
                this._issueFilter = target.getAttribute('data-filter') || 'open';
                this._issueDetails = null;
                void this._loadIssues();
                return;
            }
            if (action === 'issue-open') {
                void this._openIssue(target.getAttribute('data-issue-id'));
                return;
            }
            if (action === 'issue-back') {
                this._issueDetails = null;
                this._renderIssues();
                return;
            }
            if (action === 'issue-comment') {
                void this._commentIssue();
                return;
            }
            if (action === 'issue-resolve' || action === 'issue-decline') {
                void this._updateIssue(target.getAttribute('data-issue-action'));
                return;
            }
            if (action === 'notification-mark-all-read') {
                seerrNotificationService.markAllRead();
                this._renderNotifications();
                return;
            }
            if (action === 'notification-open') {
                void this._openNotification(target.getAttribute('data-notification-id'));
                return;
            }
            if (action === 'watchlist-filter') {
                this._watchlistFilter = target.getAttribute('data-filter') || 'all';
                this._renderWatchlist();
                return;
            }
            if (action === 'watchlist-sort') {
                this._watchlistSort = this._watchlistSort === 'release' ? 'title' : 'release';
                this._renderWatchlist();
                return;
            }
            if (action === 'watchlist-remove') {
                void this._removeWatchlist(target.getAttribute('data-watchlist-id'));
                return;
            }
            if (action === 'watchlist-request') {
                void this._requestFromWatchlist(target.getAttribute('data-watchlist-id'));
                return;
            }
            if (action === 'watchlist-open') {
                router.navigate(`/seerr/${target.dataset.mediaType || 'movie'}/${target.dataset.tmdbId}`);
            }
        });
    }

    async _loadTab(tab, force = false) {
        if (this._destroyed) return;
        this._tab = tab;
        this._updateTabs();
        this.setLoading(true);
        try {
            if (tab === 'requests') {
                await Promise.all([this._loadRequests(false), this._loadCounts()]);
            } else if (tab === 'issues') {
                this._issueSkip = 0;
                await this._loadIssues(false);
            } else if (tab === 'watchlist') {
                await this._loadWatchlist(force);
            } else {
                this._renderNotifications();
            }
        } catch (error) {
            log.warn(`Failed to load Seerr Center tab ${tab}`, error);
            this._showMessage(tr('SeerrLoadFailed', 'Не удалось загрузить данные Seerr.'));
        } finally {
            this.setLoading(false);
        }
    }

    _updateTabs() {
        this.el.querySelectorAll('[data-center-tab]').forEach((button) => {
            const active = button.getAttribute('data-center-tab') === this._tab;
            button.classList.toggle('active', active);
            button.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        const headings = {
            requests: ['SeerrCenterTab_requests', 'SeerrCenterRequestsSubtitle'],
            issues: ['SeerrCenterTab_issues', 'SeerrCenterIssuesSubtitle'],
            notifications: ['SeerrCenterTab_notifications', 'SeerrCenterNotificationsSubtitle'],
            watchlist: ['SeerrCenterTab_watchlist', 'SeerrCenterWatchlistSubtitle']
        };
        const keys = headings[this._tab] || headings.requests;
        const title = this.$('#seerr-center-title');
        const subtitle = this.$('#seerr-center-subtitle');
        if (title) title.textContent = tr(keys[0], this._tab);
        if (subtitle) subtitle.textContent = tr(keys[1], '');
    }

    async _loadCounts() {
        try {
            this._counts = await seerr.requestCounts();
            this._renderStats();
        } catch (error) {
            log.debug('Request counts unavailable', error);
        }
    }

    _renderStats() {
        const el = this.$('#seerr-center-stats');
        if (!el) return;
        el.style.display = this._tab === 'requests' ? '' : 'none';
        const counts = this._counts || {};
        const stats = [
            ['total', tr('SeerrCenterTotal', 'Всего'), counts.total],
            ['pending', tr('SeerrCenterPending', 'Ожидают'), counts.pending],
            ['processing', tr('SeerrCenterProcessing', 'В работе'), counts.processing],
            ['available', tr('SeerrCenterAvailable', 'Доступно'), counts.available]
        ];
        el.innerHTML = stats.map(([key, label, value]) => `
            <div class="seerr-center-stat">
                <span class="seerr-center-stat-label">${escapeHtml(label)}</span>
                <strong>${Number(value || 0)}</strong>
            </div>
        `).join('');
    }

    async _loadRequests(append = false) {
        const result = await seerr.requestQueue(20, append ? this._skip : 0, this._filter, this._mediaFilter);
        const incoming = result.items || [];
        this._items = append ? this._items.concat(incoming) : incoming;
        this._renderRequests(result);
    }

    _renderRequests(result = {}) {
        const el = this.$('#seerr-center-panel');
        if (!el) return;
        const filters = [
            ['all', tr('All', 'Все')],
            ['pending', tr('SeerrCenterFilterPending', 'Ожидают')],
            ['approved', tr('SeerrCenterFilterApproved', 'Одобрены')],
            ['processing', tr('SeerrCenterFilterProcessing', 'Загружаются')],
            ['available', tr('SeerrCenterFilterAvailable', 'Доступны')],
            ['failed', tr('SeerrCenterFilterFailed', 'С ошибками')],
            ['completed', tr('SeerrCenterFilterCompleted', 'Завершены')]
        ];
        const mediaFilters = [['all', tr('All', 'Все')], ['movie', tr('Movies', 'Фильмы')], ['tv', tr('Series', 'Сериалы')]];
        const cards = this._items.map((item) => {
            const status = requestStatus(item);
            const requester = item._requestedBy?.displayName || item._requestedBy?.username || tr('UnknownUser', 'Пользователь');
            const requestedAt = dateLabel(item._requestCreatedAt);
            const seasons = item._requestSeasons.length ? ` · ${tr('Seasons', 'Сезоны')}: ${item._requestSeasons.join(', ')}` : '';
            const ownerId = String(item._requestedBy?.id || '');
            const ownRequest = ownerId && String(this._currentUser?.id || '') === ownerId;
            const controls = this._canManageRequests && item._requestStatus === 1
                ? `<button class="seerr-center-action primary" type="button" data-center-action="request-approve" data-request-id="${escapeHtml(item._requestId)}" tabindex="0">${escapeHtml(tr('Approve', 'Одобрить'))}</button>
                   <button class="seerr-center-action danger" type="button" data-center-action="request-decline" data-request-id="${escapeHtml(item._requestId)}" tabindex="0">${escapeHtml(tr('Decline', 'Отклонить'))}</button>`
                : this._canManageRequests && (String(item._requestError || '').length > 0 || item._mediaStatus === 6)
                    ? `<button class="seerr-center-action primary" type="button" data-center-action="request-retry" data-request-id="${escapeHtml(item._requestId)}" tabindex="0">${escapeHtml(tr('Retry', 'Повторить'))}</button>`
                    : (!this._isAdmin && ownRequest && item._requestStatus === 1)
                        ? `<button class="seerr-center-action danger" type="button" data-center-action="request-cancel" data-request-id="${escapeHtml(item._requestId)}" tabindex="0">${escapeHtml(tr('SeerrCancelRequest', 'Отменить'))}</button>`
                        : '';
            return `
                <article class="seerr-center-request">
                    <button class="seerr-center-poster" type="button" data-center-action="request-details"
                        data-media-type="${escapeHtml(item._mediaType)}" data-tmdb-id="${escapeHtml(item._tmdbId)}" tabindex="0">
                        ${item._imageUrl ? `<img src="${escapeHtml(item._imageUrl)}" alt="" loading="lazy">` : '<span>▣</span>'}
                    </button>
                    <div class="seerr-center-request-main">
                        <div class="seerr-center-request-heading">
                            <h3>${escapeHtml(item.Name || tr('UnknownTitle', 'Без названия'))}</h3>
                            <span class="seerr-center-status ${status.tone}">${escapeHtml(tr(status.key, status.fallback))}</span>
                        </div>
                        <div class="seerr-center-meta">${escapeHtml(item.ProductionYear || '')} · ${escapeHtml(item._mediaType === 'tv' ? tr('Series', 'Сериал') : tr('Movie', 'Фильм'))}${item._requestIs4k ? ' · 4K' : ''}${escapeHtml(seasons)}</div>
                        <div class="seerr-center-meta">${escapeHtml(tr('RequestedBy', 'Запросил'))}: ${escapeHtml(requester)}${requestedAt ? ' · ' + escapeHtml(requestedAt) : ''}</div>
                        ${item._requestError ? `<p class="seerr-center-error">${escapeHtml(item._requestError)}</p>` : ''}
                        <div class="seerr-center-actions">${controls}
                            <button class="seerr-center-action" type="button" data-center-action="request-details"
                                data-media-type="${escapeHtml(item._mediaType)}" data-tmdb-id="${escapeHtml(item._tmdbId)}" tabindex="0">${escapeHtml(tr('ViewDetails', 'Подробнее'))}</button>
                        </div>
                    </div>
                </article>
            `;
        }).join('');
        const currentPage = Math.floor(this._skip / 20) + 1;
        const canLoadMore = this._items.length > 0 && (Number(result.totalResults || 0) > this._items.length || currentPage < Number(result.pages || 1));
        el.innerHTML = `
            <div class="seerr-center-toolbar">
                <label class="seerr-center-select-wrap"><span class="seerr-center-select-icon">⌕</span>
                    <select class="seerr-center-select" data-center-select="request-filter" tabindex="0">${filters.map(([key, label]) => `<option value="${key}"${key === this._filter ? ' selected' : ''}>${escapeHtml(label)}</option>`).join('')}</select>
                </label>
                <label class="seerr-center-select-wrap"><span class="seerr-center-select-icon">▤</span>
                    <select class="seerr-center-select" data-center-select="request-media" tabindex="0">${mediaFilters.map(([key, label]) => `<option value="${key}"${key === this._mediaFilter ? ' selected' : ''}>${escapeHtml(label)}</option>`).join('')}</select>
                </label>
            </div>
            ${cards || `<div class="seerr-center-empty"><span>▤</span><strong>${escapeHtml(tr('SeerrCenterNoRequests', 'Запросов пока нет'))}</strong><p>${escapeHtml(tr('SeerrCenterNoRequestsDesc', 'Когда появятся запросы, они будут отображаться здесь.'))}</p></div>`}
            ${canLoadMore ? `<div class="seerr-center-more"><button class="seerr-center-action" type="button" data-center-action="load-more" tabindex="0">${escapeHtml(tr('LoadMore', 'Загрузить ещё'))}</button></div>` : ''}
        `;
        this._registerFocus();
    }

    async _cancelRequest(requestId) {
        if (!requestId) return;
        try {
            await seerr.cancelRequest(requestId);
            toast.show(tr('SeerrRequestCancelled', 'Запрос отменён'));
            this._skip = 0;
            await Promise.all([this._loadRequests(false), this._loadCounts()]);
        } catch (error) {
            toast.show(error?.message || tr('SeerrCancelRequestFailed', 'Не удалось отменить запрос'));
        }
    }

    async _requestAction(action, requestId) {
        if (!requestId) return;
        try {
            const operation = action === 'request-approve' ? 'approve' : action === 'request-decline' ? 'decline' : 'retry';
            await seerr.moderateRequest(requestId, operation);
            toast.show(tr('SeerrCenterActionDone', 'Действие выполнено'));
            this._skip = 0;
            await Promise.all([this._loadRequests(false), this._loadCounts()]);
        } catch (error) {
            log.warn('Seerr request action failed', error);
            toast.show(error?.message || tr('SeerrCenterActionFailed', 'Не удалось выполнить действие'));
        }
    }

    async _loadIssues(append = false) {
        const userId = this._currentUser?.id;
        const requestedBy = this._canViewIssues ? null : userId;
        if (!this._canViewIssues && requestedBy == null) {
            this._issues = [];
            this._renderIssues();
            return;
        }
        const payload = await seerr.issues(this._issuePageSize, append ? this._issueSkip : 0, this._issueFilter, this._issueSort);
        const incoming = Array.isArray(payload) ? payload : (payload?.results || []);
        this._issues = append ? this._issues.concat(incoming) : incoming;
        this._issuePageInfo = payload?.pageInfo || null;
        await this._loadIssueMediaDetails();
        this._renderIssues();
    }

    async _loadIssueMediaDetails() {
        const candidates = this._issues
            .filter((issue) => issue?.media?.tmdbId && !this._issueMediaDetails.has(String(issue.id)))
            .slice(0, 8);
        await Promise.all(candidates.map(async (issue) => {
            try {
                const mediaType = String(issue.media.mediaType || '').toLowerCase() === 'tv' ||
                    Number(issue.media.mediaType) === 2 ? 'tv' : 'movie';
                const detail = await seerr.details(mediaType, issue.media.tmdbId);
                this._issueMediaDetails.set(String(issue.id), detail);
            } catch (error) {
                this._issueMediaDetails.set(String(issue.id), null);
                log.debug('Could not enrich Seerr issue card media details', error);
            }
        }));
    }

    _renderIssues() {
        const el = this.$('#seerr-center-panel');
        if (!el) return;
        if (this._issueDetails) {
            const issue = this._issueDetails;
            const comments = (issue.comments || []).map((comment) => `
                <div class="seerr-center-comment"><strong>${escapeHtml(comment.user?.displayName || comment.user?.username || tr('UnknownUser', 'Пользователь'))}</strong><p>${escapeHtml(comment.message || '')}</p></div>
            `).join('');
            el.innerHTML = `
                <div class="seerr-center-issue-detail">
                    <button type="button" class="seerr-center-action" data-center-action="issue-back" tabindex="0">← ${escapeHtml(tr('Back', 'Назад'))}</button>
                    <h2>${escapeHtml(issue.media?.title || issue.media?.name || tr('SeerrCenterIssue', 'Проблема'))}</h2>
                    <span class="seerr-center-status ${Number(issue.status) === 2 ? 'available' : 'pending'}">${escapeHtml(Number(issue.status) === 2 ? tr('SeerrCenterIssueResolved', 'Решено') : tr('SeerrCenterIssueOpen', 'Открыто'))} · ${escapeHtml(issueTypeLabel(issue.issueType))}</span>
                    ${issue.message ? `<p class="seerr-center-issue-description">${escapeHtml(issue.message)}</p>` : ''}
                    <div class="seerr-center-comments">${comments || `<p>${escapeHtml(tr('SeerrCenterNoComments', 'Комментариев пока нет.'))}</p>`}</div>
                    <textarea class="seerr-center-textarea" id="seerr-center-comment" rows="3" maxlength="2000" placeholder="${escapeHtml(tr('SeerrCenterCommentPlaceholder', 'Написать комментарий…'))}"></textarea>
                    <div class="seerr-center-actions">
                        <button class="seerr-center-action primary" type="button" data-center-action="issue-comment" tabindex="0">${escapeHtml(tr('Send', 'Отправить'))}</button>
                        ${this._canManageIssues ? (Number(issue.status) === 2 ? `<button class="seerr-center-action" type="button" data-center-action="issue-resolve" data-issue-action="open" tabindex="0">${escapeHtml(tr('SeerrCenterReopenIssue', 'Открыть снова'))}</button>` : `<button class="seerr-center-action" type="button" data-center-action="issue-resolve" data-issue-action="resolved" tabindex="0">${escapeHtml(tr('SeerrCenterResolveIssue', 'Решено'))}</button>`) : ''}
                    </div>
                </div>
            `;
            this._registerFocus();
            return;
        }
        const filterOptions = [
            ['open', tr('SeerrCenterIssueFilterOpen', 'Открытые')],
            ['resolved', tr('SeerrCenterIssueFilterResolved', 'Решённые')],
            ['all', tr('SeerrCenterIssueFilterAll', 'Все')]
        ];
        const sortOptions = [
            ['added', tr('SeerrCenterIssueSortAdded', 'Сначала новые')],
            ['modified', tr('SeerrCenterIssueSortModified', 'Последнее изменение')]
        ];
        const cards = this._issues.map((issue) => {
            const media = this._issueMediaDetails.get(String(issue.id)) || {};
            const title = media.Name || issue.media?.title || issue.media?.name || (issue.media?.tmdbId ? `TMDB #${issue.media.tmdbId}` : `#${issue.id}`);
            const description = issue.comments?.[0]?.message || issue.message || '';
            const preview = description.length > 180 ? `${description.slice(0, 177)}…` : description;
            const issueType = issueTypeLabel(issue.issueType);
            const isResolved = Number(issue.status) === 2;
            const mediaType = String(issue.media?.mediaType || '').toLowerCase() === 'tv' || Number(issue.media?.mediaType) === 2 ? tr('Series', 'Сериал') : tr('Movie', 'Фильм');
            const seasonLine = media._mediaType === 'tv' ? `
                <span class="seerr-center-issue-tag">${escapeHtml(tr('SeerrIssueSeason', 'Сезон'))}: ${Number(issue.problemSeason) > 0 ? Number(issue.problemSeason) : escapeHtml(tr('All', 'Все'))}</span>
                ${Number(issue.problemSeason) > 0 ? `<span class="seerr-center-issue-tag">${escapeHtml(tr('SeerrIssueEpisode', 'Эпизод'))}: ${Number(issue.problemEpisode) > 0 ? Number(issue.problemEpisode) : escapeHtml(tr('All', 'Все'))}</span>` : ''}
            ` : '';
            const openedBy = issue.createdBy?.displayName || issue.createdBy?.username || tr('UnknownUser', 'Пользователь');
            const backdrop = media._backdropUrl || '';
            const poster = media._imageUrl || '';
            return `
                <article class="seerr-center-issue-card${backdrop ? ' has-backdrop' : ''}">
                    ${backdrop ? `<div class="seerr-center-issue-backdrop" style="background-image:url('${escapeHtml(backdrop)}')"></div>` : ''}
                    <button type="button" class="seerr-center-issue-main" data-center-action="issue-open" data-issue-id="${escapeHtml(issue.id)}" tabindex="0">
                        ${poster ? `<span class="seerr-center-issue-poster"><img src="${escapeHtml(poster)}" alt="" loading="lazy"></span>` : '<span class="seerr-center-issue-poster placeholder">▣</span>'}
                        <span class="seerr-center-issue-copy">
                            <span class="seerr-center-issue-year">${escapeHtml(media.ProductionYear || '')} · ${escapeHtml(mediaType)}</span>
                            <strong>${escapeHtml(title)}</strong>
                            <span class="seerr-center-issue-preview">${escapeHtml(preview || tr('SeerrCenterNoIssueDescription', 'Описание не добавлено'))}</span>
                            <span class="seerr-center-issue-tags">
                                <span class="seerr-center-issue-tag">${escapeHtml(issueType)}</span>
                                ${seasonLine}
                            </span>
                        </span>
                    </button>
                    <div class="seerr-center-issue-side">
                        <div class="seerr-center-issue-fact"><small>${escapeHtml(tr('SeerrCenterIssueStatus', 'Статус'))}</small><span class="seerr-center-status ${isResolved ? 'available' : 'pending'}">${escapeHtml(isResolved ? tr('SeerrCenterIssueResolved', 'Решено') : tr('SeerrCenterIssueOpen', 'Открыто'))}</span></div>
                        <div class="seerr-center-issue-fact"><small>${escapeHtml(tr('SeerrCenterIssueType', 'Тип проблемы'))}</small><strong>${escapeHtml(issueType)}</strong></div>
                        <div class="seerr-center-issue-fact"><small>${escapeHtml(tr('SeerrCenterIssueOpenedBy', 'Открыл'))}</small><strong>${escapeHtml(openedBy)}</strong><small>${escapeHtml(dateLabel(issue.createdAt))}</small></div>
                        <button type="button" class="seerr-center-action primary seerr-center-issue-view" data-center-action="issue-open" data-issue-id="${escapeHtml(issue.id)}" tabindex="0">${escapeHtml(tr('SeerrCenterViewIssue', 'Открыть обращение'))}</button>
                    </div>
                </article>
            `;
        }).join('');
        const pageInfo = this._issuePageInfo || {};
        const shown = this._issues.length;
        const total = Number(pageInfo.results || shown);
        const canLoadMore = total > shown && shown > 0;
        el.innerHTML = `
            <div class="seerr-center-toolbar seerr-center-issue-toolbar">
                <label class="seerr-center-select-wrap"><span class="seerr-center-select-icon">⌕</span>
                    <select class="seerr-center-select" data-center-select="issue-filter" tabindex="0">${filterOptions.map(([key,label]) => `<option value="${key}"${key === this._issueFilter ? ' selected' : ''}>${escapeHtml(label)}</option>`).join('')}</select>
                </label>
                <label class="seerr-center-select-wrap"><span class="seerr-center-select-icon">↕</span>
                    <select class="seerr-center-select" data-center-select="issue-sort" tabindex="0">${sortOptions.map(([key,label]) => `<option value="${key}"${key === this._issueSort ? ' selected' : ''}>${escapeHtml(label)}</option>`).join('')}</select>
                </label>
                <label class="seerr-center-page-size"><span>${escapeHtml(tr('SeerrCenterResultsPerPage', 'На странице'))}</span>
                    <select class="seerr-center-select small" data-center-select="issue-page-size" tabindex="0">${[10,20,50,100].map((size) => `<option value="${size}"${size === this._issuePageSize ? ' selected' : ''}>${size}</option>`).join('')}</select>
                </label>
                <span class="seerr-center-result-count">${escapeHtml(tr('SeerrCenterShowingResults', 'Показано'))} <strong>${shown}</strong> / ${total}</span>
            </div>
            ${cards || `<div class="seerr-center-empty"><span>⚑</span><strong>${escapeHtml(tr('SeerrCenterNoIssues', 'Открытых проблем нет'))}</strong><p>${escapeHtml(tr('SeerrCenterNoIssuesDesc', 'Сообщения о проблемах с воспроизведением будут отображаться здесь.'))}</p></div>`}
            ${canLoadMore ? `<div class="seerr-center-more"><button class="seerr-center-action" type="button" data-center-action="issue-load-more" tabindex="0">${escapeHtml(tr('LoadMore', 'Загрузить ещё'))}</button></div>` : ''}
        `;
        this._registerFocus();
    }

    async _openIssue(issueId) {
        try {
            this._issueDetails = await seerr.issueDetails(issueId);
            this._renderIssues();
        } catch (error) {
            toast.show(tr('SeerrLoadFailed', 'Не удалось загрузить обращение'));
        }
    }

    async _commentIssue() {
        const message = this.$('#seerr-center-comment')?.value || '';
        try {
            await seerr.commentIssue(this._issueDetails.id, message);
            this._issueDetails = await seerr.issueDetails(this._issueDetails.id);
            this._renderIssues();
        } catch (error) {
            toast.show(error?.message || tr('SeerrCenterCommentFailed', 'Не удалось отправить комментарий'));
        }
    }

    async _updateIssue(status) {
        try {
            await seerr.updateIssueStatus(this._issueDetails.id, status);
            this._issueDetails = null;
            await this._loadIssues();
            toast.show(tr('SeerrCenterIssueUpdated', 'Статус проблемы обновлён'));
        } catch (error) {
            toast.show(error?.message || tr('SeerrCenterActionFailed', 'Не удалось выполнить действие'));
        }
    }

    async _loadWatchlist(force = false) {
        if (force) seerr.clearCache();
        this._watchlist = await seerr.watchlist(1);
        this._renderWatchlist();
    }

    _renderWatchlist() {
        const el = this.$('#seerr-center-panel');
        if (!el) return;
        const isUpcoming = (item) => {
            const release = item.ReleaseDate || item.PremiereDate || item.FirstAired || '';
            const timestamp = release ? new Date(release).getTime() : 0;
            return timestamp > Date.now();
        };
        const statusOf = (item) => Number(item._seerrStatus || 0);
        const availableCount = this._watchlist.filter((item) => statusOf(item) === 5).length;
        const processingCount = this._watchlist.filter((item) => [2, 3, 4].includes(statusOf(item))).length;
        const upcomingCount = this._watchlist.filter(isUpcoming).length;
        const requestableCount = this._watchlist.filter((item) => [0, 1, 6].includes(statusOf(item))).length;
        const filters = [
            ['all', tr('All', 'Все'), this._watchlist.length],
            ['available', tr('SeerrCenterFilterAvailable', 'Доступны'), availableCount],
            ['pending', tr('SeerrCenterFilterProcessing', 'В работе'), processingCount],
            ['upcoming', tr('SeerrCenterUpcoming', 'Скоро'), upcomingCount],
            ['requestable', tr('SeerrCenterRequestable', 'Можно запросить'), requestableCount]
        ];
        const items = this._watchlist.filter((item) => {
            const status = statusOf(item);
            if (this._watchlistFilter === 'available') return status === 5;
            if (this._watchlistFilter === 'pending') return [2, 3, 4].includes(status);
            if (this._watchlistFilter === 'upcoming') return isUpcoming(item);
            if (this._watchlistFilter === 'requestable') return [0, 1, 6].includes(status);
            return true;
        });
        items.sort((a, b) => {
            if (this._watchlistSort === 'title') {
                return String(a.Name || '').localeCompare(String(b.Name || ''));
            }
            const releaseA = a.ReleaseDate || a.PremiereDate || a.FirstAired || '2999-12-31';
            const releaseB = b.ReleaseDate || b.PremiereDate || b.FirstAired || '2999-12-31';
            return new Date(releaseA).getTime() - new Date(releaseB).getTime();
        });
        const cards = items.map((item) => {
            const status = requestStatus(item);
            const releaseDate = item.ReleaseDate || item.PremiereDate || item.FirstAired;
            return `
            <article class="seerr-center-watch-card">
                <button class="seerr-center-poster" type="button" data-center-action="watchlist-open" data-media-type="${escapeHtml(item._mediaType)}" data-tmdb-id="${escapeHtml(item._tmdbId)}" tabindex="0">
                    ${item._imageUrl ? `<img src="${escapeHtml(item._imageUrl)}" alt="" loading="lazy">` : '<span>▣</span>'}
                </button>
                <div class="seerr-center-watch-main">
                    <div class="seerr-center-watch-heading"><strong>${escapeHtml(item.Name || '')}</strong><span class="seerr-center-status ${status.tone}">${escapeHtml(tr(status.key, status.fallback))}</span></div>
                    <span class="seerr-center-meta">${escapeHtml(item.ProductionYear || '')} · ${escapeHtml(item._mediaType === 'tv' ? tr('Series', 'Сериал') : tr('Movie', 'Фильм'))}</span>
                    <span class="seerr-center-meta">${releaseDate ? escapeHtml(dateLabel(releaseDate)) : escapeHtml(tr('SeerrCenterReleaseDateUnknown', 'Дата выхода неизвестна'))}</span>
                    <div class="seerr-center-actions">
                        <button class="seerr-center-action" type="button" data-center-action="watchlist-open" data-media-type="${escapeHtml(item._mediaType)}" data-tmdb-id="${escapeHtml(item._tmdbId)}" tabindex="0">${escapeHtml(tr('ViewDetails', 'Подробнее'))}</button>
                        ${[0, 1, 6].includes(statusOf(item)) ? `<button class="seerr-center-action primary" type="button" data-center-action="watchlist-request" data-watchlist-id="${escapeHtml(item._tmdbId)}" tabindex="0">${escapeHtml(tr('SeerrRequest', 'Запросить'))}</button>` : ''}
                        <button class="seerr-center-action danger" type="button" data-center-action="watchlist-remove" data-watchlist-id="${escapeHtml(item._tmdbId)}" tabindex="0">${escapeHtml(tr('Remove', 'Убрать'))}</button>
                    </div>
                </div>
            </article>
        `;
        }).join('');
        el.innerHTML = `
            <div class="seerr-center-filters"><div class="seerr-center-filter-group">
                ${filters.map(([key,label,count]) => `<button type="button" class="seerr-center-filter${key === this._watchlistFilter ? ' active' : ''}" data-center-action="watchlist-filter" data-filter="${key}" tabindex="0">${escapeHtml(label)} <span class="seerr-center-filter-count">${count}</span></button>`).join('')}
            </div><button type="button" class="seerr-center-filter seerr-center-sort" data-center-action="watchlist-sort" tabindex="0">${escapeHtml(tr('SeerrCenterSortBy', 'Сортировка'))}: ${escapeHtml(this._watchlistSort === 'title' ? tr('Name', 'Название') : tr('SeerrCenterSortByRelease', 'Дата выхода'))}</button></div>
            ${cards || `<div class="seerr-center-empty"><span>◷</span><strong>${escapeHtml(tr('SeerrCenterEmptyWatchlist', 'В этом разделе пока пусто'))}</strong></div>`}
        `;
        this._registerFocus();
    }

    async _requestFromWatchlist(tmdbId) {
        const item = this._watchlist.find((entry) => String(entry._tmdbId) === String(tmdbId));
        if (!item) return;
        try {
            const module = await import('../components/SeerrRequestModal.js');
            module.default.show(item, (newStatus, requestId) => {
                item._seerrStatus = newStatus;
                if (requestId) item._requestId = requestId;
                seerr.clearCache();
                this._renderWatchlist();
            });
        } catch (error) {
            log.warn('Unable to open Seerr request form from watchlist', error);
            toast.show(error?.message || tr('SeerrRequestFailed', 'Не удалось открыть запрос'));
        }
    }

    async _removeWatchlist(tmdbId) {
        const item = this._watchlist.find((entry) => String(entry._tmdbId) === String(tmdbId));
        if (!item) return;
        try {
            await seerr.removeFromWatchlist(item);
            this._watchlist = this._watchlist.filter((entry) => String(entry._tmdbId) !== String(tmdbId));
            this._renderWatchlist();
            toast.show(tr('SeerrRemovedFromWatchlist', 'Удалено из списка просмотра'));
        } catch (error) {
            toast.show(error?.message || tr('SeerrWatchlistFailed', 'Не удалось обновить список'));
        }
    }

    _updateNotificationBadge() {
        const count = seerrNotificationService.getUnreadCount();
        const badge = this.$('[data-center-unread]');
        if (badge) {
            badge.textContent = count > 99 ? '99+' : String(count);
            badge.classList.toggle('hidden', count === 0);
        }
    }

    async _openNotification(notificationId) {
        const notification = seerrNotificationService.getNotifications().find((entry) => entry.id === notificationId);
        if (!notification) return;
        seerrNotificationService.markRead(notificationId);
        this._updateNotificationBadge();
        if (notification.kind === 'issue' && notification.issueId) {
            this._tab = 'issues';
            this._issueDetails = null;
            this._updateTabs();
            await this._loadIssues();
            await this._openIssue(notification.issueId);
            return;
        }
        if (notification.tmdbId) {
            router.navigate(`/seerr/${notification.mediaType === 'tv' ? 'tv' : 'movie'}/${encodeURIComponent(notification.tmdbId)}`);
            return;
        }
        this._renderNotifications();
    }

    _renderNotifications() {
        const el = this.$('#seerr-center-panel');
        if (!el) return;
        const notifications = seerrNotificationService.getNotifications();
        const unread = seerrNotificationService.getUnreadCount();
        const cards = notifications.map((entry) => {
            const message = entry.messageKey
                ? `${tr(entry.messageKey, entry.message || '')}: ${entry.title || ''}`
                : (entry.message || entry.title || '');
            return `
                <button type="button" class="seerr-center-notification${entry.read ? ' read' : ' unread'}"
                    data-center-action="notification-open" data-notification-id="${escapeHtml(entry.id)}" tabindex="0">
                    <span class="seerr-center-notification-icon" aria-hidden="true">${entry.kind === 'issue' ? '⚑' : '▤'}</span>
                    <span class="seerr-center-notification-copy">
                        <strong>${escapeHtml(entry.title || tr('SeerrCenterTitle', 'Центр Seerr'))}</strong>
                        <span>${escapeHtml(message)}</span>
                        <small>${escapeHtml(dateLabel(entry.createdAt))}</small>
                    </span>
                    ${entry.read ? '' : '<span class="seerr-center-notification-dot" aria-hidden="true"></span>'}
                </button>
            `;
        }).join('');
        el.innerHTML = `
            <div class="seerr-center-notification-toolbar">
                <span>${escapeHtml(tr('SeerrCenterUnreadCount', 'Непрочитано'))}: <strong>${unread}</strong></span>
                ${unread ? `<button type="button" class="seerr-center-action" data-center-action="notification-mark-all-read" tabindex="0">${escapeHtml(tr('SeerrCenterMarkAllRead', 'Прочитать всё'))}</button>` : ''}
            </div>
            ${cards || `<div class="seerr-center-empty"><span>♢</span><strong>${escapeHtml(tr('SeerrCenterNoNotifications', 'Новых уведомлений нет'))}</strong><p>${escapeHtml(tr('SeerrCenterNotificationsDesc', 'Здесь появятся изменения статусов запросов и ответы по проблемам.'))}</p></div>`}
        `;
        this._updateNotificationBadge();
        this._registerFocus();
    }

    _showMessage(message) {
        const el = this.$('#seerr-center-panel');
        if (el) el.innerHTML = `<div class="seerr-center-empty"><strong>${escapeHtml(message)}</strong></div>`;
    }

    _registerFocus() {
        const panel = this.$('#seerr-center-panel');
        if (!panel) return;
        this.registerFocusSection('seerr-center-content', panel, {
            focusSelector: 'button:not([disabled]), textarea, input, select',
            trap: false
        });
        this.setActiveSection('seerr-center-content');
    }

    destroy() {
        this._destroyed = true;
        eventBus.off('seerr:notificationsChanged', this._onNotificationsChanged);
        super.destroy();
    }
}
