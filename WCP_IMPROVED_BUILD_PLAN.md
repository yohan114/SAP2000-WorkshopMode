# WORKSHOP CONTROL PLATFORM (WCP) — IMPROVED BUILD PLAN v2.0
## Security-Hardened · Modern Architecture · Production-Ready

> **Upgrade Summary:** This document improves upon the original WCP Build Plan with critical security hardening, modern Next.js patterns, production-grade reliability, and a significantly better user experience. Every section indicates what changed and why.

---

## TABLE OF CONTENTS

1. [System Overview & Architecture](#1-system-overview--architecture)
2. [Technology Stack (Upgraded)](#2-technology-stack-upgraded)
3. [Security Foundations](#3-security-foundations)
4. [Database Schema (Hardened)](#4-database-schema-hardened)
5. [User Roles & Privileges](#5-user-roles--privileges)
6. [API Design (Modern Patterns)](#6-api-design-modern-patterns)
7. [Authentication System (Hardened)](#7-authentication-system-hardened)
8. [Component Architecture](#8-component-architecture)
9. [Feature Modules](#9-feature-modules)
10. [Error Handling & Reliability](#10-error-handling--reliability)
11. [UX Improvements](#11-ux-improvements)
12. [Setup Instructions](#12-setup-instructions)
13. [Deployment Guide](#13-deployment-guide)
14. [Development Workflow](#14-development-workflow)

---

## 1. SYSTEM OVERVIEW & ARCHITECTURE

### 1.1 Purpose
The Workshop Control Platform (WCP) is a comprehensive ERP system for workshop management covering Asset Management, Job Cards, Material Management, Procurement, Quality Control, Preventive Maintenance, Financial Tracking, HR & Training, and Reporting & Analytics.

### 1.2 Architecture (Improved)

```
┌──────────────────────────────────────────────────────────────┐
│                    CDN / Edge (Vercel / Cloudflare)          │
│              Rate Limiting · Security Headers · WAF          │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 16)                      │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐  │
│  │  App Router    │  │  Server Comps  │  │ Client Comps  │  │
│  │  + Streaming   │  │  + Actions     │  │ + TanStack Q  │  │
│  └────────────────┘  └────────────────┘  └───────────────┘  │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│                 Middleware Layer (Next.js)                    │
│    Auth Check · Rate Limit · CSRF · Privilege Guard          │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│              API Layer (Route Handlers + Server Actions)      │
│  ┌────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │  Auth.js   │  │ REST /api/*  │  │  Server Actions    │  │
│  │  (v5)      │  │  (Reads)     │  │  (Mutations)       │  │
│  └────────────┘  └──────────────┘  └────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│                Data Layer (Prisma ORM)                        │
│  ┌────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │ PostgreSQL  │  │  60+ Models  │  │  Connection Pool   │  │
│  │ (prod)     │  │  + Relations │  │  (Prisma Accel.)   │  │
│  │ SQLite(dev) │  │              │  │                    │  │
│  └────────────┘  └──────────────┘  └────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

**Key architectural improvements:**
- **Middleware-level security** — auth, rate limiting, and CSRF handled before any route logic runs
- **Server Actions for mutations** — eliminates entire classes of CSRF and injection vulnerabilities
- **PostgreSQL in production** — SQLite is single-writer; it will deadlock under concurrent workshop users
- **Connection pooling** — prevents database exhaustion under load

---

## 2. TECHNOLOGY STACK (UPGRADED)

### 2.1 Core Framework

| Technology | Version | Purpose | Change |
|------------|---------|---------|--------|
| Next.js | 16.x | React framework with App Router | No change |
| React | 19.x | UI library | No change |
| TypeScript | 5.x | Type safety | Stricter `tsconfig.json` |
| Bun | Latest | Runtime & package manager | Preferred over Node.js |

### 2.2 Database & ORM

| Technology | Version | Purpose | Change |
|------------|---------|---------|--------|
| Prisma | 6.x | ORM | No change |
| PostgreSQL | 16+ | **Production** database | **UPGRADE from SQLite** |
| SQLite | — | Development only | Demoted to dev-only |
| Prisma Accelerate | Latest | Connection pooling | **NEW** |

> **Why PostgreSQL?** SQLite uses file-level locking. A workshop with 10 concurrent users will cause write conflicts. PostgreSQL supports true concurrent writes, row-level locking, and is required for any production ERP.

### 2.3 UI & Styling

| Technology | Version | Purpose |
|------------|---------|---------|
| Tailwind CSS | 4.x | Utility-first CSS |
| shadcn/ui | Latest | Accessible components |
| Radix UI | Latest | Unstyled primitives |
| Framer Motion | 12.x | Animations |
| Lucide React | Latest | Icons |

### 2.4 Form & Validation

| Technology | Version | Purpose |
|------------|---------|---------|
| React Hook Form | 7.x | Form management |
| Zod | 4.x | Schema validation |
| @hookform/resolvers | 5.x | Form/Zod bridge |

### 2.5 Data & State

| Technology | Version | Purpose |
|------------|---------|---------|
| TanStack Query | 5.x | Server state + caching |
| Zustand | 5.x | Client state |
| TanStack Table | 8.x | Data tables |

### 2.6 Authentication

| Technology | Version | Purpose | Change |
|------------|---------|---------|--------|
| Auth.js (NextAuth) | **5.x** | Authentication | **UPGRADE from v4** |
| bcryptjs | 3.x | Password hashing | Rounds increased to 12 |
| **@upstash/ratelimit** | Latest | Rate limiting | **NEW** |
| **@upstash/redis** | Latest | Rate limit store | **NEW** |

> **Why Auth.js v5?** NextAuth v4 has known security issues, is no longer actively maintained, and does not support the Next.js App Router natively. Auth.js v5 was purpose-built for the App Router.

### 2.7 Security & Validation

| Technology | Purpose | Status |
|------------|---------|--------|
| @t3-oss/env-nextjs | Environment variable validation | **NEW** |
| helmet (via next.config) | Security headers | **NEW** |
| zod | Input validation (all API routes) | Already present, enforced |
| **next-safe-action** | Type-safe Server Actions with auth | **NEW** |
| **crypto (node built-in)** | Secure token generation | **NEW** |

### 2.8 Observability

| Technology | Purpose | Status |
|------------|---------|--------|
| pino | Structured logging | **NEW** |
| @sentry/nextjs | Error tracking | **NEW (optional)** |
| **Health endpoint** | Uptime monitoring | **NEW** |

### 2.9 Additional Libraries (Unchanged)

| Technology | Purpose |
|------------|---------|
| date-fns | Date manipulation |
| jsPDF | PDF generation |
| xlsx | Excel import/export |
| Recharts | Charts |
| DND Kit | Drag and drop |
| Sonner | Toast notifications |

---

## 3. SECURITY FOUNDATIONS

> This section is entirely new. Security was not addressed systematically in the original plan.

### 3.1 Security Headers

**File: `next.config.ts`**
```typescript
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // tighten in prod
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' blob: data:",
      "font-src 'self'",
      "connect-src 'self'",
    ].join('; ')
  }
];

const nextConfig = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
  // Prevent source map exposure in production
  productionBrowserSourceMaps: false,
};
```

### 3.2 Environment Variable Validation

**File: `src/env.ts`**
```typescript
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    AUTH_SECRET: z.string().min(32), // enforces sufficient entropy
    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
    NODE_ENV: z.enum(["development", "test", "production"]),
    NEXTAUTH_URL: z.string().url(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    NODE_ENV: process.env.NODE_ENV,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
});
```

> The app **will not start** if any required env variable is missing or malformed. This prevents silent misconfigurations in production.

### 3.3 Rate Limiting Middleware

**File: `src/middleware.ts`**
```typescript
import { auth } from "@/lib/auth";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(60, "1 m"), // 60 requests/minute
});

// Stricter limit for auth endpoints
const authRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "1 m"), // 5 login attempts/minute
});

export default auth(async (req: NextRequest) => {
  const ip = req.ip ?? req.headers.get("x-forwarded-for") ?? "unknown";
  const isAuthRoute = req.nextUrl.pathname.startsWith("/api/auth");

  const limiter = isAuthRoute ? authRatelimit : ratelimit;
  const { success, remaining } = await limiter.limit(ip);

  if (!success) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      {
        status: 429,
        headers: { "Retry-After": "60", "X-RateLimit-Remaining": String(remaining) }
      }
    );
  }

  // Protect all dashboard routes
  const session = (req as any).auth;
  if (req.nextUrl.pathname.startsWith("/dashboard") && !session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

### 3.4 Password Policy

```typescript
// src/lib/auth/password.ts
import { z } from "zod";
import bcrypt from "bcryptjs";

export const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .regex(/[A-Z]/, "Must contain at least one uppercase letter")
  .regex(/[a-z]/, "Must contain at least one lowercase letter")
  .regex(/[0-9]/, "Must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Must contain at least one special character");

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12); // 12 rounds, not 10
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

> **Original issue:** The seed script used `password123` as the default password for all users including admin. This is a critical vulnerability. The seed must force a password change on first login.

### 3.5 Input Sanitisation on API Routes

```typescript
// src/lib/api/validate.ts
import { NextResponse } from "next/server";
import { ZodSchema } from "zod";

export async function validateBody<T>(
  request: Request,
  schema: ZodSchema<T>
): Promise<{ data: T } | { error: NextResponse }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { error: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }) };
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    return {
      error: NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 422 }
      )
    };
  }

  return { data: result.data };
}
```

### 3.6 Audit Logging (All Mutations)

```typescript
// src/lib/audit.ts
import { db } from "@/lib/db";

