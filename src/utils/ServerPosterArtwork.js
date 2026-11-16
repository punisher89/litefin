/** Jellyfin-Enhanced signs native poster variants in the server's image tag.
 * Preserve the entire tag, including its user marker; never manufacture one.
 */
export function hasServerPosterTag(tag) {
    return typeof tag === 'string' && /-jet[A-Za-z0-9_-]+/.test(tag);
}

function thumbVariant(thumbTag, primaryTag) {
    // The server authenticates this suffix for the same user/item; the file hash
    // before it identifies the actual Thumb and must not remain the poster hash.
    const signature = String(primaryTag).match(/(-jet[A-Za-z0-9_-]+)$/);
    return signature ? String(thumbTag).replace(/-jeu[0-9a-f]+$/i, '') + signature[1] : null;
}

export function serverPosterArtwork(item, landscape = false, preferEpisodeImages = false, nativeResume = false) {
    if (!item || !['Movie', 'Series', 'Episode', 'Season', 'Video', 'BoxSet'].includes(item.Type)) return null;
    const own = (type) => ({ id: item.Id, type, tag: item.ImageTags?.[type] });
    const series = (type) => ({ id: item.SeriesId, type, tag: item['Series' + type + 'ImageTag'] });
    const episode = item.Type === 'Episode';
    const primaryIsWide = Number(item.PrimaryImageAspectRatio) >= 1.2 || (episode && !item.PrimaryImageAspectRatio);
    const wideOwn = [own('Thumb'), ...(primaryIsWide ? [own('Primary')] : [])];
    // Native Resume in 2.0.150 uses the episode's own Primary, so the server
    // renders the full set of metadata instead of a guessed client subset.
    if (nativeResume && landscape) {
        if (episode && primaryIsWide && hasServerPosterTag(item.ImageTags?.Primary)) return own('Primary');
        const wide = [own('Thumb'), series('Thumb')].find((image) => image.id && hasServerPosterTag(image.tag));
        if (wide) return wide;
        // The signed variant binds the user and item, not Primary vs Thumb.
        // Reuse its signed suffix only on that SAME owner's Thumb, preserving the Thumb file hash.
        if (item.ImageTags?.Thumb && hasServerPosterTag(item.ImageTags?.Primary))
            return { id: item.Id, type: 'Thumb', tag: thumbVariant(item.ImageTags.Thumb, item.ImageTags.Primary) };
        if (item.SeriesId && item.SeriesThumbImageTag && hasServerPosterTag(item.SeriesPrimaryImageTag))
            return {
                id: item.SeriesId,
                type: 'Thumb',
                tag: thumbVariant(item.SeriesThumbImageTag, item.SeriesPrimaryImageTag)
            };
    }
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
