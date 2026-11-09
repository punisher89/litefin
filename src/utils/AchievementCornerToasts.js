/**
 * AchievementBadges unlock toast: TV-safe adaptation of the original plugin's
 * Xbox-like trophy orb, expanding rarity banner, score, description and queue.
 * It reads the same user preferences and positions. It never inserts remote HTML.
 */
import { renderAchievementIcon } from './AchievementIcons.js';

const VALID_PLACEMENTS = ['top-right','top-center','top-left','bottom-right','bottom-center','bottom-left'];
const COLORS = Object.freeze({
    common:['#7a95ad','#b0c6d8'], uncommon:['#28a77a','#4cd9a4'],
    rare:['#4080d4','#7ab3ff'], epic:['#8a6ee0','#b8a0ff'],
    legendary:['#d49a10','#ffd048'], mythic:['#b82e45','#f05672']
});
const POINTS = { common:10, uncommon:20, rare:35, epic:60, legendary:100, mythic:150 };

function isReducedMotion() {
    try {
        return !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    } catch (_) { return false; }
}

export class AchievementCornerToasts {
    constructor() {
        this._container = null;
        this._style = null;
        this._queue = [];
        this._timer = null;
        this._active = false;
        this._user = null;
        this._position = 'top-right';
        this._prefs = {};
        this._playing = false;
        this._language = 'en';
        this._tokens = [];
    }

    configure(userId, preferences = {}, publicConfig = {}) {
        if (this._user !== userId) {
            this.clear();
            this._user = userId;
        }
        this._prefs = preferences || {};
        const preferred = String(preferences.ToastPosition || '').trim().toLowerCase();
        const fallback = String(publicConfig.DefaultToastPosition || 'top-right').trim().toLowerCase();
        this._position = VALID_PLACEMENTS.includes(preferred) ? preferred :
            VALID_PLACEMENTS.includes(fallback) ? fallback : 'top-right';
        if (this._container) this._container.dataset.position = this._position;
    }

    setPlaybackPlaying(playing) { this._playing = !!playing; }

    clear() {
        clearTimeout(this._timer);
        this._timer = null;
        this._queue = [];
        this._active = false;
        this._tokens.forEach(clearTimeout);
        this._tokens = [];
        if (this._container) this._container.textContent = '';
    }

