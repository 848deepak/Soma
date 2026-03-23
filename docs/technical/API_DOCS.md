# API Documentation

## Authentication

- `POST /auth/signup` – Register new user
- `POST /auth/login` – User login

## SOS

- `POST /sos/trigger` – Trigger SOS alert
- `GET /sos/history` – Get SOS history

## Partner

- `POST /partner/invite` – Invite partner
- `POST /partner/accept` – Accept invite
- `GET /partner/status` – Get partner status

## Daily Log

- `POST /log/create` – Add daily log
- `GET /log/history` – Get logs

## Cycle

- `POST /cycle/update` – Update cycle info
- `GET /cycle/predictions` – Get predictions

## Notifications

- `POST /notification/send` – Send notification

## Security

- All endpoints require authentication
- Data encrypted in transit
- Role-based access enforced

> _For detailed request/response schemas, see `/docs/technical/LLD.md`_
