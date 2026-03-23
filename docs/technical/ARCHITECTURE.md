# System Architecture

## 1. Overview

SOMA uses a modular, cloud-native architecture for reliability, scalability, and security.

## 2. Components

- **Mobile App:** React Native (Expo, TypeScript)
- **Backend:** Supabase (Postgres, Auth, Realtime)
- **Notifications:** Expo Push, Email
- **Planned:** WebSockets/Firebase for chat/help

## 3. Data Flow

- User actions trigger API calls
- Data stored in Supabase
- Realtime updates via Supabase Realtime
- Notifications sent to partners

## 4. Security

- End-to-end encryption (in transit)
- Sensitive data encrypted at rest
- Role-based access (RLS)

## 5. Scalability

- Supabase auto-scaling
- Stateless client
- Modular codebase

## 6. Diagrams

> _Add architecture diagrams in `/docs/design/`_
