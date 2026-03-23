# Software Requirements Specification (SRS)

## 1. Introduction

SOMA is a mobile-first safety and well-being platform for women, integrating emergency response, health tracking, and trusted networks.

## 2. Overall Description

- **User Types:** Woman, Partner/Trusted Contact, Admin/NGO
- **Platforms:** iOS, Android (React Native/Expo)
- **Data Storage:** Supabase (Postgres)
- **Authentication:** Supabase Auth

## 3. Functional Requirements

- User registration/login (email, social)
- SOS alert with location
- Partner linking/invitation
- Daily check-in & symptom log
- Cycle tracking & predictions
- Insights dashboard
- Secure data storage & privacy controls
- Notification system (push/email)

## 4. Non-Functional Requirements

- High reliability (esp. for SOS)
- Low-latency notifications
- Data encryption (at rest & in transit)
- Accessibility (WCAG compliance)
- Offline support for critical features
- Scalability for user growth

## 5. System Interfaces

- Supabase API (auth, db, realtime)
- Push notification service
- (Planned) Chat/AI assistant API

## 6. Security & Privacy

- GDPR-compliant data handling
- User-controlled data sharing
- Secure authentication & session management

## 7. Constraints

- Mobile device limitations
- Network variability

## 8. Future Enhancements

- Real-time chat/help
- AI safety assistant
- Community features
