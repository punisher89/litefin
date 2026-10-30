import assert from 'node:assert/strict';
import test from 'node:test';

const storageMap = new Map();
globalThis.localStorage = {
    getItem: (key) => (storageMap.has(key) ? storageMap.get(key) : null),
    setItem: (key, value) => storageMap.set(key, String(value)),
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
        getAttribute: () => null,
        hasAttribute: () => false,
        lang: 'en'
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    querySelector: () => null,
    querySelectorAll: () => []
};
globalThis.window = globalThis;
globalThis.__APP_VERSION__ = '1.0.0';

const {
    buildEnhancedPosterTagGroups,
    hasNativePosterTagStamp,
    renderEnhancedPosterTags
} = await import('../src/utils/EnhancedPosterTags.js');

const settings = {
    UseNativePosterTags: true,
    QualityTagsEnabled: true,
    ShowResolutionTag: true,
    ShowSourceTag: true,
    ShowDynamicRangeTag: true,
    ShowSpecialFormatTag: true,
    ShowVideoCodecTag: true,
    ShowAudioInfoTag: true,
    GenreTagsEnabled: true,
    LanguageTagsEnabled: true,
    RatingTagsEnabled: true,
    AgeRatingTagsEnabled: true,
    QualityTagsPosition: 'top-left',
    GenreTagsPosition: 'top-right',
    LanguageTagsPosition: 'bottom-left',
    RatingTagsPosition: 'bottom-right',
    AgeRatingTagsPosition: 'bottom-right',
    RatingTagsOnMovies: true
};

const config = {
    NativePosterTagsEnabled: true,
    LanguageTagsPriority: '',
    LanguageTagsPriorityStrict: false
};

test('JE native poster tokens are recognized with and without the Spoiler Guard suffix', () => {
    const variant = 'a'.repeat(23);
    const marker = 'b'.repeat(12);
    assert.equal(hasNativePosterTagStamp({ ImageTags: { Primary: 'base-jet' + variant } }), true);
    assert.equal(hasNativePosterTagStamp({ ImageTags: { Primary: 'sb-1234abcd-base-jet' + variant + '-jeu' + marker } }), true);
    assert.equal(hasNativePosterTagStamp({ ImageTags: { Primary: 'ordinary-image-tag' } }), false);
    assert.equal(hasNativePosterTagStamp({}), false);
});

test('poster tag groups are built from the server-provided batch metadata', () => {
    const data = {
        Id: 'item-1',
        Type: 'Movie',
        Name: 'IMAX Demo 3D',
        Path: 'movie.disc',
        Genres: ['Drama', 'Action', 'Science Fiction', 'Comedy'],
        OfficialRating: '16+',
        CommunityRating: 8.4,
        CriticRating: 92,
        MediaStreams: [
            { Type: 'Video', Height: 2160, Codec: 'hevc', VideoRangeType: 'DOVI' },
            { Type: 'Audio', Language: 'en-US', Codec: 'truehd', Channels: 8, ChannelLayout: '7.1' },
            { Type: 'Audio', Language: 'ru-RU', Codec: 'eac3', Channels: 6, ChannelLayout: '5.1' }
        ],
        MediaSources: [{ Path: 'movie.bluray.disc' }]
    };

    const groups = buildEnhancedPosterTagGroups(data, settings, config, 'latest');

    assert.deepEqual(groups.quality.items, ['4K', 'Dolby Vision', 'BluRay', 'IMAX', '3D', 'HEVC', 'TRUEHD 7.1']);
    assert.deepEqual(groups.genre.items, ['Drama', 'Action', 'Science Fiction']);
    assert.deepEqual(groups.language.items, [{ code: 'en', country: 'US' }, { code: 'ru', country: 'RU' }]);
    assert.deepEqual(groups.rating.items, ['★ 8.4', '◆ 92%']);
    assert.deepEqual(groups.age.items, ['16+']);
    assert.equal(groups.quality.position, 'top-left');
    assert.equal(groups.genre.position, 'top-right');
});

test('English without an explicit region uses the US flag fallback', () => {
    const data = {
        Id: 'item-en',
        Type: 'Movie',
        MediaStreams: [{ Type: 'Audio', Language: 'en', Codec: 'aac', Channels: 2 }]
    };
    const groups = buildEnhancedPosterTagGroups(data, settings, config, 'latest');
    assert.deepEqual(groups.language.items, [{ code: 'en', country: 'US' }]);
});

test('poster tags honor disabled groups and rating row scopes', () => {
    const data = {
        Id: 'item-2',
        Type: 'Movie',
        Genres: ['Drama'],
        CommunityRating: 7.2,
        OfficialRating: 'PG-13'
    };
    const disabled = {
        ...settings,
        QualityTagsEnabled: false,
        GenreTagsEnabled: false,
        LanguageTagsEnabled: false,
        RatingTagsEnabled: false,
        AgeRatingTagsEnabled: false
    };
    assert.deepEqual(buildEnhancedPosterTagGroups(data, disabled, config), {});

    const nextUpSettings = { ...settings, RatingTagsOnNextUp: false };
    const nextUp = buildEnhancedPosterTagGroups(data, nextUpSettings, config, 'nextUp');
    assert.equal(nextUp.rating, undefined);
    assert.ok(nextUp.genre);
    assert.ok(nextUp.age);
});

test('a poster that already carries JE image stamping is not given duplicate HTML overlays', () => {
    const data = {
        Id: 'item-3',
        Type: 'Movie',
        ImageTags: { Primary: 'primary-jet' + 'c'.repeat(23) },
        Genres: ['Drama'],
        OfficialRating: 'PG'
    };
    assert.deepEqual(buildEnhancedPosterTagGroups(data, settings, config), {});
    assert.equal(renderEnhancedPosterTags({ ...data, _enhancedPosterTags: { genre: { position: 'top-right', items: ['Drama'] } } }), '');
});

test('poster labels are escaped and groups sharing a corner are stacked together', () => {
    const item = {
        Id: 'item-4',
        _enhancedPosterTags: {
            genre: { position: 'top-right', items: ['Drama <script>'] },
            age: { position: 'top-right', items: ['TV-MA'] }
        }
    };
    const html = renderEnhancedPosterTags(item);
    assert.match(html, /Drama &lt;script&gt;/);
    assert.doesNotMatch(html, /<script>/);
    assert.equal((html.match(/lf-je-tag-group--top-right/g) || []).length, 1);
});
