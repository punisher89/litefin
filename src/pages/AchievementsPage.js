/** Litefin-native Achievement Badges page and navigation lifecycle. */
import Page from './Page.js';
import AchievementBadgesPanel from '../components/AchievementBadgesPanel.js';
import { focusManager } from '../ui/FocusManager.js';
import { i18n } from '../utils/i18n.js';
import { logger } from '../utils/Logger.js';
import '../styles/achievements.css';

const log = logger.create('AchievementsPage');

export default class AchievementsPage extends Page {
    constructor() {
        super();
        this.title = i18n.t('Achievements');
        this._isAsyncPage = true;
    }

    render() {
        return `<div class="page achievements-page">
            <p class="achievements-status" role="status" aria-live="polite"></p>
            <main class="page-content achievements-content"></main>
        </div>`;
    }

    async onInit() {
        const status = this.$('.achievements-status');
        status.textContent = i18n.t('AchievementsLoading');
        this.panel = new AchievementBadgesPanel();
        this.panel.mount(this.$('.achievements-content'));
        this.registerFocusSection('achievements-content', this.$('.achievements-content'), {
            orientation: 'grid',
            selector: '.focusable',
            leaveLeft: 'sidebar'
        });
        try {
            await this.panel.initialize();
            if (this._closed) return;
            status.hidden = true;
            this.panel.restoreState(this._savedState);
            focusManager.invalidateCache('achievements-content');
            this.setActiveSection('achievements-content');
        } catch (error) {
            if (this._closed) return;
            this.panel.destroy();
            status.textContent = i18n.t('AchievementsUnavailable');
            log.warn('Could not initialize native achievements');
        } finally {
            if (!this._closed) {
                this.markReady();
                this.restoreScrollFocusWhenReady();
            }
        }
    }

    onBack() {
        return this.panel?.onBack() || false;
    }
    getNavigationState() {
        return this.panel?.getState() || null;
    }
    setNavigationState(saved) {
        this._savedState = saved;
    }
    getScrollContainer() {
        return this.$('.achievements-content');
    }

    destroy() {
        this._closed = true;
        this.panel?.destroy();
        super.destroy();
    }
}
