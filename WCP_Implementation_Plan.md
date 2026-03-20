# WCP (Workshop Control Platform) Implementation Plan
## Comprehensive Roadmap for Gap Resolution & Feature Enhancement

---

# Executive Summary

This implementation plan addresses the identified gaps in the WCP webapp, organized by priority and dependency chains. The project currently has:

- **~90+ database models** (comprehensive Prisma schema)
- **~150+ API endpoints** (Next.js App Router)
- **~35+ UI view components** (React + shadcn/ui)

**Implementation Timeline:** 12-16 weeks (3-4 months) for all prioritized gaps

---

# Section 1: HIGH PRIORITY - Fix Existing Issues

## 1.1 Job Card Cost Report Verification

### Description
Verify the recently fixed Job Card Cost Report is functioning correctly with proper cost calculations and chart data.

### Tasks
| Task | Details | Effort |
|------|---------|--------|
| API Verification | Test `/api/reports/[reportId]/route.ts` for job-card-cost report | 2h |
| Cost Calculation Check | Verify Material + Labour + External + 10% Sundry formula | 4h |
| Chart Data Validation | Ensure costDistribution, topJobCards, costsByAsset data is correct | 3h |
| Frontend Integration Test | Test reports-view.tsx preview and export functionality | 2h |
| Edge Case Testing | Test with zero-cost JCs, missing data, negative variances | 3h |

### Dependencies
- None (standalone verification)

### Agent Assignment
- **Primary:** `wcp-specialist` - Domain knowledge for cost calculations
- **Support:** `test-engineer` - Test coverage and validation

### Skills to Use
- `wcp-workshop-expert` - Cost calculation formulas, field names
- `testing-patterns` - Unit test patterns for financial calculations
- `lint-and-validate` - Code quality verification

### Files Involved
```
/src/app/api/reports/[reportId]/route.ts
/src/components/wcp/reports-view.tsx
/src/lib/export-utils.ts
```

### Estimated Effort
**14 hours (2 days)**

---

## 1.2 CRUD Functionality for Saved Reports

### Description
Implement full Create, Read, Update, Delete functionality for saved reports in the Reports module.

### Tasks
| Task | Details | Effort |
|------|---------|--------|
| Database Schema | Create SavedReport model with filters, parameters, schedule | 3h |
| API Endpoints | Create CRUD endpoints for saved reports | 6h |
| UI Components | Add save dialog, load dialog, delete confirmation | 8h |
| Report Scheduler | Implement scheduled report generation (background jobs) | 8h |
| Email Integration | Send scheduled reports via email | 6h |

### Dependencies
- Section 1.1 (Job Card Cost Report must be verified)
- Email service infrastructure (Section 2.2)

### Agent Assignment
- **Primary:** `backend-specialist` - API and database design
- **Support:** `frontend-specialist` - UI components for save/load dialogs

### Skills to Use
- `database-design` - Schema design for SavedReport model
- `api-patterns` - REST API patterns for CRUD
- `wcp-workshop-expert` - Report types and data structures

### Files to Create/Modify
```
NEW: /prisma/schema.prisma (add SavedReport model)
NEW: /src/app/api/saved-reports/route.ts
NEW: /src/app/api/saved-reports/[id]/route.ts
NEW: /src/app/api/saved-reports/[id]/execute/route.ts
MODIFY: /src/components/wcp/reports-view.tsx
```

### Schema Addition
```prisma
model SavedReport {
  id              String   @id @default(cuid())
  name            String
  reportType      String   // job-card-cost, monthly-closed-jobs, etc.
  filters         String   // JSON string of filter parameters
  schedule        String?  // DAILY, WEEKLY, MONTHLY, QUARTERLY
  nextRunAt       DateTime?
  lastRunAt       DateTime?
  recipients      String?  // JSON array of email addresses
  format          String   @default("PDF") // PDF, EXCEL, CSV
  createdBy       String
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([reportType])
  @@index([createdBy])
  @@index([nextRunAt])
}
```

### Estimated Effort
**31 hours (4 days)**

---

## 1.3 Data Seeding for Demo/Testing

### Description
Create comprehensive seed data for demonstration, testing, and development purposes.

### Tasks
| Task | Details | Effort |
|------|---------|--------|
| Asset Seed Data | Create diverse assets across categories with realistic data | 4h |
| Job Card Scenarios | Seed JCs in all states with various priorities | 6h |
| Material Flow Data | Seed MR→MI→Return complete workflows | 6h |
| Procurement Data | Seed PR→RFQ→PO→GRN→Invoice chains | 6h |
| PM Schedules | Seed preventive maintenance schedules | 3h |
| Time Logs & Labour | Seed employee time logs for cost calculation testing | 4h |
| Demo User Accounts | Create demo users with different roles | 2h |

