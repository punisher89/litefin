import Component from '../core/Component.js';
import { api } from '../api/index.js';
import { router } from '../core/Router.js';
import { focusManager } from '../ui/FocusManager.js';
import { scrollController } from '../ui/ScrollController.js';
import { storage } from '../utils/StorageService.js';
import { customHeaders } from '../utils/CustomHeaders.js';
import { i18n } from '../utils/i18n.js';
import { logger } from '../utils/Logger.js';
import { installAchievementCompatibility } from '../plugins/AchievementBadgesCompat.js';
import AchievementBadgesClient, { achievementUrl } from '../plugins/achievement-badges/AchievementBadgesClient.js';
import NativeEnvironment from '../plugins/achievement-badges/NativeEnvironment.js';
import startSidebar from '../plugins/achievement-badges/vendor/SidebarRuntime.js';
import startPage from '../plugins/achievement-badges/vendor/StandaloneRuntime.js';
import startNotifications from '../plugins/achievement-badges/vendor/NotificationRuntime.js';

const log = logger.create('AchievementBadgesPanel');
const CONTROLS = 'button, a[href], input, select, textarea, [role="button"], [tabindex="0"]';

/** Native Litefin component: bundled renderer, shared DOM/focus/scroll, no web view. */
export default class AchievementBadgesPanel extends Component {
    render() {
        return '<div class="achievement-native-panel"></div>';
    }

