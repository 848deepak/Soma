# Smart Calendar Architecture (SOMA)

## 1) Data model

### `public.smart_events`
- `id` uuid primary key
- `user_id` uuid fk to `auth.users`
- `title` text
- `start_time` timestamptz
- `end_time` timestamptz
- `type` (`manual` | `ai` | `log`)
- `location` text nullable
- `tags` text[]
- `participants` text[]
- `recurrence` jsonb
- `metadata` jsonb
- `created_at` / `updated_at`

### `public.smart_event_suggestions`
- `id` uuid primary key
- `user_id` uuid fk
- `title`, `rationale`
- `suggested_start_time`, `suggested_end_time`
- `confidence` numeric(4,3)
- `source` (`habit` | `mood` | `sleep` | `productivity`)
- `tags` text[]
- `created_at`

RLS policies are owner-scoped for select/insert/update/delete.

## 2) NLP parsing

Implemented in `src/features/smartCalendar/nlpParser.ts` using hybrid parsing:
- Regex date/time extraction
- Relative date logic (`today`, `tomorrow`, `next monday`, `next week`)
- Time formats (`7pm`, `19:00`, `noon`, `midnight`, ranges)
- Recurrence extraction (`every Friday`, `daily`, `weekdays`)
- Entity extraction (`with Rahul`, `at office`)
- Confidence + `needsReview` for editable correction path

## 3) UI component structure

Main screen: `src/screens/SmartCalendarScreen.tsx`
- Text-first event input with parse + create
- View switch: month/week/day/list
- Filter by event type (`all/manual/ai/log`)
- Pinch gesture to adjust density
- Today Intelligence panel (today + tomorrow + suggestions)

## 4) SOMA log integration

`src/features/smartCalendar/logIntegration.ts`
- Converts `daily_logs` rows into synthetic `type=log` calendar events
- Includes mood/check-in, sleep, hydration, and symptom summaries
- Merged with user-created events in chronological order

## 5) Example API endpoints

Suggested REST shape for backend service:
- `POST /api/calendar/parse` -> parse natural language to draft
- `POST /api/calendar/events` -> create manual/AI event
- `PATCH /api/calendar/events/:id` -> edit event
- `DELETE /api/calendar/events/:id` -> delete event
- `GET /api/calendar/events?start=YYYY-MM-DD&end=YYYY-MM-DD&types=manual,ai,log`
- `GET /api/calendar/today` -> today + tomorrow + merged intelligence bundle
- `GET /api/calendar/suggestions` -> ranked suggestions

## 6) Performance considerations

- Query windowed ranges only (not full history) for event listing
- Merge logs client-side for low-latency UX and reduced backend fanout
- React Query caching + periodic revalidation + realtime invalidation
- Event list uses FlatList virtualization
- Keep date math in local date semantics to avoid timezone drift

## 7) Edge cases handled

- Ambiguous input falls back to defaults and marks `needsReview`
- Invalid time tokens are ignored safely and default to 09:00-10:00
- Cross-midnight guard via DB check `end_time >= start_time`
- Empty user session returns empty dataset instead of crashing
- Recurrence extraction tolerates incomplete phrasing

## 8) Rollout steps

1. Apply migration:
	- `supabase db push` (or run [20260401101500_smart_calendar.sql](supabase/supabase/migrations/20260401101500_smart_calendar.sql) manually)
2. Verify RLS smoke test:
	- Authenticated user can CRUD only their own `smart_events`
	- Cross-user reads/updates are denied
3. Parser runtime:
	- API uses deterministic inbuilt parsing only (no external LLM dependency)
	- Parsing behavior is fully reproducible from request text and server date context