### Dependencies
- None (foundational task)

### Agent Assignment
- **Primary:** `backend-specialist` - Data relationships and seeding scripts
- **Support:** `wcp-specialist` - Domain knowledge for realistic data

### Skills to Use
- `database-design` - Data relationships
- `wcp-workshop-expert` - Domain-specific data patterns

### Files to Create/Modify
```
NEW: /prisma/seed-demo.ts
MODIFY: /prisma/seed.ts (integrate demo seed)
NEW: /prisma/seed-assets.ts
NEW: /prisma/seed-job-cards.ts
NEW: /prisma/seed-material-flow.ts
NEW: /prisma/seed-procurement.ts
```

### Seed Data Categories
```
Assets:
├── Heavy Equipment (Excavators, Loaders, Cranes)
├── Vehicles (Trucks, Vans, Pickups)
├── Light Equipment (Generators, Compressors)
└── Specialized Assets (-specific to workshop type)

Job Card States:
├── DRAFT (5)
├── PENDING (8)
├── APPROVED (10)
├── IN_PROGRESS (15)
├── COMPLETED (20)
├── CLOSED (25)
└── CANCELLED (5)

Material Scenarios:
├── Standard flow (MR → MI → Complete)
├── Partial fulfillment
├── Return flow
├── Emergency issue
└── High-value verification

Procurement Scenarios:
├── Local Purchase (below LPA)
├── HO Purchase (above LPA)
├── Emergency PR
├── 3-quote comparison
└── Invoice with variance
```

### Estimated Effort
**31 hours (4 days)**

---

# Section 2: HIGH PRIORITY - Core Enhancements

## 2.1 Budget Control: Budget vs Actual Reporting

### Description
Implement comprehensive budget control with commitment accounting, variance tracking, and alerts.

### Tasks
| Task | Details | Effort |
|------|---------|--------|
| Budget Schema | Create BudgetLine, BudgetTransaction models | 4h |
| Commitment Logic | Implement budget encumbrance on PO approval | 8h |
| Variance Tracking | Real-time budget vs actual calculations | 6h |
| Alert System | Budget threshold alerts (80%, 90%, 100%) | 4h |
| Dashboard Widgets | Budget overview and alerts widgets | 6h |
| API Endpoints | Budget CRUD and reporting APIs | 6h |
| UI Views | Budget management and reporting views | 8h |

### Dependencies
- Section 1.2 (Saved Reports for budget reports)
- Purchase Order module (existing)

### Agent Assignment
- **Primary:** `backend-specialist` - Budget logic and APIs
- **Support:** `frontend-specialist` - Budget dashboard widgets

### Skills to Use
- `database-design` - Budget schema design
- `api-patterns` - Financial API patterns
- `wcp-workshop-expert` - Procurement domain knowledge

### Files to Create/Modify
```
NEW: /prisma/schema.prisma (add BudgetLine, BudgetTransaction)
NEW: /src/app/api/budget/route.ts
NEW: /src/app/api/budget/[id]/route.ts
NEW: /src/app/api/budget/variance/route.ts
NEW: /src/app/api/budget/alerts/route.ts
NEW: /src/components/wcp/budget-view.tsx
MODIFY: /src/components/wcp/dashboard-view.tsx
MODIFY: /src/app/api/purchase-orders/[id]/route.ts (commitment logic)
```

### Schema Addition
```prisma
model BudgetLine {
  id              String   @id @default(cuid())
  code            String   @unique
  name            String
  department      String?
  financialYear   String
  originalAmount  Decimal
  revisedAmount   Decimal?
  committedAmount Decimal  @default(0)
  actualAmount    Decimal  @default(0)
  availableAmount Decimal  @default(0)
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  transactions    BudgetTransaction[]

  @@index([code])
  @@index([department])
  @@index([financialYear])
}

model BudgetTransaction {
  id              String   @id @default(cuid())
  budgetLineId    String
  transactionType String   // COMMITMENT, OBLIGATION, ACTUAL, RELEASE
  amount          Decimal
  referenceType   String?  // PO, GRN, INVOICE
  referenceId     String?
  description     String?
  createdAt       DateTime @default(now())

  budgetLine      BudgetLine @relation(fields: [budgetLineId], references: [id])

  @@index([budgetLineId])
  @@index([transactionType])
}
```

### Estimated Effort
**42 hours (5-6 days)**

