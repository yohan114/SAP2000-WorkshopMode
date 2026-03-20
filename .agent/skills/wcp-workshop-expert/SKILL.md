---
name: wcp-workshop-expert
description: Workshop Control Platform domain expert. Use when building workshop management features, job cards, material requests, preventive maintenance, fuel management, or cost tracking functionality.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# WCP - Workshop Control Platform Expert

> Domain-specific knowledge for Workshop Management System
> **Philosophy:** Complete JC cost = Material + Labour + External + 10% Sundry (+ 10% VAT if applicable)

---

## 🎯 Domain Overview

WCP is a comprehensive Workshop Control Platform for managing:

| Module              | Description                           | Key Models                    |
| ------------------- | ------------------------------------- | ----------------------------- |
| Job Cards           | Work order management                 | JobCard, JcTask, JcCostLine   |
| Material Management | Requisitions, issues, stock           | MaterialRequest, MaterialIssue |
| Preventive Maintenance | Scheduled maintenance             | PmSchedule, PmExecution       |
| Fuel Management     | Fuel issues and consumption           | FuelIssue, FuelTank           |
| Cost Tracking       | Labour, material, external costs      | TimeLog, ExternalJob          |
| Procurement         | Purchase orders, GRN                  | PurchaseOrder, GrnHeader      |

---

## 📊 Cost Calculation Formula

### Job Card Cost Breakdown

```
Material Cost = Sum(Material Issues linked to JC)
Labour Cost = Sum(Time Logs × Hourly Rate)
External Cost = Sum(External Jobs actual/estimated)

Subtotal = Material + Labour + External
Sundry = Subtotal × 10%
Total Bill = Subtotal + Sundry

VAT = Total Bill × 10% (if applicable)
Grand Total = Total Bill + VAT
```

### Currency
- **Default Currency:** LKR (Sri Lankan Rupee)
- Display format: `LKR X,XXX,XXX.XX`

---

## 🗄️ Database Models Reference

### Core Models

#### JobCard
```prisma
model JobCard {
  id                String   @id @default(cuid())
  jobCardNumber     String   @unique
  assetId           String
  jobType           String
  priority          String   @default("NORMAL") // EMERGENCY, HIGH, NORMAL, LOW
  status            String   @default("DRAFT")  // DRAFT, OPEN, IN_PROGRESS, COMPLETED, CLOSED
  faultDescription  String
  estimatedCost     Decimal?
  actualCost        Decimal?
  closedAt          DateTime?
  
  // Relations
  asset             Asset
  timeLogs          TimeLog[]
  materialIssues    MaterialIssue[]
  externalJobs      ExternalJob[]
  technicianAssignments JcTechnicianAssignment[]
}
```

#### MaterialIssue
```prisma
model MaterialIssue {
  id              String   @id @default(cuid())
  miNumber        String   @unique
  storeId         String
  jobCardId       String?
  issuedAt        DateTime?
  
  // Relations
  lines           MiLine[]
  jobCard         JobCard?
}

model MiLine {
  id              String   @id @default(cuid())
  miId            String
  itemId          String
  issuedQty       Decimal
  unitCost        Decimal
  totalCost       Decimal
}
```

#### TimeLog
```prisma
model TimeLog {
  id              String   @id @default(cuid())
  employeeId      String
  jobCardId       String?
  logDate         DateTime
  totalMinutes    Int?
  hourlyRate      Decimal?
  totalCost       Decimal?
  
  // Relations
  employee        Employee
  jobCard         JobCard?
}
```

#### ExternalJob
```prisma
model ExternalJob {
  id              String   @id @default(cuid())
  jobNumber       String   @unique
  jobCardId       String?
  estimatedCost   Decimal?
  actualCost      Decimal?
  status          String   @default("DRAFT")
  
  // Relations
  jobCard         JobCard?
}
```

---

## 🔄 Status Workflows

### Job Card Status Flow
```
DRAFT → OPEN → IN_PROGRESS → COMPLETED → CLOSED
           ↓                    ↑
       CANCELLED            REOPENED
```

### Material Request Status Flow
```
DRAFT → PENDING → APPROVED → PARTIALLY_FULFILLED → FULFILLED → CLOSED
           ↓
       REJECTED
```

