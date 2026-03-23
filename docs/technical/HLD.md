# High Level Design (HLD)

## 1. Architecture Overview

- **Client:** React Native (Expo, TypeScript)
- **Backend:** Supabase (Postgres, Auth, Realtime)
- **Notifications:** Expo Push, Email
- **Planned:** WebSockets/Firebase for chat

## 2. Major Components

- **Authentication:** Secure login/signup, session management
- **SOS Module:** One-tap alert, location sharing, partner notification
- **Partner Linking:** Invite/accept, status sharing
- **Daily Log:** Mood, symptoms, notes
- **Cycle Tracker:** Period prediction, health tips
- **Insights Dashboard:** Data visualization, trends
- **Notification System:** Push/email alerts
- **Planned:** Chat/help, AI assistant

## 3. Data Flow

1. User action (e.g., SOS) triggers API call
2. Data stored in Supabase
3. Notification sent to partner(s)
4. UI updates in real-time (Supabase Realtime)

## 4. Security

- All data encrypted in transit (TLS)
- Sensitive data encrypted at rest
- Role-based access (RLS policies)

## 5. Scalability

- Modular architecture
- Supabase auto-scaling
- Stateless client

## 6. Diagrams

> _Add sequence and component diagrams in `/docs/design/`_