---

## 2.2 Email Notifications System

### Description
Implement comprehensive email notification system for SLA breaches, approvals, reminders, and scheduled reports.

### Tasks
| Task | Details | Effort |
|------|---------|--------|
| Email Service Setup | Integrate email provider (Resend/SendGrid/Nodemailer) | 4h |
| Notification Templates | Create HTML email templates for all event types | 6h |
| Event Triggers | Wire notifications to business events | 8h |
| User Preferences | Notification preference management | 4h |
| Email Queue | Background job queue for email delivery | 6h |
| SLA Breach Alerts | Real-time SLA monitoring with email escalation | 6h |
| Approval Reminders | Daily digest for pending approvals | 4h |

### Dependencies
- Background job infrastructure (existing mini-services)
- User preferences schema

### Agent Assignment
- **Primary:** `backend-specialist` - Email service and queue
- **Support:** `frontend-specialist` - Notification preferences UI

### Skills to Use
- `api-patterns` - Email API patterns
- `nodejs-best-practices` - Background jobs

### Files to Create/Modify
```
NEW: /src/lib/email-service.ts
NEW: /src/lib/email-templates/
NEW: /src/app/api/notifications/preferences/route.ts
NEW: /src/components/wcp/notification-preferences.tsx
MODIFY: /src/lib/sla-monitor.ts (add email alerts)
MODIFY: /prisma/schema.prisma (add NotificationPreference)
```

### Notification Events
```
SLA Events:
├── JC_SLA_WARNING (80% of SLA time)
├── JC_SLA_BREACH (100% of SLA time)
├── MR_SLA_WARNING
└── MR_SLA_BREACH

Approval Events:
├── JC_PENDING_APPROVAL
├── MR_PENDING_APPROVAL
├── PR_PENDING_APPROVAL
├── APPROVAL_REMINDER (daily digest)
└── APPROVAL_ESCALATION

Operational Events:
├── LOW_STOCK_ALERT
├── TOOL_OVERDUE
├── PM_DUE_REMINDER
├── BUDGET_THRESHOLD (80%, 90%, 100%)
└── SCHEDULED_REPORT
```

### Estimated Effort
**38 hours (5 days)**

---

## 2.3 Server-side PDF Generation for Scheduled Reports

### Description
Implement robust server-side PDF generation with proper formatting for scheduled report delivery.

### Tasks
| Task | Details | Effort |
|------|---------|--------|
| PDF Service | Create dedicated PDF generation service | 6h |
| Template Engine | Standardized report templates | 8h |
| Chart Rendering | Server-side chart generation for PDFs | 6h |
| Batch Processing | Handle multiple reports in queue | 4h |
| Storage Integration | Store generated PDFs for history | 3h |
| Email Attachment | Send PDFs as email attachments | 3h |

### Dependencies
- Section 1.2 (Saved Reports)
- Section 2.2 (Email Notifications)

### Agent Assignment
- **Primary:** `backend-specialist` - PDF generation service
- **Support:** `wcp-specialist` - Report templates

### Skills to Use
- `wcp-workshop-expert` - Report format and formulas
- `api-patterns` - Background job patterns

### Files to Create/Modify
```
NEW: /src/lib/pdf-service.ts
NEW: /src/lib/report-templates/
MODIFY: /src/app/api/reports/generate-pdf/route.ts
MODIFY: /src/lib/email-service.ts (attachment support)
```

### Report Template Structure
```typescript
interface ReportTemplate {
  id: string;
  name: string;
  reportType: string;
  header: {
    logo: string;
    company: string;
    address: string;
  };
  styles: {
    primaryColor: string;
    fontSize: number;
    fontFamily: string;
  };
  sections: ReportSection[];
  footer: {
    pageNumbers: boolean;
    generatedAt: boolean;
  };
}
```

### Estimated Effort
**30 hours (4 days)**

---

# Section 3: MEDIUM PRIORITY - Advanced Features

## 3.1 MTBF/MTTR Dashboards and Analytics

### Description
Implement comprehensive reliability metrics with Mean Time Between Failures and Mean Time To Repair analytics.

### Tasks
| Task | Details | Effort |
|------|---------|--------|
| MTBF Calculation | Implement calculation from DowntimeLog records | 6h |
| MTTR Calculation | Implement from Job Card duration data | 6h |
| Trend Analysis | Historical MTBF/MTTR trends | 4h |
| Asset Rankings | Reliability rankings by asset/category | 4h |
| Dashboard Widgets | MTBF/MTTR visualization components | 8h |
| API Endpoints | Reliability data APIs | 4h |
| Alert Thresholds | Configurable MTBF/MTTR thresholds | 3h |

