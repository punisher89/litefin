/**
 * Achievement Badges TV page — native Litefin navigation, webOS 6 compatible.
 * Server-side AchievementBadges plugin must be installed on Jellyfin.
 */
import '../styles/achievements.css';
import Page from './Page.js';
import { achievementBadges } from '../api/AchievementBadgesClient.js';
import { renderAchievementIcon } from '../utils/AchievementIcons.js';
import { localizeAchievementBadge, localizeAchievementRank, localizeAchievementQuest } from '../utils/AchievementBadgeLocalization.js';
import { achievementCornerToasts } from '../utils/AchievementCornerToasts.js';
import { AchievementExtras } from './AchievementsExtras.js';
import { toast } from '../ui/Toast.js';
import { focusManager } from '../ui/FocusManager.js';
import { logger } from '../utils/Logger.js';
import { i18n } from '../utils/i18n.js';

const log = logger.create('AchievementsPage');
const WORDS = {
    ru: {
        title: 'Достижения', subtitle: 'Ваш путь в мире кино',
        all: 'Все', unlocked: 'Получено', locked: 'В процессе',
        badges: 'Значки', quests: 'Задания', leaderboard: 'Рейтинг',
        rank: 'Ранг', next: 'До следующего ранга', score: 'Очки', earned: 'Открыто',
        streak: 'Дней подряд', bank: 'Баланс', recent: 'Ваши награды',
        noData: 'Пока нет достижений', noQuests: 'Задания пока недоступны',
        noLeaders: 'Рейтинг пока недоступен', daily: 'Ежедневные', weekly: 'Еженедельные',
        completed: 'Выполнено', equipped: 'Выбрано', equip: 'Выбрать',
        unequip: 'Убрать', retry: 'Повторить', unavailable: 'Плагин AchievementBadges не установлен или недоступен на сервере Jellyfin.',
        error: 'Не удалось загрузить достижения', loading: 'Загрузка достижений…',
        collection: 'Коллекция наград', noBadge: 'Нет значков в этой категории',
        common: 'Обычный', uncommon: 'Необычный', rare: 'Редкий',
        epic: 'Эпический', legendary: 'Легендарный', mythic: 'Мифический',
        actionError: 'Не удалось изменить выбранные значки',
        readOnly: 'Данные загружаются с сервера Jellyfin',
        shop: 'Магазин', cosmetics: 'Оформление', friends: 'Друзья', messages: 'Сообщения'
    },
    en: {
        title: 'Achievements', subtitle: 'Your cinema journey',
        all: 'All', unlocked: 'Unlocked', locked: 'In progress',
        badges: 'Badges', quests: 'Quests', leaderboard: 'Leaderboard',
        rank: 'Rank', next: 'Next rank', score: 'Score', earned: 'Unlocked',
        streak: 'Day streak', bank: 'Bank', recent: 'Your rewards',
        noData: 'No achievements yet', noQuests: 'No quests available',
        noLeaders: 'Leaderboard unavailable', daily: 'Daily', weekly: 'Weekly',
        completed: 'Completed', equipped: 'Equipped', equip: 'Equip',
        unequip: 'Unequip', retry: 'Retry', unavailable: 'AchievementBadges is not installed or unavailable on this Jellyfin server.',
        error: 'Could not load achievements', loading: 'Loading achievements…',
        collection: 'Badge collection', noBadge: 'No badges in this category',
        common: 'Common', uncommon: 'Uncommon', rare: 'Rare',
        epic: 'Epic', legendary: 'Legendary', mythic: 'Mythic',
        actionError: 'Could not update equipped badges',
        readOnly: 'Data comes from your Jellyfin server',
        shop: 'Shop', cosmetics: 'Cosmetics', friends: 'Friends', messages: 'Messages'
    }
};

function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (char) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);
}
function clampPercent(value) {
    return Math.max(0, Math.min(100, Number(value) || 0));
}
function safeList(value) {
    return Array.isArray(value) ? value : [];
}

export default class AchievementsPage extends Page {
    constructor() {
        super();
        this._isAsyncPage = true;
        this._tab = 'badges';
        this._filter = 'all';
        this._data = null;
        this._busy = false;
        this._loadId = 0;
        this._language = String(i18n.currentLang || 'en').toLowerCase().startsWith('ru') ? 'ru' : 'en';
        this.w = { ...WORDS[this._language] };
        this._serverTranslations = {};
        this.title = this.w.title;
        this._onClick = (e) => this._handleClick(e);
        this._extras = new AchievementExtras(this);
    }

