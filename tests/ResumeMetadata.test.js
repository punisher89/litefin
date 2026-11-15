import test from 'node:test';
import assert from 'node:assert/strict';
import { resumeMetadata } from '../src/utils/ResumeMetadata.js';

const data = {
    Source: 'WEB',
    MediaStreams: [
        { Type: 'Video', Width: 3840, Height: 1600, Codec: 'hevc', VideoRangeType: 'DOVIWithHDR10' },
        { Type: 'Audio', Codec: 'eac3', Channels: 6, DisplayTitle: 'Dolby Atmos' }
    ],
    Ratings: { imdb: 8.1, tmdb: 76, rtCritic: 91 },
    OfficialRating: 'TV-MA'
};

test('resume chips use Enhanced streams and source-native rating units', () => {
    const result = resumeMetadata(data);
    for (const label of ['4K', 'WEB', 'Dolby Vision', 'HEVC', 'DD+ ATMOS 5.1'])
        assert(
            result.quality.some((tag) => tag.label === label),
            label
        );
    assert.deepEqual(result.ratings, [
        { source: 'imdb', label: 'IMDb', value: '8.1' },
        { source: 'tmdb', label: 'TMDB', value: '7.6' },
        { source: 'rtCritic', label: 'RT', value: '91%' }
    ]);
    assert.equal(result.certification, 'TV-MA');
});
test('missing fields never manufacture ratings or technical metadata', () => {
    assert.equal(resumeMetadata({ Ratings: { metacritic: 64 } }).ratings[0].value, '64');
    assert.deepEqual(resumeMetadata({}), { quality: [], ratings: [], certification: '' });
    assert.deepEqual(resumeMetadata({ Ratings: { imdb: 15, tmdb: null }, CommunityRating: 8 }).ratings, [
        { source: 'community', label: 'JF', value: '8.0' }
    ]);
});
test('score privacy and actual audio evidence remain respected', () => {
    const result = resumeMetadata(
        { ...data, MediaStreams: data.MediaStreams.map((stream) => ({ ...stream, DisplayTitle: '' })) },
        false
    );
    assert.deepEqual(result.ratings, []);
    assert(!result.quality.some((tag) => tag.label.includes('Atmos')));
    assert(result.quality.some((tag) => tag.label === 'Dolby Digital+ 5.1'));
});

test('camel-case plugin DTOs render the same metadata as Pascal-case Jellyfin DTOs', () => {
    const lower = (object) =>
        Object.fromEntries(Object.entries(object).map(([key, value]) => [key[0].toLowerCase() + key.slice(1), value]));
    const camel = lower({ ...data, MediaStreams: data.MediaStreams.map(lower) });
    assert.deepEqual(resumeMetadata(camel), resumeMetadata(data));
});
