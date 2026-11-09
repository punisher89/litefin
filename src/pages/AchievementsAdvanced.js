/**
 * AchievementBadges personal features missing from the basic TV hub.
 * This module renders server-backed content only; it never invents badge values.
 * It is designed around D-pad buttons and avoids browser-dependent chart libraries.
 */
import { achievementBadges as api } from '../api/AchievementBadgesClient.js';
import { achievementCornerToasts } from '../utils/AchievementCornerToasts.js';
import { renderAchievementIcon } from '../utils/AchievementIcons.js';
import { focusManager } from '../ui/FocusManager.js';
import { logger } from '../utils/Logger.js';

const log = logger.create('AchievementsAdvanced');
const safe = (v) => String(v == null ? '' : v).replace(/[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const list = (v) => Array.isArray(v) ? v : [];
const number = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;
const percent = (v) => Math.max(0, Math.min(100, number(v)));
const values = (v) => v && typeof v === 'object' ? Object.values(v) : [];
const date = (v, lang) => {
    const d = new Date(v);
    return !v || Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(lang);
};

export class AchievementsAdvanced {
    constructor(page) {
        this.page = page;
        this.tab = '';
        this._token = 0;
        this._cache = {};
        this._data = {};
        this._preferences = {};
        this._modal = null;
        this._modalTrapped = false;
    }

    t(ru, en) { return this.page._language === 'ru' ? ru : en; }

    server(key, ru, en) {
        const translation = this.page._serverTranslations?.[key];
        if (typeof translation === 'string' && translation.trim() &&
            !(this.page._language === 'ru' && !/[а-яё]/i.test(translation))) return translation;
        return this.t(ru, en);
    }

    _host() { return this.page.$('#achievements-tab-content'); }

    _show(html) {
        if (this._host()) this._host().innerHTML =
            '<section id="achievement-extra-controls" class="ab-advanced-panel">' + html + '</section>';
        this.page._registerExtraFocus();
    }

    async open(tab) {
        const ticket = ++this._token;
        this.tab = tab;
        this._show('<p class="achievements-message">' + safe(this.t('Загрузка...', 'Loading...')) + '</p>');
        const load = {
            activity: () => api.getActivityFeed(this._page || 1, 20),
            stats: () => Promise.allSettled([
                api.getRecap('year'), api.getCategoryProgress(), api.getRecords(),
                api.getStreakCalendar(), api.getWatchClock(), api.getBank()
            ]),
            showcase: () => Promise.allSettled([api.getShowcase(), api.getBadgeEta()]),
            goals: () => Promise.allSettled([api.getNextBadges(), api.getPersonalRecommendations()]),
            prestige: () => Promise.allSettled([api.getBank(), api.getPrestigeLeaderboard()]),
            settings: () => Promise.allSettled([api.getPreferences(), api.getPublicConfig()])
        }[tab];
        if (!load) return;
        try {
            const result = await load();
            if (ticket !== this._token || !this.page.el?.isConnected) return;
            this._data[tab] = result;
            if (tab === 'settings') this._preferences = result?.[0]?.value || {};
            this.render();
        } catch (err) {
            log.warn('Achievement extra data unavailable', tab, err);
            if (ticket === this._token) this._show(
                '<p class="achievements-message">' + safe(this.t('Данные пока недоступны', 'Data unavailable')) + '</p>' +
                '<button tabindex="0" data-ach-advanced="retry">' + safe(this.t('Повторить', 'Retry')) + '</button>');
        }
    }

    render() {
        const render = {
            activity: () => this._renderActivity(), stats: () => this._renderStats(),
            showcase: () => this._renderShowcase(), goals: () => this._renderGoals(),
            prestige: () => this._renderPrestige(), settings: () => this._renderSettings()
        }[this.tab];
        if (render) this._show(render());
    }

    _title(text, subtitle = '') {
        return '<header class="ab-advanced-heading"><h2>' + safe(text) + '</h2>' +
            (subtitle ? '<p>' + safe(subtitle) + '</p>' : '') + '</header>';
    }

    _metrics(metrics) {
        return '<div class="ab-advanced-metrics">' +
            metrics.map(([label, value, icon]) => '<div class="ab-advanced-metric"><span>' +
                safe(icon || '✦') + ' ' + safe(label) + '</span><strong>' +
                safe(number(value).toLocaleString()) + '</strong></div>').join('') + '</div>';
    }

    _bars(entries) {
        return '<div class="ab-advanced-bars">' + list(entries).map((entry) => {
            const label = entry.Category || entry.Name || entry.Key || entry.Title || '';
            const pct = percent(entry.Percentage ?? entry.Progress ?? (entry.Total ? 100 * number(entry.Unlocked) / entry.Total : 0));
            return '<div class="ab-advanced-bar"><div><strong>' + safe(label) +
                '</strong><span>' + Math.round(pct) + '%</span></div>' +
                '<div class="achievement-progress"><span style="width:' + pct + '%"></span></div></div>';
        }).join('') + '</div>';
    }

    _renderStats() {
        const r = list(this._data.stats).map(x => x.status === 'fulfilled' ? x.value : null);
        const recap = r[0] || {}, groups = list(r[1]), records = r[2] || {},
            streak = r[3] || {}, bank = r[5] || {};
        const watch = recap.Stats || recap.Summary || recap;
        const metrics = [
            [this.t('Всего просмотров', 'Total watches'), watch.TotalWatches || watch.TotalItems || watch.Watches, '▶'],
            [this.t('Просмотрено часов', 'Hours watched'), watch.HoursWatched || watch.TotalHours || watch.WatchHours, '◷'],
            [this.t('Очки за всё время', 'Lifetime score'), bank.LifetimeScore, '✦'],
            [this.t('Лучший марафон', 'Best marathon'), bank.BestComboCount || records.BestCombo, '🔥']
        ];
        const entries = groups.length ? groups : list(r[1]?.Categories);
        const history = list(streak.Days || streak.Entries || streak.Calendar);
        return this._title(this.server('tabs.stats', 'Статистика', 'Statistics'),
            this.t('Результаты с вашего Jellyfin сервера', 'Your Jellyfin viewing statistics')) +
            this._metrics(metrics) +
            '<h3>' + safe(this.t('Категории', 'Categories')) + '</h3>' +
            (entries.length ? this._bars(entries) : '<p class="achievements-empty">' +
                safe(this.t('Нет данных по категориям', 'No category data')) + '</p>') +
            '<h3>' + safe(this.t('Календарь просмотров', 'Watch calendar')) + '</h3>' +
            (history.length ? '<div class="ab-advanced-calendar">' + history.slice(-91).map((day) => {
                const count = number(day.Count ?? day.Watches ?? day.Value ?? day.count);
                return '<span class="ab-calendar-day" data-level="' + Math.min(4, count) +
                    '" title="' + safe((day.Date || '') + ' · ' + count) + '"></span>';
            }).join('') + '</div>' : '<p class="achievements-empty">' +
                safe(this.t('Календарь пока пуст', 'No calendar history yet')) + '</p>');
    }

    _renderActivity() {
        const data = this._data.activity || {};
        const entries = list(data.Entries || data.Items || data.Activity || data);
        const pg = Math.max(1, number(data.Page) || this._page || 1);
        const total = Math.max(pg, number(data.TotalPages) || Math.ceil(number(data.TotalCount) / 20) || pg);
        return this._title(this.server('tabs.activity', 'Лента событий', 'Activity feed')) +
            (entries.length ? '<div class="ab-advanced-activity">' + entries.map(item =>
                '<article class="ab-advanced-event"><span class="ab-event-icon">✦</span><div><strong>' +
                safe(item.UserName || item.User || '') + '</strong> ' +
                safe(item.BadgeTitle || item.Title || item.Description || item.Type || '') +
                '<small>' + safe(date(item.UnlockedAt || item.CreatedAt || item.Timestamp, this.page._language)) +
                '</small></div></article>').join('') + '</div>' :
                '<p class="achievements-empty">' + safe(this.t('Событий пока нет', 'No activity yet')) + '</p>') +
            '<div class="ab-advanced-pager"><button tabindex="0" data-ach-advanced="activity-page" data-page="' +
            (pg - 1) + '"' + (pg <= 1 ? ' disabled' : '') + '>‹</button><span>' + pg + ' / ' +
            total + '</span><button tabindex="0" data-ach-advanced="activity-page" data-page="' +
            (pg + 1) + '"' + (pg >= total ? ' disabled' : '') + '>›</button></div>';
    }

    _renderShowcase() {
        const r = list(this._data.showcase).map(x => x.status === 'fulfilled' ? x.value : null);
        const equipped = list(r[0]);
        const available = list(this.page._data?.badges).filter(b => b.Unlocked);
        const active = new Set(equipped.map(b => String(b.Id || b.Key)));
        const badgeCard = b => '<button tabindex="0" class="ab-advanced-badge" data-ach-advanced="showcase-toggle" data-id="' +
            safe(b.Id || b.Key) + '"><div class="ab-advanced-badge-icon">' +
            renderAchievementIcon(b.Icon, b) + '</div><strong>' + safe(b.Title || '') +
            '</strong><small>' + safe(active.has(String(b.Id || b.Key)) ?
                this.t('Снять с витрины', 'Remove') : this.t('Показать в профиле', 'Showcase')) +
            '</small></button>';
        return this._title(this.server('tabs.showcase', 'Витрина наград', 'Badge showcase'),
            this.t('Значки на вашем профиле', 'Badges displayed on your profile')) +
            '<h3>' + safe(this.t('Выбрано', 'Equipped')) + ' · ' + equipped.length + '</h3>' +
            '<div class="ab-advanced-badges">' + (equipped.map(badgeCard).join('') ||
                '<p class="achievements-empty">' + safe(this.t('Выберите награду ниже', 'Choose a badge below')) + '</p>') +
            '</div><h3>' + safe(this.t('Доступные награды', 'Unlocked badges')) + '</h3>' +
            '<div class="ab-advanced-badges">' + available.filter(b => !active.has(String(b.Id || b.Key))).map(badgeCard).join('') +
            '</div>';
    }

    _renderGoals() {
        const r = list(this._data.goals).map(x => x.status === 'fulfilled' ? x.value : null);
        const next = list(r[0]), recommended = list(r[1]?.Items || r[1]);
        return this._title(this.t('Цели и рекомендации', 'Goals and recommendations')) +
            '<h3>' + safe(this.t('Следующие достижения', 'Next achievements')) + '</h3>' +
            (next.length ? '<div class="ab-advanced-goals">' + next.map(b => {
                const pct = percent(100 * number(b.CurrentValue) / Math.max(1, number(b.TargetValue)));
                return '<div class="ab-advanced-goal"><div class="ab-advanced-goal-icon">' + renderAchievementIcon(b.Icon, b) +
                    '</div><div><strong>' + safe(b.Title) + '</strong><small>' + safe(b.Description) +
                    '</small><div class="achievement-progress"><span style="width:' + pct + '%"></span></div></div></div>';
            }).join('') + '</div>' : '<p class="achievements-empty">' +
                safe(this.t('Достижения не найдены', 'No upcoming badges')) + '</p>') +
            '<h3>' + safe(this.t('Что посмотреть', 'Suggested next watches')) + '</h3>' +
            (recommended.length ? recommended.map(it => '<div class="ab-advanced-event"><strong>' +
                safe(it.Name || it.Title) + '</strong><span>' + safe(it.Year || it.ProductionYear || '') +
                '</span></div>').join('') : '<p class="achievements-empty">' +
                safe(this.t('Рекомендаций пока нет', 'No suggestions yet')) + '</p>');
    }

    _renderPrestige() {
        const r = list(this._data.prestige).map(x => x.status === 'fulfilled' ? x.value : null);
        const bank = r[0] || {}, board = list(r[1]);
        const score = number(this.page._data?.summary?.Score);
        return this._title(this.t('Престиж', 'Prestige'),
            this.t('Новый цикл достижений с постоянным множителем', 'Restart achievements for a permanent multiplier')) +
            this._metrics([
                [this.t('Уровень престижа', 'Prestige level'), bank.PrestigeLevel, '✦'],
                [this.t('Очки всего', 'Lifetime score'), bank.LifetimeScore, '🏅'],
                [this.t('Текущий счёт', 'Current score'), score, '⭐']
            ]) +
            '<div class="ab-prestige-panel"><strong>' + safe(this.t('Следующий престиж', 'Next prestige')) +
            '</strong><p>' + safe(this.t('Для престижа требуется 12 000 очков. Прогресс достижений будет сброшен.',
                '12,000 score required. Achievement progress will reset.')) + '</p>' +
            '<div class="achievement-progress"><span style="width:' + percent(score / 120) + '%"></span></div>' +
            '<button tabindex="0" data-ach-advanced="prestige" ' + (score < 12000 ? 'disabled' : '') +
            '>' + safe(this.t('Начать новый цикл', 'Start new cycle')) + '</button></div>' +
            (board.length ? '<h3>' + safe(this.t('Таблица престижа', 'Prestige leaderboard')) + '</h3>' +
                board.slice(0, 10).map((u, i) => '<div class="ab-advanced-event"><span>#' + (i + 1) +
                    '</span><strong>' + safe(u.UserName || '') + '</strong><span>✦ ' +
                    number(u.PrestigeLevel) + '</span></div>').join('') : '');
    }

    _renderSettings() {
        const p = this._preferences || {};
        const publicConfig = this._data.settings?.[1]?.value || {};
        const toggles = [
            ['EnableUnlockToasts', 'Уведомления о достижениях', 'Achievement notifications'],
            ['EnableMilestoneToasts', 'Уведомления о рубежах', 'Milestone notifications'],
            ['EnableSound', 'Звук уведомлений', 'Notification sound'],
            ['EnableConfetti', 'Эффект конфетти', 'Confetti'],
            ['MuteToastsDuringPlayback', 'Скрывать во время просмотра', 'Hide while watching'],
            ['MuteToastSoundDuringPlayback', 'Выключать звук во время просмотра', 'Mute sound while watching'],
            ['MessageNotifications', 'Сообщения друзей', 'Friend message notifications'],
            ['MessageNotificationSound', 'Звук сообщений', 'Message sound'],
            ['MuteMessageNotificationsDuringPlayback', 'Отключать сообщения при просмотре', 'Mute messages while watching'],
            ['EnableCoWatchBonus', 'Бонус за совместные просмотры', 'Co-watch bonus'],
            ['AutoEquipNewUnlocks', 'Автоматически надевать новые награды', 'Auto-equip newly unlocked badges'],
            ['ShowEquippedShowcase', 'Показывать витрину значков', 'Show badge showcase'],
            ['SpoilerMode', 'Не показывать описания закрытых достижений', 'Hide locked badge descriptions'],
            ['ExtremeSpoilerMode', 'Полностью скрывать закрытые достижения', 'Hide locked badge details entirely'],
            ['HideFromLeaderboard', 'Скрыть меня в рейтинге', 'Hide me from leaderboard'],
            ['HideFromCompare', 'Запретить сравнение моего профиля', 'Hide me from comparisons'],
            ['AppearOffline', 'Отображаться офлайн для друзей', 'Appear offline to friends'],
            ['HideNowPlaying', 'Скрывать текущий просмотр', 'Hide now playing'],
            ['HideLastWatched', 'Скрывать последний просмотр', 'Hide last watched'],
            ['AppearInActivityFeed', 'Показывать меня в ленте', 'Show me in activity feed']
        ].filter(([k]) => k !== 'AppearInActivityFeed' ||
            !(publicConfig.ForcePrivacyMode || publicConfig.ActivityFeedEnabled === false));
        const toggleHtml = toggles.map(([key,ru,en]) => '<button type="button" tabindex="0" class="ab-setting-row" data-ach-advanced="toggle-pref" data-pref="' +
            key + '"><span>' + safe(this.t(ru,en)) + '</span><span class="ab-setting-switch ' +
            ((typeof p[key] === 'boolean' ? p[key] : !/^(Mute|Hide|AppearOffline|Spoiler|Extreme)/.test(key)) ? 'is-on' : '') + '">' +
            ((typeof p[key] === 'boolean' ? p[key] : !/^(Mute|Hide|AppearOffline|Spoiler|Extreme)/.test(key)) ? '●' : '○') + '</span></button>').join('');
        const select = (key, ru, en, opts, value) => '<div class="ab-setting-field"><label>' +
            safe(this.t(ru,en)) + '</label><div class="ab-setting-choices">' +
            opts.map(([v,l]) => '<button tabindex="0" data-ach-advanced="set-pref" data-pref="' + key +
                '" data-value="' + safe(v) + '" class="' + (String(value || '') === String(v) ? 'is-selected' : '') +
                '">' + safe(l) + '</button>').join('') + '</div></div>';
        const position = p.ToastPosition || publicConfig.DefaultToastPosition || 'top-right';
        return this._title(this.server('tabs.settings', 'Настройки AchievementBadges', 'AchievementBadges settings'),
            this.t('Персональные настройки сохраняются на сервере Jellyfin', 'Preferences are stored on your Jellyfin server')) +
            '<div class="ab-advanced-settings">' + toggleHtml +
            select('ToastPosition','Расположение уведомлений','Notification position',[
                ['top-right',this.t('Сверху справа','Top right')],['top-left',this.t('Сверху слева','Top left')],
                ['top-center',this.t('Сверху в центре','Top center')],
                ['bottom-right',this.t('Снизу справа','Bottom right')],
                ['bottom-left',this.t('Снизу слева','Bottom left')],
                ['bottom-center',this.t('Снизу в центре','Bottom center')]
            ],position) +
            select('MinimumToastRarity','Минимальная редкость','Minimum rarity',[
                ['all',this.t('Все','All')],['rare',this.t('Редкие','Rare')],
                ['epic',this.t('Эпические','Epic')],['legendary',this.t('Легендарные','Legendary')]
            ],p.MinimumToastRarity || 'all') +
            select('UnlockToastGrouping','Группировка уведомлений','Toast grouping',[
                ['grouped',this.t('Группой','Grouped')],['individual',this.t('Отдельно','Individual')]
            ],p.UnlockToastGrouping || 'grouped') +
            select('UnlockToastDeviceScope','На каких устройствах показывать','Toast device scope',[
                ['all-devices',this.t('На всех устройствах','All devices')],
                ['originating-device',this.t('Только на исходном устройстве','Originating device')]
            ],p.UnlockToastDeviceScope || 'all-devices') +
            select('AchievementPageTheme','Тема достижений','Achievement theme',[
                ['default',this.t('Серверная','Server default')],['dark',this.t('Тёмная','Dark')],
                ['light',this.t('Светлая','Light')]
            ],p.AchievementPageTheme || 'default') +
            select('Language','Язык AchievementBadges','Achievement language',[
                ['default',this.t('По настройке сервера','Server default')],['en','English'],
                ['de','Deutsch'],['es','Español'],['fr','Français'],['it','Italiano'],
                ['pt','Português'],['ja','日本語'],['zh','中文']
            ],p.Language || 'default') +
            '<button tabindex="0" class="ab-test-toast-button" data-ach-advanced="test-toast">' +
            safe(this.t('Проверить уведомление', 'Test notification')) + '</button></div>';
    }

    _confirm(message, operation) {
        this._pending = operation;
        const el = document.createElement('div');
        el.className = 'achievement-extra-modal';
        el.innerHTML = '<div class="achievement-extra-confirm" role="dialog" aria-modal="true">' +
            '<p>' + safe(message) + '</p><button tabindex="0" data-ach-advanced="confirm">' +
            safe(this.t('Подтвердить', 'Confirm')) + '</button>' +
            '<button tabindex="0" data-ach-advanced="cancel">' + safe(this.t('Отмена', 'Cancel')) +
            '</button></div>';
        this.page.el.appendChild(el);
        this._modal = el;
        focusManager.pushTrap(el, { orientation:'horizontal', defaultFocusSelector:'[data-ach-advanced="cancel"]' });
        this._modalTrapped = true;
    }

    _closeModal() {
        if (this._modalTrapped) { focusManager.popTrap(); this._modalTrapped = false; }
        this._modal?.remove();
        this._modal = null;
        this._pending = null;
    }

    onBack() {
        if (this._modal) { this._closeModal(); return true; }
        return false;
    }

    destroy() {
        ++this._token;
        this._closeModal();
    }

    async handle(button) {
        const action = button.dataset.achAdvanced;
        if (action === 'cancel') { this._closeModal(); return; }
        if (action === 'confirm') {
            const cb = this._pending;
            this._closeModal();
            if (cb) await this._mutate(cb);
            return;
        }
        if (action === 'retry') return this.open(this.tab);
        if (action === 'activity-page') {
            this._page = Math.max(1, number(button.dataset.page));
            return this.open('activity');
        }
        if (action === 'test-toast') {
            achievementCornerToasts.showBadge({
                Rarity:'Legendary', Title:this.t('Тест награды','Achievement preview'),
                Description:this.t('Оригинальный стиль уведомления','Original-style notification'), ScorePoints:100
            },this.page._language);
            return;
        }
        if (action === 'showcase-toggle') {
            const badgeId = button.dataset.id;
            const current = list(this._data.showcase?.[0]?.value);
            const isEquipped = current.some(b => String(b.Id || b.Key) === badgeId);
            return this._mutate(() => isEquipped ? api.unequip(badgeId) : api.equip(badgeId), 'showcase');
        }
        if (action === 'toggle-pref' || action === 'set-pref') {
            const key = button.dataset.pref;
            const current = typeof this._preferences[key] === 'boolean' ?
                this._preferences[key] : !/^(Mute|Hide|AppearOffline|Spoiler|Extreme)/.test(key);
            const update = action === 'toggle-pref' ? !current : button.dataset.value;
            return this._mutate(async () => {
                const payload = { ...this._preferences, [key]: update };
                const value = await api.savePreferences(payload);
                this._preferences = value && typeof value === 'object' ? value : payload;
                achievementCornerToasts.configure(api.userId, this._preferences,
                    this._data.settings?.[1]?.value || {});
            }, 'settings', false);
        }
        if (action === 'prestige') {
            this._confirm(this.t('Достижения и прогресс будут сброшены. Продолжить?',
                'Badges and achievement progress will reset. Continue?'), () => api.prestige());
        }
    }

    async _mutate(fn, tab = this.tab, reload = true) {
        try {
            await fn();
            if (reload) await this.page._loadData();
            await this.open(tab);
        } catch (e) {
            log.warn('Achievement action failed', e);
            this._show('<p class="achievements-message">' +
                safe(this.t('Не удалось сохранить изменения', 'Could not save changes')) + '</p>' +
                '<button tabindex="0" data-ach-advanced="retry">' +
                safe(this.t('Повторить', 'Retry')) + '</button>');
        }
    }
}
