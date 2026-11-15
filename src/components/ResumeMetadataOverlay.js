import Component from '../core/Component.js';
import { api } from '../api/index.js';
import { customHeaders } from '../utils/CustomHeaders.js';
import { detailsIcons } from '../utils/Icons.js';
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
    constructor(card, item, data) {
        super({ container: card.querySelector('.card-image') });
        this.mount();
        this._active = true;
        this.el.classList.toggle('resume-metadata-episode-offset', Boolean(card.querySelector('.episode-badge')));
        this._session = `${api.serverUrl}|${api.userId}`;
        const metadata = resumeMetadata(data, shouldShowScore(item));
        const left = this.el.querySelector('.resume-metadata-quality');
        metadata.quality.forEach(({ kind, label }) => {
            const chip = document.createElement('span');
            chip.className = 'resume-metadata-chip resume-meta-' + kind;
            chip.textContent = label;
            chip.dataset.paletteLabel = qualityPaletteLabel(label);
            left.appendChild(chip);
        });
        const right = this.el.querySelector('.resume-metadata-ratings');
        if (metadata.certification) {
            const chip = document.createElement('span');
            chip.className = 'resume-metadata-chip resume-meta-certification';
            chip.dataset.certification = metadata.certification.replace(/^(US|RU)[- ]/i, '');
            chip.textContent = metadata.certification;
            right.appendChild(chip);
        }
        metadata.ratings.forEach(({ source, label, value }) => {
            const chip = document.createElement('span');
            chip.className = 'resume-metadata-chip resume-meta-rating';
            chip.dataset.ratingSource = source;
            chip.title = `${label} ${value}`;
            chip.setAttribute('aria-label', chip.title);
            const icon = document.createElement('span');
            icon.className = 'resume-rating-logo';
            icon.setAttribute('aria-hidden', 'true');
            const file = ratingLogoFile(source, value);
            if (file) {
                const img = document.createElement('img');
                img.alt = '';
                // Card artwork rules position every nested img absolutely; source logos are inline badges.
                img.style.cssText =
                    'position:static;display:block;width:14px;height:14px;min-width:0;min-height:0;max-width:100%;max-height:100%;object-fit:contain;opacity:1;transform:none;transition:none;border-radius:0;filter:none';
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
        this._applyPalette();
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
        return '<div class="resume-metadata-overlay"><div class="resume-metadata-quality"></div><div class="resume-metadata-ratings"></div></div>';
    }

    destroy() {
        this._active = false;
        this.el?.querySelectorAll('img').forEach((img) => {
            img.onerror = null;
        });
        super.destroy();
    }
}