### PM Schedule Status
```
ACTIVE → PAUSED → COMPLETED → CANCELLED
```

---

## 📝 API Patterns

### Report Generation

All reports follow this standard response format:

```typescript
interface ReportData {
  title: string;
  generatedAt: string;
  period: { start: string; end: string };
  summary: Record<string, any>;
  data: any[];
  columns: { key: string; label: string; align?: 'left' | 'right' }[];
  totals?: Record<string, number>;
  charts?: ChartData;
}
```

### PDF Export (jsPDF + jspdf-autotable v5.x)

```typescript
// Correct v5.x API usage
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const doc = new jsPDF();

// v5.x syntax
autoTable(doc, {
  head: [columns],
  body: [rows],
  startY: yPos,
  styles: { fontSize: 9 },
  headStyles: { fillColor: [16, 185, 129] },
});

// Access finalY for positioning
const finalY = doc.lastAutoTable.finalY;
```

---

## 🎨 UI Components

### Using shadcn/ui (New York Style)

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
```

### Status Badge Colors

| Status      | Variant   | Color Class              |
| ----------- | --------- | ------------------------ |
| DRAFT       | outline   | text-slate-600           |
| OPEN        | default   | bg-blue-500              |
| IN_PROGRESS | default   | bg-amber-500             |
| COMPLETED   | default   | bg-emerald-500           |
| CLOSED      | default   | bg-slate-500             |
| EMERGENCY   | default   | bg-red-500               |
| HIGH        | default   | bg-orange-500            |
| NORMAL      | default   | bg-blue-500              |
| LOW         | default   | bg-slate-500             |

---

## 🔧 Common Issues & Fixes

### Database Field Name Mismatches

| Incorrect (Old)   | Correct (Schema)    |
| ----------------- | ------------------- |
| `issueDate`       | `issuedAt`          |
| `quantityIssued`  | `issuedQty`         |
| `hoursWorked`     | `totalMinutes / 60` |
| `scheduledDate`   | `nextExecutionAt`   |
| `externalRepairs` | `externalJobs`      |
| `assignedTo`      | `technicianAssignments` |

### Decimal Handling

Always convert Prisma Decimal to Number for calculations:

```typescript
// Correct
const qty = Number(line.issuedQty);
const cost = Number(line.unitCost);
const total = qty * cost;

// Incorrect (causes NaN)
const total = line.issuedQty * line.unitCost;
```

---

## 📊 Report Types

| Report ID            | Description                         |
| -------------------- | ----------------------------------- |
| job-card-cost        | Complete JC cost breakdown          |
| monthly-closed-jobs  | Closed JCs by period                |
| material-usage       | Items issued with costs             |
| external-costs       | External job costs                  |
| fleet-availability   | Asset status summary                |
| pm-compliance        | PM schedule completion rate         |
| technician-utilisation | Labour hours per technician       |
| fuel-consumption     | Fuel issues by asset                |
| stock-valuation      | Current stock values                |
| procurement-spend    | PO spending analysis                |

---

## 🔗 Related Skills

| Need                  | Skill                             |
| --------------------- | --------------------------------- |
| React optimization    | `@[skills/nextjs-react-expert]`   |
| API design            | `@[skills/api-patterns]`          |
| Database optimization | `@[skills/database-design]`       |
| Testing               | `@[skills/testing-patterns]`      |
| UI/UX design          | `@[skills/frontend-design]`       |

---

## 📋 Quick Reference

### Priority Levels
1. **EMERGENCY** - Immediate attention (red)
2. **HIGH** - Urgent (orange)
3. **NORMAL** - Standard (blue)
4. **LOW** - Can wait (slate)

### Job Types
- **CORRECTIVE** - Repair work
- **PREVENTIVE** - Scheduled maintenance
- **INSPECTION** - Check/inspect only
- **MODIFICATION** - Changes/upgrades

### Asset Status
- **OPERATIONAL** - Working normally
- **UNDER_REPAIR** - In workshop
- **STANDBY** - Available but not in use
- **OUT_OF_SERVICE** - Not available

---

**Version:** 1.0.0
**Last Updated:** January 2025
**Project:** WCP - Workshop Control Platform
