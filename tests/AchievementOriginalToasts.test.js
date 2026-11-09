import assert from 'node:assert/strict';
import test from 'node:test';

class Element {
    constructor(tag) {
        this.tagName = tag;
        this.children = [];
        this.style = { setProperty: (name, value) => { this._style[name] = value; } };
        this._style = {};
        this.classList = { add: () => {} };
        this.dataset = {};
        this.isConnected = false;
        this._text = '';
    }
    appendChild(child) {
        this.children.push(child);
        child.isConnected = true;
        return child;
    }
    set textContent(value) {
        this._text = value;
        this.children = [];
    }
    get textContent() {
        return this._text + this.children.map(c => c.textContent || '').join('');
    }
    set innerHTML(html) { this._html = html; }
    get innerHTML() { return this._html || ''; }
    setAttribute() {}
    getBoundingClientRect() { return { left: 100, top: 100, width: 450, height: 90 }; }
}

globalThis.window = { matchMedia: () => ({ matches: true }) };
globalThis.document = {
    createElement: tag => new Element(tag),
    createTextNode: text => ({ textContent: text }),
    head: new Element('head'),
    body: new Element('body')
};

const { AchievementCornerToasts } = await import('../src/utils/AchievementCornerToasts.js');

test('original-style toast follows per-user preference over server default', () => {
    const toasts = new AchievementCornerToasts();
    toasts.configure('user-1', { ToastPosition: 'bottom-center', EnableSound: false },
        { DefaultToastPosition: 'top-right' });
    toasts.showBadge({ Id:'cinema', Icon:'movie', Rarity:'Legendary', Title:'Cinema master', ScorePoints:100 }, 'en');
    try {
        assert.equal(toasts._position, 'bottom-center');
        assert.equal(toasts._container.dataset.position, 'bottom-center');
        assert.equal(toasts._container.children[0].className, 'ab-xb');
        const orb = toasts._container.children[0].children[0];
        assert.match(orb.innerHTML, /achievement-icon-svg/);
        assert.match(toasts._container.textContent, /100/);
        assert.match(toasts._container.textContent, /Cinema master/);
    } finally {
        toasts.clear();
    }
});

test('invalid positions use plugin server default; grouping makes one summary toast', () => {
    const t = new AchievementCornerToasts();
    t.configure('user-2', {
        ToastPosition:'not-a-place', UnlockToastGrouping:'grouped', EnableSound:false
    }, {DefaultToastPosition:'top-left'});
    t.showBatch([
        {Id:'a', Title:'First', Rarity:'Common'},
        {Id:'b', Title:'Second', Rarity:'Rare'}
    ],'en');
    try {
        assert.equal(t._container.dataset.position,'top-left');
        assert.match(t._container.textContent, /2 achievements/);
        assert.match(t._container.textContent, /First/);
        assert.match(t._container.textContent, /Second/);
    } finally {
        t.clear();
    }
});

test('individual mode queues distinct achievements and milestone toasts', () => {
    const t = new AchievementCornerToasts();
    t.configure('user-3', {UnlockToastGrouping:'individual',EnableSound:false}, {});
    t.showBatch([{Id:'a', Title:'One'}, {Id:'b', Title:'Two'}],'en');
    t.showMilestone(75,'en');
    try {
        assert.equal(t._active,true);
        assert.equal(t._queue.length,2);
        assert.match(t._container.textContent,/One/);
        assert.equal(t._queue[1].type,'milestone');
        t.clear();
        assert.equal(t._queue.length,0);
        assert.equal(t._active,false);
    } finally {
        t.clear();
    }
});

test('invalid milestone does not enqueue toast', () => {
    const t = new AchievementCornerToasts();
    t.showMilestone(NaN,'en');
    assert.equal(t._queue.length,0);
    assert.equal(t._active,false);
});
