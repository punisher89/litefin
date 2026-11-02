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
        adapterId: 'jellyfin-featured',
        name: 'Jellyfin Featured',
        category: 'Избранное на главной',
        status: 'native-adapter',
        statusLabel: 'Нативная интеграция',
        summary: 'Получает настроенную и персонализированную подборку через /featured/items и отображает её отдельным D-pad-совместимым блоком на главной Litefin. Веб-инъекция не используется.',
        source: 'https://github.com/spkesDE/jellyfin-featured-plugin'
    },
    {
        id: 'jellyfin-enhanced',
        adapterId: 'jellyfin-enhanced',
        name: 'Jellyfin Enhanced',
        category: 'Улучшения интерфейса',
        status: 'native-adapter',
        statusLabel: 'Первая функция перенесена',
        summary: 'Первый нативный модуль показывает разрешение, HDR и аудиоформат на странице фильма. Остальные функции Jellyfin Enhanced требуют отдельных переносов.',
        source: 'https://github.com/n00bcodr/Jellyfin-Enhanced'
    }
]);

export function getAwesomeJellyfinEntry(id) {
    return AWESOME_JELLYFIN_CATALOG.find((entry) => entry.id === id) || null;
}
