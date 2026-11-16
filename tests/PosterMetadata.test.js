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

test('home cards preserve server artwork without a separate score star', () => {
    CardRenderer.clearCache();
    const item = {
        Id: 'home-score',
        Name: 'Movie',
        Type: 'Movie',
        CommunityRating: 8.2,
        ImageTags: { Primary: 'server-jet-token' },
        Width: 1920,
        Height: 1080,
        MediaStreams: [{ Type: 'Video', Width: 1920, Height: 1080 }]
    };
    let html = CardRenderer.createCardHtml(item, { type: 'poster', showPosterBadges: true });
    assert.doesNotMatch(html, /quality-badge|poster-quality-chip/);
    assert.match(html, /tag=server-jet-token/);
    assert.doesNotMatch(html, /poster-rating-badge/);
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

test('home landscape and expanded art prefer annotated server images over ordinary backdrops', () => {
    CardRenderer.clearCache();
    const movie = { Id: 'signed-landscape', Name: 'Signed', Type: 'Movie',
        ImageTags: { Primary: 'poster-jetToken', Thumb: 'thumb-jetToken' }, BackdropImageTags: ['plain-backdrop'] };
    const html = CardRenderer.createCardHtml(movie, { isLandscape: true, type: 'resume', contextType: 'resume', showPosterBadges: true });
    assert.match(html, /Images\/Thumb[^"<>]*tag=thumb-jetToken/);
    assert.doesNotMatch(html, /tag=plain-backdrop|poster-rating-badge/);
    const fresh = { ...movie, ImageTags: { ...movie.ImageTags, Thumb: 'thumb-jetUpdated' } };
    assert.match(CardRenderer.createCardHtml(fresh, { isLandscape: true, type: 'resume', contextType: 'resume', showPosterBadges: true }), /tag=thumb-jetUpdated/);
});

test('resume keeps wide artwork when the server only annotates the portrait poster', () => {
    CardRenderer.clearCache();
    const item = { Id: 'portrait-only', Type: 'Movie', Name: 'Wide fallback', PrimaryImageAspectRatio: 0.667,
        ImageTags: { Primary: 'portrait-jetSigned', Thumb: 'plain-wide' }, BackdropImageTags: ['plain-bg'] };
    const html = CardRenderer.createCardHtml(item, { isLandscape: true, type: 'resume', contextType: 'resume', showPosterBadges: true });
    assert.doesNotMatch(html, /object-fit:contain|tag=portrait-jetSigned/);
    assert.match(html, /Images\/(Thumb|Backdrop)/);
});

test('latest seasons are included in server artwork hydration', () => {
    CardRenderer.clearCache();
    const html = CardRenderer.createCardHtml({ Id: 'season', Type: 'Season', SeriesId: 'series', Name: 'Season 1' },
        { type: 'poster', contextType: 'latest', showPosterBadges: true });
    assert.match(html, /data-poster-media-type="Season"/);
});
