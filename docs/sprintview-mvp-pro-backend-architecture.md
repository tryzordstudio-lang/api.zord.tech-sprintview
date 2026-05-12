# SprintView - MVP Pro Backend Architecture

- Product: `SprintView`
- Version: `MVP Pro Backend v2.0`
- Document Type: `Backend Architecture & Technical Specification`
- Category: `AI-Powered Sprint Intelligence Platform`

## 1. Backend Vision

SprintView's backend is designed as an AI-native platform for:

- Sprint intelligence
- Stakeholder reporting
- Jira integrations
- AI insight generation
- Analytics processing

Primary backend goals:

- Scalability
- Modularity
- Clean APIs
- Async processing
- Enterprise-grade security
- Rapid MVP delivery

## 2. Backend Objectives

The MVP backend must:

- Support Jira OAuth integration
- Import Jira sprint data
- Generate AI summaries and insights
- Calculate sprint health scores
- Generate downloadable PDFs
- Serve public stakeholder reports
- Enforce multi-tenant isolation
- Scale horizontally
- Support future analytics expansion

## 3. High-Level Architecture

```text
Next.js Frontend
        |
        v
Express API Server
        |
        v
Core Business Services
        |
        v
MongoDB Database
        |
        +--> Gemini AI Services
        +--> Jira APIs
        +--> PDF Generation Service
        +--> Local File Storage
        +--> Redis / BullMQ Workers
```

## 4. Recommended Backend Stack

| Layer | Technology |
| --- | --- |
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB |
| ODM | Mongoose |
| Authentication | JWT |
| AI Provider | Gemini API |
| Queue System | BullMQ |
| Cache | Redis |
| PDF Engine | Puppeteer |
| File Storage | Local filesystem (`generated/`) |
| Validation | Zod |
| Logging | Pino |
| API Docs | Swagger / OpenAPI |
| Deployment | Railway or container hosting |

## 5. Architecture Style

### Pattern

`Modular Monolith`

### Why This Fits The MVP

- Faster development
- Simpler deployment
- Lower infrastructure complexity
- Easier debugging
- Clear path to future service extraction

This structure keeps the initial platform lean while preserving module boundaries for later migration into microservices if scale or team size requires it.

## 6. Project Structure

```text
src/
  config/
  modules/
    auth/
    jira/
    sprint/
    insights/
    ai/
    reports/
    pdf/
    users/
  middleware/
  utils/
  services/
  queues/
  workers/
  models/
  routes/
  validators/
  types/
  app.js
```

## 7. Core Backend Modules

### 7.1 Authentication Module

Responsibilities:

- Signup
- Login
- Refresh tokens
- Logout
- Session validation

Endpoints:

| Endpoint | Method |
| --- | --- |
| `/api/v1/auth/signup` | `POST` |
| `/api/v1/auth/login` | `POST` |
| `/api/v1/auth/refresh` | `POST` |
| `/api/v1/auth/logout` | `POST` |

JWT strategy:

| Token | Expiry | Storage |
| --- | --- | --- |
| Access token | 15 minutes | HttpOnly cookie |
| Refresh token | 30 days | Database, hashed or encrypted |

Implementation details:

- Password hashing with `bcrypt`
- Auth middleware: `verifyJWT`
- Secure cookies in production
- Device/session revocation supported through refresh token persistence

### 7.2 Jira Integration Module

Responsibilities:

- OAuth handling
- Token management
- Sprint importing
- Issue fetching

OAuth type:

- `OAuth 2.0 (3LO)` via Atlassian

OAuth flow:

```text
Frontend connect request
        |
        v
Atlassian OAuth redirect
        |
        v
Authorization code
        |
        v
Backend token exchange
        |
        v
Encrypted token storage
```

Jira APIs used:

| Purpose | Endpoint |
| --- | --- |
| Get boards | `/rest/agile/1.0/board` |
| Get sprints | `/rest/agile/1.0/board/{id}/sprint` |
| Get sprint issues | `/rest/agile/1.0/sprint/{id}/issue` |

Token refresh workflow:

```text
Expired token
   |
   v
Refresh token used
   |
   v
New access token issued
   |
   v
Retry Jira API request
```

### 7.3 Sprint Module

Responsibilities:

- Sprint import
- Sprint retrieval
- Sprint updates
- Sprint analytics
- Public report generation

Lifecycle:

```text
Import sprint
   |
   v
Create stories
   |
   v
Generate metrics
   |
   v
Generate AI summary
   |
   v
Generate insights
   |
   v
Generate share token
   |
   v
Publish report
```

Endpoints:

| Endpoint | Method |
| --- | --- |
| `/api/v1/sprints/import` | `POST` |
| `/api/v1/sprints/:id` | `GET` |
| `/api/v1/sprints/:id/delete` | `DELETE` |
| `/api/v1/sprints/:id/retry-ai` | `POST` |

