/** Release-date categories defined by TMDB; no inference from a year or an air date. */
export function isoReleaseDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})(?:T|$)/.exec(String(value || ''));
    if (!match) return null;
    const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    return date.getUTCFullYear() === Number(match[1]) &&
        date.getUTCMonth() + 1 === Number(match[2]) &&
        date.getUTCDate() === Number(match[3])
        ? match[0].slice(0, 10)
        : null;
}

export function releaseDates(item, data = {}, region = 'US') {
    const results = data.results || item.ReleaseDates?.results || item.ReleaseDates || [];
    const groups = Array.isArray(results) ? results : [];
    const choose = (types) => {
        const candidates = groups
            .flatMap((group) =>
                (group.release_dates || group.releaseDates || []).map((entry) => ({
                    date: isoReleaseDate(entry.release_date || entry.releaseDate),
                    type: Number(entry.type),
                    country: group.iso_3166_1 || group.iso31661 || ''
                }))
            )
            .filter((entry) => entry.date && types.includes(entry.type));
        for (const country of [region.toUpperCase(), 'US', null]) {
            const selected = candidates
                .filter((entry) => !country || entry.country === country)
                .sort((a, b) => a.date.localeCompare(b.date));
            if (selected.length) return selected[0];
        }
        return null;
    };
    const premiere = choose([1]);
    const theatrical = choose([2, 3]);
    const digital = choose([4]);
    const output = [];
    const add = (kind, value, country = '') => {
        const date = isoReleaseDate(value);
        if (date) output.push({ kind, date, country });
    };
    add('ReleasePremiere', premiere?.date || item.PremiereDate || item.ReleaseDate || data.first_air_date);
    if (theatrical) add('ReleaseTheatrical', theatrical.date, theatrical.country);
    else add('ReleaseTheatrical', item.TheatricalReleaseDate);
    if (digital) add('ReleaseDigital', digital.date, digital.country);
    else add('ReleaseDigital', item.DigitalReleaseDate);
    return output;
}
