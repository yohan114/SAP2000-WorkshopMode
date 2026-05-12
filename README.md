# SAP2000 Workshop Control Platform (WCP)

A comprehensive workshop management system for tracking job cards, service jobs, assets/fleet, inventory, purchasing, fuel, quality, KPIs, and more. Built with modern web technologies for real-time workshop operations management.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Prerequisites](#prerequisites)
- [Installation Steps](#installation-steps)
- [Running the Application](#running-the-application)
- [Production Deployment Guide](#production-deployment-guide)
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

## Production Deployment Guide

This section provides a complete guide to deploying the Workshop Control Platform in a production environment. Follow these steps carefully.

### Step 1: Server Requirements

Make sure your production server has:

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| OS | Ubuntu 20.04 / Windows Server 2019 | Ubuntu 22.04 / Windows Server 2022 |
| RAM | 2 GB | 4 GB or more |
| Disk Space | 5 GB | 20 GB or more |
| CPU | 2 cores | 4 cores |
| Node.js | v18 | v22 |
| Bun | v1.0+ | Latest |

### Step 2: Clone and Install on Server

```bash
# Clone the repository
git clone https://github.com/yohan114/SAP2000-WorkshopMode.git
cd SAP2000-WorkshopMode
git checkout fix/typescript-errors-v6.0

# Install dependencies
bun install
```

### Step 3: Configure Production Environment Variables

Create a `.env` file in the project root with the following variables:

```bash
# Database - SQLite file path (use absolute path in production)
DATABASE_URL="file:/var/data/wcp/production.db"

# Authentication - MUST be a strong random secret in production
NEXTAUTH_SECRET="REPLACE_WITH_A_STRONG_RANDOM_STRING"

# Application URL - Your actual domain or server IP
NEXTAUTH_URL="https://your-domain.com"

# Optional: Custom port (defaults to 3000)
PORT=3000
```

To generate a secure NEXTAUTH_SECRET:

```bash
openssl rand -base64 32
```

Important notes on environment variables:

| Variable | Production Value | Notes |
|----------|-----------------|-------|
| `DATABASE_URL` | `file:/absolute/path/to/production.db` | Use an absolute path outside the project folder for data safety |
| `NEXTAUTH_SECRET` | Random 32+ character string | Never use the default. Generate a unique secret for each deployment |
| `NEXTAUTH_URL` | `https://your-domain.com` | Must match the actual URL users access. Include https:// if using SSL |
| `PORT` | `3000` (or your preferred port) | The port the Node.js server listens on |

### Step 4: Set Up the Database

```bash
# Generate Prisma client
bun run db:generate

# Create database tables
bun run db:push

# Seed initial data (privileges, roles, lookup data)
bun run seed:all
```

### Step 5: Create the Production Admin User

Run the production setup script. This will:
- Remove any demo data from the database
- Create the System Administrator account

```bash
bun run production:setup
```

When prompted, type `PRODUCTION` to confirm.

The script will display the admin credentials:

| Field | Value |
|-------|-------|
| Email | `christiegroup@gmail.com` |
| Password | Displayed in terminal (save it immediately) |
| Role | System Administrator (full access) |

Important: Change the admin password after your first login.

### Step 6: Create Additional Users

After logging in as admin, you can create users through the UI:

1. Go to **Users** in the sidebar (Admin section)
2. Click **Create User**
3. Fill in: Name, Email, Employee ID, Department
4. Assign one or more Roles (determines permissions)
5. The system generates a temporary password

Alternatively, you can create users via the API:

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -d '{
    "email": "user@company.com",
    "name": "John Smith",
    "employeeId": "EMP-001",
    "department": "Workshop",
    "roleIds": ["ROLE_ID_HERE"]
  }'
```

### Step 7: Understanding Roles and Privileges

The system uses role-based access control (RBAC):

| Role | Level | Description |
|------|-------|-------------|
| System Administrator | 10 | Full access to all modules |
| Workshop Manager | 8 | Manage job cards, approvals, reports |
| Supervisor | 6 | Create/edit job cards, manage team |
| Technician | 4 | View and update assigned job cards |
| Store Keeper | 4 | Manage inventory, material issues |
| Clerk | 2 | View-only access to most modules |

To create custom roles:
1. Go to **Roles** in the sidebar
2. Click **Create Role**
3. Set name, code, and level (higher = more authority)
4. Go to **Privileges** to assign specific permissions to the role

### Step 8: Build for Production

```bash
# Create the optimized production build
bun run build
```

This generates a standalone build in `.next/standalone/` that includes everything needed to run the server.

### Step 9: Start the Production Server

```bash
# Start the production server
bun run start
```

The server will start on the configured PORT (default: 3000).

For Windows servers, you can use the provided batch file:

```bash
start-server.bat
```

### Step 10: Run as a Background Service

#### Linux (using systemd)

Create a service file at `/etc/systemd/system/wcp.service`:

```ini
[Unit]
Description=Workshop Control Platform
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/SAP2000-WorkshopMode
ExecStart=/root/.bun/bin/bun .next/standalone/server.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

Then enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable wcp
sudo systemctl start wcp

# Check status
sudo systemctl status wcp

# View logs
sudo journalctl -u wcp -f
```

#### Windows (using NSSM)

Download [NSSM](https://nssm.cc/) and install the service:

```cmd
nssm install WCP "C:\path\to\bun.exe" ".next\standalone\server.js"
nssm set WCP AppDirectory "C:\path\to\SAP2000-WorkshopMode"
nssm set WCP AppEnvironmentExtra NODE_ENV=production PORT=3000
nssm start WCP
```

### Step 11: Set Up a Reverse Proxy (Recommended)

A reverse proxy handles SSL, load balancing, and serves as a security layer.

#### Using Caddy (Recommended - Auto SSL)

Install Caddy: [https://caddyserver.com/docs/install](https://caddyserver.com/docs/install)

Create a `Caddyfile`:

```
your-domain.com {
    reverse_proxy localhost:3000 {
        header_up Host {host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
        header_up X-Real-IP {remote_host}
    }
}
```

Start Caddy:

```bash
sudo caddy start
```

Caddy automatically provisions SSL certificates from Let's Encrypt.

#### Using Nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Step 12: Database Backup Strategy

Since this uses SQLite, backing up is simple - copy the database file:

```bash
# Create a backup
cp /var/data/wcp/production.db /var/data/wcp/backups/production_$(date +%Y%m%d_%H%M%S).db

# Automate with cron (daily at 2 AM)
echo "0 2 * * * cp /var/data/wcp/production.db /var/data/wcp/backups/production_\$(date +\%Y\%m\%d).db" | crontab -
```

For Windows, use Task Scheduler with:

```cmd
copy "C:\data\wcp\production.db" "C:\data\wcp\backups\production_%date:~-4%%date:~3,2%%date:~0,2%.db"
```

### Step 13: Security Checklist

Before going live, verify:

- [ ] `NEXTAUTH_SECRET` is a unique, strong random string (not the default)
- [ ] `NEXTAUTH_URL` uses HTTPS
- [ ] Database file is stored outside the web-accessible directory
- [ ] Database file has restrictive file permissions (`chmod 600`)
- [ ] Reverse proxy is configured with SSL
- [ ] Default admin password has been changed
- [ ] Unused demo accounts are deleted (run `bun run production:setup`)
- [ ] Server firewall allows only ports 80, 443, and SSH
- [ ] Regular database backups are configured
- [ ] Server OS and dependencies are up to date

### Step 14: Updating to a New Version

When a new version is released:

```bash
# Stop the server
sudo systemctl stop wcp

# Pull the latest code
git pull origin fix/typescript-errors-v6.0

# Install any new dependencies
bun install

# Regenerate Prisma client (in case schema changed)
bun run db:generate

# Apply database changes
bun run db:push

# Rebuild
bun run build

# Restart the server
sudo systemctl start wcp
```

### Quick Reference: Production Commands

| Action | Command |
|--------|---------|
| Start server | `bun run start` |
| Stop server (systemd) | `sudo systemctl stop wcp` |
| View logs (systemd) | `sudo journalctl -u wcp -f` |
| Backup database | `cp production.db backups/production_$(date +%Y%m%d).db` |
| Update schema | `bun run db:push` |
| Regenerate client | `bun run db:generate` |
| Rebuild | `bun run build` |
| Check status | `sudo systemctl status wcp` |

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
