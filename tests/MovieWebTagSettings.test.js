import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveMovieWebTagSettings } from '../src/utils/MovieWebTagSettings.js';
test('personal groups, corner choices and nullable inheritance apply over admin defaults', () => {
    const settings = resolveMovieWebTagSettings(
        { QualityTagsEnabled: true, RatingTagsEnabled: true, QualityTagsPosition: 'top-left' },
        { qualityTagsEnabled: false, ratingTagsPosition: 'top-right', AgeRatingTagsEnabled: null }
    );
    assert.equal(settings.groups.quality.enabled, false);
    assert.equal(settings.groups.rating.position, 'top-right');
    assert.equal(settings.groups.age.enabled, true);
    assert.equal(settings.groups.quality.position, 'top-left');
});
test('continue-watching and item-type scopes hide groups and preserve user overrides', () => {
    const settings = resolveMovieWebTagSettings(
        { TagGroupScopes: { Quality: { ContinueWatching: false } } },
        { TagGroupScopes: { Quality: { ContinueWatching: true }, Rating: { Episodes: false } } },
        'Episode'
    );
    assert(settings.groups.quality.enabled);
    assert(!settings.groups.rating.enabled);
    assert(!resolveMovieWebTagSettings({}, { RatingTagsOnContinueWatching: false }).groups.rating.enabled);
});
test('explicit empty source selection and nullable source inheritance survive settings adaptation', () => {
    assert.deepEqual(resolveMovieWebTagSettings({}, { RatingTagsSources: [] }).ratingSources, []);
    assert.deepEqual(
        resolveMovieWebTagSettings({ RatingTagsSources: ['imdb'] }, { RatingTagsSources: null }).ratingSources,
        ['imdb']
    );
    assert.deepEqual(
        resolveMovieWebTagSettings({}, { RatingTagsShowCommunity: false, RatingTagsShowCritic: true }).ratingSources,
        ['critic']
    );
});
test('profile off slots, personal corner overrides and unknown groups are safe', () => {
    const config = { TagLayouts: { Corners: { Groups: [{ Group: 'quality', Slot: 'off' }] } } };
    const user = {
        TagLayouts: {
            Corners: {
                Groups: [
                    { Group: 'quality', Slot: 'bottom-left' },
                    { Group: '__proto__', Slot: 'off' }
                ]
            }
        }
    };
    const result = resolveMovieWebTagSettings(config, user);
    assert(result.groups.quality.enabled);
    assert.equal(result.groups.quality.position, 'bottom-left');
    assert.equal(Object.prototype.enabled, undefined);
    assert.equal(
        resolveMovieWebTagSettings({}, { QualityTagsPosition: 'javascript:bad' }).groups.quality.position,
        'top-left'
    );
});
test('master and per-user native switches turn off all local metadata groups', () => {
    for (const settings of [
        resolveMovieWebTagSettings({ NativePosterTagsEnabled: false }),
        resolveMovieWebTagSettings({}, { UseNativePosterTags: false })
    ]) {
        assert.equal(settings.enabled, false);
        assert(Object.values(settings.groups).every((group) => !group.enabled));
    }
});
