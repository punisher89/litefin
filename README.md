# Litefin — webOS 6 Normal, r13 (rollback)

[Download ready-to-install r13 IPK](https://github.com/punisher89/litefin/raw/refs/heads/builds/achievement-badges-webos6-normal/Litefin-2.0.300-webOS-Normal-r13.ipk)

- App ID: `org.litefin.app`
- Internal version: `2.0.300`; build revision: `r13`
- Target: webOS 6 Normal / Chromium 79
- Source: [`103f69f1593abcbf02f912ea30b76621b6bb39ec`](https://github.com/punisher89/litefin/commit/103f69f1593abcbf02f912ea30b76621b6bb39ec)
- Changes: [PR #4](https://github.com/punisher89/litefin/pull/4)

The r12 experiment is reverted at the user's request. The complete source tree
matches r11 (25f1923), verified by identical Git tree hashes. Original web movie
overlays, their metadata requests, renderer code, fonts and notices are removed.

Home returns to server-native images. Episodes in Continue Watching retain the
working annotated Primary path; wide movie Thumb/native support remains limited.
This rollback does NOT fix the missing movie metadata where an annotated wide
image is unavailable or unsupported. Horizontal card frames remain unchanged.
No server/plugin changes are included or required for the rollback.

Existing achievements, translations, notification test, awards, actor ages,
release dates and Discover TMDB scores are retained.

Validation: all 1,148 Node tests, ESLint and webOS Normal packaging passed.
The extracted IPK was checked for native-image settings and absence of the
experimental movie web-tag code, requests and assets. The restored source tree
was previously exercised in Chromium 79; physical LG/user-server testing was
not performed in this environment.

MIT AchievementBadges and Apache Material Icons notices are included.
SHA-256 hashes are in `SHA256SUMS`; previous r1–r12 packages are retained.
