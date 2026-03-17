# Workshop Control Platform (WCP)
## Improved Master Plan v2.0

---

# 1. Executive Summary

## 1.1 Vision Statement
Build a **transaction-controlled, audit-first workshop management platform** that eliminates fraud, ensures accountability, and provides real-time operational intelligence for fleet and asset maintenance operations.

## 1.2 Core Platform Pillars
| Pillar | Description | Priority |
|--------|-------------|----------|
| **Audit-First Architecture** | Immutable audit trails on every transaction | Critical |
| **Anti-Fraud Controls** | 2-person verification, duplicate detection, risk scoring | Critical |
| **Evidence-Backed Transactions** | Mandatory photo capture with EXIF validation | High |
| **State Machine Architecture** | Guarded state transitions with immutable logs | Critical |
| **Mobile-First Offline PWA** | Offline-capable for field operations | High |

## 1.3 Platform Metrics
| Metric | Target |
|--------|--------|
| Implementation Timeline | **32 weeks** (reduced from 40) |
| MVP Delivery | **Week 12** (core operational capability) |
| Full Production | **Week 32** |
| Sprint Count | 16 sprints (2 weeks each) |
| Team Size | 8-10 developers |

---

# 2. Phased Delivery Approach

## 2.1 Phase Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         WCP IMPLEMENTATION ROADMAP                           │
├─────────────────┬─────────────────┬─────────────────┬─────────────────────┤
│    PHASE 1      │    PHASE 2      │    PHASE 3      │      PHASE 4        │
│    FOUNDATION   │    CORE OPS     │    PROCUREMENT  │    ENTERPRISE       │
│    Weeks 1-6    │    Weeks 7-18   │    Weeks 19-26  │    Weeks 27-32      │
├─────────────────┼─────────────────┼─────────────────┼─────────────────────┤
│ ✓ Environment   │ ✓ Job Cards     │ ✓ PR/PO Flow    │ ✓ SAP Integration   │
│ ✓ Auth System   │ ✓ Material Req  │ ✓ GRN/Invoice   │ ✓ Advanced KPIs     │
│ ✓ Asset Mgmt    │ ✓ Material Issue│ ✓ Budget Ctrl   │ ✓ Disaster Recovery │
│ ✓ Base Schema   │ ✓ Inventory     │ ✓ Supplier Mgmt │ ✓ Full Security     │
│                 │ ✓ Approvals     │ ✓ LPA/HOP       │ ✓ Go-Live           │
├─────────────────┼─────────────────┼─────────────────┼─────────────────────┤
│  MVP Core      │   MVP Complete  │  Procurement    │   Production        │
│  Infrastructure │   & Operational │  Ready          │   Ready             │
└─────────────────┴─────────────────┴─────────────────┴─────────────────────┘
```

## 2.2 Phase Details

### Phase 1: Foundation (Weeks 1-6)
**Goal:** Establish development infrastructure and core platform foundation

| Sprint | Focus | Key Deliverables | Exit Criteria |
|--------|-------|------------------|---------------|
| 1 | Environment Setup | DEV/UAT/PROD environments, CI/CD pipeline, Docker setup | All environments operational |
| 2 | Auth & Users | JWT authentication, user management, role system, device fingerprinting | Login/logout working |
| 3 | Database Core | Full schema deployment, audit tables, Prisma migrations, seed data | Schema deployed to all envs |

**Phase 1 Dependencies:**
```
Environment → Auth System → Database Schema
```

### Phase 2: Core Operations (Weeks 7-18)
**Goal:** Deliver MVP with core operational capability

| Sprint | Focus | Key Deliverables | Exit Criteria |
|--------|-------|------------------|---------------|
| 4 | Asset Management | Asset registration, QR codes, categories, meter readings | Assets can be created/scanned |
| 5 | Job Card Core | JC schema, state machine, create/submit workflow | JC lifecycle working |
| 6 | Job Card Approval | Approval queue, reject/return, SLA tracking, guards | End-to-end JC flow |
| 7 | Material Request | MR schema, stock reservations, state machine | MR linked to JC working |
| 8 | Material Issue | MI schema, counter locking, 2-person verification | Issue flow complete |
| 9 | Inventory Core | Stores, items, stock levels, WAC calculation | Stock management working |
| 10 | Returns & Tools | Return workflow, tool loan tracking | Full material lifecycle |
| 11 | Mobile PWA | Mobile screens, offline support, photo capture | Field-ready mobile app |
| 12 | Integration Test | End-to-end JC→MR→MI→Return, all guards tested | UAT ready |

**⚠️ MVP Milestone (Week 12):** Basic operational capability for pilot workshop

**Phase 2 Dependencies:**
```
Assets → Job Cards → Material Requests → Material Issues → Inventory
                          ↓
                    Approvals Engine