### Dependencies
- DowntimeLog model (existing)
- Job Card data (existing)

### Agent Assignment
- **Primary:** `wcp-specialist` - Reliability metrics domain knowledge
- **Support:** `frontend-specialist` - Dashboard visualizations

### Skills to Use
- `wcp-workshop-expert` - MTBF/MTTR formulas
- `nextjs-react-expert` - Chart performance optimization

### Files to Create/Modify
```
NEW: /src/lib/reliability-metrics.ts
NEW: /src/app/api/analytics/mtbf-mttr/route.ts
NEW: /src/components/wcp/reliability-dashboard.tsx
MODIFY: /src/components/wcp/dashboard-view.tsx (add widgets)
MODIFY: /src/app/api/dashboard/analytics/route.ts (enhance)
```

### MTBF/MTTR Formulas
```
MTBF = (Total Operating Hours - Total Downtime Hours) / Number of Failures

MTTR = Sum of (Actual End - Actual Start) for all JCs / Number of Completed JCs

Reliability Rate = (MTBF / (MTBF + MTTR)) × 100

Availability = Operating Time / (Operating Time + Downtime)
```

### Estimated Effort
**35 hours (4-5 days)**

---

## 3.2 Hash Chain Audit Implementation

### Description
Implement cryptographic hash chain for audit log tamper detection as specified in the master plan.

### Tasks
| Task | Details | Effort |
|------|---------|--------|
| Hash Chain Schema | Add previousHash, currentHash to AuditLog | 3h |
| Chain Logic | Implement SHA-256 chaining on every insert | 6h |
| Verification Service | Periodic integrity verification | 4h |
| API Endpoints | Integrity check and verification APIs | 3h |
| Admin UI | Integrity verification dashboard | 4h |
| Migration | Backfill hash chain for existing records | 4h |

### Dependencies
- AuditLog model (existing)

### Agent Assignment
- **Primary:** `backend-specialist` - Cryptographic implementation
- **Support:** `security-auditor` - Security review

### Skills to Use
- `api-patterns` - Security patterns
- `database-design` - Schema migration

### Files to Create/Modify
```
MODIFY: /prisma/schema.prisma (add hash fields)
NEW: /src/lib/audit-hash-chain.ts
NEW: /src/app/api/audit/verify/route.ts
NEW: /src/components/wcp/audit-integrity-view.tsx
MODIFY: /src/lib/audit.ts (integrate hash chain)
```

### Schema Addition
```prisma
model AuditLog {
  // ... existing fields
  previousHash   String?
  currentHash    String
  blockNumber    Int     @default(autoincrement())
  verifiedAt     DateTime?
  verificationStatus String? @default("UNVERIFIED")
}
```

### Hash Chain Logic
```typescript
function calculateHash(record: AuditLog, previousHash: string): string {
  const data = `${record.id}|${record.action}|${record.entityType}|${record.entityId}|${record.userId}|${record.timestamp.toISOString()}|${previousHash}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}
```

### Estimated Effort
**24 hours (3 days)**

---

## 3.3 Photo EXIF Validation Server-side

### Description
Implement server-side EXIF validation for photo evidence to detect manipulation and ensure authenticity.

### Tasks
| Task | Details | Effort |
|------|---------|--------|
| EXIF Library | Integrate exif-js or similar library | 2h |
| Extraction Service | Extract and parse EXIF data from uploads | 4h |
| Validation Rules | Define validation criteria (date, location, device) | 4h |
| Storage | Store EXIF data with photo record | 2h |
| API Integration | Validate on photo upload | 3h |
| Warning System | Flag suspicious photos for review | 4h |
| Admin UI | EXIF validation status dashboard | 4h |

### Dependencies
- JcPhoto model (existing)
- File upload infrastructure (existing)

### Agent Assignment
- **Primary:** `backend-specialist` - EXIF processing
- **Support:** `wcp-specialist` - Photo evidence requirements

### Skills to Use
- `api-patterns` - File upload patterns
- `nodejs-best-practices` - Image processing

### Files to Create/Modify
```
NEW: /src/lib/exif-validator.ts
NEW: /src/app/api/photos/validate/route.ts
MODIFY: /src/app/api/job-cards/[id]/photos/route.ts
NEW: /src/components/wcp/photo-validation-view.tsx
```

### EXIF Validation Rules
```typescript
interface ExifValidationResult {
  isValid: boolean;
  warnings: ExifWarning[];
  extracted: {
    capturedAt?: Date;
    deviceMake?: string;
    deviceModel?: string;
    gpsLatitude?: number;
    gpsLongitude?: number;
    software?: string;
    modifiedAt?: Date;
  };
}

