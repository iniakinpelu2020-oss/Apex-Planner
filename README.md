# Apex Planner

Tasks, habits and a weekly timetable that live entirely on this device. Vanilla HTML/CSS/JS with
relative `./` paths, so it runs from `/apps/planner/` inside the ApexOS bundle and works offline.

## Run

```sh
python3 -m http.server 8080
# then open http://127.0.0.1:8080/
```

## Views

- **Today** — what is due or overdue right now, habits still unlogged, and the blocks scheduled for
  today's weekday. This is the view to land on.
- **Tasks** — add a task with an optional due date and priority; filter by open / overdue / done / all.
  Ordering is priority first, then due date, then creation time.
- **Habits** — one row per habit with the last seven days as toggles (today is the last button) and a
  current streak. A streak counts consecutive logged days ending today, or ending yesterday if today
  is not logged yet, so it does not look broken before you have checked in.
- **Timetable** — weekly recurring blocks: weekday, start, optional end, title. The current weekday is
  highlighted.

## Storage

One `localStorage` key, `apex.planner.v1`:

```json
{
  "tasks":  [{ "id": "…", "title": "…", "due": "2026-11-20", "prio": "high", "done": false, "created": 1763472000000 }],
  "habits": [{ "id": "…", "name": "…", "log": { "2026-11-18": true } }],
  "slots":  [{ "id": "…", "day": 0, "start": "09:00", "end": "10:00", "title": "…" }]
}
```

Days are `0`–`6` for Monday–Sunday. Dates are local `YYYY-MM-DD` strings, compared as strings, so no
timezone drift. Apex Backup picks this key up automatically.

## Bundling into ApexOS

Roster entry `Apex-Planner planner`. Keep paths relative and bump `CACHE` in `sw.js`
(`apex-planner-v1`) when shell files change.
