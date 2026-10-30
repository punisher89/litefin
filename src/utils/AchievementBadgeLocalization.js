/**
 * Russian localization for the stock Achievement Badges catalog.
 *
 * The upstream plugin does not currently ship a Russian badge catalog and
 * falls back to English for ?lang=ru. Keep this client-side map keyed by the
 * stable badge IDs returned by the plugin. Unknown/custom badge text remains
 * untouched rather than being guessed.
 */

const RUSSIAN_TITLES = {
    "first-contact": "Первое знакомство",
    "media-explorer": "Исследователь медиа",
    "getting-comfortable": "Осваиваемся",
    "settling-in": "Обживаемся",
    "jellyfin-resident": "Житель Jellyfin",
    "binge-novice": "Новичок марафонов",
    "binge-starter": "Начинающий марафонец",
    "binge-enjoyer": "Любитель марафонов",
    "binge-addict": "Марафонец со стажем",
    "binge-titan": "Титан марафонов",
    "binge-overlord": "Повелитель марафонов",
    "binge-deity": "Божество марафонов",
    "film-curious": "Любознательный киноман",
    "film-fan": "Киноман",
    "film-enthusiast": "Энтузиаст кино",
    "film-buff": "Знаток кино",
    "film-connoisseur": "Ценитель кино",
    "cinema-historian": "Историк кино",
    "series-starter": "Начало сериального пути",
    "series-devotee": "Преданный зритель сериалов",
    "series-veteran": "Ветеран сериалов",
    "series-archivist": "Архивариус сериалов",
    "series-master": "Мастер сериалов",
    "night-owl": "Ночная сова",
    "midnight-wanderer": "Полуночный странник",
    "insomniac": "Бессонница",
    "creature-of-the-night": "Ночное существо",
    "early-bird": "Ранняя пташка",
    "morning-regular": "Утренний гость",
    "sunrise-viewer": "Встречающий рассвет",
    "weekend-warrior": "Герой выходного дня",
    "weekend-regular": "Завсегдатай выходных",
    "weekend-champion": "Чемпион выходных",
    "weekend-legend": "Легенда выходных",
    "explorer": "Исследователь",
    "collector": "Коллекционер",
    "archivist": "Архивариус",
    "daily-viewer": "Ежедневный зритель",
    "routine-viewer": "Привычка к просмотру",
    "jellyfin-loyalist": "Верный Jellyfin",
    "consistent-watcher": "Постоянный зритель",
    "routine-machine": "Машина привычек",
    "unbroken": "Без перерыва",
    "warmup": "Разминка",
    "cliffhanger-victim": "Жертва клиффхэнгера",
    "episode-marathon": "Марафон серий",
    "season-sprint": "Спринт сезона",
    "double-feature": "Двойной сеанс",
    "cinema-day": "День кино",
    "movie-marathon": "Киномарафон",
    "film-festival": "Кинофестиваль",
    "season-devourer": "Поглотитель сезонов",
    "all-nighter": "Всю ночь напролёт",
    "half-century-films": "Полсотни фильмов",
    "millennium": "Тысячник",
    "three-am-club": "Клуб трёх утра",
    "dawn-patrol": "Дозор рассвета",
    "saturday-night-fever": "Лихорадка субботнего вечера",
    "momentum": "Разгон",
    "fortnight": "Две недели",
    "marathon-man": "Марафонец",
    "time-traveller-novice": "Путешественник во времени",
    "time-traveller": "Прыжок по эпохам",
    "epoch-explorer": "Исследователь эпох",
    "globetrotter": "Гражданин мира",
    "world-tour": "Мировое турне",
    "un-delegate": "Делегат ООН",
    "bilingual": "Двуязычный",
    "polyglot": "Полиглот",
    "genre-curious": "Любитель жанров",
    "genre-hopper": "Покоритель жанров",
    "genre-master": "Мастер жанров",
    "epic-runtime": "Эпический хронометраж",
    "saga-runtime": "Длинная сага",
    "short-attention-span": "Короткое внимание",
    "ten-hours": "Десять часов",
    "hundred-hours": "Сто часов",
    "five-hundred-hours": "Клуб 500 часов",
    "thousand-hours": "Тысяча часов",
    "christmas-cheer": "Рождественское настроение",
    "new-years-marathon": "Новогодний марафон",
    "halloween-horror": "Ночь Хэллоуина",
    "eid-mubarak": "Ид Мубарак",
    "completionist-plus": "Завершитель+",
    "seen-it-all": "Повидал всё",
    "rewatcher": "Пересмотр",
    "serial-rewatcher": "Любитель пересмотров",
    "library-explorer": "Исследователь библиотеки",
    "library-quarter": "Четверть пройдена",
    "library-half": "Полпути",
    "library-three-quarter": "Три четверти",
    "library-complete": "Библиотека на 100%",
    "login-streak-week": "Постоянный посетитель",
    "login-streak-month": "Ежемесячный гость",
    "login-streak-year": "Преданный пользователь",
    "login-current-week": "Каждый день здесь",
    "director-fan": "Поклонник режиссёра",
    "director-enthusiast": "Ценитель режиссуры",
    "auteur-disciple": "Ученик автора",
    "actor-fan": "Поклонник актёра",
    "actor-superfan": "Суперфан актёра",
    "actor-stan": "Главный фанат актёра",
    "hidden-night-shift": "Ночная смена",
    "hidden-obsessed": "Одержимый пересмотром",
    "hidden-speedrunner": "Скоростной просмотр",
    "hidden-polyglot": "Настоящий полиглот",
    "hidden-completionist": "Абсолютный завершитель",
    "hidden-loyal": "Всегда на связи",
    "genre-horror": "Знаток ужасов",
    "genre-comedy": "Король комедии",
    "genre-drama": "Ценитель драмы",
    "genre-action": "Герой боевиков",
    "genre-scifi": "Знаток фантастики",
    "genre-animation": "Любитель анимации",
    "genre-documentary": "Документалист",
    "genre-crime": "Криминальный архивариус",
    "genre-romance": "Романтический пересмотр",
    "genre-thriller": "Любитель триллеров",
    "genre-fantasy": "Фэнтези навсегда",
    "streak-200": "Непобедимый",
    "streak-365": "Год без перерыва",
    "streak-500": "Невероятный",
    "late-graveyard": "Кладбищенская смена",
    "late-vampire": "Вампир",
    "rewatch-serial": "Серийный пересмотрщик",
    "rewatch-comfort": "Зона комфорта",
    "time-2k": "Две тысячи часов",
    "time-5k": "Пять тысяч часов",
    "days-year-rounder": "Круглогодичный зритель",
    "prestige-1": "Первое престижное звание",
    "prestige-3": "Тройная корона",
    "prestige-5": "Пятикратный престиж",
    "prestige-10": "Легенда легенд",
    "prestige-15": "Элитный престиж",
    "prestige-25": "Икона престижа",
    "prestige-50": "Бог престижа",
    "score-500k": "Полмиллиона очков",
    "score-1m": "Миллион очков",
    "morning-ritual-100": "Утренний ритуал",
    "morning-ritual-500": "Страж рассвета",
    "combo-master-15": "Мастер комбо",
    "combo-master-30": "Бог комбо",
    "lib-complete-1": "Одна библиотека покорена",
    "lib-complete-3": "Тройной завершитель",
    "badges-50pct": "Коллекционер значков",
    "badges-75pct": "Собиратель значков",
    "director-devotee-50": "Преданный поклонник режиссёра",
    "director-devotee-100": "Знаток кинорежиссуры",
    "decade-60s": "Ребёнок 60-х",
    "decade-70s": "Поклонник 70-х",
    "decade-80s": "Дитя 80-х",
    "decade-90s": "Ностальгия по 90-м",
    "decade-00s": "Человек эпохи Y2K",
    "decade-10s": "Эпоха стриминга",
    "decade-20s": "Современность",
    "dow-monday": "Мотивация понедельника",
    "dow-tuesday": "Традиция вторника",
    "dow-wednesday": "Воин среды",
    "dow-thursday": "Четверговый азарт",
    "dow-friday": "Пятничный кинопросмотр",
    "dow-saturday": "Субботний сеанс",
    "dow-sunday": "Ленивое воскресенье",
    "binge-marathon-300": "Пятичасовой марафон",
    "binge-marathon-600": "Ультрамарафон",
    "binge-marathon-900": "Марафон на весь день",
    "lib-specialist-100": "Специалист библиотеки",
    "lib-specialist-500": "Мастер библиотеки",
    "actor-devotee-75": "Преданный поклонник актёра",
    "actor-devotee-150": "Одержимость актёром",
    "movies-10-day": "Сверхмарафон фильмов",
    "episodes-50-day": "Эверест сериалов",
    "afternoon-1": "Послеобеденный чай",
    "afternoon-10": "Любитель дневных сеансов",
    "afternoon-50": "Поклонник дневного просмотра",
    "afternoon-200": "Вечный отпуск",
    "afternoon-500": "Солнечное безумие",
    "primetime-1": "Прайм-тайм",
    "primetime-10": "Критик на диване",
    "primetime-50": "Мудрец дивана",
    "primetime-200": "Легенда гостиной",
    "primetime-500": "Властелин эфира",
    "valentines-day": "Безнадёжный романтик",
    "easter-watch": "Пасхальное воскресенье",
    "lunar-new-year": "Лунный Новый год",
    "diwali-watch": "Фестиваль огней",
    "thanksgiving-watch": "Спасибо за просмотр",
    "july-4-watch": "День независимости",
    "bonfire-night": "Помни, помни",
    "boxing-day-watch": "День подарков",
    "mothers-day": "День матери",
    "fathers-day": "День отца",
    "anime-curious": "Любопытный аниме-фанат",
    "anime-fan": "Поклонник аниме",
    "anime-otaku": "Отаку",
    "anime-veteran": "Ветеран аниме",
    "anime-supreme": "Сверхотаку",
    "studio-ghibli": "Унесённые призраками",
    "studio-a24": "Адепт A24",
    "studio-hbo": "Это не телевидение",
    "studio-netflix": "Netflix и просмотр",
    "studio-bbc": "Поклонник BBC",
    "studio-disney": "Дом Мыши",
    "pilot-tester-5": "Испытатель пилотов",
    "pilot-tester-20": "Случайный зритель",
    "pilot-tester-50": "Проблемы с обязательствами",
    "pilot-binger-5": "Подсел",
    "pilot-binger-20": "Уверенное продолжение",
    "pilot-binger-50": "Всегда в деле",
    "music-first-track": "Первый трек",
    "music-mixtape": "Микстейп",
    "music-playlist-pro": "Мастер плейлистов",
    "music-vinyl-veteran": "Ветеран винила",
    "music-encyclopedia": "Музыкальная энциклопедия",
    "music-hour-fan": "Любитель музыки",
    "music-deep-listener": "Внимательный слушатель",
    "music-marathoner": "Музыкальный марафонец",
    "music-album-curious": "Любитель альбомов",
    "music-album-explorer": "Исследователь альбомов",
    "music-album-collector": "Коллекционер альбомов",
    "music-artist-curious": "Любитель исполнителей",
    "music-artist-explorer": "Исследователь исполнителей",
    "music-artist-archive": "Архив исполнителей",
    "music-genre-flexible": "Гибкий музыкальный вкус",
    "music-genre-wide-net": "Широкий музыкальный кругозор",
    "music-time-traveller": "Музыкальный путешественник во времени",
    "music-decade-spanner": "Музыкальный путешественник по десятилетиям",
    "book-first-page": "Первая страница",
    "book-shelf-starter": "Начинающий читатель",
    "book-bibliophile": "Библиофил",
    "book-librarian": "Библиотекарь",
    "book-audio-listener": "Аудиослушатель",
    "book-audio-companion": "Спутник аудиокниг",
    "book-audio-veteran": "Ветеран аудиокниг",
    "book-series-finisher": "Завершитель книжных серий"
};

