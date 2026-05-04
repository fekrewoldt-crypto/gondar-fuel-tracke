# Security Considerations - Gondar Fuel Management System

## 1. Data Protection

### 1.1 Personal Data Classification

| Data Type | Classification | Storage | Access |
|-----------|---------------|---------|--------|
| Phone Number | PII | Encrypted at rest | User + Admin |
| Email | PII | Encrypted at rest | User + Admin |
| Location History | Sensitive PII | Encrypted, auto-delete after 90 days | User only |
| Fuel Reports | Public | Plain text | All authenticated users |
| Authentication Tokens | Sensitive | Redis (encrypted) | System only |
| Password Hashes | Critical | bcrypt (cost 12) | System only |

### 1.2 Data Encryption

**At Rest:**
- PostgreSQL TDE (Transparent Data Encryption)
- S3 bucket encryption (AES-256)
- Redis encryption enabled
- Backup encryption

**In Transit:**
- TLS 1.3 for all HTTP/WSS connections
- Certificate pinning for mobile apps
- HSTS enabled

### 1.3 Location Privacy

```typescript
// Location data is:
// 1. Validated to be within Gondar bounds
// 2. Rounded to 4 decimal places (~11m precision) before storage
// 3. Aggregated for analytics (individual tracks not stored)
// 4. Auto-deleted after 90 days

function sanitizeLocation(lat: number, lng: number): { lat: number; lng: number } {
  // Round to 4 decimal places for privacy
  return {
    lat: Math.round(lat * 10000) / 10000,
    lng: Math.round(lng * 10000) / 10000,
  };
}
```

---

## 2. Authentication & Authorization

### 2.1 Authentication Methods

**Primary: Phone + Password**
- Phone number as primary identifier (common in Ethiopia)
- Password requirements: min 8 chars, 1 uppercase, 1 number, 1 special char
- bcrypt hashing with cost factor 12
- Account lockout after 5 failed attempts (15 min cooldown)

**Secondary: OAuth 2.0**
- Google Sign-In supported
- Token validation with certificate verification
- Account linking with existing phone-based accounts

### 2.2 JWT Token Strategy

```
Access Token:
- Lifetime: 1 hour
- Contains: user_id, phone, role
- Used for: API requests

Refresh Token:
- Lifetime: 7 days
- Contains: user_id, token_family_id
- Used for: Getting new access tokens
- Stored in: Redis with blacklist capability
```

### 2.3 Role-Based Access Control (RBAC)

| Role | Permissions |
|------|-------------|
| `driver` | Submit reports, view all data, manage own profile |
| `station_owner` | All driver permissions + manage own stations |
| `moderator` | All station_owner permissions + verify reports, delete spam |
| `admin` | Full system access |

### 2.4 Session Management

- Concurrent session limit: 5 devices per user
- Session invalidation on password change
- Automatic logout after 30 days inactivity
- Device fingerprinting for anomaly detection

---

## 3. API Security

### 3.1 Rate Limiting

```yaml
Endpoints:
  POST /auth/login: 5 requests / 15 minutes
  POST /auth/register: 3 requests / hour
  POST /reports: 5 requests / hour (prevent spam)
  GET /stations: 100 requests / minute
  GET /analytics/*: 30 requests / minute
  
Global: 1000 requests / minute per IP
```

### 3.2 Input Validation

All inputs validated using Zod schemas:

```typescript
const reportSchema = z.object({
  station_id: z.string().uuid(),
  fuel_type: z.enum(['diesel', 'gasoline_95', 'gasoline_92', 'kerosene']),
  price: z.number().min(1).max(200), // Prevent unrealistic prices
  availability: z.enum(['full', 'limited', 'very_limited', 'out_of_stock']),
  location: z.object({
    latitude: z.number().min(12.55).max(12.65), // Gondar bounds
    longitude: z.number().min(37.42).max(37.50),
  }),
});
```

### 3.3 SQL Injection Prevention

- Parameterized queries only
- ORM (TypeORM) with prepared statements
- No raw SQL without explicit escaping

### 3.4 XSS Prevention

- Content-Security-Policy headers
- Input sanitization for text fields
- Output encoding in templates
- HTTP-only cookies (no localStorage for tokens if possible)

### 3.5 CORS Configuration

```typescript
{
  origin: ['https://gondarfuel.et', 'https://www.gondarfuel.et'],
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}
```

---

## 4. Fraud Prevention

### 4.1 Report Validation

**Automated Checks:**
- Price sanity check (±20% from station average)
- Location verification (user must be near station)
- Frequency limiting (max 5 reports/hour/user)
- Duplicate detection (same station within 30 minutes)

**Community Verification:**
- Reports require verification by other users
- Verified badge after 3+ confirmations
- Flag system for inaccurate reports
- Reputation score for users

### 4.2 Fake Report Detection

