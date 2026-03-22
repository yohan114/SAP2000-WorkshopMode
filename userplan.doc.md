# USER PLAN: BUILD YOUR OWN WORKSHOP CONTROL PLATFORM
## A Complete Implementation Guide for Recreating This Fullstack Website

---

## INTRODUCTION

This document provides a comprehensive guide to recreate the Workshop Control Platform (WCP) - a fullstack ERP system for workshop management. Follow these steps to build your own website with similar functionality.

---

## PART 1: PROJECT OVERVIEW

### What You Will Build
A complete Workshop Management System with:
- User Authentication & Role-Based Access Control
- Asset Management with QR Codes
- Job Card System with Photo Documentation
- Material Management & Inventory
- Procurement Workflow
- Quality Control
- Preventive Maintenance
- Reporting & Analytics
- Audit Trail

### Target Users
- Workshop Managers
- Technicians
- Storekeepers
- Procurement Officers
- Quality Inspectors
- Administrators

---

## PART 2: TECHNOLOGY SELECTION

### Required Technologies

| Category | Technology | Version | Why? |
|----------|------------|---------|------|
| **Framework** | Next.js | 16+ | React-based, SSR, API routes included |
| **Language** | TypeScript | 5+ | Type safety, better DX |
| **Database** | SQLite + Prisma | 6+ | Simple setup, easy to migrate |
| **Styling** | Tailwind CSS | 4+ | Utility-first, fast development |
| **UI Components** | shadcn/ui | Latest | Accessible, customizable |
| **Auth** | NextAuth.js | 4+ | Complete auth solution |
| **Forms** | React Hook Form + Zod | Latest | Type-safe validation |
| **Charts** | Recharts | Latest | React charts |
| **Tables** | TanStack Table | 8+ | Headless tables |
| **Icons** | Lucide React | Latest | Tree-shakeable icons |
| **Date** | date-fns | Latest | Date utilities |
| **PDF** | jsPDF | Latest | PDF generation |

### Optional Technologies
- **Runtime**: Bun (faster than Node.js)
- **State**: Zustand (lightweight state management)
- **Data Fetching**: TanStack Query (server state)
- **Animations**: Framer Motion

---

## PART 3: PROJECT SETUP

### Step 1: Initialize Project

```bash
# Create new Next.js project
npx create-next-app@latest workshop-control --typescript --tailwind --app

# Navigate to project
cd workshop-control

# Install additional dependencies
npm install next-auth @prisma/client bcryptjs
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
npm install @radix-ui/react-select @radix-ui/react-tabs
npm install @radix-ui/react-avatar @radix-ui/react-label
npm install class-variance-authority clsx tailwind-merge
npm install lucide-react date-fns
npm install react-hook-form zod @hookform/resolvers
npm install @tanstack/react-table @tanstack/react-query
npm install recharts sonner
npm install -D prisma

# Initialize shadcn/ui
npx shadcn-ui@latest init
```

### Step 2: Configure Project

**File: `package.json` scripts**
```json
{
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:seed": "tsx prisma/seed.ts"
  }
}
```

**File: `.env`**
```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
```

---

## PART 4: DATABASE DESIGN

### Step 1: Define Prisma Schema