    render() {
        return `<div class="page achievements-page">
            <main class="page-content achievements-scroll">
                <div class="achievements-shell">
                    <div class="achievements-header">
                        <div><div class="achievements-eyebrow">LITEFIN <span>✦</span> JELLYFIN</div>
                        <h1>${escapeHtml(this.w.title)}</h1>
                        <p>${escapeHtml(this.w.subtitle)}</p></div>
                        <div class="achievements-crown" aria-hidden="true">🏆</div>
                    </div>
                    <div id="achievements-content" aria-live="polite">
                        <div class="achievements-message">${escapeHtml(this.w.loading)}</div>
                    </div>
                </div>
            </main>
        </div>`;
    }

    onMounted() {
        this.el.addEventListener('click', this._onClick);
    }

    async onInit() {
        await this._loadData();
        this.markReady();
    }

    async _loadData() {
        const generation = ++this._loadId;
        this._setMessage(this.w.loading);
        try {
            if (!(await achievementBadges.isAvailable())) {
                if (generation === this._loadId) this._setMessage(this.w.unavailable, true);
                return;
            }

            const serverLanguage = String(i18n.currentLang || this._language).toLowerCase().split(/[-_]/)[0];
            const root = await Promise.all([
                achievementBadges.getSummary(), achievementBadges.getRank(),
                achievementBadges.getBadges(serverLanguage),
                achievementBadges.getEquipped(serverLanguage),
                achievementBadges.getTranslations(serverLanguage).catch(() => null)
            ]);
            if (generation !== this._loadId) return;

            // Optional endpoints must not prevent the main badges screen from working.
            const extras = await Promise.all([
                achievementBadges.getQuests().catch(() => null),
                achievementBadges.getBank().catch(() => null),
                achievementBadges.getLeaderboard().catch(() => [])
            ]);
            if (generation !== this._loadId) return;
            this._serverTranslations = (root[4] && typeof root[4] === 'object' && !Array.isArray(root[4])) ? root[4] : {};
            const keyMap = {
                title: 'achievements.title', unlocked: 'achievements.unlocked', locked: 'achievements.locked',
                all: 'achievements.all', rank: 'achievements.rank', next: 'achievements.next_rank',
                score: 'achievements.score', earned: 'achievements.total', streak: 'achievements.day_streak',
                badges: 'tabs.my_badges', quests: 'tabs.quests', leaderboard: 'tabs.leaderboard',
                collection: 'achievements.profile_title', noBadge: 'achievements.no_badges_match_filter',
                loading: 'achievements.loading', shop: 'loadout.tab.shop', cosmetics: 'loadout.tab.cosmetics',
                testNotifications: 'admin.section_test_toast'
            };
            this.w = { ...WORDS[this._language] };
            for (const [word, key] of Object.entries(keyMap)) {
                const value = this._serverTranslations[key];
                if (typeof value === 'string' && value.trim() &&
                    !(this._language === 'ru' && !/[А-Яа-яЁё]/.test(value))) this.w[word] = value;
            }
            const heading = this.$('.achievements-header h1');
            if (heading) heading.textContent = this.w.title;
            const subtitle = this.$('.achievements-header p');
            if (subtitle) {
                const translated = this._serverTranslations['achievements.profile_title'];
                subtitle.textContent = typeof translated === 'string' && translated.trim() &&
                    !(this._language === 'ru' && !/[А-Яа-яЁё]/.test(translated)) ?
                    translated : this.w.subtitle;
            }
            this._data = {
                summary: root[0] || {}, rank: root[1] || {},
                badges: safeList(root[2]).map(b => localizeAchievementBadge(b, serverLanguage, this._serverTranslations)),
                equipped: safeList(root[3]),
                quests: extras[0] || {}, bank: extras[1] || {},
                leaders: safeList(extras[2])
            };
            this._draw();
            this.restoreScrollFocusWhenReady();
        } catch (err) {
            log.warn('Achievement Badges load failed', err);
            if (generation === this._loadId) this._setMessage(this.w.error, true);
        }
    }

