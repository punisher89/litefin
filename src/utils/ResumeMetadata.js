import { capResumeGroup } from './ResumeMetadataSettings.js';
import { resumeLanguages } from './ResumeMetadataLanguages.js';
import { posterQualityTags } from './PosterQuality.js';

const sources = [
    ['imdb', 'IMDb', 10, 10],
    ['tmdb', 'TMDB', 100, 10],
    ['rtCritic', 'RT', 100, 100],
    ['rtAudience', 'RT audience', 100, 100],
    ['metacritic', 'MC', 100, 100],
    ['letterboxd', 'LB', 5, 5],
    ['trakt', 'Trakt', 100, 100],
    ['myAnimeList', 'MAL', 10, 10],
    ['aniList', 'AniList', 100, 100],
    ['metacriticUser', 'MC user', 10, 10],
    ['rogerEbert', 'Ebert', 4, 4],
    ['mdblist', 'MDB', 100, 100]
];

function dtoKeys(value) {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? Object.fromEntries(
              Object.entries(value).map(([key, entry]) => [key.charAt(0).toUpperCase() + key.slice(1), entry])
          )
        : {};
}

/** Enhanced values are in source-native units. Never relabel a generic Jellyfin score. */
export function resumeMetadata(data, showScores = true, settings = null) {
    data = dtoKeys(data);
    data.MediaStreams = (Array.isArray(data.MediaStreams) ? data.MediaStreams : []).map(dtoKeys);
    data.MediaSources = (Array.isArray(data.MediaSources) ? data.MediaSources : []).map((source) => {
        const result = dtoKeys(source);
        if (Array.isArray(result.MediaStreams)) result.MediaStreams = result.MediaStreams.map(dtoKeys);
        return result;
    });
    let quality = posterQualityTags(data);
    if (settings)
        quality = settings.groups.quality.enabled
            ? capResumeGroup(
                  quality
                      .filter((tag) => settings.kinds[tag.kind] !== false)
                      .sort((a, b) => settings.kindOrder[a.kind] - settings.kindOrder[b.kind]),
                  settings.groups.quality.cap
              )
            : [];
    const ratings = [];
    if (showScores && (!settings || settings.groups.rating.enabled)) {
        const sourceRatings = data.Ratings || data.ratings || {};
        const definitions = [...sources, ['community', 'JF', 10, 10], ['critic', 'RT', 100, 100]];
        const selected = settings?.ratingSources;
        const ordered = Array.isArray(selected)
            ? selected.map((key) => definitions.find((entry) => entry[0] === key)).filter(Boolean)
            : sources;
        for (const [key, label, maximum, displayMaximum] of ordered) {
            const raw =
                key === 'community' ? data.CommunityRating : key === 'critic' ? data.CriticRating : sourceRatings[key];
            const value = Number(raw);
            if (raw == null || !Number.isFinite(value) || value < 0 || value > maximum) continue;
            if (settings && (value * 10) / maximum < settings.minScore) continue;
            const score = (value * displayMaximum) / maximum;
            ratings.push({
                source: key,
                label,
                value:
                    displayMaximum === 100 ? `${Math.round(score)}${key === 'metacritic' ? '' : '%'}` : score.toFixed(1)
            });
        }
        if (!ratings.length && !Array.isArray(selected)) {
            const value = Number(data.CommunityRating);
            if (data.CommunityRating != null && value >= (settings?.minScore || 0) && value <= 10)
                ratings.push({ source: 'community', label: 'JF', value: value.toFixed(1) });
        }
    }
    return {
        quality,
        ratings: settings ? capResumeGroup(ratings, settings.groups.rating.cap) : ratings.slice(0, 6),
        certification:
            (!settings || settings.groups.age.enabled) && typeof data.OfficialRating === 'string'
                ? data.OfficialRating
                : '',
        ...(settings
            ? {
                  genres: settings.groups.genre.enabled
                      ? capResumeGroup(
                            (Array.isArray(data.Genres) ? data.Genres : []).filter(
                                (genre) => typeof genre === 'string' && genre
                            ),
                            settings.groups.genre.cap
                        )
                      : [],
                  languages: settings.groups.language.enabled
                      ? capResumeGroup(resumeLanguages(data, settings), settings.groups.language.cap)
                      : []
              }
            : {})
    };
}
