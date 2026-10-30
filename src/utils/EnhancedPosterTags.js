/**
 * Litefin client-side renderer for Jellyfin Enhanced poster tags.
 *
 * Uses Jellyfin Enhanced's documented, user-scoped tag-data endpoint. This is
 * deliberately a small client implementation: it never injects JE's web UI
 * scripts, and it keeps the server as the source of metadata and permissions.
 */
import { api } from '../api/index.js';
import { escapeHtml } from './Utils.js';
import { logger } from './Logger.js';

const log = logger.create('EnhancedPosterTags');
const SETTINGS_TTL = 5 * 60 * 1000;
const ITEM_TTL = 10 * 60 * 1000;
const NEGATIVE_TTL = 2 * 60 * 1000;
const MAX_BATCH = 200;
const SUPPORTED_TYPES = new Set(['Movie', 'Series', 'Season', 'Episode', 'BoxSet', 'Video']);
const VALID_CORNERS = new Set(['top-left', 'top-right', 'bottom-left', 'bottom-right']);

let settingsSnapshot = null;
let settingsUserId = null;
let settingsFetchedAt = 0;
let settingsLoaded = false;
let settingsPromise = null;
let endpointUnavailableUntil = 0;
const itemCache = new Map();

function cleanPosition(value, fallback) {
    return VALID_CORNERS.has(value) ? value : fallback;
}

function lower(value) {
    return String(value || '').toLowerCase();
}