interface ExifWarning {
  type: 'MISSING_CAPTURE_DATE' | 'DATE_MISMATCH' | 'LOCATION_MISMATCH' | 
        'SOFTWARE_MODIFIED' | 'SUSPICIOUS_EDIT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  message: string;
}
```

### Estimated Effort
**23 hours (3 days)**

---

## 3.4 Advanced KPIs with Predictive Analytics

### Description
Implement advanced KPIs with trend analysis and predictive indicators.

### Tasks
| Task | Details | Effort |
|------|---------|--------|
| KPI Engine Enhancement | Expand KPI calculation service | 6h |
| Trend Analysis | Moving averages, trend lines | 6h |
| Predictive Models | Simple forecasting for key metrics | 8h |
| KPI Dashboard | Enhanced KPI visualization | 8h |
| Threshold Alerts | Configurable KPI thresholds with alerts | 4h |
| Historical Snapshots | Daily/weekly KPI snapshots | 4h |

### Dependencies
- Section 3.1 (MTBF/MTTR for reliability KPIs)
- KPI model (existing)

### Agent Assignment
- **Primary:** `wcp-specialist` - KPI definitions
- **Support:** `frontend-specialist` - KPI dashboard

### Skills to Use
- `wcp-workshop-expert` - Workshop KPI definitions
- `nextjs-react-expert` - Chart performance

### Files to Create/Modify
```
NEW: /src/lib/kpi-engine.ts
NEW: /src/lib/kpi-predictions.ts
NEW: /src/app/api/kpi/advanced/route.ts
MODIFY: /src/app/api/kpi/compute/route.ts
NEW: /src/components/wcp/advanced-kpi-view.tsx
```

### KPI Categories
```
Operational KPIs:
├── Job Card Completion Rate
├── Average Repair Time (MTTR)
├── First-Time Fix Rate
├── SLA Compliance Rate
├── Work Order Backlog

Reliability KPIs:
├── MTBF by Asset Category
├── Asset Availability Rate
├── Planned vs Unplanned Ratio
├── Failure Frequency

Cost KPIs:
├── Cost per Repair
├── Material Cost Variance
├── Labour Utilization Rate
├── Budget Compliance

Inventory KPIs:
├── Stock Turnover Rate
├── Stockout Rate
├── Inventory Accuracy
├── Obsolescence Rate
```

### Estimated Effort
**36 hours (4-5 days)**

---

# Section 4: MEDIUM PRIORITY - Quality & Testing

## 4.1 API Integration Tests

### Description
Create comprehensive integration tests for all API endpoints.

### Tasks
| Task | Details | Effort |
|------|---------|--------|
| Test Infrastructure | Setup Jest/Vitest with test database | 4h |
| Auth Tests | Authentication and authorization tests | 4h |
| Job Card API Tests | JC lifecycle, transitions, guards | 8h |
| Material API Tests | MR → MI flow tests | 6h |
| Procurement API Tests | PR → PO → GRN → Invoice tests | 8h |
| Inventory API Tests | Stock operations, reservations | 6h |
| Report API Tests | Report generation and export | 4h |

### Dependencies
- Section 1.3 (Seed data for testing)

### Agent Assignment
- **Primary:** `test-engineer` - Test design and implementation
- **Support:** `backend-specialist` - API knowledge

### Skills to Use
- `testing-patterns` - Integration test patterns
- `tdd-workflow` - Test-driven approach
- `webapp-testing` - API testing tools

### Files to Create
```
NEW: /tests/setup.ts
NEW: /tests/integration/auth.test.ts
NEW: /tests/integration/job-cards.test.ts
NEW: /tests/integration/material-flow.test.ts
NEW: /tests/integration/procurement.test.ts
NEW: /tests/integration/inventory.test.ts
NEW: /tests/integration/reports.test.ts
NEW: /tests/fixtures/test-data.ts
NEW: /vitest.config.ts (or jest.config.ts)
```

### Test Coverage Targets
```
Module              Target Coverage
─────────────────────────────────────
Authentication      90%
Job Cards           85%
Material Requests   85%
Material Issues     85%
Inventory           80%
Procurement         80%
Reports             75%
─────────────────────────────────────
Overall             80%
```

### Estimated Effort
**40 hours (5 days)**

---

## 4.2 E2E Tests for Critical Flows

### Description
Create end-to-end tests for critical user workflows using Playwright.

### Tasks
| Task | Details | Effort |
|------|---------|--------|
| Playwright Setup | Configure Playwright with WCP app | 4h |
| Login/Auth Flow | Authentication E2E tests | 3h |
| Job Card Lifecycle | Create → Submit → Approve → Complete | 8h |
| Material Flow | MR → Approval → MI → Return | 8h |
| Procurement Flow | PR → RFQ → PO → GRN → Invoice | 10h |
| Dashboard Tests | Dashboard loading and interactions | 4h |
| Mobile Tests | Mobile responsive flow tests | 6h |

### Dependencies
- Section 1.3 (Seed data for consistent testing)
- Playwright installation

### Agent Assignment
- **Primary:** `test-engineer` - E2E test design
- **Support:** `frontend-specialist` - UI flow knowledge

### Skills to Use
- `webapp-testing` - Playwright patterns
- `testing-patterns` - E2E best practices

### Files to Create
```
NEW: /playwright.config.ts
NEW: /e2e/auth.spec.ts
NEW: /e2e/job-card-lifecycle.spec.ts
NEW: /e2e/material-flow.spec.ts
NEW: /e2e/procurement-flow.spec.ts
NEW: /e2e/dashboard.spec.ts
NEW: /e2e/mobile.spec.ts
NEW: /e2e/helpers/test-helpers.ts
```

### Critical E2E Flows
```
Flow 1: Job Card Complete Lifecycle
├── Login as Technician
├── Create Job Card with Asset QR scan
├── Add tasks and photos
├── Submit for approval
├── Login as Supervisor
├── Approve Job Card
├── Login as Technician
├── Start work, log time
├── Create Material Request
├── Complete Job Card
└── Supervisor closes JC

