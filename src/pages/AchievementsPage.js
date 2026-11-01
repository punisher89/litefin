import Page from './Page.js';
import { api } from '../api/index.js';
import { i18n } from '../utils/i18n.js';
import {
    localizeAchievementBadge,
    localizeAchievementQuest,
    localizeAchievementCatalogItem,
    localizeAchievementPowerUp,
    localizeAchievementPowerUpType,
    localizeAchievementRank,
    localizeAchievementMessage
} from '../utils/AchievementBadgeLocalization.js';
import { logger } from '../utils/Logger.js';
import { focusManager } from '../ui/FocusManager.js';
import { achievementNotifications } from '../utils/AchievementNotifications.js';
import '../styles/achievements.css';

const log = logger.create('AchievementsPage');

const GAME_TEXT = {
    ru: {
        overviewTab: 'Обзор', badgesTab: 'Достижения', questsTab: 'Задания', shopTab: 'Магазин', statsTab: 'Статистика', eyebrow: 'JELLYFIN · ИГРОВОЙ ЦЕНТР', intro: 'Собирай награды за просмотр, открывай новые уровни и пополняй свою коллекцию.', playerLevel: 'ТВОЙ ТЕКУЩИЙ РАНГ', progressToNext: 'Путь к следующему рангу', nextRank: 'Следующий ранг: {name}', maxRank: 'Максимальный ранг достигнут', badgeCollection: 'Коллекция наград', game: 'Игровой центр', arsenal: 'Арсенал', shop: 'Магазин', cosmetics: 'Косметика', gifts: 'Подарить очки',
        scoreBank: 'Доступно очков', spent: 'Потрачено всего', loadingGame: 'Загружаем игровые данные…',
        arsenalEmpty: 'Пока нет усилений. Их можно приобрести в магазине за очки.',
        shopIntro: 'Покупай усиления и оформление профиля за заработанные очки.',
        cosmeticsIntro: 'Твои предметы. Выбирай, что показывать в профиле.',
        giftIntro: 'Передай часть своих очков другому пользователю этого Jellyfin-сервера.',
        noCosmetics: 'Пока нет косметических предметов. Загляни в магазин.',
        buy: 'Купить', owned: 'Уже куплено', equipped: 'Установлено', equip: 'Применить', use: 'Активировать',
        active: 'Активно', quantity: 'Количество', price: 'Цена', score: 'очков',
        automatic: 'Срабатывает автоматически, когда это необходимо.',
        recipient: 'Получатель', chooseUser: 'Выбери пользователя', amount: 'Сколько очков передать',
        sendGift: 'Передать очки', usersLoading: 'Загружаем список пользователей…', noUsers: 'Нет доступных получателей.',
        questReroll: 'Обновить задания', rerollUsed: 'Обновление использовано', rerollLeft: 'Осталось: 1',
        confirmBuy: 'Купить «{name}» за {price} очков?', confirmUse: 'Активировать «{name}»?',
        confirmEquip: 'Применить «{name}»?', confirmGift: 'Передать {amount} очков пользователю «{name}»?',
        confirmReroll: 'Заменить все текущие {period} задания? Старые задания будут потеряны.',
        daily: 'ежедневные', weekly: 'еженедельные', purchaseOk: 'Покупка выполнена.', useOk: 'Усиление активировано.',
        equipOk: 'Предмет применён.', giftOk: 'Очки переданы.', rerollOk: 'Задания обновлены.',
        actionFailed: 'Не удалось выполнить действие.', notEnough: 'Недостаточно очков.', milestone: 'Откроется за достижения прогресса',
        activeUntil: 'Действует до', loadingUsers: 'Список пользователей загружается…',
        shopPowerups: 'Усиления', shopCosmetics: 'Оформление профиля',
        inventory: 'В инвентаре', balance: 'Баланс', viewShop: 'Перейти в магазин', testNotifications: 'Проверить уведомления', needMoreScore: 'Для покупки не хватает {amount} очков.', needMoreScoreShort: 'Не хватает {amount} ⭐',
        statsIntro: 'Подробная картина просмотров и прогресса за выбранный период.',
        statsWeek: '7 дней', statsMonth: '30 дней', statsYear: 'Год',
        statsLoading: 'Собираем статистику с сервера…', statsUnavailable: 'Статистика пока недоступна.',
        statsTotal: 'Всего просмотров', statsMovies: 'Фильмы', statsEpisodes: 'Эпизоды', statsDays: 'Дней с просмотрами', statsUnlocked: 'Получено достижений',
        statsHeatmap: 'Календарь просмотров', statsHeatmapHint: 'Последние 90 дней. Чем ярче ячейка, тем больше просмотров за день.',
        statsCategories: 'Прогресс по категориям', statsRecords: 'Личные рекорды', statsGoals: 'Ближайшие цели',
        statsGenres: 'Любимые жанры', statsDirectors: 'Режиссёры', statsActors: 'Актёры',
        statsNoData: 'Пока нет данных за этот период.', statsNoGoals: 'Пока нет ближайших целей.',
        statsHours: 'ч', statsHoursWatched: 'Часов просмотра', statsBestStreak: 'Лучшая серия', statsRewatches: 'Повторные просмотры',
        statsUniqueGenres: 'Жанров просмотрено', statsLongest: 'Самый длинный просмотр', statsCombo: 'Лучшая комбинация',
        statsApproxClock: 'Распределение по времени (оценка)', statsApproxClockHint: 'Это оценочное распределение сервера, а не точная история времени запуска.',
        statsYearWrapped: 'Итоги {year} года', statsActiveDays: 'Активных дней', statsTopMonth: 'Самый активный месяц',
        statsTopDay: 'Самый активный день недели', statsBiggestDay: 'Рекордный день'
    },
    en: {
        overviewTab: 'Overview', badgesTab: 'Achievements', questsTab: 'Quests', shopTab: 'Shop', statsTab: 'Stats', eyebrow: 'JELLYFIN · GAME CENTER', intro: 'Earn rewards for every watch, climb the ranks and build your personal collection.', playerLevel: 'YOUR CURRENT RANK', progressToNext: 'Progress to next rank', nextRank: 'Next rank: {name}', maxRank: 'Maximum rank reached', badgeCollection: 'Badge Collection', game: 'Game Center', arsenal: 'Arsenal', shop: 'Shop', cosmetics: 'Cosmetics', gifts: 'Gift score',
        scoreBank: 'Available score', spent: 'Total spent', loadingGame: 'Loading game data…',
        arsenalEmpty: 'No power-ups yet. Buy some in the shop with your score.',
        shopIntro: 'Spend earned score on power-ups and profile cosmetics.',
        cosmeticsIntro: 'Your owned items. Choose what to show on your profile.',
        giftIntro: 'Send some of your score to another user on this Jellyfin server.',
        noCosmetics: 'No cosmetics yet. Visit the shop.',
        buy: 'Buy', owned: 'Owned', equipped: 'Equipped', equip: 'Equip', use: 'Activate',
        active: 'Active', quantity: 'Quantity', price: 'Price', score: 'score',
        automatic: 'Consumed automatically when needed.',
        recipient: 'Recipient', chooseUser: 'Choose a user', amount: 'Score amount',
        sendGift: 'Send score', usersLoading: 'Loading users…', noUsers: 'No recipients available.',
        questReroll: 'Reroll quests', rerollUsed: 'Reroll used', rerollLeft: 'Remaining: 1',
        confirmBuy: 'Buy “{name}” for {price} score?', confirmUse: 'Activate “{name}”?',
        confirmEquip: 'Equip “{name}”?', confirmGift: 'Send {amount} score to “{name}”?',
        confirmReroll: 'Replace all current {period} quests? The old quests will be lost.',
        daily: 'daily', weekly: 'weekly', purchaseOk: 'Purchase completed.', useOk: 'Power-up activated.',
        equipOk: 'Item equipped.', giftOk: 'Score sent.', rerollOk: 'Quests rerolled.',
        actionFailed: 'The action could not be completed.', notEnough: 'Not enough score.', milestone: 'Unlocked through progress milestones',
        activeUntil: 'Active until', loadingUsers: 'Loading user list…',
        shopPowerups: 'Power-ups', shopCosmetics: 'Profile cosmetics',
        inventory: 'In inventory', balance: 'Balance', viewShop: 'Open shop', testNotifications: 'Test notification', needMoreScore: 'You need {amount} more score to buy this item.', needMoreScoreShort: 'Need {amount} ⭐',
        statsIntro: 'A detailed view of your watching activity and progress for the selected period.',
        statsWeek: '7 days', statsMonth: '30 days', statsYear: 'Year',
        statsLoading: 'Loading statistics from the server…', statsUnavailable: 'Statistics are not available yet.',
        statsTotal: 'Total watches', statsMovies: 'Movies', statsEpisodes: 'Episodes', statsDays: 'Days watched', statsUnlocked: 'Badges unlocked',
        statsHeatmap: 'Watch calendar', statsHeatmapHint: 'Last 90 days. Brighter cells indicate more watches on that day.',
        statsCategories: 'Progress by category', statsRecords: 'Personal records', statsGoals: 'Next goals',
        statsGenres: 'Top genres', statsDirectors: 'Top directors', statsActors: 'Top actors',
        statsNoData: 'No data for this period yet.', statsNoGoals: 'No nearby goals right now.',
        statsHours: 'h', statsHoursWatched: 'Hours watched', statsBestStreak: 'Best streak', statsRewatches: 'Rewatches',
        statsUniqueGenres: 'Genres watched', statsLongest: 'Longest watch', statsCombo: 'Best combo',
        statsApproxClock: 'Viewing time distribution (estimated)', statsApproxClockHint: 'This is a server-side estimate, not an exact record of playback start times.',
        statsYearWrapped: '{year} year in review', statsActiveDays: 'Active days', statsTopMonth: 'Most active month',
        statsTopDay: 'Most active weekday', statsBiggestDay: 'Biggest day'
    }
};

