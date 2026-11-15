
const files = {
    imdb: 'imdb.png',
    tmdb: 'tmdb.png',
    rtAudience: 'rottentomatoes_audience.png',
    metacritic: 'metacritic.png',
    letterboxd: 'letterboxd.png',
    trakt: 'trakt.png',
    myAnimeList: 'myanimelist.png',
    aniList: 'anilist.png',
    metacriticUser: 'metacritic_audience.png',
    rogerEbert: 'rogerebert.png',
    mdblist: 'master.png'
};

export function ratingLogoFile(source, value) {
    if (source === 'rtCritic') return parseFloat(value) < 60 ? 'rottentomatoes_rotten.png' : 'rottentomatoes_fresh.png';
    return Object.prototype.hasOwnProperty.call(files, source) ? files[source] : null;
}

/** Read only the installed plugin's color data; never execute its JavaScript. */
export function parseQualityPalette(source) {
    const result = new Map();
    if (typeof source !== 'string') return result;
    const color = /^(?:#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\))$/i;
    const entries = /['"]([^'"\n]+)['"]\s*:\s*\{\s*bg\s*:\s*['"]([^'"]+)['"]\s*,\s*text\s*:\s*['"]([^'"]+)['"]\s*\}/g;
    let match;
    while ((match = entries.exec(source))) {
        if (color.test(match[2]) && color.test(match[3]))
            result.set(match[1], { background: match[2], color: match[3] });
    }
    return result;
}

/** Composite audio badges inherit the base audio format's color, as on native posters. */
export function qualityPaletteLabel(label) {
    if (/^DD\+ ATMOS(?:\s|$)/i.test(label)) return 'DD+ ATMOS';
    if (/^TRUEHD ATMOS(?:\s|$)/i.test(label)) return 'TRUEHD ATMOS';
    if (/^Atmos(?:\s|$)/i.test(label)) return 'ATMOS';
    if (/^TrueHD(?:\s|$)/i.test(label)) return 'TRUEHD';
    if (/^DTS:X(?:\s|$)/i.test(label)) return 'DTS-X';
    for (const base of ['Dolby Digital+', 'Dolby Digital', 'DTS-HD MA', 'DTS-HD', 'DTS', 'FLAC', 'PCM']) {
        if (label === base || label.startsWith(base + ' ')) return base;
    }
    return label === 'WEB-DL' || label === 'WEBRip' ? 'WEB' : label;
}