**File: `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// ==================== USER MANAGEMENT ====================

model User {
  id            String    @id @default(cuid())
  employeeId    String?   @unique
  email         String    @unique
  passwordHash  String
  name          String
  department    String?
  isActive      Boolean   @default(true)
  lastLoginAt   DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  roles         UserRole[]
  jobCards      JobCard[]
  materialRequests MaterialRequest[]
  sessions      UserSession[]

  @@map("User")
}

model Role {
  id          String   @id @default(cuid())
  code        String   @unique
  name        String
  level       Int
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())

  users       UserRole[]
  privileges  RolePrivilege[]

  @@map("Role")
}

model UserRole {
  id        String   @id @default(cuid())
  userId    String
  roleId    String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id])
  role      Role     @relation(fields: [roleId], references: [id])

  @@unique([userId, roleId])
  @@map("UserRole")
}

model Privilege {
  id        String   @id @default(cuid())
  code      String   @unique
  name      String
  category  String
  isActive  Boolean  @default(true)

  rolePrivileges RolePrivilege[]

  @@map("Privilege")
}

model RolePrivilege {
  id          String   @id @default(cuid())
  roleId      String
  privilegeId String
  isGranted   Boolean  @default(false)

  role        Role     @relation(fields: [roleId], references: [id])
  privilege   Privilege @relation(fields: [privilegeId], references: [id])

  @@unique([roleId, privilegeId])
  @@map("RolePrivilege")
}

model UserSession {
  id           String   @id @default(cuid())
  userId       String
  token        String   @unique
  expiresAt    DateTime
  createdAt    DateTime @default(now())

  user         User     @relation(fields: [userId], references: [id])

  @@map("UserSession")
}

// ==================== ASSET MANAGEMENT ====================

model Asset {
  id            String    @id @default(cuid())
  assetCode     String    @unique
  name          String
  category      String
  description   String?
  location      String?
  status        String    @default("ACTIVE")
  qrCode        String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  jobCards      JobCard[]
  meterReadings MeterReading[]

  @@map("Asset")
}

model MeterReading {
  id          String   @id @default(cuid())
  assetId     String
  reading     Float
  unit        String
  recordedAt  DateTime @default(now())
  recordedBy  String

  asset       Asset    @relation(fields: [assetId], references: [id])

  @@map("MeterReading")
}

// ==================== JOB CARDS ====================

model JobCard {
  id              String    @id @default(cuid())
  jobNumber       String    @unique
  title           String
  description     String?
  assetId         String?
  status          String    @default("DRAFT")
  priority        String    @default("MEDIUM")
  estimatedHours  Float?
  actualHours     Float?
  estimatedCost   Float?
  actualCost      Float?
  startedAt       DateTime?
  completedAt     DateTime?
  createdById     String
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  creator         User          @relation(fields: [createdById], references: [id])
  asset           Asset?        @relation(fields: [assetId], references: [id])
  tasks           JobTask[]
  photos          JobPhoto[]
  transitions     StateTransition[]

  @@map("JobCard")
}

model JobTask {
  id          String   @id @default(cuid())
  jobCardId   String
  title       String
  description String?
  isCompleted Boolean  @default(false)
  createdAt   DateTime @default(now())

  jobCard     JobCard  @relation(fields: [jobCardId], references: [id])

  @@map("JobTask")
}

model JobPhoto {
  id          String   @id @default(cuid())
  jobCardId   String
  fileName    String
  filePath    String
  uploadedAt  DateTime @default(now())

  jobCard     JobCard  @relation(fields: [jobCardId], references: [id])

  @@map("JobPhoto")
}

model StateTransition {
  id          String   @id @default(cuid())
  jobCardId   String
  fromStatus  String
  toStatus    String
  transitionedAt DateTime @default(now())
  transitionedBy String

  jobCard     JobCard  @relation(fields: [jobCardId], references: [id])

  @@map("StateTransition")
}

// ==================== MATERIAL MANAGEMENT ====================

model Item {
  id          String   @id @default(cuid())
  itemCode    String   @unique
  name        String
  description String?
  unit        String
  category    String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())

  stockLevels StockLevel[]
  requests    MaterialRequest[]

  @@map("Item")
}

model StockLevel {
  id          String   @id @default(cuid())
  itemId      String
  quantity    Float
  location    String
  updatedAt   DateTime @default(now())

  item        Item     @relation(fields: [itemId], references: [id])

  @@unique([itemId, location])
  @@map("StockLevel")
}

model MaterialRequest {
  id          String    @id @default(cuid())
  requestNo   String    @unique
  itemId      String
  quantity    Float
  status      String    @default("PENDING")
  requestedBy String
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  item        Item      @relation(fields: [itemId], references: [id])
  requester   User      @relation(fields: [requestedBy], references: [id])

  @@map("MaterialRequest")
}

model Store {
  id          String   @id @default(cuid())
  code        String   @unique
  name        String
  location    String?
  isActive    Boolean  @default(true)

  @@map("Store")
}

// ==================== PROCUREMENT ====================

model Supplier {
  id          String   @id @default(cuid())
  code        String   @unique
  name        String
  email       String?
  phone       String?
  address     String?
  isActive    Boolean  @default(true)

  @@map("Supplier")
}

model PurchaseOrder {
  id          String   @id @default(cuid())
  poNumber    String   @unique
  supplierId  String
  status      String   @default("DRAFT")
  totalAmount Float?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  supplier    Supplier @relation(fields: [supplierId], references: [id])

  @@map("PurchaseOrder")
}

model Invoice {
  id          String   @id @default(cuid())
  invoiceNo   String   @unique
  supplierId  String
  poId        String?
  amount      Float
  status      String   @default("PENDING")
  receivedAt  DateTime @default(now())

  @@map("Invoice")
}

// ==================== QUALITY ====================

model QualityInspection {
  id          String   @id @default(cuid())
  inspectionNo String  @unique
  jobCardId   String?
  type        String
  status      String   @default("PENDING")
  inspectedAt DateTime?
  createdAt   DateTime @default(now())

  @@map("QualityInspection")
}

model QualityDefect {
  id              String   @id @default(cuid())
  inspectionId    String
  description     String
  severity        String
  status          String   @default("OPEN")
  reportedAt      DateTime @default(now())

  @@map("QualityDefect")
}

// ==================== AUDIT ====================

model AuditLog {
  id          String   @id @default(cuid())
  userId      String
  action      String
  entity      String
  entityId    String?
  changes     String?
  ipAddress   String?
  createdAt   DateTime @default(now())

  @@map("AuditLog")
}
```

