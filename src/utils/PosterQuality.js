/** Technical labels derived only from actual Jellyfin media metadata. */
export function posterQualityTags(item, sourceId) {
    if (!item) return [];
    const source = item.MediaSources?.find((entry) => entry.Id === sourceId) || item.MediaSources?.[0] || {};
    const streams = source.MediaStreams?.length ? source.MediaStreams : item.MediaStreams || [];
    const video = streams.find((stream) => stream.Type === 'Video') || {};
    const audio =
        streams.find(
            (stream) =>
                source.DefaultAudioStreamIndex != null &&
                stream.Type === 'Audio' &&
                stream.Index === source.DefaultAudioStreamIndex
        ) ||
        streams.find((stream) => stream.Type === 'Audio' && stream.IsDefault) ||
        streams.find((stream) => stream.Type === 'Audio');
    const tags = [];
    const add = (kind, label) => {
        if (label) tags.push({ kind, label });
    };
    const width = Math.max(
        video.Width || source.Width || item.Width || 0,
        video.Height || source.Height || item.Height || 0
    );
    add(
        'resolution',
        width >= 7000
            ? '8K'
            : width >= 3000
              ? '4K'
              : width >= 2400
                ? '1440p'
                : width >= 1600
                  ? '1080p'
                  : width >= 1000
                    ? '720p'
                    : width > 0
                      ? 'SD'
                      : ''
    );
    const evidence = [source.Path, item.Path, source.Name, video.Title, video.DisplayTitle].filter(Boolean).join(' ');
    add(
        'source',
        /blu[ ._-]?ray|bdremux/i.test(evidence)
            ? 'BluRay'
            : /web[ ._-]?dl/i.test(evidence)
              ? 'WEB-DL'
              : /webrip/i.test(evidence)
                ? 'WEBRip'
                : /hdtv/i.test(evidence)
                  ? 'HDTV'
                  : /\bdvd(?:rip)?\b/i.test(evidence)
                    ? 'DVD'
                    : ''
    );
    const range = [
        video.VideoRange,
        video.VideoRangeType,
        video.Profile,
        video.Title,
        video.DisplayTitle,
        item.VideoRange,
        item.VideoRangeType
    ].join(' ');
    if (/dovi|dolby.?vision/i.test(range) || /^dv/i.test(video.Codec || '')) add('range', 'Dolby Vision');
    if (/hdr10\+|hdr10plus|hdr10p\b/i.test(range)) add('range', 'HDR10+');
    else if (/hdr10/i.test(range)) add('range', 'HDR10');
    else if (/hdr/i.test(range)) add('range', 'HDR');
    if (/hlg/i.test(range)) add('range', 'HLG');
    add('extras', /\bIMAX\b/i.test(evidence) ? 'IMAX' : '');
    add('extras', /\b(?:3D|SBS|HSBS|HTAB)\b/i.test(evidence) ? '3D' : '');
    const codecs = {
        hevc: 'HEVC',
        h265: 'HEVC',
        h264: 'H264',
        avc: 'H264',
        av1: 'AV1',
        vp9: 'VP9',
        mpeg2video: 'MPEG2',
        mpeg4: 'MPEG4'
    };
    const codec = (video.Codec || '').toLowerCase();
    add(
        'codec',
        (Object.prototype.hasOwnProperty.call(codecs, codec) ? codecs[codec] : '') ||
            (/^[a-z0-9]{2,12}$/i.test(codec) ? codec.toUpperCase() : '')
    );
    if (audio) {
        const sound = [audio.Title, audio.DisplayTitle, audio.Profile, audio.Codec].join(' ');
        const code = (audio.Codec || '').toLowerCase();
        const label = /atmos/i.test(sound)
            ? 'Atmos'
            : /dts[ :_-]?x\b/i.test(sound)
              ? 'DTS:X'
              : /truehd/i.test(code)
                ? 'TrueHD'
                : /dts.*(?:hd.*ma|master)/i.test(sound)
                  ? 'DTS-HD MA'
                  : /dts.*hd/i.test(sound)
                    ? 'DTS-HD'
                    : {
                          eac3: 'Dolby Digital+',
                          ac3: 'Dolby Digital',
                          dts: 'DTS',
                          aac: 'AAC',
                          flac: 'FLAC',
                          opus: 'Opus',
                          mp3: 'MP3'
                      }[code] || (/^pcm/.test(code) ? 'PCM' : '');
        const channels = { 1: 'Mono', 2: '2.0', 6: '5.1', 8: '7.1' }[audio.Channels] || '';
        add('audio', [label, channels].filter(Boolean).join(' '));
    }
    return tags;
}

export function posterQualityHtml(item, sourceId) {
    const tags = posterQualityTags(item, sourceId);
    // Labels above come exclusively from fixed mappings and restricted codec tokens.
    return tags.length
        ? '<div class="quality-badge poster-quality-tags">' +
              tags
                  .map(({ kind, label }) => `<span class="poster-quality-chip quality-${kind}">${label}</span>`)
                  .join('') +
              '</div>'
        : '';
}