    _mount() {
        if (this._container?.isConnected) return;
        if (!this._style) {
            this._style = document.createElement('style');
            this._style.textContent = `
                #litefin-ab-corner{position:fixed!important;top:4.5em;right:1.2em;bottom:auto;left:auto;
                  z-index:2147483000!important;display:flex;flex-direction:column;gap:12px;pointer-events:none;
                  max-width:calc(100vw - 30px);align-items:flex-end;font-family:Arial,sans-serif;}
                #litefin-ab-corner[data-position="top-left"]{left:1.2em;right:auto;top:4.5em;bottom:auto;align-items:flex-start;}
                #litefin-ab-corner[data-position="top-center"]{left:50%;right:auto;top:4.5em;bottom:auto;transform:translateX(-50%);align-items:center;}
                #litefin-ab-corner[data-position="bottom-right"]{right:1.2em;left:auto;top:auto;bottom:1.2em;align-items:flex-end;}
                #litefin-ab-corner[data-position="bottom-left"]{left:1.2em;right:auto;top:auto;bottom:1.2em;align-items:flex-start;}
                #litefin-ab-corner[data-position="bottom-center"]{left:50%;right:auto;top:auto;bottom:1.2em;transform:translateX(-50%);align-items:center;}
                #litefin-ab-corner .ab-xb{display:flex;align-items:center;gap:0;box-sizing:border-box;min-height:90px;
                  max-width:calc(100vw - 42px);width:450px;color:#fff;line-height:1.3;filter:drop-shadow(0 12px 30px #000b);
                  transform:translateX(45px) scale(.93);opacity:0;transition:transform .4s ease-out,opacity .4s ease-out;}
                #litefin-ab-corner .ab-xb.is-visible{transform:translateX(0) scale(1);opacity:1;}
                #litefin-ab-corner .ab-xb-orb{height:92px;width:92px;min-width:92px;box-sizing:border-box;z-index:2;
                  position:relative;display:flex;align-items:center;justify-content:center;border-radius:50%;
                  border:5px solid var(--ab-light,#ffd048);background:radial-gradient(circle at 34% 25%,#4c455d,#11141f 75%);
                  box-shadow:0 0 0 4px #10131c,0 0 27px var(--ab-base,#ffd048),inset 0 0 19px #000b;
                  animation:ab-orb-pulse 2s ease-in-out 2;}
                #litefin-ab-corner .ab-xb-orb svg{width:48px;height:48px;color:var(--ab-light,#ffd048);filter:drop-shadow(0 0 9px var(--ab-base));}
                #litefin-ab-corner .ab-xb-banner{position:relative;min-height:77px;flex:1;min-width:0;
                  margin-left:-9px;padding:12px 17px 12px 22px;box-sizing:border-box;
                  border-radius:0 17px 17px 0;border:2px solid var(--ab-base,#ffd048);border-left:0;
                  background:linear-gradient(105deg,var(--ab-base,#ffd048) -140%,#272431 36%,#171922 100%);
                  overflow:hidden;box-shadow:inset 0 0 20px #0007;}
                #litefin-ab-corner .ab-xb-banner:before{content:"";position:absolute;left:-65%;top:0;width:40%;height:100%;
                  background:linear-gradient(90deg,transparent,rgba(255,255,255,.16),transparent);transform:skewX(-15deg);}
                #litefin-ab-corner .ab-xb.is-visible .ab-xb-banner:before{animation:ab-banner-shine 2.3s ease-out 1;}
                #litefin-ab-corner .ab-xb-heading{font-weight:800;letter-spacing:1.4px;font-size:12px;
                  text-transform:uppercase;color:var(--ab-light,#ffd048);}
                #litefin-ab-corner .ab-xb-name{font-size:20px;font-weight:800;overflow-wrap:anywhere;margin-top:4px;}
                #litefin-ab-corner .ab-xb-score{display:inline-block;color:#ffd978;font-size:16px;font-weight:800;margin-right:7px;}
                #litefin-ab-corner .ab-xb-desc{font-size:13px;color:#c8c5d0;margin-top:4px;overflow-wrap:anywhere;}
                #litefin-ab-corner .ab-xb-milestone .ab-xb-orb{border-color:#ffd048;}
                #litefin-ab-corner .ab-xb-milestone .ab-xb-banner{border-color:#ffd048;}
                #litefin-ab-corner .ab-ab-confetti{position:fixed;z-index:2147482999;pointer-events:none;
                    width:7px;height:12px;animation:ab-confetti-fall .9s ease-out both;}
                @keyframes ab-banner-shine{from{left:-65%}to{left:140%}}
                @keyframes ab-orb-pulse{0%,100%{box-shadow:0 0 0 4px #10131c,0 0 24px var(--ab-base)}50%{box-shadow:0 0 0 4px #10131c,0 0 45px var(--ab-light)}}
                @keyframes ab-confetti-fall{from{opacity:1;transform:translate(0,0) rotate(0deg)}
                  to{opacity:0;transform:translate(var(--dx),var(--dy)) rotate(310deg)}}
                @media(prefers-reduced-motion:reduce){#litefin-ab-corner .ab-xb,
                  #litefin-ab-corner .ab-xb-orb,#litefin-ab-corner .ab-xb-banner:before{animation:none!important;transition:none!important;}}
            `;
            document.head.appendChild(this._style);
        }
        this._container = document.createElement('div');
        this._container.id = 'litefin-ab-corner';
        this._container.dataset.position = this._position;
        this._container.setAttribute('aria-live', 'polite');
        this._container.setAttribute('aria-atomic', 'true');
        document.body.appendChild(this._container);
    }

