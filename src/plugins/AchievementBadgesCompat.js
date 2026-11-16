/** CSS fallbacks for the Chromium 79 engine in webOS 6. */

/** Convert numeric OKLCH literals to sRGB, clipping out-of-gamut channels. */
export function achievementLegacyCss(css) {
    return css
        .replace(
            /oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.-]+)(?:\s*\/\s*([\d.]+)(%?))?\s*\)/g,
            (match, lightness, percent, chroma, hue, alpha, alphaPercent) => {
                const l = Number(lightness) / (percent ? 100 : 1);
                const radians = (Number(hue) * Math.PI) / 180;
                const a = Number(chroma) * Math.cos(radians);
                const b = Number(chroma) * Math.sin(radians);
                const ll = Math.pow(l + 0.3963377774 * a + 0.2158037573 * b, 3);
                const mm = Math.pow(l - 0.1055613458 * a - 0.0638541728 * b, 3);
                const ss = Math.pow(l - 0.0894841775 * a - 1.291485548 * b, 3);
                const channel = (value) =>
                    Math.round(
                        255 *
                            Math.max(
                                0,
                                Math.min(
                                    1,
                                    value <= 0.0031308 ? 12.92 * value : 1.055 * Math.pow(value, 1 / 2.4) - 0.055
                                )
                            )
                    );
                const r = channel(4.0767416621 * ll - 3.3077115913 * mm + 0.2309699292 * ss);
                const g = channel(-1.2684380046 * ll + 2.6097574011 * mm - 0.3413193965 * ss);
                const blue = channel(-0.0041960863 * ll - 0.7034186147 * mm + 1.707614701 * ss);
                const opacity = alpha === undefined ? 1 : Number(alpha) / (alphaPercent ? 100 : 1);
                return `rgba(${r},${g},${blue},${opacity})`;
            }
        )
        .replace(/\binset\s*:\s*([^;{}]+)([;}])/g, (match, value, end) => {
            const important = /!important/.test(value) ? '!important' : '';
            const parts = value
                .replace(/!important/g, '')
                .trim()
                .split(/\s+/);
            if (parts.length > 4 || /\(/.test(value)) return match;
            return `top:${parts[0]}${important};right:${parts[1] || parts[0]}${important};bottom:${parts[2] || parts[0]}${important};left:${parts[3] || parts[1] || parts[0]}${important}${end}`;
        });
}

/**
 * Adapt styles generated after mount too (dialogs, friends and cosmetic previews).
 * The page bundles remain unmodified. Only engines lacking OKLCH need this path.
 */
export function installAchievementCompatibility(win, loadCss) {
    if (win.CSS && win.CSS.supports('color', 'oklch(50% 0.1 120)')) return () => {};
    const doc = win.document;
    let disposed = false;
    let revampCss = null;
    const patch = (node) => {
        if (node.nodeType !== 1) return;
        if (node.tagName === 'LINK' && node.id === 'abSaRevampCss') {
            const style = doc.createElement('style');
            style.id = node.id;
            node.parentNode.replaceChild(style, node);
            if (!revampCss) revampCss = loadCss(node.href);
            revampCss
                .then((css) => {
                    if (!disposed && style.parentNode) {
                        // Product fonts are optional; keep the TV system font offline.
                        style.textContent = achievementLegacyCss(css.replace(/@import\s+url\([^;]+;/g, ''));
                    }
                })
                .catch(() => {
                    if (style.parentNode) style.remove();
                });
        } else if (node.tagName === 'STYLE') {
            const original = node.textContent;
            const patched = achievementLegacyCss(original);
            if (patched !== original) node.textContent = patched;
        } else if (node.style && node.getAttribute('style') && node.getAttribute('style').indexOf('inset:') >= 0) {
            const original = node.getAttribute('style');
            const patched = achievementLegacyCss(original + ';');
            if (patched !== original + ';') node.setAttribute('style', patched);
        }
        node.querySelectorAll('style, link#abSaRevampCss, [style*="inset:"]').forEach(patch);
    };
    const observer = new MutationObserver((changes) =>
        changes.forEach((change) => {
            if (change.type === 'attributes') patch(change.target);
            else if (change.target.nodeType === 1 && change.target.tagName === 'STYLE') patch(change.target);
            else change.addedNodes.forEach(patch);
        })
    );
    observer.observe(doc.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style']
    });
    const spacing = doc.createElement('style');
    spacing.textContent = `
        .ab-tabs > *, .ab-filter-row > *, .ab-topbar > * { margin-right:8px!important; margin-bottom:8px!important; }
        .ab-footer button + button { margin-left:6px; }
        #abFriendsBackdrop,#abMsgConfirm,#abNewGroupOverlay,.ab-pc-backdrop,.ab-modal-backdrop { top:0;right:0;bottom:0;left:0; }
    `;
    doc.head.appendChild(spacing);
    return () => {
        disposed = true;
        observer.disconnect();
    };
}