    async initialize() {
        this.client = new AchievementBadgesClient({
            getSession: () => ({ serverUrl: api.serverUrl, userId: api.userId, accessToken: api.accessToken }),
            getHeaders: (url) => customHeaders.getHeadersForUrl(url, api.serverUrl),
            fetch: window.fetch.bind(window)
        });
        this.client.root = this.el;
        const response = await this.client.fetch(
            achievementUrl(api.serverUrl, '/Plugins/AchievementBadges/public-config')
        );
        if (!response.ok) throw new Error('AchievementBadges unavailable');
        const config = await response.json();
        if (!config || typeof config.LeaderboardEnabled !== 'boolean')
            throw new Error('Invalid AchievementBadges response');
        if (this._closed) return;
        this.environment = new NativeEnvironment(this.el, {
            title: i18n.t('Achievements'),
            serverUrl: api.serverUrl,
            storage,
            log,
            storagePrefix: 'achievement-badges:' + encodeURIComponent(api.serverUrl) + ':' + api.userId + ':',
            fetch: (url, init) => this.client.fetch(url, init),
            navigate: (path) => this._navigate(path),
            apiClient: {
                accessToken: () => this.client._activeSession().accessToken,
                getCurrentUserId: () => this.client._activeSession().userId,
                deviceId: () => api.deviceId,
                getUrl: (path) => achievementUrl(api.serverUrl, path),
                getUserImageUrl: (id) => this.client.avatarUrl(id)
            }
        });
        this._removeCompatibility = installAchievementCompatibility(this.environment.window, async () => '');
        startSidebar(this.environment.scope);
        startPage(this.environment.scope);
        startNotifications(this.environment.scope);
        const testButton = document.createElement('button');
        testButton.type = 'button';
        testButton.className = 'abSaStyleToggleBtn ab-native-test';
        testButton.textContent = i18n.t('AchievementsTestNotification');
        testButton.addEventListener('click', () => this.environment.window.abAchievementTestToast('rare'));
        this.el.querySelector('.ab-topbar').appendChild(testButton);
        this._onClick = (event) => {
            const link = event.target.closest('a[href]');
            if (link?.classList.contains('ab-back')) {
                event.preventDefault();
                router.navigate('/home');
            }
        };
        this.el.addEventListener('click', this._onClick);
        this._onWheel = (event) => this._wheel(event);
        this.el.addEventListener('wheel', this._onWheel, { passive: false });
        this._observer = new MutationObserver(() => {
            if (this._refreshFrame) return;
            this._refreshFrame = requestAnimationFrame(() => {
                this._refreshFrame = null;
                if (!this._closed) this._refreshControls();
            });
        });
        this._observer.observe(this.el, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class']
        });
        this._refreshControls();
    }

    _navigate(path) {
        const clean = String(path).replace(/^#/, '');
        if (clean.startsWith('/achievements')) {
            this.environment.window.abAchievementRouteTarget?.();
            return;
        }
        const details = /\/(?:details|item)\?id=([^&]+)/i.exec(clean);
        router.navigate(details ? '/details/' + encodeURIComponent(decodeURIComponent(details[1])) : clean);
    }

    _refreshControls() {
        this.el.querySelectorAll('.ab-card[style*="pointer"]').forEach((card) => card.setAttribute('role', 'button'));
        this.el.querySelectorAll(CONTROLS).forEach((control) => {
            if (control.tagName === 'INPUT' && control.type === 'hidden') return;
            if (!control.classList.contains('focusable')) control.classList.add('focusable');
            if (control.tabIndex < 0) control.tabIndex = 0;
        });
        focusManager.invalidateCache('achievements-content');
        scrollController.invalidateMetrics();
        const modal = Array.from(
            this.el.querySelectorAll('.ab-modal-backdrop, #abFriendsDrawer, #abMsgConfirm, #abNewGroupOverlay')
        )
            .reverse()
            .find((element) => element.getBoundingClientRect().width > 0 && element.getBoundingClientRect().height > 0);
        if (modal !== this._modal) {
            if (this._modal) focusManager.popTrap();
            this._modal = modal;
            if (modal) focusManager.pushTrap(modal, { orientation: 'grid' });
        }
    }

    _wheel(event) {
        if (event.ctrlKey || event.defaultPrevented) return;
        const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.shiftKey;
        const axis = horizontal ? 'horizontal' : 'vertical';
        let container = event.target;
        while (container && container !== this.el.parentElement.parentElement) {
            const style = getComputedStyle(container);
            if (
                horizontal
                    ? container.scrollWidth > container.clientWidth && /auto|scroll/.test(style.overflowX)
                    : container.scrollHeight > container.clientHeight && /auto|scroll/.test(style.overflowY)
            )
                break;
            container = container.parentElement;
        }
        if (!container || container === this.el.parentElement.parentElement) return;
        const raw = horizontal && event.deltaX ? event.deltaX : event.deltaY;
        const delta = raw * (event.deltaMode === 1 ? 32 : event.deltaMode === 2 ? container.clientHeight : 1);
        const current = horizontal ? container.scrollLeft : scrollController.getVerticalScroll(container);
        const max = horizontal
            ? container.scrollWidth - container.clientWidth
            : container.scrollHeight - container.clientHeight;
        const continued =
            this._wheelContainer === container &&
            this._wheelAxis === axis &&
            Date.now() - this._wheelTime < 180 &&
            Math.sign(delta) === Math.sign(this._wheelTarget - current);
        const target = Math.max(0, Math.min(max, (continued ? this._wheelTarget : current) + delta));
        if (target === current) return;
        event.preventDefault();
        this._wheelContainer = container;
        this._wheelTarget = target;
        this._wheelAxis = axis;
        this._wheelTime = Date.now();
        const reduced =
            this.environment.scope.localStorage.getItem('ab-reduced-motion') === 'true' ||
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        scrollController.smoothScrollTo(container, target, reduced ? 0 : null, axis);
    }

    onBack() {
        if (!this.el || this._closed) return false;
        const close = Array.from(this.el.querySelectorAll('.ab-modal-close, [data-ab-pc-close], #abFriendsClose')).find(
            (element) => element.getBoundingClientRect().width > 0
        );
        if (close) {
            close.click();
            return true;
        }
        return false;
    }

    getState() {
        if (!this.el) return null;
        return {
            tab: this.el.querySelector('.ab-tab.active')?.id?.replace('abSaTab', '').toLowerCase(),
            search: this.el.querySelector('#abSaSearch')?.value || ''
        };
    }

    restoreState(saved) {
        if (saved?.tab) this.environment.window.abAchievementSelectTab(saved.tab);
        if (saved?.search) {
            const search = this.el.querySelector('#abSaSearch');
            search.value = saved.search;
            search.dispatchEvent(new Event('input'));
        }
    }

    destroy() {
        this._closed = true;
        if (this._refreshFrame) cancelAnimationFrame(this._refreshFrame);
        this._observer?.disconnect();
        if (this._modal) focusManager.popTrap();
        this._removeCompatibility?.();
        this.client?.destroy();
        this.environment?.destroy();
        if (this._wheelContainer) scrollController.cancelAnimation(this._wheelAxis);
        super.destroy();
    }
}