let gameCenterServerTranslations = null;

function normalizeServerTranslations(value) {
    if (typeof value === 'string') {
        try { value = JSON.parse(value); } catch (_) { return null; }
    }
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

function gameText(key, replacements = {}) {
    const language = String(i18n.currentLang || (typeof document !== 'undefined' && document.documentElement.lang) || 'en').toLowerCase();
    const dictionary = language.startsWith('ru') ? GAME_TEXT.ru : GAME_TEXT.en;
    let text = dictionary[key] || GAME_TEXT.en[key] || key;
    Object.keys(replacements).forEach((name) => {
        text = text.replace(new RegExp('\\{' + name + '\\}', 'g'), String(replacements[name]));
    });
    return text;
}
}

function arrayOf(object, ...keys) {
    const value = valueOf(object, ...keys);
    return Array.isArray(value) ? value : [];
}

function cosmeticKindLabel(kind) {
    const ru = String(i18n.currentLang || (typeof document !== 'undefined' && document.documentElement.lang) || 'en').toLowerCase().startsWith('ru');
    const normalized = String(kind || '')
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/[_-]+/g, ' ')
        .trim()
        .toLowerCase();
    const labels = ru
        ? {
              'profile theme': 'Тема профиля',
              'badge frame': 'Рамка значка',
              'rank title': 'Титул',
              avatar: 'Аватар',
              background: 'Фон',
              'profile border': 'Рамка профиля',
              'animated background': 'Анимированный фон',
              'avatar frame': 'Рамка аватара'
          }
        : {
              'profile theme': 'Profile theme',
              'badge frame': 'Badge frame',
              'rank title': 'Rank title',
              avatar: 'Avatar',
              background: 'Background',
              'profile border': 'Profile border',
              'animated background': 'Animated background',
              'avatar frame': 'Avatar frame'
          };
    return labels[normalized] || (ru ? 'Предмет' : kind || 'Item');
}

function cosmeticEquipField(kind) {
    return ({
        ProfileTheme: 'EquippedThemeId', BadgeFrame: 'EquippedBadgeFrameId',
        RankTitle: 'EquippedCustomTitleId', Avatar: 'EquippedAvatarId',
        Background: 'EquippedBackgroundId', ProfileBorder: 'EquippedProfileBorderId'
    })[kind] || '';
}

function valueOf(object, ...keys) {
    if (!object) return undefined;
    for (const key of keys) {
        if (object[key] !== undefined && object[key] !== null) return object[key];
    }
    return undefined;
}

function escapeHtml(value) {
    return String(value === undefined || value === null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function badgeIcon(badge) {
    const icon = String(valueOf(badge, 'Icon', 'icon') || '').trim();
    if (icon && icon.length <= 4 && !/^[a-z0-9_ -]+$/i.test(icon)) return icon;

    const key = icon.toLowerCase();
    const known = {
        military_tech: '🏅',
        trophy: '🏆',
        movie: '🎬',
        live_tv: '📺',
        whatshot: '🔥',
        schedule: '⏱️',
        star: '⭐',
        local_movies: '🎞️',
        music_note: '🎵',
        menu_book: '📚',
        videogame_asset: '🎮',
        public: '🌍',
        calendar_month: '📅'
    };
    if (known[key]) return known[key];

    const category = String(valueOf(badge, 'Category', 'category') || '').toLowerCase();
    if (category.includes('music')) return '🎵';
    if (category.includes('book')) return '📚';
    if (category.includes('game')) return '🎮';
    if (category.includes('series') || category.includes('episode')) return '📺';
    if (category.includes('film') || category.includes('movie')) return '🎬';
    return '🏆';
}

function localizedBadgeValue(value, kind, serverTranslations = null) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const serverKey = kind === 'rarity' ? 'rarity.' + raw.toLowerCase() : 'category.' + raw;
    const serverValue = serverTranslations && serverTranslations[serverKey];
    if (typeof serverValue === 'string' && serverValue.trim()) return serverValue;
    const language = String(i18n.currentLang || (typeof document !== 'undefined' && document.documentElement.lang) || 'en').toLowerCase();
    if (!language.startsWith('ru')) return raw;

    const key = raw.toLowerCase().replace(/[_-]+/g, ' ').trim();
    const dictionaries = {
        rarity: {
            common: 'Обычное', uncommon: 'Необычное', rare: 'Редкое',
            epic: 'Эпическое', legendary: 'Легендарное', mythic: 'Мифическое',
            unique: 'Уникальное', special: 'Особое'
        },
        category: {
            movie: 'Фильмы', movies: 'Фильмы', film: 'Фильмы', films: 'Фильмы',
            series: 'Сериалы', tv: 'Телевидение', episode: 'Сериалы',
            music: 'Музыка', book: 'Книги', books: 'Книги',
            game: 'Игры', games: 'Игры', general: 'Общие',
            watchtime: 'Время просмотра', 'watch time': 'Время просмотра',
            playback: 'Просмотр', streak: 'Серии просмотров',
            social: 'Социальные', collection: 'Коллекции',
            'getting started': 'Начало пути', binge: 'Марафоны',
            'night watching': 'Ночные просмотры', 'morning watching': 'Утренние просмотры',
            'weekend watching': 'Просмотры в выходные', exploration: 'Исследование',
            streaks: 'Серии просмотров', 'episode marathons': 'Марафоны эпизодов',
            'film marathons': 'Киномарафоны', 'best streaks': 'Лучшие серии просмотров',
            eras: 'Эпохи', world: 'Мир', languages: 'Языки', genres: 'Жанры',
            runtime: 'Длительность', 'total time': 'Общее время', holidays: 'Праздники',
            rewatch: 'Повторные просмотры', 'library completion': 'Завершение библиотек',
            discography: 'Дискография', loyalty: 'Преданность', people: 'Люди',
            hidden: 'Скрытые', 'genre specialist': 'Знаток жанров', prestige: 'Престиж',
            'score economy': 'Экономика очков', combos: 'Комбинации', meta: 'Особые достижения',
            decades: 'Десятилетия', weekdays: 'Дни недели', endurance: 'Выносливость',
            'afternoon watching': 'Дневные просмотры', 'prime time': 'Прайм-тайм',
            anime: 'Аниме', 'studio specialist': 'Знаток студий',
            'pilot vs completer': 'Пилот или финал'
        }
    };
    return dictionaries[kind] && dictionaries[kind][key] ? dictionaries[kind][key] : raw;
}
}

function achievementLocale() {
    return String(i18n.currentLang || (typeof document !== 'undefined' && document.documentElement.lang) || 'en-US').replace(/_/g, '-');
}

function achievementNumber(value) {
    const number = Number(value) || 0;
    try {
        return number.toLocaleString(achievementLocale());
    } catch (_) {
        return String(number);
    }
}

function achievementDate(value, dateOnly = false) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    try {
        return dateOnly ? date.toLocaleDateString(achievementLocale()) : date.toLocaleString(achievementLocale());
    } catch (_) {
        return dateOnly ? date.toLocaleDateString() : date.toLocaleString();
    }
}

function progressPercent(current, target) {
    const goal = Number(target) || 0;
    if (goal <= 0) return 0;
    return Math.max(0, Math.min(100, (Number(current) || 0) / goal * 100));
}

class AchievementsPage extends Page {
    constructor() {
        super();
        this.title = i18n.t('Achievements');
        this._isAsyncPage = true;
        this._filter = 'all';
        this._visibleBadgeCount = 24;
        this._data = null;
        this._loading = false;
        this._userId = null;
        this._userPath = '';
        this._loadout = null;
        this._giftUsers = null;
        this._giftUsersLoading = false;
        this._statsPeriod = 'month';
        this._statsCache = Object.create(null);
        this._statsSharedPromise = null;
        this._statsRequestId = 0;
        this._serverTranslations = null;
    }