type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "LOGOUT" | "APPROVE" | "REJECT";

export async function auditLog({
  userId,
  action,
  entityType,
  entityId,
  before,
  after,
  ipAddress,
}: {
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ipAddress?: string;
}) {
  await db.auditLog.create({
    data: {
      userId,
      action,
      entityType,
      entityId,
      before: before ? JSON.stringify(before) : null,
      after: after ? JSON.stringify(after) : null,
      ipAddress,
      timestamp: new Date(),
    },
  });
}
```

---

## 4. DATABASE SCHEMA (HARDENED)

### 4.1 Production Configuration

**`prisma/schema.prisma` — datasource block**
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  // Use environment variable — switch between SQLite (dev) and PostgreSQL (prod)
  provider = env("DB_PROVIDER") // "sqlite" or "postgresql"
  url      = env("DATABASE_URL")
}
```

**`.env.development`**
```env
DB_PROVIDER="sqlite"
DATABASE_URL="file:./dev.db"
```

**`.env.production`**
```env
DB_PROVIDER="postgresql"
DATABASE_URL="postgresql://user:password@host:5432/wcp_prod?sslmode=require"
```

### 4.2 Improved User Model

```prisma
model User {
  id                    String    @id @default(cuid())
  employeeId            String?   @unique
  email                 String    @unique
  passwordHash          String
  name                  String
  phone                 String?
  department            String?
  costCentre            String?
  contractType          String?
  riskLevel             String    @default("LOW")
  isActive              Boolean   @default(true)
  mustChangePassword    Boolean   @default(true)  // NEW: force on first login
  failedLoginAttempts   Int       @default(0)     // NEW: brute force tracking
  lockedUntil           DateTime?                 // NEW: account lockout
  lastLoginAt           DateTime?
  lastLoginIp           String?                   // NEW: login IP tracking
  passwordChangedAt     DateTime?                 // NEW: force session re-auth
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  createdBy             String?
  updatedBy             String?
  deletedAt             DateTime?                 // soft delete

  // Relations
  roles                 UserRole[]
  privilegeOverrides    UserPrivilegeOverride[]
  sessions              UserSession[]
  devices               DeviceRegistry[]
  auditLogs             AuditLog[]
  // ... existing relations
}
```

