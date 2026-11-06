/**
 * Font-independent AchievementBadges glyphs for LG webOS.
 * The server sends Material Icons ligature names, not image URLs.
 * Rendering an SVG avoids missing Material Icons font glyphs on the TV.
 */
const PATHS = Object.freeze({
    trophy: '<path d="M8 21h8M12 17v4M7 3h10v6a5 5 0 0 1-10 0V3Z"/><path d="M7 5H4v3a4 4 0 0 0 4 4M17 5h3v3a4 4 0 0 1-4 4"/>',
    play: '<circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4V8Z"/>',
    film: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4m-4 6h4m10-6h4m-4 6h4"/>',
    tv: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M8 22h8m-4-3v3m-4-19 4 2 4-2"/>',
    fire: '<path d="M12 22c5 0 8-3 8-8 0-3-2-6-4-8 0 3-2 4-3 4 0-4-3-7-5-8 1 5-4 7-4 12 0 5 3 8 8 8Z"/><path d="M12 22c2 0 3-2 3-4 0-2-1-3-3-5-1 3-3 4-3 6 0 2 1 3 3 3Z"/>',
    bolt: '<path d="m13 2-9 12h7l-1 8 10-13h-7l0-7Z"/>',
    star: '<path d="m12 2 3.1 6.4 7.1 1-5.1 5 .9 7-6-3.3-6 3.3 1-7-5.2-5 7.1-1L12 2Z"/>',
    heart: '<path d="M20 5c-3-3-7-1-8 2-1-3-5-5-8-2-4 4 0 9 8 16 8-7 12-12 8-16Z"/>',
    moon: '<path d="M20.5 13A9 9 0 0 1 11 3.5 9 9 0 1 0 20.5 13Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M19 5l-2 2M7 17l-2 2"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6m10-6v6M3 10h18m-13 5 2 2 4-4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 3"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-5 5-5 13 0 18 5-5 5-13 0-18Z"/>',
    book: '<path d="M12 6c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1Zm0 0v15"/>',
    music: '<path d="M10 17V5l10-2v12M10 6l10-2"/><ellipse cx="7" cy="18" rx="3" ry="2"/><ellipse cx="17" cy="16" rx="3" ry="2"/>',
    rocket: '<path d="M4 16c0-8 6-13 16-13 0 10-5 16-13 17L4 16Z"/><circle cx="14" cy="9" r="2"/><path d="m4 16-2 6 6-2M7 12l-4 1m9 4 1 4"/>',
    gift: '<rect x="3" y="10" width="18" height="11" rx="1"/><path d="M2 7h20v4H2zm10 0v14M12 7C7 2 5 3 5 5c0 2 3 2 7 2Zm0 0c5-5 7-4 7-2 0 2-3 2-7 2Z"/>',
    library: '<rect x="3" y="3" width="4" height="18" rx="1"/><rect x="9" y="3" width="5" height="18" rx="1"/><path d="m16 4 4-1 2 17-4 1-2-17Z"/>',
    medal: '<path d="m6 2 6 9 6-9M9 3l3 5 3-5"/><circle cx="12" cy="16" r="6"/><path d="m12 12 1 3 3 .5-2.2 2 .5 3-2.3-1.5-2.4 1.5.6-3-2.2-2L11 15Z"/>',
    footsteps: '<path d="M7 3c2 0 2 4 1 6s-3 3-4 1 0-7 3-7ZM17 12c3 0 4 4 3 7s-4 3-5 1c-1-3 0-8 2-8ZM9 13l3 2m-1-7 3-1"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m15 9-2 5-5 2 2-5 5-2Z"/>',
    chat: '<path d="M4 4h16v12H8l-4 4V4Z"/><path d="M7 8h10m-10 4h6"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/>',
    game: '<path d="M7 8h10c2 0 3 2 4 7 1 5-2 5-5 2l-1-1H9l-1 1c-3 3-6 3-5-2 1-5 2-7 4-7Z"/><path d="M8 11v6m-3-3h6M16 13h.01M19 15h.01"/>',
    shield: '<path d="m12 2 9 4v6c0 6-4 9-9 11-5-2-9-5-9-11V6l9-4Z"/><path d="m8 12 3 3 5-6"/>'
});

