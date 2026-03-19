import { Phase, Sprint, Module, Risk, KPI, TeamMember, GuardRule, WebSocketEvent, BackgroundJob, ProjectOverview } from './types';

export const projectOverview: ProjectOverview = {
  name: 'Workshop Control Platform',
  version: '2.0',
  totalWeeks: 32,
  totalSprints: 16,
  mvpWeek: 12,
  teamSize: '8-10 developers',
  status: 'Ready for Implementation',
};

export const phases: Phase[] = [
  {
    id: 'phase-1',
    name: 'Foundation',
    weeks: 'Weeks 1-6',
    startWeek: 1,
    endWeek: 6,
    color: '#3b82f6',
    description: 'Establish development infrastructure and core platform foundation',
    deliverables: ['Environment Setup', 'Auth & Users', 'Database Core'],
    exitCriteria: 'All environments operational, auth working, schema deployed',
  },
  {
    id: 'phase-2',
    name: 'Core Operations',
    weeks: 'Weeks 7-18',
    startWeek: 7,
    endWeek: 18,
    color: '#10b981',
    description: 'Deliver MVP with core operational capability',
    deliverables: ['Asset Management', 'Job Cards', 'Material Request', 'Material Issue', 'Inventory', 'Mobile PWA'],
    exitCriteria: 'MVP ready for pilot workshop',
  },
  {
    id: 'phase-3',
    name: 'Procurement',
    weeks: 'Weeks 19-26',
    startWeek: 19,
    endWeek: 26,
    color: '#f59e0b',
    description: 'Complete procurement and purchase authority capabilities',
    deliverables: ['PR Module', 'RFQ & Quotations', 'Purchase Orders', 'GRN & Invoice', 'Purchase Authority', 'Budget Control'],
    exitCriteria: 'Full procurement pipeline operational',
  },
  {
    id: 'phase-4',
    name: 'Enterprise Ready',
    weeks: 'Weeks 27-32',
    startWeek: 27,
    endWeek: 32,
    color: '#8b5cf6',
    description: 'Production hardening and enterprise integration',
    deliverables: ['External Repairs', 'PM & Downtime', 'Security', 'SAP Integration', 'DR & Backup', 'KPI & Reports', 'Go-Live'],
    exitCriteria: 'Production ready, system live',
  },
];