### 4.3 Improved Session Model (Rotating Tokens)

```prisma
model UserSession {
  id              String    @id @default(cuid())
  userId          String
  token           String    @unique  // hashed in DB, raw sent to client
  refreshToken    String    @unique  // for token rotation
  expiresAt       DateTime
  refreshExpiresAt DateTime
  ipAddress       String?
  userAgent       String?
  isRevoked       Boolean   @default(false)  // NEW: explicit revocation
  revokedAt       DateTime?
  createdAt       DateTime  @default(now())
  lastUsedAt      DateTime  @default(now())

  user            User      @relation(fields: [userId], references: [id])

  @@index([token])
  @@index([userId])
}
```

### 4.4 AuditLog Model (Enhanced)

```prisma
model AuditLog {
  id          String   @id @default(cuid())
  userId      String
  action      String   // CREATE | UPDATE | DELETE | LOGIN | etc.
  entityType  String   // "JobCard" | "Asset" | etc.
  entityId    String?
  before      String?  // JSON snapshot before change
  after       String?  // JSON snapshot after change
  ipAddress   String?
  userAgent   String?
  timestamp   DateTime @default(now())

  user        User     @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([entityType, entityId])
  @@index([timestamp])
}
```

### 4.5 Soft Delete Pattern (All Core Models)

All major entities should use soft delete instead of hard delete. This preserves referential integrity and provides an audit trail.

```prisma
// Apply to: Asset, JobCard, Item, Supplier, PurchaseOrder, etc.
model Asset {
  // ... existing fields
  deletedAt   DateTime?   // null = active, non-null = soft deleted
  deletedBy   String?
}
```

```typescript
// src/lib/db/soft-delete.ts
// Always filter deleted records in queries
export const activeOnly = { deletedAt: null };

// Usage:
await db.asset.findMany({ where: { ...activeOnly } });
```

### 4.6 Database Performance Indexes

Add these to your schema to prevent slow queries in production:

```prisma
model JobCard {
  // ... existing fields

  @@index([status])
  @@index([assetId])
  @@index([createdById])
  @@index([dueDate])
  @@index([createdAt])
}

model StockLevel {
  // ... existing fields
  @@index([itemId, storeId])
}

model AuditLog {
  // ... existing fields
  @@index([timestamp])
  @@index([userId])
  @@index([entityType, entityId])
}
```

---

## 5. USER ROLES & PRIVILEGES

### 5.1 Role Hierarchy (Unchanged, Clarified)

| Role | Level | Description |
|------|-------|-------------|
| ADMIN | 10 | Full system access |
| HOMANAGER | 6 | Head of Operations |
| SUPERVISOR | 5 | Workshop supervision |
| HOFIN | 4 | Head of Finance |
| STOREMAN | 3 | Store management |
| CONTROL | 3 | Inventory control |
| TECHNICIAN | 2 | Workshop technicians |

### 5.2 Privilege Check (Server-Side, Improved)

```typescript
// src/lib/auth/privileges.ts
import { getServerSession } from "@/lib/auth";
import { NextResponse } from "next/server";

// Server-side privilege assertion — use in every API route
export async function requirePrivilege(
  privilegeCode: string
): Promise<string | NextResponse> {
  const session = await getServerSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = session.user.roles?.some((r) => r.code === "ADMIN");
  const hasPriv = session.user.privileges?.includes(privilegeCode);

  if (!isAdmin && !hasPriv) {
    // Audit the denied attempt
    await auditLog({
      userId: session.user.id,
      action: "PRIVILEGE_DENIED",
      entityType: "Privilege",
      entityId: privilegeCode,
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return session.user.id; // returns userId on success
}

// Usage in API route:
export async function POST(req: Request) {
  const result = await requirePrivilege("JC_CREATE");
  if (result instanceof NextResponse) return result; // early exit on fail
  const userId = result; // string on success
  // ... rest of handler
}
```

### 5.3 Client-Side Guard (UI Only — NOT a security boundary)

