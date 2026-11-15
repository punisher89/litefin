import test from 'node:test';
import assert from 'node:assert/strict';

import { ratingLogoFile, parseQualityPalette, qualityPaletteLabel } from '../src/utils/ResumeMetadataAppearance.js';

test('server quality palette is read as data without evaluating script code', () => {
    const palette = parseQualityPalette("throw new Error('must not run'); const colors = { '4K': { bg: 'rgba(189, 5, 232, 0.95)', text: '#ffffff' }, 'WEB': { bg: 'rgba(0, 121, 107, 0.95)', text: '#ffffff' } };");
    assert.equal(palette.get('4K').background, 'rgba(189, 5, 232, 0.95)');
    assert.equal(palette.get('WEB').color, '#ffffff');
    assert.equal(parseQualityPalette("'bad': { bg: 'url(https://example.com)', text: '#fff' }").size, 0);
});
test('rating icons use the same plugin logo filenames, with critic threshold', () => {
    assert.equal(ratingLogoFile('imdb', '8.1'), 'imdb.png');
    assert.equal(ratingLogoFile('rtCritic', '59%'), 'rottentomatoes_rotten.png');
    assert.equal(ratingLogoFile('rtCritic', '60%'), 'rottentomatoes_fresh.png');
    assert.equal(ratingLogoFile('untrusted-path', '1'), null);
});
test('composite technical labels retain their matching server palette entry', () => {
    assert.equal(qualityPaletteLabel('DD+ ATMOS 5.1'), 'DD+ ATMOS');
    assert.equal(qualityPaletteLabel('Dolby Digital+ 7.1'), 'Dolby Digital+');
    assert.equal(qualityPaletteLabel('WEB-DL'), 'WEB');
});
