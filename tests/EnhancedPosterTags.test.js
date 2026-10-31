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
    attachJellyfinIdsToSeerrItems,
    buildEnhancedPosterTagGroups,
    getEnhancedPosterTagLookupId,
    hasNativePosterTagStamp,
    indexJellyfinItemsByTmdbId,
    renderEnhancedPosterTags
} = await import('../src/utils/EnhancedPosterTags.js');

const { normalizeSeerrItem } = await import('../src/api/seerrNormalize.js');

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

test('Seerr movie and series cards preserve TMDB IDs for Discover markers', () => {
    const movie = normalizeSeerrItem({
        id: 12345,
        mediaType: 'movie',
        title: 'Example Movie'
    });
    const series = normalizeSeerrItem({
        id: 67890,
        mediaType: 'tv',
        name: 'Example Series'
    });

    assert.equal(movie.Type, 'Movie');
    assert.equal(movie._tmdbId, 12345);
    assert.equal(series.Type, 'Series');
    assert.equal(series._tmdbId, 67890);
});

test('Seerr normalization never mistakes Radarr or Sonarr IDs for Jellyfin item IDs', () => {
    const withoutJellyfinId = normalizeSeerrItem({
        id: 12345,
        mediaType: 'movie',
        title: 'Example',
        mediaInfo: { serviceId: 7, externalServiceId: 98765 }
    });
    assert.equal(withoutJellyfinId._jellyfinMediaId, null);

    const withJellyfinId = normalizeSeerrItem({
        id: 12345,
        mediaType: 'movie',
        title: 'Example',
        mediaInfo: { jellyfinMediaId: 'jellyfin-guid', serviceId: 7, externalServiceId: 98765 }
    });
    assert.equal(withJellyfinId._jellyfinMediaId, 'jellyfin-guid');
});

test('Jellyfin library TMDB index maps Seerr movie and series cards to real item IDs', () => {
    const index = indexJellyfinItemsByTmdbId([
        { Id: 'jf-movie-1', Type: 'Movie', ProviderIds: { Tmdb: '12345' } },
        { Id: 'jf-series-1', Type: 'Series', ProviderIds: { tmdb: '67890' } },
        { Id: 'ignored-person', Type: 'Person', ProviderIds: { Tmdb: '555' } },
        { Id: 'ignored-no-tmdb', Type: 'Movie', ProviderIds: { Imdb: 'tt123' } }
    ]);

    const cards = [
        { Id: 'tmdb-movie-12345', Type: 'Movie', _tmdbId: 12345 },
        { Id: 'tmdb-tv-67890', Type: 'Series', _tmdbId: 67890 },
        { Id: 'tmdb-movie-555', Type: 'Movie', _tmdbId: 555 },
        { Id: 'tmdb-movie-999', Type: 'Movie', _tmdbId: 999, _jellyfinMediaId: 'explicit-id' }
    ];

    attachJellyfinIdsToSeerrItems(cards, index);
    assert.equal(cards[0]._jellyfinMediaId, 'jf-movie-1');
    assert.equal(cards[1]._jellyfinMediaId, 'jf-series-1');
    assert.equal(cards[2]._jellyfinMediaId, undefined);
    assert.equal(cards[3]._jellyfinMediaId, 'explicit-id');
});

test('Seerr cards resolve to real Jellyfin IDs and skip synthetic TMDB IDs', () => {
    assert.equal(
        getEnhancedPosterTagLookupId({ Id: 'tmdb-movie-12345', _jellyfinMediaId: 'jellyfin-guid-1' }),
        'jellyfin-guid-1'
    );
    assert.equal(getEnhancedPosterTagLookupId({ Id: 'tmdb-tv-67890' }), '');
    assert.equal(getEnhancedPosterTagLookupId({ Id: 'jellyfin-guid-2' }), 'jellyfin-guid-2');
    assert.equal(getEnhancedPosterTagLookupId(null), '');
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