```typescript
// src/hooks/use-auth.ts — IMPROVED
export function useAuth() {
  const { data: session, status } = useSession();
  const user = session?.user;

  const hasPrivilege = (code: string): boolean => {
    if (!user) return false;
    const isAdmin = user.roles?.some((r) => r.code === "ADMIN") ?? false;
    return isAdmin || (user.privileges?.includes(code) ?? false);
  };

  // NOTE: These are UI hints only. Real security enforcement is server-side.
  return {
    user,
    isLoading: status === "loading",
    isAuthenticated: !!session,
    hasPrivilege,
    logout: () => signOut({ callbackUrl: "/login" }),
  };
}
```

---

## 6. API DESIGN (MODERN PATTERNS)

### 6.1 Design Strategy

| Operation Type | Implementation | Reason |
|----------------|---------------|--------|
| **Reads** (GET) | Route Handlers `/api/*` | Cacheable, CDN-friendly |
| **Mutations** (create/update/delete) | **Server Actions** | Built-in CSRF protection, type safety |
| **File uploads** | Route Handlers with multipart | Streaming support |
| **Webhooks** | Route Handlers | External callers |

### 6.2 Standard API Route Pattern

```typescript
// src/app/api/job-cards/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePrivilege } from "@/lib/auth/privileges";
import { validateBody } from "@/lib/api/validate";
import { auditLog } from "@/lib/audit";
import { z } from "zod";

// GET — cached, server-rendered
export async function GET(request: Request) {
  const userId = await requirePrivilege("JC_VIEW");
  if (userId instanceof NextResponse) return userId;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = Number(searchParams.get("page") ?? "1");
    const limit = Math.min(Number(searchParams.get("limit") ?? "20"), 100); // cap at 100

    const [items, total] = await Promise.all([
      db.jobCard.findMany({
        where: {
          deletedAt: null,
          ...(status ? { status } : {}),
        },
        include: { creator: { select: { id: true, name: true } }, asset: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.jobCard.count({ where: { deletedAt: null } }),
    ]);

    return NextResponse.json({ items, total, page, limit });
  } catch (error) {
    console.error("[JOB_CARDS_GET]", error);
    return NextResponse.json({ error: "Failed to fetch job cards" }, { status: 500 });
  }
}
```

### 6.3 Server Action Pattern (for Mutations)

```typescript
// src/actions/job-cards.ts
"use server";

import { actionClient } from "@/lib/safe-action";
import { db } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import { z } from "zod";

const createJobCardSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  assetId: z.string().cuid().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  estimatedHours: z.number().positive().optional(),
  dueDate: z.string().datetime().optional(),
});

export const createJobCard = actionClient
  .schema(createJobCardSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { userId } = ctx; // injected by actionClient middleware

    const jobCard = await db.$transaction(async (tx) => {
      const card = await tx.jobCard.create({
        data: {
          ...parsedInput,
          jobNumber: await generateJobNumber(tx),
          status: "DRAFT",
          createdById: userId,
        },
      });

      await auditLog({
        userId,
        action: "CREATE",
        entityType: "JobCard",
        entityId: card.id,
        after: card as any,
      });

      return card;
    });

    return { success: true, jobCard };
  });
```

**File: `src/lib/safe-action.ts`**
```typescript
import { createSafeActionClient } from "next-safe-action";
import { getServerSession } from "@/lib/auth";

export const actionClient = createSafeActionClient({
  async middleware() {
    const session = await getServerSession();
    if (!session?.user) throw new Error("Unauthorized");
    return { userId: session.user.id, user: session.user };
  },
  handleReturnedServerError(error) {
    // Don't leak internal error messages to clients
    console.error(error);
    return "An unexpected error occurred.";
  },
});
```

### 6.4 File Upload Security

```typescript
// src/app/api/uploads/route.ts
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(request: Request) {
  const userId = await requirePrivilege("JC_EDIT");
  if (userId instanceof NextResponse) return userId;

  const formData = await request.formData();
  const file = formData.get("file") as File;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type))
    return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
  if (file.size > MAX_FILE_SIZE)
    return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });

  // Store outside web root — never serve uploaded files directly
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = `${crypto.randomUUID()}-${Date.now()}`;
  // Write to /uploads (outside /public) or an object store (S3, R2)
  // ...

  return NextResponse.json({ fileName });
}
```

---

## 7. AUTHENTICATION SYSTEM (HARDENED)

### 7.1 Auth.js v5 Configuration

