import quality from '../plugins/jellyfin-enhanced-web/quality.js';
import genre from '../plugins/jellyfin-enhanced-web/genre.js';
import language from '../plugins/jellyfin-enhanced-web/language.js';
import age from '../plugins/jellyfin-enhanced-web/agerating.js';
import rating from '../plugins/jellyfin-enhanced-web/rating.js';
import mediaLanguage from '../plugins/jellyfin-enhanced-web/media-language.js';
import mdblist from '../plugins/jellyfin-enhanced-web/mdblist.js';
import tagStyles from '../plugins/jellyfin-enhanced-web/tag-styles.js';
import ratingColours from '../plugins/jellyfin-enhanced-web/rating-colours.js';
import { resolveMovieWebTagSettings, tagSetting } from './MovieWebTagSettings.js';
import { api } from '../api/index.js';
import { escapeHtml } from './Utils.js';
import { logger } from './Logger.js';
import { shouldShowScore } from './visibility.js';

const log = logger.create('EnhancedWebTags');
const factories = { quality, genre, language, age, rating };
const camel = (object) =>
    Object.fromEntries(Object.entries(object || {}).map(([k, v]) => [k[0].toLowerCase() + k.slice(1), v]));
const pascal = (object) =>
    Object.fromEntries(Object.entries(object || {}).map(([k, v]) => [k[0].toUpperCase() + k.slice(1), v]));

