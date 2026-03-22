# WORKSHOP CONTROL PLATFORM (WCP)
## Complete Build Plan & Implementation Guide

---

## TABLE OF CONTENTS

1. [System Overview](#1-system-overview)
2. [Technology Stack](#2-technology-stack)
3. [Database Schema](#3-database-schema)
4. [User Roles & Privileges](#4-user-roles--privileges)
5. [API Endpoints](#5-api-endpoints)
6. [Component Structure](#6-component-structure)
7. [Feature Modules](#7-feature-modules)
8. [Authentication System](#8-authentication-system)
9. [Setup Instructions](#9-setup-instructions)
10. [Development Workflow](#10-development-workflow)

---

## 1. SYSTEM OVERVIEW

### 1.1 Purpose
The Workshop Control Platform (WCP) is a comprehensive ERP system designed for workshop management, covering:
- Asset Management
- Job Card Lifecycle
- Material Management
- Procurement Workflow
- Quality Control
- Preventive Maintenance
- Financial Tracking
- HR & Training
- Reporting & Analytics

### 1.2 Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 16)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │    Pages     │  │  Components  │  │     Hooks    │      │
│  │  (App Router)│  │  (shadcn/ui) │  │  (Custom)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   API Layer (Next.js)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │     Auth     │  │  REST APIs   │  │ Middlewares  │      │
│  │  (NextAuth)  │  │  (/api/*)    │  │  (Prisma)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Data Layer (Prisma ORM)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │    SQLite    │  │   Models     │  │  Relations   │      │
│  │  (Database)  │  │  (60+ Models)│  │ (Schema)     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. TECHNOLOGY STACK

### 2.1 Core Framework
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.1.3 | React framework with App Router |
| React | 19.0.0 | UI library |
| TypeScript | 5.x | Type safety |
| Node.js | - | Runtime (use Bun for faster performance) |

### 2.2 Database & ORM
| Technology | Version | Purpose |
|------------|---------|---------|
| Prisma | 6.11.1 | Database ORM |
| SQLite | - | Database (can be upgraded to PostgreSQL) |

### 2.3 UI & Styling
| Technology | Version | Purpose |
|------------|---------|---------|
| Tailwind CSS | 4.x | Utility-first CSS |
| shadcn/ui | Latest | Component library |
| Radix UI | Latest | Unstyled components |
| Framer Motion | 12.23.2 | Animations |
| Lucide React | 0.525.0 | Icons |

### 2.4 Form & Validation
| Technology | Version | Purpose |
|------------|---------|---------|
| React Hook Form | 7.60.0 | Form management |
| Zod | 4.0.2 | Schema validation |
| @hookform/resolvers | 5.1.1 | Form validation bridge |

### 2.5 Data & State
| Technology | Version | Purpose |
|------------|---------|---------|
| TanStack Query | 5.82.0 | Server state |
| Zustand | 5.0.6 | Client state |
| TanStack Table | 8.21.3 | Data tables |

### 2.6 Authentication
| Technology | Version | Purpose |
|------------|---------|---------|
| NextAuth.js | 4.24.11 | Authentication |
| bcryptjs | 3.0.3 | Password hashing |

### 2.7 Additional Libraries
| Technology | Purpose |
|------------|---------|
| date-fns | Date manipulation |
| jsPDF | PDF generation |
| xlsx | Excel import/export |
| Recharts | Charts |
| DND Kit | Drag and drop |
| Sonner | Toast notifications |

---

## 3. DATABASE SCHEMA

### 3.1 Schema Overview
The database consists of **60+ models** organized into functional domains:

```
IDENTITY & AUTH DOMAIN
├── User (employee details, credentials)
├── Role (role definitions)
├── UserRole (user-role assignments)
├── PrivilegeDefinition (privilege definitions)
├── RolePrivilegeSet (role-privilege mappings)
├── UserPrivilegeOverride (individual overrides)
├── UserSession (session management)
└── DeviceRegistry (device security)

ASSET MANAGEMENT DOMAIN
├── AssetCategory (categories)
├── Asset (main asset entity)
├── AssetQrCode (QR assignments)
├── AssetMeter (meter readings)
├── MeterReading (historical readings)
└── AssetSpecificity (asset-item relationships)

JOB CARDS DOMAIN
├── JobCard (main job entity)
├── JcTask (task breakdown)
├── JcTaskPhoto (task photos)
├── JcPhotoCategory (photo categories)
├── JcPhoto (job photos with EXIF)
├── JcStateTransition (state history)
├── JcCostLine (cost tracking)
├── JcDocument (job documents)
├── JcTechnicianAssignment (assignments)
└── JobCardApproval (approvals)

MATERIAL MANAGEMENT DOMAIN
├── Item (inventory items)
├── Store (storage locations)
├── StockLevel (stock levels)
├── StockTransaction (movements)
├── MaterialRequest (requests)
├── MrApprovalHistory (approvals)
├── GrnHeader (goods received)
├── GrnLine (GRN items)
├── MaterialIssue (issues)
└── MiVerification (verifications)

PROCUREMENT DOMAIN
├── Supplier (vendors)
├── PrHeader (purchase requisitions)
├── PrLine (PR items)
├── Quotation (supplier quotes)
├── RfqHeader (request for quotation)
├── PurchaseOrder (purchase orders)
├── Invoice (invoices)
└── Contract (vendor contracts)

HR & LABOUR DOMAIN
├── Employee (employees)
├── Training (training programs)
├── TrainingRecord (completions)
├── Skill (skill definitions)
└── TechnicianSkill (employee skills)

PM SCHEDULES DOMAIN
├── PmTemplate (PM templates)
├── PmChecklistItem (template items)
├── PmSchedule (scheduled PMs)
├── PmExecution (executions)
├── PmExecutionItem (completed items)
└── DowntimeLog (downtime tracking)

QUALITY DOMAIN
├── QualityInspection (inspections)
├── QualityTemplate (templates)
├── QualityDefect (defects)
└── CorrectiveAction (actions)

REPORTING & ANALYTICS
├── KpiSnapshot (KPI measurements)
├── KpiThresholdConfig (thresholds)
├── ReportSchedule (scheduled reports)
├── SavedReport (saved reports)
└── EmailLog (email tracking)

AUDIT & SECURITY
├── AuditLog (audit trail)
├── IntegrityCheck (integrity validation)
├── Webhook (webhook config)
└── WebhookDelivery (webhook history)

SYSTEM CONFIGURATION
├── SystemConfig (system settings)
├── StockTakeHeader (stock takes)
├── StockTakeLine (stock take items)
├── StockAdjustment (adjustments)
├── NotificationPreferences (user preferences)
└── Document (documents)
```

### 3.2 Key Model Definitions

#### User Model
```typescript
model User {
  id              String    @id @default(cuid())
  employeeId      String?   @unique
  email           String    @unique
  passwordHash    String
  name            String
  phone           String?
  department      String?
  costCentre      String?
  contractType    String?
  riskLevel       String    @default("LOW")
  isActive        Boolean   @default(true)
  lastLoginAt     DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  createdBy       String?
  updatedBy       String?
  deletedAt       DateTime?

  // Relations
  roles           UserRole[]
  privilegeOverrides UserPrivilegeOverride[]
  sessions        UserSession[]
  devices         DeviceRegistry[]
  jobCardsCreated     JobCard[]
  jobCardsAssigned    JcTechnicianAssignment[]
  jobCardsSupervised  JobCard[]
  jobCardsApproved    JobCardApproval[]
  materialRequests    MaterialRequest[]
  // ... more relations
}
```

#### JobCard Model
```typescript
model JobCard {
  id                String    @id @default(cuid())
  jobNumber         String    @unique
  assetId           String?
  workshopId        String?
  title             String
  description       String?
  priority          String    @default("MEDIUM")
  status            String    @default("DRAFT")
  jobType           String?
  estimatedHours    Decimal?
  actualHours       Decimal?
  estimatedCost     Decimal?
  actualCost        Decimal?
  startDate         DateTime?
  dueDate           DateTime?
  completedAt       DateTime?
  createdById       String
  supervisorId      String?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  // Relations
  creator           User              @relation("JobCardCreator")
  supervisor        User?             @relation("JobCardSupervisor")
  tasks             JcTask[]
  photos            JcPhoto[]
  stateTransitions  JcStateTransition[]
  costLines         JcCostLine[]
  documents         JcDocument[]
  assignments       JcTechnicianAssignment[]
  approvals         JobCardApproval[]
  asset             Asset?            @relation(fields: [assetId], references: [id])
}
```

### 3.3 Database Setup Commands

```bash
# Generate Prisma client
bun run db:generate

# Push schema to database
bun run db:push

# Run migrations
bun run db:migrate

# Reset database
bun run db:reset

# Seed database
bun run db:seed
```

---

## 4. USER ROLES & PRIVILEGES

### 4.1 Role Hierarchy

| Role | Level | Description |
|------|-------|-------------|
| ADMIN | 10 | Full system access |
| SUPERVISOR | 5 | Workshop supervision |
| TECHNICIAN | 2 | Workshop technicians |
| STOREMAN | 3 | Store management |
| HOFIN | 4 | Head of Finance |
| HOMANAGER | 6 | Head of Operations |
| CONTROL | 3 | Inventory control |

### 4.2 Privilege Categories

#### Asset Management
| Code | Name | Description |
|------|------|-------------|
| ASSET_VIEW | View Assets | View asset registry |
| ASSET_CREATE | Create Assets | Add new assets |
| ASSET_EDIT | Edit Assets | Modify asset details |
| ASSET_DELETE | Delete Assets | Remove assets |

#### Job Cards
| Code | Name | Description |
|------|------|-------------|
| JC_VIEW | View Job Cards | View job cards |
| JC_CREATE | Create Job Cards | Create new job cards |
| JC_EDIT | Edit Job Cards | Modify job cards |
| JC_APPROVE | Approve Job Cards | Approve job cards |
| JC_CLOSE | Close Job Cards | Close completed jobs |
| JC_ASSIGN | Assign Technicians | Assign staff to jobs |

#### Material Management
| Code | Name | Description |
|------|------|-------------|
| MR_VIEW | View Requests | View material requests |
| MR_CREATE | Create Requests | Create material requests |
| MR_APPROVE | Approve Requests | Approve material requests |
| INV_VIEW | View Inventory | View inventory levels |
| INV_MANAGE | Manage Inventory | Adjust inventory |
| GRN_PROCESS | Process GRN | Process goods received |

#### Procurement
| Code | Name | Description |
|------|------|-------------|
| PR_CREATE | Create PR | Create purchase requisitions |
| PO_APPROVE | Approve PO | Approve purchase orders |
| INVOICE_APPROVE | Approve Invoices | Approve supplier invoices |
| SUPPLIER_MANAGE | Manage Suppliers | Manage supplier records |

#### System Administration
| Code | Name | Description |
|------|------|-------------|
| USER_MANAGE | Manage Users | Create/edit users |
| ROLE_MANAGE | Manage Roles | Manage role definitions |
| PRIVILEGE_MANAGE | Manage Privileges | Manage privileges |
| AUDIT_VIEW | View Audit | View audit logs |
| CONFIG_MANAGE | Manage Config | System configuration |

### 4.3 Privilege Check Implementation

```typescript
// Helper function to check privileges
export function hasPrivilege(
  user: UserWithRoles,
  privilegeCode: string,
  maxAmount?: number
): boolean {
  // Check role-based privileges
  for (const role of user.roles) {
    for (const rp of role.role.privileges) {
      if (rp.privilege.code === privilegeCode && rp.isGranted) {
        if (maxAmount && rp.maxAmount && rp.maxAmount < maxAmount) {
          continue;
        }
        return true;
      }
    }
  }

  // Check user overrides
  for (const override of user.privilegeOverrides) {
    if (override.privilege.code === privilegeCode) {
      return override.isGranted;
    }
  }

  return false;
}
```

---

## 5. API ENDPOINTS

### 5.1 Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/callback/credentials` | Login with credentials |
| GET | `/api/auth/session` | Get current session |
| POST | `/api/auth/signout` | Logout |

### 5.2 Job Cards

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/job-cards` | List all job cards |
| POST | `/api/job-cards` | Create new job card |
| GET | `/api/job-cards/[id]` | Get single job card |
| PUT | `/api/job-cards/[id]` | Update job card |
| DELETE | `/api/job-cards/[id]` | Delete job card |
| POST | `/api/job-cards/[id]/transition` | Change job status |
| GET | `/api/job-cards/[id]/photos` | Get job photos |
| POST | `/api/job-cards/[id]/photos` | Upload job photo |
| POST | `/api/job-cards/[id]/assign` | Assign technicians |
| POST | `/api/job-cards/[id]/approvals` | Add approval |

### 5.3 Assets

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/assets` | List all assets |
| POST | `/api/assets` | Create new asset |
| GET | `/api/assets/[id]` | Get single asset |
| PUT | `/api/assets/[id]` | Update asset |
| DELETE | `/api/assets/[id]` | Delete asset |
| GET | `/api/assets/[id]/meters` | Get meter readings |
| POST | `/api/assets/[id]/meters` | Add meter reading |

### 5.4 Materials & Inventory

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/material-requests` | List material requests |
| POST | `/api/material-requests` | Create request |
| PUT | `/api/material-requests/[id]/approve` | Approve request |
| GET | `/api/inventory/items` | List inventory items |
| POST | `/api/inventory/items` | Create item |
| GET | `/api/inventory/stores` | List stores |
| POST | `/api/grn` | Create GRN |
| POST | `/api/material-issues` | Issue material |

### 5.5 Procurement

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/pr` | List PRs |
| POST | `/api/pr` | Create PR |
| GET | `/api/purchase-orders` | List POs |
| POST | `/api/purchase-orders` | Create PO |
| GET | `/api/invoices` | List invoices |
| POST | `/api/invoices/[id]/match` | Match invoice to PO |
| GET | `/api/suppliers` | List suppliers |
| POST | `/api/suppliers` | Create supplier |

### 5.6 Users & Roles

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List users |
| POST | `/api/users` | Create user |
| PUT | `/api/users/[id]` | Update user |
| DELETE | `/api/users/[id]` | Delete user |
| GET | `/api/roles` | List roles |
| POST | `/api/roles` | Create role |
| GET | `/api/privileges` | List privileges |
| GET | `/api/privileges/check` | Check user privilege |

### 5.7 Reports & Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | Dashboard data |
| GET | `/api/dashboard/analytics` | Analytics data |
| GET | `/api/reports` | Generate report |
| GET | `/api/saved-reports` | List saved reports |
| POST | `/api/saved-reports` | Save report |

### 5.8 Quality & Audit

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/quality` | List inspections |
| POST | `/api/quality` | Create inspection |
| GET | `/api/audit` | List audit logs |
| GET | `/api/webhooks` | List webhooks |
| POST | `/api/webhooks` | Create webhook |

---

## 6. COMPONENT STRUCTURE

### 6.1 Directory Structure

```
src/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── auth/
│   │   ├── job-cards/
│   │   ├── assets/
│   │   ├── material-requests/
│   │   ├── users/
│   │   └── ...
│   ├── dashboard/                # Dashboard routes
│   │   ├── layout.tsx           # Dashboard layout
│   │   ├── page.tsx             # Dashboard home
│   │   ├── assets/              # Assets page
│   │   ├── job-cards/           # Job cards page
│   │   └── ...
│   ├── login/                   # Login page
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Home (redirect)
│
├── components/
│   ├── ui/                      # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   └── ...
│   ├── wcp/                     # Feature components
│   │   ├── dashboard-view.tsx
│   │   ├── assets-view.tsx
│   │   ├── job-cards-view.tsx
│   │   └── ...
│   └── providers/               # Context providers
│       └── session-provider.tsx
│
├── lib/
│   ├── auth/                    # Authentication
│   │   ├── options.ts           # NextAuth config
│   │   ├── hooks.ts             # Auth hooks
│   │   └── session.ts           # Session utils
│   ├── db.ts                    # Prisma client
│   ├── utils.ts                 # Utilities
│   ├── privileges.ts            # Privilege helpers
│   └── ...                      # Other utilities
│
└── hooks/                       # Custom hooks
    └── use-auth.ts
```

### 6.2 Key Components

#### Dashboard Components
| Component | File | Purpose |
|-----------|------|---------|
| Dashboard View | `dashboard-view.tsx` | Main dashboard |
| Assets View | `assets-view.tsx` | Asset management |
| Job Cards View | `job-cards-view.tsx` | Job card management |
| Inventory View | `inventory-view.tsx` | Inventory management |
| Reports View | `reports-view.tsx` | Reporting interface |

#### UI Components (shadcn/ui)
| Component | Purpose |
|-----------|---------|
| Button | Form button |
| Input | Text input |
| Select | Dropdown select |
| Dialog | Modal dialog |
| Sheet | Side panel |
| Table | Data table |
| Card | Content card |
| Badge | Status indicator |
| Toast | Notification |

---

## 7. FEATURE MODULES

### 7.1 Asset Management

**Features:**
- Asset registry with categories
- QR code generation and tracking
- Meter readings (odometer, hours)
- Asset specifications
- Maintenance history
- Asset disposal tracking

**Key Files:**
- Component: `components/wcp/assets-view.tsx`
- API: `app/api/assets/`
- Model: `Asset`, `AssetCategory`, `AssetMeter`

### 7.2 Job Card System

**Features:**
- Job creation and assignment
- Task breakdown
- Photo documentation with EXIF validation
- Status workflow (Draft → In Progress → Completed → Closed)
- Approval workflow
- Cost tracking
- SLA monitoring

**Key Files:**
- Component: `components/wcp/job-cards-view.tsx`
- API: `app/api/job-cards/`
- Model: `JobCard`, `JcTask`, `JcPhoto`, `JcStateTransition`

**State Machine:**
```
DRAFT → ASSIGNED → IN_PROGRESS → PENDING_APPROVAL → COMPLETED → CLOSED
         ↓           ↓              ↓                  ↓
      CANCELLED   ON_HOLD        REJECTED          CANCELLED
```

### 7.3 Material Management

**Features:**
- Material request workflow
- Approval process
- Goods Received Notes (GRN)
- Material issue tracking
- Stock level management
- Stock taking

**Key Files:**
- Component: `components/wcp/material-requests-view.tsx`
- API: `app/api/material-requests/`
- Model: `MaterialRequest`, `GrnHeader`, `MaterialIssue`

### 7.4 Procurement

**Features:**
- Purchase Requisitions (PR)
- Request for Quotation (RFQ)
- Purchase Orders (PO)
- Invoice matching (3-way matching)
- Supplier management

**Key Files:**
- Component: `components/wcp/purchase-orders-view.tsx`
- API: `app/api/pr/`, `app/api/purchase-orders/`
- Model: `PrHeader`, `PurchaseOrder`, `Invoice`

### 7.5 Quality Management

**Features:**
- Quality inspections
- Defect tracking
- Corrective actions
- Quality templates
- Inspection reports

**Key Files:**
- Component: `components/wcp/quality-view.tsx`
- API: `app/api/quality/`
- Model: `QualityInspection`, `QualityDefect`

### 7.6 Preventive Maintenance

**Features:**
- PM templates
- Scheduled PMs
- Execution tracking
- Checklist management
- Downtime logging

**Key Files:**
- Component: `components/wcp/pm-view.tsx`
- API: `app/api/pm/`
- Model: `PmTemplate`, `PmSchedule`, `PmExecution`

### 7.7 Reporting & Analytics

**Features:**
- Custom report generation
- Scheduled reports
- PDF export
- Excel export
- Dashboard widgets
- KPI tracking

**Key Files:**
- Component: `components/wcp/reports-view.tsx`
- API: `app/api/reports/`
- Model: `SavedReport`, `ReportSchedule`, `KpiSnapshot`

---

## 8. AUTHENTICATION SYSTEM

### 8.1 NextAuth Configuration

**File:** `src/lib/auth/options.ts`

```typescript
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // 1. Validate credentials
        // 2. Fetch user with roles and privileges
        // 3. Compare password hash
        // 4. Return user object with roles/privileges
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60 // 24 hours
  },
  pages: {
    signIn: "/login",
    error: "/login"
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.roles = user.roles;
        token.privileges = user.privileges;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        ...session.user,
        roles: token.roles,
        privileges: token.privileges
      };
      return session;
    }
  }
};
```

### 8.2 Auth Hook

**File:** `src/hooks/use-auth.ts`

```typescript
export function useAuth() {
  const { data: session, status } = useSession();

  const user = session?.user;
  const isLoading = status === "loading";
  const isAuthenticated = !!session;

  const isAdmin = () => {
    return user?.roles?.some(r => r.code === "ADMIN");
  };

  const isSupervisor = () => {
    return user?.roles?.some(r => r.code === "SUPERVISOR");
  };

  const hasPrivilege = (code: string) => {
    return user?.privileges?.includes(code) || isAdmin();
  };

  return {
    user,
    isLoading,
    isAuthenticated,
    isAdmin,
    isSupervisor,
    hasPrivilege,
    logout: signOut
  };
}
```

---

## 9. SETUP INSTRUCTIONS

### 9.1 Prerequisites

- Node.js 18+ or Bun
- Git

### 9.2 Installation Steps

1. **Clone the repository**
```bash
git clone https://github.com/yohan114/SAP2000-WorkshopMode.git
cd SAP2000-WorkshopMode
```

2. **Install dependencies**
```bash
bun install
```

3. **Configure environment variables**

Create `.env` file:
```env
# Database
DATABASE_URL="file:./db/custom.db"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# App
NODE_ENV="development"
```

4. **Setup database**
```bash
# Generate Prisma client
bun run db:generate

# Push schema to database
bun run db:push

# Seed database
bun run db:seed
```

5. **Start development server**
```bash
bun run dev
```

6. **Access the application**
- URL: http://localhost:3000
- Default admin: `admin@wcp.com` / `password123`

### 9.3 Production Build

```bash
# Build the application
bun run build

# Start production server
bun run start
```

---

## 10. DEVELOPMENT WORKFLOW

### 10.1 Creating a New Feature

1. **Create API Route**
```
src/app/api/[feature-name]/route.ts
```

2. **Create Page Route**
```
src/app/dashboard/[feature-name]/page.tsx
```

3. **Create View Component**
```
src/components/wcp/[feature-name]-view.tsx
```

4. **Add Navigation Item**
```typescript
// src/app/dashboard/layout.tsx
const navigationItems = [
  // ...
  { id: 'feature-name', label: 'Feature Name', href: '/dashboard/feature-name', icon: Icon }
];
```

### 10.2 Adding Privileges

1. **Add privilege definition**
```typescript
// Prisma seed
{ code: 'FEATURE_CREATE', name: 'Create Feature', category: 'FEATURE' }
```

2. **Check privilege in API**
```typescript
if (!hasPrivilege(session, 'FEATURE_CREATE')) {
  return new NextResponse('Forbidden', { status: 403 });
}
```

3. **Conditionally show UI**
```typescript
const { hasPrivilege } = useAuth();
{hasPrivilege('FEATURE_CREATE') && <CreateButton />}
```

### 10.3 Common Patterns

#### API Response Pattern
```typescript
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await db.model.findMany();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
```

#### Data Fetching Pattern
```typescript
import { useQuery } from '@tanstack/react-query';

function useData() {
  return useQuery({
    queryKey: ['data'],
    queryFn: async () => {
      const res = await fetch('/api/data');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  });
}
```

#### Form Pattern
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email()
});

function MyForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema)
  });

  const onSubmit = async (data) => {
    await fetch('/api/data', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input {...register('name')} />
      {errors.name && <span>{errors.name.message}</span>}
      <Button type="submit">Submit</Button>
    </form>
  );
}
```

---

## APPENDIX

### A. Default Login Credentials

| Email | Password | Role |
|-------|----------|------|
| admin@wcp.com | password123 | Administrator |
| supervisor@wcp.com | password123 | Supervisor |
| tech1@wcp.com | password123 | Technician |
| storeman@wcp.com | password123 | Storekeeper |

### B. Database Migration Commands

```bash
# Create a new migration
bunx prisma migrate dev --name migration_name

# Reset database
bunx prisma migrate reset

# Generate client
bunx prisma generate

# Open Prisma Studio
bunx prisma studio
```

### C. Useful Scripts

```bash
# Lint code
bun run lint

# Type check
bunx tsc --noEmit

# Format code
bunx prettier --write .
```

---

**Document Version:** 1.0
**Last Updated:** 2025
**Platform:** Workshop Control Platform v2.0
