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
export function resumeMetadata(data, showScores = true) {
    data = dtoKeys(data);
    data.MediaStreams = (Array.isArray(data.MediaStreams) ? data.MediaStreams : []).map(dtoKeys);
    data.MediaSources = (Array.isArray(data.MediaSources) ? data.MediaSources : []).map((source) => {
        const result = dtoKeys(source);
        if (Array.isArray(result.MediaStreams)) result.MediaStreams = result.MediaStreams.map(dtoKeys);
        return result;
    });
    const quality = posterQualityTags(data);
    const ratings = [];
    if (showScores) {
        const sourceRatings = data.Ratings || data.ratings || {};
        for (const [key, label, maximum, displayMaximum] of sources) {
            const raw = sourceRatings[key];
            const value = Number(raw);
            if (raw == null || !Number.isFinite(value) || value < 0 || value > maximum) continue;
            const score = (value * displayMaximum) / maximum;
            ratings.push({ label, value: displayMaximum === 100 ? `${Math.round(score)}%` : score.toFixed(1) });
        }
        if (!ratings.length) {
            const value = Number(data.CommunityRating);
            if (data.CommunityRating != null && value >= 0 && value <= 10)
                ratings.push({ label: 'JF', value: value.toFixed(1) });
        }
    }
    return {
        quality,
        ratings: ratings.slice(0, 6),
        certification: typeof data.OfficialRating === 'string' ? data.OfficialRating : ''
    };
}
