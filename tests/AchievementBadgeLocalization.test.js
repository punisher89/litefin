import assert from 'node:assert/strict';
import test from 'node:test';

import {
    localizeAchievementBadge,
    localizeAchievementQuest
} from '../src/utils/AchievementBadgeLocalization.js';

test('server translations are kept for languages bundled by Achievement Badges', () => {
    const badge = { Id: 'first-contact', Title: 'Premier contact', Description: 'Traduction serveur' };
    assert.equal(localizeAchievementBadge(badge, 'fr'), badge);
});

test('Russian fallback localizes known built-in badge IDs', () => {
    const badge = { Id: 'first-contact', Category: 'Getting Started', Title: 'First Contact', Description: 'Watch your first item.' };
    const localized = localizeAchievementBadge(badge, 'ru-RU');
    assert.equal(localized.Title, 'Первое знакомство');
    assert.equal(localized.Description, 'Посмотри свой первый материал.');
});

test('custom server badges keep the administrator-authored title and description', () => {
    const badge = { Id: '9a88b3d0b4f149e8b0c65bd6f3b7e102', Category: 'Custom', Title: 'My server badge', Description: 'Watch 50 films.' };
    assert.equal(localizeAchievementBadge(badge, 'ru'), badge);
});

test('built-in quests use local Russian fallback while custom quests remain server-authored', () => {
    const builtIn = { Id: 'daily-movie', Title: 'Movie Night', Description: 'Watch 1 movie today.' };
    assert.equal(localizeAchievementQuest(builtIn, 'ru').Title, 'Вечер кино');

    const custom = { Id: 'server-weekly-quest-01', Title: 'My Weekly Quest', Description: 'Watch 5 movies this week.' };
    assert.equal(localizeAchievementQuest(custom, 'ru'), custom);
});

test('server dictionary localizes quest and rank strings before Litefin fallback', async () => {
    const { localizeAchievementRank } = await import('../src/utils/AchievementBadgeLocalization.js');
    const translations = {
        'quest.daily-movie.title': 'Filmabend',
        'quest.daily-movie.desc': 'Schau heute einen Film.',
        'rank.legend': 'Legende'
    };
    const quest = localizeAchievementQuest(
        { Id: 'daily-movie', Title: 'Movie Night', Description: 'Watch a movie.' },
        'de',
        translations
    );
    assert.equal(quest.Title, 'Filmabend');
    assert.equal(quest.Description, 'Schau heute einen Film.');
    assert.equal(localizeAchievementRank('Legend', 'de', translations), 'Legende');
});

test('server dictionary localizes shop cosmetics and power-ups by stable IDs', async () => {
    const { localizeAchievementCatalogItem, localizeAchievementPowerUp } = await import('../src/utils/AchievementBadgeLocalization.js');
    const translations = {
        'cat.theme-sunset.name': 'Sonnenuntergang',
        'cat.theme-sunset.desc': 'Warmer Farbverlauf.',
        'pu.xpboost.name': 'XP-Boost',
        'pu.xpboost.desc': 'Verdoppelt Punkte.'
    };
    const cosmetic = localizeAchievementCatalogItem(
        { Id: 'theme-sunset', DisplayName: 'Sunset', Description: 'Warm gradient.' }, 'de', translations
    );
    assert.equal(cosmetic.DisplayName, 'Sonnenuntergang');
    assert.equal(cosmetic.Description, 'Warmer Farbverlauf.');
    const powerup = localizeAchievementPowerUp(
        { Type: 'XpBoost', DisplayName: 'XP Boost', Description: 'Double score.' }, 'de', translations
    );
    assert.equal(powerup.DisplayName, 'XP-Boost');
    assert.equal(powerup.Description, 'Verdoppelt Punkte.');
});
