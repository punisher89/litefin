/* eslint-disable */
// Adapted from n00bcodr/Jellyfin-Enhanced, GPL-3.0; see NOTICE.md and LICENSE.
// Original renderer body; factory wrapper replaces global setup and lifecycle hooks.
export default function createMdblistRenderer(JE, document) {
 const sectionClass = "je-mdblist-ratings-section";
        const escapeHtml = (typeof JE.escapeHtml === 'function') ? JE.escapeHtml : (v) => String(v);

        // Safe fallback for helpers.js load-order races (same pattern letterboxd-links.js uses).
        const extLink = JE.helpers?.createExternalLink || ((url, o = {}) => {
            const a = document.createElement('a');
            a.setAttribute('is', 'emby-linkbutton');
            a.href = url;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            if (o.title) a.title = o.title;
            if (o.className) a.className = o.className;
            if (o.text) a.textContent = o.text;
            if (o.resetStyle) a.style.cssText = 'padding:0;background:none;border-radius:0;min-width:0;';
            if (typeof o.setup === 'function') o.setup(a);
            return a;
        });

        // Friendly labels for MDBList's raw source keys. Sources not listed
        // here still render, using the raw key as a fallback label.
        const LABELS = {
            master: 'Master', imdb: 'IMDb', tmdb: 'TMDB', trakt: 'Trakt',
            letterboxd: 'Letterboxd', tomatoes: 'RT Critic', popcorn: 'RT Audience',
            metacritic: 'Metascore', metacriticuser: 'Metacritic User',
            rogerebert: 'Roger Ebert', myanimelist: 'MAL', anilist: 'AniList',
        };

        // Logo filenames served via the "mdblist-logos" CDN source (see CdnAssetService.cs).
        // Sources with no logo here fall back to text-only.
        const LOGOS = {
            master: 'master.png', imdb: 'imdb.png', tmdb: 'tmdb.png', trakt: 'trakt.png',
            letterboxd: 'letterboxd.png', tomatoes: 'rottentomatoes.png', popcorn: 'rottentomatoes_audience.png',
            metacritic: 'metacritic.png', metacriticuser: 'metacritic_audience.png',
            rogerebert: 'rogerebert.png', myanimelist: 'myanimelist.png', anilist: 'anilist.png',
        };

        // Only 'tomatoes' (RT Critic) gets a Fresh/Rotten status from MDBList (r.Fresh).
        // When present, swaps the plain logo for the matching splat, vendored from
        // jellyfin-web's own fresh.svg/rotten.svg.
        const TOMATOES_STATUS_LOGOS = { 1: 'rottentomatoes_fresh.png', 0: 'rottentomatoes_rotten.png' };

        // Default display order when the admin hasn't configured one: the
        // handful of sources most people care about first, anything else
        // in whatever order the API returned it.
        const DEFAULT_ORDER = ['tmdb', 'tomatoes', 'popcorn', 'imdb', 'trakt', 'metacritic'];

        const localSlug = (t) => (t || '').toLowerCase().replace(/'/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

        /**
         * Direct link to a rating's source site, ported from xroguel1ke/jellyfin_ratings'
         * generateLink(). tmdb/imdb/trakt/anilist/myanimelist use the item's
         * cross-provider ids (MdblistCacheEntry.Ids); letterboxd/tomatoes/popcorn/
         * rogerebert use the per-source url MDBList returns (MdblistRatingSource.Url)
         * when it looks usable; metacritic is constructed from the title since
         * MDBList doesn't provide a slug for it. Returns null (render as plain
         * text, not a link) when no usable target exists for that source.
         * @param {string} sourceKey
         * @param {Object} ids - entry.Ids from the server (imdb/tmdb/trakt/mal/anilist/...)
         * @param {string|null|undefined} apiUrl - this rating's Url field, if any
         * @param {string} mediaType - 'movie' or 'tv'
         * @param {string} title
         * @returns {string|null}
         */
        function generateLink(sourceKey, ids, apiUrl, mediaType, title) {
            const sLink = String(apiUrl || '');
            const safeTitle = encodeURIComponent(title || '');
            const safeType = mediaType === 'tv' ? 'tv' : 'movie';
            if (sLink.startsWith('http') && sourceKey !== 'metacriticuser' && sourceKey !== 'rogerebert') return sLink;

            switch (sourceKey) {
                case 'imdb': return ids.imdb ? `https://www.imdb.com/title/${ids.imdb}/` : null;
                case 'tmdb': return ids.tmdb ? `https://www.themoviedb.org/${safeType}/${ids.tmdb}` : null;
                case 'trakt': return ids.trakt ? `https://trakt.tv/${safeType === 'tv' ? 'shows' : 'movies'}/${ids.trakt}` : null;
                case 'letterboxd': return (sLink.includes('/film/') || sLink.includes('/slug/')) ? `https://letterboxd.com${sLink.startsWith('/') ? '' : '/'}${sLink}` : null;
                case 'metacritic':
                case 'metacriticuser': return title ? `https://www.metacritic.com/${safeType}/${localSlug(title)}` : null;
                case 'tomatoes':
                case 'popcorn':
                    if (sLink.startsWith('/')) return `https://www.rottentomatoes.com${sLink}`;
                    return sLink.length > 2 ? `https://www.rottentomatoes.com/m/${sLink}` : null;
                case 'anilist': return ids.anilist ? `https://anilist.co/anime/${ids.anilist}` : (title ? `https://anilist.co/search/anime?search=${safeTitle}` : null);
                case 'myanimelist': return ids.mal ? `https://myanimelist.net/anime/${ids.mal}` : (title ? `https://myanimelist.net/anime.php?q=${safeTitle}` : null);
                case 'rogerebert': return sLink.length > 2 ? `https://www.rogerebert.com/reviews/${sLink}` : (title ? `https://duckduckgo.com/?q=!ducky+site:rogerebert.com/reviews+${safeTitle}` : null);
                default: return null; // e.g. "master" (MDBList's own aggregate) has no source site to link to
            }
        }

        /**
         * Admin-configured source list (MdblistRatingsSources, config page):
         * comma-separated source keys. Empty = show every source MDBList has
         * data for, in DEFAULT_ORDER. Non-empty = show ONLY the listed
         * sources, in exactly that order.
         * @returns {Array<string>}
         */
        function getConfiguredSources() {
            const raw = JE.pluginConfig?.MdblistRatingsSources || '';
            return raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
        }

        function buildSection(entry, mediaType, title) {
            const wrap = document.createElement('div');
            wrap.className = sectionClass;

            const configuredSources = getConfiguredSources();
            const order = configuredSources.length ? configuredSources : DEFAULT_ORDER;

            const rows = (entry.Ratings || [])
                .filter(r => (r.Score !== null && r.Score !== undefined) || (r.Value !== null && r.Value !== undefined))
                .filter(r => configuredSources.length === 0 || configuredSources.includes((r.Source || '').toLowerCase()))
                .sort((a, b) => {
                    const ai = order.indexOf((a.Source || '').toLowerCase());
                    const bi = order.indexOf((b.Source || '').toLowerCase());
                    return (ai === -1 ? order.length : ai) - (bi === -1 ? order.length : bi);
                });

            const showPercent = !!JE.pluginConfig?.MdblistRatingsShowPercentSymbol;

            rows.forEach(r => {
                // r.Score is MDBList's own 0-100 figure, present only when that
                // source is scored (rogerebert never gets one). Falling back to
                // r.Value is fine, but "%" only makes sense on a true 0-100 Score.
                const hasNormalizedScore = r.Score !== null && r.Score !== undefined;
                const score = hasNormalizedScore ? r.Score : r.Value;
                const sourceKey = (r.Source || '').toLowerCase();
                const label = LABELS[sourceKey] || r.Source;
                // MDBList's fresh flag can contradict the score; RT rule: >= 60 is Fresh.
                const freshState = hasNormalizedScore ? (r.Score >= 60 ? 1 : 0) : r.Fresh;
                const freshLogo = sourceKey === 'tomatoes' ? TOMATOES_STATUS_LOGOS[freshState] : null;
                const logo = freshLogo || LOGOS[sourceKey];
                const link = generateLink(sourceKey, entry.Ids || {}, r.Url, mediaType, title);

                const votesText = r.Votes ? ` (${JE.t('mdblist_ratings_votes', { count: r.Votes })})` : '';
                const badgeTitle = `${label}: ${score}${votesText}`;
                const iconHtml = logo
                    ? `<img class="je-mdblist-logo" src="${JE.cdn.url('mdblist-logos', logo)}" alt="${escapeHtml(label)}" loading="lazy">`
                    : `<span class="je-mdblist-source">${escapeHtml(label)}</span>`;
                // Only round a true 0-100 Score (already whole numbers, so this
                // is a no-op). A raw fallback Value keeps its precision, e.g.
                // rogerebert's 3.5 stays 3.5, not 4.
                const scoreText = hasNormalizedScore
                    ? Math.round(score) + (showPercent ? '%' : '')
                    : String(score);
                const badgeHtml = `${iconHtml}<span>${scoreText}</span>`;

                // is="emby-linkbutton" (via createExternalLink) tells the native
                // app shell to open externally instead of the in-app WebView.
                // resetStyle strips the emby-button chrome so it renders as our
                // own flat badge, not a boxed button.
                const badge = link
                    ? extLink(link, {
                        className: 'je-mdblist-badge',
                        title: badgeTitle,
                        resetStyle: true,
                        setup: (a) => { a.innerHTML = badgeHtml; },
                    })
                    : Object.assign(document.createElement('span'), {
                        className: 'je-mdblist-badge',
                        title: badgeTitle,
                        innerHTML: badgeHtml,
                    });
                wrap.appendChild(badge);
            });

            return wrap;
        }


 return buildSection;
}
