import test from 'node:test';
import assert from 'node:assert/strict';
import { posterQualityTags, posterQualityHtml } from '../src/utils/PosterQuality.js';

const media = (video = {}, audio = {}) => ({ MediaSources: [{ Id: 'main', Path: '/Movies/Film.WEB-DL.mkv', MediaStreams: [
    { Type: 'Video', Width: 3840, Height: 1600, Codec: 'hevc', VideoRangeType: 'DOVIWithHDR10', ...video },
    { Type: 'Audio', Codec: 'eac3', Channels: 6, ...audio }
] }] });

test('technical chips show cropped 4K, source, video format and actual audio channels', () => {
    assert.deepEqual(posterQualityTags(media()).map((tag) => tag.label), ['4K', 'WEB-DL', 'Dolby Vision', 'HDR10', 'HEVC', 'Dolby Digital+ 5.1']);
});
test('Atmos is never inferred from EAC3 alone', () => {
    assert(!posterQualityHtml(media()).includes('Atmos'));
    assert(posterQualityHtml(media({}, { Title: 'Dolby Atmos' })).includes('Atmos 5.1'));
});
test('selected version determines chips instead of first source', () => {
    const item = media();
    item.MediaSources.push({ Id: 'other', MediaStreams: [{ Type: 'Video', Width: 1920, Height: 800, Codec: 'h264' }] });
    assert.deepEqual(posterQualityTags(item, 'other').map((tag) => tag.label), ['1080p', 'H264']);
});
test('default audio track wins and unknown metadata cannot inject HTML', () => {
    const item = media({ Codec: '<img onerror=alert(1)>' });
    item.MediaSources[0].DefaultAudioStreamIndex = 3;
    item.MediaSources[0].MediaStreams.push({ Type: 'Audio', Index: 3, Codec: 'truehd', Channels: 8 });
    assert(posterQualityHtml(item).includes('TrueHD 7.1'));
    assert(!posterQualityHtml(item).includes('<img'));
    assert.equal(posterQualityHtml({ Type: 'Series' }), '');
});

test('HLG and generic HDR are not mislabelled as HDR10', () => {
    assert.deepEqual(posterQualityTags(media({ VideoRangeType: 'HLG' })).filter((tag) => tag.kind === 'range').map((tag) => tag.label), ['HLG']);
    assert.deepEqual(posterQualityTags(media({ VideoRangeType: 'HDR' })).filter((tag) => tag.kind === 'range').map((tag) => tag.label), ['HDR']);
});
test('default audio is respected even when older DTOs omit stream indices', () => {
    const item = media();
    item.MediaSources[0].MediaStreams.push({ Type: 'Audio', Codec: 'flac', Channels: 2, IsDefault: true });
    assert(posterQualityHtml(item).includes('FLAC 2.0'));
});
