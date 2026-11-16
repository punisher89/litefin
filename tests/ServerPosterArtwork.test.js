import test from 'node:test';
import assert from 'node:assert/strict';
import { serverPosterArtwork, mergeServerArtwork } from '../src/utils/ServerPosterArtwork.js';
import { normalizeAwards } from '../src/utils/Awards.js';

test('landscape selects an actual signed Thumb, preserving its user marker', () => {
    const item = { Id: 'movie', Type: 'Movie', ImageTags: { Primary: 'poster-jetToken-jeu123', Thumb: 'thumb-jetWide-jeu123' } };
    assert.deepEqual(serverPosterArtwork(item, true), { id: 'movie', type: 'Thumb', tag: 'thumb-jetWide-jeu123' });
    assert.equal(serverPosterArtwork(item).tag, item.ImageTags.Primary);
});
test('spoiler-free episodes choose signed series art instead of episode screenshots', () => {
    const item = { Id: 'episode', Type: 'Episode', SeriesId: 'series', SeriesThumbImageTag: 'series-jetWide-jeu123',
        ImageTags: { Primary: 'episode-jetSpoiler-jeu123' } };
    assert.equal(serverPosterArtwork(item, true).id, 'series');
    assert.equal(serverPosterArtwork(item, true, true).id, 'episode');
});
test('unsigned art is never turned into a fictional plugin variant and user state is preserved', () => {
    assert.equal(serverPosterArtwork({ Id: 'a', Type: 'Movie', ImageTags: { Primary: 'ordinary' } }), null);
    const original = { UserData: { PlaybackPositionTicks: 500 }, ImageTags: { Primary: 'old' } };
    const merged = mergeServerArtwork(original, { ImageTags: { Primary: 'fresh-jetTag' }, UserData: {} });
    assert.equal(merged.UserData, original.UserData);
    assert.equal(original.ImageTags.Primary, 'old');
});
test('award API casing is normalized while names and recipients remain data', () => {
    const data = normalizeAwards({ Found: true, Wins: 1, Nominations: 1, Awards: [
        { Name: 'Academy Award', Result: 'Won', Year: 2024, Recipients: ['Actor'] },
        { Name: 'Golden Globe', Result: 'Nominated', Year: 2023 }
    ] });
    assert.equal(data.wins, 1);
    assert.equal(data.rows[0].result, 'won');
    assert.deepEqual(data.rows[0].recipients, ['Actor']);
    assert.equal(normalizeAwards({ found: false }), null);
    assert.equal(normalizeAwards({ awards: [{ name: 'Invented', result: 'Maybe' }] }), null);
});

test('horizontal cards never select a portrait movie or series Primary as their native variant', () => {
    const movie = { Id: 'movie', Type: 'Movie', PrimaryImageAspectRatio: 0.667, ImageTags: { Primary: 'portrait-jetSigned' } };
    assert.equal(serverPosterArtwork(movie, true), null);
    const episode = { Id: 'episode', Type: 'Episode', SeriesId: 'series', SeriesPrimaryImageTag: 'portrait-jetSigned' };
    assert.equal(serverPosterArtwork(episode, true), null);
});

test('recent seasons without a signed own poster can use the series poster', () => {
    const season = { Id: 'season', Type: 'Season', SeriesId: 'series',
        ImageTags: { Primary: 'ordinary-season' }, SeriesPrimaryImageTag: 'series-jetSigned-jeu123' };
    assert.deepEqual(serverPosterArtwork(season), { id: 'series', type: 'Primary', tag: 'series-jetSigned-jeu123' });
});

test('native Resume matches 2.0.150 by using the signed episode Primary, not the series poster', () => {
    const item = { Id: 'episode', Type: 'Episode', SeriesId: 'series', PrimaryImageAspectRatio: 1.777,
        ImageTags: { Primary: 'episode-jetSigned-jeu123' }, SeriesThumbImageTag: 'plain-wide' };
    assert.deepEqual(serverPosterArtwork(item, true, false, true), { id:'episode', type:'Primary', tag:'episode-jetSigned-jeu123' });
});
test('native Thumb preserves its own file hash and the server-issued signature for that image owner', () => {
    const item = { Id: 'movie', Type: 'Movie', PrimaryImageAspectRatio: 0.667,
        ImageTags: { Primary: 'original-jetSigned-jeu123', Thumb: 'plain-thumb' } };
    assert.deepEqual(serverPosterArtwork(item,true,false,true), {id:'movie',type:'Thumb',tag:'plain-thumb-jetSigned-jeu123'});
    assert.equal(serverPosterArtwork({...item,ImageTags:{Primary:item.ImageTags.Primary}},true,false,true),null);
});
