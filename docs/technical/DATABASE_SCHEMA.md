# Database Schema

## 1. User

- id (UUID, PK)
- name (string)
- email (string, unique)
- password_hash (string)
- role (enum: user, partner, admin)
- partner_id (UUID, FK)

## 2. SOS

- id (UUID, PK)
- user_id (UUID, FK)
- timestamp (datetime)
- location (geopoint)
- status (enum: active, resolved)

## 3. Log

- id (UUID, PK)
- user_id (UUID, FK)
- date (date)
- symptoms (json)
- notes (string)

## 4. Cycle

- id (UUID, PK)
- user_id (UUID, FK)
- start_date (date)
- end_date (date)
- predictions (json)

## 5. Notification

- id (UUID, PK)
- user_id (UUID, FK)
- type (enum: push, email)
- status (enum: sent, delivered, failed)

## 6. Security

- All sensitive data encrypted at rest
- RLS policies for row-level access

> _See `/supabase/schema.sql` for implementation_
