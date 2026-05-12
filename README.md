# SAP2000 Workshop Control Platform (WCP)

A comprehensive workshop management system for tracking job cards, service jobs, assets/fleet, inventory, purchasing, fuel, quality, KPIs, and more. Built with modern web technologies for real-time workshop operations management.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Prerequisites](#prerequisites)
- [Installation Steps](#installation-steps)
- [Running the Application](#running-the-application)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)
- [Key Features / Modules](#key-features--modules)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)
- [Default Login Credentials](#default-login-credentials)
- [Tech Stack Details](#tech-stack-details)
- [Contributing](#contributing)
- [License](#license)

---

## Project Overview

The Workshop Control Platform (WCP) is a full-featured web application designed for managing all aspects of a mechanical workshop. It provides tools for tracking vehicles, managing service jobs with auto-generated job numbers, monitoring inventory levels, handling purchase orders, tracking fuel consumption, managing quality control, and measuring performance through KPIs.

The platform is built as a single-page application with a modern dashboard interface, role-based access control, and comprehensive reporting capabilities.

---

## Prerequisites

Before you begin, make sure you have the following installed on your machine:

### 1. Node.js (v18 or higher, v22 recommended)

Download and install from [https://nodejs.org](https://nodejs.org)

To verify your installation:

```bash
node --version
```

### 2. Bun (Package Manager)

Bun is used as the package manager and runtime for this project. Install it with:

```bash
curl -fsSL https://bun.sh/install | bash
```

After installation, restart your terminal and verify:

```bash
bun --version
```

### 3. Git

Download and install from [https://git-scm.com](https://git-scm.com)

To verify:

```bash
git --version
```

### 4. Code Editor

We recommend [Visual Studio Code](https://code.visualstudio.com/) for the best development experience with TypeScript and Next.js projects.

---

## Installation Steps

Follow these steps in order. Copy and paste each command into your terminal.

### Step 1: Clone the Repository

```bash
git clone https://github.com/yohan114/SAP2000-WorkshopMode.git
```

### Step 2: Navigate to the Project Directory

```bash
cd SAP2000-WorkshopMode
```

### Step 3: Switch to the Correct Branch

```bash
git checkout fix/typescript-errors-v6.0
```

### Step 4: Install Dependencies

```bash
bun install
```

This will download and install all required packages. It may take a minute or two depending on your internet speed.

### Step 5: Create the Environment File

Create a file named `.env` in the root of the project with the following content:

```bash
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
```

You can create this file manually or run:

```bash
echo 'DATABASE_URL="file:./dev.db"' > .env
echo 'NEXTAUTH_SECRET="your-secret-key-here"' >> .env
echo 'NEXTAUTH_URL="http://localhost:3000"' >> .env
```

For production, replace `your-secret-key-here` with a strong random string. You can generate one with:

```bash
openssl rand -base64 32
```

### Step 6: Generate the Prisma Client

```bash
bun run db:generate
```

This generates the database client code that the application uses to interact with the database.

### Step 7: Push the Database Schema

```bash
bun run db:push
```

This creates the SQLite database file and sets up all the tables based on the Prisma schema.

### Step 8: Seed the Database

```bash
bun run seed:all
```

This populates the database with initial data including privileges, roles, and lookup data.

### Step 9: Create the Admin User

```bash
bun prisma/create-admin.ts
```

This creates the default administrator account you will use to log in.

---

## Running the Application

### Development Mode

Start the development server with hot-reload:

```bash
bun run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

### Production Build

Build the application for production:

```bash
bun run build
```

### Production Start

Start the production server (after building):

```bash
bun run start
```

---

## Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `bun run dev` | Start the development server on port 3000 |
| `build` | `bun run build` | Create a production build with standalone output |
| `start` | `bun run start` | Start the production server |
| `lint` | `bun run lint` | Run ESLint to check for code issues |
| `db:push` | `bun run db:push` | Push the Prisma schema to the database |
| `db:generate` | `bun run db:generate` | Generate the Prisma client |
| `db:migrate` | `bun run db:migrate` | Run database migrations in development |
| `db:reset` | `bun run db:reset` | Reset the database and re-run migrations |
| `db:seed` | `bun run db:seed` | Run the main database seed file |
| `seed:privileges` | `bun run seed:privileges` | Seed privilege/permission data |
| `seed:roles` | `bun run seed:roles` | Seed role data |
| `seed:lpa` | `bun run seed:lpa` | Seed LPA (lookup) data |
| `seed:all` | `bun run seed:all` | Run all seed scripts in sequence |
| `production:setup` | `bun run production:setup` | Run the full production setup script |

---

## Project Structure

```
SAP2000-WorkshopMode/
├── prisma/              # Database schema, migrations, seeds
│   ├── schema.prisma    # Database models and relations
│   ├── seed.ts          # Main seed file
│   ├── seed-privileges.ts  # Privilege seeding
│   ├── seed-roles.ts    # Role seeding
│   ├── seed-lpa.ts      # Lookup data seeding
│   └── create-admin.ts  # Admin user creation script
├── src/
│   ├── app/             # Next.js App Router
│   │   ├── (dashboard)/ # Dashboard pages (layout + routes)
│   │   └── api/         # API routes
│   ├── components/
│   │   ├── ui/          # shadcn/ui components
│   │   ├── wcp/         # Feature-specific views
│   │   └── navigation/  # Navigation components
│   ├── hooks/           # Custom React hooks
│   └── lib/             # Utilities, auth, API helpers
├── public/              # Static assets
├── .env                 # Environment variables (create this)
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
├── tailwind.config.ts   # Tailwind CSS configuration
└── next.config.ts       # Next.js configuration
```

---

## Key Features / Modules

The platform includes the following modules:

- **Dashboard with Analytics** - Real-time overview of workshop operations with charts and metrics
- **Job Cards Management** - Create, track, and manage workshop job cards
- **Service Jobs** - Auto-generated job numbers in the format YYYY/S/MM/NNN (e.g., 2026/S/01/001)
- **Asset/Fleet Management** - Track vehicles, equipment, and fleet information
- **Fuel Tracking** - Monitor fuel consumption and costs per vehicle
- **Inventory Management** - Track stock levels, locations, and movements
- **Material Requests and Issues** - Request and issue materials from inventory
- **Purchase Orders and Quotations** - Create and manage purchase orders and supplier quotations
- **GRN (Goods Received Notes)** - Record goods received against purchase orders
- **Stock Take** - Conduct and record physical stock counts
- **Invoices and Budget** - Manage invoicing and budget tracking
- **Reports** - Total outside cost, monthly reports, purchasing reports, price variation analysis
- **Quality Control** - Track quality inspections and non-conformances
- **KPI Tracking** - Monitor key performance indicators for workshop efficiency
- **Audit Trail** - Complete history of all system changes
- **Employee Management and Training** - Manage staff records and training schedules
- **Preventive Maintenance (PM)** - Schedule and track preventive maintenance activities
- **Document Management** - Store and organize workshop documents
- **Wrong Item Return Tracking** - Track returned items with delay calculation
- **User/Role/Privilege Management** - Role-based access control with granular permissions
- **Notifications and Webhooks** - Real-time notifications and external integrations

---

## Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | Yes | Path to the SQLite database file | `file:./dev.db` |
| `NEXTAUTH_SECRET` | Yes | Secret key for encrypting session tokens | `your-secret-key-here` |
| `NEXTAUTH_URL` | Yes | The base URL of your application | `http://localhost:3000` |

---

## Troubleshooting

### "Prisma client not generated" or "Cannot find module '@prisma/client'"

Run the Prisma generate command:

```bash
bun run db:generate
```

### Port 3000 is already in use

Either stop the process using port 3000:

```bash
# On Linux/Mac
lsof -ti:3000 | xargs kill -9

# On Windows
netstat -ano | findstr :3000
taskkill /PID <PID_NUMBER> /F
```

Or start the app on a different port:

```bash
bun run dev -- -p 3001
```

### Database errors or "table does not exist"

Re-sync the database schema:

```bash
bun run db:push
```

If that does not work, delete the database file and start fresh:

```bash
rm prisma/dev.db
bun run db:push
bun run seed:all
bun prisma/create-admin.ts
```

### "Module not found" errors

Reinstall all dependencies:

```bash
bun install
```

### TypeScript errors during build

Make sure you are on the correct branch:

```bash
git checkout fix/typescript-errors-v6.0
```

Then regenerate the Prisma client:

```bash
bun run db:generate
```

---

## Default Login Credentials

After running the seed scripts and creating the admin user, you can log in with:

| Field | Value |
|-------|-------|
| Email | `admin@workshop.com` |
| Password | `Admin@123` |

If these credentials do not work, check the file `prisma/create-admin.ts` for the actual values used during admin creation.

---

## Tech Stack Details

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16 | React framework with App Router |
| TypeScript | 5 | Type-safe JavaScript |
| Tailwind CSS | 4 | Utility-first CSS framework |
| shadcn/ui | Latest | Accessible UI component library |
| Prisma | 6 | Database ORM with type safety |
| SQLite | - | Lightweight file-based database |
| NextAuth.js | 4 | Authentication and session management |
| Zod | 4 | Schema validation |
| Zustand | 5 | Lightweight state management |
| TanStack Query | 5 | Server state and data fetching |
| TanStack Table | 8 | Headless table and datagrid |
| Framer Motion | 12 | Animation library |
| Recharts | 2 | Chart and data visualization |
| React Hook Form | 7 | Form handling and validation |
| Lucide React | Latest | Icon library |
| date-fns | 4 | Date utility functions |
| bcryptjs | 3 | Password hashing |
| jsPDF | 4 | PDF generation |
| xlsx | 0.18 | Excel file export |

---

## Contributing

Contributions are welcome. To contribute:

1. Fork the repository
2. Create a new branch for your feature (`git checkout -b feature/your-feature-name`)
3. Make your changes and commit them with clear messages
4. Push to your fork (`git push origin feature/your-feature-name`)
5. Open a Pull Request against the `fix/typescript-errors-v6.0` branch

Please ensure your code:
- Passes the linter (`bun run lint`)
- Builds without errors (`bun run build`)
- Follows the existing code style and conventions

---

## License

This project is proprietary software. All rights reserved.