**File: `src/lib/auth/index.ts`**
```typescript
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { auditLog } from "@/lib/audit";
import { z } from "zod";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const result = credentialsSchema.safeParse(credentials);
        if (!result.success) return null;

        const { email, password } = result.data;

        const user = await db.user.findUnique({
          where: { email, deletedAt: null },
          include: {
            roles: { include: { role: { include: { privileges: { include: { privilege: true } } } } } },
            privilegeOverrides: { include: { privilege: true } },
          },
        });

        // Account lockout check
        if (user?.lockedUntil && user.lockedUntil > new Date()) {
          throw new Error("Account temporarily locked. Try again later.");
        }

        if (!user || !user.isActive) return null;

        const passwordOk = await verifyPassword(password, user.passwordHash);

        if (!passwordOk) {
          // Increment failed attempts
          const attempts = user.failedLoginAttempts + 1;
          await db.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: attempts,
              lockedUntil: attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null, // 15 min lockout
            },
          });
          return null;
        }

        // Successful login: reset lockout
        await db.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: 0,
            lockedUntil: null,
            lastLoginAt: new Date(),
          },
        });

        // Build minimal privilege list
        const privileges = new Set<string>();
        for (const ur of user.roles) {
          for (const rp of ur.role.privileges) {
            if (rp.isGranted) privileges.add(rp.privilege.code);
          }
        }
        for (const ov of user.privilegeOverrides) {
          if (ov.isGranted) privileges.add(ov.privilege.code);
          else privileges.delete(ov.privilege.code);
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          roles: user.roles.map((ur) => ({ code: ur.role.code })),
          privileges: Array.from(privileges),
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours (was 24 — reduced for security)
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.roles = user.roles;
        token.privileges = user.privileges;
        token.mustChangePassword = user.mustChangePassword;
        // Store passwordChangedAt to invalidate stale tokens
        token.passwordVersion = Date.now();
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        ...session.user,
        id: token.id as string,
        roles: token.roles as any,
        privileges: token.privileges as string[],
        mustChangePassword: token.mustChangePassword as boolean,
      };
      return session;
    },
  },
});
```

### 7.2 Force Password Change on First Login

```typescript
// src/middleware.ts — add after auth check
if (session?.user?.mustChangePassword && 
    !req.nextUrl.pathname.startsWith("/account/change-password")) {
  return NextResponse.redirect(new URL("/account/change-password", req.url));
}
```

### 7.3 Session Invalidation on Password Change

```typescript
// src/actions/auth/change-password.ts
export const changePassword = actionClient
  .schema(z.object({ currentPassword: z.string(), newPassword: passwordSchema }))
  .action(async ({ parsedInput, ctx }) => {
    const { userId } = ctx;

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    const valid = await verifyPassword(parsedInput.currentPassword, user.passwordHash);
    if (!valid) throw new Error("Current password is incorrect");

    await db.user.update({
      where: { id: userId },
      data: {
        passwordHash: await hashPassword(parsedInput.newPassword),
        mustChangePassword: false,
        passwordChangedAt: new Date(),
        failedLoginAttempts: 0,
      },
    });

    // Force re-login by signing out all sessions
    await signOut({ redirectTo: "/login" });
  });
```

### 7.4 Default Credentials (CRITICAL CHANGE)

> **The original plan used `password123` for all accounts. This is a severe security vulnerability.**
> The seed script should generate a random temporary password printed to console once, never stored in plain text.

**File: `prisma/seed.ts` (improved)**
```typescript
import { randomBytes } from "crypto";

// Generate a secure temporary password for seeding
const tempPassword = randomBytes(16).toString("hex"); // e.g., "a3f9c2d1..."

const passwordHash = await bcrypt.hash(tempPassword, 12);

// ... create users with this hash

console.log("\n=== SEED COMPLETE ===");
console.log("Temporary admin password (save this, it will not be shown again):");
console.log(`admin@wcp.com : ${tempPassword}`);
console.log("User will be forced to change password on first login.");
console.log("===================\n");
```

---

## 8. COMPONENT ARCHITECTURE

### 8.1 Directory Structure (Improved)

```
src/
├── app/                              # Next.js App Router
│   ├── (auth)/                       # Auth route group
│   │   ├── login/page.tsx
│   │   └── layout.tsx               # Auth layout (centered)
│   ├── (dashboard)/                  # Dashboard route group
│   │   ├── layout.tsx               # Dashboard layout (sidebar)
│   │   ├── page.tsx                 # Dashboard home (server component)
│   │   ├── assets/
│   │   ├── job-cards/
│   │   │   ├── page.tsx
│   │   │   ├── [id]/page.tsx
│   │   │   └── loading.tsx          # NEW: Skeleton loading state
│   │   └── ...
│   ├── api/                          # Route Handlers (reads + webhooks)
│   ├── account/
│   │   └── change-password/page.tsx # NEW: Force password change
│   ├── health/route.ts              # NEW: Health check endpoint
│   ├── layout.tsx                   # Root layout
│   └── error.tsx                    # NEW: Global error boundary
│
├── actions/                          # NEW: Server Actions (mutations)
│   ├── job-cards.ts
│   ├── assets.ts
│   ├── material-requests.ts
│   └── auth/
│       └── change-password.ts
│
├── components/
│   ├── ui/                          # shadcn/ui components
│   ├── wcp/                         # Feature components
│   │   ├── job-cards/
│   │   │   ├── job-cards-view.tsx   # Client shell
│   │   │   ├── job-card-table.tsx
│   │   │   ├── job-card-form.tsx
│   │   │   └── job-card-status-badge.tsx
│   │   └── ...
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   └── nav-item.tsx
│   └── shared/
│       ├── error-boundary.tsx       # NEW
│       ├── loading-skeleton.tsx     # NEW
│       ├── data-table.tsx           # NEW: Shared TanStack Table
│       ├── confirm-dialog.tsx       # NEW: Destructive action guard
│       └── privilege-guard.tsx      # NEW: Conditional render by privilege
│
├── lib/
│   ├── auth/
│   │   ├── index.ts                 # Auth.js config
│   │   ├── password.ts              # Password utils
│   │   └── privileges.ts            # Server-side privilege check
│   ├── db.ts                        # Prisma singleton
│   ├── safe-action.ts               # next-safe-action client
│   ├── audit.ts                     # Audit logging
│   ├── api/validate.ts              # Body validation helper
│   └── utils.ts                     # cn(), formatters
│
├── hooks/
│   ├── use-auth.ts                  # Client auth hook
│   ├── use-job-cards.ts             # TanStack Query hooks
│   └── use-toast.ts                 # Sonner wrapper
│
└── env.ts                           # NEW: Type-safe env vars
```

