import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * ============================================================================
 * Media Card Favorite Badge Test Suite
 * ============================================================================
 * Cards of favorite items show a heart badge when "Show Favorite Badges" is
 * on. Its tooltip text follows the app language.
 * ============================================================================
 */

const storageMap = new Map();
globalThis.localStorage = {
    getItem: (key) => (storageMap.has(key) ? storageMap.get(key) : null),
    setItem: (key, val) => storageMap.set(key, String(val)),
    removeItem: (key) => storageMap.delete(key),
    clear: () => storageMap.clear()
};
globalThis.document = {
    createElement: () => ({
        getContext: () => ({}),
        setAttribute: () => {},
        removeAttribute: () => {},
        classList: { add: () => {}, remove: () => {}, contains: () => false }
    }),
    documentElement: {
        setAttribute: () => {},
        removeAttribute: () => {},
        getAttribute: (name) => (name === 'data-layout-media-rows' ? 'expanding' : null),
        hasAttribute: () => false
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    querySelector: () => null,
    querySelectorAll: () => []
};
globalThis.window = globalThis;
globalThis.__APP_VERSION__ = '1.0.0';

const { storage } = await import('../src/utils/StorageService.js');
const { i18n } = await import('../src/utils/i18n.js');
const { default: CardRenderer } = await import('../src/utils/CardRenderer.js');

test('home cards render video quality and a score without requiring the library quality toggle', () => {
    CardRenderer.clearCache();
    const item = {
        Id: 'home-score',
        Name: 'Movie',
        Type: 'Movie',
        CommunityRating: 8.2,
        Width: 1920,
        Height: 1080,
        MediaStreams: [{ Type: 'Video', Width: 1920, Height: 1080 }]
    };
    let html = CardRenderer.createCardHtml(item, { type: 'poster', showPosterBadges: true });
    assert.match(html, /quality-badge[^>]*>1080p/);
    assert.match(html, /poster-rating-badge/);
    assert.match(html, /8\.2/);
    html = CardRenderer.createCardHtml(item, { type: 'poster' });
    assert.doesNotMatch(html, /poster-rating-badge/);
});

test('Discover displays a specifically identified TMDB score below the poster', () => {
    CardRenderer.clearCache();
    const html = CardRenderer.createCardHtml(
        { Id: 'tmdb-movie-123', Name: 'Film', Type: 'Movie', _mediaType: 'movie', _tmdbRating: 7.6 },
        { type: 'poster', contextType: 'discover' }
    );
    assert.match(html, /card-tmdb-rating/);
    assert.match(html, /TMDB/);
    assert.match(html, /7\.6/);
});