export const sprints: Sprint[] = [
  // Phase 1
  { id: 1, name: 'Sprint 1', focus: 'Environment Setup', weekStart: 1, weekEnd: 2, phase: 'Foundation', deliverables: ['DEV/UAT/PROD environments', 'CI/CD pipeline', 'Docker setup'], exitCriteria: 'All environments operational', status: 'upcoming', priority: 'P0' },
  { id: 2, name: 'Sprint 2', focus: 'Auth & Users', weekStart: 3, weekEnd: 4, phase: 'Foundation', deliverables: ['JWT authentication', 'User management', 'Role system', 'Device fingerprinting'], exitCriteria: 'Login/logout working', status: 'upcoming', priority: 'P0' },
  { id: 3, name: 'Sprint 3', focus: 'Database Core', weekStart: 5, weekEnd: 6, phase: 'Foundation', deliverables: ['Full schema deployment', 'Audit tables', 'Prisma migrations', 'Seed data'], exitCriteria: 'Schema deployed to all envs', status: 'upcoming', priority: 'P0' },
  // Phase 2
  { id: 4, name: 'Sprint 4', focus: 'Asset Management', weekStart: 7, weekEnd: 8, phase: 'Core Operations', deliverables: ['Asset registration', 'QR codes', 'Categories', 'Meter readings'], exitCriteria: 'Assets can be created/scanned', status: 'upcoming', priority: 'P0' },
  { id: 5, name: 'Sprint 5', focus: 'Job Card Core', weekStart: 9, weekEnd: 10, phase: 'Core Operations', deliverables: ['JC schema', 'State machine', 'Create/submit workflow'], exitCriteria: 'JC lifecycle working', status: 'upcoming', priority: 'P0' },
  { id: 6, name: 'Sprint 6', focus: 'Job Card Approval', weekStart: 11, weekEnd: 12, phase: 'Core Operations', deliverables: ['Approval queue', 'Reject/return', 'SLA tracking', 'Guards'], exitCriteria: 'End-to-end JC flow', status: 'upcoming', priority: 'P0' },
  { id: 7, name: 'Sprint 7', focus: 'Material Request', weekStart: 13, weekEnd: 14, phase: 'Core Operations', deliverables: ['MR schema', 'Stock reservations', 'State machine'], exitCriteria: 'MR linked to JC working', status: 'upcoming', priority: 'P0' },
  { id: 8, name: 'Sprint 8', focus: 'Material Issue', weekStart: 15, weekEnd: 16, phase: 'Core Operations', deliverables: ['MI schema', 'Counter locking', '2-person verification'], exitCriteria: 'Issue flow complete', status: 'upcoming', priority: 'P0' },
  { id: 9, name: 'Sprint 9', focus: 'Inventory Core', weekStart: 17, weekEnd: 18, phase: 'Core Operations', deliverables: ['Stores', 'Items', 'Stock levels', 'WAC calculation'], exitCriteria: 'Stock management working', status: 'upcoming', priority: 'P0' },
  // Phase 3
  { id: 10, name: 'Sprint 10', focus: 'PR Module', weekStart: 19, weekEnd: 20, phase: 'Procurement', deliverables: ['Purchase request creation', 'Approval workflow'], exitCriteria: 'PR flow working', status: 'upcoming', priority: 'P1' },
  { id: 11, name: 'Sprint 11', focus: 'RFQ & Quotations', weekStart: 21, weekEnd: 22, phase: 'Procurement', deliverables: ['RFQ generation', 'Supplier quotes', 'Comparison matrix'], exitCriteria: 'Quotation evaluation ready', status: 'upcoming', priority: 'P1' },
  { id: 12, name: 'Sprint 12', focus: 'Purchase Orders', weekStart: 23, weekEnd: 24, phase: 'Procurement', deliverables: ['PO generation', 'Dispatch', 'Acknowledgement'], exitCriteria: 'PO lifecycle complete', status: 'upcoming', priority: 'P1' },
  { id: 13, name: 'Sprint 13', focus: 'GRN & Invoice', weekStart: 25, weekEnd: 26, phase: 'Procurement', deliverables: ['2-person GRN', '3-way match', 'Payment approval'], exitCriteria: 'Procurement E2E working', status: 'upcoming', priority: 'P1' },
  // Phase 4
  { id: 14, name: 'Sprint 14', focus: 'Purchase Authority', weekStart: 27, weekEnd: 28, phase: 'Enterprise Ready', deliverables: ['LPA configuration', 'LP/HOP routing', 'Privilege guards'], exitCriteria: 'Channel routing operational', status: 'upcoming', priority: 'P1' },
  { id: 15, name: 'Sprint 15', focus: 'Security & Integration', weekStart: 29, weekEnd: 30, phase: 'Enterprise Ready', deliverables: ['Rate limiting', 'Device blocking', 'SAP integration'], exitCriteria: 'Security audit passed', status: 'upcoming', priority: 'P2' },
  { id: 16, name: 'Sprint 16', focus: 'Go-Live', weekStart: 31, weekEnd: 32, phase: 'Enterprise Ready', deliverables: ['DR testing', 'Performance tuning', 'Production deploy'], exitCriteria: 'System live', status: 'upcoming', priority: 'P0' },
];

