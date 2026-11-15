import assert from 'node:assert/strict';
import test from 'node:test';
import AchievementBadgesHost, { achievementUrl, nextAchievementControl } from '../src/plugins/AchievementBadgesHost.js';
import { achievementLegacyCss } from '../src/plugins/AchievementBadgesCompat.js';

test('webOS 6 color and positioning fallbacks preserve alpha and all four edges', () => {
    assert.equal(achievementLegacyCss('color:oklch(100% 0 0 / 50%);'), 'color:rgba(255,255,255,0.5);');
    assert.equal(achievementLegacyCss('color:oklch(0 0 0);'), 'color:rgba(0,0,0,1);');
    assert.equal(
        achievementLegacyCss('.overlay{inset:0!important;}'),
        '.overlay{top:0!important;right:0!important;bottom:0!important;left:0!important;}'
    );
    assert.equal(achievementLegacyCss('inset:1px 2px 3px 4px;'), 'top:1px;right:2px;bottom:3px;left:4px;');
});

test('no session headers are forwarded outside the selected server base path', async () => {
    let requests = 0;
    const { host } = createHost(async () => {
        requests++;
    });
    await assert.rejects(host._fetch('https://media.example/jellyfin.attacker/test'), /unexpected server/);
    await assert.rejects(host._fetch('https://other.example/test'), /unexpected server/);
    assert.equal(requests, 0);
    host.destroy();
});

function createHost(fetch) {
    const session = { serverUrl: 'https://media.example/jellyfin', userId: 'alice', accessToken: 'session-token' };
    const host = new AchievementBadgesHost({
        getSession: () => session,
        getHeaders: () => ({ 'X-Proxy-User': 'viewer' }),
        fetch
    });
    host._session = { ...session };
    return { host, session };
}

test('server subpaths and encoded plugin paths survive URL resolution', () => {
    assert.equal(
        achievementUrl('https://media.example/jellyfin///', '/Plugins/AchievementBadges/users/a%20b'),
        'https://media.example/jellyfin/Plugins/AchievementBadges/users/a%20b'
    );
});

test('plugin writes preserve body and use active header authentication without credentialed CORS', async () => {
    const { host, session } = createHost(async (url, init) => {
        assert.equal(url, 'https://media.example/jellyfin/Plugins/AchievementBadges/users/alice/preferences');
        assert.equal(init.method, 'POST');
        assert.equal(init.body, '{"Language":"de"}');
        assert.equal(init.credentials, 'same-origin');
        assert.equal(init.headers.get('Authorization'), 'MediaBrowser Token="refreshed-token"');
        assert.equal(init.headers.get('X-Proxy-User'), 'viewer');
        assert.equal(new URL(url).search, '');
        return new Response('{}');
    });
    session.accessToken = 'refreshed-token';
    await host._fetch(achievementUrl(session.serverUrl, '/Plugins/AchievementBadges/users/alice/preferences'), {
        method: 'POST',
        body: '{"Language":"de"}',
        credentials: 'include'
    });
    host.destroy();
});

test('changing user or server invalidates the previous page session before making requests', async () => {
    let requests = 0;
    const { host, session } = createHost(async () => {
        requests++;
        return new Response('{}');
    });
    session.userId = 'bob';
    await assert.rejects(host._fetch(session.serverUrl + '/test'), /session ended/);
    session.userId = 'alice';
    session.serverUrl += '/other';
    await assert.rejects(host._fetch(session.serverUrl + '/test'), /session ended/);
    assert.equal(requests, 0);
    host.destroy();
});

test('leaving the page aborts pending plugin requests', async () => {
    const { host, session } = createHost(
        (url, init) =>
            new Promise((resolve, reject) => {
                init.signal.addEventListener('abort', () => reject(new Error('aborted')));
            })
    );
    const request = host._fetch(session.serverUrl + '/test');
    host.destroy();
    await assert.rejects(request, /aborted/);
    assert.equal(host._requests.size, 0);
});

test('remote navigation follows aligned controls and can leave the left edge', () => {
    const control = (left, top) => ({ getBoundingClientRect: () => ({ left, top, width: 40, height: 40 }) });
    const first = control(0, 0),
        right = control(70, 0),
        below = control(0, 80),
        diagonal = control(45, 70);
    const controls = [first, right, below, diagonal];
    assert.equal(nextAchievementControl(first, controls, 'right'), right);
    assert.equal(nextAchievementControl(first, controls, 'down'), below);
    assert.equal(nextAchievementControl(first, controls, 'left'), null);
});