### Step 2: Generate Client and Push Schema

```bash
# Generate Prisma Client
npx prisma generate

# Push schema to database
npx prisma db push

# Open Prisma Studio (optional)
npx prisma studio
```

---

## PART 5: AUTHENTICATION SYSTEM

### Step 1: Setup NextAuth

**File: `src/lib/auth.ts`**
```typescript
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            roles: {
              include: {
                role: {
                  include: {
                    privileges: {
                      include: { privilege: true }
                    }
                  }
                }
              }
            }
          }
        });

        if (!user || !user.isActive) {
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isValid) {
          return null;
        }

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() }
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          roles: user.roles.map(ur => ({
            code: ur.role.code,
            name: ur.role.name,
            level: ur.role.level
          })),
          privileges: user.roles
            .flatMap(ur => ur.role.privileges)
            .filter(rp => rp.isGranted)
            .map(rp => rp.privilege.code)
        };
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60
  },
  pages: {
    signIn: "/login"
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
      if (session.user) {
        session.user.id = token.sub!;
        session.user.roles = token.roles as any[];
        session.user.privileges = token.privileges as string[];
      }
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET
};
```

### Step 2: Create API Route

**File: `src/app/api/auth/[...nextauth]/route.ts`**
```typescript
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
```

### Step 3: Create Auth Hook

**File: `src/hooks/use-auth.ts`**
```typescript
import { useSession } from "next-auth/react";

export function useAuth() {
  const { data: session, status } = useSession();

  const user = session?.user;
  const isLoading = status === "loading";
  const isAuthenticated = !!session;

  const isAdmin = () => {
    return user?.roles?.some((r: any) => r.code === "ADMIN");
  };

  const hasPrivilege = (code: string) => {
    return user?.privileges?.includes(code) || isAdmin();
  };

  return {
    user,
    isLoading,
    isAuthenticated,
    isAdmin,
    hasPrivilege
  };
}
```

---

## PART 6: CREATING CORE FEATURES