export const modules: Module[] = [
  { id: 'auth', name: 'Auth System', dependsOn: [], blocks: ['assets', 'inventory', 'approvals'], priority: 'P0', phase: 1, description: 'JWT authentication, device fingerprinting, session management', status: 'upcoming' },
  { id: 'assets', name: 'Asset Management', dependsOn: ['auth'], blocks: ['job-cards'], priority: 'P0', phase: 2, description: 'Asset registration, QR codes, meter readings', status: 'upcoming' },
  { id: 'job-cards', name: 'Job Cards', dependsOn: ['assets', 'auth'], blocks: ['material-request', 'approvals'], priority: 'P0', phase: 2, description: 'Job creation, state machine, costing', status: 'upcoming' },
  { id: 'material-request', name: 'Material Request', dependsOn: ['job-cards'], blocks: ['material-issue'], priority: 'P0', phase: 2, description: 'MR creation, stock reservations', status: 'upcoming' },
  { id: 'material-issue', name: 'Material Issue', dependsOn: ['material-request', 'inventory'], blocks: ['stock-ledger'], priority: 'P0', phase: 2, description: 'Item issues, counter locking, 2-person verification', status: 'upcoming' },
  { id: 'inventory', name: 'Inventory', dependsOn: ['auth'], blocks: ['material-issue', 'grn'], priority: 'P0', phase: 2, description: 'Stores, items, stock reservations', status: 'upcoming' },
  { id: 'approvals', name: 'Approvals', dependsOn: ['auth'], blocks: ['job-cards', 'material-request', 'pr'], priority: 'P0', phase: 2, description: 'Multi-level workflow engine, SLA tracking', status: 'upcoming' },
  { id: 'pr', name: 'PR/PO', dependsOn: ['inventory', 'approvals'], blocks: ['grn', 'budget'], priority: 'P1', phase: 3, description: 'Purchase requests and orders', status: 'upcoming' },
  { id: 'grn', name: 'GRN', dependsOn: ['pr', 'inventory'], blocks: ['invoice-match'], priority: 'P1', phase: 3, description: 'Goods received notes, 2-person control', status: 'upcoming' },
  { id: 'purchase-authority', name: 'Purchase Authority', dependsOn: ['pr', 'auth'], blocks: ['budget'], priority: 'P1', phase: 3, description: 'LPA config, routing engine, privilege sets', status: 'upcoming' },
  { id: 'budget', name: 'Budget Control', dependsOn: ['pr', 'grn'], blocks: ['invoice-payment'], priority: 'P1', phase: 3, description: 'Budget lines, commitments, variance alerts', status: 'upcoming' },
  { id: 'external-repairs', name: 'External Repairs', dependsOn: ['job-cards'], blocks: ['costing'], priority: 'P2', phase: 4, description: 'Subcontracting, quotations, external job costing', status: 'upcoming' },
  { id: 'pm', name: 'PM Scheduling', dependsOn: ['assets', 'job-cards'], blocks: ['downtime'], priority: 'P2', phase: 4, description: 'Preventive maintenance, capacity planning', status: 'upcoming' },
  { id: 'sap', name: 'SAP Integration', dependsOn: ['auth', 'inventory', 'job-cards'], blocks: [], priority: 'P2', phase: 4, description: 'HCM, MM, FICO integration points', status: 'upcoming' },
  { id: 'kpi', name: 'KPI/Reports', dependsOn: ['job-cards', 'material-request', 'inventory'], blocks: [], priority: 'P2', phase: 4, description: 'Dashboard, KPI engine, automated reports', status: 'upcoming' },
];

export const risks: Risk[] = [
  { id: 'R01', name: 'Poor workshop connectivity', likelihood: 'High', impact: 'High', mitigation: 'Offline-first PWA with IndexedDB queue and smart sync', category: 'technical' },
  { id: 'R02', name: 'User resistance to new workflows', likelihood: 'Medium', impact: 'High', mitigation: 'UAT with real users, training sessions, phased rollout', category: 'organizational' },
  { id: 'R03', name: 'Data migration complexity', likelihood: 'Medium', impact: 'High', mitigation: 'Dedicated migration scripts with validation and parallel run', category: 'technical' },
  { id: 'R04', name: 'Scope creep', likelihood: 'High', impact: 'Medium', mitigation: 'Strict sprint backlog, change control process, MoSCoW prioritization', category: 'organizational' },
  { id: 'R05', name: 'Performance at high volume', likelihood: 'Low', impact: 'High', mitigation: 'Load testing at Sprint 21, DB partitioning, Redis caching', category: 'technical' },
  { id: 'R06', name: 'PostgreSQL single-point-of-failure', likelihood: 'Low', impact: 'Critical', mitigation: 'Streaming replication to hot standby, auto-failover, tested DR plan', category: 'technical' },
  { id: 'R07', name: 'Photo evidence manipulation', likelihood: 'Medium', impact: 'High', mitigation: 'EXIF validation, camera-only capture, cryptographic watermarking', category: 'security' },
  { id: 'R08', name: 'Audit log tampering', likelihood: 'Low', impact: 'Critical', mitigation: 'Hash chain on audit_logs, daily chain integrity verification', category: 'security' },
  { id: 'R09', name: 'LPA bypass via social engineering', likelihood: 'Medium', impact: 'High', mitigation: 'Hard API enforcement, override requires SYS_LPA_OVERRIDE privilege', category: 'security' },
  { id: 'R10', name: 'Procurement fraud via sole-source', likelihood: 'Medium', impact: 'High', mitigation: 'Written justification mandatory, HO Procurement Manager approval', category: 'operational' },
];

