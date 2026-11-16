import test from 'node:test';
import assert from 'node:assert/strict';
const storageMap = new Map();
globalThis.localStorage = {
    getItem: (key) => (storageMap.has(key) ? storageMap.get(key) : null),
    setItem: (key, val) => storageMap.set(key, String(val)),
    removeItem: (key) => storageMap.delete(key),
    clear: () => storageMap.clear()
};
globalThis.document = {
    createElement: () => ({
        getContext: () => ({}),
        setAttribute: () => {},
        removeAttribute: () => {},
        classList: { add: () => {}, remove: () => {}, contains: () => false }
    }),
    documentElement: {
        setAttribute: () => {},
        removeAttribute: () => {},
        getAttribute: (name) => (name === 'data-layout-media-rows' ? 'expanding' : null),
        hasAttribute: () => false
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    querySelector: () => null,
    querySelectorAll: () => []
};
globalThis.window = globalThis;
globalThis.__APP_VERSION__ = '1.0.0';

const { api } = await import('../src/api/index.js');
const { default: NativePosters } = await import('../src/utils/PosterMetadataDecorator.js');

test('standard DTO batch supplies complete native image tags without altering playback data', async (t) => {
    api.setServer('http://native-test');
    api.setAuth('token', 'alice');
    const get = api.get,
        items = api.getItems;
    t.after(() => {
        api.get = get;
        api.getItems = items;
    });
    const routes = [];
    let batches = 0;
    api.get = async (path) => {
        routes.push(path);
        return path.endsWith('public-config') ? { NativePosterTagsEnabled: true } : { UseNativePosterTags: true };
    };
    api.getItems = async (params) => {
        batches++;
        return {
            Items: params.Ids.split(',').map((Id) => ({
                Id,
                Type: 'Episode',
                ImageTags: { Primary: 'original-jetSigned-jeu123' },
                PrimaryImageAspectRatio: 1.777
            }))
        };
    };
    const loader = new NativePosters(null);
    const original = { Id: 'abc', Type: 'Episode', Name: 'Episode', UserData: { PlaybackPositionTicks: 500 } };
    const result = await loader.prepare([original]);
    assert.equal(result[0].ImageTags.Primary, 'original-jetSigned-jeu123');
    assert.equal(result[0].UserData, original.UserData);
    assert.equal(result[0]._nativePosterTagsEnabled, true);
    assert.equal(original.ImageTags, undefined);
    await loader.prepare([original]);
    assert.equal(batches, 1);
    assert.equal(routes.length, 2);
    assert(!routes.some((path) => path.includes('tag-data')));
    loader.destroy();
});
test('user opt-out and stale page completion cannot apply native mode', async (t) => {
    api.setServer('http://native-test');
    api.setAuth('token', 'alice');
    const get = api.get,
        items = api.getItems;
    t.after(() => {
        api.get = get;
        api.getItems = items;
    });
    api.get = async (path) =>
        path.endsWith('public-config') ? { NativePosterTagsEnabled: true } : { UseNativePosterTags: false };
    api.getItems = async () => assert.fail('opt-out must not hydrate images');
    let loader = new NativePosters(null);
    assert.equal((await loader.prepare([{ Id: 'abc', Type: 'Movie' }]))[0]._nativePosterTagsEnabled, false);
    loader.destroy();
    let done;
    api.get = () =>
        new Promise((resolve) => {
            done = resolve;
        });
    loader = new NativePosters(null);
    const original = [{ Id: 'abc', Type: 'Movie' }];
    const pending = loader.prepare(original);
    loader.destroy();
    done({ NativePosterTagsEnabled: true });
    assert.equal(await pending, original);
});
