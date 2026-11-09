import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.__APP_VERSION__ = '2.0.150';
globalThis.window = { location: { hash: '#/achievements', origin: 'http://localhost' } };
globalThis.localStorage = {
    getItem: () => null, setItem: () => {}, removeItem: () => {}
};
globalThis.document = {
    addEventListener: () => {},
    removeEventListener: () => {},
    documentElement: { lang:'ru',getAttribute:()=>null,setAttribute:()=>{} },
    querySelector:()=>null, querySelectorAll:()=>[]
};

const { AchievementsAdvanced } = await import('../src/pages/AchievementsAdvanced.js');

function makePanel() {
    const page = {
        _language:'ru',
        _serverTranslations:{'tabs.settings':'Настройки сервера'},
        _data:{
            summary:{Score:12500},
            badges:[{Id:'movie-fan',Icon:'movie',Title:'Киноман',Unlocked:true}]
        },
        $:()=>null,
        _registerExtraFocus:()=>{},
        el:{isConnected:true}
    };
    return new AchievementsAdvanced(page);
}

const fulfilled = value => ({status:'fulfilled',value});

test('all extended achievement sections render server-derived data without browser chart libraries', () => {
    const p = makePanel();
    p._data.stats = [
        fulfilled({TotalWatches:21,HoursWatched:37}),
        fulfilled([{Category:'Movies',Percentage:45}]),
        fulfilled({BestCombo:6}),fulfilled({Days:[]}),
        fulfilled({}),fulfilled({LifetimeScore:14000})
    ];
    const stats = p._renderStats();
    assert.match(stats,/21/);
    assert.match(stats,/Movies/);
    assert.match(stats,/45%/);

    p._data.activity={Entries:[{UserName:'Alex',BadgeTitle:'Movie badge',UnlockedAt:'2026-02-02T11:00:00Z'}],Page:1,TotalPages:1};
    assert.match(p._renderActivity(),/Movie badge/);

    p._data.showcase=[fulfilled([{Id:'movie-fan',Icon:'movie',Title:'Киноман'}]),fulfilled([])];
    assert.match(p._renderShowcase(),/Киноман/);

    p._data.prestige=[fulfilled({PrestigeLevel:2,LifetimeScore:15000}),fulfilled([])];
    assert.match(p._renderPrestige(),/15/);
});

test('preferences respect plugin opt-in and default-off playback mute values', () => {
    const p=makePanel();
    p._preferences={MuteToastsDuringPlayback:false,EnableUnlockToasts:true,ToastPosition:'top-right'};
    p._data.settings=[fulfilled(p._preferences),fulfilled({DefaultToastPosition:'top-left'})];
    const html=p._renderSettings();
    assert.match(html,/Настройки сервера/);
    assert.match(html,/data-pref="MuteToastsDuringPlayback"/);
    assert.match(html,/data-pref="ToastPosition"/);
    assert.match(html,/data-pref="UnlockToastGrouping"/);
    assert.match(html,/data-pref="Language"/);
    assert.match(html,/data-pref="UnlockToastDeviceScope"/);
    assert.match(html,/data-ach-advanced="test-toast"/);
});

test('user-created content is escaped on activity and statistics panels', () => {
    const p=makePanel();
    p._data.activity={Entries:[{UserName:'<script>bad()</script>',Title:'<bad>'}]};
    const html=p._renderActivity();
    assert.doesNotMatch(html,/<script>|<bad>/);
    assert.match(html,/&lt;script&gt;/);
});
