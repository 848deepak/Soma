# Security & Privacy

## 1. Principles

- Privacy by design
- End-to-end encryption (in transit)
- Sensitive data encrypted at rest
- Minimal data collection
- User-controlled sharing

## 2. Authentication

- Supabase Auth (JWT)
- Secure session management
- Passwords hashed (bcrypt)

## 3. Authorization

- Role-based access (user, partner, admin)
- Row-level security (RLS) enforced in DB

## 4. Data Protection

- All PII encrypted at rest
- TLS for all network traffic
- Regular security audits

### HIPAA-style Encryption Verification

- Runtime verifier: `src/services/encryptionService/hipaaCompliance.ts`
- Verified controls:
	- AES-256-GCM algorithm in use (NIST-approved)
	- 96-bit IV length and per-encryption randomness
	- Auth tag rejection for tampered ciphertext
	- Round-trip integrity and no plaintext leak in payload format
	- Key persistence behavior through SecureStore-backed key reload

### Key Rotation Guidance

- Recommended baseline rotation cadence: every 90 days
- Immediate rotation triggers:
	- Suspected key exposure
	- Device compromise report
	- Major security incident response

## 5. Emergency/Edge Cases

- SOS works offline (caches, retries)
- No sensitive data in notifications

## 6. Trust & Transparency

- Open source codebase
- Clear privacy policy
- User can delete account/data anytime

## 7. Why This Matters

Women’s safety apps must earn user trust. Security and privacy are non-negotiable for adoption and impact.
