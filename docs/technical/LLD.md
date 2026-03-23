# Low Level Design (LLD)

## 1. Component Breakdown

- **AuthService:** Handles registration, login, session
- **SOSService:** Triggers SOS, shares location, notifies partner
- **PartnerService:** Manages invites, status, notifications
- **LogService:** Handles daily logs, symptom tracking
- **CycleService:** Predicts cycles, stores health data
- **InsightsService:** Aggregates and visualizes data
- **NotificationService:** Push/email integration

## 2. Key APIs

- `/auth/signup` – Register user
- `/auth/login` – Login user
- `/sos/trigger` – Send SOS
- `/partner/invite` – Invite partner
- `/log/create` – Add daily log
- `/cycle/update` – Update cycle info

## 3. Data Models

- **User:** id, name, email, role, partner_id
- **SOS:** id, user_id, timestamp, location, status
- **Log:** id, user_id, date, symptoms, notes
- **Cycle:** id, user_id, start_date, end_date, predictions
- **Notification:** id, user_id, type, status

## 4. Error Handling

- Graceful fallback for network errors
- Retry logic for critical actions (SOS)

## 5. Edge Cases

- SOS in low/no network: cache & retry
- Duplicate partner invites
- Data sync conflicts

## 6. Trust & Privacy

- User data access strictly controlled
- All actions logged for audit
