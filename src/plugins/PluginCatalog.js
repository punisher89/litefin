/**
 * Awesome Jellyfin compatibility catalog and Litefin-side presentation settings.
 */
export const AWESOME_JELLYFIN_CATALOG = Object.freeze([
 {id:'achievement-badges',adapterId:'achievement-badges',name:'Achievement Badges',category:'Достижения',status:'native-adapter',statusLabel:'Полноценная нативная страница',
  summary:'Отдельная страница: ранг, коллекция значков и иконки, прогресс, экипировка, задания, магазин, косметика и статистика.',
  source:'https://github.com/ZL154/AchievementBadges_for_Jellyfin',
  settings:[
   {key:'showLocked',label:'Показывать закрытые значки',type:'toggle',default:'true'},
   {key:'showDescriptions',label:'Показывать описания значков',type:'toggle',default:'true'},
   {key:'showRecent',label:'Показывать недавние открытия',type:'toggle',default:'true'},
   {key:'hideSpoilers',label:'Скрывать названия секретных достижений',type:'toggle',default:'false'},
   {key:'badgeColumns',label:'Колонок в коллекции',type:'select',default:'5',options:[['3','3'],['4','4'],['5','5'],['6','6']]}
  ]},
 {id:'mdblist-ratings',adapterId:'mdblist-ratings',name:'MDBList Ratings',category:'Рейтинги и метаданные',status:'supported',statusLabel:'Нативная интеграция',
  summary:'Рейтинги, награды и дополнительные метки из MDBList Server Plugin.',source:'https://github.com/Druidblack/Jellyfin.Plugin.MDBList_Ratings',
  settings:[{key:'showAwards',label:'Показывать награды MDBList',type:'toggle',default:'true'},{key:'showRatings',label:'Показывать рейтинги на странице фильма',type:'toggle',default:'true'}]},
 {id:'actor-plus',adapterId:'actor-plus',name:'ActorPlus',category:'Актёры и персоны',status:'native-adapter',statusLabel:'Нативная адаптация',
  summary:'Блок известных работ и ролей в нативном профиле актёра Litefin.',source:'https://github.com/Druidblack/Jellyfin.Plugin.ActorPlus',
  settings:[{key:'showRoles',label:'Показывать список ролей',type:'toggle',default:'true'},{key:'worksCount',label:'Количество известных работ',type:'select',default:'3',options:[['3','3'],['5','5'],['8','8']]}]},
 {id:'jellyfin-featured',adapterId:'jellyfin-featured',name:'Jellyfin Featured',category:'Избранное на главной',status:'native-adapter',statusLabel:'Нативная интеграция',
  summary:'Персонализированная подборка /featured/items в собственной карусели Litefin.',source:'https://github.com/spkesDE/jellyfin-featured-plugin',
  settings:[{key:'itemLimit',label:'Количество карточек',type:'select',default:'8',options:[['4','4'],['6','6'],['8','8'],['10','10']]},{key:'showMetadata',label:'Показывать год и рейтинги',type:'toggle',default:'true'}]},
 {id:'jellyfin-enhanced',adapterId:'jellyfin-enhanced',name:'Jellyfin Enhanced',category:'Улучшения интерфейса',status:'native-adapter',statusLabel:'Частичная нативная адаптация',
  summary:'Формат видео и звука: разрешение, HDR, видеокодек и аудиоформат.',source:'https://github.com/n00bcodr/Jellyfin-Enhanced',
  settings:[{key:'showResolution',label:'Показывать разрешение',type:'toggle',default:'true'},{key:'showHdr',label:'Показывать HDR / Dolby Vision',type:'toggle',default:'true'},{key:'showVideoCodec',label:'Показывать видеокодек',type:'toggle',default:'true'},{key:'showAudio',label:'Показывать аудиоформат и каналы',type:'toggle',default:'true'}]}
]);
export function getAwesomeJellyfinEntry(id) { return AWESOME_JELLYFIN_CATALOG.find((entry) => entry.id === id) || null; }
