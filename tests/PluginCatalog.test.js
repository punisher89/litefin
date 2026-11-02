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

test('Featured and Enhanced are reported as native adapters, not Web injectors', () => {
    assert.equal(getAwesomeJellyfinEntry('jellyfin-featured').status, 'native-adapter');
    assert.equal(getAwesomeJellyfinEntry('jellyfin-enhanced').status, 'native-adapter');
    assert.equal(getAwesomeJellyfinEntry('jellyfin-featured').adapterId, 'jellyfin-featured');
    assert.equal(getAwesomeJellyfinEntry('jellyfin-enhanced').adapterId, 'jellyfin-enhanced');
    assert.match(getAwesomeJellyfinEntry('jellyfin-featured').summary, /ABI 12\.2\.0\.0/);
});

test('existing MDBList integration remains supported', () => {
    assert.equal(getAwesomeJellyfinEntry('mdblist-ratings').status, 'supported');
});
