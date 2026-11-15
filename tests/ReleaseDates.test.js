import assert from 'node:assert/strict';
import test from 'node:test';
import { releaseDates, isoReleaseDate } from '../src/utils/ReleaseDates.js';

test('release dates retain their calendar day and validate it', () => {
    assert.equal(isoReleaseDate('2024-02-29T00:00:00.000Z'), '2024-02-29');
    assert.equal(isoReleaseDate('2023-02-29'), null);
    assert.equal(isoReleaseDate('2024'), null);
});

test('premiere, theatrical and digital are distinct and prefer the configured region', () => {
    const data = {
        results: [
            {
                iso_3166_1: 'US',
                release_dates: [
                    { type: 1, release_date: '2024-01-01' },
                    { type: 4, release_date: '2024-03-01' }
                ]
            },
            {
                iso_3166_1: 'DE',
                release_dates: [
                    { type: 3, release_date: '2024-02-15' },
                    { type: 4, release_date: '2024-04-01' }
                ]
            }
        ]
    };
    assert.deepEqual(releaseDates({}, data, 'DE'), [
        { kind: 'ReleasePremiere', date: '2024-01-01', country: '' },
        { kind: 'ReleaseTheatrical', date: '2024-02-15', country: 'DE' },
        { kind: 'ReleaseDigital', date: '2024-04-01', country: 'DE' }
    ]);
});

test('a series premiere or a physical release is never invented as a digital release', () => {
    assert.deepEqual(releaseDates({ Type: 'Series', PremiereDate: '2024-03-04' }), [
        { kind: 'ReleasePremiere', date: '2024-03-04', country: '' }
    ]);
    assert.deepEqual(
        releaseDates({}, { results: [{ iso_3166_1: 'US', release_dates: [{ type: 5, release_date: '2024-01-01' }] }] }),
        []
    );
});