```

### Phase 3: Procurement (Weeks 19-26)
**Goal:** Complete procurement and purchase authority capabilities

| Sprint | Focus | Key Deliverables | Exit Criteria |
|--------|-------|------------------|---------------|
| 13 | PR Module | Purchase request creation, approval workflow | PR flow working |
| 14 | RFQ & Quotations | RFQ generation, supplier quotes, comparison | Quotation evaluation ready |
| 15 | Purchase Orders | PO generation, dispatch, acknowledgement | PO lifecycle complete |
| 16 | GRN & Invoice | 2-person GRN, 3-way match, payment approval | Procurement E2E working |
| 17 | Purchase Authority | LPA configuration, LP/HOP routing, privilege guards | Channel routing operational |
| 18 | Budget Control | Budget lines, commitments, variance alerts | Financial controls active |

**Phase 3 Dependencies:**
```
PR → RFQ → PO → GRN → Invoice
              ↓
        Budget Control → Purchase Authority
```

### Phase 4: Enterprise Ready (Weeks 27-32)
**Goal:** Production hardening and enterprise integration

| Sprint | Focus | Key Deliverables | Exit Criteria |
|--------|-------|------------------|---------------|
| 19 | External Repairs | Subcontracting, external job costing | External jobs tracked |
| 20 | PM & Downtime | Preventive maintenance, downtime tracking | PM scheduling active |
| 21 | Security Hardening | Rate limiting, device blocking, anti-tampering | Security audit passed |
| 22 | SAP Integration | HCM sync, MM sync, FICO integration points | Data flowing to SAP |
| 23 | DR & Backup | Backup automation, restore testing, DR plan | DR tested successfully |
| 24 | KPI & Reports | Dashboard, KPI engine, automated reports | Management visibility |
| 25 | Go-Live Prep | Performance tuning, documentation, training | Production ready |
| 26 | Production Deploy | Deployment, hypercare support | System live |

---

# 3. Module Dependency Map

## 3.1 Critical Path Analysis

```
                    ┌─────────────────────────────────────────────────────┐
                    │                  CRITICAL PATH                       │
                    └─────────────────────────────────────────────────────┘
                                              │
    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
    │  AUTH   │───▶│ ASSETS  │───▶│ JOB     │───▶│ MATERIAL│───▶│ INVENT- │
    │ SYSTEM  │    │  QR     │    │ CARDS   │    │ REQUEST │    │  ORY    │
    └─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
                                                       │              │
                                                       ▼              ▼
    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
    │ APPROV- │◀───│  WORK-  │◀───│  STATE  │◀───│ MATERIAL│◀───│  STOCK  │
    │ ALS     │    │  FLOW   │    │ MACHINE │    │  ISSUE  │    │ LEDGER  │
    └─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
                                                       │
                                                       ▼
    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
    │ BUDGET  │◀───│ INVOICE │◀───│   GRN   │◀───│   PO    │◀───│   PR    │
    │ CONTROL │    │ MATCH   │    │         │    │         │    │         │
    └─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