    _setMessage(message, retry = false) {
        const target = this.$('#achievements-content');
        if (!target) return;
        this._clearFocus();
        target.innerHTML = `<div class="achievements-message"><p>${escapeHtml(message)}</p>
            ${retry ? `<button class="achievement-action" tabindex="0" data-ach-action="retry">${escapeHtml(this.w.retry)}</button>` : ''}
            </div>`;
        if (retry) this._registerFocus('achievements-error', target, 'horizontal');
    }

    _clearFocus() {
        ['achievements-error', 'achievements-tabs', 'achievements-filters',
            'achievements-grid', 'achievements-quests', 'achievements-leaders', 'achievements-extra'].forEach((name) => {
            this.unregisterFocusSection(name);
        });
    }

    _registerFocus(name, element, orientation) {
        if (element && element.querySelector('[tabindex="0"]')) {
            this.registerFocusSection(name, element, { orientation, leaveLeft: 'sidebar' });
        }
    }

    _draw() {
        if (!this._data) return;
        const target = this.$('#achievements-content');
        if (!target) return;
        const { summary, rank, badges, bank } = this._data;
        const tier = rank.Tier || {};
        const translatedTier = localizeAchievementRank(tier.Name || 'Rookie', this._language, this._serverTranslations);
        const translatedNext = localizeAchievementRank((rank.NextTier || {}).Name || '', this._language, this._serverTranslations);
        const count = badges.filter((item) => item.Unlocked).length;
        const progress = clampPercent(rank.ProgressToNext);
        this._clearFocus();
        target.innerHTML = `
            <section class="achievements-hero">
                <div class="achievements-rank-icon" aria-hidden="true">✦</div>
                <div class="achievements-rank-info">
                    <span class="achievements-small">${escapeHtml(this.w.rank)}</span>
                    <h2>${escapeHtml(translatedTier)}</h2>
                    <div class="achievements-rank-track"><span style="width:${progress}%"></span></div>
                    <div class="achievements-rank-bottom"><span>${escapeHtml(this.w.next)}: ${escapeHtml(translatedNext || '—')}</span><b>${progress}%</b></div>
                </div>
                <div class="achievements-score"><span>${escapeHtml(this.w.score)}</span><strong>${Number(summary.Score || 0).toLocaleString()}</strong></div>
            </section>
            <div class="achievements-stats">
                <div><span>🏅 ${escapeHtml(this.w.earned)}</span><strong>${Number(summary.Unlocked ?? count)} <small>/ ${Number(summary.Total || badges.length)}</small></strong></div>
                <div><span>🔥 ${escapeHtml(this.w.streak)}</span><strong>${Number(summary.CurrentWatchStreak || 0)}</strong></div>
                <div><span>✦ ${escapeHtml(this.w.bank)}</span><strong>${Number(bank.ScoreBank || 0)}</strong></div>
            </div>
            <div class="achievements-tabs" id="achievements-tabs">
                ${['badges','quests','leaderboard','shop','cosmetics','friends','messages'].map((name) => `<button tabindex="0" data-ach-tab="${name}" class="${this._tab === name ? 'is-active' : ''}">${escapeHtml(this.w[name])}</button>`).join('')}
                <button tabindex="0" class="achievements-test-notification" data-ach-action="test-notification">🔔 ${escapeHtml(this.w.testNotifications || (this._language === 'ru' ? 'Проверить уведомления' : 'Test notification'))}</button>
            </div>
            <div id="achievements-tab-content">${this._renderTab()}</div>
            <p class="achievements-footer-note">${escapeHtml(this.w.readOnly)}</p>
        `;
        this._registerFocus('achievements-tabs', this.$('#achievements-tabs'), 'horizontal');
        this._registerTabFocus();
    }

    _renderTab() {
        if (['shop', 'cosmetics', 'friends', 'messages'].includes(this._tab)) return '<div class="achievements-message">' + escapeHtml(this.w.loading) + '</div>';
        if (this._tab === 'quests') return this._renderQuests();
        if (this._tab === 'leaderboard') return this._renderLeaderboard();
        return this._renderBadges();
    }

