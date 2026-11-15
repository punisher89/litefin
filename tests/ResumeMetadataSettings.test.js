import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveResumeSettings } from '../src/utils/ResumeMetadataSettings.js';
import { resumeMetadata } from '../src/utils/ResumeMetadata.js';

const data = { MediaStreams: [{ Type: 'Video', Width: 3840, Height: 1600, Codec: 'hevc' },
    { Type: 'Audio', Codec: 'aac', Channels: 2, Language: 'eng' }, { Type: 'Audio', Codec: 'aac', Language: 'rus' }],
    Genres: ['Drama','Mystery'], Ratings: { imdb: 8.1, tmdb: 72, rtCritic: 91 }, CommunityRating: 7.5, CriticRating: 85, OfficialRating: 'TV-MA' };

test('personal groups, corner choices and nullable inheritance apply over admin defaults', () => {
    const settings = resolveResumeSettings({ QualityTagsEnabled: true, RatingTagsEnabled: true, QualityTagsPosition: 'top-left' },
        { qualityTagsEnabled: false, ratingTagsPosition: 'top-right', AgeRatingTagsEnabled: null });
    assert.equal(settings.groups.quality.enabled, false);
    assert.equal(settings.groups.rating.position, 'top-right');
    assert.equal(settings.groups.age.enabled, true);
    assert.equal(settings.groups.quality.position, 'top-left');
});
test('continue-watching and item-type scopes hide groups and preserve user overrides', () => {
    const settings = resolveResumeSettings({ TagGroupScopes: { Quality: { ContinueWatching: false } } },
        { TagGroupScopes: { Quality: { ContinueWatching: true }, Rating: { Episodes: false } } }, 'Episode');
    assert(settings.groups.quality.enabled);
    assert(!settings.groups.rating.enabled);
    assert(!resolveResumeSettings({}, { RatingTagsOnContinueWatching: false }).groups.rating.enabled);
});
test('explicit empty rating sources stay empty; selected sources preserve order and minimum score', () => {
    let settings = resolveResumeSettings({}, { RatingTagsSources: [] });
    assert.deepEqual(resumeMetadata(data, true, settings).ratings, []);
    settings = resolveResumeSettings({}, { RatingTagsSources: ['rtCritic','imdb','tmdb'], RatingTagsMinScore: 8 });
    assert.deepEqual(resumeMetadata(data, true, settings).ratings.map((score) => score.source), ['rtCritic','imdb']);
    assert.deepEqual(resumeMetadata(data, false, settings).ratings, []);
});
test('legacy source controls use actual community/critic values, without fabricated provider labels', () => {
    const settings = resolveResumeSettings({}, { RatingTagsShowCommunity: false, RatingTagsShowCritic: true });
    const scores = resumeMetadata(data, true, settings).ratings;
    assert.deepEqual(scores.map((score) => [score.source, score.value]), [['critic','85%']]);
});
test('quality switches, group limits, genres and strict language priority are respected', () => {
    const settings = resolveResumeSettings({}, { ShowVideoCodecTag: false, GenreTagsEnabled: true, LanguageTagsEnabled: true,
        TagGroupCaps: { Genre: 1 }, LanguageTagsPriority: ['ru'], LanguageTagsPriorityStrict: true });
    const result = resumeMetadata(data, true, settings);
    assert(!result.quality.some((tag) => tag.kind === 'codec'));
    assert.deepEqual(result.genres, ['Drama']);
    assert.deepEqual(result.languages, [{ code: 'ru', country: 'RU' }]);
});
test('profile off slots, personal corner overrides and unknown groups are safe', () => {
    const config = { TagLayouts: { Corners: { Groups: [{ Group: 'quality', Slot: 'off' }] } } };
    const user = { TagLayouts: { Corners: { Groups: [{ Group: 'quality', Slot: 'bottom-left' }, { Group: '__proto__', Slot: 'off' }] } } };
    const result = resolveResumeSettings(config, user);
    assert(result.groups.quality.enabled);
    assert.equal(result.groups.quality.position, 'bottom-left');
    assert.equal(Object.prototype.enabled, undefined);
    assert.equal(resolveResumeSettings({}, { QualityTagsPosition: 'javascript:bad' }).groups.quality.position, 'top-left');
});
test('master and per-user native switches turn off all local metadata groups', () => {
    for (const settings of [resolveResumeSettings({ NativePosterTagsEnabled: false }), resolveResumeSettings({}, { UseNativePosterTags: false })]) {
        assert.equal(settings.enabled, false);
        assert(Object.values(settings.groups).every((group) => !group.enabled));
    }
});
