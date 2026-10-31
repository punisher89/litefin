import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const app = read('../src/core/App.js');
const sidebar = read('../src/components/Sidebar.js');
const api = read('../src/api/seerrClient.js');
const center = read('../src/pages/SeerrCenterPage.js');
const issueMenu = read('../src/player/osd/SeerrIssueMenu.js');
const osd = read('../src/player/osd/OSDController.js');
const notifications = read('../src/utils/SeerrNotificationService.js');
const workflow = read('../.github/workflows/feature-webos-build.yml');

test('Seerr Center is registered as a lazy route and available from the sidebar', () => {
    assert.ok(app.includes("router.register('/seerr-center', SeerrCenterPage)"));
    assert.ok(app.includes("import(/* webpackChunkName: \"seerr-center\" */ '../pages/SeerrCenterPage.js')"));
    assert.ok(sidebar.includes('id="sidebar-seerr-center"'));
    assert.ok(sidebar.includes("data-path=\"/seerr-center\""));
});

test('Seerr Center uses Seerr request APIs and the correct role permissions', () => {
    assert.ok(api.includes('async requestQueue('));
    assert.ok(api.includes("async requestCounts()"));
    assert.ok(api.includes("/request/count"));
    assert.ok(api.includes('async moderateRequest('));
    assert.ok(api.includes("/request/${encodeURIComponent(requestId)}/retry"));
    assert.ok(center.includes("this._canManageRequests = !!((permissions) & (2 | 16))") ||
        center.includes("this._canManageRequests = !!(permissions & (2 | 16))"));
    assert.ok(center.includes("data-center-action=\"request-approve\""));
    assert.ok(center.includes("data-center-action=\"request-decline\""));
    assert.ok(center.includes("data-center-action=\"request-cancel\""));
});

test('Seerr issues support create, comment, resolve and reopen flows', () => {
    assert.ok(api.includes('async createIssue('));
    assert.ok(api.includes("async createIssue({ mediaId, issueType, message, problemSeason = 0, problemEpisode = 0 })"));
    assert.ok(api.includes("return this._request('/Issues'"));
    assert.ok(api.includes('internalMediaId = Number(mediaId)'));
    assert.ok(api.includes('problemSeason: season'));
    assert.ok(api.includes('async commentIssue('));
    assert.ok(api.includes('/Comments'));

    assert.ok(api.includes("async updateIssueStatus(issueId, status)"));
    assert.ok(api.includes("['open', 'resolved']"));
    assert.ok(api.includes('/Status/${status}'));
    assert.ok(center.includes('data-center-select=\"issue-filter\"'));
    assert.ok(center.includes("data-issue-action=\"resolved\""));
    assert.ok(center.includes("data-issue-action=\"open\""));
});

test('Seerr Center uses a wide Seerr-style page and native issue controls', () => {
    const css = read('../src/styles/seerr-center.css');
    assert.ok(center.includes('id="seerr-center-title"'));
    assert.ok(center.includes('data-center-select="issue-filter"'));
    assert.ok(center.includes('data-center-select="issue-sort"'));
    assert.ok(center.includes('data-center-select="issue-page-size"'));
    assert.ok(center.includes('seerr-center-issue-backdrop'));
    assert.ok(center.includes('seerr-center-issue-poster'));
    assert.ok(center.includes('seerr-center-issue-side'));
    assert.ok(center.includes('async _loadIssueMediaDetails()'));
    assert.ok(css.includes('max-width: none;'));
    assert.ok(css.includes('.seerr-center-issue-card'));
});
test('Player OSD opens an authenticated Seerr issue report against the current media item', () => {
    assert.ok(osd.includes("data-action=\"reportIssue\""));
    assert.ok(osd.includes("case 'reportIssue':"));
    assert.ok(osd.includes('this.seerrIssueMenu = new SeerrIssueMenu(this)'));
    assert.ok(osd.includes("overlay.querySelectorAll('button, input[type=\"range\"], textarea, select')"));
    assert.ok(issueMenu.includes("seerr.createIssue({"));
    assert.ok(issueMenu.includes('(2 | 1048576 | 4194304)'));
    assert.ok(issueMenu.includes('SeerrIssueMessageRequired'));
});

test('Seerr notifications use low-frequency visible-app polling and persist per user', () => {
    assert.ok(notifications.includes('POLL_INTERVAL_MS = 120000'));
    assert.ok(notifications.includes("document.visibilityState !== 'hidden'"));
    assert.ok(notifications.includes('seerr.notificationSnapshot('));
    assert.ok(notifications.includes('markAllRead()'));
    assert.ok(sidebar.includes("seerrNotificationService.start()"));
    assert.ok(sidebar.includes('sidebar-seerr-center-unread'));
    assert.ok(center.includes('seerrNotificationService.markAllRead()'));
});

test('Smart Watchlist offers requestable, available, processing and upcoming filters', () => {
    assert.ok(center.includes("['requestable', tr('SeerrCenterRequestable'"));
    assert.ok(center.includes("this._watchlistSort === 'title'"));
    assert.ok(center.includes("data-center-action=\"watchlist-request\""));
    assert.ok(center.includes("SeerrRequestModal.js"));
    assert.ok(center.includes("data-center-action=\"watchlist-remove\""));
});

test('Feature workflow packages only the Normal webOS IPK', () => {
    assert.ok(workflow.includes('npm run package:webos-normal'));
    assert.ok(workflow.includes('Litefin-*-webOS-Normal.ipk'));
    assert.ok(!workflow.includes('package:webos-modern'));
});