    _renderBadges() {
        const all = this._data.badges;
        const badges = all.filter((b) => this._filter === 'all' ||
            (this._filter === 'unlocked' ? b.Unlocked : !b.Unlocked));
        const equipped = new Set(this._data.equipped.map((b) => String(b.Id || b.Key)));
        return `<div class="achievements-section-title"><h2>${escapeHtml(this.w.collection)}</h2><span>${all.filter((b) => b.Unlocked).length} / ${all.length}</span></div>
            <div class="achievements-filters" id="achievements-filters">
                ${['all','unlocked','locked'].map((key) => `<button tabindex="0" class="${this._filter === key ? 'is-active' : ''}" data-ach-filter="${key}">${escapeHtml(this.w[key])}</button>`).join('')}
            </div>
            <div class="achievements-grid" id="achievements-grid">
                ${badges.length ? badges.map((b) => {
                    const id = String(b.Id || b.Key || '');
                    const isEquipped = equipped.has(id);
                    const pct = b.Unlocked ? 100 : clampPercent(100 * Number(b.CurrentValue || 0) / Math.max(1, Number(b.TargetValue || 1)));
                    const rarity = String(b.Rarity || 'Common');
                    return `<button tabindex="0" class="achievement-badge ${b.Unlocked ? 'is-unlocked' : 'is-locked'}"
                        data-ach-action="${b.Unlocked ? 'toggle-equip' : 'detail'}" data-ach-id="${escapeHtml(id)}"
                        aria-label="${escapeHtml(b.Title || 'Badge')}">
                        <div class="achievement-badge-art" data-rarity="${escapeHtml(rarity)}">${renderAchievementIcon(b.Icon, b)}${b.Unlocked ? '' : '<span class="achievement-lock-mark" aria-hidden="true">🔒</span>'}</div>
                        <div class="achievement-badge-meta">
                            <span class="achievement-rarity">${escapeHtml(this._serverTranslations['rarity.' + rarity.toLowerCase()] || this.w[rarity.toLowerCase()] || rarity)}</span>
                            <strong>${escapeHtml(b.Title || 'Badge')}</strong>
                            <p>${escapeHtml(b.Description || '')}</p>
                            <div class="achievement-progress"><span style="width:${pct}%"></span></div>
                            <small>${b.Unlocked ? escapeHtml(isEquipped ? this.w.equipped : this.w.equip) : (Number(b.CurrentValue || 0) + ' / ' + Number(b.TargetValue || 0))}</small>
                        </div>
                    </button>`;
                }).join('') : `<p class="achievements-empty">${escapeHtml(this.w.noBadge)}</p>`}
            </div>`;
    }

    _renderQuests() {
        const quests = this._data.quests;
        const renderGroup = (title, items, period, rerolls) => `<div class="achievement-extra-heading"><h2 class="achievements-quest-heading">${escapeHtml(title)}</h2>
                <button tabindex="0" data-ach-action="reroll" data-ach-period="${period}" ${rerolls <= 0 ? 'disabled' : ''}>
                    ${this._language === 'ru' ? 'Обновить задания' : 'Reroll quests'} (${rerolls})
                </button></div>
            <div class="achievements-quest-list">${safeList(items).map((q) => {
                const translatedQuest = localizeAchievementQuest(q, this._language, this._serverTranslations);
                const target = Math.max(1, Number(q.Target || 1));
                const current = Number(q.Current || 0);
                const pct = q.Completed ? 100 : clampPercent(current / target * 100);
                return `<div class="achievement-quest"><div class="achievement-quest-icon">🎯</div><div class="achievement-quest-info">
                    <strong>${escapeHtml(translatedQuest.Title || '')}</strong><p>${escapeHtml(translatedQuest.Description || '')}</p>
                    <div class="achievement-progress"><span style="width:${pct}%"></span></div>
                    <small>${q.Completed ? escapeHtml(this.w.completed) : (current + ' / ' + target)} · +${Number(q.Reward || 0)} XP</small>
                    </div></div>`;
            }).join('')}</div>`;
        const daily = safeList(quests.Daily);
        const weekly = safeList(quests.Weekly);
        if (!daily.length && !weekly.length) return `<p class="achievements-empty">${escapeHtml(this.w.noQuests)}</p>`;
        return `<div id="achievements-quest-controls">` + renderGroup(this.w.daily, daily, 'daily', Number(quests.DailyRerollsRemaining || 0)) + renderGroup(this.w.weekly, weekly, 'weekly', Number(quests.WeeklyRerollsRemaining || 0)) + `</div>`;
    }