Flow 2: Material Issue Flow
├── Create MR from Job Card
├── Supervisor approves MR
├── Storekeeper issues materials
├── Verify counter locking
├── Confirm 2-person verification (high value)
└── Process return (if needed)

Flow 3: Procurement Flow
├── Create Purchase Request
├── Approve PR
├── Create RFQ
├── Receive quotations
├── Evaluate and award
├── Generate PO
├── Process GRN
└── Match Invoice
```

### Estimated Effort
**43 hours (5-6 days)**

---

## 4.3 Performance Optimization

### Description
Optimize application performance for production readiness.

### Tasks
| Task | Details | Effort |
|------|---------|--------|
| Bundle Analysis | Analyze and optimize frontend bundle | 4h |
| Database Indexing | Add missing indexes, optimize queries | 6h |
| API Response Caching | Implement caching for read-heavy endpoints | 6h |
| Image Optimization | Optimize photo storage and delivery | 4h |
| Lazy Loading | Implement component lazy loading | 4h |
| Database Query Optimization | N+1 query resolution, join optimization | 8h |
| Load Testing | Basic load testing with k6 or similar | 6h |

### Dependencies
- Sections 4.1, 4.2 (Tests verify optimizations don't break functionality)

### Agent Assignment
- **Primary:** `performance-optimizer` - Performance analysis
- **Support:** `backend-specialist` - Database optimization

### Skills to Use
- `performance-profiling` - Performance analysis tools
- `database-design` - Indexing strategies
- `nextjs-react-expert` - Bundle optimization

### Files to Analyze/Modify
```
ANALYZE: /src/app/**/route.ts (all API routes)
ANALYZE: /src/components/wcp/*.tsx
MODIFY: /prisma/schema.prisma (indexes)
MODIFY: /next.config.ts (optimization settings)
NEW: /src/lib/cache.ts (enhanced caching)
NEW: /k6/load-test.js
```

### Performance Targets
```
Metric                          Target
─────────────────────────────────────────
API Response Time (P95)         < 200ms
Initial Page Load               < 3s
Time to Interactive             < 5s
Lighthouse Performance Score    > 85
Database Query Time (P95)       < 100ms
Concurrent Users Support        > 100
```

### Estimated Effort
**38 hours (5 days)**

---

# Section 5: LOW PRIORITY - Future Enhancements

## 5.1 Mobile PWA (Offline Support, Service Workers)

### Description
Implement Progressive Web App features for offline capability and mobile-first experience.

### Tasks
| Task | Details | Effort |
|------|---------|--------|
| Service Worker Setup | Configure workbox/next-pwa | 4h |
| Offline Data Strategy | IndexedDB for offline data | 8h |
| Sync Mechanism | Background sync for offline transactions | 10h |
| PWA Manifest | Complete PWA configuration | 2h |
| Mobile UI Optimization | Touch-friendly interface improvements | 8h |
| Install Prompt | Add to home screen experience | 2h |
| Push Notifications | Mobile push notification support | 6h |

### Dependencies
- All core features must be complete and stable

### Agent Assignment
- **Primary:** `frontend-specialist` - PWA implementation
- **Support:** `mobile-developer` - Mobile optimization

### Skills to Use
- `mobile-design` - Mobile UX patterns
- `nextjs-react-expert` - PWA configuration

### Files to Create/Modify
```
NEW: /public/sw.js
NEW: /public/manifest.json
NEW: /src/lib/offline-db.ts
NEW: /src/lib/sync-manager.ts
MODIFY: /next.config.ts (PWA config)
MODIFY: /src/app/layout.tsx (manifest link)
```

### Estimated Effort
**40 hours (5 days)**

---

## 5.2 SAP Integration (HCM, MM, FICO)

### Description
Implement integration points with SAP ERP for master data sync and financial posting.

### Tasks
| Task | Details | Effort |
|------|---------|--------|
| Integration Architecture | Design SAP integration architecture | 8h |
| HCM Sync | Employee master data sync | 12h |
| MM Integration | Material master sync | 16h |
| FI/CO Posting | Financial posting integration | 20h |
| Error Handling | Robust error handling and retry logic | 8h |
| Monitoring | Integration monitoring dashboard | 6h |
| Documentation | Integration documentation | 4h |

### Dependencies
- All core features complete
- SAP system access and credentials
- Integration specifications from client

### Agent Assignment
- **Primary:** `backend-specialist` - Integration development
- **Support:** `devops-engineer` - Infrastructure

### Skills to Use
- `api-patterns` - Integration patterns
- `server-management` - SAP connectivity

### Files to Create
```
NEW: /src/lib/sap-client.ts
NEW: /src/lib/sap/hcm-sync.ts
NEW: /src/lib/sap/mm-sync.ts
NEW: /src/lib/sap/fi-posting.ts
NEW: /src/app/api/sap/sync/route.ts
NEW: /src/components/wcp/sap-integration-view.tsx
```

### SAP Integration Points
```
HCM Integration:
├── Employee Master Sync (daily)
├── Cost Centre Sync
└── Org Structure Sync

MM Integration:
├── Material Master Sync
├── Vendor Master Sync
├── Stock Update (GRN/MI)
└── Purchase Order Creation

FI/CO Integration:
├── Cost Posting
├── Budget Update
├── Invoice Posting
└── Asset Capitalization
```

### Estimated Effort
**74 hours (9-10 days)**

---

# Dependency Graph

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           IMPLEMENTATION DEPENDENCIES                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PHASE 1: Foundation (Weeks 1-2)                                            │
│  ┌──────────────┐                                                           │
│  │ 1.1 JC Cost  │ (standalone)                                              │
│  │ Verification │                                                           │
│  └──────────────┘                                                           │
│                                                                              │
│  ┌──────────────┐     ┌──────────────┐                                     │
│  │ 1.3 Seed Data│────▶│ 1.2 Saved    │                                     │
│  │              │     │ Reports CRUD │                                     │
│  └──────────────┘     └──────────────┘                                     │
│                              │                                               │
│                              ▼                                               │
│  PHASE 2: Core Enhancements (Weeks 3-5)                                    │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐               │
│  │ 2.2 Email    │────▶│ 2.3 PDF      │────▶│ 2.1 Budget   │               │
│  │ Notifications│     │ Generation   │     │ Control      │               │
│  └──────────────┘     └──────────────┘     └──────────────┘               │
│                                                                              │
│  PHASE 3: Advanced Features (Weeks 6-8)                                    │
│  ┌──────────────┐                                                           │
│  │ 3.1 MTBF/MTTR│ (standalone)                                              │
│  └──────────────┘                                                           │
│         │                                                                    │
│         ▼                                                                    │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐               │
│  │ 3.2 Hash     │     │ 3.3 EXIF     │     │ 3.4 Advanced │               │
│  │ Chain Audit  │     │ Validation   │     │ KPIs         │               │
│  └──────────────┘     └──────────────┘     └──────────────┘               │
│                                                                              │
│  PHASE 4: Quality & Testing (Weeks 9-11)                                   │
│  ┌──────────────┐                                                           │
│  │ 1.3 Seed Data│ (required for testing)                                    │
│  └──────────────┘                                                           │
│         │                                                                    │
│         ├──────────────┐     ┌──────────────┐                              │
│         │              │     │              │                              │
│         ▼              ▼     ▼              ▼                              │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐               │
│  │ 4.1 API      │────▶│ 4.2 E2E      │────▶│ 4.3 Perform- │               │
│  │ Integration  │     │ Tests        │     │ ance Opt.    │               │
│  └──────────────┘     └──────────────┘     └──────────────┘               │
│                                                                              │
│  PHASE 5: Future Enhancements (Weeks 12-16)                                │
│  ┌──────────────┐                                                           │
│  │ All Previous │ (prerequisite)                                             │
│  └──────────────┘                                                           │
│         │                                                                    │
│         ├──────────────┐     ┌──────────────┐                              │
│         ▼              │     ▼              │                              │
│  ┌──────────────┐      │  ┌──────────────┐ │                              │
│  │ 5.1 Mobile   │      │  │ 5.2 SAP      │ │                              │
│  │ PWA          │      │  │ Integration  │ │                              │
│  └──────────────┘      │  └──────────────┘ │                              │
│                        └────────────────────┘                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# Effort Summary

| Section | Description | Estimated Hours | Days |
|---------|-------------|-----------------|------|
| **1.1** | JC Cost Report Verification | 14 | 2 |
| **1.2** | Saved Reports CRUD | 31 | 4 |
| **1.3** | Data Seeding | 31 | 4 |
| **2.1** | Budget Control | 42 | 5-6 |
| **2.2** | Email Notifications | 38 | 5 |
| **2.3** | Server-side PDF | 30 | 4 |
| **3.1** | MTBF/MTTR Dashboards | 35 | 4-5 |
| **3.2** | Hash Chain Audit | 24 | 3 |
| **3.3** | EXIF Validation | 23 | 3 |
| **3.4** | Advanced KPIs | 36 | 4-5 |
| **4.1** | API Integration Tests | 40 | 5 |
| **4.2** | E2E Tests | 43 | 5-6 |
| **4.3** | Performance Optimization | 38 | 5 |
| **5.1** | Mobile PWA | 40 | 5 |
| **5.2** | SAP Integration | 74 | 9-10 |
| | **TOTAL** | **539** | **67-73** |

---

# Recommended Sprint Plan

## Sprint 1-2 (Weeks 1-2): Foundation
- Section 1.1: JC Cost Report Verification
- Section 1.3: Data Seeding
- Section 1.2: Saved Reports CRUD

## Sprint 3-4 (Weeks 3-4): Core Infrastructure
- Section 2.2: Email Notifications
- Section 2.3: Server-side PDF Generation

## Sprint 5-6 (Weeks 5-6): Budget & Analytics
- Section 2.1: Budget Control
- Section 3.1: MTBF/MTTR Dashboards

## Sprint 7-8 (Weeks 7-8): Security & Advanced Features
- Section 3.2: Hash Chain Audit
- Section 3.3: EXIF Validation
- Section 3.4: Advanced KPIs

## Sprint 9-10 (Weeks 9-10): Testing
- Section 4.1: API Integration Tests
- Section 4.2: E2E Tests

## Sprint 11-12 (Weeks 11-12): Optimization
- Section 4.3: Performance Optimization
- Bug fixes and refinement

## Sprint 13-16 (Weeks 13-16): Future Enhancements (Optional)
- Section 5.1: Mobile PWA
- Section 5.2: SAP Integration

---

# Agent Quick Reference

| Agent | Primary Use Cases |
|-------|-------------------|
| `wcp-specialist` | Domain logic, cost calculations, workflows |
| `backend-specialist` | APIs, database, integrations, background jobs |
| `frontend-specialist` | UI components, dashboards, visualizations |
| `test-engineer` | Integration tests, E2E tests, coverage |
| `performance-optimizer` | Bundle analysis, caching, query optimization |
| `security-auditor` | Security review, hash chain verification |
| `devops-engineer` | Infrastructure, deployment, monitoring |

---

# Skills Quick Reference

| Skill | Use Case |
|-------|----------|
| `wcp-workshop-expert` | Domain formulas, field names, cost calculations |
| `testing-patterns` | Test architecture, AAA pattern, mocking |
| `tdd-workflow` | Test-driven development approach |
| `api-patterns` | REST API design, validation, error handling |
| `database-design` | Schema design, indexing, migrations |
| `nextjs-react-expert` | Performance, Server Components, optimization |
| `performance-profiling` | Load testing, profiling, optimization |
| `webapp-testing` | Playwright, E2E patterns |
| `mobile-design` | PWA, responsive design, touch interactions |

---

**Document Version:** 1.0
**Created:** March 2025
**Status:** Ready for Implementation