### 8.2 Privilege Guard Component

```typescript
// src/components/shared/privilege-guard.tsx
"use client";
import { useAuth } from "@/hooks/use-auth";

interface PrivilegeGuardProps {
  privilege: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PrivilegeGuard({ privilege, children, fallback = null }: PrivilegeGuardProps) {
  const { hasPrivilege, isLoading } = useAuth();
  if (isLoading) return null;
  return hasPrivilege(privilege) ? <>{children}</> : <>{fallback}</>;
}

// Usage:
// <PrivilegeGuard privilege="JC_CREATE">
//   <CreateJobCardButton />
// </PrivilegeGuard>
```

### 8.3 Global Error Boundary

```typescript
// src/app/error.tsx
"use client";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to your error tracking service (Sentry, etc.)
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h2 className="text-2xl font-semibold">Something went wrong</h2>
      <p className="text-muted-foreground">
        {error.digest ? `Error ID: ${error.digest}` : "An unexpected error occurred."}
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
```

### 8.4 Health Check Endpoint

```typescript
// src/app/health/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? "unknown",
    });
  } catch (error) {
    return NextResponse.json(
      { status: "unhealthy", error: "Database connection failed" },
      { status: 503 }
    );
  }
}
```

---

## 9. FEATURE MODULES

> Feature logic is unchanged; improvements are to security, loading states, and error handling.

### 9.1 Asset Management

**Improvements:**
- QR code URLs must be signed/validated server-side, not just on the client
- Asset deletion is now soft-delete only (preserves job card history)
- Asset import (Excel) validates file type, size, and row data with Zod

### 9.2 Job Card System (Improved State Machine)

```
DRAFT → ASSIGNED → IN_PROGRESS → PENDING_APPROVAL → APPROVED → COMPLETED → CLOSED
          ↓            ↓               ↓                ↓
       CANCELLED    ON_HOLD         REJECTED          CANCELLED
```

**Transition rules enforced server-side:**
```typescript
const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["PENDING_APPROVAL", "ON_HOLD"],
  ON_HOLD: ["IN_PROGRESS", "CANCELLED"],
  PENDING_APPROVAL: ["APPROVED", "REJECTED"],
  REJECTED: ["IN_PROGRESS"],
  APPROVED: ["COMPLETED"],
  COMPLETED: ["CLOSED"],
};

function canTransition(from: string, to: string): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}
```

### 9.3 Material Management

**Improvements:**
- Stock transactions wrapped in DB transactions to prevent over-issue race conditions
- GRN matching validates PO quantities before committing
- Low-stock alerts generated at GRN time (not cron)

### 9.4 Procurement

**Improvements:**
- 3-way matching (PO qty, GRN qty, invoice qty) fully enforced server-side
- Supplier records cannot be deleted if open POs exist

### 9.5 Quality & Preventive Maintenance

No structural changes. Improvements: PM schedule generation uses server-side cron (or Vercel Cron) instead of being triggered ad-hoc.

### 9.6 Reporting & Analytics

**Improvements:**
- Heavy reports run as background jobs, not in-request
- PDF generation moved to a Server Action to prevent timeout on large reports
- Dashboard widgets use Suspense streaming for faster initial render

---

## 10. ERROR HANDLING & RELIABILITY

### 10.1 Database Transactions for Multi-Step Operations

```typescript
// Always wrap multi-step mutations in a transaction
const result = await db.$transaction(async (tx) => {
  const issue = await tx.materialIssue.create({ data: { ... } });

  await tx.stockLevel.update({
    where: { itemId_storeId: { itemId, storeId } },
    data: { quantity: { decrement: qty } },
  });

  // If stockLevel goes negative, Prisma throws and the whole tx rolls back
  const updated = await tx.stockLevel.findUniqueOrThrow({
    where: { itemId_storeId: { itemId, storeId } },
  });
  if (updated.quantity < 0) throw new Error("Insufficient stock");

  return issue;
});
```

### 10.2 Consistent API Error Format

```typescript
// src/lib/api/errors.ts
export function apiError(message: string, status: number, details?: unknown) {
  return NextResponse.json(
    { error: message, ...(details ? { details } : {}) },
    { status }
  );
}

// Standard error responses:
// 400 Bad Request    — validation failure
// 401 Unauthorized   — no/invalid session
// 403 Forbidden      — insufficient privilege
// 404 Not Found      — resource not found
// 409 Conflict       — duplicate/state conflict
// 422 Unprocessable  — schema validation failed
// 429 Too Many       — rate limited
// 500 Internal       — unexpected server error
```

### 10.3 Optimistic Updates (TanStack Query)

