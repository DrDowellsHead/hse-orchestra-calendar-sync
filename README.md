# HSE Orchestra Calendar Sync

Публичный read-only источник подписных календарей HSE Orchestra.

Источник расписания — Tilda Custom Feed `464271385811`. GitHub Actions забирает записи из Tilda, разворачивает серии, применяет изменения отдельных повторов (переносы и отмены), генерирует `.ics` и публикует их в ветку `gh-pages`.

## Календарные URL

После однократного включения GitHub Pages из ветки `gh-pages` будут доступны:

- `https://drdowellshead.github.io/hse-orchestra-calendar-sync/all.ics` — всё расписание;
- `https://drdowellshead.github.io/hse-orchestra-calendar-sync/rehearsals.ics` — репетиции;
- `https://drdowellshead.github.io/hse-orchestra-calendar-sync/concerts.ics` — концерты;
- `https://drdowellshead.github.io/hse-orchestra-calendar-sync/meta.json` — техническая информация о последней генерации.

## Частота обновления

По расписанию workflow запускается 1-го и 16-го числа каждого месяца в 03:17 UTC. Это максимально близкий простой cron-вариант к запросу «каждые 15 дней»: GitHub cron не умеет выразить скользящий интервал ровно в 15×24 часа.

Также workflow можно запустить вручную через **Actions → Publish orchestra calendars → Run workflow**. Это полезно сразу после важной отмены или переноса.

## Серии и отдельные изменения

Логика совпадает с календарём на Tilda:

- `Тип записи = Серия` создаёт повторяющиеся события;
- `ID серии` связывает серию с её изменениями;
- `Тип записи = Изменение серии` + `Исходная дата` выбирают один конкретный повтор;
- `Действие = Отменить` публикует этот повтор в ICS с `STATUS:CANCELLED`;
- перенос сохраняет исходный UID события, но меняет дату/время/место.

За счёт стабильного UID календарные клиенты могут обновить существующее событие вместо создания дубля.

## Первое включение GitHub Pages

После первого успешного workflow:

1. Открыть **Settings → Pages**.
2. В **Build and deployment / Source** выбрать **Deploy from a branch**.
3. Выбрать ветку **gh-pages** и каталог **/(root)**.
4. Сохранить.

После этого URL выше станут постоянными адресами подписки.

## Структура

- `scripts/generate-calendar.mjs` — загрузка Tilda Feed, серии, переносы/отмены и генерация ICS;
- `scripts/generate-calendar.test.mjs` — тесты отмены, переноса и фильтров;
- `.github/workflows/publish-calendar.yml` — автоматическая публикация;
- `gh-pages` — генерируемая ветка, вручную её редактировать не нужно.
