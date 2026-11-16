/** Read both public/user Pascal-case and camel-case plugin documents. */
export function tagSetting(object, key) {
    if (!object || typeof object !== 'object' || Array.isArray(object)) return undefined;
    const own = Object.keys(object).find((name) => name.toLowerCase() === key.toLowerCase());
    return own == null ? undefined : object[own];
}
const groups = {
    quality: ['Quality', 'top-left', true],
    genre: ['Genre', 'top-right', false],
    language: ['Language', 'bottom-left', false],
    age: ['AgeRating', 'bottom-right', true],
    rating: ['Rating', 'bottom-right', true]
};
const kinds = {
    resolution: ['ShowResolutionTag', 'ResolutionTagOrder'],
    source: ['ShowSourceTag', 'SourceTagOrder'],
    range: ['ShowDynamicRangeTag', 'DynamicRangeTagOrder'],
    extras: ['ShowSpecialFormatTag', 'SpecialFormatTagOrder'],
    codec: ['ShowVideoCodecTag', 'VideoCodecTagOrder'],
    audio: ['ShowAudioInfoTag', 'AudioInfoTagOrder']
};
const corners = new Set(['top-left', 'top-right', 'bottom-left', 'bottom-right']);
const alias = (id) => (id === 'ageRating' ? 'age' : id);

export function resolveMovieWebTagSettings(config = {}, user = {}, itemType = 'Movie') {
    const read = (key, fallback) => tagSetting(user, key) ?? tagSetting(config, key) ?? fallback;
    const type = { Movie: 'Movies', Series: 'Series', Episode: 'Episodes', Season: 'Seasons' }[itemType];
    const result = {
        enabled: read('UseNativePosterTags', true) !== false && tagSetting(config, 'NativePosterTagsEnabled') !== false,
        groups: {},
        kinds: {},
        kindOrder: {},
        order: [],
        scale: { smaller: 0.85, larger: 1.15, largest: 1.3 }[read('TagScale', 'default')] || 1,
        gap: { tight: 0.75, roomy: 1.5 }[read('TagGap', 'default')] || 1,
        minScore: Math.max(0, Math.min(10, Number(read('RatingTagsMinScore', 0)) || 0)),
        colorByScore: read('RatingTagsColorByScore', false) === true,
        ratingSources: read('RatingTagsSources', null),
        languageStyle: read('LanguageTagsStyle', 'flags'),
        audioLanguages: read('LanguageTagsShowAudio', true) !== false,
        subtitleLanguages: read('LanguageTagsShowSubtitles', false) === true,
        languagePriority: read('LanguageTagsPriority', []),
        languageStrict: read('LanguageTagsPriorityStrict', false) === true
    };
    const scope = (document, group, name) =>
        tagSetting(tagSetting(tagSetting(document, 'TagGroupScopes'), group), name);
    for (const [id, [prefix, position, enabled]] of Object.entries(groups)) {
        const cap =
            tagSetting(tagSetting(user, 'TagGroupCaps'), prefix) ??
            tagSetting(tagSetting(config, 'TagGroupCaps'), prefix);
        let visible = result.enabled && read(prefix + 'TagsEnabled', enabled) !== false;
        for (const surface of ['ContinueWatching', type].filter(Boolean)) {
            const legacy = id === 'rating' ? read('RatingTagsOn' + surface, true) : true;
            if ((scope(user, prefix, surface) ?? scope(config, prefix, surface) ?? legacy) === false) visible = false;
        }
        const value = read(prefix + 'TagsPosition', position);
        result.groups[id] = {
            enabled: visible,
            position: corners.has(value) ? value : position,
            cap:
                Number.isInteger(cap) && cap >= 0
                    ? Math.min(cap, 10)
                    : ['genre', 'language'].includes(id)
                      ? 3
                      : id === 'rating'
                        ? 6
                        : 0
        };
    }
    let index = 0;
    for (const [kind, [flag, order]] of Object.entries(kinds)) {
        result.kinds[kind] = read(flag, true) !== false;
        const value = Number(read(order, ++index));
        result.kindOrder[kind] = Number.isFinite(value) ? value : index;
    }
    const order = read('TagGroupOrder', []);
    for (const id of [...(Array.isArray(order) ? order : []).map(alias), ...Object.keys(groups)])
        if (Object.prototype.hasOwnProperty.call(groups, id) && !result.order.includes(id)) result.order.push(id);
    const baseVisibility = Object.fromEntries(Object.entries(result.groups).map(([id, group]) => [id, group.enabled]));
    // Newer servers can store corner placement in a profile, including an explicit off slot.
    for (const document of [config, user]) {
        const profile = tagSetting(tagSetting(document, 'TagLayouts'), 'Corners');
        const slots = tagSetting(profile, 'Groups');
        for (const slot of Array.isArray(slots) ? slots : []) {
            const id = alias(tagSetting(slot, 'Group'));
            if (!Object.prototype.hasOwnProperty.call(result.groups, id)) continue;
            const group = result.groups[id];
            const position = tagSetting(slot, 'Slot');
            if (!group) continue;
            if (position === 'off') group.enabled = false;
            else if (corners.has(position)) {
                group.position = position;
                group.enabled = baseVisibility[id];
            }
        }
    }
    if (!Array.isArray(result.ratingSources)) {
        const community = read('RatingTagsShowCommunity', null),
            critic = read('RatingTagsShowCritic', null);
        result.ratingSources =
            community == null && critic == null
                ? null
                : [community !== false && 'community', critic !== false && 'critic'].filter(Boolean);
    }
    return result;
}

export function capMovieWebTagGroup(items, cap) {
    return cap > 0 ? items.slice(0, cap) : items;
}
