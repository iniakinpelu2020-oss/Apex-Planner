# Apex Planner

Timetable, tasks and habits, in one view instead of three apps.

**Status: not built.**

## What it should do

- A weekly timetable that looks like a school timetable, because that is what you actually
  read at a glance.
- Tasks with due dates, sorted by what is actually urgent.
- Habits as a row of dots per day — the whole value is seeing the streak.

## The constraint that shapes it

Notifications are the hard part, not storage. Firestore holds the data for free. Reminders
need either a web push service worker (works in Chrome on Android, unreliable elsewhere) or
WorkManager in an Android app. There is no free scheduled-server option on Spark, so a
reminder cannot be sent by Firebase itself.

## The design detail that matters

A habit tracker that loses a day because the phone was off is worse than useless. Derive
streaks from stored dates rather than incrementing a counter, so a missed sync repairs
itself instead of resetting a 40-day streak.

## What you need to do

1. Nothing new.

## First three steps

1. A timetable grid, stored locally, that scrolls and looks right on a phone.
2. Habits with date-based streaks and no notifications yet.
3. Tasks, then one reminder mechanism once the rest is actually being used.