export const technicalKPIs: KPI[] = [
  { id: 'T01', name: 'API Response Time (P95)', target: '< 200ms', category: 'technical', unit: 'ms' },
  { id: 'T02', name: 'Mobile App Load Time', target: '< 3 seconds', category: 'technical', unit: 'seconds' },
  { id: 'T03', name: 'Offline Sync Success Rate', target: '> 99%', category: 'technical', unit: '%' },
  { id: 'T04', name: 'Test Coverage', target: '> 80%', category: 'technical', unit: '%' },
  { id: 'T05', name: 'Zero Critical Security Issues', target: '0', category: 'technical', unit: 'issues' },
];

export const businessKPIs: KPI[] = [
  { id: 'B01', name: 'Fraud Incidents Detected', target: '> 90%', category: 'business', unit: '%' },
  { id: 'B02', name: 'GRN Processing Time', target: '< 15 minutes', category: 'business', unit: 'minutes' },
  { id: 'B03', name: 'Job Card SLA Compliance', target: '> 95%', category: 'business', unit: '%' },
  { id: 'B04', name: 'Material Issue Time', target: '< 10 minutes', category: 'business', unit: 'minutes' },
  { id: 'B05', name: 'User Adoption Rate', target: '> 90%', category: 'business', unit: '%' },
];

export const team: TeamMember[] = [
  { role: 'Tech Lead', count: 1, responsibility: 'Architecture, code review, technical decisions' },
  { role: 'Backend Developers', count: 3, responsibility: 'NestJS modules, APIs, database' },
  { role: 'Frontend Developers', count: 3, responsibility: 'React/Next.js, mobile PWA, UI components' },
  { role: 'DevOps Engineer', count: 1, responsibility: 'CI/CD, infrastructure, monitoring' },
  { role: 'QA Engineer', count: 1, responsibility: 'Test automation, quality assurance' },
  { role: 'Product Owner', count: 1, responsibility: 'Requirements, prioritization, UAT' },
];

export const guardRules: GuardRule[] = [
  { name: 'JC_ASSET_SCAN_REQUIRED', rule: 'No JC without QR scan', enforcement: 'Hard block at API' },
  { name: 'JC_SINGLE_OPEN_PER_ASSET', rule: 'Only 1 open JC per asset', enforcement: 'DB constraint + API' },
  { name: 'MR_REQUIRES_OPEN_JC', rule: 'MR needs APPROVED/IN_PROGRESS JC', enforcement: 'API guard' },
  { name: 'MR_SELF_APPROVAL_BLOCKED', rule: 'Approver ≠ Requestor', enforcement: 'DB constraint' },
  { name: 'MI_REQUIRES_APPROVED_MR', rule: 'MI needs approved MR', enforcement: 'API guard' },
  { name: 'MI_COUNTER_LOCK_REQUIRED', rule: 'Redis lock before MI', enforcement: 'Distributed lock' },
  { name: 'JC_CLOSE_OPEN_MR_BLOCK', rule: 'No close with open MRs', enforcement: 'API guard' },
  { name: 'JC_CLOSE_TOOL_RETURN_BLOCK', rule: 'All tools returned', enforcement: 'API guard' },
];

