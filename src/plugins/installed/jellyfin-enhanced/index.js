/**
 * Native subset of Jellyfin Enhanced's media-information features.
 *
 * The web plugin injects UI into Jellyfin Web. Litefin presents the available
 * playback metadata as native detail chips using fields DetailsPage already
 * fetched (MediaSources / MediaStreams).
 */

import './jellyfin-enhanced.css';

function firstStream(streams, type) {
    return Array.isArray(streams) ? streams.find((stream) => stream && stream.Type === type) : null;
}

function resolutionLabel(video) {
    const height = Number(video && video.Height) || 0;
    if (height >= 2160) return '4K UHD';
    if (height >= 1440) return '1440p';
    if (height >= 1080) return '1080p';
    if (height >= 720) return '720p';
    if (height >= 480) return 'SD';
    return '';
}

function hdrLabel(video) {
    const value = String(video && (video.VideoRangeType || video.VideoRange || '')).toLowerCase();
    if (value.includes('dolby') || value === 'dovi' || value === 'dv') return 'Dolby Vision';
    if (value.includes('hdr10+')) return 'HDR10+';
    if (value.includes('hdr10')) return 'HDR10';
    if (value.includes('hlg')) return 'HLG';
    if (value === 'hdr') return 'HDR';
    return '';
}

function audioLabel(audio) {
    if (!audio) return '';
    const parts = [];
    const codec = String(audio.Codec || '').trim();
    const layout = String(audio.ChannelLayout || '').trim();
    const channels = Number(audio.Channels) || 0;

    if (codec) parts.push(codec.toUpperCase());
    if (layout) parts.push(layout);
    else if (channels >= 8) parts.push('7.1');
    else if (channels === 6) parts.push('5.1');
    else if (channels === 2) parts.push('Stereo');
    return parts.join(' · ');
}

function uniqueLabels(labels) {
    return Array.from(new Set(labels.filter(Boolean)));
}

export default {
    id: 'jellyfin-enhanced',
    name: 'Litefin Media Details+',
    version: '1.0.0',
    description: 'Показывает разрешение, HDR и аудиоформат в карточке фильма.',
    defaultEnabled: true,

    init(api) {
        api.addDetailsWidget({
            id: 'media-format',
            name: 'Формат видео и звука',
            order: 20,
            deferUntilReady: true,
            render: (context) => {
                const page = context && context.page;
                const item = page && page._item;
                if (!item || !['Movie', 'Episode', 'Video'].includes(item.Type)) return null;

                const mediaSource = item.MediaSources?.find((source) =>
                    source.Id === page._selectedMediaSourceId
                ) || item.MediaSources?.[0] || item;
                const streams = mediaSource.MediaStreams || item.MediaStreams || [];
                const video = firstStream(streams, 'Video');
                const audio = firstStream(streams, 'Audio');

                const labels = uniqueLabels([
                    resolutionLabel(video),
                    hdrLabel(video),
                    video && video.Codec ? String(video.Codec).toUpperCase() : '',
                    audioLabel(audio)
                ]);
                if (!labels.length) return null;

                const root = document.createElement('section');
                root.className = 'enhanced-media-format';

                const title = document.createElement('h3');
                title.textContent = 'Качество и звук';

                const values = document.createElement('div');
                values.className = 'enhanced-media-format__values';

                labels.forEach((label) => {
                    const chip = document.createElement('span');
                    chip.className = 'enhanced-media-format__chip';
                    chip.textContent = label;
                    values.appendChild(chip);
                });

                root.appendChild(title);
                root.appendChild(values);
                return root;
            }
        });
    }
};