    _renderLeaderboard() {
        const users = this._data.leaders;
        if (!users.length) return `<p class="achievements-empty">${escapeHtml(this.w.noLeaders)}</p>`;
        return `<div class="achievements-leaders" id="achievements-leaders">${users.map((entry, i) => `
            <div class="achievements-leader"><span class="achievements-position">${i + 1}</span><strong>${escapeHtml(entry.UserName || entry.Name || (entry.UserId === achievementBadges.userId ? 'You' : 'User'))}</strong>
            <span>${Number(entry.Score || 0).toLocaleString()} XP</span></div>`).join('')}</div>`;
    }

    _registerTabFocus() {
        this._registerFocus('achievements-filters', this.$('#achievements-filters'), 'horizontal');
        this._registerFocus('achievements-grid', this.$('#achievements-grid'), 'grid');
        this._registerFocus('achievements-quests', this.$('#achievements-quest-controls'), 'vertical');
        this._registerExtraFocus();
    }

    _registerExtraFocus() {
        this.unregisterFocusSection('achievements-extra');
        this._registerFocus('achievements-extra', this.$('#achievement-extra-controls'), 'grid');
    }

    async _handleClick(event) {
        const button = event.target.closest('button');
        if (!button || !this.el.contains(button)) return;
        if (button.dataset.achExtra) {
            await this._extras.handle(button);
        } else if (button.dataset.achTab) {
            this._tab = button.dataset.achTab;
            this._draw();
            const active = this.$('#achievements-tabs .is-active');
            if (active) active.focus();
            if (['shop', 'cosmetics', 'friends', 'messages'].includes(this._tab)) await this._extras.open(this._tab);
        } else if (button.dataset.achFilter) {
            this._filter = button.dataset.achFilter;
            this._draw();
            const active = this.$('#achievements-filters .is-active');
            if (active) active.focus();
        } else if (button.dataset.achAction === 'test-notification') {
            // Preview only: no server write or real achievement unlock.
            achievementCornerToasts.showBadge({
                Icon: 'emoji_events', Rarity: 'Legendary',
                Title: this.w.testNotifications || (this._language === 'ru' ? 'Тестовое уведомление' : 'Test notification'),
                Description: this._language === 'ru' ? 'Проверка уведомлений AchievementBadges' : 'AchievementBadges notification preview'
            }, this._language);
        } else if (button.dataset.achAction === 'retry') {
            await this._loadData();
        } else if (button.dataset.achAction === 'reroll' && !this._busy) {
            this._busy = true;
            const period = button.dataset.achPeriod;
            try {
                if (period !== 'daily' && period !== 'weekly') return;
                const result = await achievementBadges.rerollQuest(period);
                if (result?.Success === false) throw new Error(result.Message || 'Quest reroll rejected');
                this._data.quests = await achievementBadges.getQuests();
                this._draw();
            } catch (err) {
                log.warn('Quest reroll failed', err);
                toast.show(this._language === 'ru' ? 'Не удалось обновить задания' : 'Quest reroll failed', 4000);
            } finally {
                this._busy = false;
            }
        } else if (button.dataset.achAction === 'detail') {
            const badge = this._data && this._data.badges.find((b) => String(b.Id || b.Key) === button.dataset.achId);
            const note = this.$('.achievements-footer-note');
            if (note && badge) note.textContent = (badge.Title || '') + ': ' + (badge.Description || '');
        } else if (button.dataset.achAction === 'toggle-equip' && !this._busy) {
            this._busy = true;
            try {
                const id = button.dataset.achId;
                const equipped = this._data.equipped.some((b) => String(b.Id || b.Key) === id);
                const result = equipped ? await achievementBadges.unequip(id) : await achievementBadges.equip(id);
                this._data.equipped = safeList(result);
                this._draw();
                const current = Array.from(this.el.querySelectorAll('[data-ach-id]')).find((el) => el.dataset.achId === id);
                if (current) current.focus();
            } catch (err) {
                log.warn('Achievement equip action failed', err);
                this._setActionError();
            } finally {
                this._busy = false;
            }
        }
    }

    onBack() {
        return this._extras.onBack();
    }

    _setActionError() {
        const note = this.$('.achievements-footer-note');
        if (note) note.textContent = this.w.actionError;
    }

    onDestroyed() {
        this._loadId++;
        this._clearFocus();
        this._extras.destroy();
        if (this.el) this.el.removeEventListener('click', this._onClick);
    }
}