### 7.4 AI Intelligence Module

This is the core backend intelligence layer.

Responsibilities:

- AI summaries
- Sprint intelligence
- Blocker analysis
- Workload analysis
- Health scoring
- Recommendations

Pipeline:

```text
Sprint data
   |
   v
Metrics aggregation
   |
   v
Prompt construction
   |
   v
Gemini API request
   |
   v
Insight classification
   |
   v
Database persistence
```

AI tasks:

| Task | Purpose |
| --- | --- |
| Executive summary | Stakeholder-facing summary |
| Risk detection | Delivery analysis |
| Productivity analysis | Team performance review |
| Sprint health score | Sprint scoring |
| Recommendations | Suggested actions |

Recommended model:

- `gemini-1.5-flash`

Services:

| Service | Purpose |
| --- | --- |
| `SummaryService` | Executive summaries |
| `InsightService` | Insight generation |
| `HealthService` | Health scoring |
| `RecommendationService` | AI recommendations |

Sprint health formula:

```text
HealthScore = 100 - (Blocked × 10) - (Pending × 2) + (Completed × 1.5)
```

Health bands:

| Score | Status |
| --- | --- |
| 80-100 | Healthy |
| 60-79 | Moderate Risk |
| 0-59 | High Risk |

### 7.5 Insight Engine

Responsibilities:

- Sprint risks
- Bottlenecks
- Workload insights
- Delivery intelligence
- Sprint recommendations

Insight categories:

| Type | Example |
| --- | --- |
| Risk | `Delivery risk elevated.` |
| Productivity | `Backend tasks complete faster.` |
| Workload | `Assignee overload detected.` |
| Velocity | `Sprint completion below target.` |

Workflow:

```text
Sprint metrics
   |
   v
Rule engine
   |
   v
Gemini AI enhancement
   |
   v
Severity classification
   |
   v
Save insights
```

### 7.6 PDF Generation Service

Responsibilities:

- Generate PDFs
- Render stakeholder reports
- Upload generated files

Workflow:

```text
Report HTML
   |
   v
Puppeteer render
   |
   v
Generate PDF
   |
   v
Write to local storage
   |
   v
Return download URL
```

Libraries:

| Library | Purpose |
| --- | --- |
| `puppeteer` | HTML rendering |
| `pdf-lib` | Post-processing and manipulation |

### 7.7 Public Report Service

Responsibilities:

- Validate share tokens
- Render public reports
- Isolate tenant data

Public URL:

```text
/report?token=<share_token>
```

Workflow:

```text
Validate share token
   |
   v
Fetch sprint data
   |
   v
Fetch insights
   |
   v
Render public report
```

### 7.8 Queue And Background Jobs

Why queues are required:

- AI generation is slow and bursty
- PDF rendering is CPU-intensive
- Background processing prevents request blocking and API timeouts

Stack:

- `BullMQ` + `Redis`

Queue jobs:

| Job | Purpose |
| --- | --- |
| Summary job | AI summary generation |
| Insight job | AI insight generation |
| PDF job | PDF generation |
| Retry job | Failed job retry |

Workflow:

```text
API request
   |
   v
Queue job created
   |
   v
Worker processes job
   |
   v
Store results
```

## 8. MongoDB Architecture

### Why MongoDB

MongoDB fits SprintView because:

- Sprint data is semi-structured
- Insight schemas will evolve
- AI responses vary dynamically
- Flexible document storage helps the MVP move quickly

### Collections

| Collection | Purpose |
| --- | --- |
| `users` | User accounts |
| `projects` | Projects and tenant scoping |
| `sprints` | Sprint reports |
| `stories` | Sprint tasks |
| `insights` | AI insights |
| `reports` | Public reports and generated assets |

### Multi-Tenant Clarification

The original MVP goals require tenant isolation, so core collections should include a tenant-scoping field such as `workspaceId` or `organizationId`. This should be enforced in:

- Query filters
- Index definitions
- Access-control middleware
- Public report validation

### Sample User Schema

```json
{
  "_id": "ObjectId",
  "workspaceId": "ObjectId",
  "email": "string",
  "passwordHash": "string",
  "jiraConnected": true,
  "jiraAccessToken": "encrypted",
  "jiraRefreshToken": "encrypted",
  "jiraCloudId": "string",
  "createdAt": "date"
}
```

### Sample Sprint Schema

```json
{
  "_id": "ObjectId",
  "workspaceId": "ObjectId",
  "projectId": "ObjectId",
  "sprintNumber": 12,
  "aiSummary": "string",
  "healthScore": 82,
  "deliveryRisk": "low",
  "recommendations": [],
  "shareToken": "string",
  "createdBy": "ObjectId",
  "createdAt": "date"
}
```

### Sample Story Schema

```json
{
  "_id": "ObjectId",
  "workspaceId": "ObjectId",
  "sprintId": "ObjectId",
  "name": "string",
  "status": "done",
  "assignee": "string",
  "storyPoints": 5
}
```

