/* eslint-disable */
// Adapted from Jellyfin-Enhanced, GPL-3.0; see NOTICE.md.
export default function buildTagStyles(styles) {
    // Values come from the server already validated as rgba() colours; this is
    // a second guard so nothing but a colour can ever reach the stylesheet.
    const COLOUR = /^rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*[\d.]+\s*\)$/;
    const decl = (prop, value) => (value && COLOUR.test(value) ? `${prop}: ${value} !important;` : '');
    const attr = (value) => String(value).replace(/["\\]/g, '\\$&');

    function box(c, withBorder) {
        return decl('background-color', c.background) + decl('color', c.color) + (withBorder ? decl('border-color', c.border) : '');
    }

    function buildCss(styles) {
        const rules = [];
        for (const [label, c] of Object.entries(styles.quality || {})) {
            rules.push(`.quality-overlay-container.quality-overlay-container .quality-overlay-label[data-quality="${attr(label)}"] { ${decl('background', c.background)}${decl('color', c.color)}${decl('border-color', c.border)} }`);
        }
        for (const [rating, c] of Object.entries(styles.age || {})) {
            rules.push(`.age-rating-overlay-container .age-rating-tag[rating="${attr(rating)}"] { ${box(c, true)} }`);
        }
        const chips = styles.rating || {};
        if (chips.community) {
            rules.push(`.rating-overlay-container .rating-tag.rating-tag-tmdb { ${box(chips.community, false)} }`);
            rules.push(`.rating-overlay-container .rating-tag.rating-tag-tmdb .rating-star-icon { ${decl('color', chips.community.color)} }`);
        }
        if (chips.critic) {
            rules.push(`.rating-overlay-container .rating-tag.rating-tag-critic { ${box(chips.critic, false)} }`);
        }
        if (styles.genre) {
            rules.push(`.genre-overlay-container .genre-tag { ${box(styles.genre, true)} }`);
        }
        return rules.join('\n');
    }


 return buildCss(styles);
}
