const countries = {
    en: 'US',
    eng: 'US',
    ru: 'RU',
    rus: 'RU',
    ja: 'JP',
    jpn: 'JP',
    fr: 'FR',
    fra: 'FR',
    fre: 'FR',
    de: 'DE',
    deu: 'DE',
    ger: 'DE',
    es: 'ES',
    spa: 'ES',
    it: 'IT',
    ita: 'IT',
    pt: 'PT',
    por: 'PT',
    zh: 'CN',
    zho: 'CN',
    chi: 'CN',
    ko: 'KR',
    kor: 'KR',
    ar: 'SA',
    ara: 'SA',
    tr: 'TR',
    tur: 'TR',
    pl: 'PL',
    pol: 'PL',
    uk: 'UA',
    ukr: 'UA',
    nl: 'NL',
    nld: 'NL',
    sv: 'SE',
    swe: 'SE',
    fi: 'FI',
    fin: 'FI',
    hi: 'IN',
    hin: 'IN',
    th: 'TH',
    tha: 'TH',
    vi: 'VN',
    vie: 'VN',
    cs: 'CZ',
    ces: 'CZ',
    he: 'IL',
    heb: 'IL',
    id: 'ID',
    ind: 'ID'
};
const short = {
    eng: 'en',
    rus: 'ru',
    jpn: 'ja',
    fra: 'fr',
    fre: 'fr',
    deu: 'de',
    ger: 'de',
    spa: 'es',
    ita: 'it',
    por: 'pt',
    zho: 'zh',
    chi: 'zh',
    kor: 'ko',
    ara: 'ar',
    tur: 'tr',
    pol: 'pl',
    ukr: 'uk',
    nld: 'nl',
    swe: 'sv',
    fin: 'fi',
    hin: 'hi',
    tha: 'th',
    vie: 'vi'
};
export function resumeLanguages(data, settings) {
    const codes = [];
    for (const stream of data.MediaStreams || []) {
        if (
            (stream.Type === 'Audio' && settings.audioLanguages) ||
            (stream.Type === 'Subtitle' && settings.subtitleLanguages)
        )
            if (stream.Language) codes.push(stream.Language);
    }
    if (settings.subtitleLanguages)
        codes.push(...(Array.isArray(data.SubtitleLanguages) ? data.SubtitleLanguages : []));
    const rawPriority = settings.languagePriority;
    const priority = (Array.isArray(rawPriority) ? rawPriority : String(rawPriority || '').split(',')).map((code) => {
        code = String(code).trim().toLowerCase();
        return short[code] || code;
    });
    const seen = new Set();
    const result = [];
    for (const code of codes) {
        if (typeof code !== 'string') continue;
        const parts = code.replace(/_/g, '-').split('-');
        const raw = parts[0].toLowerCase();
        if (!/^[a-z]{2,3}$/.test(raw) || ['und', 'zxx'].includes(raw)) continue;
        const language = short[raw] || raw;
        if (settings.languageStrict && priority.length && !priority.includes(language)) continue;
        const country = (parts.slice(1).find((part) => /^[a-z]{2}$/i.test(part)) || countries[raw] || '').toUpperCase();
        if (seen.has(language + country)) continue;
        seen.add(language + country);
        result.push({ code: language, country });
    }
    if (priority.length)
        result.sort(
            (a, b) =>
                (priority.includes(a.code) ? priority.indexOf(a.code) : 999) -
                (priority.includes(b.code) ? priority.indexOf(b.code) : 999)
        );
    return result;
}
