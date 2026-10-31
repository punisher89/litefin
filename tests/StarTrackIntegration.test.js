import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const starTrackPage = source('../src/pages/StarTrackPage.js');
const detailsPage = source('../src/pages/DetailsPage.js');
const serverPluginClient = source('../src/plugins/ServerPluginClient.js');

test('StarTrack reviews use the server recent feed and keep only written reviews', () => {
    assert.ok(starTrackPage.includes("['reviews', 'Отзывы', 'Reviews', '/Recent?limit=100']"));
    assert.ok(starTrackPage.includes("const visibleRecords = tabId === 'reviews'"));
    assert.ok(starTrackPage.includes("String(field(record, 'review', '') || '').trim()"));
    assert.ok(starTrackPage.includes("field(record, 'userName'"));
});

test('StarTrack detail actions use the server JSON API contracts', () => {
    assert.ok(detailsPage.includes("'/Plugins/StarTrack/MyFavorites'"));
    assert.ok(detailsPage.includes("'/Plugins/StarTrack/Diary', 'POST'"));
    assert.ok(detailsPage.includes("'/Plugins/StarTrack/Lists/' + encodeURIComponent(listId) + '/Items'"));
    assert.ok(detailsPage.includes("review: review || null"));
    assert.ok(detailsPage.includes("favorites.length >= 12"));
});

test('StarTrack list management uses documented create, add, remove and delete routes', () => {
    assert.ok(starTrackPage.includes("ROOT + '/Lists', 'POST'"));
    assert.ok(starTrackPage.includes("'/Items/' + encodeURIComponent(id), 'DELETE'"));
    assert.ok(starTrackPage.includes("ROOT + '/Lists/' + encodeURIComponent(listId), 'DELETE'"));
    assert.ok(starTrackPage.includes("collaborative: true"));
});

test('StarTrack availability probe checks the server plugin Stats endpoint', () => {
    assert.ok(serverPluginClient.includes("probeEndpoint: () => '/Plugins/StarTrack/Stats'"));
});