const ICON_GROUPS = [
    ['play', /^(play_|replay|repeat|loop|autorenew)/],
    ['film', /(movie|theater|cinema|film|videocam|video|camera|festival)/],
    ['tv', /^(tv|live_tv|smart_display|connected_tv|cast|monitor|display|screen)/],
    ['fire', /(fire|whatshot|hot|flame)/],
    ['bolt', /(bolt|flash|electric|energy|speed|fast)/],
    ['star', /(star|awesome|sparkle|magic|celebration|workspace_premium|diamond)/],
    ['heart', /(favorite|volunteer|loyal|thumb_up)/],
    ['moon', /(night|dark|bedtime|sleep|moon)/],
    ['sun', /(sun|light_mode|brightness|sunrise|wb_twilight)/],
    ['calendar', /(calendar|event|date|today|week)/],
    ['clock', /(time|clock|hourglass|schedule|timer|update|alarm|history)/],
    ['globe', /(world|public|language|flight|translate|explore|travel)/],
    ['book', /(book|stories|article|newspaper|education|school|menu_book)/],
    ['music', /(music|audio|sound|album|mic|piano|headphone|record_voice|radio)/],
    ['rocket', /(rocket|trending_up|launch)/],
    ['gift', /(gift|redeem|card_gift|store|shopping)/],
    ['library', /(library|collections|inventory|storage|archive)/],
    ['medal', /(military_tech|award|badge|verified|emoji_events|sports_score)/],
    ['footsteps', /(run|walk|bike|fitness|hiking|sports)/],
    ['compass', /(map|navigation|compass|place|location|travel_explore)/],
    ['chat', /(message|chat|forum|mail|send)/],
    ['check', /(check|done|complete)/],
    ['game', /(game|casino|puzzle|sports_esports)/],
    ['shield', /(shield|security|lock|defense)/]
];

/** Safe server icon ID -> inline, locally rendered SVG, with a reliable fallback. */
const SUBJECT_ICONS = [
    [/^(christmas|new-years|holiday)/, 'gift'],
    [/^(halloween|horror|hidden-night|late-vampire)/, 'moon'],
    [/^(rewatch|repeat|serial-rewatch)/, 'play'],
    [/^(film|movie|cinema|double-feature|director|actor)/, 'film'],
    [/^(series|episode|season|completionist-plus|seen-it-all)/, 'tv'],
    [/^(night|midnight|three-am|insomniac|creature-of-the-night|late-)/, 'moon'],
    [/^(early|morning|sunrise|dawn)/, 'sun'],
    [/^(weekend|daily|routine|login-streak|consistent|fortnight|unbroken)/, 'calendar'],
    [/^(time|ten-hours|hundred-hours|five-hundred-hours|thousand-hours|runtime)/, 'clock'],
    [/^(globe|world|un-delegate|polyglot|bilingual|language)/, 'globe'],
    [/^(artist|discography|music|album|track)/, 'music'],
    [/^(library|lib-|collector|archivist)/, 'library'],
    [/^(score|prestige|rank|badge|milestone)/, 'medal'],
    [/^(genre|explorer|media-explorer|time-traveller)/, 'compass'],
    [/^(binge|marathon|warmup|speedrunner|season-sprint)/, 'fire'],
    [/^(streak|combo|momentum|consistent)/, 'bolt'],
    [/^(pilot|tester|launch|millennium)/, 'rocket']
];

/** Render a distinct themed icon for each server badge subject without Material Fonts. */
export function renderAchievementIcon(iconName, badge = null) {
    const icon = String(iconName || '').toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
    const subject = String(badge?.Id || badge?.Key || '').toLowerCase();
    const sourceMatch = ICON_GROUPS.find((entry) => entry[1].test(icon));
    const badgeMatch = SUBJECT_ICONS.find((entry) => entry[0].test(subject));
    const key = badgeMatch ? badgeMatch[1] : sourceMatch ? sourceMatch[0] : 'trophy';
    return '<svg class="achievement-icon-svg" viewBox="0 0 24 24" width="60" height="60" ' +
        'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" ' +
        'aria-hidden="true" focusable="false">' + PATHS[key] + '</svg>';
}