```

## 3.2 Module Dependency Matrix

| Module | Depends On | Blocks | Priority |
|--------|------------|--------|----------|
| Auth System | Environment | All modules | P0 |
| Asset Management | Auth | Job Cards | P0 |
| Job Cards | Assets, Auth | MR, MI, Approvals | P0 |
| Material Request | Job Cards | Material Issue | P0 |
| Material Issue | MR, Inventory | Stock Ledger | P0 |
| Inventory | Auth | MI, GRN | P0 |
| Approvals | Auth | JC, MR, PR | P0 |
| PR/PO | Inventory, Approvals | GRN, Budget | P1 |
| GRN | PO, Inventory | Invoice Match | P1 |
| Purchase Authority | PR/PO, Auth | Budget Control | P1 |
| Budget Control | PO, GRN | Invoice Payment | P1 |
| External Repairs | Job Cards | Costing | P2 |
| PM Scheduling | Assets, Job Cards | Downtime | P2 |
| SAP Integration | All core modules | - | P2 |
| KPI/Reports | All modules | - | P2 |

---

# 4. Technology Stack (Optimized)

## 4.1 Frontend Stack
| Layer | Technology | Rationale |
|-------|------------|-----------|
| Framework | **Next.js 16** with App Router | SSR, API routes, file-based routing |
| Language | TypeScript 5 | Type safety, better DX |
| Styling | TailwindCSS 4 + shadcn/ui | Rapid UI development, accessibility |
| State | Zustand (client) + TanStack Query (server) | Lightweight, optimized caching |
| Forms | React Hook Form + Zod | Schema validation, performance |
| PWA | next-pwa | Offline support, service workers |
| Mobile | Responsive PWA (no native) | Single codebase, faster delivery |

## 4.2 Backend Stack
| Layer | Technology | Rationale |
|-------|------------|-----------|
| Runtime | Node.js 20 LTS | Long-term support, performance |
| Framework | NestJS 10 | Modular architecture, DI, guards |
| ORM | Prisma 5 | Type-safe queries, migrations |
| Database | PostgreSQL 15 | ACID compliance, JSONB, partitioning |
| Cache/Locks | Redis 7 | Session cache, real-time locks, queues |
| Storage | MinIO (S3-compatible) | Document/photo storage |
| Queue | BullMQ | Background jobs, scheduled tasks |
| Real-time | Socket.IO | WebSocket for live updates |

## 4.3 Infrastructure
| Layer | Technology | Environment |
|-------|------------|-------------|
| Containerization | Docker + Compose | DEV, UAT |
| Orchestration | Kubernetes | PROD |
| Reverse Proxy | Nginx | All environments |
| CI/CD | GitHub Actions | Automated |
| Monitoring | Prometheus + Grafana | PROD |
| Backup | pgBackRest + S3 | PROD |

---

# 5. Database Design Principles

## 5.1 Core Principles
1. **UUID Primary Keys** - gen_random_uuid() for distributed-safe IDs
2. **Full Audit Trail** - created_at, updated_at, created_by, updated_by on every table
3. **Soft Deletes** - is_active/deleted_at to preserve audit history
4. **Decimal Precision** - DECIMAL(15,2) for all financial/quantity fields
5. **JSONB for Config** - Flexible configuration with GIN indexing
6. **Hash Chain Audit** - SHA-256 chain on audit_logs for tamper detection
7. **Table Partitioning** - High-volume tables (audit_logs, fuel_issues) partitioned by date

## 5.2 Key Domain Tables

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CORE DOMAIN TABLES                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ IDENTITY & AUTH                                                              │
│   users, roles, user_sessions, privilege_definitions, role_privilege_sets   │
├─────────────────────────────────────────────────────────────────────────────┤
│ ASSET MANAGEMENT                                                             │
│   assets, asset_categories, asset_meters, asset_qr_codes                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ JOB CARDS                                                                    │
│   job_cards, jc_tasks, jc_state_transitions, jc_cost_lines, jc_documents    │
├─────────────────────────────────────────────────────────────────────────────┤
│ MATERIAL MANAGEMENT                                                          │
│   material_requests, mr_lines, material_issues, mi_lines, stock_reservations│
├─────────────────────────────────────────────────────────────────────────────┤
│ INVENTORY                                                                    │
│   stores, items, store_stock, stock_transactions, store_counter_locks       │
├─────────────────────────────────────────────────────────────────────────────┤
│ PROCUREMENT                                                                  │
│   purchase_requests, purchase_orders, grn_headers, quotations, suppliers    │
├─────────────────────────────────────────────────────────────────────────────┤
│ PURCHASE AUTHORITY                                                           │
│   workshop_purchase_authority, lpa_change_history, pr_channel_decisions     │
├─────────────────────────────────────────────────────────────────────────────┤
│ AUDIT & SECURITY                                                             │
│   audit_logs, device_registry, integrity_checks, override_logs              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# 6. State Machine Architecture

## 6.1 Job Card State Machine

```
                              ┌─────────────────────────────────────┐
                              │          JOB CARD LIFECYCLE         │
                              └─────────────────────────────────────┘

    ┌─────────┐    submit    ┌─────────┐   approve   ┌──────────┐
    │  DRAFT  │─────────────▶│ PENDING │────────────▶│ APPROVED │
    └─────────┘              └─────────┘             └──────────┘
         │                        │                       │
         │ cancel                 │ reject                │ start
         ▼                        ▼                       ▼
    ┌──────────┐            ┌──────────┐           ┌─────────────┐
    │CANCELLED │            │ REJECTED │           │ IN PROGRESS │
    └──────────┘            └──────────┘           └─────────────┘
                                                        │    │
                                         hold           │    │ complete
                                         ┌──────────────┘    │
                                         ▼                   ▼
                                   ┌─────────┐         ┌───────────┐
                                   │ON HOLD  │         │ COMPLETED │
                                   └─────────┘         └───────────┘
                                                            │
                                                            │ close
                                                            ▼
                                                      ┌─────────┐
                                                      │ CLOSED  │
                                                      └─────────┘