### Feature 1: Dashboard

**File: `src/app/dashboard/page.tsx`**
```typescript
import { DashboardStats } from "@/components/dashboard-stats";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <DashboardStats />
    </div>
  );
}
```

**File: `src/components/dashboard-stats.tsx`**
```typescript
import { useQuery } from "@tanstack/react-query";

export function DashboardStats() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/stats");
      return res.json();
    }
  });

  if (!stats) return <div>Loading...</div>;

  return (
    <div className="grid grid-cols-4 gap-4">
      <StatCard title="Total Assets" value={stats.assets} />
      <StatCard title="Active Jobs" value={stats.jobs} />
      <StatCard title="Pending Requests" value={stats.requests} />
      <StatCard title="Open POs" value={stats.pos} />
    </div>
  );
}
```

### Feature 2: Asset Management

**API Route: `src/app/api/assets/route.ts`**
```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const assets = await prisma.asset.findMany({
    include: {
      _count: { select: { jobCards: true } }
    }
  });

  return NextResponse.json(assets);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const asset = await prisma.asset.create({
    data: {
      assetCode: body.code,
      name: body.name,
      category: body.category,
      description: body.description,
      location: body.location
    }
  });

  return NextResponse.json(asset);
}
```

### Feature 3: Job Cards

**API Route: `src/app/api/job-cards/route.ts`**
```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const jobCards = await prisma.jobCard.findMany({
    where: status ? { status } : undefined,
    include: {
      creator: { select: { name: true } },
      asset: true,
      _count: { select: { tasks: true, photos: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json(jobCards);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // Generate job number
  const count = await prisma.jobCard.count();
  const jobNumber = `JC-${String(count + 1).padStart(6, "0")}`;

  const jobCard = await prisma.jobCard.create({
    data: {
      jobNumber,
      title: body.title,
      description: body.description,
      assetId: body.assetId,
      priority: body.priority,
      createdById: session.user.id
    }
  });

  // Create initial state transition
  await prisma.stateTransition.create({
    data: {
      jobCardId: jobCard.id,
      fromStatus: "DRAFT",
      toStatus: "DRAFT",
      transitionedBy: session.user.id
    }
  });

  return NextResponse.json(jobCard);
}
```

---

## PART 7: CREATING UI COMPONENTS

### Component Structure

**File: `src/components/ui/button.tsx`**
```typescript
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        outline: "border border-input bg-background hover:bg-accent",
        ghost: "hover:bg-accent hover:text-accent-foreground"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={buttonVariants({ variant, size, className })}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
```

**File: `src/components/ui/card.tsx`**
```typescript
import * as React from "react";

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={`rounded-lg border bg-card text-card-foreground shadow-sm ${className || ""}`}
    {...props}
  />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={`flex flex-col space-y-1.5 p-6 ${className || ""}`}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={`text-2xl font-semibold leading-none tracking-tight ${className || ""}`}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={`p-6 pt-0 ${className || ""}`} {...props} />
));
CardContent.displayName = "CardContent";

export { Card, CardHeader, CardTitle, CardContent };
```

---

## PART 8: ROUTING STRUCTURE

### File Structure

```
src/app/
├── (auth)/
│   ├── login/
│   │   └── page.tsx
│   └── layout.tsx
├── dashboard/
│   ├── layout.tsx         (Dashboard layout with sidebar)
│   ├── page.tsx           (Dashboard home)
│   ├── assets/
│   │   └── page.tsx
│   ├── job-cards/
│   │   ├── page.tsx
│   │   └── [id]/
│   │       └── page.tsx
│   ├── inventory/
│   │   └── page.tsx
│   └── ...
├── api/
│   ├── auth/
│   ├── assets/
│   ├── job-cards/
│   └── ...
├── layout.tsx             (Root layout)
└── page.tsx               (Home - redirect)
```

### Dashboard Layout

**File: `src/app/dashboard/layout.tsx`**
```typescript
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
```