    _lang(language) { return String(language || 'en').toLowerCase().startsWith('ru') ? 'ru' : 'en'; }

    showBadge(badge, language = 'en') {
        if (!badge) return;
        const rarity = String(badge.Rarity || 'common').toLowerCase();
        const rare = !['common','uncommon'].includes(rarity);
        this._enqueue({
            type:'badge', badge, rarity,
            heading:this._lang(language) === 'ru'
                ? (rare ? 'Редкое достижение получено' : 'Достижение получено')
                : (rare ? 'Rare achievement unlocked' : 'Achievement unlocked'),
            title:String(badge.Title || badge.Key || 'Achievement'),
            detail:String(badge.Description || ''),
            points:Number(badge.ScorePoints ?? POINTS[rarity] ?? 10),
            language
        });
    }

    showBatch(badges, language = 'en') {
        const eligible = (Array.isArray(badges) ? badges : []).filter(Boolean);
        if (!eligible.length) return;
        const grouping = String(this._prefs.UnlockToastGrouping || 'grouped').toLowerCase();
        if (grouping === 'individual' || eligible.length === 1) {
            eligible.slice(0, 16).forEach(b => this.showBadge(b, language));
            return;
        }
        const ranked = { common:0,uncommon:1,rare:2,epic:3,legendary:4,mythic:5 };
        const top = eligible.reduce((a,b) => (ranked[String(b.Rarity||'common').toLowerCase()] || 0) >
            (ranked[String(a.Rarity||'common').toLowerCase()] || 0) ? b : a);
        const ru = this._lang(language) === 'ru';
        this._enqueue({
            type:'badge',badge:top, rarity:String(top.Rarity || 'common').toLowerCase(),
            heading:ru ? 'Получены достижения' : 'Achievements unlocked',
            title:String(eligible.length) + (ru ? ' новых достижений' : ' achievements'),
            detail:eligible.slice(0,3).map(b => b.Title || b.Key || '').join(' · ') +
                (eligible.length > 3 ? ' +' + (eligible.length - 3) : ''),
            points:eligible.reduce((sum,b) => sum + (Number(b.ScorePoints) || POINTS[String(b.Rarity||'common').toLowerCase()] || 10),0),
            language
        });
    }

    showMilestone(percent, language = 'en') {
        const n = Number(percent);
        if (!Number.isFinite(n) || n < 0 || n > 100) return;
        const ru = this._lang(language) === 'ru';
        this._enqueue({
            type:'milestone',rarity:'legendary',
            heading:ru ? 'Новый рубеж!' : 'Milestone reached',
            title:n + '% ' + (ru ? 'достижений' : 'complete'),
            detail:ru ? 'Вы открыли новый уровень прогресса' : 'Your achievement progress reached a milestone',
            points:0, language
        });
    }

    showMessage(count, language='en') {
        const ru = this._lang(language) === 'ru';
        this._enqueue({
            type:'message',rarity:'epic',heading:ru ? 'Сообщения' : 'Messages',
            title:ru ? (count === 1 ? 'Новое сообщение' : 'Новых сообщений: '+count)
                : (count === 1 ? 'New message' : 'New messages: '+count),
            detail:'',points:0,language
        });
    }

    _enqueue(payload) {
        if (this._queue.length >= 20) this._queue.shift();
        this._queue.push(payload);
        if (!this._active) this._next();
    }

