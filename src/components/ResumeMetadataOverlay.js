import Component from '../core/Component.js';
import { resumeMetadata } from '../utils/ResumeMetadata.js';
import { shouldShowScore } from '../utils/visibility.js';

/** Static labels over existing resume art. Owns no images, sizes or focus targets. */
export default class ResumeMetadataOverlay extends Component {
    constructor(card, item, data) {
        super({ container: card.querySelector('.card-image') });
        this.mount();
        const metadata = resumeMetadata(data, shouldShowScore(item));
        const left = this.el.querySelector('.resume-metadata-quality');
        metadata.quality.forEach(({ kind, label }) => {
            const chip = document.createElement('span');
            chip.className = 'resume-metadata-chip resume-meta-' + kind;
            chip.textContent = label;
            left.appendChild(chip);
        });
        const right = this.el.querySelector('.resume-metadata-ratings');
        if (metadata.certification) {
            const chip = document.createElement('span');
            chip.className = 'resume-metadata-chip resume-meta-certification';
            chip.textContent = metadata.certification;
            right.appendChild(chip);
        }
        metadata.ratings.forEach(({ label, value }) => {
            const chip = document.createElement('span');
            chip.className = 'resume-metadata-chip resume-meta-rating';
            chip.textContent = `${label} ${value}`;
            right.appendChild(chip);
        });
    }

    render() {
        return '<div class="resume-metadata-overlay"><div class="resume-metadata-quality"></div><div class="resume-metadata-ratings"></div></div>';
    }
}
