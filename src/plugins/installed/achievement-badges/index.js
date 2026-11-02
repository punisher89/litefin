/**
 * Native, D-pad friendly summary for the full Litefin Achievement Badges page.
 * The server remains authoritative for progress, scores, purchases and unlocks.
 */
import './achievement-badges.css';

const TTL=120000;
const ICONS={military_tech:'🏅',emoji_events:'🏆',movie:'🎬',tv:'📺',play_circle:'▶️',star:'⭐',music_note:'🎵',headphones:'🎧',menu_book:'📚',local_fire_department:'🔥',workspace_premium:'🏆'};
const asArray=v=>Array.isArray(v)?v:(v&&Array.isArray(v.Items)?v.Items:[]);
const field=(o,k,d)=>{if(!o)return d;for(const key of k)if(o[key]!=null)return o[key];return d;};
const title=b=>String(field(b,['Title','title','Key','key','Id'],'Значок'));
const glyph=b=>ICONS[String(field(b,['Icon','icon'],'')).toLowerCase()]||'🏅';

export default {
 id:'achievement-badges',name:'Achievement Badges',version:'1.1.0',
 description:'Открывает нативный центр достижений с коллекцией значков, заданиями и наградами.',
 serverDependency:'achievement-badges',defaultEnabled:true,
 _data:{equipped:[],recent:[],summary:null,rank:null},_lastFetched:0,_loading:null,_scope:null,_mountedWrapper:null,
 init(api){
  this.api=api;this._mountedWrapper=null;
  api.addHomeWidget({id:'achievement-summary',name:'Achievement Badges',order:20,
   focusOptions:{orientation:'vertical',leaveLeft:'sidebar'},
   render:()=>this._createHomeWidget(api),
   onMount:wrapper=>{this._mountedWrapper=wrapper;void this._refresh(api);},
   onUnmount:()=>{this._mountedWrapper=null;}
  });
 },
 _scopeKey(api){const user=api.getCurrentUserId();return user?String(api.serverUrl||'')+'|'+user:null;},
 async _refresh(api){
  const user=api.getCurrentUserId(),scope=this._scopeKey(api);if(!user||!scope)return null;
  if(this._loading&&this._loading.scope===scope)return this._loading.promise;
  if(this._scope!==scope){this._data={equipped:[],recent:[],summary:null,rank:null};this._scope=scope;this._lastFetched=0;this._render();}
  if(Date.now()-this._lastFetched<TTL){this._render();return this._data;}
  const base='/Plugins/AchievementBadges/users/'+encodeURIComponent(user),request={scope,promise:null};
  request.promise=(async()=>{
   try{
    const result=await Promise.all([
     api.serverPlugins.call(base+'/equipped?lang=ru'),
     api.serverPlugins.call(base+'/recent-unlocks?limit=3'),
     api.serverPlugins.call(base+'/summary'),
     api.serverPlugins.call(base+'/rank')
    ]);
    if(this._loading!==request||this._scopeKey(api)!==scope)return null;
    this._data={equipped:asArray(result[0]),recent:asArray(result[1]),summary:result[2],rank:result[3]};
    this._lastFetched=Date.now();this._render();return this._data;
   }catch(err){api.log.warn('Achievement Badges request failed:',err&&err.message);return null;}
   finally{if(this._loading===request)this._loading=null;}
  })();
  this._loading=request;return request.promise;
 },
 _createHomeWidget(api){
  const root=document.createElement('section');root.className='achievement-summary-widget';
  const head=document.createElement('div');head.className='achievement-summary-widget__head';
  const titleEl=document.createElement('h2');titleEl.textContent='Достижения';
  const rank=document.createElement('span');rank.className='achievement-summary-widget__rank';rank.textContent='Загрузка ранга…';
  head.appendChild(titleEl);head.appendChild(rank);
  const summary=document.createElement('p');summary.className='achievement-summary-widget__summary';summary.textContent='Загружаем коллекцию…';
  const badges=document.createElement('div');badges.className='achievement-summary-widget__badges';
  const action=document.createElement('button');action.type='button';action.className='focusable achievement-summary-widget__action';action.tabIndex=0;action.textContent='Открыть все достижения →';
  action.addEventListener('click',()=>api.navigate('/achievements'));
  root.appendChild(head);root.appendChild(summary);root.appendChild(badges);root.appendChild(action);return root;
 },
 _render(){
  const root=this._mountedWrapper;if(!root||!root.isConnected)return;
  const summary=root.querySelector('.achievement-summary-widget__summary'),rank=root.querySelector('.achievement-summary-widget__rank'),badges=root.querySelector('.achievement-summary-widget__badges');
  if(!summary||!rank||!badges)return;
  const s=this._data.summary||{},r=this._data.rank||{},tier=field(r,['Tier','tier'],{})||{};
  rank.textContent=String(field(tier,['Name','name'],'Ранг не определён'));
  summary.textContent='★ '+field(r,['Score','score'],field(s,['Score','score'],0))+' очков · '+field(s,['Unlocked','unlocked'],0)+' / '+field(s,['Total','total'],0)+' значков открыто · 🔥 '+field(s,['CurrentWatchStreak','currentWatchStreak'],0);
  badges.textContent='';
  const items=(this._data.equipped.length?this._data.equipped:this._data.recent).slice(0,5);
  if(!items.length){const empty=document.createElement('span');empty.className='achievement-summary-widget__empty';empty.textContent='Начни собирать свою коллекцию';badges.appendChild(empty);return;}
  items.forEach(b=>{const chip=document.createElement('span');chip.className='achievement-summary-widget__badge';const ico=document.createElement('span');ico.className='achievement-summary-widget__badge-icon';ico.textContent=glyph(b);const label=document.createElement('span');label.textContent=title(b);chip.appendChild(ico);chip.appendChild(label);badges.appendChild(chip);});
 },
 destroy(){this._mountedWrapper=null;this._loading=null;}
};
