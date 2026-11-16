# Jellyfin-Enhanced web renderers

Adapted from https://github.com/n00bcodr/Jellyfin-Enhanced (local source snapshot
abf375637f96c287d671221849505272cf33ab74, punisher89 fork), licensed under GPL-3.0.
Original paths: js/tags/{quality,rating,genre,agerating,language}tags.js,
js/tags/tag-styles.js, js/core/media-language.js, js/others/mdblist-ratings.js and css/ratings.css.

Changes: isolated ES module factories; removed global registration, caches and
page watchers; exposed pure renderer specs and the MDBList buildSection function.
The host supplies document/API/settings and owns lifecycle, data and CSS scope.
Body logic and original badge CSS are retained. Intl.DisplayNames has a fallback
on webOS 6. The MDBList details-row renderer is presented as noninteractive poster
chips by the host. It retains its original 0–100 source-score formatting.

Source for these adaptations is shipped in the repository; no remote scripts
are downloaded or executed. LICENSE contains the original GPL-3.0 text.
The Material Symbols font is Apache-2.0, see existing third-party notices.