### Sample Insight Schema

```json
{
  "_id": "ObjectId",
  "workspaceId": "ObjectId",
  "sprintId": "ObjectId",
  "type": "risk",
  "severity": "high",
  "content": "Delivery risk elevated",
  "createdAt": "date"
}
```

## 9. Redis Architecture

Redis responsibilities:

| Use Case | Purpose |
| --- | --- |
| Queue processing | BullMQ |
| Rate limiting | API protection |
| Caching | Sprint caching |
| Session cache | Token validation and revocation support |

## 10. Local Storage Architecture

Stored assets:

- Generated PDFs
- Exported reports
- Report assets

Suggested folder structure:

```text
/reports/
/pdfs/
/assets/
```

## 11. Security Architecture

Required controls:

| Control | Required |
| --- | --- |
| JWT authentication | Yes |
| Password hashing | Yes |
| OAuth token encryption | Yes |
| API rate limiting | Yes |
| HTTPS everywhere | Yes |
| Input validation | Yes |
| Secure cookies | Yes |

Rate limiting baseline:

- `100 requests / 15 minutes` per user or IP

Validation:

- `Zod` for request parsing and schema enforcement

Additional implementation notes:

- Encrypt Jira OAuth tokens at rest
- Hash refresh tokens where feasible
- Rotate JWT secrets through environment-managed config
- Use signed share tokens or unguessable random tokens for public reports

## 12. API Architecture

Base URL:

```text
/api/v1
```

Authentication APIs:

| Endpoint | Method |
| --- | --- |
| `/auth/signup` | `POST` |
| `/auth/login` | `POST` |
| `/auth/refresh` | `POST` |
| `/auth/logout` | `POST` |

Jira APIs:

| Endpoint | Method |
| --- | --- |
| `/jira/connect` | `GET` |
| `/jira/callback` | `GET` |
| `/jira/boards` | `GET` |
| `/jira/sprints` | `GET` |
| `/jira/import` | `POST` |

Sprint APIs:

| Endpoint | Method |
| --- | --- |
| `/sprints/import` | `POST` |
| `/sprints/:id` | `GET` |
| `/sprints/:id/delete` | `DELETE` |
| `/sprints/:id/retry-ai` | `POST` |

Report APIs:

| Endpoint | Method |
| --- | --- |
| `/report/:token` | `GET` |
| `/report/:id/pdf` | `GET` |

Standard success response:

```json
{
  "success": true,
  "data": {},
  "message": "Operation successful"
}
```

Standard error response:

```json
{
  "success": false,
  "error": {
    "code": "SPRINT_NOT_FOUND",
    "message": "Sprint does not exist"
  }
}
```

## 13. Logging And Monitoring

Logging:

- `Pino`

Monitoring and alerting:

| Tool | Purpose |
| --- | --- |
| Sentry | Error tracking |
| Grafana | Metrics dashboards |
| Prometheus | System and service metrics |

## 14. Deployment Architecture

Frontend:

- `Vercel`

Backend:

- `Railway` for faster MVP deployment
- Container hosting later if stricter infrastructure control is needed

Managed infrastructure:

- `MongoDB Atlas`
- `Upstash Redis`
- Attached disk or local persistent volume for generated files

## 15. Performance Optimization

| Optimization | Purpose |
| --- | --- |
| Redis caching | Faster API responses |
| Queue jobs | Async AI processing |
| Database indexing | Faster queries |
| Pagination | Large dataset handling |

Recommended indexes:

| Collection | Index |
| --- | --- |
| `sprints` | `workspaceId, createdBy, createdAt` |
| `stories` | `workspaceId, sprintId` |
| `insights` | `workspaceId, sprintId` |
| `reports` | `workspaceId, shareToken` |

## 16. Scalability Strategy

Scaling path:

```text
Single backend instance
        |
        v
Multiple API instances
        |
        v
Dedicated queue workers
        |
        v
Microservice extraction
```

Future expansion targets:

- Analytics pipelines
- Predictive AI
- Real-time collaboration
- Organization workspaces
- Large-scale reporting

## 17. Final Backend Philosophy

SprintView backend should provide:

- AI-native architecture
- Enterprise-grade backend foundations
- Scalable async processing
- Secure multi-tenant isolation
- Flexible MongoDB schemas
- Modern Node.js ecosystem
- Production-ready SaaS backend design

The architecture should remain lean enough for rapid MVP execution while still being structured for later hardening, scaling, and service extraction.

## 18. Suggested Build Order

To reduce delivery risk, implementation should proceed in this order:

1. Authentication and tenant model
2. Jira OAuth and board/sprint import
3. Sprint persistence and metrics generation
4. AI summary and insight jobs
5. Public report rendering
6. PDF generation and local file storage
7. Caching, rate limiting, and observability hardening
