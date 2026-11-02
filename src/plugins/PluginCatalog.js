/**
 * Curated Awesome Jellyfin integrations for Litefin.
 *
 * Status is about Litefin's native client compatibility, not the presence
 * of the server-side plugin. Jellyfin Web DOM injection is never evaluated.
 */
export const AWESOME_JELLYFIN_CATALOG = Object.freeze([
    {
        id: 'achievement-badges',
        adapterId: 'achievement-badges',
        name: 'Achievement Badges',
        category: 'Достижения',
        status: 'supported',
        statusLabel: 'Нативная интеграция',
        summary: 'Показывает экипированные значки и последние открытия через пользовательский API серверного плагина. Данные только для чтения.',
        source: 'https://github.com/ZL154/AchievementBadges_for_Jellyfin'
    },
    {
        id: 'mdblist-ratings',
        adapterId: 'mdblist-ratings',
        name: 'MDBList Ratings',
        category: 'Рейтинги и метаданные',
        status: 'supported',
        statusLabel: 'Уже поддерживается',
        summary: 'Существующий адаптер Litefin получает рейтинги, награды и дополнительные метки из MDBList Server Plugin.',
        source: 'https://github.com/jellyfin/jellyfin-plugin-mdblist-ratings'
    },
    {
        id: 'actor-plus',
        adapterId: 'actor-plus',
        name: 'ActorPlus',
        category: 'Актёры и персоны',
        status: 'native-adapter',
        statusLabel: 'Нативная адаптация',
        summary: 'Litefin использует собственную D-pad-совместимую страницу актёра и добавляет блок известных работ. Web-hover интерфейс ActorPlus напрямую не запускается.',
        source: 'https://github.com/Druidblack/Jellyfin.Plugin.ActorPlus'
    },
    {
        id: 'jellyfin-featured',
        adapterId: null,
        name: 'Jellyfin Featured',
        category: 'Избранное на главной',
        status: 'native-reimplementation',
        statusLabel: 'Нужен перенос функций',
        summary: 'Litefin имеет собственный Hero Carousel и строки контента. Настройки и frontend-инъекция Jellyfin Featured не импортируются автоматически.',
        source: 'https://github.com/spkesDE/jellyfin-featured-plugin'
    },
    {
        id: 'jellyfin-enhanced',
        adapterId: null,
        name: 'Jellyfin Enhanced',
        category: 'Улучшения интерфейса',
        status: 'native-reimplementation',
        statusLabel: 'Нужен перенос функций',
        summary: 'Скрипты Jellyfin Web нельзя без изменений запустить в нативном интерфейсе Litefin. Отдельные возможности потребуется переносить в страницы и API Litefin.',
        source: 'https://github.com/n00bcodr/Jellyfin-Enhanced'
    }
]);

export function getAwesomeJellyfinEntry(id) {
    return AWESOME_JELLYFIN_CATALOG.find((entry) => entry.id === id) || null;
}
