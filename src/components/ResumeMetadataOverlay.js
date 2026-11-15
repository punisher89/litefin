import Component from '../core/Component.js';
import { api } from '../api/index.js';
import { customHeaders } from '../utils/CustomHeaders.js';
import { detailsIcons } from '../utils/Icons.js';
import { resolveResumeSettings } from '../utils/ResumeMetadataSettings.js';
import { resumeMetadata } from '../utils/ResumeMetadata.js';
import { parseQualityPalette, qualityPaletteLabel, ratingLogoFile } from '../utils/ResumeMetadataAppearance.js';
import { shouldShowScore } from '../utils/visibility.js';

const cache = new Map();

function qualityPalette() {
    const key = api.serverUrl;
    let record = cache.get(key);
    if (!record || Date.now() - record.time > 3600000) {
        record = {
            time: Date.now(),
            promise: api
                .get('/JellyfinEnhanced/js/tags/qualitytags.js', null, { suppressUnauthorized: true, timeout: 5000 })
                .then(parseQualityPalette)
                .catch(() => new Map())
        };
        if (cache.size >= 10) cache.delete(cache.keys().next().value);
        cache.set(key, record);
    }
    return record.promise;
}

/** Native-looking server-sourced badges. Owns no poster images, sizes or focus targets. */
export default class ResumeMetadataOverlay extends Component {
    constructor(card, item, data, settings = resolveResumeSettings()) {
        super({ container: card.querySelector('.card-image') });
        this.mount();
        this._active = true;
        this.settings = settings;
        this.el.style.setProperty('--resume-tag-scale', String(settings.scale));
        this.el.style.setProperty('--resume-tag-gap', String(settings.gap));
        for (const group of settings.order) this._group(group);
        this.el.classList.toggle('resume-metadata-episode-offset', Boolean(card.querySelector('.episode-badge')));
        this._session = `${api.serverUrl}|${api.userId}`;
        const metadata = resumeMetadata(data, shouldShowScore(item), settings);
        const left = this._group('quality');
        metadata.quality.forEach(({ kind, label }) => {
            const chip = document.createElement('span');
            chip.className = 'resume-metadata-chip resume-meta-' + kind;
            chip.textContent = label;
            chip.dataset.paletteLabel = qualityPaletteLabel(label);
            left.appendChild(chip);
        });
        const right = this._group('rating');
        if (metadata.certification) {
            const chip = document.createElement('span');
            chip.className = 'resume-metadata-chip resume-meta-certification';
            chip.dataset.certification = metadata.certification.replace(/^(US|RU)[- ]/i, '');
            chip.textContent = metadata.certification;
            this._group('age').appendChild(chip);
        }
        metadata.ratings.forEach(({ source, label, value }) => {
            const chip = document.createElement('span');
            chip.className = 'resume-metadata-chip resume-meta-rating';
            chip.dataset.ratingSource = source;
            chip.title = `${label} ${value}`;
            chip.setAttribute('aria-label', chip.title);
            if (settings.colorByScore) {
                const raw = parseFloat(value);
                const maximum =
                    value.includes('%') || source === 'metacritic'
                        ? 100
                        : source === 'letterboxd'
                          ? 5
                          : source === 'rogerEbert'
                            ? 4
                            : 10;
                const score = (raw * 10) / maximum;
                const mix = Math.max(0, Math.min(1, (score - 5) / 2.5));
                chip.style.color =
                    score < 5
                        ? '#ef5350'
                        : `rgb(${Math.round(255 - 153 * mix)}, ${Math.round(179 + 8 * mix)}, ${Math.round(106 * mix)})`;
            }
            const icon = document.createElement('span');
            icon.className = 'resume-rating-logo';
            icon.setAttribute('aria-hidden', 'true');
            const file = ratingLogoFile(source, value);
            if (file) {
                const img = document.createElement('img');
                img.alt = '';
                // Card artwork rules position every nested img absolutely; source logos are inline badges.
                const size = 14 * settings.scale;
                img.style.cssText = `position:static;display:block;width:${size}px;height:${size}px;min-width:0;min-height:0;max-width:100%;max-height:100%;object-fit:contain;opacity:1;transform:none;transition:none;border-radius:0;filter:none`;
                const url = api.buildUrl('/JellyfinEnhanced/cdn/mdblist-logos/' + file);
                img.src = url;
                img.onerror = () => {
                    img.remove();
                    icon.textContent = label;
                    icon.classList.add('resume-logo-fallback');
                };
                icon.appendChild(img);
                // Use the app's proxy-header image path when configured.
                if (customHeaders.hasCustomHeaders())
                    customHeaders
                        .resolveImageUrl(url)
                        .then((resolved) => {
                            if (this._valid() && icon.contains(img)) img.src = resolved;
                        })
                        .catch(() => {});
            } else {
                icon.innerHTML = detailsIcons.ratingStar;
            }
            const number = document.createElement('span');
            number.className = 'resume-rating-value';
            number.textContent = value;
            chip.appendChild(icon);
            chip.appendChild(number);
            right.appendChild(chip);
        });
        for (const genre of metadata.genres) {
            const chip = document.createElement('span');
            chip.className = 'resume-metadata-chip resume-meta-genre';
            chip.textContent = genre;
            this._group('genre').appendChild(chip);
        }
        for (const language of metadata.languages) {
            const chip = document.createElement('span');
            chip.className = 'resume-metadata-chip resume-meta-language';
            chip.title = language.code;
            if (settings.languageStyle !== 'codes' && /^[A-Z]{2}$/.test(language.country)) {
                const img = document.createElement('img');
                img.alt = language.code.toUpperCase();
                img.style.cssText = `position:static;display:block;width:${20 * settings.scale}px;height:${14 * settings.scale}px;opacity:1;object-fit:contain;transform:none;transition:none;border-radius:0`;
                const url = api.buildUrl(
                    '/JellyfinEnhanced/cdn/flag-icons/flags/4x3/' + language.country.toLowerCase() + '.svg'
                );
                img.src = url;
                img.onerror = () => {
                    img.remove();
                    chip.textContent = language.code.toUpperCase();
                };
                if (customHeaders.hasCustomHeaders())
                    customHeaders
                        .resolveImageUrl(url)
                        .then((resolved) => {
                            if (this._valid() && chip.contains(img)) img.src = resolved;
                        })
                        .catch(() => {});
                chip.appendChild(img);
            } else chip.textContent = language.code.toUpperCase();
            this._group('language').appendChild(chip);
        }
        if (metadata.quality.length) this._applyPalette();
    }