    _playSound(rare) {
        if (this._prefs.EnableSound === false) return;
        if (this._playing && this._prefs.MuteToastSoundDuringPlayback !== false) return;
        try {
            const Context = window.AudioContext || window.webkitAudioContext;
            if (!Context) return;
            const ctx = new Context();
            const now = ctx.currentTime;
            const tones = rare ? [659.26, 880, 1174.66] : [523.25, 783.99];
            tones.forEach((freq,i) => {
                const oscillator = ctx.createOscillator();
                const gain = ctx.createGain();
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(freq, now+i*.105);
                gain.gain.setValueAtTime(.0001, now+i*.105);
                gain.gain.exponentialRampToValueAtTime(.055, now+i*.105+.03);
                gain.gain.exponentialRampToValueAtTime(.0001, now+i*.105+.22);
                oscillator.connect(gain);
                gain.connect(ctx.destination);
                oscillator.start(now+i*.105);
                oscillator.stop(now+i*.105+.24);
            });
            const t=setTimeout(() => ctx.close().catch(() => {}), 900);
            this._tokens.push(t);
        } catch (_) { /* autoplay policies can prohibit audio */ }
    }

    _confetti() {
        if (isReducedMotion() || this._prefs.EnableConfetti === false || this._playing) return;
        const container = this._container;
        if (!container) return;
        const bounds = container.getBoundingClientRect();
        const centerX = bounds.left + bounds.width / 2;
        const centerY = bounds.top + bounds.height / 2;
        const colors = ['#f8cc43','#b68aff','#f873aa','#67d6ff','#6ce0ad'];
        for (let i=0; i<22; i++) {
            const node = document.createElement('span');
            node.className='ab-ab-confetti';
            node.style.left=centerX+'px';
            node.style.top=centerY+'px';
            node.style.backgroundColor=colors[i%colors.length];
            node.style.setProperty('--dx', ((i*47)%340-170)+'px');
            node.style.setProperty('--dy', ((i*71)%230-70)+'px');
            document.body.appendChild(node);
            this._tokens.push(setTimeout(() => node.remove(), 1000));
        }
    }

    _next() {
        if (!this._queue.length) {
            this._active=false;
            if (this._container) this._container.textContent='';
            return;
        }
        this._mount();
        this._active=true;
        const data=this._queue.shift();
        const palette=COLORS[data.rarity] || COLORS.common;
        const root=document.createElement('div');
        root.className='ab-xb' + (data.type === 'milestone' ? ' ab-xb-milestone' : '');
        root.style.setProperty('--ab-base',palette[0]);
        root.style.setProperty('--ab-light',palette[1]);
        const orb=document.createElement('div');
        orb.className='ab-xb-orb';
        if(data.type==='badge'){
            orb.innerHTML=renderAchievementIcon(data.badge?.Icon,data.badge);
        }else{
            orb.textContent=data.type==='milestone'?'🏆':'✉';
            orb.style.fontSize='39px';
        }
        const banner=document.createElement('div');
        banner.className='ab-xb-banner';
        const heading=document.createElement('div');
        heading.className='ab-xb-heading';
        heading.textContent=data.heading;
        const title=document.createElement('div');
        title.className='ab-xb-name';
        if(data.points){
            const pts=document.createElement('span');
            pts.className='ab-xb-score';
            pts.textContent='✦ '+data.points+' —';
            title.appendChild(pts);
        }
        title.appendChild(document.createTextNode(data.title));
        const detail=document.createElement('div');
        detail.className='ab-xb-desc';
        detail.textContent=data.detail;
        banner.appendChild(heading);
        banner.appendChild(title);
        banner.appendChild(detail);
        root.appendChild(orb);
        root.appendChild(banner);
        this._container.textContent='';
        this._container.appendChild(root);
        if(typeof requestAnimationFrame === 'function') requestAnimationFrame(() => root.classList.add('is-visible'));
        else root.classList.add('is-visible');
        this._playSound(data.type==='milestone'||['rare','epic','legendary','mythic'].includes(data.rarity));
        if(data.type==='milestone'||['rare','epic','legendary','mythic'].includes(data.rarity)) this._confetti();
        this._timer=setTimeout(() => {
            this._timer=null;
            this._active=false;
            this._next();
        },11000);
    }
}

export const achievementCornerToasts = new AchievementCornerToasts();
