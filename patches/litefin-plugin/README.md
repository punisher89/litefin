# Seerr issue proxy endpoints for the Jellyfin companion plugin

The Litefin web client now calls these authenticated routes on the Jellyfin companion plugin:

- `GET /Litefin/Seerr/Issues?take=&skip=&filter=&sort=`
- `GET /Litefin/Seerr/Issues/{issueId}`
- `POST /Litefin/Seerr/Issues`
- `POST /Litefin/Seerr/Issues/{issueId}/Comments`
- `POST /Litefin/Seerr/Issues/{issueId}/Status/{open|resolved}`

The companion plugin repository currently used by this project is `MoazSalem/litefin-plugin`, branch `release`. The linked GitHub connection has read-only permission on that repository, so the endpoint patch is included here for application to a writable checkout rather than silently claiming that the upstream plugin was changed.

## Apply the patch

In a local clone of `MoazSalem/litefin-plugin` on the `release` branch:

```bash
git checkout release
git pull
git apply /path/to/litefin/patches/litefin-plugin/SeerrIssues.patch
git diff --check
```

Build and install the resulting Jellyfin companion plugin, then restart Jellyfin. The patch scopes every upstream request to the Seerr account linked to the authenticated Jellyfin user via `X-Api-User`; ordinary users see only their own reports, while the Seerr permission model controls broader issue visibility and moderation.

**Important ID detail:** Seerr's `POST /api/v1/issue` expects the internal `Media.id` value (`mediaInfo.id` from `GET /api/v1/movie/:tmdbId` or `GET /api/v1/tv/:tmdbId`), not the TMDB identifier. Litefin resolves and sends that internal ID. Titles with no corresponding Seerr `mediaInfo` record are not reportable yet; the UI now explains this instead of submitting the wrong ID and receiving a misleading 404.