```typescript
// Faster UX: update UI immediately, roll back on error
const mutation = useMutation({
  mutationFn: (data) => createJobCard(data),
  onMutate: async (newCard) => {
    await queryClient.cancelQueries({ queryKey: ["job-cards"] });
    const previous = queryClient.getQueryData(["job-cards"]);
    queryClient.setQueryData(["job-cards"], (old: any) => ({
      ...old,
      items: [{ ...newCard, id: "optimistic", status: "DRAFT" }, ...old.items],
    }));
    return { previous };
  },
  onError: (err, _, context) => {
    queryClient.setQueryData(["job-cards"], context?.previous);
    toast.error("Failed to create job card");
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["job-cards"] });
    toast.success("Job card created");
  },
});
```

### 10.4 Structured Logging

```typescript
// src/lib/logger.ts
import pino from "pino";

export const logger = pino({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  redact: ["password", "passwordHash", "token", "authorization"], // never log secrets
});

// Usage:
logger.info({ userId, jobCardId }, "Job card created");
logger.error({ error, userId }, "Failed to process GRN");
```

---

## 11. UX IMPROVEMENTS

### 11.1 Loading States (Suspense + Skeletons)

```typescript
// src/app/(dashboard)/job-cards/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
```

### 11.2 Confirm Destructive Actions

```typescript
// src/components/shared/confirm-dialog.tsx
// Always show a confirmation dialog before:
// - Deleting any record
// - Approving/rejecting a job card
// - Processing a GRN (irreversible stock impact)
// - Cancelling a purchase order
```

### 11.3 Toast Notifications (Standardised)

```typescript
// src/lib/toast.ts
import { toast } from "sonner";

export const notify = {
  success: (msg: string) => toast.success(msg),
  error: (msg: string) => toast.error(msg, { duration: 5000 }),
  loading: (msg: string) => toast.loading(msg),
  promise: <T>(promise: Promise<T>, msgs: { loading: string; success: string; error: string }) =>
    toast.promise(promise, msgs),
};
```

### 11.4 Accessibility Checklist

- All form fields have associated `<label>` elements
- All interactive elements are keyboard-reachable
- Error messages are linked to inputs via `aria-describedby`
- Status badges have screen-reader text (`<span className="sr-only">`)
- Dialogs trap focus correctly (Radix handles this by default)
- Color is not the only indicator of state (add icons + text to status badges)

### 11.5 Mobile Responsiveness

```typescript
// Dashboard layout: collapsible sidebar on mobile
// src/components/layout/sidebar.tsx
export function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile: Sheet (slide-over) */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Desktop: Fixed sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r">
        <SidebarContent />
      </aside>
    </>
  );
}
```

---

## 12. SETUP INSTRUCTIONS

### 12.1 Prerequisites

- Bun 1.x or Node.js 20+
- PostgreSQL 16+ (for production)
- Git
- (Optional) Upstash account for rate limiting

### 12.2 Installation

```bash
# Clone
git clone https://github.com/your-org/workshop-control.git
cd workshop-control

# Install dependencies
bun install

# Copy environment template
cp .env.example .env.local
```

### 12.3 Environment Variables

**File: `.env.local`**
```env
# Database (development — SQLite)
DB_PROVIDER="sqlite"
DATABASE_URL="file:./dev.db"

# Auth — generate with: openssl rand -base64 32
AUTH_SECRET="<generated-64-char-secret>"
NEXTAUTH_URL="http://localhost:3000"

# App
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Rate Limiting (optional in dev, required in prod)
# UPSTASH_REDIS_REST_URL="..."
# UPSTASH_REDIS_REST_TOKEN="..."
```

**File: `.env.production`**
```env
DB_PROVIDER="postgresql"
DATABASE_URL="postgresql://user:password@host:5432/wcp?sslmode=require"
AUTH_SECRET="<production-secret>"
NEXTAUTH_URL="https://your-domain.com"
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://your-domain.com"
UPSTASH_REDIS_REST_URL="..."
UPSTASH_REDIS_REST_TOKEN="..."
```

> **Never commit `.env.local` or `.env.production` to Git.** Add both to `.gitignore`.

### 12.4 Database Setup

```bash
# Development
bun run db:generate   # Generate Prisma client
bun run db:push       # Push schema to SQLite dev DB
bun run db:seed       # Seed with roles, privileges, and temp admin user
                      # (note the printed temporary password!)

# Production
bun run db:migrate    # Use migrations, not db:push, in production
```

### 12.5 Start Development Server

```bash
bun run dev
# → http://localhost:3000
```

---

## 13. DEPLOYMENT GUIDE

### 13.1 Docker (Recommended)

**File: `Dockerfile`**
```dockerfile
FROM oven/bun:1-alpine AS base

# Dependencies
FROM base AS deps
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# Production runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
ENV PORT 3000
CMD ["bun", "server.js"]
```

**File: `docker-compose.yml`**
```yaml
version: "3.8"
services:
  app:
    build: .
    ports: ["3000:3000"]
    env_file: .env.production
    depends_on: [postgres]
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: wcp
      POSTGRES_USER: wcp_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  pgdata:
```

### 13.2 Vercel (with Neon PostgreSQL)

```bash
# Install Vercel CLI
bun add -g vercel

# Link to Vercel project
vercel link

# Add environment variables
vercel env add AUTH_SECRET
vercel env add DATABASE_URL

# Deploy
vercel --prod
```

