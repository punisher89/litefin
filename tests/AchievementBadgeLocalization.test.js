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
