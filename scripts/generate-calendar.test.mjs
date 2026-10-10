import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  applyChanges,
  calendarToIcs,
  cleanProgramText,
  eventBucket,
  extractEvents,
  parseDateText,
  seriesEvents,
} from './generate-calendar.mjs';

test('mobile event cards keep padding inside the available width', async () => {
  const css = await readFile(
    new URL('../site-assets/calendar.css', import.meta.url),
    'utf8',
  );

  assert.match(
    css,
    /\.orch-mobile-event\s*\{[^}]*box-sizing:\s*border-box;/s,
  );
  assert.match(
    css,
    /\.orch-mobile-event\s*\{[^}]*display:\s*block;[^}]*width:\s*100%;/s,
  );
});

test('mobile note opens the musical dates panel', async () => {
  const [css, runtime] = await Promise.all([
    readFile(
      new URL('../site-assets/calendar.css', import.meta.url),
      'utf8',
    ),
    readFile(
      new URL('../site-assets/calendar.runtime.js', import.meta.url),
      'utf8',
    ),
  ]);

  assert.match(css, /\.orch-mobile-music-modal\[hidden\]/);
  assert.match(runtime, /function openMobileMusicModal\(\)/);
  assert.match(
    runtime,
    /isMobileCalendarViewport\(\)[\s\S]*openMobileMusicModal\(\)/,
  );
  assert.match(runtime, /data-orch-music-key/);
});

test('parseDateText supports Tilda date formats', () => {
  assert.equal(parseDateText('16.10.2026'), '2026-10-16');
  assert.equal(parseDateText('2026-10-16'), '2026-10-16');
});

test('series creates selected weekdays only', () => {
  const post = {
    uid: 'series-1',
    fields: {
      title: 'Репетиция Оркестра',
      select: 'Репетиция',
      select2: 'Серия',
      'custom-date2': '12.10.2026',
      'custom-date3': '19.10.2026',
      input5: 'main-rehearsals',
      number: true,
      number5: true,
      input2: '18:30',
      input3: '21:30',
      input4: 'Старая Басманная',
    },
  };

  const events = seriesEvents(post);
  assert.deepEqual(
    events.map((event) => event.dateKey),
    ['2026-10-12', '2026-10-16', '2026-10-19'],
  );
});

test('one occurrence can be cancelled without deleting the series', () => {
  const base = seriesEvents({
    uid: 'series-1',
    fields: {
      title: 'Репетиция Оркестра',
      select: 'Репетиция',
      select2: 'Серия',
      'custom-date2': '12.10.2026',
      'custom-date3': '19.10.2026',
      input5: 'main-rehearsals',
      number: true,
      number5: true,
      input2: '18:30',
      input3: '21:30',
    },
  });

  const changed = applyChanges(base, [{
    uid: 'change-1',
    fields: {
      select2: 'Изменение серии',
      input6: 'main-rehearsals',
      'custom-date4': '16.10.2026',
      select4: 'Отменить',
    },
  }]);

  assert.equal(changed.length, 3);
  assert.equal(changed[0].cancelled, false);
  assert.equal(changed[1].dateKey, '2026-10-16');
  assert.equal(changed[1].cancelled, true);
  assert.equal(changed[2].cancelled, false);

  const ics = calendarToIcs(changed, 'Test', new Date('2026-10-07T17:00:00Z'));
  assert.match(ics, /UID:series-main-rehearsals-[0-9a-f]{8}-2026-10-16@orchestra\.hse\.ru/);
  assert.match(ics, /STATUS:CANCELLED/);
});

test('moved occurrence keeps the same stable UID', () => {
  const base = seriesEvents({
    uid: 'series-1',
    fields: {
      title: 'Репетиция Оркестра',
      select: 'Репетиция',
      select2: 'Серия',
      'custom-date2': '16.10.2026',
      'custom-date3': '16.10.2026',
      input5: 'main-rehearsals',
      number5: true,
      input2: '18:30',
      input3: '21:30',
      input4: 'Ауд. 203',
    },
  });

  const originalUid = base[0].uid;

  const [moved] = applyChanges(base, [{
    uid: 'change-2',
    fields: {
      select2: 'Изменение серии',
      input6: 'main-rehearsals',
      'custom-date4': '16.10.2026',
      select4: 'Перенести',
      'custom-date5': '17.10.2026',
      input7: '19:00',
      input8: '22:00',
      input9: 'Актовый зал',
    },
  }]);

  assert.equal(moved.uid, originalUid);
  assert.equal(moved.dateKey, '2026-10-17');
  assert.equal(moved.startTime, '19:00');
  assert.equal(moved.location, 'Актовый зал');
});

test('event types are classified into separate subscription feeds', () => {
  assert.equal(eventBucket({ type: 'Концерт' }), 'concerts');
  assert.equal(eventBucket({ type: 'Генеральная репетиция' }), 'rehearsals');
  assert.equal(eventBucket({ type: 'Собрание' }), 'meetings');
  assert.equal(eventBucket({ type: 'Другое' }), 'other');
});

test('extractEvents applies series changes', () => {
  const posts = [
    {
      uid: 's',
      fields: {
        title: 'Репетиция',
        select: 'Репетиция',
        select2: 'Серия',
        'custom-date2': '16.10.2026',
        'custom-date3': '16.10.2026',
        input5: 'r',
        number5: true,
        input2: '18:30',
        input3: '21:30',
      },
    },
    {
      uid: 'c',
      fields: {
        select2: 'Изменение серии',
        input6: 'r',
        'custom-date4': '16.10.2026',
        select4: 'Отменить',
      },
    },
  ];

  const events = extractEvents(posts);
  assert.equal(events.length, 1);
  assert.equal(events[0].cancelled, true);
});


test('Cyrillic series IDs do not collapse to the same UID', () => {
  const makeSeries = (id) => seriesEvents({
    uid: id,
    fields: {
      title: 'Репетиция',
      select: 'Репетиция',
      select2: 'Серия',
      'custom-date2': '16.10.2026',
      'custom-date3': '16.10.2026',
      input5: id,
      number5: true,
      input2: '18:30',
      input3: '21:30',
    },
  })[0];

  assert.notEqual(makeSeries('репетиции').uid, makeSeries('концерты').uid);
});


test('program label is normalized before ICS generation', () => {
  assert.equal(
    cleanProgramText('Программа:\nГеоргий Свиридов\n1. Тройка'),
    'Георгий Свиридов\n1. Тройка',
  );

  const ics = calendarToIcs([{
    uid: 'concert-test@orchestra.hse.ru',
    title: 'Концерт',
    type: 'Концерт',
    dateKey: '2026-10-16',
    sourceDate: '2026-10-16',
    seriesId: '',
    startTime: '18:30',
    endTime: '20:00',
    location: '',
    program: 'Программа:\nГеоргий Свиридов',
    note: '',
    url: '',
    cancelled: false,
    changed: false,
  }], 'Test', new Date('2026-10-07T17:00:00Z'));

  assert.match(ics, /Программа:\\nГеоргий Свиридов/);
  assert.doesNotMatch(ics, /Программа:\\nПрограмма:/);
  assert.match(ics, /REFRESH-INTERVAL;VALUE=DURATION:P1D/);
});
