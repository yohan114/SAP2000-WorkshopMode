
Repository: https://github.com/yohan114/SAP2000-WorkshopMode

📋 Prerequisites
Node.js (v18 or higher)

Download: https://nodejs.org
Verify: node -v
Bun (Recommended package manager)

Download: https://bun.sh
Verify: bun -v
PostgreSQL (v14 or higher)

Download: https://www.postgresql.org/download
Default port: 5432
🚀 Getting Started
Step 1: Clone Repository

git clone https://github.com/yohan114/SAP2000-WorkshopMode.git
cd SAP2000-WorkshopMode
Step 2: Install Dependencies

bun install
Step 3: Setup PostgreSQL Database
Create a database and user:


-- Run in PostgreSQL
CREATE DATABASE wcp_dev;
CREATE USER wcp_dev WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE wcp_dev TO wcp_dev;
Step 4: Configure Environment Variables
Create .env file in project root:


DATABASE_URL="postgresql://wcp_dev:your_secure_password@localhost:5432/wcp_dev?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-a-secure-random-string-here"
Generate a secure secret:


openssl rand -base64 32
Step 5: Run Database Migrations

bun run db:generate  # Generate Prisma Client
bun run db:push     # Push schema to database
bun run db:seed      # Seed initial data (optional)
Step 6: Start Development Server

bun run dev
Server will run at: http://localhost:3000

🏗️ Build for Production

bun run build
bun run start
📊 Available Scripts
Command	Description
bun run dev	Start development server on port 3000
bun run build	Build for production
bun run start	Start production server
bun run lint	Run ESLint
bun run db:generate	Generate Prisma Client
bun run db:push	Push schema to database
bun run db:migrate	Create and apply migrations
bun run db:reset	Reset database (WARNING: deletes data)
bun run db:seed	Seed database with sample data
🔐 Default Login Credentials
After seeding, you can login with:

Email: admin@wcp.com or admin@example.com
Password: admin123 or password
Check prisma/seed.ts for all available users.

📡 API Documentation
Base URL: http://localhost:3000/api

Key Endpoints:
Endpoint	Method	Description
/api/auth/[...nextauth]	POST	Authentication
/api/dashboard	GET	Dashboard statistics
/api/assets	GET/POST	Asset management
/api/job-cards	GET/POST	Job cards
/api/material-requests	GET/POST	Material requests
/api/material-issues	GET/POST	Material issues
/api/inventory/*	GET	Inventory management
/api/purchase-orders	GET/POST	Purchase orders
/api/suppliers	GET/POST	Suppliers
/api/users/me	GET	Current user profile
/api/export/*	GET	Export data (Excel)
🗄️ Database Schema Highlights
Core Models:
User - System users with authentication
Asset - Equipment/assets with categories
JobCard - Maintenance jobs with tasks & assignments
MaterialRequest - Requisitions with approval workflow
MaterialIssue - Stock issuance
Item - Inventory items
Store - Storage locations
Supplier - Vendor management
PurchaseOrder - POs with quotations
Employee - Staff management
TimeLog - Labour tracking
FuelTank - Fuel management
🛠️ Troubleshooting
Database Connection Error:


# Check PostgreSQL is running
pg_isready

# Test connection
psql -U wcp_dev -d wcp_dev -h localhost
Port Already in Use:


# Find and kill process on port 3000 (Windows)
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or use a different port
PORT=3001 bun run dev
Migration Issues:


# Reset and try again
bun run db:reset
bun run db:push
📞️ For New Developers (Quick Start)
If you're new to this project, follow these steps:

Install PostgreSQL locally
Clone the repository
Run bun install
Copy .env.example (create one based on the format above)
Run bun run db:generate && bun run db:push
Run bun run db:seed (optional, creates sample data)
Run bun run dev
Open http://localhost:3000 in your browser
Login and explore the dashboard
Tech Stack:

Next.js 16 + React 19 + TypeScript 5
Tailwind CSS 4 + shadcn/ui
Prisma ORM + PostgreSQL
NextAuth.js (Authentication)
Bun (Package Manager)
Your production system is now at: https://github.com/yohan114/SAP2000-WorkshopMode
