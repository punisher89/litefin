import assert from 'node:assert/strict';
import test from 'node:test';
import { calendarAge, personAgeFacts } from '../src/utils/PersonAge.js';

test('calendar ages change on the birthday and reject unknown or impossible dates', () => {
    assert.equal(calendarAge('1980-11-16', '2026-11-15'), 45);
    assert.equal(calendarAge('1980-11-15', '2026-11-15'), 46);
    assert.equal(calendarAge('1980-02-30', '2026-11-15'), null);
    assert.equal(calendarAge('2030-01-01', '2026-11-15'), null);
    assert.equal(calendarAge(null, '2026-11-15'), null);
});

test('deceased actors show their age at death and no fictional age for a posthumous premiere', () => {
    const facts = personAgeFacts(
        { PremiereDate: '1950-06-15', EndDate: '2020-03-01' },
        { PremiereDate: '2021-01-01' },
        new Date(2026, 10, 15)
    );
    assert.equal(facts.deceased, true);
    assert.equal(facts.currentAge, 69);
    assert.equal(facts.productionAge, null);
});

test('exact filming metadata takes precedence and release-date estimates are clearly labeled', () => {
    const person = { birthday: '1980-11-16' };
    const item = { FilmingStartDate: '2010-10-01', PremiereDate: '2012-01-01' };
    const exact = personAgeFacts(person, item, new Date(2026, 10, 15));
    assert.equal(exact.productionAge, 29);
    assert.equal(exact.productionLabel, 'ActorAgeAtFilming');
    assert.equal(exact.currentAge, 45);
    delete item.FilmingStartDate;
    const fallback = personAgeFacts(person, item, new Date(2026, 10, 15));
    assert.equal(fallback.productionAge, 31);
    assert.equal(fallback.productionLabel, 'ActorAgeAtRelease');
});
