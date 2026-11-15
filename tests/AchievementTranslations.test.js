import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../src/plugins/achievement-badges/', import.meta.url);
const english = JSON.parse(await readFile(new URL('translations/en.json', root)));
const russian = JSON.parse(await readFile(new URL('translations/ru.json', root)));

test('bundled Russian UI translations retain all interpolation tokens', () => {
    for (const [key, text] of Object.entries(russian)) {
        assert.equal(typeof english[key], 'string', key);
        const tokens = (value) => [...value.matchAll(/\{\w+\}/g)].map((match) => match[0]).sort();
        assert.deepEqual(tokens(text), tokens(english[key]), key);
    }
});

test('achievement markup cannot be rewritten by the global Litefin DOM translator', async () => {
    const source = await readFile(new URL('vendor/StandaloneRuntime.js', root), 'utf8');
    assert(!source.includes('data-i18n'));
    assert(source.includes('data-ab-i18n'));
});
