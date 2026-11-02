import assert from 'node:assert/strict';
import test from 'node:test';

import {
    AWESOME_JELLYFIN_CATALOG,
    getAwesomeJellyfinEntry
} from '../src/plugins/PluginCatalog.js';

test('priority Awesome Jellyfin integrations are listed', () => {
    const ids = AWESOME_JELLYFIN_CATALOG.map((entry) => entry.id);
    for (const id of [
        'achievement-badges',
        'mdblist-ratings',
        'actor-plus',
        'jellyfin-featured',
        'jellyfin-enhanced'
    ]) {
        assert.ok(ids.includes(id), 'Missing compatibility entry: ' + id);
    }
});

test('Jellyfin Web injection projects are not marked as directly compatible', () => {
    assert.equal(
        getAwesomeJellyfinEntry('jellyfin-featured').status,
        'native-reimplementation'
    );
    assert.equal(
        getAwesomeJellyfinEntry('jellyfin-enhanced').status,
        'native-reimplementation'
    );
});

test('existing MDBList integration remains supported', () => {
    assert.equal(getAwesomeJellyfinEntry('mdblist-ratings').status, 'supported');
});