```

## 6.2 Guard Enforcement

| Guard | Rule | Enforcement |
|-------|------|-------------|
| JC_ASSET_SCAN_REQUIRED | No JC without QR scan | Hard block at API |
| JC_SINGLE_OPEN_PER_ASSET | Only 1 open JC per asset | DB constraint + API |
| MR_REQUIRES_OPEN_JC | MR needs APPROVED/IN_PROGRESS JC | API guard |
| MR_SELF_APPROVAL_BLOCKED | Approver ≠ Requestor | DB constraint |
| MI_REQUIRES_APPROVED_MR | MI needs approved MR | API guard |
| MI_COUNTER_LOCK_REQUIRED | Redis lock before MI | Distributed lock |
| JC_CLOSE_OPEN_MR_BLOCK | No close with open MRs | API guard |
| JC_CLOSE_TOOL_RETURN_BLOCK | All tools returned | API guard |

---

# 7. Anti-Fraud Control Framework

## 7.1 Control Matrix

| Risk Area | Control | Detection | Escalation |
|-----------|---------|-----------|------------|
| Fictitious GRN | 2-person confirmation | Single-person blocked | Manager alert |
| Duplicate GRN | Supplier + delivery note unique check | Auto-detect on submit | Reject + alert |
| Fuel Theft | Meter + consumption norm check | Abnormal detection engine | Supervisor alert |
| Phantom Jobs | Asset QR scan mandatory | No QR = no JC | Hard block |
| Stock Manipulation | WAC frozen at issue time | Daily integrity check | Alert + lock |
| Photo Fabrication | Camera-only + EXIF check | Metadata validation | Flag + hold |
| Approval Bypass | State machine guards | Invalid transition reject | Hard block + log |
| Device Sharing | Fingerprint binding | Mismatch = session kill | Force re-auth |
| LPA Breach | Hard ceiling per approver | Real-time balance check | Block + HO notify |

## 7.2 Two-Person Verification Rules

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TWO-PERSON VERIFICATION WORKFLOW                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   TRIGGER: (qty × unit_cost) > threshold OR item in critical_items list    │
│                                                                              │
│   ┌─────────────┐        ┌─────────────┐        ┌─────────────┐            │
│   │ STOREKEEPER │───────▶│  VERIFIER   │───────▶│   CONFIRM   │            │
│   │  Creates MI │        │  Notified   │        │    or       │            │
│   └─────────────┘        └─────────────┘        │   DISPUTE   │            │
│          │                      │               └─────────────┘            │
│          │                      │                      │                    │
│          │                      │       ┌──────────────┘                    │
│          │                      │       │                                   │
│          │                      ▼       ▼                                   │
│          │               ┌──────────────────┐                               │
│          │               │  AUDIT LOG:      │                               │
│          │               │  - Storekeeper ID│                               │
│          │               │  - Verifier ID   │                               │
│          │               │  - Timestamps    │                               │
│          │               │  - Result        │                               │
│          │               └──────────────────┘                               │
│          │                                                                  │
│          └──────────────────▶ MI PAUSED if dispute ◀───────────────────────│
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# 8. Real-Time Events & Background Jobs

## 8.1 WebSocket Events

| Event | Subscribers | Action |
|-------|-------------|--------|
| `jc:status_changed` | JC team + supervisor | Push notification |
| `mr:submitted` | MR_APPROVE users | New approval badge |
| `mr:approved` | Requestor | Materials ready notification |
| `counter:locked` | All storekeepers | Counter status widget |
| `tool:overdue` | Technician + supervisor | Escalating alerts |
| `jc:sla_breach` | Supervisor + manager | SLA breach alert |
| `lpa:cap_warning` | Workshop Manager | Threshold alert (80%/90%/100%) |

## 8.2 Background Jobs (BullMQ)

| Job | Schedule | Purpose |
|-----|----------|---------|
| `sla-monitor` | Every 15 min | Check JC/MR SLA targets |
| `tool-loan-overdue` | Daily 08:00 | Scan overdue tools |
| `reservation-expiry` | Daily 07:00 | Check expiring reservations |
| `counter-lock-cleanup` | Every 5 min | Release abandoned locks |
| `stock-integrity-check` | Daily 02:00 | Validate stock balances |
| `lpa-monthly-reset` | 1st of month | Reset cumulative counters |
| `duplicate-issue-scan` | On MI confirm | Fraud detection |

---

# 9. Testing Strategy

## 9.1 Test Pyramid

```
                    ┌─────────────────────────────────────────┐
                    │            E2E TESTS (Playwright)        │
                    │   • Critical user journeys               │
                    │   • Cross-module integration             │
                    │   • Mobile responsive                    │
                    │   Coverage: Key workflows                │
                    └─────────────────────────────────────────┘
                              ▲
                    ┌─────────────────────────────────────────┐
                    │       INTEGRATION TESTS (Jest)           │
                    │   • API endpoint tests                   │
                    │   • State machine transitions            │
                    │   • Guard enforcement                    │
                    │   • WebSocket events                     │
                    │   Coverage: 80%                          │
                    └─────────────────────────────────────────┘
                              ▲
                    ┌─────────────────────────────────────────┐
                    │          UNIT TESTS (Jest)               │
                    │   • Service layer logic                  │
                    │   • Utility functions                    │
                    │   • State guards                        │
                    │   • Validation schemas                   │
                    │   Coverage: 90%                          │
                    └─────────────────────────────────────────┘
