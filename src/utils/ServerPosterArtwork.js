/** Jellyfin-Enhanced signs native poster variants in the server's image tag.
 * Preserve the entire tag, including its user marker; never manufacture one.
 */
export function hasServerPosterTag(tag) {
    return typeof tag === 'string' && /-jet[A-Za-z0-9_-]+/.test(tag);
}

export function serverPosterArtwork(item, landscape = false, preferEpisodeImages = false) {
    if (!item || !['Movie', 'Series', 'Episode', 'Season', 'Video', 'BoxSet'].includes(item.Type)) return null;
    const own = (type) => ({ id: item.Id, type, tag: item.ImageTags?.[type] });
    const series = (type) => ({ id: item.SeriesId, type, tag: item['Series' + type + 'ImageTag'] });
    const episode = item.Type === 'Episode';
    const primaryIsWide = Number(item.PrimaryImageAspectRatio) >= 1.2 || (episode && !item.PrimaryImageAspectRatio);
    const wideOwn = [own('Thumb'), ...(primaryIsWide ? [own('Primary')] : [])];
    const candidates = landscape
        ? episode && !preferEpisodeImages
            ? [series('Thumb')]
            : [...wideOwn, series('Thumb')]
        : episode
          ? [series('Primary'), own('Primary')]
          : item.Type === 'Season'
            ? [own('Primary'), series('Primary')]
            : [own('Primary')];
    return candidates.find((image) => image.id && hasServerPosterTag(image.tag)) || null;
}

export function mergeServerArtwork(item, fresh) {
    if (!fresh) return item;
    const result = { ...item };
    for (const key of [
        'ImageTags',
        'ImageBlurHashes',
        'SeriesPrimaryImageTag',
        'SeriesThumbImageTag',
        'ParentPrimaryImageTag',
        'ParentPrimaryImageItemId',
        'SeriesId',
        'PrimaryImageAspectRatio',
        'BackdropImageTags',
        'ParentBackdropImageTags',
        'ParentBackdropItemId',
        'SeriesBackdropImageTags',
        'ParentThumbItemId',
        'ParentThumbImageTag'
    ]) {
        if (fresh[key] != null) result[key] = fresh[key];
    }
    return result;
}
