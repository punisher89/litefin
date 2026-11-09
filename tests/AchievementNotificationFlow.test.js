import assert from 'node:assert/strict';
import test from 'node:test';

const map = new Map();
globalThis.__APP_VERSION__ = '2.0.150';
globalThis.window = {location:{hash:'#/home',origin:'http://localhost'}};
globalThis.document = {hidden:false,addEventListener:()=>{},removeEventListener:()=>{},
    documentElement:{lang:'en',getAttribute:()=>null,setAttribute:()=>{}}};
globalThis.localStorage = {
    getItem:(key)=>map.get(key)||null,
    setItem:(key,val)=>map.set(key,String(val)),
    removeItem:(key)=>map.delete(key),
    clear:()=>map.clear()
};

const { AchievementNotifications } = await import('../src/utils/AchievementNotifications.js');
const { achievementBadges } = await import('../src/api/AchievementBadgesClient.js');
const { achievementCornerToasts } = await import('../src/utils/AchievementCornerToasts.js');
const { auth } = await import('../src/api/AuthManager.js');
const { api } = await import('../src/api/ApiClient.js');

test('authenticated unlock poll triggers grouped corner toasts and milestone exactly once', async () => {
    const original = {};
    const objects = [
        [auth, ['isAuthenticated']],
        [api, ['isEmby']],
        [achievementBadges, ['getPreferences','getPublicConfig','getUiFeatures',
            'getUnlocksSince','checkMilestones','getUnreadCount']],
        [achievementCornerToasts, ['configure','showBatch','showMilestone']]
    ];
    for (const [object, keys] of objects)
        for (const key of keys) original[key] = [object, object[key]];
    const priorUserId = api._userId;
    const priorServer = api._serverUrl;
    const calls = [];
    auth.isAuthenticated = () => true;
    api.isEmby = () => false;
    api._userId = 'user-123';
    api._serverUrl = 'http://localhost';
    achievementBadges.getPreferences = async () => ({
        EnableUnlockToasts:true,EnableMilestoneToasts:true,EnableSound:false,
        MinimumToastRarity:'all',UnlockToastGrouping:'grouped'
    });
    achievementBadges.getPublicConfig = async () => ({DefaultToastPosition:'bottom-center'});
    achievementBadges.getUiFeatures = async () => ({EnableUnlockToasts:true,EnableMilestoneToasts:true});
    achievementBadges.getUnlocksSince = async (since) => {
        calls.push(['unlock-request', since]);
        return {Now:'2026-11-09T07:01:00Z',Badges:[
            {Id:'movie-a',Title:'First badge',Rarity:'Rare',UnlockedAt:'2026-11-09T07:00:00Z'},
            {Id:'movie-b',Title:'Second badge',Rarity:'Epic',UnlockedAt:'2026-11-09T07:00:01Z'}
        ]};
    };
    achievementBadges.checkMilestones = async () => ({NewlyReached:[25]});
    achievementBadges.getUnreadCount = async () => ({Count:0});
    achievementCornerToasts.configure = (...args) => calls.push(['configure',...args]);
    achievementCornerToasts.showBatch = (...args) => calls.push(['badges',...args]);
    achievementCornerToasts.showMilestone = (...args) => calls.push(['milestone',...args]);
    const watcher = new AchievementNotifications();
    watcher._started = true;
    watcher._enabled = true;
    watcher._user = api.userId;
    watcher._since = '2026-11-09T06:59:00Z';
    try {
        await watcher.check();
        assert.equal(calls.filter(x=>x[0]==='badges').length,1);
        assert.equal(calls.find(x=>x[0]==='badges')[1].length,2);
        assert.equal(calls.find(x=>x[0]==='milestone')[1],25);
        assert.equal(calls.find(x=>x[0]==='configure')[3].DefaultToastPosition,'bottom-center');

        // Replayed unlocks with identical IDs and timestamps are not shown twice.
        await watcher.check();
        assert.equal(calls.filter(x=>x[0]==='badges').length,1);
    } finally {
        watcher._started = false;
        // Restore original methods deterministically even for inherited ones.
        for (const [object,keys] of objects) for (const key of keys) {
            const entry=original[key];
            object[key]=entry[1];
        }
        api._userId = priorUserId;
        api._serverUrl = priorServer;
    }
});