function plural(value, forms) {
    const n = Math.abs(Number(value)) || 0;
    const mod100 = n % 100;
    const mod10 = n % 10;
    if (mod100 >= 11 && mod100 <= 14) return forms[2];
    if (mod10 === 1) return forms[0];
    if (mod10 >= 2 && mod10 <= 4) return forms[1];
    return forms[2];
}

function localizedDescription(raw) {
    const text = String(raw || '').trim();
    let m;
    if (text === 'Watch your first item.') return 'Посмотри свой первый материал.';
    if (text === 'Watch something late at night.') return 'Посмотри что-нибудь поздно ночью.';
    if (text === 'Watch something early in the morning.') return 'Посмотри что-нибудь рано утром.';
    if (text === 'Watch something on a weekend.') return 'Посмотри что-нибудь в выходной день.';
    if (text === 'Watch something on Christmas Day.') return 'Посмотри что-нибудь на Рождество.';
    if (text === "Watch something on New Year's Day.") return 'Посмотри что-нибудь в первый день Нового года.';
    if (text === 'Watch something on Halloween.') return 'Посмотри что-нибудь на Хэллоуин.';
    if (text === 'Watch something during Eid al-Fitr or Eid al-Adha.') return 'Посмотри что-нибудь во время Ид аль-Фитр или Ид аль-Адха.';
    if (text === "Watch something on Valentine's Day.") return 'Посмотри что-нибудь в День святого Валентина.';
    if (text === 'Watch something on Easter Sunday.') return 'Посмотри что-нибудь в пасхальное воскресенье.';
    if (text === "Watch something on Lunar New Year's Day.") return 'Посмотри что-нибудь в день Лунного Нового года.';
    if (text === 'Watch something on Diwali.') return 'Посмотри что-нибудь во время Дивали.';
    if (text === 'Watch something on US Thanksgiving.') return 'Посмотри что-нибудь в День благодарения в США.';
    if (text === 'Watch something on July 4th.') return 'Посмотри что-нибудь 4 июля.';
    if (text === 'Watch something on Bonfire Night (Nov 5).') return 'Посмотри что-нибудь в Ночь костров (5 ноября).';
    if (text === 'Watch something on Boxing Day (Dec 26).') return 'Посмотри что-нибудь во второй день Рождества (26 декабря).';
    if (text === "Watch something on Mother's Day (2nd Sunday of May).") return 'Посмотри что-нибудь в День матери (второе воскресенье мая).';
    if (text === "Watch something on Father's Day (3rd Sunday of June).") return 'Посмотри что-нибудь в День отца (третье воскресенье июня).';
    if (text === 'Watch something between 12pm and 5pm.') return 'Посмотри что-нибудь между 12:00 и 17:00.';
    if (text === 'Watch something between 7pm and 10pm.') return 'Посмотри что-нибудь между 19:00 и 22:00.';
    if (text === 'Play your first music track.') return 'Включи свой первый музыкальный трек.';
    if (text === 'Finish your first book.') return 'Закончи чтение своей первой книги.';
    if (text === 'Hit 100% in a library.') return 'Достигни полного завершения одной библиотеки.';
    if (text === 'Reach 100% completion in 1 library.') return 'Достигни 100% завершения в одной библиотеке.';
    if (text === 'Reach 100% completion in 3 libraries.') return 'Достигни 100% завершения в трёх библиотеках.';

    if ((m = text.match(/^Watch (\d+) items?\.$/i))) return `Посмотри ${m[1]} ${plural(m[1], ['материал','материала','материалов'])}.`;
    if ((m = text.match(/^Watch (\d+) films?\.$/i))) return `Посмотри ${m[1]} ${plural(m[1], ['фильм','фильма','фильмов'])}.`;
    if ((m = text.match(/^Finish (\d+) series?\.$/i))) return `Заверши ${m[1]} ${plural(m[1], ['сериал','сериала','сериалов'])}.`;
    if ((m = text.match(/^Have (\d+) late-night sessions?\.$/i))) return `Проведи ${m[1]} ${plural(m[1], ['сеанс','сеанса','сеансов'])} поздно ночью.`;
    if ((m = text.match(/^Have (\d+) early-morning sessions?\.$/i))) return `Проведи ${m[1]} ${plural(m[1], ['сеанс','сеанса','сеансов'])} ранним утром.`;
    if ((m = text.match(/^Have (\d+) weekend sessions?\.$/i))) return `Проведи ${m[1]} ${plural(m[1], ['сеанс','сеанса','сеансов'])} в выходные.`;
    if ((m = text.match(/^Watch from (\d+) different libraries?\.$/i))) return `Посмотри материалы из ${m[1]} разных библиотек.`;
    if ((m = text.match(/^Watch on (\d+) separate days?\.$/i))) return `Смотри контент в течение ${m[1]} разных дней.`;
    if ((m = text.match(/^Maintain a (\d+)-day watch streak\.$/i))) return `Смотри контент ${m[1]} дней подряд.`;
    if ((m = text.match(/^Watch (\d+) episodes? in a single day\.$/i))) return `Посмотри ${m[1]} ${plural(m[1], ['эпизод','эпизода','эпизодов'])} за один день.`;
    if ((m = text.match(/^Watch (\d+) films? in a single day\.$/i))) return `Посмотри ${m[1]} ${plural(m[1], ['фильм','фильма','фильмов'])} за один день.`;
    if ((m = text.match(/^Reach a best watch streak of (\d+) days?\.$/i))) return `Достигни серии просмотров длиной ${m[1]} дней.`;
    if ((m = text.match(/^Watch items from (\d+) different decades\.$/i))) return `Посмотри материалы из ${m[1]} разных десятилетий.`;
    if ((m = text.match(/^Watch items produced in (\d+) different countries\.$/i))) return `Посмотри материалы производства ${m[1]} разных стран.`;
    if ((m = text.match(/^Watch items in (\d+) different original languages\.$/i))) return `Посмотри материалы на ${m[1]} разных языках оригинала.`;
    if ((m = text.match(/^Watch items in (\d+) different languages\.$/i))) return `Посмотри материалы на ${m[1]} разных языках.`;
    if ((m = text.match(/^Watch items across (\d+) different genres\.$/i))) return `Посмотри материалы в ${m[1]} разных жанрах.`;
    if ((m = text.match(/^Watch a single item over (\d+) hours? long\.$/i))) return `Посмотри один материал продолжительностью более ${m[1]} часов.`;
    if ((m = text.match(/^Watch (\d+) items under 30 minutes each\.$/i))) return `Посмотри ${m[1]} материалов длительностью менее 30 минут каждый.`;
    if ((m = text.match(/^Watch (\d+) hours? of content\.$/i))) return `Посмотри контент в течение ${m[1]} ${plural(m[1], ['час','часа','часов'])}.`;
    if ((m = text.match(/^Complete a series with (\d+) or more episodes\.$/i))) return `Полностью посмотри сериал, в котором не менее ${m[1]} эпизодов.`;
    if ((m = text.match(/^Rewatch (\d+) items?\.$/i))) return `Пересмотри ${m[1]} ${plural(m[1], ['материал','материала','материалов'])}.`;
    if ((m = text.match(/^Reach (\d+)% completion in any library\.$/i))) return `Достигни ${m[1]}% завершения любой библиотеки.`;
    if ((m = text.match(/^Log in (\d+) different days\.$/i))) return `Входи в систему в течение ${m[1]} разных дней.`;
    if ((m = text.match(/^Log in (\d+) days in a row\.$/i))) return `Заходи в систему ${m[1]} дней подряд.`;
    if ((m = text.match(/^Watch (\d+) items from the same director\.$/i))) return `Посмотри ${m[1]} материалов одного режиссёра.`;
    if ((m = text.match(/^Watch (\d+) items featuring the same actor\.$/i))) return `Посмотри ${m[1]} материалов с участием одного актёра.`;
    if ((m = text.match(/^Watch (\d+) (horror|comedy|drama|action|sci-fi|animated|crime|romance|thriller|fantasy) items?\.$/i))) {
        const genres = { horror:'ужасов', comedy:'комедий', drama:'драм', action:'боевиков', 'sci-fi':'фантастики', animated:'анимации', crime:'криминальных историй', romance:'романтических историй', thriller:'триллеров', fantasy:'фэнтези' };
        return `Посмотри ${m[1]} материалов в жанре ${genres[m[2].toLowerCase()]}.`;
    }
    if ((m = text.match(/^Watch (\d+) documentaries\.$/i))) return `Посмотри ${m[1]} документальных фильмов.`;
    if ((m = text.match(/^Watch (\d+) thrillers\.$/i))) return `Посмотри ${m[1]} триллеров.`;
    if ((m = text.match(/^Reach 100% completion in (\d+) libraries\.$/i))) return `Достигни 100% завершения в ${m[1]} библиотеках.`;
    if ((m = text.match(/^Reach prestige level (\d+)\.$/i))) return `Достигни ${m[1]}-го уровня престижа.`;
    if ((m = text.match(/^Earn ([\d,]+) lifetime score\.$/i))) return `Набери ${m[1]} очков за всё время.`;
    if ((m = text.match(/^Reach a (\d+)x playback combo\.$/i))) return `Достигни серии из ${m[1]} воспроизведений подряд.`;
    if ((m = text.match(/^Unlock (\d+)% of all badges\.$/i))) return `Открой ${m[1]}% всех значков.`;
    if ((m = text.match(/^Watch (\d+) items from the (\d{4})s\.$/i))) return `Посмотри ${m[1]} материалов из ${m[2]}-х годов.`;
    if ((m = text.match(/^Watch (\d+) items on (Mondays|Tuesdays|Wednesdays|Thursdays|Fridays|Saturdays|Sundays)\.$/i))) {
        const days = { Mondays:'понедельникам', Tuesdays:'вторникам', Wednesdays:'средам', Thursdays:'четвергам', Fridays:'пятницам', Saturdays:'субботам', Sundays:'воскресеньям' };
        return `Посмотри ${m[1]} материалов по ${days[m[2]]}.`;
    }
    if ((m = text.match(/^Watch (\d+) minutes \((\d+) hours\) in a single day\.$/i))) return `Посмотри контент ${m[1]} минут (${m[2]} часов) за один день.`;
    if ((m = text.match(/^Watch (\d+) items from a single library\.$/i))) return `Посмотри ${m[1]} материалов из одной библиотеки.`;
    if ((m = text.match(/^Watch (\d+) movies? in a single day\.$/i))) return `Посмотри ${m[1]} фильмов за один день.`;
    if ((m = text.match(/^Have (\d+) afternoon sessions\.$/i))) return `Проведи ${m[1]} дневных сеансов.`;
    if ((m = text.match(/^Have (\d+) prime-time sessions\.$/i))) return `Проведи ${m[1]} сеансов в прайм-тайм.`;
    if ((m = text.match(/^Watch (\d+) anime items\.$/i))) return `Посмотри ${m[1]} произведений аниме.`;
    if ((m = text.match(/^Watch (\d+) (Studio Ghibli|A24|HBO|Netflix|BBC|Disney) items\.$/i))) return `Посмотри ${m[1]} материалов студии ${m[2]}.`;
    if ((m = text.match(/^Sample (\d+) series and bail after the pilot\.$/i))) return `Начни ${m[1]} сериалов и остановись после пилотной серии.`;
    if ((m = text.match(/^Continue past the pilot on (\d+) series\.$/i))) return `Продолжи просмотр ${m[1]} сериалов после пилотной серии.`;
    if ((m = text.match(/^Play (\d+) music tracks\.$/i))) return `Включи ${m[1]} музыкальных треков.`;
    if ((m = text.match(/^Listen to (\d+) hours? of music\.$/i))) return `Послушай музыку в течение ${m[1]} ${plural(m[1], ['час','часа','часов'])}.`;
    if ((m = text.match(/^Hear tracks from (\d+) different albums\.$/i))) return `Послушай треки из ${m[1]} разных альбомов.`;
    if ((m = text.match(/^Listen to (\d+) different artists\.$/i))) return `Послушай ${m[1]} разных исполнителей.`;
    if ((m = text.match(/^Listen to (\d+) different music genres\.$/i))) return `Послушай музыку ${m[1]} разных жанров.`;
    if ((m = text.match(/^Listen to music from (\d+) different decades\.$/i))) return `Послушай музыку из ${m[1]} разных десятилетий.`;
    if ((m = text.match(/^Finish (\d+) books?\.$/i))) return `Закончи ${m[1]} ${plural(m[1], ['книгу','книги','книг'])}.`;
    if ((m = text.match(/^Listen to (\d+) hours? of audiobooks\.$/i))) return `Послушай аудиокниги в течение ${m[1]} ${plural(m[1], ['час','часа','часов'])}.`;
    if ((m = text.match(/^Finish (\d+) book series\.$/i))) return `Заверши ${m[1]} книжные серии.`;
    return text;
}

export function localizeAchievementBadge(badge, language = '') {
    if (!badge || !/^ru(?:[-_]|$)/i.test(String(language || ''))) return badge;
    const id = String(badge.Id || badge.id || '').trim().toLowerCase();
    const title = RUSSIAN_TITLES[id];
    const description = localizedDescription(badge.Description || badge.description || '');
    if (!title && !description) return badge;
    return {
        ...badge,
        Title: title || badge.Title || badge.title,
        Description: description || badge.Description || badge.description
    };
}
