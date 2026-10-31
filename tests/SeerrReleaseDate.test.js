import assert from 'node:assert/strict';
import test from 'node:test';

import { formatSeerrReleaseDate, normalizeSeerrItem } from '../src/api/seerrNormalize.js';

test('formats full movie release dates for Russian details metadata', () => {
    assert.equal(formatSeerrReleaseDate('2024-02-09', 'ru-RU'), '09.02.2024');
});

test('formats full series premiere dates and ignores any time suffix', () => {
    assert.equal(formatSeerrReleaseDate('2025-11-03T00:00:00.000Z', 'ru-RU'), '03.11.2025');
});

test('rejects incomplete and invalid calendar dates', () => {
    assert.equal(formatSeerrReleaseDate('', 'ru-RU'), '');
    assert.equal(formatSeerrReleaseDate('2024-02-30', 'ru-RU'), '');
    assert.equal(formatSeerrReleaseDate('not-a-date', 'ru-RU'), '');
});

test('Seerr normalization keeps the movie release date and series premiere date', () => {
    const movie = normalizeSeerrItem({
        id: 10,
        mediaType: 'movie',
        title: 'Movie',
        releaseDate: '2024-02-09'
    });
    const series = normalizeSeerrItem({
        id: 20,
        mediaType: 'tv',
        name: 'Series',
        firstAirDate: '2025-11-03'
    });

    assert.equal(movie.ReleaseDate, '2024-02-09');
    assert.equal(series.ReleaseDate, '2025-11-03');
});
