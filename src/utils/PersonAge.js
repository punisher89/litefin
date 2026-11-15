/** Calendar ages; timestamps and approximate years must not invent birthdays. */
function calendar(value) {
    if (!value || !/^\d{4}-\d{2}-\d{2}/.test(String(value))) return null;
    const parts = String(value).slice(0, 10).split('-').map(Number);
    const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    return date.getUTCFullYear() === parts[0] && date.getUTCMonth() + 1 === parts[1] && date.getUTCDate() === parts[2]
        ? parts
        : null;
}

export function calendarAge(birthValue, referenceValue) {
    const birth = calendar(birthValue),
        reference = calendar(referenceValue);
    if (!birth || !reference) return null;
    const age =
        reference[0] -
        birth[0] -
        (reference[1] < birth[1] || (reference[1] === birth[1] && reference[2] < birth[2]) ? 1 : 0);
    return age >= 0 && age <= 130 ? age : null;
}

/** Prefer a real production date; label a release-date fallback accurately. */
export function personAgeFacts(person, item = {}, today = new Date()) {
    const now = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const birth = person.birthDate || person.birthday || person.PremiereDate;
    const death = person.deathDate || person.deathday || person.EndDate;
    const deceased = !!calendar(death) && String(death).slice(0, 10) <= now;
    const production = item.FilmingStartDate || item.ProductionStartDate;
    const reference = production || item.PremiereDate || item.ReleaseDate;
    const afterDeath = deceased && reference && String(reference).slice(0, 10) > String(death).slice(0, 10);
    return {
        deceased,
        currentAge: calendarAge(birth, deceased ? death : now),
        productionAge: afterDeath ? null : calendarAge(birth, reference),
        productionLabel: production ? 'ActorAgeAtFilming' : 'ActorAgeAtRelease'
    };
}