---

## PART 9: SEEDING DATA

### Seed Script

**File: `prisma/seed.ts`**
```typescript
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create privileges
  const privileges = [
    { code: "ASSET_VIEW", name: "View Assets", category: "ASSET" },
    { code: "ASSET_CREATE", name: "Create Assets", category: "ASSET" },
    { code: "JC_VIEW", name: "View Job Cards", category: "JOB_CARD" },
    { code: "JC_CREATE", name: "Create Job Cards", category: "JOB_CARD" },
    { code: "JC_APPROVE", name: "Approve Job Cards", category: "JOB_CARD" },
    { code: "INV_VIEW", name: "View Inventory", category: "INVENTORY" },
    { code: "ADMIN", name: "Full Admin Access", category: "SYSTEM" }
  ];

  for (const priv of privileges) {
    await prisma.privilege.upsert({
      where: { code: priv.code },
      create: priv,
      update: {}
    });
  }

  // Create roles
  const adminRole = await prisma.role.upsert({
    where: { code: "ADMIN" },
    create: { code: "ADMIN", name: "Administrator", level: 10 },
    update: {}
  });

  const techRole = await prisma.role.upsert({
    where: { code: "TECHNICIAN" },
    create: { code: "TECHNICIAN", name: "Technician", level: 2 },
    update: {}
  });

  // Assign all privileges to admin
  const allPrivs = await prisma.privilege.findMany();
  for (const priv of allPrivs) {
    await prisma.rolePrivilege.upsert({
      where: {
        roleId_privilegeId: { roleId: adminRole.id, privilegeId: priv.id }
      },
      create: { roleId: adminRole.id, privilegeId: priv.id, isGranted: true },
      update: { isGranted: true }
    });
  }

  // Create default users
  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@wcp.com" },
    create: {
      email: "admin@wcp.com",
      name: "System Administrator",
      passwordHash,
      department: "IT"
    },
    update: {}
  });

  const technician = await prisma.user.upsert({
    where: { email: "tech@wcp.com" },
    create: {
      email: "tech@wcp.com",
      name: "John Technician",
      passwordHash,
      department: "Workshop"
    },
    update: {}
  });

  // Assign roles
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
    create: { userId: admin.id, roleId: adminRole.id },
    update: {}
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: technician.id, roleId: techRole.id } },
    create: { userId: technician.id, roleId: techRole.id },
    update: {}
  });

  console.log("Database seeded successfully!");
  console.log("\nDefault Login Credentials:");
  console.log("Admin: admin@wcp.com / password123");
  console.log("Technician: tech@wcp.com / password123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

---

## PART 10: TESTING & DEPLOYMENT

### Running the Application

```bash
# Development
npm run dev

# Build
npm run build

# Production
npm run start
```

### Deployment Options

1. **Vercel** (Recommended for Next.js)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

2. **Docker**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

3. **Traditional Server**
```bash
# Build the application
npm run build

# Start with PM2
pm2 start npm --name "wcp" -- start
```

---

## PART 11: CUSTOMIZATION CHECKLIST

### Things to Customize

- [ ] Company name and logo
- [ ] Color scheme (Tailwind config)
- [ ] Default privileges
- [ ] Email templates
- [ ] Report formats
- [ ] Job card workflow states
- [ ] Asset categories
- [ ] Item categories
- [ ] Units of measurement

### Configuration Files

| File | Purpose |
|------|---------|
| `tailwind.config.ts` | Colors, fonts |
| `next.config.ts` | App configuration |
| `.env` | Environment variables |
| `prisma/schema.prisma` | Database model |

---

## CONCLUSION

This guide provides all the necessary information to recreate the Workshop Control Platform. Follow each part sequentially, and you'll have a fully functional workshop management system.

For questions or support, refer to the main codebase or documentation.

---

**Document Version:** 1.0
**Created:** 2025
**Framework:** Next.js 16 + Prisma + TypeScript