```python
def detect_suspicious_report(report, user_history):
    checks = {
        # User submitting too frequently
        'high_frequency': user_history.reports_last_hour > 5,
        
        # Price significantly different from station average
        'price_anomaly': abs(report.price - station.avg_price) > 15,
        
        # User far from station location
        'location_mismatch': distance(user.location, station.location) > 5000,
        
        # Pattern detection (same time every day)
        'bot_pattern': detect_bot_pattern(user_history),
        
        # New account with many reports
        'new_account_spam': user_account_age_days < 1 and reports_count > 10,
    }
    
    risk_score = sum(checks.values())
    return {
        'is_suspicious': risk_score >= 3,
        'risk_score': risk_score,
        'flags': [k for k, v in checks.items() if v]
    }
```

### 4.3 Reputation System

```
User Reputation Score (0-100):
- Base score: 50
- +5 for each verified report
- -10 for each flagged report
- -20 for confirmed fake report
- +2 for account age (per week, max 20)

Privileges by score:
- 0-30: Reports auto-flagged, limited to 2/hour
- 31-70: Normal privileges
- 71-100: Verified badge, reports auto-verified
```

---

## 5. Infrastructure Security

### 5.1 Network Security

```
┌─────────────────────────────────────────────────────────┐
│                    Cloudflare/WAF                        │
│  - DDoS protection                                      │
│  - Bot detection                                        │
│  - Rate limiting                                        │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   Private VPC                            │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │   Public    │    │  Private    │    │   Data      │ │
│  │  Subnet     │    │  Subnet     │    │   Subnet    │ │
│  │  (LB only)  │───▶│  (API)      │───▶│   (DB)      │ │
│  └─────────────┘    └─────────────┘    └─────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 5.2 Security Groups

| Resource | Inbound Rules |
|----------|---------------|
| Load Balancer | 443 (HTTPS) from 0.0.0.0/0 |
| API Servers | 3000 from LB only |
| Database | 5432 from API servers only |
| Redis | 6379 from API servers only |

### 5.3 Secrets Management

- AWS Secrets Manager / Azure Key Vault
- No secrets in code or .env files in production
- Automatic rotation every 90 days
- Audit logging for secret access

---

## 6. Monitoring & Incident Response

### 6.1 Security Monitoring

**Real-time Alerts:**
- Failed login attempts > 10/minute from single IP
- Unusual API traffic patterns
- Database connection anomalies
- Certificate expiration (30 days warning)

**Daily Reports:**
- New user registrations
- Report submission patterns
- Geographic distribution of access

### 6.2 Audit Logging

All sensitive actions logged:
- Authentication events (login, logout, password change)
- Data modifications (create, update, delete)
- Admin actions
- API errors (4xx, 5xx)

Log retention: 1 year minimum

### 6.3 Incident Response Plan

**Severity Levels:**

| Level | Description | Response Time |
|-------|-------------|---------------|
| P1 | Data breach, system compromise | Immediate (< 15 min) |
| P2 | Service outage, major bug | < 1 hour |
| P3 | Minor security issue | < 24 hours |
| P4 | Low-risk vulnerability | Next sprint |

**Breach Response:**
1. Contain: Isolate affected systems
2. Assess: Determine scope and impact
3. Notify: Inform affected users within 72 hours
4. Remediate: Fix vulnerability
5. Review: Post-incident analysis

---

## 7. Compliance Considerations

### 7.1 Ethiopian Data Protection

While Ethiopia doesn't have comprehensive data protection legislation yet, we follow best practices:
- Data minimization
- Purpose limitation
- User consent for data collection
- Right to data deletion

### 7.2 GDPR Alignment (for international users)

- Right to access personal data
- Right to rectification
- Right to erasure ("right to be forgotten")
- Data portability
- Privacy by design

---

## 8. Security Headers

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(self), camera=(), microphone=()
```

---

## 9. Dependency Management

**Automated Security Scanning:**
- Snyk integration in CI/CD
- Dependabot for automatic updates
- Weekly dependency audit

**Critical Dependency Policies:**
- No dependencies with known CVEs
- Pin all versions (no ^ or ~)
- Regular security reviews

---

## 10. Security Testing

### 10.1 Automated Testing

- SAST (Static Application Security Testing) in CI
- DAST (Dynamic Application Security Testing) in staging
- Dependency scanning on every commit

### 10.2 Manual Testing

- Quarterly penetration testing
- Annual third-party security audit
- Bug bounty program (after launch)

### 10.3 Test Coverage Requirements

- Authentication flows: 100%
- Authorization checks: 100%
- Input validation: 95%
- API endpoints: 90%

---

## 11. Emergency Contacts

| Role | Contact |
|------|---------|
| Security Lead | security@gondarfuel.et |
| On-call Engineer | +251-XXX-XXX-XXXX |
| Infrastructure | infra@gondarfuel.et |
| Legal | legal@gondarfuel.et |

---

## 12. Security Checklist (Pre-Launch)

- [ ] All endpoints have authentication
- [ ] Rate limiting configured
- [ ] Input validation on all endpoints
- [ ] HTTPS enforced everywhere
- [ ] Security headers configured
- [ ] Database backups tested
- [ ] Incident response plan documented
- [ ] Penetration test completed
- [ ] Dependencies audited
- [ ] Logging and monitoring active
- [ ] SSL certificates configured
- [ ] CORS properly configured
- [ ] Session management secure
- [ ] Password requirements enforced
- [ ] Error messages don't leak information
