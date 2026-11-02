import assert from 'node:assert/strict';
import test from 'node:test';

// Logger publishes itself on window and reads localStorage during module initialization.
globalThis.window = globalThis;
globalThis.localStorage = {
    getItem: () => null,
    key: () => null,
    get length() { return 0; }
};

const { default: PluginExtensionHost, PLUGIN_EXTENSION_SLOTS } =
    await import('../src/plugins/PluginExtensionHost.js');

function createDeferred() {
    let resolve;
    const promise = new Promise((done) => {
        resolve = done;
    });
    return { promise, resolve };
}

function createPageElement() {
    const target = {};
    return {
        isConnected: true,
        querySelector: (selector) => selector === '.page' ? null : target
    };
}

test('native extension slots map only to known Litefin pages', () => {
    assert.equal(PLUGIN_EXTENSION_SLOTS['home:widgets'].page, 'home');
    assert.equal(PLUGIN_EXTENSION_SLOTS['home:featured'].page, 'home');
    assert.equal(PLUGIN_EXTENSION_SLOTS['details:content'].page, 'details');
    assert.equal(PLUGIN_EXTENSION_SLOTS['person:profile'].page, 'person');
    assert.equal(PLUGIN_EXTENSION_SLOTS['web:inject'], undefined);
});

test('extensions are namespaced, sorted, and removable', () => {
    const host = new PluginExtensionHost();
    const api = {};
    const first = host.register('sample', 'home:widgets', {
        id: 'later',
        order: 20,
        render: () => null
    }, api);
    const second = host.register('sample', 'home:widgets', {
        id: 'earlier',
        order: 10,
        render: () => null
    }, api);

    assert.equal(typeof first, 'function');
    assert.equal(typeof second, 'function');
    assert.deepEqual(host.getExtensions('home:widgets').map((entry) => entry.id), [
        'earlier',
        'later'
    ]);

    first();
    assert.deepEqual(host.getExtensions('home:widgets').map((entry) => entry.id), ['earlier']);
    second();
    assert.deepEqual(host.getExtensions(), []);
    host.destroy();
});

test('unsupported slots and duplicate extension IDs are rejected', () => {
    const host = new PluginExtensionHost();
    const api = {};
    assert.equal(host.register('sample', 'web:inject', {
        id: 'not-native',
        render: () => null
    }, api), null);

    const dispose = host.register('sample', 'home:widgets', {
        id: 'same-id',
        render: () => null
    }, api);
    assert.equal(typeof dispose, 'function');

    const duplicate = host.register('sample', 'home:widgets', {
        id: 'same-id',
        render: () => null
    }, api);
    assert.equal(duplicate, null);

    dispose();
    host.destroy();
});

test('disposing an extension cancels its deferred mount', async () => {
    const host = new PluginExtensionHost();
    const ready = createDeferred();
    const pageEl = createPageElement();
    let renderCalls = 0;

    const dispose = host.register('sample', 'home:widgets', {
        id: 'deferred',
        deferUntilReady: true,
        render: () => {
            renderCalls += 1;
            return null;
        }
    }, {});

    host.mountPage('home', pageEl, { ready: ready.promise });
    dispose();
    ready.resolve();
    await ready.promise;
    await new Promise((resolve) => setImmediate(resolve));

    assert.equal(renderCalls, 0, 'a disposed extension must never render later');
    assert.deepEqual(host.getExtensions(), []);
    host.destroy();
});

test('an old deferred callback cannot cancel a replacement with the same extension ID', async () => {
    const host = new PluginExtensionHost();
    const ready = createDeferred();
    const pageEl = createPageElement();
    let oldRenderCalls = 0;
    let newRenderCalls = 0;

    const disposeOld = host.register('sample', 'home:widgets', {
        id: 'replaceable',
        deferUntilReady: true,
        render: () => {
            oldRenderCalls += 1;
            return null;
        }
    }, {});

    host.mountPage('home', pageEl, { ready: ready.promise });
    disposeOld();

    const disposeNew = host.register('sample', 'home:widgets', {
        id: 'replaceable',
        deferUntilReady: true,
        render: () => {
            newRenderCalls += 1;
            return null;
        }
    }, {});

    ready.resolve();
    await ready.promise;
    await new Promise((resolve) => setImmediate(resolve));

    assert.equal(oldRenderCalls, 0, 'the replaced extension must stay disposed');
    assert.equal(newRenderCalls, 1, 'the current registration must mount exactly once');
    assert.deepEqual(host.getExtensions().map((entry) => entry.id), ['replaceable']);

    disposeNew();
    host.destroy();
});
