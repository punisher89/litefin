/**
 * ============================================================================
 * Litefin - Achievement Badges page
 * ============================================================================
 */
import Page from './Page.js';
import { api } from '../api/index.js';
import { router } from '../core/Router.js';
import { eventBus } from '../core/EventBus.js';
import { focusManager } from '../ui/FocusManager.js';
import { i18n } from '../utils/i18n.js';
import { storage } from '../utils/StorageService.js';
import { customHeaders } from '../utils/CustomHeaders.js';
import { platformInfo } from '../utils/PlatformInfo.js';
import { logger } from '../utils/Logger.js';
import AchievementBadgesHost from '../plugins/AchievementBadgesHost.js';
import '../styles/achievements.css';

const log = logger.create('AchievementsPage');
const fontUrl = new URL('../assets/fonts/MaterialIcons-Regular.ttf', import.meta.url).href;

export default class AchievementsPage extends Page {
    constructor() {
        super();
        this.title = i18n.t('Achievements');
        this._isAsyncPage = true;
        this._generation = 0;
    }

    render() {
        return `
            <div class="page achievements-page">
                <div class="achievements-toolbar">
                    <h1 data-i18n="Achievements">Achievements</h1>
                    <div class="achievements-actions">
                        <button class="btn focusable" tabindex="0" data-action="enter" data-i18n="AchievementsEnter">Open achievements</button>
                        <button class="btn focusable" tabindex="0" data-action="retry" data-i18n="ButtonTryAgain">Try again</button>
                    </div>
                </div>
                <p class="achievements-status" role="status" aria-live="polite"></p>
                <div class="achievements-host"></div>
            </div>`;
    }

    onInit() {
        i18n.translateDOM(this.el);
        this.registerFocusSection('achievements-actions', this.$('.achievements-actions'), {
            orientation: 'horizontal',
            leaveLeft: 'sidebar'
        });
        this.$('[data-action="enter"]').addEventListener('click', () => this._host?.focus());
        this.$('[data-action="retry"]').addEventListener('click', () => this._load());
        for (const name of ['auth:logout', 'auth:login', 'auth:restored']) {
            this._subscriptions.push(
                eventBus.on(name, () => {
                    this._generation++;
                    this._host?.destroy();
                })
            );
        }
        this._load();
    }

    async _load() {
        const generation = ++this._generation;
        this._host?.destroy();
        const status = this.$('.achievements-status');
        const enter = this.$('[data-action="enter"]');
        enter.disabled = true;
        status.hidden = false;
        status.textContent = i18n.t('AchievementsLoading');
        const host = new AchievementBadgesHost({
            title: this.title,
            language: i18n.currentLang,
            fontUrl,
            storage,
            deviceId: api.deviceId,
            tvMode: platformInfo.isTv,
            getSession: () => ({ serverUrl: api.serverUrl, accessToken: api.accessToken, userId: api.userId }),
            getHeaders: (url) => customHeaders.getHeadersForUrl(url, api.serverUrl),
            fetch: window.fetch.bind(window),
            onExit: () => focusManager.focusElement(enter),
            onNavigate: (path) => router.navigate(path)
        });
        this._host = host;
        try {
            await host.mount(this.$('.achievements-host'));
            if (generation !== this._generation) return;
            status.hidden = true;
            enter.disabled = false;
        } catch (error) {
            if (generation !== this._generation) return;
            host.destroy();
            status.textContent = i18n.t('AchievementsUnavailable');
            // Upstream errors can include request URLs; do not log a session.
            log.warn('Could not open the AchievementBadges interface');
        } finally {
            if (generation === this._generation) {
                this.markReady();
                this.restoreScrollFocusWhenReady();
                this.setActiveSection('achievements-actions');
            }
        }
    }

    destroy() {
        this._generation++;
        this._host?.destroy();
        super.destroy();
    }
}