    render() {
        return `
            <div class="page achievements-page">
                <main class="page-content achievements-content">
                    <header class="achievements-header">
                        <div>
                            <div class="achievements-eyebrow">${escapeHtml(gameText('eyebrow'))}</div>
                            <h1>${escapeHtml(i18n.t('Achievements'))}</h1>
                            <p class="achievements-intro">${escapeHtml(gameText('intro'))}</p>
                        </div>
                        <div class="achievements-header-actions">
                            <button class="achievements-refresh focusable achievements-test-notification" id="achievements-test-notification" type="button" tabindex="0">
                                <span aria-hidden="true">🔔</span> ${escapeHtml(gameText('testNotifications'))}
                            </button>
                            <button class="achievements-refresh focusable" id="achievements-refresh" type="button" tabindex="0">
                                <span aria-hidden="true">↻</span> ${escapeHtml(i18n.t('AchievementRefresh'))}
                            </button>
                        </div>
                    </header>

                    <section class="achievements-player-panel" aria-label="${escapeHtml(gameText('game'))}">
                        <div class="achievements-player-main">
                            <span class="achievements-player-emblem" aria-hidden="true">👑</span>
                            <div class="achievements-player-identity">
                                <small>${escapeHtml(gameText('playerLevel'))}</small>
                                <strong id="achievement-player-rank">—</strong>
                                <span id="achievement-player-next">${escapeHtml(gameText('loadingGame'))}</span>
                            </div>
                        </div>
                        <div class="achievements-player-score">
                            <small>${escapeHtml(gameText('scoreBank'))}</small>
                            <strong><span id="achievement-player-score">—</span> ⭐</strong>
                        </div>
                        <div class="achievements-player-progress">
                            <div class="achievements-player-progress-label"><span>${escapeHtml(gameText('progressToNext'))}</span><strong id="achievement-player-percent">0%</strong></div>
                            <div class="achievement-progress"><span id="achievement-player-progress" style="width:0%"></span></div>
                        </div>
                    </section>
                    <nav class="achievements-main-tabs" role="tablist" aria-label="${escapeHtml(gameText('game'))}">
                        <button class="achievements-main-tab focusable active" data-game-section="overview" type="button" role="tab" aria-selected="true" tabindex="0">⌂ ${escapeHtml(gameText('overviewTab'))}</button>
                        <button class="achievements-main-tab focusable" data-game-section="badges" type="button" role="tab" aria-selected="false" tabindex="0">🏅 ${escapeHtml(gameText('badgesTab'))}</button>
                        <button class="achievements-main-tab focusable" data-game-section="quests" type="button" role="tab" aria-selected="false" tabindex="0">⚡ ${escapeHtml(gameText('questsTab'))}</button>
                        <button class="achievements-main-tab focusable" data-game-section="shop" type="button" role="tab" aria-selected="false" tabindex="0">🛍 ${escapeHtml(gameText('shopTab'))}</button>
                        <button class="achievements-main-tab focusable" data-game-section="stats" type="button" role="tab" aria-selected="false" tabindex="0">📊 ${escapeHtml(gameText('statsTab'))}</button>
                    </nav>
                    <div class="achievements-error" id="achievements-error" role="status" hidden></div>
                    <div class="achievements-loading" id="achievements-loading">${escapeHtml(i18n.t('Loading'))}</div>

                    <section class="achievements-overview achievements-main-panel" id="achievements-overview" data-game-section-panel="overview" aria-live="polite"></section>
                    <section class="achievements-section achievements-main-panel achievements-stats-section" id="achievements-stats-section" data-game-section-panel="stats" hidden>
                        <div class="achievements-stats-heading">
                            <div>
                                <h2>${escapeHtml(gameText('statsTab'))}</h2>
                                <p>${escapeHtml(gameText('statsIntro'))}</p>
                            </div>
                            <div class="achievements-stats-periods" role="group" aria-label="${escapeHtml(gameText('statsTab'))}">
                                <button class="achievement-stats-period focusable" data-game-period="week" type="button" tabindex="0">${escapeHtml(gameText('statsWeek'))}</button>
                                <button class="achievement-stats-period focusable active" data-game-period="month" type="button" tabindex="0">${escapeHtml(gameText('statsMonth'))}</button>
                                <button class="achievement-stats-period focusable" data-game-period="year" type="button" tabindex="0">${escapeHtml(gameText('statsYear'))}</button>
                            </div>
                        </div>
                        <div id="achievement-stats-content" class="achievement-stats-content" aria-live="polite">
                            <p class="achievements-muted">${escapeHtml(gameText('statsLoading'))}</p>
                        </div>
                    </section>
                    <section class="achievements-section achievements-main-panel" id="achievements-quests-section" data-game-section-panel="quests" hidden>
                        <h2>${escapeHtml(i18n.t('AchievementQuests'))}</h2>
                        <div class="achievements-quests" id="achievements-quests"></div>
                    </section>
                    <section class="achievements-section achievements-game-section achievements-main-panel" id="achievements-game-section" data-game-section-panel="shop" hidden>
                        <div class="achievements-game-heading">
                            <div>
                                <h2>${escapeHtml(gameText('game'))}</h2>
                                <p>${escapeHtml(gameText('shopIntro'))}</p>
                            </div>
                            <div class="achievements-game-balance">
                                <span>⭐</span>
                                <small>${escapeHtml(gameText('scoreBank'))}</small>
                                <strong id="achievement-game-balance">—</strong>
                            </div>
                        </div>
                        <nav class="achievements-game-tabs" role="tablist" aria-label="${escapeHtml(gameText('game'))}">
                            <button class="achievement-game-tab focusable active" data-achievement-tab="arsenal" type="button" role="tab" aria-selected="true" tabindex="0">⚡ ${escapeHtml(gameText('arsenal'))}</button>
                            <button class="achievement-game-tab focusable" data-achievement-tab="shop" type="button" role="tab" aria-selected="false" tabindex="0">🛒 ${escapeHtml(gameText('shop'))}</button>
                            <button class="achievement-game-tab focusable" data-achievement-tab="cosmetics" type="button" role="tab" aria-selected="false" tabindex="0">🎨 ${escapeHtml(gameText('cosmetics'))}</button>
                            <button class="achievement-game-tab focusable" data-achievement-tab="gifts" type="button" role="tab" aria-selected="false" tabindex="0">🎁 ${escapeHtml(gameText('gifts'))}</button>
                        </nav>
                        <div class="achievement-game-status" id="achievement-game-status" role="status" hidden></div>
                        <section class="achievement-game-panel" id="achievement-panel-arsenal" data-achievement-panel="arsenal" role="tabpanel">
                            <div class="achievement-game-subhead"><h3>${escapeHtml(gameText('arsenal'))}</h3><span id="achievement-powerup-count"></span></div>
                            <div class="achievement-game-grid" id="achievement-arsenal-grid"><p class="achievements-muted">${escapeHtml(gameText('loadingGame'))}</p></div>
                        </section>
                        <section class="achievement-game-panel" id="achievement-panel-shop" data-achievement-panel="shop" role="tabpanel" hidden>
                            <p class="achievement-game-description">${escapeHtml(gameText('shopIntro'))}</p>
                            <h3>${escapeHtml(gameText('shopPowerups'))}</h3>
                            <div class="achievement-game-grid" id="achievement-shop-powerups"></div>
                            <h3>${escapeHtml(gameText('shopCosmetics'))}</h3>
                            <div class="achievement-game-grid" id="achievement-shop-cosmetics"></div>
                        </section>
                        <section class="achievement-game-panel" id="achievement-panel-cosmetics" data-achievement-panel="cosmetics" role="tabpanel" hidden>
                            <p class="achievement-game-description">${escapeHtml(gameText('cosmeticsIntro'))}</p>
                            <div class="achievement-game-grid" id="achievement-cosmetics-grid"></div>
                        </section>
                        <section class="achievement-game-panel" id="achievement-panel-gifts" data-achievement-panel="gifts" role="tabpanel" hidden>
                            <p class="achievement-game-description">${escapeHtml(gameText('giftIntro'))}</p>
                            <form class="achievement-gift-form" id="achievement-gift-form">
                                <label>${escapeHtml(gameText('recipient'))}
                                    <select id="achievement-gift-recipient" required>
                                        <option value="">${escapeHtml(gameText('usersLoading'))}</option>
                                    </select>
                                </label>
                                <label>${escapeHtml(gameText('amount'))}
                                    <input id="achievement-gift-amount" type="number" min="1" max="10000" step="1" value="100" required inputmode="numeric">
                                </label>
                                <button class="achievement-action-button focusable" type="submit" tabindex="0">🎁 ${escapeHtml(gameText('sendGift'))}</button>
                            </form>
                        </section>
                    </section>

                    <section class="achievements-section achievements-main-panel" id="achievements-badges-section" data-game-section-panel="badges" hidden>
                        <div class="achievements-section-heading">
                            <h2>${escapeHtml(gameText('badgeCollection'))}</h2>
                            <span class="achievements-count" id="achievements-count"></span>
                        </div>
                        <div class="achievements-filters" role="group" aria-label="${escapeHtml(i18n.t('AchievementProgress'))}">
                            <button class="achievement-filter focusable active" data-achievement-filter="all" type="button" tabindex="0">${escapeHtml(i18n.t('AchievementAll'))}</button>
                            <button class="achievement-filter focusable" data-achievement-filter="unlocked" type="button" tabindex="0">${escapeHtml(i18n.t('AchievementUnlockedFilter'))}</button>
                            <button class="achievement-filter focusable" data-achievement-filter="locked" type="button" tabindex="0">${escapeHtml(i18n.t('AchievementLockedFilter'))}</button>
                        </div>
                        <div class="achievements-grid" id="achievements-grid"></div>
                        <button class="achievements-more focusable" id="achievements-more" type="button" tabindex="0" hidden>${escapeHtml(i18n.t('AchievementShowMore'))}</button>
                    </section>
                </main>
            </div>
        `;
    }

    async onInit() {
        this.title = i18n.t('Achievements');
        this._bindEvents();

        // This page owns its focus scope. Without a registered section the global
        // TV FocusManager keeps the previous page's scope and D-pad navigation
        // cannot reach Game Center controls on webOS.
        this.registerFocusSection('achievements-game-center', this.el, {
            orientation: 'grid'
        });
        this.setActiveSection('achievements-game-center', true);

        await this._load();
        focusManager.invalidateCache('achievements-game-center');
        this.markReady();
    }