function unique(values) {
    const seen = new Set();
    return values.filter((value) => {
        const key = lower(value);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

export function hasNativePosterTagStamp(item) {
    const candidates = [
        item && item.ImageTags && item.ImageTags.Primary,
        item && item.SeriesPrimaryImageTag,
        item && item.ParentPrimaryImageTag,
        item && item.ParentThumbImageTag
    ];
    return candidates.some((tag) => typeof tag === 'string' && /-jet[0-9a-f]{23}(?:-jeu[0-9a-f]{12})?$/i.test(tag));
}

function enabledSettings(settings) {
    return !!settings && settings.UseNativePosterTags !== false && (
        settings.QualityTagsEnabled === true ||
        settings.GenreTagsEnabled === true ||
        settings.LanguageTagsEnabled === true ||
        settings.RatingTagsEnabled === true ||
        settings.AgeRatingTagsEnabled === true
    );
}

async function getSettingsSnapshot(force = false) {
    const userId = api._userId || api.userId;
    if (!userId) return null;
    const now = Date.now();

    if (!force && settingsLoaded && settingsUserId === userId && now - settingsFetchedAt < SETTINGS_TTL) {
        return settingsSnapshot;
    }
    if (!force && settingsPromise && settingsUserId === userId) return settingsPromise;

    if (settingsUserId !== userId) {
        settingsLoaded = false;
        itemCache.clear(); // Tag data is filtered by user permissions and Spoiler Guard.
        endpointUnavailableUntil = 0;
    }
    settingsUserId = userId;
    const requestPromise = (async () => {
        try {
            const config = await api.get('/JellyfinEnhanced/public-config', null, {
                silent: true,
                warnOnError: false
            });
            if (!config || config.NativePosterTagsEnabled !== true) {
                settingsSnapshot = null;
                settingsFetchedAt = Date.now();
                settingsLoaded = true;
                return null;
            }

            if ((api._userId || api.userId) !== userId) return null;

            const settings = await api.get(
                '/JellyfinEnhanced/user-settings/' + encodeURIComponent(userId) + '/settings.json',
                null,
                { silent: true, warnOnError: false }
            );
            if ((api._userId || api.userId) !== userId) return null;
            if (!enabledSettings(settings)) {
                settingsSnapshot = null;
                settingsFetchedAt = Date.now();
                settingsLoaded = true;
                return null;
            }

            settingsSnapshot = {
                userId,
                settings,
                config
            };
            settingsFetchedAt = Date.now();
            settingsLoaded = true;
            return settingsSnapshot;
        } catch (error) {
            if ((api._userId || api.userId) === userId) {
                settingsSnapshot = null;
                settingsFetchedAt = Date.now();
                settingsLoaded = true;
                log.debug('Jellyfin Enhanced poster-tag settings are unavailable:', error && error.message);
            }
            return null;
        } finally {
            if (settingsPromise === requestPromise) settingsPromise = null;
        }
    })();
    settingsPromise = requestPromise;

    return requestPromise;
}

function extractQuality(data, settings) {
    const output = [];
    const itemName = String(data.Name || '');
    const mediaStreams = Array.isArray(data.MediaStreams) ? data.MediaStreams : [];
    const video = mediaStreams.find((stream) => stream && stream.Type === 'Video');
    const audio = mediaStreams.filter((stream) => stream && stream.Type === 'Audio');

    if (!video && !audio.length) return output;

    if (settings.ShowResolutionTag !== false && video) {
        const height = Number(video.Height || 0);
        const title = lower(video.DisplayTitle);
        let resolution = '';
        if (height >= 3000 || /\b8k\b/.test(title)) resolution = '8K';
        else if (height >= 2000 || /\b(2160p|4k)\b/.test(title)) resolution = '4K';
        else if (height >= 1350 || /\b1440p\b/.test(title)) resolution = '1440p';
        else if (height >= 1000 || /\b1080p\b/.test(title)) resolution = '1080p';
        else if (height >= 650 || /\b720p\b/.test(title)) resolution = '720p';
        else if (height >= 500 || /\b576p\b/.test(title)) resolution = '576p';
        else if (height >= 400 || /\b480p\b/.test(title)) resolution = '480p';
        if (resolution) output.push(resolution);
    }

    const videoSignals = [
        video && video.VideoRangeType,
        video && video.Profile,
        video && video.DisplayTitle,
        video && video.Codec,
        itemName,
        data.Path
    ].map(lower).join(' ');

    if (settings.ShowDynamicRangeTag !== false) {
        if (/dolby.?vision|dovi|dvhe|dvh1/.test(videoSignals)) output.push('Dolby Vision');
        else if (/hdr10.?plus|hdr10p/.test(videoSignals)) output.push('HDR10+');
        else if (/hdr10/.test(videoSignals)) output.push('HDR10');
        else if (/\bhdr\b/.test(videoSignals)) output.push('HDR');
    }

    const sourceText = (Array.isArray(data.MediaSources) ? data.MediaSources : [])
        .map((source) => String((source && (source.Path || source.Name)) || ''))
        .join(' ');
    if (settings.ShowSourceTag !== false && /\.disc(?:[\\/ ]|$)/i.test(sourceText)) {
        const source = lower(sourceText);
        if (source.includes('bluray')) output.push('BluRay');
        else if (source.includes('hddvd')) output.push('HD DVD');
        else if (source.includes('dvd')) output.push('DVD');
        else output.push('Physical');
    }

    if (settings.ShowSpecialFormatTag !== false) {
        const special = lower(itemName + ' ' + data.Path + ' ' + sourceText);
        if (/\bimax\b/.test(special)) output.push('IMAX');
        if (/\b3d\b|hsbs|fsbs|htab|ftab|mvc/.test(special)) output.push('3D');
    }

    if (settings.ShowVideoCodecTag !== false && video) {
        const codec = lower(video.Codec || video.CodecTag);
        const codecs = [
            ['av1', 'AV1'],
            ['hevc', 'HEVC'],
            ['h265', 'H265'],
            ['vp9', 'VP9'],
            ['h264', 'H264'],
            ['vp8', 'VP8'],
            ['xvid', 'XVID'],
            ['divx', 'DIVX'],
            ['wmv', 'WMV'],
            ['mpeg2', 'MPEG2'],
            ['mpeg4', 'MPEG4']
        ];
        const match = codecs.find((entry) => codec.includes(entry[0]));
        if (match) output.push(match[1]);
    }

    if (settings.ShowAudioInfoTag !== false && audio.length) {
        const audioSignals = audio.map((stream) => [
            stream.Codec,
            stream.CodecTag,
            stream.Profile,
            stream.DisplayTitle,
            stream.ChannelLayout
        ].map(lower).join(' ')).join(' ');
        let audioLabel = '';
        if (/atmos/.test(audioSignals)) audioLabel = 'ATMOS';
        else if (/dts.?x/.test(audioSignals)) audioLabel = 'DTS-X';
        else if (/true.?hd|truehd/.test(audioSignals)) audioLabel = 'TRUEHD';
        else if (/dts/.test(audioSignals)) audioLabel = 'DTS';
        else if (/e.?ac.?3|ddp|dolby digital plus/.test(audioSignals)) audioLabel = 'Dolby Digital+';

        const layoutSignals = audioSignals + ' ' + audio.map((stream) => Number(stream.Channels || 0)).join(' ');
        let channels = '';
        if (/\b7[. ]?1\b/.test(layoutSignals) || audio.some((stream) => Number(stream.Channels || 0) >= 8)) channels = '7.1';
        else if (/\b5[. ]?1\b/.test(layoutSignals) || audio.some((stream) => Number(stream.Channels || 0) >= 6)) channels = '5.1';
        else if (/\b2[. ]?0\b|\bstereo\b/.test(layoutSignals) || audio.some((stream) => Number(stream.Channels || 0) === 2)) channels = '2.0';
        if (audioLabel) output.push(channels ? audioLabel + ' ' + channels : audioLabel);
        else if (channels) output.push(channels);
    }

    return unique(output);
}

function extractLanguages(data, config) {
    const streams = Array.isArray(data.MediaStreams) ? data.MediaStreams : [];
    const languageStreams = streams.filter((stream) => stream && stream.Type === 'Audio' && stream.Language);
    const priorities = String(config.LanguageTagsPriority || '')
        .split(',')
        .map((entry) => lower(entry).trim())
        .filter(Boolean);
    const map = {
        en: 'US', ru: 'RU', ja: 'JP', fr: 'FR', de: 'DE', es: 'ES',
        it: 'IT', pt: 'PT', zh: 'CN', ko: 'KR', ar: 'SA', tr: 'TR',
        pl: 'PL', uk: 'UA', nl: 'NL', sv: 'SE', no: 'NO', da: 'DK',
        fi: 'FI', cs: 'CZ', el: 'GR', he: 'IL', hi: 'IN', th: 'TH',
        vi: 'VN', id: 'ID', ms: 'MY', ro: 'RO', hu: 'HU', bg: 'BG'
    };
    const result = [];
    const seen = new Set();
    for (const stream of languageStreams) {
        const code = String(stream.Language).trim();
        const parts = code.replace('_', '-').split('-');
        const base = lower(parts[0]);
        if (!base || base === 'und' || base === 'root') continue;
        const region = parts.find((part) => /^[A-Za-z]{2}$/.test(part));
        const country = region ? region.toUpperCase() : map[base];
        if (!country || seen.has(country)) continue;
        seen.add(country);
        result.push({ code: base, country });
    }
    if (priorities.length) {
        const rank = (entry) => {
            const index = priorities.indexOf(entry.code);
            return index < 0 ? priorities.length : index;
        };
        result.sort((a, b) => rank(a) - rank(b));
        if (config.LanguageTagsPriorityStrict === true) {
            return result.filter((entry) => priorities.includes(entry.code));
        }
    }
    return result.slice(0, 3);
}

function ratingAllowed(data, settings, contextType) {
    const type = data.Type;
    if (type === 'Movie' && settings.RatingTagsOnMovies === false) return false;
    if (type === 'Series' && settings.RatingTagsOnSeries === false) return false;
    if (type === 'Season' && settings.RatingTagsOnSeasons === false) return false;
    if (type === 'Episode' && settings.RatingTagsOnEpisodes === false) return false;
    if (['resume', 'continueWatching', 'continue-watching'].includes(contextType) &&
        settings.RatingTagsOnContinueWatching === false) return false;
    if (['nextUp', 'next-up'].includes(contextType) && settings.RatingTagsOnNextUp === false) return false;
    return true;
}

export function buildEnhancedPosterTagGroups(data, settings, config, contextType = '') {
    if (!data || !settings || !config || hasNativePosterTagStamp(data)) return {};
    if (!SUPPORTED_TYPES.has(data.Type)) return {};

    const groups = {};
    if (settings.QualityTagsEnabled === true) {
        const quality = extractQuality(data, settings);
        if (quality.length) {
            groups.quality = {
                position: cleanPosition(settings.QualityTagsPosition, 'top-left'),
                items: quality
            };
        }
    }

    if (settings.GenreTagsEnabled === true) {
        const genres = unique(Array.isArray(data.Genres) ? data.Genres : []).slice(0, 3);
        if (genres.length) {
            groups.genre = {
                position: cleanPosition(settings.GenreTagsPosition, 'top-right'),
                items: genres
            };
        }
    }

    if (settings.LanguageTagsEnabled === true) {
        const languages = extractLanguages(data, config);
        if (languages.length) {
            groups.language = {
                position: cleanPosition(settings.LanguageTagsPosition, 'bottom-left'),
                items: languages
            };
        }
    }

    if (settings.RatingTagsEnabled === true && ratingAllowed(data, settings, contextType)) {
        const ratings = [];
        const community = Number(data.CommunityRating);
        const critic = Number(data.CriticRating);
        if (Number.isFinite(community) && community > 0) ratings.push('★ ' + community.toFixed(1));
        if (Number.isFinite(critic) && critic > 0) ratings.push('◆ ' + Math.round(critic) + '%');
        if (ratings.length) {
            groups.rating = {
                position: cleanPosition(settings.RatingTagsPosition, 'bottom-right'),
                items: ratings
            };
        }
    }

    if (settings.AgeRatingTagsEnabled === true && data.OfficialRating) {
        groups.age = {
            position: cleanPosition(settings.AgeRatingTagsPosition, 'bottom-right'),
            items: [String(data.OfficialRating)]
        };
    }

    return groups;
}

async function loadMissingItems(ids, userId) {
    const now = Date.now();
    const missing = unique(ids).filter((id) => {
        const cached = itemCache.get(id);
        return !cached || cached.expiresAt <= now;
    });
    if (!missing.length) return;

    for (let offset = 0; offset < missing.length; offset += MAX_BATCH) {
        const batch = missing.slice(offset, offset + MAX_BATCH);
        try {
            const response = await api.post(
                '/JellyfinEnhanced/tag-data/' + encodeURIComponent(userId),
                batch,
                { silent: true, warnOnError: false }
            );
            const records = Array.isArray(response && response.Items) ? response.Items : [];
            for (const record of records) {
                if (record && record.Id) {
                    itemCache.set(String(record.Id), {
                        data: record,
                        expiresAt: Date.now() + ITEM_TTL
                    });
                }
            }
            for (const id of batch) {
                const cached = itemCache.get(id);
                if (!cached || cached.expiresAt <= Date.now()) {
                    itemCache.set(id, { data: null, expiresAt: Date.now() + NEGATIVE_TTL });
                }
            }
        } catch (error) {
            endpointUnavailableUntil = Date.now() + NEGATIVE_TTL;
            log.debug('Jellyfin Enhanced tag-data request failed:', error && error.message);
            return;
        }
    }
}

export async function prepareEnhancedPosterTags(items, contextType = '') {
    if (!Array.isArray(items) || !items.length) return items;
    const candidates = items.filter((item) =>
        item && item.Id && SUPPORTED_TYPES.has(item.Type) &&
        !item._isGenreCard && !item._isStudioCard && !item._isNetworkCard &&
        !hasNativePosterTagStamp(item)
    );
    if (!candidates.length) return items;

    const snapshot = await getSettingsSnapshot();
    if (!snapshot) return items;
    const userId = snapshot.userId;

    const now = Date.now();
    const missing = candidates
        .map((item) => String(item.Id))
        .filter((id) => {
            const cached = itemCache.get(id);
            return !cached || cached.expiresAt <= now;
        });

    if (Date.now() >= endpointUnavailableUntil) {
        await loadMissingItems(missing, userId);
    }

    const firstEpisodeIds = [];
    for (const item of candidates) {
        const cached = itemCache.get(String(item.Id));
        const record = cached && cached.expiresAt > Date.now() ? cached.data : null;
        if (record && record.FirstEpisode && record.FirstEpisode.NeedsStreamFetch && record.FirstEpisode.Id) {
            firstEpisodeIds.push(String(record.FirstEpisode.Id));
        }
    }
    if (firstEpisodeIds.length && Date.now() >= endpointUnavailableUntil) {
        await loadMissingItems(firstEpisodeIds, userId);
    }

    for (const item of candidates) {
        const cached = itemCache.get(String(item.Id));
        const record = cached && cached.expiresAt > Date.now() ? cached.data : null;
        if (!record) continue;
        const renderData = { ...record };
        if (renderData.FirstEpisode && renderData.FirstEpisode.Id) {
            const episodeEntry = itemCache.get(String(renderData.FirstEpisode.Id));
            const episode = episodeEntry && episodeEntry.expiresAt > Date.now() ? episodeEntry.data : null;
            if (episode) {
                renderData.MediaStreams = episode.MediaStreams || renderData.MediaStreams;
                renderData.MediaSources = episode.MediaSources || renderData.MediaSources;
                renderData._qualityName = episode.Name || '';
            }
        }
        item._enhancedPosterTags = buildEnhancedPosterTagGroups(renderData, snapshot.settings, snapshot.config, contextType);
    }
    return items;
}

export function renderEnhancedPosterTags(item) {
    const groups = item && item._enhancedPosterTags;
    if (!groups || !Object.keys(groups).length || hasNativePosterTagStamp(item)) return '';
    const output = [];
    const byPosition = {};
    for (const key of ['quality', 'genre', 'language', 'rating', 'age']) {
        const group = groups[key];
        if (!group || !Array.isArray(group.items) || !group.items.length) continue;
        const position = cleanPosition(group.position, 'top-left');
        if (!byPosition[position]) byPosition[position] = [];
        for (const entry of group.items) {
            if (entry && typeof entry === 'object') {
                const country = String(entry.country || '').toUpperCase();
                const flag = country.length === 2
                    ? String.fromCodePoint(127397 + country.charCodeAt(0), 127397 + country.charCodeAt(1))
                    : String(entry.code || '');
                byPosition[position].push('<span class="lf-je-tag lf-je-tag--' + key + '" title="' +
                    escapeHtml(String(entry.code || country)) + '">' + escapeHtml(flag) + '</span>');
            } else {
                byPosition[position].push('<span class="lf-je-tag lf-je-tag--' + key + '">' + escapeHtml(entry) + '</span>');
            }
        }
    }
    for (const position of Object.keys(byPosition)) {
        output.push('<div class="lf-je-tag-group lf-je-tag-group--' + position + '">' +
            byPosition[position].join('') + '</div>');
    }
    return output.length ? '<div class="lf-je-poster-tags">' + output.join('') + '</div>' : '';
}

export function clearEnhancedPosterTagItemCache() {
    // A fresh homepage visit must see current Spoiler Guard and library-access filtering.
    itemCache.clear();
}

export function clearEnhancedPosterTagCache() {
    settingsSnapshot = null;
    settingsUserId = null;
    settingsFetchedAt = 0;
    settingsLoaded = false;
    settingsPromise = null;
    endpointUnavailableUntil = 0;
    itemCache.clear();
}