/** Prefix every ordinary rule, including rules nested in media queries. */
export function scopeWebTagCss(css) {
    return css.replace(
        /(^|[{}])(\s*)([^{}@]+)\{/g,
        (all, boundary, space, selectors) =>
            boundary +
            space +
            selectors
                .split(',')
                .map((s) => '.lf-movie-web-tags ' + s.trim())
                .join(', ') +
            ' {'
    );
}

/** Owns settings/API adaptation only; detection, badge DOM and colors are upstream. */
export default class EnhancedWebTagRenderer {
    constructor(config, user) {
        this.policy = resolveMovieWebTagSettings(config, user, 'Movie');
        this.JE = {
            pluginConfig: {
                ...pascal(config),
                ...Object.fromEntries(Object.entries(pascal(user)).filter(([, v]) => v != null))
            },
            currentSettings: {
                ...camel(config),
                ...Object.fromEntries(Object.entries(camel(user)).filter(([, v]) => v != null))
            },
            detectCardRowSurface: () => 'continueWatching',
            escapeHtml,
            t: (key, args) => (args?.count ? String(args.count) : key),
            core: {},
            cdn: {
                url: (source, file) => `${api.serverUrl}/JellyfinEnhanced/cdn/${source}/${encodeURIComponent(file)}`,
                flagSvg: (code) =>
                    `${api.serverUrl}/JellyfinEnhanced/cdn/flag-icons/flags/4x3/${encodeURIComponent(code)}.svg`
            },
            // Poster labels must never become extra remote-navigation targets.
            helpers: {
                createExternalLink: (url, options) => {
                    const el = document.createElement('span');
                    el.className = options.className;
                    el.title = options.title;
                    options.setup?.(el);
                    return el;
                }
            }
        };
        this.JE.core.tagRenderer = {
            resolvePosition: (userKey, pluginKey, fallback) => {
                const pos = tagSetting(user, userKey) ?? tagSetting(config, pluginKey) ?? fallback;
                const isTop = pos.includes('top'),
                    isLeft = pos.includes('left');
                return {
                    pos,
                    isTop,
                    isLeft,
                    topVal: isTop ? '6px' : 'auto',
                    bottomVal: isTop ? 'auto' : '6px',
                    leftVal: isLeft ? '6px' : 'auto',
                    rightVal: isLeft ? 'auto' : '6px',
                    needsTopRightOffset: isTop && !isLeft
                };
            }
        };
        const ApiClient = {
            getCurrentUserId: () => api.userId,
            getUser: () =>
                api.get('/Users/' + encodeURIComponent(api.userId), null, { suppressUnauthorized: true, timeout: 5000 })
        };
        const env = {
            document,
            window: { ApiClient },
            ApiClient,
            console: { log: (...v) => log.debug(...v), warn: (...v) => log.warn(...v) },
            Intl: {
                DisplayNames:
                    typeof Intl.DisplayNames === 'function'
                        ? Intl.DisplayNames
                        : class {
                              of(code) {
                                  return String(code).toUpperCase();
                              }
                          }
            }
        };
        if (Array.isArray(this.JE.pluginConfig.LanguageTagsPriority))
            this.JE.pluginConfig.LanguageTagsPriority = this.JE.pluginConfig.LanguageTagsPriority.join(',');
        mediaLanguage(this.JE);
        this.renderers = Object.fromEntries(
            Object.entries(factories).map(([id, factory]) => [id, factory(this.JE, env)])
        );
        this.buildRatings = mdblist(this.JE, document);
        this.styleReady = api
            .get('/JellyfinEnhanced/tag-styles', null, { suppressUnauthorized: true, timeout: 5000 })
            .then((styles) => scopeWebTagCss(tagStyles(styles || {})))
            .catch(() => '');
        this.ready = Promise.all(Object.values(this.renderers).map((r) => r.ready?.()));
        this.css =
            Object.values(this.renderers)
                .map((r) => scopeWebTagCss(r.spec.buildCss()))
                .join('\n') + scopeWebTagCss(this.renderers.age.colours(ratingColours));
    }

    render(root, item, mdbEntry) {
        const policy = this.policy;
        const corners = new Map();
        for (const id of policy.order) {
            const group = policy.groups[id];
            if (!group.enabled || (id === 'rating' && !shouldShowScore(item))) continue;
            let stack = corners.get(group.position);
            if (!stack) {
                stack = document.createElement('div');
                stack.className = 'lf-web-tag-corner';
                stack.dataset.corner = group.position;
                root.appendChild(stack);
                corners.set(group.position, stack);
            }
            const { spec } = this.renderers[id];
            const ctx = {
                taggedAttr: spec.taggedAttr,
                hot: new Map(),
                cacheTtl: 0,
                shouldIgnore: () => false,
                isTagged: () => false,
                markTagged: () => {},
                getPersistent: () => null,
                setPersistent: () => {},
                removeExistingOverlay: () => {},
                commitOverlay: (el, overlay) => {
                    if (group.cap > 0) while (overlay.children.length > group.cap) overlay.lastElementChild.remove();
                    overlay.style.position = 'static';
                    stack.appendChild(overlay);
                }
            };
            if (id === 'rating' && mdbEntry?.Found && mdbEntry.Ratings?.length) {
                const configured = policy.ratingSources;
                const aliases = {
                    rtCritic: 'tomatoes',
                    rtAudience: 'popcorn',
                    rtcritic: 'tomatoes',
                    rtaudience: 'popcorn'
                };
                const allowed = Array.isArray(configured) ? configured.map((s) => aliases[s] || s) : null;
                const rows = mdbEntry.Ratings.filter(
                    (r) => !allowed || allowed.includes(String(r.Source).toLowerCase())
                );
                const overlay = this.buildRatings({ ...mdbEntry, Ratings: rows }, 'movie', item.Name);
                overlay.classList.add('lf-web-mdb-ratings');
                if (overlay.children.length) ctx.commitOverlay(root, overlay);
            } else {
                spec.pipeline.render(ctx, root, item, {});
                if (id === 'rating') {
                    // Legacy community/critic switches remain meaningful without MDBList.
                    const sources = policy.ratingSources;
                    if (Array.isArray(sources)) {
                        if (!sources.includes('community') && !sources.includes('tmdb'))
                            root.querySelectorAll('.rating-tag-tmdb').forEach((el) => el.remove());
                        if (!sources.some((source) => ['critic', 'rtcritic', 'rtCritic', 'tomatoes'].includes(source)))
                            root.querySelectorAll('.rating-tag-critic').forEach((el) => el.remove());
                    }
                }
            }
        }
        // Upstream renderers position their host relatively; this host covers existing artwork.
        root.style.position = 'absolute';
    }
}
