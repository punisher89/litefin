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
    assert.match(page, /renderAchievementIcon\(b\.Icon\)/);
    assert.doesNotMatch(page, /RARITY_ICONS\[rarity\]/);
});

test('Unknown icon cannot inject SVG or break markup; trophy fallback is rendered', () => {
    const safe = renderAchievementIcon('"><script>alert(1)</script>');
    const unknown = renderAchievementIcon('nonsense_icon_name');
    assert.equal(safe, unknown);
    assert.doesNotMatch(safe, /<script|alert\(/);
});

test('Jellyfin quality fetch remains enabled by default, independent of server native poster stamping', () => {
    const api = readFileSync(new URL('../src/api/ApiClient.js', import.meta.url), 'utf8');
    const helper = readFileSync(new URL('../src/utils/EnhancedPosterTags.js', import.meta.url), 'utf8');
    assert.match(api, /storage\.getItem\('pref:showQualityBadges'\) !== 'false'/);
    assert.match(helper, /if \(!config\) \{/);
    assert.doesNotMatch(helper, /if \(!config \|\| config\.NativePosterTagsEnabled !== true\)/);
});

test('Actor cards show birth/death years and ages at release and now', () => {
    const cards = readFileSync(new URL('../src/utils/CardRenderer.js', import.meta.url), 'utf8');
    const details = readFileSync(new URL('../src/pages/DetailsPage.js', import.meta.url), 'utf8');
    assert.match(cards, /lf-person-birthyear/);
    assert.match(cards, /personAgeAtRelease/);
    assert.match(cards, /при выходе/);
    assert.match(cards, /сейчас/);
    assert.match(details, /api\.getItem\(person\.Id/);
    assert.match(details, /api\.get\('\/JellyfinEnhanced\/people\/info'/);
});