    _bindEvents() {
        this.el.querySelectorAll('[data-game-section]').forEach((button) => {
            button.addEventListener('click', () => this._selectMainSection(button.getAttribute('data-game-section')));
        });

        // Keep every visible tab in the TV focus order. The shared FocusManager
        // handles D-pad navigation; roving tabindex=-1 would hide sibling tabs
        // from its selector on webOS, where native tablist keydown is not reliable.
        this.el.querySelectorAll('[role="tablist"] [role="tab"]').forEach((tab) => {
            tab.setAttribute('tabindex', '0');
        });

        this.el.querySelectorAll('[data-game-period]').forEach((button) => {
            button.addEventListener('click', () => this._loadStats(button.getAttribute('data-game-period')));
        });

        const refresh = this.$('#achievements-refresh');
        if (refresh) refresh.addEventListener('click', () => this._load(true));

        const testNotifications = this.$('#achievements-test-notification');
        if (testNotifications) testNotifications.addEventListener('click', () => achievementNotifications.showTest());

        this.el.querySelectorAll('[data-achievement-filter]').forEach((button) => {
            button.addEventListener('click', () => {
                this._filter = button.getAttribute('data-achievement-filter') || 'all';
                this._visibleBadgeCount = 24;
                this.el.querySelectorAll('[data-achievement-filter]').forEach((candidate) => {
                    candidate.classList.toggle('active', candidate === button);
                });
                this._renderBadges();
            });
        });

        const more = this.$('#achievements-more');
        if (more) {
            more.addEventListener('click', () => {
                this._visibleBadgeCount += 24;
                this._renderBadges();
            });
        }

        this.el.addEventListener('click', (event) => {
            const target = event.target;
            if (!target || typeof target.closest !== 'function') return;
            const button = target.closest('button');
            if (!button || !this.el.contains(button)) return;

            if (button.hasAttribute('data-achievement-tab')) {
                this._selectGameTab(button.getAttribute('data-achievement-tab'));
            } else if (button.hasAttribute('data-achievement-reroll')) {
                this._rerollQuests(button.getAttribute('data-achievement-reroll'), button);
            } else if (button.hasAttribute('data-achievement-buy')) {
                this._buyShopItem(button.getAttribute('data-achievement-buy'), button);
            } else if (button.hasAttribute('data-achievement-use')) {
                this._usePowerUp(button.getAttribute('data-achievement-use'), button);
            } else if (button.hasAttribute('data-achievement-equip')) {
                this._equipCosmetic(button.getAttribute('data-achievement-equip'), button);
            }
        });

        const giftForm = this.$('#achievement-gift-form');
        if (giftForm) giftForm.addEventListener('submit', (event) => this._sendGift(event));
    }

    async _load(force = false) {
        if (this._loading) return;
        if (force) {
            this._statsCache = Object.create(null);
            this._statsSharedPromise = null;
            this._statsRequestId++;
        }
        this._loading = true;
        const loading = this.$('#achievements-loading');
        const error = this.$('#achievements-error');
        if (loading) loading.hidden = false;
        if (error) error.hidden = true;

        try {
            const userId = api.userId || api._userId;
            if (!userId) throw new Error('No active Jellyfin user session');

            // The public test route confirms the server plugin before user-scoped calls.
            await api.get('/Plugins/AchievementBadges/test');

            const language = String(i18n.currentLang || document.documentElement.lang || 'en').toLowerCase().split('-')[0];
            const userPath = `/Plugins/AchievementBadges/users/${encodeURIComponent(userId)}`;
            this._userId = userId;
            this._userPath = userPath;
            const translationsTask = language === 'ru'
                ? Promise.resolve(null)
                : api.get(`/Plugins/AchievementBadges/translations/${encodeURIComponent(language)}`).catch((err) => {
                    log.warn('Achievement Badges server translations unavailable; using Litefin fallbacks:', err);
                    return null;
                });
            const [summary, rank, badges, quests, serverTranslations] = await Promise.all([
                api.get(`${userPath}/summary`),
                api.get(`${userPath}/rank`),
                api.get(`${userPath}?lang=${encodeURIComponent(language)}`),
                api.get(`${userPath}/quests`),
                translationsTask
            ]);
            this._serverTranslations = normalizeServerTranslations(serverTranslations);
            gameCenterServerTranslations = this._serverTranslations;

            this._data = {
                summary: summary || {},
                rank: rank || {},
                badges: Array.isArray(badges) ? badges : [],
                quests: quests || {}
            };

            await this._loadLoadout();
            this._render();
        } catch (err) {
            log.warn('Achievement Badges data could not be loaded:', err);
            this._showError(err);
        } finally {
            this._loading = false;
            if (loading) loading.hidden = true;
        }
    }

    async _loadLoadout() {
        if (!this._userPath) return;
        const endpoints = [
            `${this._userPath}/bank`,
            `${this._userPath}/powerups`,
            '/Plugins/AchievementBadges/shop/catalog',
            `${this._userPath}/cosmetics`
        ];
        const results = await Promise.all(endpoints.map((endpoint) => api.get(endpoint).catch((err) => {
            log.warn(`Achievement Badges loadout request failed (${endpoint}):`, err);
            return null;
        })));
        this._loadout = {
            bank: results[0] || {},
            powerups: results[1] || {},
            catalog: results[2] || {},
            cosmetics: results[3] || {}
        };
    }

    _selectMainSection(section) {
        const allowed = ['overview', 'badges', 'quests', 'shop', 'stats'];
        const selected = allowed.includes(section) ? section : 'overview';
        this.el.querySelectorAll('[data-game-section]').forEach((button) => {
            const active = button.getAttribute('data-game-section') === selected;
            button.classList.toggle('active', active);
            button.setAttribute('aria-selected', active ? 'true' : 'false');
            button.setAttribute('tabindex', '0');
        });
        this.el.querySelectorAll('[data-game-section-panel]').forEach((panel) => {
            panel.hidden = panel.getAttribute('data-game-section-panel') !== selected;
        });
        if (selected === 'shop') this._selectGameTab('shop');
        if (selected === 'stats') this._loadStats(this._statsPeriod);
        focusManager.invalidateCache('achievements-game-center');
    }


    async _loadStats(period = this._statsPeriod) {
        const allowed = ['week', 'month', 'year'];
        const selected = allowed.includes(period) ? period : 'month';
        this._statsPeriod = selected;
        const requestId = ++this._statsRequestId;

        this.el.querySelectorAll('[data-game-period]').forEach((button) => {
            button.classList.toggle('active', button.getAttribute('data-game-period') === selected);
        });

        if (!this._userPath) return;
        if (this._statsCache[selected]) {
            this._renderStats(this._statsCache[selected]);
            return;
        }

        const target = this.$('#achievement-stats-content');
        if (target) target.innerHTML = `<p class="achievements-muted">${escapeHtml(gameText('statsLoading'))}</p>`;

        const safeGet = async (endpoint) => {
            try {
                return await api.get(endpoint);
            } catch (err) {
                log.warn(`Game Center stats request failed (${endpoint}):`, err);
                return null;
            }
        };

        if (!this._statsSharedPromise) {
            const sharedEndpoints = [
                `${this._userPath}/watch-calendar?days=90`,
                `${this._userPath}/category-progress`,
                `${this._userPath}/records`,
                `${this._userPath}/smart-goals?limit=5`,
                `${this._userPath}/watch-clock`
            ];
            this._statsSharedPromise = Promise.all(sharedEndpoints.map(safeGet)).then((results) => ({
                calendar: results[0] || {},
                categories: Array.isArray(results[1]) ? results[1] : [],
                records: results[2] || {},
                goals: results[3] || {},
                clock: results[4] || {}
            }));
        }

        const recapTask = safeGet(`${this._userPath}/recap?period=${selected}`);
        const wrappedTask = selected === 'year'
            ? safeGet(`${this._userPath}/wrapped?year=${new Date().getFullYear()}`)
            : Promise.resolve(null);

        try {
            const [recap, shared, wrapped] = await Promise.all([recapTask, this._statsSharedPromise, wrappedTask]);
            if (requestId !== this._statsRequestId) return;
            const data = { recap: recap || {}, ...shared, wrapped: wrapped || null, period: selected };
            this._statsCache[selected] = data;
            this._renderStats(data);
        } catch (err) {
            if (requestId !== this._statsRequestId) return;
            log.warn('Game Center statistics could not be loaded:', err);
            if (target) target.innerHTML = `<p class="achievements-muted">${escapeHtml(gameText('statsUnavailable'))}</p>`;
        } finally {
            focusManager.invalidateCache('achievements-game-center');
        }
    }

