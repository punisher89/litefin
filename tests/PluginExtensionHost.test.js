import assert from 'node:assert/strict';
import test from 'node:test';

// Logger reads localStorage during module initialization.
globalThis.localStorage = {
    getItem: () => null,
    key: () => null,
    get length() { return 0; }
};

const { default: PluginExtensionHost, PLUGIN_EXTENSION_SLOTS } =
    await import('../src/plugins/PluginExtensionHost.js');

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