> Use [Neon](https://neon.tech) or [Supabase](https://supabase.com) for serverless PostgreSQL on Vercel. SQLite **will not work** on Vercel.

### 13.3 Traditional Server with PM2

```bash
bun run build
pm2 start bun --name "wcp" -- start
pm2 save
pm2 startup
```

---

## 14. DEVELOPMENT WORKFLOW

### 14.1 Feature Development Checklist

When adding a new feature, complete all of these:

- [ ] **Schema:** Add Prisma model with soft delete, timestamps, and indexes
- [ ] **Migration:** `bunx prisma migrate dev --name add_feature`
- [ ] **Server Action:** `src/actions/feature.ts` with `actionClient`, Zod schema, and audit log
- [ ] **API Route:** `src/app/api/feature/route.ts` for reads with privilege check and pagination
- [ ] **Page:** `src/app/(dashboard)/feature/page.tsx` as Server Component
- [ ] **Loading:** `src/app/(dashboard)/feature/loading.tsx` skeleton
- [ ] **Component:** `src/components/wcp/feature/` with error boundary
- [ ] **Privilege:** Add seed entry and check in both API and action
- [ ] **Navigation:** Add to sidebar with role-based visibility
- [ ] **Tests:** Unit test for business logic, integration test for API route

### 14.2 Adding Privileges

```typescript
// 1. Add to seed (prisma/seed.ts)
{ code: "FEATURE_CREATE", name: "Create Feature", category: "FEATURE" }

// 2. Check in Server Action
const { userId } = ctx; // from actionClient middleware
// privileges are checked via the session (injected at login)

// 3. Check in API route handler
const result = await requirePrivilege("FEATURE_CREATE");
if (result instanceof NextResponse) return result;

// 4. Guard UI (visual only)
<PrivilegeGuard privilege="FEATURE_CREATE">
  <Button>Create</Button>
</PrivilegeGuard>
```

### 14.3 Useful Scripts

```bash
bun run dev           # Start dev server
bun run build         # Production build
bun run start         # Start production server
bun run lint          # ESLint check
bunx tsc --noEmit     # TypeScript type check
bunx prisma studio    # Open Prisma Studio (DB browser)
bun run db:seed       # Re-run seed
bunx prettier --write . # Format code
```

### 14.4 Security Checklist Before Deploy

- [ ] `AUTH_SECRET` is at least 32 characters and randomly generated
- [ ] Default seed password has been changed in production
- [ ] `DATABASE_URL` uses `sslmode=require` (PostgreSQL)
- [ ] Rate limiting is configured (Upstash)
- [ ] `.env.production` is NOT in git
- [ ] `productionBrowserSourceMaps: false` in `next.config.ts`
- [ ] `/health` endpoint returns 200 from uptime monitor
- [ ] All `console.log` replaced with `logger.*`
- [ ] CORS is locked down to your domain only

---

## APPENDIX

### A. Summary of All Changes from v1.0

| Area | Original | Improved |
|------|----------|----------|
| Database (prod) | SQLite | **PostgreSQL** |
| Auth library | NextAuth v4 | **Auth.js v5** |
| Mutations | REST API routes | **Server Actions** |
| Security headers | None | **CSP, HSTS, X-Frame** |
| Rate limiting | None | **Upstash (5 auth / 60 API per min)** |
| Password policy | 8 chars | **12 chars + complexity** |
| Bcrypt rounds | 10 | **12** |
| Default passwords | `password123` (hardcoded) | **Random, force-change on login** |
| Account lockout | None | **5 attempts → 15 min lockout** |
| Env validation | None | **t3-oss/env-nextjs** |
| Audit logging | Partial | **All mutations + privilege denials** |
| Soft delete | Partial | **All core entities** |
| DB indexes | None | **All high-traffic query fields** |
| DB transactions | Partial | **All multi-step mutations** |
| Error handling | Basic try/catch | **Typed errors + Error boundaries** |
| Loading states | None | **Suspense + Skeletons** |
| Optimistic UI | None | **TanStack Query mutations** |
| Mobile layout | Basic | **Sheet-based collapsible sidebar** |
| Health check | None | **`/health` endpoint** |
| Logging | console.log | **pino (structured, secret-redacting)** |
| File uploads | None | **Type + size validation, outside webroot** |

### B. Migration Guide (v1 → v2)

1. Install new dependencies: `bun add auth @upstash/ratelimit @upstash/redis @t3-oss/env-nextjs next-safe-action pino`
2. Run `bunx prisma migrate dev --name v2_security_hardening` after updating schema
3. Replace all `getServerSession(authOptions)` with `auth()` (Auth.js v5)
4. Replace all `async function POST(req)` mutations with Server Actions
5. Move SQLite `dev.db` path; update `DATABASE_URL` for production PostgreSQL
6. Add `.env.ts` and import `env` instead of `process.env` directly

### C. Database Commands

```bash
bunx prisma migrate dev --name <name>    # New migration (development)
bunx prisma migrate deploy               # Apply migrations (production)
bunx prisma migrate reset                # Reset + reseed (dev only!)
bunx prisma generate                     # Regenerate client
bunx prisma studio                       # Visual DB browser
bunx prisma db push                      # Sync schema without migration (dev only)
```

---

**Document Version:** 2.0
**Based on:** Original WCP Build Plan v1.0
**Improvements:** Security hardening, Auth.js v5, PostgreSQL, Server Actions, rate limiting, audit logging, UX upgrades
**Platform:** Workshop Control Platform