    _renderStats(data) {
        const target = this.$('#achievement-stats-content');
        if (!target) return;

        const recap = data.recap || {};
        const records = data.records || {};
        const movies = Number(valueOf(recap, 'MoviesWatched', 'moviesWatched') || 0);
        const episodes = Number(valueOf(recap, 'EpisodesWatched', 'episodesWatched') || 0);
        const total = Number(valueOf(recap, 'TotalItems', 'totalItems') ?? (movies + episodes));
        const days = Number(valueOf(recap, 'DaysWatched', 'daysWatched') || 0);
        const unlocked = Number(valueOf(recap, 'BadgesUnlocked', 'badgesUnlocked') || 0);

        const metricCards = [
            { icon: '🎬', label: gameText('statsTotal'), value: total },
            { icon: '🍿', label: gameText('statsMovies'), value: movies },
            { icon: '📺', label: gameText('statsEpisodes'), value: episodes },
            { icon: '📅', label: gameText('statsDays'), value: days },
            { icon: '🏆', label: gameText('statsUnlocked'), value: unlocked }
        ].map((item) => `
            <div class="achievement-stat achievement-stats-metric">
                <span class="achievement-stat-icon">${item.icon}</span>
                <span class="achievement-stat-label">${escapeHtml(item.label)}</span>
                <strong>${achievementNumber(item.value)}</strong>
            </div>`).join('');

        const renderTopList = (title, items) => {
            const rows = Array.isArray(items) ? items.slice(0, 5) : [];
            return `
                <section class="achievement-stats-card">
                    <h3>${escapeHtml(title)}</h3>
                    ${rows.length ? `<ol class="achievement-stats-list">${rows.map((item) => `
                        <li><span>${escapeHtml(valueOf(item, 'Name', 'name') || '—')}</span><strong>${achievementNumber(valueOf(item, 'Count', 'count') || 0)}</strong></li>
                    `).join('')}</ol>` : `<p class="achievements-muted">${escapeHtml(gameText('statsNoData'))}</p>`}
                </section>`;
        };

        const categories = Array.isArray(data.categories) ? data.categories : [];
        const categoryHtml = categories.length ? categories.map((item) => {
            const name = localizedBadgeValue(valueOf(item, 'Category', 'category') || 'General', 'category', this._serverTranslations);
            const percent = Math.max(0, Math.min(100, Number(valueOf(item, 'Percent', 'percent') || 0)));
            const count = Number(valueOf(item, 'Unlocked', 'unlocked') || 0);
            const totalCount = Number(valueOf(item, 'Total', 'total') || 0);
            return `
                <div class="achievement-stats-category">
                    <div><strong>${escapeHtml(name)}</strong><span>${count} / ${totalCount} · ${percent}%</span></div>
                    <div class="achievement-progress"><span style="width:${percent}%"></span></div>
                </div>`;
        }).join('') : `<p class="achievements-muted">${escapeHtml(gameText('statsNoData'))}</p>`;

        const countMap = valueOf(data.calendar, 'Counts', 'counts') || {};
        const maxCount = Math.max(1, ...Object.values(countMap).map((value) => Number(value) || 0));
        const calendarCells = [];
        const endDate = new Date();
        endDate.setHours(12, 0, 0, 0);
        for (let offset = 89; offset >= 0; offset--) {
            const date = new Date(endDate);
            date.setDate(date.getDate() - offset);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            const count = Number(countMap[key] || 0);
            const level = count <= 0 ? 0 : Math.max(1, Math.min(4, Math.ceil((count / maxCount) * 4)));
            const label = date.toLocaleDateString(achievementLocale(), { day: 'numeric', month: 'short' });
            calendarCells.push(`<span class="achievement-calendar-cell level-${level}" title="${escapeHtml(label)} · ${achievementNumber(count)}"></span>`);
        }

        const recordItems = [
            { label: gameText('statsHoursWatched'), value: Number(valueOf(records, 'TotalHoursWatched', 'totalHoursWatched') || 0) + ' ' + gameText('statsHours') },
            { label: gameText('statsBestStreak'), value: achievementNumber(valueOf(records, 'BestWatchStreak', 'bestWatchStreak') || 0) },
            { label: gameText('statsRewatches'), value: achievementNumber(valueOf(records, 'RewatchCount', 'rewatchCount') || 0) },
            { label: gameText('statsUniqueGenres'), value: achievementNumber(valueOf(records, 'UniqueGenresWatched', 'uniqueGenresWatched') || 0) },
            { label: gameText('statsLongest'), value: achievementNumber(valueOf(records, 'LongestItemMinutes', 'longestItemMinutes') || 0) + ' min' },
            { label: gameText('statsCombo'), value: achievementNumber(valueOf(records, 'BestComboCount', 'bestComboCount') || 0) }
        ];
        const recordHtml = recordItems.map((item) => `
            <div class="achievement-stats-record"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong></div>
        `).join('');

        const goals = arrayOf(data.goals, 'Goals', 'goals');
        const goalHtml = goals.length ? goals.slice(0, 5).map((item) => {
            const title = valueOf(item, 'Title', 'title') || gameText('statsGoals');
            const action = valueOf(item, 'Action', 'action') || '';
            const current = Number(valueOf(item, 'Current', 'current') || 0);
            const goal = Number(valueOf(item, 'Target', 'target') || 0);
            const percent = progressPercent(current, goal);
            return `
                <div class="achievement-stats-goal">
                    <div><strong>${escapeHtml(title)}</strong><span>${escapeHtml(action)}</span></div>
                    <div class="achievement-progress"><span style="width:${percent}%"></span></div>
                    <small>${current} / ${goal}</small>
                </div>`;
        }).join('') : `<p class="achievements-muted">${escapeHtml(gameText('statsNoGoals'))}</p>`;

        const clock = data.clock || {};
        const clockValues = Array.from({ length: 24 }, (_, hour) => Number(clock[hour] ?? clock[String(hour)] ?? 0));
        const maxClock = Math.max(1, ...clockValues);
        const clockHtml = clockValues.map((value, hour) => `
            <div class="achievement-clock-hour" title="${String(hour).padStart(2, '0')}:00 · ${achievementNumber(value)}">
                <span style="height:${Math.max(3, Math.round(value / maxClock * 100))}%"></span>
                <small>${String(hour).padStart(2, '0')}</small>
            </div>`).join('');

        const wrapped = data.wrapped || {};
        const hasWrapped = data.period === 'year' && !valueOf(wrapped, 'Empty', 'empty');
        const wrappedHtml = hasWrapped ? `
            <section class="achievement-stats-card achievement-stats-wrapped">
                <h3>${escapeHtml(gameText('statsYearWrapped', { year: valueOf(wrapped, 'Year', 'year') || new Date().getFullYear() }))}</h3>
                <div class="achievement-stats-record-grid">
                    <div class="achievement-stats-record"><span>${escapeHtml(gameText('statsActiveDays'))}</span><strong>${achievementNumber(valueOf(wrapped, 'ActiveDays', 'activeDays') || 0)}</strong></div>
                    <div class="achievement-stats-record"><span>${escapeHtml(gameText('statsTopMonth'))}</span><strong>${escapeHtml(valueOf(wrapped, 'TopMonth', 'topMonth') || '—')}</strong></div>
                    <div class="achievement-stats-record"><span>${escapeHtml(gameText('statsTopDay'))}</span><strong>${escapeHtml(valueOf(wrapped, 'TopDayOfWeek', 'topDayOfWeek') || '—')}</strong></div>
                    <div class="achievement-stats-record"><span>${escapeHtml(gameText('statsBiggestDay'))}</span><strong>${achievementNumber(valueOf(wrapped, 'BiggestDayCount', 'biggestDayCount') || 0)}</strong></div>
                </div>
            </section>` : '';

        target.innerHTML = `
            <div class="achievement-stats-metrics">${metricCards}</div>
            ${wrappedHtml}
            <section class="achievement-stats-card">
                <div class="achievement-stats-card-heading"><h3>${escapeHtml(gameText('statsHeatmap'))}</h3><span>${escapeHtml(gameText('statsHeatmapHint'))}</span></div>
                <div class="achievement-calendar-grid">${calendarCells.join('')}</div>
            </section>
            <div class="achievement-stats-columns">
                <section class="achievement-stats-card">
                    <h3>${escapeHtml(gameText('statsCategories'))}</h3>
                    ${categoryHtml}
                </section>
                <section class="achievement-stats-card">
                    <h3>${escapeHtml(gameText('statsRecords'))}</h3>
                    <div class="achievement-stats-record-grid">${recordHtml}</div>
                </section>
            </div>
            <div class="achievement-stats-columns">
                ${renderTopList(gameText('statsGenres'), valueOf(recap, 'TopGenres', 'topGenres'))}
                ${renderTopList(gameText('statsDirectors'), valueOf(recap, 'TopDirectors', 'topDirectors'))}
                ${renderTopList(gameText('statsActors'), valueOf(recap, 'TopActors', 'topActors'))}
            </div>
            <div class="achievement-stats-columns">
                <section class="achievement-stats-card">
                    <div class="achievement-stats-card-heading"><h3>${escapeHtml(gameText('statsGoals'))}</h3><span>${goals.length}</span></div>
                    ${goalHtml}
                </section>
                <section class="achievement-stats-card">
                    <div class="achievement-stats-card-heading"><h3>${escapeHtml(gameText('statsApproxClock'))}</h3></div>
                    <p class="achievement-stats-note">${escapeHtml(gameText('statsApproxClockHint'))}</p>
                    <div class="achievement-clock-grid">${clockHtml}</div>
                </section>
            </div>`;
    }

