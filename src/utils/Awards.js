/** Normalizes the public Jellyfin-Enhanced awards response without inventing results. */
export function normalizeAwards(data) {
    if (!data || (data.found ?? data.Found) === false) return null;
    const awards = data.awards ?? data.Awards ?? [];
    const rows = (Array.isArray(awards) ? awards : [])
        .map((entry) => {
            const name = entry.name ?? entry.Name;
            const result = String(entry.result ?? entry.Result ?? '').toLowerCase();
            const year = Number(entry.year ?? entry.Year);
            const recipients = entry.recipients ?? entry.Recipients;
            return typeof name === 'string' && name.trim() && ['won', 'nominated'].includes(result)
                ? {
                      name: name.trim(),
                      result,
                      year: Number.isInteger(year) && year >= 1800 && year <= 2200 ? year : null,
                      recipients: Array.isArray(recipients)
                          ? recipients.filter((person) => typeof person === 'string')
                          : []
                  }
                : null;
        })
        .filter(Boolean)
        .sort((a, b) => (b.year || 0) - (a.year || 0) || (a.result === b.result ? 0 : a.result === 'won' ? -1 : 1));
    const count = (value, result) =>
        Number.isInteger(value) && value >= 0 ? value : rows.filter((row) => row.result === result).length;
    const wins = count(data.wins ?? data.Wins, 'won');
    const nominations = count(data.nominations ?? data.Nominations, 'nominated');
    return wins || nominations || rows.length ? { wins, nominations, rows } : null;
}