```

## 9.2 Test Milestones

| Phase | Test Focus | Coverage Target |
|-------|------------|-----------------|
| Sprint 6 | Unit tests for JC state machine | 80% |
| Sprint 12 | Integration tests for JC→MR→MI flow | 70% |
| Sprint 18 | E2E tests for procurement flow | Key workflows |
| Sprint 21 | Performance tests (load testing) | 1000 concurrent |
| Sprint 25 | Security tests (penetration) | All endpoints |

---

# 10. Deployment Strategy

## 10.1 Three-Environment Model

| Aspect | DEV | UAT | PROD |
|--------|-----|-----|------|
| Purpose | Development | Validation | Live |
| Data | Seed/dummy | Anonymized prod | Real |
| Deploy | Push to dev | PR merged | Tag release |
| Device Control | OFF | OFF | ON |
| Debug | ON | OFF | OFF |
| Backup | None | Weekly | Continuous |

## 10.2 CI/CD Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CI/CD PIPELINE                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   On PR:  lint ──▶ typecheck ──▶ unit tests ──▶ integration tests ──▶ build │
│                                                                              │
│   On Merge (main): all above ──▶ E2E tests ──▶ staging deploy ──▶ smoke     │
│                                                                              │
│   On Release: production build ──▶ safeguard check ──▶ blue/green ──▶ health│
│                                                                              │
│   Rollback: Previous image retained 7 days ──▶ one-command rollback         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 10.3 Pre-Deployment Safeguards
- No dev seed data in PROD
- No debug env vars in PROD
- All migrations applied
- Database backup verified
- Health checks passing

---

# 11. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Poor workshop connectivity | High | High | Offline-first PWA with IndexedDB |
| User resistance | Medium | High | UAT with real users, phased rollout |
| Data migration complexity | Medium | High | Dedicated scripts, parallel run |
| Scope creep | High | Medium | Strict backlog, MoSCoW prioritization |
| Performance at scale | Low | High | Load testing at Sprint 21, DB partitioning |
| PostgreSQL single-point-of-failure | Low | Critical | Streaming replication, auto-failover |
| Photo manipulation | Medium | High | EXIF validation, camera-only capture |
| Audit log tampering | Low | Critical | Hash chain, daily verification |
| LPA bypass via social engineering | Medium | High | Hard API enforcement, HO notification |

---

# 12. Success Metrics

## 12.1 Technical KPIs

| Metric | Target |
|--------|--------|
| API Response Time (P95) | < 200ms |
| Mobile App Load Time | < 3 seconds |
| Offline Sync Success Rate | > 99% |
| Test Coverage | > 80% |
| Zero Critical Security Issues | At go-live |

## 12.2 Business KPIs

| Metric | Target |
|--------|--------|
| Fraud Incidents Detected | > 90% |
| GRN Processing Time | < 15 minutes |
| Job Card SLA Compliance | > 95% |
| Material Issue Time | < 10 minutes |
| User Adoption Rate | > 90% in 3 months |

---

# 13. Team Structure

## 13.1 Recommended Team

| Role | Count | Responsibility |
|------|-------|----------------|
| Tech Lead | 1 | Architecture, code review, technical decisions |
| Backend Developers | 3 | NestJS modules, APIs, database |
| Frontend Developers | 3 | React/Next.js, mobile PWA, UI components |
| DevOps Engineer | 1 | CI/CD, infrastructure, monitoring |
| QA Engineer | 1 | Test automation, quality assurance |
| Product Owner | 1 | Requirements, prioritization, UAT |

## 13.2 Sprint Ceremonies

| Ceremony | Frequency | Duration |
|----------|-----------|----------|
| Sprint Planning | Every 2 weeks | 2 hours |
| Daily Standup | Daily | 15 minutes |
| Sprint Review | Every 2 weeks | 1 hour |
| Retrospective | Every 2 weeks | 1 hour |

---

# 14. Key Improvements from Original Plan

## 14.1 Timeline Optimization
- **Original:** 40 weeks (20 sprints)
- **Improved:** 32 weeks (16 sprints)
- **Savings:** 8 weeks (20% reduction)

## 14.2 Clearer Phasing
- **Original:** Multiple overlapping sprint tracks
- **Improved:** 4 sequential phases with clear dependencies

## 14.3 MVP Definition
- **Original:** No clear MVP milestone
- **Improved:** MVP at Week 12 (end of Phase 2)

## 14.4 Better Resource Utilization
- **Original:** Unclear resource allocation across parallel tracks
- **Improved:** Clear team focus per phase

## 14.5 Risk-Based Prioritization
- **Original:** All modules equal priority
- **Improved:** P0/P1/P2 priority system with critical path

---

# Appendix A: Sprint Backlog Template

| ID | Story | Priority | Story Points | Sprint |
|----|-------|----------|--------------|--------|
| JC-001 | Create job card with asset QR scan | P0 | 5 | 5 |
| JC-002 | Submit job card for approval | P0 | 3 | 5 |
| JC-003 | Approve/reject job card | P0 | 5 | 6 |
| MR-001 | Create material request from JC | P0 | 5 | 7 |
| MR-002 | Stock reservation on MR approval | P0 | 8 | 7 |
| MI-001 | Create material issue with counter lock | P0 | 8 | 8 |
| MI-002 | Two-person verification | P0 | 5 | 8 |

---

# Appendix B: Technology Decisions Log

| Decision | Options Considered | Chosen | Rationale |
|----------|-------------------|--------|-----------|
| Frontend Framework | React, Vue, Angular | Next.js 16 | SSR, API routes, App Router |
| Backend Framework | Express, NestJS, Fastify | NestJS | DI, guards, modular architecture |
| Database | MySQL, PostgreSQL, MongoDB | PostgreSQL | ACID, JSONB, partitioning |
| ORM | TypeORM, Prisma, Sequelize | Prisma | Type-safe, migrations, DX |
| Cache | Memcached, Redis | Redis | Data structures, persistence |
| Queue | RabbitMQ, BullMQ, Kafka | BullMQ | Redis-based, simple API |

---

**Document Version:** 2.0
**Last Updated:** 2024
**Status:** Ready for Implementation
