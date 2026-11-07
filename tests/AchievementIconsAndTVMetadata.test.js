import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { renderAchievementIcon } from '../src/utils/AchievementIcons.js';

test('AchievementBadges uses server Icon rather than rarity-only placeholder', () => {
    for (const id of ['play_circle', 'movie', 'military_tech', 'dark_mode', 'music_note', 'verified']) {
        const svg = renderAchievementIcon(id);
        assert.match(svg, /<svg class="achievement-icon-svg"/);
        assert.match(svg, /<path|<circle|<rect|<ellipse/);
        assert.doesNotMatch(svg, /<script|onerror=|undefined/);
    }
    const page = readFileSync(new URL('../src/pages/AchievementsPage.js', import.meta.url), 'utf8');
    assert.match(page, /renderAchievementIcon\(b\.Icon, b\)/);
    assert.doesNotMatch(page, /RARITY_ICONS\[rarity\]/);
});

test('Unknown icon cannot inject SVG or break markup; trophy fallback is rendered', () => {
    const safe = renderAchievementIcon('"><script>alert(1)</script>');
    const unknown = renderAchievementIcon('nonsense_icon_name');
    assert.equal(safe, unknown);
    assert.doesNotMatch(safe, /<script|alert\(/);
});

test('different badge themes retain distinct imagery from the server Icon and badge ID', () => {
    const examples = [
        ['movie', 'film-fan'],
        ['dark_mode', 'night-owl'],
        ['music_note', 'artist-listener'],
        ['library_books', 'library-complete'],
        ['local_fire_department', 'binge-titan']
    ];
    const art = examples.map(([Icon, Id]) => renderAchievementIcon(Icon, { Icon, Id }));
    assert.equal(new Set(art).size, examples.length);
});

test('server language pack is preferred, and test notifications use compact corner toasts', () => {
    const page = readFileSync(new URL('../src/pages/AchievementsPage.js', import.meta.url), 'utf8');
    const client = readFileSync(new URL('../src/api/AchievementBadgesClient.js', import.meta.url), 'utf8');
    assert.match(client, /getTranslations\(language/);
    assert.match(page, /achievementBadges\.getTranslations\(serverLanguage\)/);
    assert.match(page, /this\._serverTranslations\['rarity\.'/);
    assert.match(page, /data-ach-action="test-notification"/);
    assert.match(page, /achievementCornerToasts\.showBadge\(/);
    assert.match(page, /localizeAchievementBadge\(b, serverLanguage/);
});

