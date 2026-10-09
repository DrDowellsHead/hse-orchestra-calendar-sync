import { copyFile, cp, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const FEED_UID = '464271385811';
export const FEED_API = 'https://feeds.tildaapi.com/api/v2/getfeed/';
export const TZ = 'Europe/Moscow';
export const CALENDAR_NAME = 'HSE Orchestra';

const PAGE_SIZE = 100;

export function clean(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object' && 'value' in value) value = value.value;
  return String(value).replace(/\u00a0/g, ' ').trim();
}

export function normalized(value) {
  return clean(value).toLowerCase().replace(/ё/g, 'е');
}

export function fieldUrl(value) {
  if (value && typeof value === 'object') return clean(value.url);
  return clean(value);
}

export function parseDateText(text) {
  const value = clean(text);
  let match = value.match(/\b(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})\b/);
  if (match) {
    return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  }

  match = value.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})(?=$|[T\s])/);
  if (match) {
    return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
  }

  return null;
}

export function addDays(key, amount) {
  const date = new Date(`${key}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function daysBetween(first, second) {
  const a = Date.parse(`${first}T12:00:00Z`);
  const b = Date.parse(`${second}T12:00:00Z`);
  return Math.round((b - a) / 86400000);
}

export function mondayIndex(key) {
  return (new Date(`${key}T12:00:00Z`).getUTCDay() + 6) % 7;
}

function truthyField(value) {
  if (value === true || value === 1) return true;
  const n = normalized(value);
  if (!n) return false;
  return !['0', 'false', 'нет', 'off', 'no'].includes(n);
}

function normalizeTime(value, fallback = '00:00') {
  const match = clean(value).match(/\b(\d{1,2}):(\d{2})\b/);
  if (!match) return fallback;
  return `${match[1].padStart(2, '0')}:${match[2]}`;
}

function stableHash(value) {
  let hash = 0x811c9dc5;
  const bytes = new TextEncoder().encode(clean(value));

  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

function sanitizeUid(value) {
  const source = clean(value);
  const slug = source
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  return `${slug || 'id'}-${stableHash(source)}`;
}

function eventUid(seriesId, sourceDate, singleUid = '') {
  if (seriesId && sourceDate) {
    return `series-${sanitizeUid(seriesId)}-${sourceDate}@orchestra.hse.ru`;
  }
  return `single-${sanitizeUid(singleUid)}@orchestra.hse.ru`;
}

export function makeEvent(data) {
  const dateKey = parseDateText(data.dateKey);
  if (!dateKey) return null;

  const startTime = normalizeTime(data.startTime);
  const endTime = normalizeTime(data.endTime, startTime);

  return {
    uid: data.uid,
    title: clean(data.title) || 'Событие',
    type: clean(data.type) || 'Другое',
    dateKey,
    sourceDate: parseDateText(data.sourceDate) || dateKey,
    seriesId: clean(data.seriesId),
    startTime,
    endTime,
    location: clean(data.location),
    program: clean(data.program),
    note: clean(data.note),
    url: fieldUrl(data.url),
    cancelled: Boolean(data.cancelled),
    changed: Boolean(data.changed),
  };
}

export function singleEvent(post) {
  const fields = post.fields || {};
  return makeEvent({
    uid: eventUid('', '', post.uid),
    title: fields.title,
    type: fields.select,
    dateKey: fields['custom-date'],
    startTime: fields.input2,
    endTime: fields.input3,
    location: fields.input4,
    program: fields.textarea,
    url: fields.url,
  });
}

export function seriesEvents(post) {
  const fields = post.fields || {};
  const first = parseDateText(fields['custom-date2']);
  const last = parseDateText(fields['custom-date3']);
  const seriesId = clean(fields.input5);

  if (!first || !last || !seriesId || first > last) return [];

  const weekdays = [
    fields.number,
    fields.number2,
    fields.number3,
    fields.number4,
    fields.number5,
    fields.number6,
    fields.number7,
  ].map(truthyField);

  const everyTwoWeeks = normalized(fields.select3).includes('2');
  const result = [];

  for (let key = first; key <= last; key = addDays(key, 1)) {
    const weekday = mondayIndex(key);
    if (!weekdays[weekday]) continue;

    if (everyTwoWeeks) {
      const week = Math.floor(daysBetween(first, key) / 7);
      if (week % 2 !== 0) continue;
    }

    const event = makeEvent({
      uid: eventUid(seriesId, key),
      title: fields.title,
      type: fields.select,
      dateKey: key,
      sourceDate: key,
      seriesId,
      startTime: fields.input2,
      endTime: fields.input3,
      location: fields.input4,
      program: fields.textarea,
      url: fields.url,
    });

    if (event) result.push(event);
  }

  return result;
}

export function applyChanges(events, changes) {
  const byOccurrence = new Map();

  for (const post of changes) {
    const fields = post.fields || {};
    const seriesId = clean(fields.input6);
    const sourceDate = parseDateText(fields['custom-date4']);
    if (seriesId && sourceDate) {
      byOccurrence.set(`${seriesId}|${sourceDate}`, post);
    }
  }

  return events.map((event) => {
    if (!event.seriesId) return event;

    const post = byOccurrence.get(`${event.seriesId}|${event.sourceDate}`);
    if (!post) return event;

    const fields = post.fields || {};
    const action = normalized(fields.select4);

    if (action.includes('отмен')) {
      return {
        ...event,
        cancelled: true,
        changed: true,
      };
    }

    return makeEvent({
      uid: event.uid,
      title: event.title,
      type: event.type,
      dateKey: parseDateText(fields['custom-date5']) || event.dateKey,
      sourceDate: event.sourceDate,
      seriesId: event.seriesId,
      startTime: clean(fields.input7) || event.startTime,
      endTime: clean(fields.input8) || event.endTime,
      location: clean(fields.input9) || event.location,
      program: clean(fields.textarea3) || event.program,
      note: event.note,
      url: event.url,
      changed: true,
    });
  }).filter(Boolean);
}

export function extractEvents(posts) {
  const singles = [];
  const series = [];
  const changes = [];

  for (const post of posts) {
    const fields = post.fields || {};
    const kind = normalized(fields.select2);

    if (kind.includes('измен')) {
      changes.push(post);
    } else if (kind.includes('сери')) {
      series.push(...seriesEvents(post));
    } else if (kind.includes('одиноч')) {
      const event = singleEvent(post);
      if (event) singles.push(event);
    }
  }

  return applyChanges([...singles, ...series], changes)
    .sort((a, b) => {
      const ak = `${a.dateKey}T${a.startTime}`;
      const bk = `${b.dateKey}T${b.startTime}`;
      return ak.localeCompare(bk);
    });
}

export function eventBucket(event) {
  const type = normalized(event.type);

  if (type.includes('конц')) return 'concerts';
  if (type.includes('репет')) return 'rehearsals';
  if (type.includes('собран')) return 'meetings';

  return 'other';
}

function icsEscape(value) {
  return clean(value)
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function icsDateTime(dateKey, time) {
  return `${dateKey.replace(/-/g, '')}T${time.replace(':', '')}00`;
}

function utcStamp(date = new Date()) {
  return date.toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
}

export function cleanProgramText(value) {
  return clean(value)
    .replace(/^\s*программа\s*:\s*/iu, '')
    .trim();
}

function eventDescription(event) {
  const parts = [];
  const program = cleanProgramText(event.program);

  if (event.type) parts.push(event.type);
  if (program) parts.push(`Программа:\n${program}`);
  if (event.note) parts.push(event.note);
  if (event.url) parts.push(event.url);

  return parts.join('\n\n');
}

export function eventToIcs(event, generatedAt = new Date()) {
  const lines = [
    'BEGIN:VEVENT',
    `UID:${icsEscape(event.uid)}`,
    `DTSTAMP:${utcStamp(generatedAt)}`,
    `LAST-MODIFIED:${utcStamp(generatedAt)}`,
    `SEQUENCE:${event.changed ? 1 : 0}`,
    `DTSTART;TZID=${TZ}:${icsDateTime(event.dateKey, event.startTime)}`,
    `DTEND;TZID=${TZ}:${icsDateTime(event.dateKey, event.endTime)}`,
    `SUMMARY:${icsEscape(event.title)}`,
  ];

  if (event.location) lines.push(`LOCATION:${icsEscape(event.location)}`);

  const description = eventDescription(event);
  if (description) lines.push(`DESCRIPTION:${icsEscape(description)}`);

  if (event.url) lines.push(`URL:${icsEscape(event.url)}`);

  if (event.cancelled) {
    lines.push('STATUS:CANCELLED');
  } else {
    lines.push('STATUS:CONFIRMED');
  }

  lines.push('END:VEVENT');
  return lines.join('\r\n');
}

function timezoneBlock() {
  return [
    'BEGIN:VTIMEZONE',
    `TZID:${TZ}`,
    `X-LIC-LOCATION:${TZ}`,
    'BEGIN:STANDARD',
    'TZOFFSETFROM:+0300',
    'TZOFFSETTO:+0300',
    'TZNAME:MSK',
    'DTSTART:19700101T000000',
    'END:STANDARD',
    'END:VTIMEZONE',
  ].join('\r\n');
}

export function calendarToIcs(events, name, generatedAt = new Date()) {
  const body = events.map((event) => eventToIcs(event, generatedAt));
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HSE Orchestra//Calendar Sync//RU',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${icsEscape(name)}`,
    `X-WR-TIMEZONE:${TZ}`,
    // Клиенты могут проверять подписку чаще, чем GitHub пересобирает источник.
    // Это важно после ручного запуска workflow при срочной отмене/переносе.
    'REFRESH-INTERVAL;VALUE=DURATION:P1D',
    'X-PUBLISHED-TTL:P1D',
    timezoneBlock(),
    ...body,
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}

export async function loadFeedRecords(fetchImpl = fetch) {
  const records = [];
  let slice = 1;
  let total = Infinity;

  while (records.length < total) {
    const url = new URL(FEED_API);
    url.searchParams.set('feeduid', FEED_UID);
    url.searchParams.set('size', String(PAGE_SIZE));
    url.searchParams.set('slice', String(slice));

    const response = await fetchImpl(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'HSE-Orchestra-Calendar-Sync/1.0',
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Tilda Feed HTTP ${response.status}`);
    }

    const payload = await response.json();
    if (!payload?.success || !payload?.result) {
      throw new Error('Tilda Feed returned an invalid response');
    }

    const posts = payload.result.posts || [];
    total = Number(payload.result.total) || 0;
    records.push(...posts);

    if (!posts.length || posts.length < PAGE_SIZE) break;
    slice += 1;
    if (slice > 50) throw new Error('Tilda Feed pagination guard reached');
  }

  if (records.length === 0) {
    throw new Error('Tilda Feed returned zero records; refusing to publish empty calendars');
  }

  return records;
}

function htmlPage(meta) {
  const stamp = new Intl.DateTimeFormat('ru-RU', {
    timeZone: TZ,
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(meta.generatedAt));

  const link = (file, title, subtitle) =>
    `<a class="card" href="./${file}"><strong>${title}</strong><span>${subtitle}</span></a>`;

  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>HSE Orchestra — календарь</title>
<style>
body{font-family:Inter,Arial,sans-serif;max-width:760px;margin:0 auto;padding:48px 20px;color:#172333;background:#f4f7fa}
h1{font-size:34px;margin:0 0 10px}p{line-height:1.55;color:#506074}.grid{display:grid;gap:12px;margin-top:28px}.card{display:block;padding:18px 20px;border-radius:18px;background:#fff;color:#172333;text-decoration:none;box-shadow:0 8px 30px rgba(23,35,51,.08)}.card strong{display:block;font-size:18px}.card span{display:block;margin-top:5px;color:#66788a}.meta{margin-top:28px;font-size:14px}
</style>
</head>
<body>
<h1>HSE Orchestra</h1>
<p>Постоянные ссылки для подписки на расписание оркестра.</p>
<div class="grid">
${link('all.ics','Всё расписание','Репетиции, концерты и другие события')}
${link('rehearsals.ics','Репетиции','Только репетиции')}
${link('concerts.ics','Концерты','Только концерты')}
${link('meetings.ics','Собрания','Только собрания')}
${link('other.ics','Другие','Все остальные события')}
</div>
<p class="meta">Источник обновлён: ${stamp} МСК · Событий: ${meta.counts.all}, репетиций: ${meta.counts.rehearsals}, концертов: ${meta.counts.concerts}, собраний: ${meta.counts.meetings}, других: ${meta.counts.other}, отмен: ${meta.counts.cancelled}.</p>
</body>
</html>`;
}

export async function generate({ outDir = 'public', fetchImpl = fetch, now = new Date() } = {}) {
  const posts = await loadFeedRecords(fetchImpl);
  const events = extractEvents(posts);

  const rehearsals = events.filter((event) => eventBucket(event) === 'rehearsals');
  const concerts = events.filter((event) => eventBucket(event) === 'concerts');
  const meetings = events.filter((event) => eventBucket(event) === 'meetings');
  const other = events.filter((event) => eventBucket(event) === 'other');

  const assetVersion =
    String(
      process.env.GITHUB_SHA
      || now.toISOString().replace(/\D/g, '')
    ).slice(0, 12);

  const meta = {
    feedUid: FEED_UID,
    generatedAt: now.toISOString(),
    assetVersion,
    counts: {
      records: posts.length,
      all: events.length,
      rehearsals: rehearsals.length,
      concerts: concerts.length,
      meetings: meetings.length,
      other: other.length,
      cancelled: events.filter((event) => event.cancelled).length,
    },
  };

  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  await mkdir(path.join(outDir, 'assets'), { recursive: true });

  await Promise.all([
    copyFile('site-assets/calendar.css', path.join(outDir, 'assets', 'calendar.css')),
    copyFile('site-assets/calendar.js', path.join(outDir, 'assets', 'calendar.js')),
    copyFile('site-assets/calendar.runtime.js', path.join(outDir, 'assets', 'calendar.runtime.js')),
    cp('site-assets/jean', path.join(outDir, 'assets', 'jean'), { recursive: true }),
    writeFile(path.join(outDir, 'all.ics'), calendarToIcs(events, CALENDAR_NAME, now), 'utf8'),
    writeFile(path.join(outDir, 'rehearsals.ics'), calendarToIcs(rehearsals, `${CALENDAR_NAME} — Репетиции`, now), 'utf8'),
    writeFile(path.join(outDir, 'concerts.ics'), calendarToIcs(concerts, `${CALENDAR_NAME} — Концерты`, now), 'utf8'),
    writeFile(path.join(outDir, 'meetings.ics'), calendarToIcs(meetings, `${CALENDAR_NAME} — Собрания`, now), 'utf8'),
    writeFile(path.join(outDir, 'other.ics'), calendarToIcs(other, `${CALENDAR_NAME} — Другие события`, now), 'utf8'),
    writeFile(path.join(outDir, 'meta.json'), JSON.stringify(meta, null, 2) + '\n', 'utf8'),
    writeFile(
      path.join(outDir, 'meta.js'),
      `window.HSE_ORCHESTRA_CALENDAR_META = ${JSON.stringify(meta)};\n`,
      'utf8',
    ),
    writeFile(
      path.join(outDir, 'asset-manifest.json'),
      JSON.stringify(
        {
          version: assetVersion,
          generatedAt: meta.generatedAt,
        },
        null,
        2,
      ) + '\n',
      'utf8',
    ),
    writeFile(
      path.join(outDir, 'asset-manifest.js'),
      `window.HSE_ORCHESTRA_ASSET_MANIFEST = ${JSON.stringify({
        version: assetVersion,
        generatedAt: meta.generatedAt,
      })};\n`,
      'utf8',
    ),
    writeFile(path.join(outDir, 'index.html'), htmlPage(meta), 'utf8'),
    writeFile(path.join(outDir, '.nojekyll'), '', 'utf8'),
  ]);

  return { posts, events, meta };
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : '';

if (invokedFile && path.resolve(currentFile) === invokedFile) {
  generate()
    .then(({ meta }) => {
      console.log(JSON.stringify(meta, null, 2));
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
