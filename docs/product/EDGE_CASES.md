# Edge Cases & Emergency Scenarios

## 1. Low/No Network

- SOS and logs are cached locally and sent when connectivity is restored.
- User is notified if SOS could not be sent immediately.

## 2. App in Background/Locked

- SOS can be triggered via widget, notification, or hardware button (where supported).
- Critical notifications use high-priority push.

## 3. Device Battery Low

- App prompts user to enable battery saver mode for essential features.
- SOS works with minimal UI.

## 4. Partner Unavailable

- Escalate SOS to backup contacts or authorities if no response.

## 5. Data Privacy

- No sensitive data in notifications.
- User can delete all data at any time.

## 6. Trust & Safety

- All actions logged for audit (with user consent).
- User can review and control data sharing.

---

> _Edge cases are not afterthoughts—they are critical for real-world safety and trust._