    _group(name) {
        let group = this.el.querySelector('[data-resume-group="' + name + '"]');
        if (group) return group;
        const suffix = { quality: 'quality', rating: 'ratings', age: 'age', genre: 'genres', language: 'languages' }[
            name
        ];
        group = document.createElement('div');
        group.className = 'resume-metadata-group resume-metadata-' + suffix;
        group.dataset.resumeGroup = name;
        const position = this.settings.groups[name].position;
        this.el.querySelector('[data-resume-corner="' + position + '"]').appendChild(group);
        return group;
    }

    _valid() {
        return this._active && this.el && this._session === `${api.serverUrl}|${api.userId}`;
    }

    async _applyPalette() {
        const colors = await qualityPalette();
        if (!this._valid()) return;
        this.el.querySelectorAll('[data-palette-label]').forEach((chip) => {
            const style = colors.get(chip.dataset.paletteLabel);
            if (style) {
                chip.style.backgroundColor = style.background;
                chip.style.color = style.color;
            }
        });
    }

    render() {
        return (
            '<div class="resume-metadata-overlay">' +
            ['top-left', 'top-right', 'bottom-left', 'bottom-right']
                .map((corner) => '<div class="resume-metadata-corner" data-resume-corner="' + corner + '"></div>')
                .join('') +
            '</div>'
        );
    }

    destroy() {
        this._active = false;
        this.el?.querySelectorAll('img').forEach((img) => {
            img.onerror = null;
        });
        super.destroy();
    }
}