    _selectGameTab(tab) {
        const allowed = ['arsenal', 'shop', 'cosmetics', 'gifts'];
        const selected = allowed.includes(tab) ? tab : 'arsenal';
        this.el.querySelectorAll('[data-achievement-tab]').forEach((button) => {
            const active = button.getAttribute('data-achievement-tab') === selected;
            button.classList.toggle('active', active);
            button.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        this.el.querySelectorAll('[data-achievement-panel]').forEach((panel) => {
            panel.hidden = panel.getAttribute('data-achievement-panel') !== selected;
        });
        focusManager.invalidateCache('achievements-game-center');
        if (selected === 'gifts' && !this._giftUsers && !this._giftUsersLoading) this._loadGiftUsers();
    }

    _setGameStatus(message, isError = false) {
        const status = this.$('#achievement-game-status');
        if (!status) return;
        status.textContent = localizeAchievementMessage(message || '', i18n.currentLang || document.documentElement.lang || 'en');
        status.classList.toggle('is-error', !!isError);
        status.hidden = !message;
    }

    _renderLoadout() {
        const balance = this.$('#achievement-game-balance');
        if (!this._loadout) {
            if (balance) balance.textContent = '—';
            return;
        }
        const bankScore = Number(valueOf(this._loadout.bank, 'ScoreBank', 'scoreBank') ?? valueOf(this._loadout.powerups, 'ScoreBank', 'scoreBank') ?? 0);
        if (balance) balance.textContent = achievementNumber(bankScore);
        this._renderArsenal();
        this._renderShop();
        this._renderCosmetics();
    }

    _renderArsenal() {
        const grid = this.$('#achievement-arsenal-grid');
        const countNode = this.$('#achievement-powerup-count');
        if (!grid) return;
        const language = i18n.currentLang || document.documentElement.lang || 'en';
        const inventory = arrayOf(this._loadout.powerups, 'Inventory', 'inventory');
        const total = inventory.reduce((sum, item) => sum + Number(valueOf(item, 'Count', 'count') || 0), 0);
        if (countNode) countNode.textContent = `${gameText('quantity')}: ${total}`;
        if (!inventory.length || total <= 0) {
            grid.innerHTML = `<p class="achievements-muted">${escapeHtml(gameText('arsenalEmpty'))}</p>`;
            return;
        }
        grid.innerHTML = inventory.map((item) => {
            const type = String(valueOf(item, 'Type', 'type') || '');
            const localizedItem = localizeAchievementPowerUp(item, language, this._serverTranslations);
            const name = valueOf(localizedItem, 'DisplayName', 'displayName') || localizeAchievementPowerUpType(type, language, this._serverTranslations) || type;
            const count = Number(valueOf(item, 'Count', 'count') || 0);
            const active = !!valueOf(item, 'Active', 'active');
            const activeUntil = valueOf(item, 'ActiveUntil', 'activeUntil');
            const desc = valueOf(localizedItem, 'Description', 'description') || '';
            const isFreeze = type.toLowerCase() === 'streakfreeze';
            const canUse = count > 0 && !isFreeze && !(active && type.toLowerCase() === 'doublecredit');
            const icon = type.toLowerCase() === 'xpboost' ? '⚡' : type.toLowerCase() === 'doublecredit' ? '✖️2' : '❄️';
            return `
                <article class="achievement-game-card achievement-powerup-card">
                    <div class="achievement-game-card-icon">${icon}</div>
                    <div class="achievement-game-card-content">
                        <strong>${escapeHtml(name)}</strong>
                        <p>${escapeHtml(desc || (isFreeze ? gameText('automatic') : ''))}</p>
                        <div class="achievement-game-card-meta"><span>${escapeHtml(gameText('inventory'))}: <b>${count}</b></span>${active ? `<span class="is-active">${escapeHtml(gameText('active'))}</span>` : ''}</div>
                        ${activeUntil ? `<small>${escapeHtml(gameText('activeUntil'))}: ${escapeHtml(achievementDate(activeUntil))}</small>` : ''}
                        ${isFreeze ? `<small>${escapeHtml(gameText('automatic'))}</small>` : ''}
                        ${canUse ? `<button class="achievement-action-button focusable" type="button" data-achievement-use="${escapeHtml(type)}" tabindex="0">${escapeHtml(gameText('use'))}</button>` : ''}
                    </div>
                </article>`;
        }).join('');
    }

    _renderShop() {
        const powerupsTarget = this.$('#achievement-shop-powerups');
        const cosmeticsTarget = this.$('#achievement-shop-cosmetics');
        if (!powerupsTarget || !cosmeticsTarget) return;
        const powerups = arrayOf(this._loadout.catalog, 'PowerUps', 'powerUps', 'powerups');
        const cosmetics = arrayOf(this._loadout.catalog, 'Cosmetics', 'cosmetics');
        const owned = new Set(arrayOf(this._loadout.cosmetics, 'Owned', 'owned').map(String));
        const score = Number(valueOf(this._loadout.bank, 'ScoreBank', 'scoreBank') ?? valueOf(this._loadout.powerups, 'ScoreBank', 'scoreBank') ?? 0);
        const language = i18n.currentLang || document.documentElement.lang || 'en';
        const renderItem = (item, isCosmetic) => {
            const id = String(valueOf(item, 'Id', 'id') || '');
            const localizedItem = localizeAchievementCatalogItem(item, language, this._serverTranslations);
            const name = valueOf(localizedItem, 'DisplayName', 'displayName') || id;
            const description = valueOf(localizedItem, 'Description', 'description') || '';
            const price = Number(valueOf(item, 'PriceScore', 'priceScore') || 0);
            const milestone = Number(valueOf(item, 'MilestoneScore', 'milestoneScore') || 0);
            const isOwned = isCosmetic && owned.has(id);
            const isMilestone = isCosmetic && price === 0 && milestone > 0 && !isOwned;
            const affordable = score >= price;
            const missingScore = Math.max(0, price - score);
            const preview = valueOf(item, 'PreviewColor', 'previewColor');
            const previewColor = typeof preview === 'string' && /^#[0-9a-f]{3,8}$/i.test(preview) ? preview : '';
            const previewGlyph = previewColor ? '✦' : (preview || (isCosmetic ? '🎨' : '⚡'));
            const rawKind = valueOf(item, 'Kind', 'kind') || '';
            const kind = isCosmetic ? cosmeticKindLabel(rawKind) : localizeAchievementPowerUpType(valueOf(item, 'Type', 'type') || '', language);
            const button = isOwned
                ? `<span class="achievement-owned-label">✓ ${escapeHtml(gameText('owned'))}</span>`
                : isMilestone
                    ? `<span class="achievement-owned-label">${escapeHtml(gameText('milestone'))}: ${achievementNumber(milestone)} ⭐</span>`
                    : `<button class="achievement-action-button focusable${!affordable ? ' is-unaffordable-button' : ''}" type="button" data-achievement-buy="${escapeHtml(id)}" data-achievement-name="${escapeHtml(name)}" data-achievement-price="${price}" data-achievement-missing="${missingScore}" aria-label="${escapeHtml(affordable ? gameText('buy') : gameText('needMoreScore', { amount: achievementNumber(missingScore) }))}" tabindex="0">${escapeHtml(affordable ? gameText('buy') : gameText('needMoreScoreShort', { amount: achievementNumber(missingScore) }))}</button>`;
            return `
                <article class="achievement-game-card achievement-shop-card ${!affordable && !isOwned && !isMilestone ? 'is-unaffordable' : ''}">
                    <div class="achievement-game-card-icon" ${previewColor ? `style="color:${previewColor}"` : ''}>${escapeHtml(previewGlyph)}</div>
                    <div class="achievement-game-card-content">
                        <strong>${escapeHtml(name)}</strong>
                        <small>${escapeHtml(kind)}</small>
                        <p>${escapeHtml(description)}</p>
                        <div class="achievement-game-card-foot"><span class="achievement-shop-price">${achievementNumber(price)} ⭐</span>${button}</div>
                    </div>
                </article>`;
        };
        powerupsTarget.innerHTML = powerups.length ? powerups.map((item) => renderItem(item, false)).join('') : `<p class="achievements-muted">${escapeHtml(gameText('arsenalEmpty'))}</p>`;
        cosmeticsTarget.innerHTML = cosmetics.length ? cosmetics.map((item) => renderItem(item, true)).join('') : `<p class="achievements-muted">${escapeHtml(gameText('noCosmetics'))}</p>`;
    }

    _renderCosmetics() {
        const target = this.$('#achievement-cosmetics-grid');
        if (!target) return;
        const catalog = arrayOf(this._loadout.catalog, 'Cosmetics', 'cosmetics');
        const owned = new Set(arrayOf(this._loadout.cosmetics, 'Owned', 'owned').map(String));
        const equipped = this._loadout.cosmetics || {};
        const language = i18n.currentLang || document.documentElement.lang || 'en';
        const items = catalog.filter((item) => owned.has(String(valueOf(item, 'Id', 'id') || '')));
        if (!items.length) {
            target.innerHTML = `<p class="achievements-muted">${escapeHtml(gameText('noCosmetics'))}</p>`;
            return;
        }
        target.innerHTML = items.map((item) => {
            const id = String(valueOf(item, 'Id', 'id') || '');
            const localizedItem = localizeAchievementCatalogItem(item, language, this._serverTranslations);
            const name = valueOf(localizedItem, 'DisplayName', 'displayName') || id;
            const kind = String(valueOf(item, 'Kind', 'kind') || '');
            const equippedId = valueOf(equipped, cosmeticEquipField(kind), cosmeticEquipField(kind).charAt(0).toLowerCase() + cosmeticEquipField(kind).slice(1));
            const isEquipped = equippedId === id;
            const preview = valueOf(item, 'PreviewColor', 'previewColor') || '🎨';
            const safeColor = typeof preview === 'string' && /^#[0-9a-f]{3,8}$/i.test(preview) ? preview : '';
            return `
                <article class="achievement-game-card achievement-cosmetic-card">
                    <div class="achievement-game-card-icon" ${safeColor ? `style="color:${safeColor}"` : ''}>${escapeHtml(preview)}</div>
                    <div class="achievement-game-card-content">
                        <strong>${escapeHtml(name)}</strong>
                        <small>${escapeHtml(cosmeticKindLabel(kind))}</small>
                        <p>${escapeHtml(valueOf(localizedItem, 'Description', 'description') || '')}</p>
                        ${isEquipped ? `<span class="achievement-owned-label is-equipped">✓ ${escapeHtml(gameText('equipped'))}</span>` : `<button class="achievement-action-button focusable" type="button" data-achievement-equip="${escapeHtml(id)}" data-achievement-name="${escapeHtml(name)}" tabindex="0">${escapeHtml(gameText('equip'))}</button>`}
                    </div>
                </article>`;
        }).join('');
    }

    async _loadGiftUsers() {
        this._giftUsersLoading = true;
        const select = this.$('#achievement-gift-recipient');
        if (select) select.innerHTML = `<option value="">${escapeHtml(gameText('usersLoading'))}</option>`;
        try {
            const result = await api.get(`${this._userPath}/directory`);
            this._giftUsers = (Array.isArray(result) ? result : []).filter((user) => String(valueOf(user, 'Id', 'id') || '') !== String(this._userId));
            this._renderGiftUsers();
        } catch (err) {
            log.warn('Achievement Badges user directory could not be loaded:', err);
            this._giftUsers = [];
            this._renderGiftUsers();
            this._setGameStatus(gameText('actionFailed'), true);
        } finally {
            this._giftUsersLoading = false;
        }
    }

    _renderGiftUsers() {
        const select = this.$('#achievement-gift-recipient');
        const submit = this.$('#achievement-gift-form button[type="submit"]');
        if (!select) return;
        if (!this._giftUsers || !this._giftUsers.length) {
            select.innerHTML = `<option value="">${escapeHtml(gameText('noUsers'))}</option>`;
            if (submit) submit.disabled = true;
            return;
        }
        select.innerHTML = `<option value="">${escapeHtml(gameText('chooseUser'))}</option>` + this._giftUsers.map((user) => {
            const id = String(valueOf(user, 'Id', 'id') || '');
            const name = valueOf(user, 'Name', 'name') || id;
            return `<option value="${escapeHtml(id)}">${escapeHtml(name)}</option>`;
        }).join('');
        if (submit) submit.disabled = false;
    }

    async _rerollQuests(period, button) {
        if (!['daily', 'weekly'].includes(period) || !this._userPath) return;
        const periodLabel = gameText(period);
        if (!window.confirm(gameText('confirmReroll', { period: periodLabel }))) return;
        button.disabled = true;
        this._setGameStatus(gameText('loadingGame'));
        try {
            await api.post(`${this._userPath}/quests/${period}/reroll`, {});
            this._data.quests = await api.get(`${this._userPath}/quests`);
            this._renderQuests();
            this._setGameStatus(gameText('rerollOk'));
        } catch (err) {
            log.warn(`Achievement Badges ${period} quest reroll failed:`, err);
            this._setGameStatus(gameText('actionFailed'), true);
            button.disabled = false;
        }
    }

    async _buyShopItem(itemId, button) {
        if (!itemId || !this._userPath) return;
        const missingScore = Number(button.getAttribute('data-achievement-missing') || 0);
        if (missingScore > 0) {
            this._setGameStatus(gameText('needMoreScore', { amount: achievementNumber(missingScore) }), true);
            return;
        }
        // Do not use window.confirm here: native confirmation dialogs are
        // unreliable on webOS TV browsers and can swallow Magic Remote input.
        // A single explicit BUY action performs the purchase.
        if (button.dataset.purchasePending === 'true') return;
        button.dataset.purchasePending = 'true';
        button.disabled = true;
        this._setGameStatus(gameText('loadingGame'));
        try {
            const result = await api.post(`${this._userPath}/shop/purchase`, { ItemId: itemId });
            if (valueOf(result, 'Success', 'success') === false) {
                throw new Error(valueOf(result, 'Message', 'message') || gameText('actionFailed'));
            }
            await this._loadLoadout();
            this._renderLoadout();
            this._setGameStatus(gameText('purchaseOk'));
        } catch (err) {
            log.warn('Achievement Badges shop purchase failed:', err);
            const reason = localizeAchievementMessage(err && err.message, i18n.currentLang || document.documentElement.lang || 'en');
            this._setGameStatus(reason || gameText('actionFailed'), true);
            button.disabled = false;
            delete button.dataset.purchasePending;
        }
    }

    async _usePowerUp(type, button) {
        if (!type || !this._userPath) return;
        const item = arrayOf(this._loadout && this._loadout.powerups, 'Inventory', 'inventory').find((entry) => String(valueOf(entry, 'Type', 'type')) === type);
        const localizedItem = item
            ? localizeAchievementPowerUp(item, i18n.currentLang || document.documentElement.lang || 'en')
            : null;
        const name = localizedItem ? valueOf(localizedItem, 'DisplayName', 'displayName') : type;
        if (!window.confirm(gameText('confirmUse', { name }))) return;
        button.disabled = true;
        this._setGameStatus(gameText('loadingGame'));
        try {
            await api.post(`${this._userPath}/powerups/use/${encodeURIComponent(type)}`, {});
            await this._loadLoadout();
            this._renderLoadout();
            this._setGameStatus(gameText('useOk'));
        } catch (err) {
            log.warn('Achievement Badges power-up activation failed:', err);
            this._setGameStatus(gameText('actionFailed'), true);
            button.disabled = false;
        }
    }

    async _equipCosmetic(cosmeticId, button) {
        if (!cosmeticId || !this._userPath || !button) return;
        // Native confirm dialogs can swallow Magic Remote input on webOS.
        // Match the TV-friendly shop flow: one explicit activation equips immediately.
        if (button.dataset.equipPending === 'true') return;
        button.dataset.equipPending = 'true';
        button.disabled = true;
        this._setGameStatus(gameText('loadingGame'));
        try {
            const result = await api.post(`${this._userPath}/cosmetics/equip`, { CosmeticId: cosmeticId });
            if (valueOf(result, 'Success', 'success') === false) {
                throw new Error(valueOf(result, 'Message', 'message') || gameText('actionFailed'));
            }
            await this._loadLoadout();
            this._renderLoadout();
            this._setGameStatus(gameText('equipOk'));
        } catch (err) {
            log.warn('Achievement Badges cosmetic equip failed:', err);
            const reason = localizeAchievementMessage(err && err.message ? err.message : gameText('actionFailed'), i18n.currentLang || document.documentElement.lang || 'en');
            this._setGameStatus(reason || gameText('actionFailed'), true);
        } finally {
            button.dataset.equipPending = 'false';
            button.disabled = false;
        }
    }

    async _sendGift(event) {
        event.preventDefault();
        if (!this._userPath) return;
        const select = this.$('#achievement-gift-recipient');
        const amountInput = this.$('#achievement-gift-amount');
        const button = this.$('#achievement-gift-form button[type="submit"]');
        const recipientId = select ? select.value : '';
        const recipient = this._giftUsers && this._giftUsers.find((user) => String(valueOf(user, 'Id', 'id')) === recipientId);
        const recipientName = recipient ? (valueOf(recipient, 'Name', 'name') || recipientId) : '';
        const amount = Number(amountInput ? amountInput.value : 0);
        if (!recipientId || !Number.isInteger(amount) || amount < 1 || amount > 10000) {
            this._setGameStatus(gameText('actionFailed'), true);
            return;
        }
        if (!window.confirm(gameText('confirmGift', { amount: achievementNumber(amount), name: recipientName }))) return;
        if (button) button.disabled = true;
        this._setGameStatus(gameText('loadingGame'));
        try {
            const result = await api.post(`${this._userPath}/gift/${encodeURIComponent(recipientId)}`, null, { params: { amount } });
            if (valueOf(result, 'Success', 'success') === false) throw new Error(valueOf(result, 'Message', 'message') || gameText('actionFailed'));
            await this._loadLoadout();
            this._renderLoadout();
            this._setGameStatus(gameText('giftOk'));
        } catch (err) {
            log.warn('Achievement Badges score gift failed:', err);
            this._setGameStatus(gameText('actionFailed'), true);
        } finally {
            if (button) button.disabled = false;
        }
    }

    _showError(err) {
        const error = this.$('#achievements-error');
        if (!error) return;
        const isMissing = err && (err.status === 404 || err.status === 401 || err.status === 403);
        error.textContent = isMissing
            ? i18n.t('AchievementBadgesUnavailable')
            : i18n.t('AchievementLoadError');
        error.hidden = false;
        const overview = this.$('#achievements-overview');
        const quests = this.$('#achievements-quests');
        const leaderboard = this.$('#achievements-leaderboard');
        const grid = this.$('#achievements-grid');
        if (overview) overview.innerHTML = '';
        if (quests) quests.innerHTML = '';
        if (leaderboard) leaderboard.innerHTML = '';
        if (grid) grid.innerHTML = '';
    }

    _render() {
        if (!this._data) return;
        this._renderOverview();
        this._renderQuests();
        this._renderBadges();
        this._renderLoadout();
        focusManager.invalidateCache('achievements-game-center');
    }

    _renderOverview() {
        const target = this.$('#achievements-overview');
        if (!target) return;

        const summary = this._data.summary;
        const rank = this._data.rank;
        const tier = valueOf(rank, 'Tier', 'tier') || {};
        const nextTier = valueOf(rank, 'NextTier', 'nextTier') || {};
        const score = Number(valueOf(summary, 'Score', 'score', 'UnlockedScore') || valueOf(rank, 'Score', 'score') || 0);
        const unlocked = Number(valueOf(summary, 'Unlocked', 'unlocked') || 0);
        const total = Number(valueOf(summary, 'Total', 'total') || this._data.badges.length);
        const percent = Number(valueOf(summary, 'Percentage', 'percentage') || 0);
        const language = i18n.currentLang || document.documentElement.lang || 'en';
        const rankName = localizeAchievementRank(valueOf(tier, 'Name', 'name') || '—', language, this._serverTranslations);
        const nextName = localizeAchievementRank(valueOf(nextTier, 'Name', 'name'), language, this._serverTranslations);
        const rankProgress = Math.max(0, Math.min(100, Number(valueOf(rank, 'ProgressToNext', 'progressToNext') || 0)));
        const streak = Number(valueOf(summary, 'CurrentWatchStreak', 'currentWatchStreak') || 0);
        const bestStreak = Number(valueOf(summary, 'BestWatchStreak', 'bestWatchStreak') || 0);

        const playerRank = this.$('#achievement-player-rank');
        const playerScore = this.$('#achievement-player-score');
        const playerNext = this.$('#achievement-player-next');
        const playerProgress = this.$('#achievement-player-progress');
        const playerPercent = this.$('#achievement-player-percent');
        if (playerRank) playerRank.textContent = rankName || '—';
        if (playerScore) playerScore.textContent = achievementNumber(score);
        if (playerNext) playerNext.textContent = nextName ? gameText('nextRank', { name: nextName }) : gameText('maxRank');
        if (playerProgress) playerProgress.style.width = `${rankProgress}%`;
        if (playerPercent) playerPercent.textContent = `${rankProgress}%`;

        const recent = this._data.badges
            .filter((badge) => valueOf(badge, 'Unlocked', 'unlocked') && valueOf(badge, 'UnlockedAt', 'unlockedAt'))
            .sort((a, b) => new Date(valueOf(b, 'UnlockedAt', 'unlockedAt')) - new Date(valueOf(a, 'UnlockedAt', 'unlockedAt')))
            .slice(0, 4);
        const recentHtml = recent.length
            ? `<div class="achievements-recent">${recent.map((badge) => `<span title="${escapeHtml(valueOf(localizeAchievementBadge(badge, i18n.currentLang || document.documentElement.lang), 'Title', 'title'))}">${badgeIcon(badge)}</span>`).join('')}</div>`
            : '';

        target.innerHTML = `
            <div class="achievement-stat achievement-stat-score">
                <span class="achievement-stat-icon">⭐</span>
                <span class="achievement-stat-label">${escapeHtml(i18n.t('AchievementScore'))}</span>
                <strong>${achievementNumber(score)}</strong>
            </div>
            <div class="achievement-stat achievement-stat-rank">
                <span class="achievement-stat-icon">👑</span>
                <span class="achievement-stat-label">${escapeHtml(i18n.t('AchievementRank'))}</span>
                <strong>${escapeHtml(rankName)}</strong>
                <div class="achievement-progress"><span style="width:${rankProgress}%"></span></div>
                <small>${nextName ? `${rankProgress}% · ${escapeHtml(nextName)}` : `${rankProgress}%`}</small>
            </div>
            <div class="achievement-stat achievement-stat-unlocked">
                <span class="achievement-stat-icon">🏆</span>
                <span class="achievement-stat-label">${escapeHtml(i18n.t('AchievementUnlocked'))}</span>
                <strong>${unlocked} / ${total}</strong>
                <div class="achievement-progress"><span style="width:${Math.max(0, Math.min(100, percent))}%"></span></div>
                <small>${percent.toFixed(1)}%</small>
            </div>
            <div class="achievement-stat achievement-stat-streak">
                <span class="achievement-stat-icon">🔥</span>
                <span class="achievement-stat-label">${escapeHtml(i18n.t('AchievementProgress'))}</span>
                <strong>${streak} ${escapeHtml('·')} ${bestStreak}</strong>
                <small>${escapeHtml(i18n.t('AchievementWatchStreak'))}</small>
                ${recentHtml}
            </div>
        `;
    }

    _renderQuests() {
        const target = this.$('#achievements-quests');
        if (!target) return;
        const daily = valueOf(this._data.quests, 'Daily', 'daily') || [];
        const weekly = valueOf(this._data.quests, 'Weekly', 'weekly') || [];
        const language = i18n.currentLang || document.documentElement.lang || 'en';
        const renderList = (items) => {
            if (!Array.isArray(items) || !items.length) return `<p class="achievements-muted">${escapeHtml(i18n.t('AchievementNoQuests'))}</p>`;
            return items.map((quest) => {
                const localizedQuest = localizeAchievementQuest(quest, language, this._serverTranslations);
                const title = valueOf(localizedQuest, 'Title', 'title') || '';
                const description = valueOf(localizedQuest, 'Description', 'description') || '';
                const current = Number(valueOf(quest, 'Current', 'current') || 0);
                const goal = Number(valueOf(quest, 'Target', 'target') || 0);
                const completed = !!valueOf(quest, 'Completed', 'completed');
                const reward = Number(valueOf(quest, 'Reward', 'reward') || 0);
                const percent = progressPercent(current, goal);
                return `
                    <article class="achievement-quest ${completed ? 'is-complete' : ''}">
                        <div class="achievement-quest-icon">${badgeIcon(quest)}</div>
                        <div class="achievement-quest-body">
                            <strong>${escapeHtml(title)}</strong>
                            <p>${escapeHtml(description)}</p>
                            <div class="achievement-progress"><span style="width:${percent}%"></span></div>
                            <small>${current} / ${goal} · +${reward} ⭐</small>
                        </div>
                        ${completed ? '<span class="achievement-quest-check">✓</span>' : ''}
                    </article>
                `;
            }).join('');
        };

        const dailyRemaining = Number(valueOf(this._data.quests, 'DailyRerollsRemaining', 'dailyRerollsRemaining') || 0);
        const weeklyRemaining = Number(valueOf(this._data.quests, 'WeeklyRerollsRemaining', 'weeklyRerollsRemaining') || 0);
        const rerollButton = (period, remaining) => `
            <button class="achievement-reroll-button focusable" type="button" data-achievement-reroll="${period}" tabindex="0" ${remaining <= 0 ? 'disabled' : ''}>
                ↻ ${remaining > 0 ? escapeHtml(gameText('questReroll')) : escapeHtml(gameText('rerollUsed'))}
            </button>`;

        target.innerHTML = `
            <div class="achievement-quest-group">
                <div class="achievement-quest-heading"><h3>${escapeHtml(i18n.t('AchievementDaily'))}</h3>${rerollButton('daily', dailyRemaining)}</div>
                ${renderList(daily)}
            </div>
            <div class="achievement-quest-group">
                <div class="achievement-quest-heading"><h3>${escapeHtml(i18n.t('AchievementWeekly'))}</h3>${rerollButton('weekly', weeklyRemaining)}</div>
                ${renderList(weekly)}
            </div>
        `;
    }

    _renderLeaderboard() {
        const target = this.$('#achievements-leaderboard');
        if (!target) return;
        const entries = this._data.leaderboard;
        if (!entries.length) {
            target.innerHTML = `<p class="achievements-muted">${escapeHtml(i18n.t('AchievementNoLeaderboard'))}</p>`;
            return;
        }
        target.innerHTML = entries.map((entry, index) => {
            const name = valueOf(entry, 'UserName', 'userName') || '—';
            const score = Number(valueOf(entry, 'Score', 'score', 'Value', 'value') || 0);
            const unlocked = Number(valueOf(entry, 'Unlocked', 'unlocked') || 0);
            return `
                <div class="achievement-leader-row">
                    <span class="achievement-leader-place">${index + 1}</span>
                    <strong>${escapeHtml(name)}</strong>
                    <span>${achievementNumber(score)} ⭐</span>
                    <small>${unlocked} 🏆</small>
                </div>
            `;
        }).join('');
    }

    _renderBadges() {
        const grid = this.$('#achievements-grid');
        const count = this.$('#achievements-count');
        const more = this.$('#achievements-more');
        if (!grid || !this._data) return;

        let badges = this._data.badges.slice();
        if (this._filter === 'unlocked') badges = badges.filter((badge) => !!valueOf(badge, 'Unlocked', 'unlocked'));
        if (this._filter === 'locked') badges = badges.filter((badge) => !valueOf(badge, 'Unlocked', 'unlocked'));
        badges.sort((a, b) => {
            const aUnlocked = !!valueOf(a, 'Unlocked', 'unlocked');
            const bUnlocked = !!valueOf(b, 'Unlocked', 'unlocked');
            if (aUnlocked !== bUnlocked) return aUnlocked ? -1 : 1;
            const aTime = new Date(valueOf(a, 'UnlockedAt', 'unlockedAt') || 0).getTime();
            const bTime = new Date(valueOf(b, 'UnlockedAt', 'unlockedAt') || 0).getTime();
            return bTime - aTime || String(valueOf(a, 'Title', 'title') || '').localeCompare(String(valueOf(b, 'Title', 'title') || ''));
        });

        if (count) count.textContent = `${badges.length}`;
        if (!badges.length) {
            grid.innerHTML = `<p class="achievements-muted">${escapeHtml(i18n.t('AchievementNoBadges'))}</p>`;
            if (more) more.hidden = true;
            return;
        }

        const visible = badges.slice(0, this._visibleBadgeCount);
        grid.innerHTML = visible.map((badge) => {
            const localizedBadge = localizeAchievementBadge(badge, i18n.currentLang || document.documentElement.lang);
            const title = valueOf(localizedBadge, 'Title', 'title') || '';
            const description = valueOf(localizedBadge, 'Description', 'description') || '';
            const category = valueOf(badge, 'Category', 'category') || '';
            const rarityRaw = valueOf(badge, 'Rarity', 'rarity') || 'Common';
            const rarity = String(rarityRaw).toLowerCase().replace(/[^a-z0-9-]/g, '');
            const rarityLabel = localizedBadgeValue(rarityRaw, 'rarity', this._serverTranslations);
            const categoryLabel = localizedBadgeValue(category, 'category', this._serverTranslations);
            const current = Number(valueOf(badge, 'CurrentValue', 'currentValue') || 0);
            const goal = Number(valueOf(badge, 'TargetValue', 'targetValue') || 0);
            const unlocked = !!valueOf(badge, 'Unlocked', 'unlocked');
            const percent = progressPercent(current, goal);
            const unlockedAt = valueOf(badge, 'UnlockedAt', 'unlockedAt');
            const dateText = achievementDate(unlockedAt, true);
            return `
                <article class="achievement-badge ${unlocked ? 'is-unlocked' : 'is-locked'} rarity-${rarity}">
                    <div class="achievement-badge-icon">${badgeIcon(badge)}</div>
                    <div class="achievement-badge-info">
                        <div class="achievement-badge-title-row">
                            <strong>${escapeHtml(title)}</strong>
                            <span class="achievement-rarity">${escapeHtml(rarityLabel)}</span>
                        </div>
                        <p>${escapeHtml(description)}</p>
                        <div class="achievement-badge-meta">
                            <span>${escapeHtml(categoryLabel)}</span>
                            ${unlockedAt ? `<span>${escapeHtml(i18n.t('AchievementEarnedOn', [dateText]))}</span>` : `<span>${current} / ${goal}</span>`}
                        </div>
                        ${!unlocked && goal > 0 ? `<div class="achievement-progress"><span style="width:${percent}%"></span></div>` : ''}
                    </div>
                    <span class="achievement-badge-state" aria-label="${unlocked ? escapeHtml(i18n.t('AchievementUnlocked')) : escapeHtml(i18n.t('AchievementLockedFilter'))}">${unlocked ? '✓' : '🔒'}</span>
                </article>
            `;
        }).join('');

        if (more) {
            more.hidden = visible.length >= badges.length;
            if (!more.hidden) more.textContent = `${i18n.t('AchievementShowMore')} (${badges.length - visible.length})`;
        }
    }
}

export default AchievementsPage;