export const wsEvents: WebSocketEvent[] = [
  { event: 'jc:status_changed', subscribers: 'JC team + supervisor', action: 'Push notification' },
  { event: 'mr:submitted', subscribers: 'MR_APPROVE users', action: 'New approval badge' },
  { event: 'mr:approved', subscribers: 'Requestor', action: 'Materials ready notification' },
  { event: 'counter:locked', subscribers: 'All storekeepers', action: 'Counter status widget' },
  { event: 'tool:overdue', subscribers: 'Technician + supervisor', action: 'Escalating alerts' },
  { event: 'jc:sla_breach', subscribers: 'Supervisor + manager', action: 'SLA breach alert' },
  { event: 'lpa:cap_warning', subscribers: 'Workshop Manager', action: 'Threshold alert (80%/90%/100%)' },
];

export const bgJobs: BackgroundJob[] = [
  { name: 'sla-monitor', schedule: 'Every 15 min', purpose: 'Check JC/MR SLA targets' },
  { name: 'tool-loan-overdue', schedule: 'Daily 08:00', purpose: 'Scan overdue tools' },
  { name: 'reservation-expiry', schedule: 'Daily 07:00', purpose: 'Check expiring reservations' },
  { name: 'counter-lock-cleanup', schedule: 'Every 5 min', purpose: 'Release abandoned locks' },
  { name: 'stock-integrity-check', schedule: 'Daily 02:00', purpose: 'Validate stock balances' },
  { name: 'lpa-monthly-reset', schedule: '1st of month', purpose: 'Reset cumulative counters' },
  { name: 'duplicate-issue-scan', schedule: 'On MI confirm', purpose: 'Fraud detection' },
];

export const techStack = {
  frontend: [
    { name: 'Next.js 16', purpose: 'SSR, API routes, App Router', icon: '⚡' },
    { name: 'TypeScript 5', purpose: 'Type safety, better DX', icon: '📘' },
    { name: 'TailwindCSS 4', purpose: 'Utility-first styling', icon: '🎨' },
    { name: 'shadcn/ui', purpose: 'Accessible components', icon: '🧩' },
    { name: 'Zustand', purpose: 'Client state management', icon: '🐻' },
    { name: 'TanStack Query', purpose: 'Server state, caching', icon: '🔄' },
    { name: 'React Hook Form', purpose: 'Form management', icon: '📝' },
    { name: 'Zod', purpose: 'Schema validation', icon: '✅' },
    { name: 'next-pwa', purpose: 'Offline support', icon: '📱' },
  ],
  backend: [
    { name: 'Node.js 20 LTS', purpose: 'Runtime environment', icon: '🟢' },
    { name: 'NestJS 10', purpose: 'Modular framework, DI', icon: '🐈' },
    { name: 'Prisma 5', purpose: 'Type-safe ORM, migrations', icon: '🔷' },
    { name: 'PostgreSQL 15', purpose: 'Primary database', icon: '🐘' },
    { name: 'Redis 7', purpose: 'Cache, locks, queues', icon: '🔴' },
    { name: 'MinIO', purpose: 'S3-compatible storage', icon: '📦' },
    { name: 'BullMQ', purpose: 'Background jobs', icon: '🐂' },
    { name: 'Socket.IO', purpose: 'Real-time WebSocket', icon: '🔌' },
    { name: 'Swagger/OpenAPI', purpose: 'API documentation', icon: '📄' },
  ],
  infrastructure: [
    { name: 'Docker + Compose', purpose: 'Container orchestration (DEV/UAT)', icon: '🐳' },
    { name: 'Kubernetes', purpose: 'Container orchestration (PROD)', icon: '☸️' },
    { name: 'Nginx', purpose: 'Reverse proxy, SSL', icon: '🔷' },
    { name: 'GitHub Actions', purpose: 'CI/CD pipeline', icon: '⚙️' },
    { name: 'Prometheus', purpose: 'Metrics collection', icon: '📊' },
    { name: 'Grafana', purpose: 'Monitoring dashboards', icon: '📈' },
  ],
};
