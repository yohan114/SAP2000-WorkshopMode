+-----------------------------------------------------------------------+
| 🏭                                                                    |
|                                                                       |
| **WORKSHOP CONTROL PLATFORM**                                         |
|                                                                       |
| **SUPER MASTER PLAN**                                                 |
|                                                                       |
| Transaction-Controlled · Evidence-Backed · Audit-First                |
|                                                                       |
| Fleet & Asset Workshop Management with Anti-Fraud Controls            |
+-----------------------------------------------------------------------+

  ------------------------------------------------------------------------
  **Dimension**         **Detail**                     **Specification**
  --------------------- ------------------------------ -------------------
  Platform Type         Transaction-controlled         Enterprise-Grade
                        operational platform           

  Architecture          Modular monolith +             Scalable,
                        Mobile-first PWA               Offline-Capable

  Frontend              React 18 + TypeScript + Vite + PWA + Desktop UI
                        TailwindCSS                    

  Backend               NestJS 10 + Node.js 20 LTS +   REST + WebSocket
                        TypeScript                     API

  Database              PostgreSQL 15 + Redis + Prisma Full Audit Trail
                        ORM                            

  Storage               MinIO / S3 Compatible Object   Document & Photo
                        Store                          Evidence

  Timeline              40 Weeks / 20 Sprints          Production-Ready
                        (Extended with Procurement &   
                        Authority modules)             

  Core Modules          Job Card · Material Request ·  All Integrated
                        Material Issue · Procurement · 
                        Purchase Authority             
  ------------------------------------------------------------------------

  -------------------------------------------------------------------------
  **Module**    **Triggers       **Feeds Into**   **Key Control**
                From**                            
  ------------- ---------------- ---------------- -------------------------
  Job Card      Asset QR scan +  Material         Cannot open without asset
                Supervisor       Request, Labour, scan; cannot close with
                assignment       Cost Engine      open MRs

  Material      Open Job Card    Material Issue,  Cannot raise without job
  Request       (or Emergency    Procurement PR,  card link; reservation
                standalone)      Stock            locked on approval
                                 Reservation      

  Material      Approved         JC cost line,    Counter locked during
  Issue         Material Request Inventory        issue; 2-person
                                 deduction,       verification for
                                 Return workflow  high-value

  Procurement   Material Request GRN, Invoice     Min 3 quotes above
  (PR→PO)       shortage or      Matching, Budget threshold; 2-person GRN;
                direct PR        Commitment       3-way match

  Purchase      PR channel       LP workflow or   LPA enforcement;
  Authority     routing engine   HO workflow      auto-routing; override
                                                  audit
  -------------------------------------------------------------------------

**1. Executive Summary**

The Workshop Control Platform (WCP) is a full-stack, audit-first
operational system designed for fleet and asset workshop management. It
enforces transaction controls, evidence capture, and multi-level
approval workflows to eliminate fraud, ensure accountability, and
provide real-time operational intelligence to supervisors.

This Super Master Plan consolidates the full platform design ---
covering the 20-phase implementation roadmap, the three core operational
modules (Job Card, Material Request, Material Issue), the complete
Procurement pipeline (PR → RFQ → PO → GRN → Invoice → Payment → RTS),
and the two-channel Purchase Authority framework with custom privilege
sets.

**1.1 Core Platform Pillars**

-   Audit-First Architecture --- every record has immutable
    create/modify trails, creator IDs, and timestamps

-   Anti-Fraud Controls --- 2-person GRN control, duplicate detection,
    abnormal usage alerts, risk scoring

-   Evidence-Backed Transactions --- mandatory photo capture with EXIF
    validation and security watermarking

-   Approval Workflow Engine --- multi-level supervisor chains with SLA
    tracking and backlog management

-   Mobile-First Offline PWA --- offline-capable with smart sync and
    conflict resolution for field operations

-   Device Control Layer --- registered device enforcement,
    fingerprinting, and activity monitoring

-   State Machine Architecture --- all modules (JC, MR, MI, Procurement)
    use guarded state machines with immutable transition logs

-   Real-Time Operations --- WebSocket events for counter locks,
    approvals, SLA breaches, and tool overdue alerts

**2. Full Technology Stack**

**2.1 Frontend Stack**

  -----------------------------------------------------------------------
  **Technology**     **Version**   **Purpose**
  ------------------ ------------- --------------------------------------
  React              18+           Core UI framework with concurrent
                                   rendering

  TypeScript         5+            Type safety across entire codebase

  Vite               5+            Ultra-fast build tool and dev server

  React Router       v6            Client-side routing and navigation
                                   guards

  Zustand / Jotai    Latest        Lightweight global state management

  TanStack Query     v5            Server state, caching, background sync

  React Hook Form +  Latest        Form management with schema validation
  Zod                              

  TailwindCSS +      Latest        Utility-first styling and accessible
  HeadlessUI                       components

  Workbox (PWA)      Latest        Service workers, offline caching
                                   strategy

  Capacitor          Latest        Native mobile app wrapper for
  (optional)                       iOS/Android
  -----------------------------------------------------------------------

**2.2 Backend Stack**

  -----------------------------------------------------------------------
  **Technology**     **Version**   **Purpose**
  ------------------ ------------- --------------------------------------
  Node.js            20 LTS        Runtime environment --- long-term
                                   support

  NestJS             10+           Modular framework, DI, decorators,
                                   guards

  TypeScript         5+            Strict type safety server-side

  Prisma ORM         5+            Type-safe DB access, migrations,
                                   schema

  Passport.js        Latest        Authentication strategies (JWT, Local)

  BullMQ             Latest        Background job queues, scheduled tasks

  Zod                Latest        Runtime schema validation and DTO
                                   typing

  Socket.IO          Latest        Real-time WebSocket events (locks,
                                   alerts)

  Swagger / OpenAPI  Latest        Auto-generated API documentation
  -----------------------------------------------------------------------

**2.3 Database & Infrastructure Stack**

  -----------------------------------------------------------------------
  **Technology**     **Version /   **Purpose**
                     Tier**        
  ------------------ ------------- --------------------------------------
  PostgreSQL         15+           Primary relational database with full
                                   ACID compliance

  Redis              7+            Session cache, real-time locks, BullMQ
                                   backend

  MinIO / AWS S3     Latest        Object storage for photos, documents,
                                   evidence

  Docker + Compose   Latest        Dev environment, service orchestration

  Kubernetes         Prod          Container orchestration for production
                     (optional)    scale

  Nginx              Latest        Reverse proxy, SSL termination, load
                                   balancing

  GitHub Actions     Latest        CI/CD pipeline automation

  Prometheus +       Latest        Metrics monitoring and alerting
  Grafana                          
  -----------------------------------------------------------------------

**3. Backend Module Architecture (NestJS)**

The backend follows Domain-Driven Design with one NestJS module per
business domain. Each module encapsulates its own controller, service,
repository, DTOs, and guards.

  ----------------------------------------------------------------------------
  **Module**           **Responsibility**
  -------------------- -------------------------------------------------------
  auth                 JWT authentication, refresh tokens, device
                       fingerprinting, session management

  users                User CRUD, role assignment, contract management, risk
                       level tracking

  assets               Asset registration, QR codes, meter readings, category
                       management

  job-cards            Job creation, state machine lifecycle, costing
                       accumulation

  inventory            Stores, items, stock reservations, real-time lock
                       management

  issues               Item/tool issue transactions, dual-custody, return
                       workflows

  grn                  Goods received notes, 2-person control, supplier
                       management

  fuel                 Fuel issues, abnormal detection, meter override
                       controls

  external-repairs     Subcontracting, quotations, external job costing

  labour               Labour assignments, time tracking, training gate
                       enforcement

  pm                   Preventive maintenance scheduling, capacity planning,
                       downtime

  approvals            Multi-level workflow engine, SLA tracking, supervisor
                       chains

  documents            File uploads, evidence management, EXIF validation

  procurement          PR, RFQ, PO, Invoice matching, RTS, budget commitment

  purchase-authority   LPA config, routing engine, privilege sets, LP/HO
                       workflows

  kpi                  KPI engine, dashboard metrics, reporting aggregations

  audit                Immutable audit log, integrity checks, tamper detection

  notifications        In-app alerts, email notifications, escalation triggers
  ----------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **📋 JOB CARD MODULE**                                                |
|                                                                       |
| State Machine · Guards · Database · API · Screens                     |
+-----------------------------------------------------------------------+

**4. Job Card Module --- Complete Design**

**4.1 Job Card Types**

  --------------------------------------------------------------------------
  **Type Code**  **Description**            **Key Rules**
  -------------- -------------------------- --------------------------------
  CORRECTIVE     Unplanned breakdown repair Asset must be in BREAKDOWN
                 --- asset failed in        status; urgent SLA applies
                 operation                  

  PREVENTIVE     Scheduled PM execution --- PM trigger ID linked; PM
                 triggered by PM schedule   checklist mandatory; cannot skip
                 engine                     tasks

  INSPECTION     Routine condition          Inspection form mandatory; if
                 assessment --- no repair   defect found, spawns CORRECTIVE
                 unless finding             child JC

  MODIFICATION   Planned upgrade, retrofit, ECO (Engineering Change Order)
                 or engineering change      number required; HO approval
                                            needed

  ACCIDENT       Post-accident assessment   Accident report mandatory;
                 and repair                 insurance claim number tracked;
                                            photo evidence compulsory

  CALIBRATION    Meter, gauge, or           Before/after calibration values
                 instrument calibration     recorded; certificate uploaded

  WARRANTY       Repair under active        Warranty claim reference
                 supplier/OEM warranty      required; no cost to workshop
                                            budget
  --------------------------------------------------------------------------

**4.2 Job Card State Machine**

Every state transition is governed by guards evaluated at API level.
Failed transitions are rejected with a reason code and logged to
audit_logs.

  -------------------------------------------------------------------------
  **From       **To State** **Trigger /     **Guard Conditions**
  State**                   Actor**         
  ------------ ------------ --------------- -------------------------------
  DRAFT        PENDING      Submit ---      Asset QR scanned AND linked;
                            Originator      job type selected; fault
                                            description ≥ 20 chars; at
                                            least 1 task defined

  DRAFT        CANCELLED    Cancel ---      No MRs raised against this JC;
                            Originator      no labour logged

  PENDING      APPROVED     Approve ---     Approver has JC_APPROVE
                            Supervisor      privilege; approver ≠
                                            originator; estimated cost
                                            within authority

  PENDING      REJECTED     Reject ---      Rejection reason text mandatory
                            Supervisor      (min 10 chars)

  PENDING      DRAFT        Return ---      Return reason mandatory;
                            Supervisor      originator can amend and
                                            resubmit

  APPROVED     IN PROGRESS  Start Work ---  Assigned technician identity;
                            Technician      meter reading recorded on start

  IN PROGRESS  ON HOLD      Hold ---        Hold reason mandatory (e.g.
                            Supervisor      parts pending, waiting permit)

  ON HOLD      IN PROGRESS  Resume ---      Hold reason resolved;
                            Supervisor      parts/permit confirmed
                                            available

  IN PROGRESS  COMPLETED    Complete ---    ALL tasks complete; ALL
                            Technician      mandatory photos uploaded; NO
                                            open MRs; NO unreturned tools

  COMPLETED    IN PROGRESS  Reopen ---      Reopened within reopen window
                            Supervisor      (default 72 hrs); reopen reason
                                            mandatory

  COMPLETED    CLOSED       Close ---       Supervisor sign-off; final
                            Supervisor      meter reading recorded; cost
                                            review completed; no
                                            outstanding variances

  IN PROGRESS  CANCELLED    Cancel ---      Manager-level privilege;
                            Manager         cancellation reason; MRs
                                            auto-cancelled; reservations
                                            released
  -------------------------------------------------------------------------

**4.3 Job Card Priority & SLA Targets**

  --------------------------------------------------------------------------
  **Priority**   **First       **Completion   **Auto-Escalation Trigger**
                 Response      SLA**          
                 SLA**                        
  -------------- ------------- -------------- ------------------------------
  EMERGENCY      30 minutes    4 hours        After 1 hour → Manager; after
                                              2 hours → Director

  CRITICAL       2 hours       8 hours        After 4 hours → Manager; after
                                              8 hours → Director

  HIGH           4 hours       24 hours       After 8 hours → Manager
                                              notification

  NORMAL         Next working  5 working days After 3 days → Supervisor
                 day                          reminder

  LOW            3 working     10 working     After 7 days → Supervisor
                 days          days           reminder
  --------------------------------------------------------------------------

**4.4 Job Card Key Business Rules**

-   Asset QR scan is MANDATORY on mobile --- no JC can be created
    without scanning the physical asset QR code.

-   Only one OPEN JC per asset at a time unless explicitly overridden by
    a manager with JC_MULTI_OPEN privilege.

-   A PM job card is auto-created by the PM scheduling engine --- cannot
    be manually created with type PREVENTIVE unless linked to a valid PM
    trigger.

-   MODIFICATION job cards require HO approval via the HOP workflow
    channel before work can begin.

-   ALL tasks marked complete (mandatory = true ones must be 100%)
    before JC can move to COMPLETED.

-   ALL Material Requests linked to this JC must be in status FULFILLED,
    CANCELLED, or CLOSED.

-   ALL issued tools must have a corresponding return transaction before
    closure.

-   Cost variance check: if actual cost \> estimated_cost × 1.30,
    supervisor must acknowledge before closure.

+-----------------------------------------------------------------------+
| **📦 MATERIAL REQUEST MODULE**                                        |
|                                                                       |
| State Machine · Guards · Reservation Logic · API · Screens            |
+-----------------------------------------------------------------------+

**5. Material Request Module --- Complete Design**

**5.1 Material Request State Machine**

  ---------------------------------------------------------------------------
  **From       **To State** **Trigger /       **Guard Conditions**
  State**                   Actor**           
  ------------ ------------ ----------------- -------------------------------
  DRAFT        PENDING      Submit ---        JC is IN PROGRESS or APPROVED;
                            Technician        at least 1 line item; all
                                              quantities \> 0; item codes
                                              valid

  DRAFT        CANCELLED    Cancel ---        No reservations created; no
                            Technician/Supv   issues made

  PENDING      APPROVED     Approve ---       MR_APPROVE privilege; approver
                            Supervisor        ≠ requestor; stock availability
                                              re-checked at approval time

  PENDING      REJECTED     Reject ---        Rejection reason mandatory;
                            Supervisor        stock released if pre-reserved

  PENDING      DRAFT        Return ---        Return reason; requestor can
                            Supervisor        amend and resubmit

  APPROVED     IN PROGRESS  Partial Issue --- First MI created for this MR
                            Storekeeper       --- not all lines issued yet

  IN PROGRESS  ISSUED       Fully Issued ---  All MR lines have been issued
                            System            in full --- auto-triggered when
                                              last MI confirmed

  APPROVED     ON HOLD      Hold ---          Items temporarily unavailable;
                            Supervisor        hold reason mandatory; JC
                                              supervisor notified

  ON HOLD      APPROVED     Release Hold ---  Stock replenished or
                            Supervisor        alternative source identified

  APPROVED     CANCELLED    Cancel ---        Stock reservation released; JC
                            Supervisor        cost not affected; cancel
                                              reason required

  ISSUED       RETURNED     Return Raised --- Return document created; items
                            Technician        physically returned to store

  ISSUED       CLOSED       Close --- System  All lines issued and no return
                            auto              pending; or JC closed
  ---------------------------------------------------------------------------

**5.2 Stock Reservation Logic**

  -----------------------------------------------------------------------
  **Scenario**          **System Behaviour**
  --------------------- -------------------------------------------------
  Sufficient stock for  Reservation created for full approved_quantity;
  full quantity         available balance reduced; reserved balance
                        increased

  Insufficient stock    Reservation created for available quantity only;
  --- partial available MR moves to PARTIAL_RESERVED; JC supervisor
                        alerted; remainder triggers reorder alert

  Zero stock available  Reservation not created; MR status set to
                        STOCK_UNAVAILABLE; supervisor alerted;
                        procurement PR auto-drafted

  MR cancelled after    Reservation record soft-deleted; reserved_qty
  reservation           decremented; available_qty restored immediately

  JC cancelled with     All APPROVED MRs for that JC auto-cancelled; all
  open MR               reservations released

  Reservation expires   After configurable expiry days (default 14),
  without issue         storekeeper prompted to release or extend
  -----------------------------------------------------------------------

**5.3 Material Request Business Rules**

-   Approver cannot be the same person who raised the MR ---
    self-approval blocked at API level.

-   Approver can reduce line quantities but cannot add new items ---
    requestor must amend and resubmit.

-   Requested quantity cannot exceed the maximum single-issue limit
    defined on the item master (prevents bulk pilfering).

-   Emergency MRs (priority = EMERGENCY) have a 30-minute approval SLA
    --- auto-escalated if not actioned.

-   Duplicate MR detection: same technician, same item, same JC within
    24 hours triggers a warning.

-   Abnormal quantity detection: if requested quantity is \> 3× the
    average issue quantity for that item/asset type, a flag is raised.

+-----------------------------------------------------------------------+
| **🏭 MATERIAL ISSUE MODULE**                                          |
|                                                                       |
| Counter Locking · 2-Person Verification · Returns · Stock Ledger      |
+-----------------------------------------------------------------------+

**6. Material Issue Module --- Complete Design**

**6.1 Issue Types**

  ------------------------------------------------------------------------------
  **Issue Type**        **When Used**            **Key Controls**
  --------------------- ------------------------ -------------------------------
  STANDARD              Regular issue from       MR must be APPROVED;
                        approved MR              reservation must exist; counter
                                                 lock required

  EMERGENCY_DIRECT      Critical urgent issue    EMERGENCY_ISSUE privilege
                        without prior MR         required; retrospective MR must
                                                 be created within 2 hours

  INTER_STORE           Transfer of stock        Both stores must be active;
                        between stores           transfer approval required if
                                                 different store managers

  TOOL_LOAN             Issuing a tool with      Tool serial number recorded;
                        mandatory return         return due date set; overdue
                        tracking                 tool alert after due date

  WORKSHOP_CONSUMABLE   Low-value consumables    No MR required; quantity
                        from consumable bin      limited by consumable daily
                                                 cap; logged but no JC cost
                                                 posting

  SCRAP_WRITE_OFF       Damaged or expired item  Requires manager approval;
                        removal from stock       photo evidence; write-off
                                                 reason code mandatory
  ------------------------------------------------------------------------------

**6.2 Store Counter Locking**

The store counter locking mechanism prevents concurrent issue processing
at the same physical counter, preventing race conditions and stock
errors. Implemented via Redis with TTL.

  -----------------------------------------------------------------------
  **Event**             **System Behaviour**
  --------------------- -------------------------------------------------
  Storekeeper opens MI  Redis SET with NX flag:
  create screen         counter:{store_id}:{counter_id} = {user_id,
                        timestamp, mr_id}. TTL = 15 minutes.

  Counter already       API returns 423 LOCKED with lock owner name and
  locked by another     time remaining. Mobile shows \'Counter locked by
  user                  \[Name\] --- wait or use another counter.\'

  Storekeeper completes Lock released immediately. Redis DEL. Counter
  MI                    shows available.

  Storekeeper abandons  TTL expires after 15 minutes; lock auto-released.
  without completing    Supervisor notified of abandoned lock.

  Supervisor            Override via supervisor screen; original lock
  force-releases lock   holder notified; override logged to audit_log.

  WebSocket broadcast   On lock and unlock events, all connected clients
                        for that store receive a real-time counter status
                        update.
  -----------------------------------------------------------------------

**6.3 Two-Person Verification (High-Value Items)**

  -----------------------------------------------------------------------
  **Control**        **Detail**
  ------------------ ----------------------------------------------------
  Trigger            Any MI line where (issued_qty × wac_unit_cost) \>
                     high_value_threshold OR item is on the
                     critical_items list

  Verifier           Verifier must be a different user to the storekeeper
  constraint         (verified_by_id ≠ issued_by_storekeeper_id) with
                     MI_VERIFY privilege

  Process            Storekeeper creates MI; verifier receives push
                     notification; verifier inspects items physically;
                     verifier confirms or disputes on their own device

  Dispute handling   If verifier disputes quantity or item, MI is paused;
                     both parties must resolve; supervisor notified if
                     unresolved after 30 minutes

  Audit              Both user IDs, confirmation timestamps, and any
                     dispute notes stored on MI record permanently
  -----------------------------------------------------------------------

**6.4 Stock Ledger Impact**

  -------------------------------------------------------------------------
  **Transaction**      **Stock Effect**         **Ledger Entry Type**
  -------------------- ------------------------ ---------------------------
  MI confirmed         available_qty −=         ISSUE_FROM_RESERVATION
  (STANDARD)           issued_qty; reserved_qty 
                       released                 

  MI confirmed         available_qty −=         EMERGENCY_ISSUE
  (EMERGENCY_DIRECT)   issued_qty directly      

  Return confirmed     available_qty +=         RETURN_TO_STOCK
  (GOOD)               returned_qty             

  Return confirmed     quarantine_qty +=        RETURN_TO_QUARANTINE
  (DAMAGED)            returned_qty             

  Tool LOST            No stock change;         WRITE_OFF_LOSS
  confirmation         loss_write_off entry     
                       created                  

  Inter-store transfer Source available_qty −=; INTER_STORE_TRANSFER
                       Destination              
                       available_qty +=         
  -------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **🛒 PROCUREMENT MODULE**                                             |
|                                                                       |
| PR → RFQ → PO → GRN → Invoice → Payment → RTS                         |
+-----------------------------------------------------------------------+

**7. Procurement Module --- Complete Pipeline**

**7.1 End-to-End Procurement Flow**

  -----------------------------------------------------------------------------
  **Step**   **Stage**     **Description**                 **Actor**
  ---------- ------------- ------------------------------- --------------------
  1          Purchase      Originator raises need with     Any authorised staff
             Request (PR)  justification, cost estimate,   
                           and job card link               

  2          PR Review &   Line supervisor reviews,        Supervisor chain
             Approval      adjusts quantity/budget, and    
                           approves or rejects             

  3          Request for   Procurement officer issues RFQ  Procurement Officer
             Quotation     to approved suppliers --- min.  
             (RFQ)         3 quotes above threshold        

  4          Quotation     Suppliers submit quotes; system Procurement Officer
             Receipt &     records, compares, and flags    
             Evaluation    best value                      

  5          Quotation     Evaluation summary approved by  Budget Authority
             Approval      budget authority based on       
                           amount tier                     

  6          Purchase      PO generated from approved      Procurement Officer
             Order (PO)    quotation --- locked against    
                           budget line                     

  7          PO Approval & PO approved and sent to         Approver + Supplier
             Dispatch      supplier --- supplier           
                           confirmation tracked            

  8          Goods Receipt Supplier delivers; storekeeper  Storekeeper
             (GRN)         records receipt against open PO (2-person)
                           lines                           

  9          Invoice       Supplier invoice matched to PO  Accounts / Finance
             Matching      and GRN --- system flags        
             (3-Way)       variances                       

  10         Payment       Matched invoice approved for    Finance Approver
             Approval      payment --- discrepancies must  
                           be resolved first               

  11         Return to     Rejected or excess goods        Storekeeper
             Supplier      returned with RTS document and  
             (RTS)         credit note tracking            

  12         PO Closure    PO closed when fully received   System auto / Manual
                           or cancelled --- budget         
                           commitment released             
  -----------------------------------------------------------------------------

**7.2 RFQ Thresholds & Approval Tiers**

  -------------------------------------------------------------------------
  **Estimated Value  **Min          **Method**      **Approval Required**
  Range**            Quotations**                   
  ------------------ -------------- --------------- -----------------------
  Below 10,000       1 (sole source Verbal / email  Supervisor Level 1
                     allowed)                       

  10,001 -- 100,000  2 written      Written email / Supervisor Level 1
                     quotes         portal          

  100,001 -- 500,000 3 written      Formal RFQ      Section Head Level 2
                     quotes         document        

  500,001 --         3 quotes +     Tender process  Dept Head Level 3
  1,000,000          formal tender                  

  Above 1,000,000    Open tender /  Full tender     Director Level 4+
                     board approval committee       
  -------------------------------------------------------------------------

**7.3 3-Way Invoice Matching**

  ------------------------------------------------------------------------
  **Match Check**       **Tolerance**    **Action on Failure**
  --------------------- ---------------- ---------------------------------
  Invoice Qty vs GRN    0% --- exact     Invoice line put on hold; query
  Qty                   match required   raised to supplier

  Invoice Price vs PO   ±2% unit price   Variance flagged for procurement
  Price                 tolerance        officer review

  Invoice Total vs PO   Within approved  Any excess requires new PO
  Total                 PO value         amendment and re-approval

  Invoice Date vs PO    Within agreed    Late invoice flagged; credit note
  Terms                 payment window   terms reviewed

  Tax / VAT Computation System           Discrepancy raised as supplier
                        recomputes and   query before payment
                        compares         
  ------------------------------------------------------------------------

**7.4 Budget Control & Commitment Accounting**

  ------------------------------------------------------------------------
  **Budget Stage** **Trigger**           **Effect on Budget Line**
  ---------------- --------------------- ---------------------------------
  Estimate         PR submitted for      Shows as pending estimate ---
                   approval              informational only

  Commitment       PO approved and       Budget encumbered --- available
                   dispatched            balance reduced

  Obligation       GRN confirmed by      Commitment converted to
                   storekeeper           obligation --- goods received

  Actual           Invoice matched and   Obligation closed; actual spend
  Expenditure      payment approved      recorded

  Commitment       PO cancelled before   Budget commitment fully reversed
  Release          GRN                   and released

  Credit Note      RTS credit note       Actual spend reduced by credit
  Applied          received              note value
  ------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **🔐 PURCHASE AUTHORITY MODULE**                                      |
|                                                                       |
| Local Purchase · Head Office Purchase · Custom Privilege Framework    |
+-----------------------------------------------------------------------+

**8. Purchase Authority --- Two-Channel Model**

**8.1 Channel Comparison**

  ------------------------------------------------------------------------
  **Dimension**      **Local Purchase (LP)**    **Head Office Purchase
                                                (HOP)**
  ------------------ -------------------------- --------------------------
  Who controls it    Workshop Manager / Local   HO Procurement Department
                     Procurement Officer        

  Item type          Machine/vehicle-specific   Standard stock items,
                     unique parts, emergency    common spares, bulk
                     consumables                commodities

  Value limit        Up to the workshop\'s      Any value above LPA ---
                     delegated Local Purchase   mandatory HO routing
                     Authority (LPA)            

  Supplier selection From local approved vendor From HO master approved
                     sub-list (LAVL)            vendor list (HAVL)

  PO issuer          Workshop Manager or        HO Procurement Officer
                     authorised Local PO Issuer only

  Budget authority   Workshop budget line ---   Central procurement budget
                     local cost centre          --- HO cost centre

  Approval chain     Local supervisor chain     Separate HO approval
                     (max 3 levels)             hierarchy per value tier

  Reporting          Workshop-level spend       Consolidated group spend +
                     reports                    workshop breakdown at HO
  ------------------------------------------------------------------------

**8.2 Automatic Channel Routing Engine**

When a PR is submitted, the routing engine evaluates five rules in
priority order:

  -----------------------------------------------------------------------------------
  **Priority**   **Rule**           **Condition**               **Result**
  -------------- ------------------ --------------------------- ---------------------
  1              Machine-Specific   Any PR line has specificity → LOCAL regardless of
                 Override           = MACHINE_SPECIFIC or       value
                                    VEHICLE_SPECIFIC AND        
                                    asset_id is linked          

  2              Emergency Override PR priority = EMERGENCY and → LOCAL with
                                    item available from LAVL    emergency privilege
                                    supplier                    required

  3              Value Hard Ceiling PR total estimated value    → HO mandatory ---
                                    exceeds workshop LPA limit  cannot be overridden
                                                                locally

  4              Item Channel       Item master has             → HO mandatory ---
                 Policy             force_ho_channel = true     even if below LPA
                                    (set by HO Admin)           

  5              Default Channel    None of the above           → LOCAL if below LPA,
                                    conditions matched          HO if above LPA
  -----------------------------------------------------------------------------------

**8.3 Workshop Local Purchase Authority (LPA) Limits**

  -------------------------------------------------------------------------
  **Workshop Role**  **Single PR LPA    **Emergency LPA **Monthly
                     Max**              Max**           Cumulative Cap**
  ------------------ ------------------ --------------- -------------------
  Technician /       No purchase        N/A             N/A
  Originator         authority ---                      
                     raise PR only                      

  Workshop           Up to 25,000       Up to 37,500    150,000 / month
  Supervisor                                            

  Local Procurement  Up to 100,000      Up to 150,000   500,000 / month
  Officer                                               

  Workshop Manager   Up to 250,000      Up to 375,000   1,000,000 / month

  Workshop Manager + Up to 500,000      Up to 500,000   2,000,000 / month
  Override           (requires HO ack.                  
                     in 24 hrs)                         

  HO Procurement     Unlimited (within  N/A --- HO      HO budget line
  Officer            HO budget line)    handles         controlled
  -------------------------------------------------------------------------

**8.4 Role Capability Matrix**

  -----------------------------------------------------------------------------------------------
  **Action**             **Tech**   **Supv**   **LPO**   **WM**   **HO   **HO    **HO    **Ctrl
                                                                  PO**   Fin**   Mgr**   Mgr**
  ---------------------- ---------- ---------- --------- -------- ------ ------- ------- --------
  Raise PR               ✓          ✓          ✓         ✓        ---    ---     ---     ---

  Approve LP PR          ---        L1         L2        L3       ---    ---     ---     ---
  (L1/L2/L3)                                                                             

  Submit to HO Queue     ---        ✓          ✓         ✓        ---    ---     ---     ---

  Issue LP RFQ (LAVL)    ---        ---        ✓         ---      ---    ---     ---     ---

  Issue LP PO            ---        ---        ✓         ---      ---    ---     ---     ---

  Approve LP PO          ---        ---        ---       ✓        ---    ---     ---     ---

  Issue HO PO            ---        ---        ---       ---      ✓      ---     ---     ---

  Approve HO PO          ---        ---        ---       ---      ---    ---     ✓       ---

  LP GRN Receive/Verify  ---        ---        ✓         ---      ---    ---     ---     ---

  LP Invoice Match       ---        ---        ✓         ---      ---    ---     ---     ---

  LP Payment Approve     ---        ---        ---       ✓        ---    ---     ---     ---

  HO Invoice Match       ---        ---        ---       ---      ✓      ✓       ---     ---

  HO Payment Approve     ---        ---        ---       ---      ---    ✓       ✓       ---

  Override Channel →     ---        ---        ---       ✓        ---    ---     ---     ---
  Local                                                                                  

  LPA Hard Override      ---        ---        ---       ---      ---    ---     ---     ✓

  Emergency Purchase     ---        ---        ---       ✓        ---    ---     ---     ---

  Emergency Ratification ---        ---        ---       ---      ---    ---     ---     ✓

  Manage LPA Limits      ---        ---        ---       ---      ---    ---     ✓       ---

  Grant Privileges       ---        ---        ---       ---      ---    ---     ✓       ---
  -----------------------------------------------------------------------------------------------

**9. Anti-Fraud & Control Framework**

**9.1 Transaction Control Matrix**

  ------------------------------------------------------------------------
  **Risk Area**    **Control          **Detection      **Escalation**
                   Mechanism**        Method**         
  ---------------- ------------------ ---------------- -------------------
  Fictitious GRN   2-person           Single-person    Flagged to manager
                   confirmation       GRN blocked      
                   required                            

  Duplicate GRN    Supplier +         Auto-detect on   Reject + alert
                   delivery note      submission       
                   unique check                        

  Fuel Theft       Meter +            Abnormal         Alert supervisor
                   consumption norm   detection engine 
                   check                               

  Phantom Jobs     Asset QR scan      No QR = no job   Hard block
                   mandatory          card             

  Stock            WAC frozen at      Daily integrity  Alert + lock
  Manipulation     issue time         checks           

  Photo            Camera-only + EXIF Metadata         Flag + hold
  Fabrication      check              validation       

  Approval Bypass  State machine      Invalid          Hard block + log
                   guards             transition =     
                                      reject           

  Device Sharing   Device fingerprint Mismatch =       Force re-auth
                   binding            session kill     

  Audit Tampering  Hash chain on      Daily chain      Alert + lock DB
                   audit_logs         verification     

  Override Abuse   Control Manager    Override log     Monthly audit
                   role only          review           

  Duplicate MI     Same item +        On each MI       Fraud flag record
                   technician + JC    confirm          
                   within 24h                          

  Bulk Pilfering   Max single-issue   Quantity vs item Manager approval
                   limit per item     master limit     required

  LPA Breach       Hard ceiling       Real-time LPA    Blocked; HO
                   enforced per       balance check    notified
                   approver                            

  Sole Source      Written            Document upload  Escalate to
  Abuse            justification + HO mandatory        Director
                   Mgr approval                        
  ------------------------------------------------------------------------

**9.2 Approval Routing Logic**

  ------------------------------------------------------------------------
  **Trigger Condition**  **Approval      **Escalation Path**
                         Level**         
  ---------------------- --------------- ---------------------------------
  Amount \< 100,000      Level 1         Direct supervisor

  Amount 100,001 --      Level 2         Supervisor + Section head
  500,000                                

  Amount 500,001 --      Level 3         \+ Department head
  1,000,000                              

  Amount \> 1,000,000    Level 4         \+ Director level

  User risk: HIGH        Min Level 2     Auto-elevated regardless of
                                         amount

  User risk: CRITICAL    Min Level 3 +   All actions held pending
                         all activities  
                         require         
                         approval        

  Loss / Exceptional /   Min Level 3     Type-based override of amount
  Major Adjustment                       level
  ------------------------------------------------------------------------

**10. Sprint Roadmap --- Consolidated Timeline**

The extended roadmap covers the core 20-phase Master Plan plus
additional sprints for the full Procurement module and Purchase
Authority framework.

**10.1 Core Platform Sprints (Weeks 1--40)**

  -----------------------------------------------------------------------------
  **Sprint   **Sprint Focus**  **Key Deliverables**             **Timeline**
  \#**                                                          
  ---------- ----------------- -------------------------------- ---------------
  1          Foundation &      Project setup, DEV/UAT/PROD      Weeks 1-2
             Environment       separation, basic auth           
                               scaffolding                      

  2          Core Database     Full schema with audit tables,   Weeks 3-4
             Schema            device control, HR fields, seed  
                               data                             

  3          Asset & QR        Asset registration, QR code      Weeks 5-6
             Management        generation, device registration  
                               workflow                         

  4          Job Card & State  Job creation, lifecycle state    Weeks 7-8
             Machine           machine, workflow guards,        
                               approvals                        

  5          Inventory Core    Stores, items, stock             Weeks 9-10
                               reservations, request/approve    
                               workflow                         

  6          Issue & Returns   Item issues, tool returns,       Weeks 11-12
                               counter locking UI, dual-custody 

  7          GRN & Procurement GRN with 2-person control,       Weeks 13-14
                               supplier management, fraud       
                               detection                        

  8          Fuel Control      Fuel issues, abnormal detection  Weeks 15-16
                               alerts, meter overrides          

  9          External &        External repairs,                Weeks 17-18
             Costing           subcontracting, job costing      
                               engine                           

  10         Labour & Training Labour assignments, training     Weeks 19-20
                               enforcement, skill gates         

  11         KPI & Supervisor  KPI engine, SLA tracking,        Weeks 21-22
             Workload          approval backlog, aging          
                               dashboards                       

  12         Integrity &       Integrity checks, override       Weeks 23-24
             Overrides         isolation, control manager role  

  13         Mobile PWA        PWA setup, forced workflow UI,   Weeks 25-26
                               photo security, watermarking     

  14         Offline & Sync    Offline storage, sync queue,     Weeks 27-28
                               conflict resolution UI           

  15         Physical          Counter displays, print slips,   Weeks 29-30
             Integration       tool tags, thermal printing      

  16         PM & Downtime     Preventive maintenance           Weeks 31-32
                               scheduling, downtime tracking,   
                               capacity                         

  17         Security & Rate   API throttling, device blocking, Weeks 33-34
             Limiting          anti-tampering measures          

  18         Testing & QA      Unit, integration, E2E tests,    Weeks 35-36
                               performance benchmarks           

  19         Disaster Recovery Backup automation, restore       Weeks 37-38
                               testing, DR plan, 7-year         
                               retention                        

  20         Go-Live           Production deployment, user      Weeks 39-40
                               training, hypercare support      
  -----------------------------------------------------------------------------

**10.2 Procurement Module Sprint Tracks (7B--7F)**

  ----------------------------------------------------------------------------------
  **Sprint**   **Weeks**   **Procurement Deliverables**
  ------------ ----------- ---------------------------------------------------------
  7B           14-15       PR module: create, submit, approve workflow; budget line
                           tables and encumbrance logic

  7C           15-16       RFQ module: issue, track responses, comparison matrix,
                           evaluation scoring

  7D           16-17       PO module: generate from quote, approve, dispatch,
                           acknowledge, amendment control

  7E           17-18       Invoice 3-way match, payment approval, RTS workflow,
                           supplier performance scoring

  7F           18-19       Budget dashboard, procurement KPIs, spend reports,
                           supplier master management
  ----------------------------------------------------------------------------------

**10.3 Purchase Authority Sprint Tracks (7G--7N)**

  ----------------------------------------------------------------------------------
  **Sprint**   **Weeks**   **Purchase Authority Deliverables**
  ------------ ----------- ---------------------------------------------------------
  7G           19-20       Privilege definitions table, role_privilege_sets,
                           user_privilege_overrides; seed data; NestJS privilege
                           guard middleware

  7H           20-21       Item channel policy: specificity flags, force_ho_channel;
                           item classification editor; LAVL and HAVL tables

  7I           21-22       Workshop LPA configuration; monthly cumulative cap
                           tracking; 5-rule routing engine; split PR logic

  7J           22-23       LP workflow end-to-end with privilege guards: PR → LP
                           approval → LAVL RFQ → LP PO → LP GRN → LP invoice match →
                           LP payment

  7K           23-24       HOP workflow: workshop PR → HO queue → HO approval chain
                           → HO RFQ/PO → GRN delegation → HO invoice match → cost
                           allocation

  7L           24-25       Override controls: LP_CHANNEL_OVERRIDE, SYS_LPA_OVERRIDE,
                           emergency purchase flow, emergency ratification queue, HO
                           notification triggers

  7M           25-26       Frontend: channel badge on PR create, LP approval queue
                           with LPA balance, LPA console, privilege assignment UI,
                           LAVL manager, LP spend dashboard

  7N           26-27       HO consolidated report, override audit log viewer,
                           emergency ratification UI, HO workqueue, KPIs: LP ratio,
                           override frequency, LPA utilisation
  ----------------------------------------------------------------------------------

**10.4 Three-Module Sprint Tracks (JC/MR/MI)**

  ----------------------------------------------------------------------------------
  **Sprint**   **Weeks**   **Module Deliverables**
  ------------ ----------- ---------------------------------------------------------
  S-JC1        1-2         Job Card core: database schema (job_cards, jc_tasks,
                           jc_state_transitions, jc_cost_lines, jc_documents); seed
                           data; JC number generation

  S-JC2        3-4         State machine implementation: all transitions, guards,
                           audit logging; asset QR scan validation; JC create API

  S-JC3        5-6         Task management: CRUD, mandatory task enforcement, photo
                           evidence upload with EXIF extraction, task completion
                           flow

  S-JC4        7-8         JC approval workflow: supervisor approval queue;
                           reject/return/approve; SLA engine with BullMQ; SLA breach
                           escalations

  S-JC5        9-10        JC frontend: mobile Create screen (QR → fault → tasks →
                           team → submit); Approval Queue; Detail View; Task
                           Execution; Supervisor Dashboard

  S-MR1        11-12       Material Request schema (material_requests, mr_lines,
                           stock_reservations, mr_state_transitions); stock
                           reservation logic; WAC snapshot at approval

  S-MR2        13-14       MR state machine: all transitions, guards, self-approval
                           block; stock availability check; reservation creation on
                           approval

  S-MR3        15-16       MR approval workflow: supervisor queue; line quantity
                           adjustment; emergency MR SLA escalation;
                           stock-unavailable alert

  S-MR4        17-18       MR frontend: mobile Create screen with stock levels;
                           Approval Queue; Status Tracker; Emergency MR form;
                           History per JC

  S-MI1        19-20       Material Issue schema (material_issues, mi_lines,
                           stock_transactions, store_counter_locks,
                           tool_loan_tracking); Redis counter lock service

  S-MI2        21-22       MI state machine; counter lock
                           acquisition/release/TTL/force-release; STANDARD issue
                           flow end-to-end; stock ledger deductions

  S-MI3        23-24       Two-person high-value verification; technician
                           signature/PIN confirmation; issue slip PDF generation;
                           tool serial number tracking

  S-MI4        25-26       Return management: return initiation; condition capture;
                           GOOD/DAMAGED/LOST handling; stock reinstatement; JC cost
                           reversal

  S-MI5        27-28       MI frontend: Store Counter UI (desktop); Technician
                           Receipt Screen (mobile); 2-Person Verify Screen; Return
                           screens; Tool Loan Dashboard

  S-INT        29-30       Full integration testing: end-to-end JC → MR → MI →
                           Return flow; all guards tested; WebSocket events; BullMQ
                           jobs; performance tests
  ----------------------------------------------------------------------------------

**11. Cross-Module Guards & Real-Time Events**

**11.1 Cross-Module Guards Summary**

The following guards are enforced at API level and cannot be bypassed
from the frontend. Each guard failure is logged with reason to
audit_logs.

  ------------------------------------------------------------------------------
  **Guard Name**               **Rule Enforced**
  ---------------------------- -------------------------------------------------
  JC_ASSET_SCAN_REQUIRED       Job Card creation requires asset_qr_scan_hash ---
                               no hash, no creation. No bypass.

  JC_SINGLE_OPEN_PER_ASSET     Only one open JC per asset unless JC_MULTI_OPEN
                               privilege granted by manager

  MR_REQUIRES_OPEN_JC          Material Request of type JC_LINKED requires JC in
                               APPROVED or IN PROGRESS --- cannot raise MR
                               against DRAFT, COMPLETED, or CLOSED JC

  MR_SELF_APPROVAL_BLOCKED     Approver of MR cannot be the same as the
                               requestor --- enforced at DB and API level

  MI_REQUIRES_APPROVED_MR      Standard Material Issue cannot proceed without
                               corresponding APPROVED MR with a valid
                               reservation

  MI_COUNTER_LOCK_REQUIRED     Material Issue creation acquires Redis counter
                               lock --- if lock acquisition fails, MI creation
                               is blocked with 423 response

  MI_ISSUED_TO_JC_TEAM         issued_to_employee_id must be in the
                               jc_technician_assignments for the linked JC ---
                               cross-issue blocked

  MI_CANNOT_EXCEED_MR          issued_quantity per line cannot exceed
                               outstanding_quantity on MR line --- hard database
                               constraint + API guard

  JC_CLOSE_OPEN_MR_BLOCK       JC cannot move to CLOSED if any linked MR is in
                               DRAFT, PENDING, APPROVED, or IN_PROGRESS status

  JC_CLOSE_TOOL_RETURN_BLOCK   JC cannot close if any tool_loan_tracking record
                               for that JC has loan_status = ACTIVE or OVERDUE

  JC_CLOSE_TASK_BLOCK          JC cannot move to COMPLETED if any task with
                               is_mandatory = true has is_complete = false

  PHOTO_EXIF_REQUIRED          For tasks with requires_photo_evidence = true,
                               uploaded photos must pass EXIF validation ---
                               missing or manipulated EXIF rejected

  MR_SELF_APPROVAL_BLOCKED     Approver of PR/MR cannot be the same as the
                               requestor --- enforced at DB and API level

  LPA_CEILING_BLOCK            PR/PO cannot be processed locally if value
                               exceeds approver\'s LPA --- hard block with HO
                               notification
  ------------------------------------------------------------------------------

**11.2 Real-Time WebSocket Events**

  ---------------------------------------------------------------------------
  **Event**              **Subscriber & Effect**
  ---------------------- ----------------------------------------------------
  jc:status_changed      All JC team members + supervisor: push notification
                         with new status and any blocking items

  jc:task_completed      Supervisor dashboard: task progress bar updates in
                         real time

  mr:submitted           All MR_APPROVE privileged users for that workshop:
                         new approval request badge on approval queue

  mr:approved            Requesting technician: \'Your MR has been approved
                         --- materials ready to collect\' push notification

  mi:ready_to_collect    Technician on JC: push notification that MI is
                         prepared at the counter and waiting for signature

  counter:locked         All storekeeper sessions for that store: counter
                         status widget shows \'LOCKED by \[name\]\'

  counter:released       All storekeeper sessions: counter status widget
                         shows \'AVAILABLE\'

  tool:overdue           Assigned technician + supervisor: escalating alerts
                         at due date, +24hrs, +48hrs

  jc:sla_breach          Supervisor + manager: SLA breach alert with JC
                         details and escalation contact

  mr:stock_unavailable   JC supervisor: alert that approved MR cannot be
                         fulfilled --- stock out for required item

  po:acknowledged        Workshop originator: HO PO acknowledged by supplier,
                         expected delivery date committed

  lpa:cap_warning        Workshop Manager: monthly cumulative LP spend
                         reaching 80% / 90% / 100% thresholds
  ---------------------------------------------------------------------------

**11.3 Automated Background Jobs (BullMQ)**

  ------------------------------------------------------------------------------
  **Job Name**            **Schedule /  **Action**
                          Trigger**     
  ----------------------- ------------- ----------------------------------------
  sla-monitor             Every 15      Check all APPROVED and IN_PROGRESS JCs
                          minutes       against priority SLA targets; emit
                                        sla_breach event if overdue

  mr-sla-monitor          Every 10      Check all PENDING MRs against approval
                          minutes       SLA; auto-escalate to next supervisor
                                        level

  tool-loan-overdue       Daily at      Scan tool_loan_tracking for due_date \<
                          08:00         today; send reminder at 0, +1, +2 days;
                                        escalate to manager at +3 days

  reservation-expiry      Daily at      Find stock_reservations where expires_at
                          07:00         \< now and MI not created; prompt
                                        storekeeper to release or extend

  counter-lock-cleanup    Every 5       Release any counter locks where
                          minutes       expires_at \< now (abandoned sessions);
                                        log to audit

  jc-cost-variance        On JC →       Compare actual total_cost vs
                          COMPLETED     estimated_parts_cost; if variance \>
                                        20%, create variance_alert; block
                                        closure until acknowledged

  stock-integrity-check   Daily at      Cross-validate: SUM of
                          02:00         stock_transactions (IN − OUT) for each
                                        item/store = current
                                        store_stock.available_qty

  duplicate-issue-scan    On each MI    Check for same item + same technician +
                          confirm       same JC within 24 hours; create
                                        fraud_flag record if found

  pr-approval-sla         Every 30      Check PRs pending approval against SLA
                          minutes       targets by priority tier; auto-escalate
                                        to next approver level

  lpa-monthly-reset       1st of each   Reset monthly cumulative LP spend
                          month         counters; send utilisation summary to HO
                                        Finance

  po-delivery-overdue     Daily at      Check POs where promised_delivery_date
                          08:00         \< today and not fully received; alert
                                        procurement officer

  rts-credit-note-chase   Daily at      Find RTS records \> 30 days without
                          09:00         credit note received; escalate to
                                        procurement supervisor
  ------------------------------------------------------------------------------

**12. Database Design --- Domain Table Groups**

**12.1 Core Design Principles**

-   Every table includes created_at, updated_at, created_by (UUID FK to
    users), and updated_by

-   All primary keys are UUID v4 (gen_random_uuid()) for
    distributed-safe, unpredictable IDs

-   Soft deletes preferred (is_active / deleted_at) to preserve audit
    history and referential integrity

-   All financial/quantity fields use DECIMAL(15,2) --- never FLOAT ---
    to prevent rounding errors

-   JSONB columns used for flexible config (pm_config, permissions) with
    indexing via GIN

-   Comprehensive use of CHECK constraints at DB level as last line of
    defense against invalid states

-   Partitioning strategy applied to high-volume tables (audit_logs,
    fuel_issues, job_transactions)

-   Three-layer audit: row-level timestamps + audit_logs JSONB
    snapshots + SHA-256 hash chain

**12.2 Domain Table Groups**

  -------------------------------------------------------------------------
  **Domain Group** **Key Tables**                     **Volume / Notes**
  ---------------- ---------------------------------- ---------------------
  Identity & Auth  users, roles, user_sessions,       Low volume, critical
                   user_risk_level,                   security tables
                   privilege_definitions,             
                   role_privilege_sets,               
                   user_privilege_overrides           

  Asset Management assets, asset_categories,          Medium volume,
                   asset_meters, asset_qr_codes       frequent meter
                                                      updates

  Job Cards        job_cards, jc_tasks,               High volume, full
                   jc_state_transitions,              audit trail required
                   jc_cost_lines, jc_documents,       
                   jc_supervisor_signoffs,            
                   jc_technician_assignments          

  Inventory &      stores, items, store_stock,        High volume,
  Stores           stock_transactions, reservations,  real-time lock needed
                   store_counter_locks,               
                   tool_loan_tracking                 

  Material         material_requests, mr_lines,       High volume,
  Requests         stock_reservations,                reservation critical
                   mr_state_transitions,              
                   mr_approval_history                

  Material Issues  material_issues, mi_lines,         High volume,
                   mi_state_transitions, mi_returns,  immutable ledger
                   mi_return_lines                    

  GRN &            grn_headers, grn_lines,            Medium volume,
  Procurement      purchase_requests, pr_lines,       2-person control
                   pr_approvals, rfq_headers,         
                   rfq_suppliers, quotations,         
                   quotation_lines,                   
                   quotation_evaluations              

  Purchase Orders  purchase_orders, po_lines,         Medium volume,
                   po_amendments, supplier_invoices,  financial controls
                   invoice_lines, return_to_supplier, 
                   budget_lines                       

  Purchase         workshop_purchase_authority,       Low-medium volume,
  Authority        lpa_change_history,                compliance-critical
                   item_channel_policy,               
                   local_approved_vendor_list,        
                   pr_channel_decisions,              
                   pr_split_records,                  
                   ho_procurement_queue,              
                   channel_override_log,              
                   monthly_lpa_usage                  

  Fuel &           fuel_tanks, fuel_issues,           High volume,
  Lubricants       fuel_readings, abnormal_detections partitioned by month

  External Repairs external_jobs, quotations,         Medium volume,
                   subcontractors, ext_job_costs      financial controls

  Labour           employees, assignments, time_logs, High volume, skill
                   training_completions               gate checks

  PM Schedules     pm_schedules, pm_triggers,         Medium volume,
                   pm_executions, downtime_logs       date-driven

  Approvals        approval_workflows,                High volume,
                   approval_requests, approval_steps, time-sensitive
                   sla_configs                        

  Documents        documents, document_versions,      High volume,
                   evidence_photos, exif_metadata     S3-backed

  Suppliers        suppliers, supplier_contacts,      Low-medium volume,
                   supplier_performance               AVL/HAVL managed

  Audit & Security audit_logs, device_registry,       Very high volume,
                   integrity_checks, override_logs    partitioned

  KPI & Reports    kpi_snapshots, report_schedules,   Medium volume,
                   mis_exports                        pre-aggregated
  -------------------------------------------------------------------------

**13. Environment & DevOps Strategy**

**13.1 Three-Environment Model**

  ------------------------------------------------------------------------
  **Aspect**      **DEV**            **UAT**            **PROD**
  --------------- ------------------ ------------------ ------------------
  Purpose         Developer          Stakeholder        Live operations
                  iteration          validation         

  Data            Seed / dummy data  Anonymised prod    Real data
                                     copy               

  Deploy trigger  Push to dev branch PR merged to main  Manual tag release

  Device control  OFF (open access)  OFF (open access)  ON (enforced)

  Debug flags     ON                 OFF                OFF

  Email delivery  Mailhog (local)    Real SMTP (test)   Real SMTP

  Backup          None               Weekly snapshot    Continuous WAL +
                                                        daily backup
  ------------------------------------------------------------------------

**13.2 CI/CD Pipeline**

-   On every PR: lint → typecheck → unit tests → integration tests (test
    DB) → build

-   On merge to main: all above + E2E tests (Playwright) → staging
    deployment → smoke test

-   On release tag: production build → pre-deployment safeguard check →
    blue/green deploy → health check

-   Pre-deployment safeguard: automated script blocks deploy if dev seed
    data, debug env vars, or missing migrations detected

-   Rollback: previous container image retained for 7 days ---
    one-command rollback with data compatibility check

**14. Risk Register**

  -----------------------------------------------------------------------------------
  **Risk**              **Likelihood**   **Impact**   **Mitigation**
  --------------------- ---------------- ------------ -------------------------------
  Poor connectivity in  High             High         Offline-first PWA with
  workshop                                            IndexedDB queue and smart sync

  User resistance to    Medium           High         UAT with real users, training
  new workflows                                       sessions, phased rollout

  Data migration from   Medium           High         Dedicated migration scripts
  legacy system                                       with validation and parallel
                                                      run

  Scope creep expanding High             Medium       Strict sprint backlog, change
  timeline                                            control process, MoSCoW
                                                      prioritisation

  Performance at high   Low              High         Load testing at Sprint 18, DB
  transaction volume                                  partitioning, Redis caching

  PostgreSQL            Low              Critical     Streaming replication to hot
  single-point of                                     standby, auto-failover, tested
  failure                                             DR plan

  Photo evidence        Medium           High         EXIF validation, camera-only
  manipulation                                        capture, cryptographic
                                                      watermarking

  Audit log tampering   Low              Critical     Hash chain on audit_logs, daily
                                                      chain integrity verification

  LPA limit bypass via  Medium           High         Hard API enforcement; override
  social engineering                                  requires SYS_LPA_OVERRIDE
                                                      privilege + HO notification

  Procurement fraud via Medium           High         Written justification
  sole-source                                         mandatory; HO Procurement
                                                      Manager approval required
  -----------------------------------------------------------------------------------

**15. Master Deliverables Checklist**

**15.1 Frontend Deliverables**

-   Mobile PWA --- field worker app with offline support and forced
    workflow navigation

-   Desktop UI --- supervisor and admin dashboard with approvals, KPIs,
    and reports

-   Shared UI component library with TailwindCSS and HeadlessUI
    primitives

-   QR scanner integration for asset identification on mobile

-   Offline sync status indicator and conflict resolution UI

-   Print-optimised slip layouts for store issues, GRN receipts, and
    fuel records

-   Store Counter UI (desktop) with real-time lock status and counter
    availability

-   PR Create screen with live LOCAL / HO channel badge and routing
    reason

-   LP Approval Queue with LPA balance indicator and hard-block
    notification

-   HO Procurement Workqueue for incoming PRs from all workshops

-   Privilege Assignment UI for HO Admin to grant/revoke user privileges

**15.2 Backend Deliverables**

-   NestJS API with 18+ domain modules, fully documented via
    Swagger/OpenAPI

-   JWT authentication system with device fingerprinting and refresh
    token rotation

-   Dynamic approval workflow engine with supervisor chain resolution
    and SLA tracking

-   Abnormal detection engine for fuel consumption anomalies

-   Job costing engine with real-time cost accumulation from all cost
    sources

-   BullMQ background jobs: low-stock alerts, PM triggers, SLA
    escalations, report delivery

-   WebSocket server for real-time store counter locks and supervisor
    alerts

-   5-rule procurement channel routing engine with split-PR logic

-   Custom privilege guard middleware for all LP/HO channel endpoints

-   3-way invoice matching engine with variance tolerance configuration

**15.3 Database Deliverables**

-   Complete PostgreSQL schema --- 70+ tables with full constraint and
    index coverage

-   Immutable audit log with SHA-256 hash chain for tamper detection

-   Daily integrity check service cross-validating stock balances
    against transactions

-   Prisma migration history --- numbered, sequential, never modified

-   Comprehensive seed data covering all roles, permissions, categories,
    and system config

-   Archival strategy: 7-year audit data retention with compressed cold
    storage

-   Purchase authority tables: LPA config, channel decisions, override
    log, monthly usage

**15.4 Infrastructure Deliverables**

-   Docker Compose local development environment --- one command setup

-   GitHub Actions CI/CD pipeline with automated test, build, and deploy
    stages

-   Three-environment deployment: DEV, UAT, PROD with environment
    safeguard checks

-   Nginx reverse proxy with SSL, rate limiting, and request logging

-   Automated PostgreSQL backup with S3 upload and monthly restore drill

-   Prometheus + Grafana monitoring with alerting to PagerDuty or
    equivalent

-   Disaster recovery plan: RPO 1 hour, RTO 4 hours --- documented and
    tested runbook

**16. SAP HCM Integration --- Enterprise ERP Alignment**

The Workshop Control Platform is designed to integrate with SAP\'s
enterprise modules where applicable. The following SAP modules are
relevant to WCP operations and can be interfaced via SAP APIs, IDocs, or
middleware (e.g. SAP Integration Suite / PI/PO) to eliminate duplicate
data entry and maintain a single source of truth across systems.

**16.1 SAP Module Overview & WCP Relevance**

  ------------------------------------------------------------------------
  **SAP Module**  **SAP      **WCP Integration Points**
                  Code**     
  --------------- ---------- ---------------------------------------------
  Human Capital   SAP HCM /  Employee master data sync (technicians,
  Management      HRM        supervisors); role and skills mapping;
                             payroll cost feeds for labour costing; leave
                             calendar integration for PM capacity planning

  Production      SAP PP     Work order alignment with WCP job cards; BOM
  Planning                   data for parts requirements; MRP-driven
                             replenishment triggers fed into WCP
                             procurement PRs; capacity planning
                             cross-reference

  Material        SAP MM     Item master sync (item codes, UOM, stock
  Management                 levels); purchase order mirroring for HO
                             procurement channel; GRN confirmation
                             triggers SAP goods receipt; invoice
                             verification 3-way match data exchange

  Financial       SAP FSCM   Customer billing data for fleet charge-back;
  Supply Chain               accounts receivable integration for external
  Management                 repair invoicing; credit management flags for
                             supplier payments

  Sales and       SAP SD     External workshop job billing to customers;
  Distribution               credit management for fleet operators;
                             shipping and delivery tracking for parts
                             procurement

  Project System  SAP PS     Capital investment job cards (MODIFICATION
                             type) mapped to SAP PS projects; WBS
                             integration for overhead allocation; budget
                             approval workflows mirrored

  Financial       SAP FICO   Cost centre and profit centre mapping; actual
  Accounting &               vs budget variance feed from WCP job costing
  Controlling                engine; purchase order commitment accounting
                             sync; overhead rate configuration from CO

  Plant           SAP PM     Preventive maintenance schedule
  Maintenance                synchronisation; equipment master data
                             (assets); IoT sensor data for predictive
                             maintenance triggers; downtime log exchange

  Quality         SAP QM     Quality inspection checklists linked to WCP
  Management                 job tasks; quality certificates for
                             calibration job cards; non-conformance
                             notifications from inspection outcomes; ISO
                             9000 audit trail alignment

  Investment      SAP IM     Capital expenditure job cards linked to SAP
  Management                 IM investment orders; budget availability
                             check before MODIFICATION job card approval;
                             R&D and training cost tracking

  Warehouse       SAP WMS    Bin-level stock synchronisation for
  Management                 multi-store inventory; storage bin mapping in
  System                     WCP issue transactions; inter-store transfer
                             coordination

  Supplier        SAP SRM    Approved vendor list synchronisation with WCP
  Relationship               HAVL; supplier performance scorecard data
  Management                 exchange; contract management alignment for
                             HO procurement channel
  ------------------------------------------------------------------------

**16.2 SAP HCM --- Workforce Integration Detail**

SAP HCM (also referred to as SAP HRM or SAP HR) goes beyond personnel
administration and payroll to treat employees as valuable assets. WCP
integrates with the following HCM functional areas:

  -----------------------------------------------------------------------
  **HCM Feature       **WCP Integration**
  Area**              
  ------------------- ---------------------------------------------------
  Employee Experience Employee satisfaction data from SAP SuccessFactors
  Management          Qualtrics surveys can flag high-risk technician
                      dissatisfaction, informing WCP risk level scoring
                      and override monitoring

  Talent Management   New employee records created in SAP HCM are synced
  --- Recruiting &    to WCP users table; role and privilege sets
  Onboarding          auto-assigned based on job grade and department
                      from HCM onboarding data

  Employee Training & Training completion records from SAP HCM are
  Development         mirrored into WCP training_completions table; skill
                      certifications with expiry dates sync
                      automatically; WCP training gate enforcement uses
                      HCM as the authoritative source

  Core HR ---         Employee ID, name, grade, department, cost centre,
  Employee Master     contract type (permanent/contract) synced from SAP
  Data                HCM to WCP employees table; changes in HCM trigger
                      real-time update in WCP via integration event

  Payroll Integration Hourly rates and overtime rates from SAP HCM
                      payroll data feed into WCP labour cost engine;
                      actual labour cost per job card computed using live
                      payroll-sourced rates by employee grade

  Leave Management    Approved leave records from SAP HCM leave workflow
                      sync to WCP leave calendar; WCP PM capacity
                      planning engine reads leave data to avoid
                      scheduling PM jobs against unavailable technicians

  HR Analytics &      WCP labour utilisation KPIs (available vs
  Workforce Planning  productive hours, skill gaps) can be exported to
                      SAP HCM analytics dashboards for workforce planning
                      decisions

  Human Experience    SAP SuccessFactors HXM suite integration allows WCP
  Management (HXM)    user satisfaction feedback to flow into the central
                      HXM platform for management review alongside
                      operational KPIs
  -----------------------------------------------------------------------

**16.3 SAP MM --- Material Management Integration Detail**

SAP Material Management is WCP\'s primary ERP integration point for
inventory and procurement. The integration ensures stock levels,
purchase orders, and supplier data remain consistent across both
systems.

  -----------------------------------------------------------------------
  **MM Function**     **WCP Integration**
  ------------------- ---------------------------------------------------
  Item Master         SAP MM material master synced to WCP items table;
  (Material Master)   item code, description, unit of measure, item
                      category, and minimum stock levels maintained in
                      SAP as the master record

  Vendor Master       SAP MM vendor file synced to WCP suppliers table;
                      approved vendor list (AVL) status, blacklist flag,
                      and payment terms maintained in SAP; WCP HAVL and
                      LAVL reference SAP vendor master

  Bill of Materials   SAP MM BOM hierarchy used to pre-populate WCP
  (BOM)               material request line items for known asset repair
                      scopes; BOM-driven MR creation reduces manual item
                      selection errors

  Purchase            WCP procurement PRs and POs above the HO channel
  Requisition /       threshold are mirrored as SAP MM purchase
  Purchase Order      requisitions and purchase orders; 2-way status sync
                      maintains consistency

  GRN / Goods Receipt WCP GRN confirmation triggers SAP MM goods receipt
                      posting (MIGO equivalent); stock level update
                      propagated back to WCP from SAP MM as the system of
                      record for financial valuation

  Invoice             WCP 3-way invoice match data feeds SAP MM invoice
  Verification (MIRO) verification process (MIRO); matched invoices sent
                      to SAP FI accounts payable for payment processing

  Warehouse           SAP WMS bin-level data synced with WCP store_stock
  Management System   bin_location field; physical inventory counts in
  (WMS)               SAP WMS reconciled against WCP stock_transactions
                      ledger

  Advanced Planner &  SAP APO supply chain planning signals can trigger
  Optimizer (APO /    WCP low-stock alerts and replenishment PRs; demand
  SCM)                forecasting data from APO informs WCP reorder
                      quantity recommendations
  -----------------------------------------------------------------------

**16.4 SAP FICO --- Finance Integration Detail**

WCP\'s job costing engine and procurement budget controls are designed
to integrate directly with SAP Financial Accounting (FI) and Controlling
(CO) for end-to-end financial visibility.

  -----------------------------------------------------------------------
  **FICO Function**   **WCP Integration**
  ------------------- ---------------------------------------------------
  General Ledger (SAP WCP job card cost lines (parts, labour, external,
  FI-GL)              overhead) posted as FI journal entries to the
                      appropriate GL accounts; cost centre and profit
                      centre derived from WCP job card department_id

  Accounts Payable    Supplier invoice payment approvals from WCP feed
  (SAP FI-AP)         SAP FI-AP payment runs; credit note receipts from
                      WCP RTS module trigger AP credit adjustments

  Asset Accounting    Capital expenditure job cards (MODIFICATION type)
  (SAP FI-AA)         in WCP link to SAP FI-AA asset under construction
                      (AuC) orders; costs capitalised upon job card
                      closure

  Cost Centre         WCP cost centre IDs map directly to SAP CO cost
  Accounting (SAP     centres; actual costs from WCP job costing engine
  CO-CCA)             update CO actual cost reports in real time via
                      integration

  Profit Centre       Workshop profit centre roll-up in SAP CO receives
  Accounting (SAP     WCP cost and revenue data for fleet operator
  CO-PCA)             charge-back scenarios; management reporting
                      consolidated at profit centre level

  Internal Orders     WCP job cards linked to SAP CO internal orders for
  (SAP CO-OPA)        overhead cost tracking; budget availability check
                      on internal order before job card approval for
                      capital or overhead type jobs

  Profitability       WCP job cost data by asset category, department,
  Analysis (SAP       and repair type feeds SAP CO-PA market segment
  CO-PA)              profitability analysis; fleet cost per asset class
                      visible in CO-PA reports

  Budget Commitment   WCP procurement PO commitments sync with SAP CO
  Accounting          budget monitoring; over-commitment warnings in WCP
                      validated against SAP CO available budget balance
                      to prevent dual commitment
  -----------------------------------------------------------------------

**16.5 SAP PM --- Plant Maintenance Integration**

SAP Plant Maintenance is the closest functional equivalent to WCP\'s
core job card and PM scheduling modules. Integration ensures no
duplication of maintenance records between systems.

  -----------------------------------------------------------------------
  **SAP PM Function** **WCP Integration**
  ------------------- ---------------------------------------------------
  Equipment Master    SAP PM equipment records synced to WCP assets
                      table; equipment number mapped to WCP asset_id;
                      meter readings (hour meter, KM counter) updated in
                      both systems on WCP job card closure

  Functional          SAP PM functional location hierarchy maps to WCP
  Locations           location_id and department_id; location-based
                      reporting consolidated across both platforms

  Maintenance Orders  SAP PM planned maintenance orders trigger WCP PM
                      job card creation via integration event; WCP PM
                      execution results (completion, parts used, labour
                      hours) written back to SAP PM order for cost
                      settlement

  Preventive          SAP PM maintenance plans and task lists
  Maintenance Plans   synchronised with WCP pm_schedules and pm_triggers;
                      WCP PM engine acts as the execution layer while SAP
                      PM holds the scheduling master data

  IoT / Predictive    SAP Business Technology Platform IoT sensor data
  Maintenance         (connected to plant equipment) can trigger WCP
                      CORRECTIVE job card creation when anomaly
                      thresholds are breached; AWS IoT integration events
                      routed to WCP notification module

  Breakdown /         Emergency WCP job cards (EMERGENCY priority,
  Corrective Orders   CORRECTIVE type) optionally mirrored to SAP PM
                      breakdown orders for integrated cost settlement and
                      asset history reporting
  -----------------------------------------------------------------------

**16.6 Integration Architecture**

The SAP-WCP integration layer uses an event-driven architecture to keep
both systems synchronised without tight coupling. All integration events
are logged in WCP\'s audit trail.

  ------------------------------------------------------------------------
  **Integration     **Use Cases**              **Technology**
  Pattern**                                    
  ----------------- -------------------------- ---------------------------
  Real-Time API     Employee master sync,      SAP OData APIs (S/4HANA)
  (REST/OData)      stock level queries,       consumed by WCP NestJS
                    budget availability        integration service
                    checks, PO status updates  

  Event-Driven      GRN confirmations, job     SAP Integration Suite (CPI)
  (Message Queue)   card closures, invoice     / Apache Kafka event bus
                    match results, leave       between SAP and WCP
                    approvals, training        
                    completions                

  Batch             Item master full sync,     Scheduled BullMQ jobs in
  Synchronisation   vendor master updates,     WCP triggering SAP RFC/BAPI
                    payroll rate refreshes,    calls overnight
                    BOM synchronisation        

  IDoc / File-Based Legacy SAP ECC             SAP IDoc ORDERS05, MBGMCR02
                    environments; GRN          (GRN), HR master IDocs
                    postings; PO creation      processed by WCP
                    where OData not available  integration adapter

  SAP S/4HANA Cloud Modern S/4HANA public      SAP Business Accelerator
  API               cloud environments; direct Hub APIs via NestJS HTTP
                    API access for material    module with OAuth 2.0
                    master, purchase orders,   
                    FI posting                 
  ------------------------------------------------------------------------

**16.7 Data Ownership & Conflict Resolution**

  --------------------------------------------------------------------------
  **Data Domain**  **Master      **Sync          **Conflict Rule**
                   System**      Direction**     
  ---------------- ------------- --------------- ---------------------------
  Employee / HR    SAP HCM       SAP → WCP       SAP always wins; WCP
  data                                           updates on HCM change event

  Item / Material  SAP MM        SAP → WCP       SAP MM is authoritative;
  master                                         WCP read-only for item
                                                 attributes

  Vendor /         SAP MM / SRM  SAP → WCP       SAP vendor master
  Supplier master                                authoritative; WCP
                                                 blacklist flag synced back
                                                 to SAP

  Job Card /       WCP           WCP → SAP PM    WCP is the execution
  Maintenance                                    system; SAP PM receives
  Order                                          completion data

  Stock            WCP           WCP → SAP MM    WCP issues/returns posted
  Transactions                                   to SAP MM as goods
  (Operational)                                  movements

  Budget           SAP CO        Bidirectional   SAP CO holds financial
  Commitments                                    budget; WCP reads available
                                                 balance; commitments
                                                 written to both

  Labour Costs     WCP           WCP → SAP CO    WCP computes labour cost
                   (actuals) +                   using HCM payroll rates;
                   SAP HCM                       posts to SAP CO cost centre
                   (rates)                       

  Training         SAP HCM       SAP → WCP       HCM training records
  Completions                                    authoritative; WCP skill
                                                 gates enforce HCM
                                                 certifications
  --------------------------------------------------------------------------

**17. Section-by-Section Explanations --- Plain English Guide**

This section explains every part of the Super Master Plan in plain
language --- what each section covers, who it is intended for, and why
it matters to the overall platform. Use this as a reading guide before
diving into the technical detail of any section.

**Cover Page**

The cover page is the identity card of the entire document. It states
the platform name (Workshop Control Platform), the document type (Super
Master Plan), and the three defining values of the system ---
Transaction-Controlled, Evidence-Backed, and Audit-First. The summary
table below the title gives any reader --- from a technician to a
director --- a one-glance understanding of what was built, what
technology powers it, and how long it will take. The module connection
matrix beneath that shows the three operational heart modules (Job Card,
Material Request, Material Issue) and how they chain together, making it
clear from page one that no transaction in this platform exists in
isolation.

**Section 1 --- Executive Summary**

This is the opening argument for the entire platform. It answers the
question: why does WCP exist and what makes it different from a basic
workshop log? The answer is that WCP is not just a record-keeping tool
--- it is a control system. Every transaction must be approved. Every
item movement must be evidence-backed. Every cost must be traceable to
the person who created it, the device they used, and the time it
happened. The eight Core Platform Pillars listed here are the
non-negotiable design principles that every developer, every tester, and
every business owner must understand before anything else. If a feature
breaks one of these pillars, it is wrong --- regardless of how
convenient it might be.

**Section 2 --- Full Technology Stack**

This section is the technical recipe of the platform. It is written for
developers, solution architects, and IT management who need to
understand what skills are required, what licences are needed, and how
the system can be maintained and extended over time. The frontend stack
(React 18, TypeScript, Vite, TailwindCSS) represents the user interface
layer --- what workshop staff and supervisors see and interact with. The
backend stack (NestJS, Node.js, Prisma ORM) is the business logic layer
--- where all rules, approvals, and data processing happen. The database
and infrastructure stack (PostgreSQL, Redis, MinIO, Docker, Nginx) is
the foundation --- where data is stored, files are kept, and the system
is hosted. Each technology was chosen deliberately: PostgreSQL for
rock-solid data integrity, Redis for real-time locking, MinIO for
evidence photo storage, and Docker for consistent deployment across
environments.

**Section 3 --- Backend Module Architecture**

This section maps out the internal structure of the backend system.
Rather than building one large application that does everything, WCP is
divided into 18 separate modules --- each responsible for one domain of
the business. This approach, called Domain-Driven Design, means that the
Job Card module has no business reaching into the Fuel module\'s
database tables directly. Each module talks to others through defined
service interfaces. This matters because it makes the system
maintainable: if the Procurement module needs to be changed, developers
can do so without touching the Quality Management or Labour modules. For
business owners, this section shows the complete scope of what the
backend covers --- from authentication and assets through to KPI
reporting and audit logging.

**Section 4 --- Job Card Module**

The Job Card is the central document of the entire workshop operation.
Nothing happens in the workshop without one. This section defines every
aspect of how Job Cards work: the seven types of job (corrective
breakdown, scheduled preventive maintenance, inspection, engineering
modification, accident repair, calibration, and warranty), the complete
lifecycle of a job from creation through to closure, and every business
rule that governs that lifecycle. The state machine is the most
important concept here --- it defines every possible status a job card
can be in and exactly what conditions must be met before it can move to
the next status. For example, a technician cannot mark a job complete if
there are unreturned tools or unfulfilled material requests. These are
not just policies --- they are technically enforced at the system level
so they cannot be bypassed. The SLA targets table defines how quickly
each priority level must be responded to and completed, with automatic
escalation if those targets are missed.

**Section 5 --- Material Request Module**

A Material Request (MR) is the formal ask from a technician to the store
for parts, tools, or consumables needed to complete a job. This section
covers the complete lifecycle of that request --- from a technician
raising it on their mobile device, through supervisor approval, to the
stock reservation that holds the items aside until they can be
physically collected. The stock reservation logic is particularly
important: when an MR is approved, the system immediately locks the
requested stock so no other MR can claim those same items, preventing a
scenario where two technicians both get approval for the last unit of a
critical part but only one can actually receive it. The business rules
here also enforce that an approver cannot approve their own request,
that quantities cannot exceed the item\'s maximum single-issue limit,
and that duplicate requests for the same item on the same job within 24
hours trigger a fraud flag.

**Section 6 --- Material Issue Module**

The Material Issue (MI) is the moment when physical items actually leave
the store and go to the technician. This is the highest-risk transaction
in the stores operation --- it is the point where stock permanently
leaves the shelf. This section covers all six issue types, the
Redis-based counter locking system that prevents two storekeepers from
simultaneously processing issues at the same physical counter (which
would cause stock count errors), and the two-person verification
requirement for high-value items. The return management process here is
also critical --- it defines exactly what happens when a technician
returns unused parts (stock reinstated), returns a damaged item (goes to
quarantine, not back to available stock), or fails to return a tool
(escalating alerts, cost posting to the job card, and a management
investigation flag). The immutable stock ledger table captures every
single movement with before and after balances, providing a complete
double-entry style audit trail.

**Section 7 --- Procurement Module**

The Procurement Module manages the entire journey of acquiring goods
from outside the organisation --- from the initial request through to
payment. It is built around a fundamental principle: no money should be
committed without proper competition, approval, and evidence. The
12-step end-to-end flow in this section follows a purchase from a
technician\'s initial request (PR) through supplier quotations (RFQ),
formal purchase order (PO), goods receipt (GRN), invoice matching, and
final payment. The three-way match engine is a key fraud-prevention
control: before any invoice can be approved for payment, the system
automatically checks that the invoice quantity matches what was actually
received (GRN) and that the price matches what was agreed in the
purchase order. Any discrepancy blocks payment until it is resolved. The
budget commitment accounting section explains how the system tracks not
just money spent, but money committed --- so a department cannot
accidentally over-commit its budget across multiple outstanding purchase
orders.

**Section 8 --- Purchase Authority Module**

This module answers a critical question: who is allowed to buy what, at
what value, and through which channel? The two-channel model divides all
procurement into either a Local Purchase (handled entirely within the
workshop) or a Head Office Purchase (handled by the central procurement
department). The routing engine automatically determines which channel a
purchase should go through based on five rules evaluated in priority
order --- for example, if a part is specific to a particular machine or
vehicle, it always goes local regardless of value, because only the
workshop knows exactly what part is needed for that asset. The Local
Purchase Authority (LPA) table defines the maximum value each role is
permitted to approve without involving Head Office. The custom privilege
framework goes beyond simple roles --- it allows fine-grained control,
so a Workshop Manager might be permitted to approve local POs but not to
bypass the RFQ requirement, while a Control Manager holds the special
LPA Hard Override privilege for genuine emergencies. Every override is
logged and the relevant Head Office team is automatically notified.

**Section 9 --- Anti-Fraud & Control Framework**

This section consolidates all the fraud-prevention controls that are
built into the platform and explains the logic behind each one. The
Transaction Control Matrix lists 14 specific fraud risks --- from
fictitious GRN creation and fuel theft to phantom job cards and audit
log tampering --- and for each one identifies the specific technical
control that prevents it, the automated detection method that catches
attempts, and the escalation action that is triggered. This is not a
list of policies to be followed by staff --- these are technical
controls enforced by the system that cannot be circumvented through
human action alone. The Approval Routing Logic table explains how the
system automatically determines the correct approval chain based on
transaction value and the requestor\'s risk level, so a high-risk user
always requires more sign-offs regardless of the amount involved.

**Section 10 --- Sprint Roadmap**

This section is the project delivery plan. It answers: in what order
will the platform be built, and when will each capability be available?
The core 20 sprints (each 2 weeks long) cover the foundational platform
build from environment setup through to go-live. Each sprint has a clear
focus and specific deliverables --- for example, Sprint 4 delivers the
Job Card state machine, Sprint 7 delivers GRN with two-person control.
The additional sprint tracks (7B through 7N) cover the Procurement and
Purchase Authority modules, which were added after the original roadmap.
The three-module sprint tracks (S-JC through S-INT) are a parallel set
of sprints that build the detailed Job Card, Material Request, and
Material Issue functionality to the level of completeness defined in
Sections 4, 5, and 6. The sprint plan is intentionally
dependency-ordered --- foundational database and authentication work
comes first, domain modules build on top, and integration testing comes
last.

**Section 11 --- Cross-Module Guards & Real-Time Events**

This section covers two things that make WCP feel like a live, connected
system rather than a set of disconnected forms. The cross-module guards
are API-level enforcement rules that span across modules --- for
example, the rule that a Material Issue cannot be created without an
approved Material Request, which itself cannot exist without an open Job
Card, which itself cannot exist without a physical asset QR scan. These
guards form an unbreakable chain of custody from the physical asset all
the way through to the cost posted against the job. The WebSocket events
section explains the real-time notifications that keep all parties
informed without manual checking: a storekeeper sees a counter lock
appear the moment another colleague starts processing an issue, a
technician receives a push notification the instant their material
request is approved, and a supervisor\'s dashboard updates live as tasks
are completed on the workshop floor. The BullMQ background jobs section
lists the 12 automated tasks that run continuously in the background ---
monitoring SLA breaches, chasing overdue tools, checking stock
integrity, and scanning for duplicate issue fraud patterns.

**Section 12 --- Database Design**

This section is the data architecture of the entire platform. It
explains the eight core design principles that govern every table in the
system --- for example, the rule that all financial values use
DECIMAL(15,2) rather than floating-point numbers (which can introduce
rounding errors in money calculations), and the three-layer audit
architecture that makes every record tamper-proof. The three layers work
together: every table has timestamps and user IDs on every row, a
separate audit_logs table captures a full before-and-after snapshot of
every change across the entire database, and a SHA-256 hash chain links
each audit log entry to the previous one --- so if anyone attempts to
delete or modify an audit record directly in the database, the broken
hash chain is detected by the daily integrity check. The domain table
groups section maps out all 18 groups of tables covering every area of
the system from identity and authentication through to KPI snapshots and
report archival.

**Section 13 --- Environment & DevOps Strategy**

This section explains how the platform is built, tested, and deployed in
a controlled and repeatable way. Three separate environments exist for
different purposes: DEV is where developers write and test code with
dummy data, UAT is where real business users validate the system with
anonymised production data before signing off, and PROD is the live
system used by actual workshop staff. The CI/CD pipeline (automated
build and deployment) ensures that every code change is automatically
tested before it can reach any environment --- a developer cannot push
broken code that skips tests. The pre-deployment safeguard check is a
particularly important control: an automated script runs before every
production deployment and will block the deployment entirely if it
detects developer seed data, debug flags, or missing database migrations
--- preventing accidental exposure of test data or incomplete database
changes in the live environment.

**Section 14 --- Risk Register**

The Risk Register is an honest assessment of what could go wrong and
what has been done to prevent or mitigate each risk. Ten risks are
identified, ranging from operational risks (poor workshop connectivity,
user resistance to new processes) through technical risks (PostgreSQL
single point of failure, performance at high transaction volumes) to
integrity risks (photo evidence manipulation, audit log tampering). For
each risk, the register records the likelihood, the potential impact,
and the specific mitigation built into the platform. This section is
particularly useful for senior management and auditors who need
assurance that the platform has been designed with risk in mind, not as
an afterthought. The inclusion of data migration risk acknowledges that
most workshops have some form of legacy data that will need to be
carefully migrated into the new system.

**Section 15 --- Master Deliverables Checklist**

This section is the complete list of everything that will be delivered
by the end of the project. It is organised into four categories:
Frontend Deliverables (the screens and interfaces that users interact
with), Backend Deliverables (the APIs, engines, and background jobs that
power the system), Database Deliverables (the schema, audit
infrastructure, and archival strategy), and Infrastructure Deliverables
(the hosting, monitoring, backup, and deployment systems). This
checklist serves two purposes: it is a commitment to stakeholders about
what will be built, and it is a sign-off checklist for the go-live
readiness review. No production deployment should proceed if any item on
this list is incomplete, because every item represents a control, a
capability, or a safeguard that the platform was designed to provide.

**Section 16 --- SAP HCM Integration**

This section explains how WCP connects to SAP\'s enterprise system
suite, ensuring that data is never entered twice and that the two
platforms remain consistent. SAP is a large, comprehensive enterprise
resource planning (ERP) system used by many organisations for finance,
HR, procurement, and maintenance. WCP is the operational execution layer
for the workshop --- the system that field staff and storekeepers
actually use day-to-day --- while SAP is the financial and HR system of
record for the organisation. The integration is designed so that SAP
remains the authoritative source for HR data (employee records,
training, payroll rates, leave), material master data (item codes,
descriptions, prices), and financial postings (general ledger, cost
centres). WCP sends operational outcomes back to SAP --- job card costs
post to SAP FI/CO, GRN confirmations trigger SAP MM goods receipts, and
procurement POs above the HO threshold are mirrored in SAP MM. The data
ownership and conflict resolution table at the end of this section makes
clear exactly which system wins in any conflict, preventing data
inconsistencies between the two platforms.

**18. Frontend Screen Wireframes & UI Layouts**

This section describes the detailed layout, component structure, and
interaction design for every key screen across both the Mobile PWA and
Desktop UI. These wireframe descriptions define the visual hierarchy,
user flow, and data shown on each screen --- serving as the
specification for the UI/UX designer and frontend developer.

**18.1 Mobile PWA --- Screen Layouts**

**Screen M-01: Asset QR Scan (Entry Gate)**

This is the first screen every technician sees when starting any
transaction. It is a full-screen camera viewfinder with a square
targeting reticle in the centre. The top bar shows the logged-in user\'s
name and a logout icon. Below the viewfinder is a status label that
reads \'Point camera at asset QR code\'. On successful scan, the screen
briefly flashes green, plays a confirmation sound, and automatically
navigates to the Job Card Create screen with the asset pre-populated. If
the QR code is not found in the database, a red banner appears reading
\'Asset not recognised --- contact supervisor\'. Manual entry of an
asset code is blocked by design --- the input field does not exist on
this screen.

  -----------------------------------------------------------------------
  **Zone**      **Component**          **Behaviour**
  ------------- ---------------------- ----------------------------------
  Top Bar       User avatar + name,    Tap logout triggers confirmation
                logout icon            dialog before ending session

  Main Area     Full-screen camera     Auto-focuses; vibrates on scan
                viewfinder, targeting  detection; green flash on success
                reticle                

  Bottom Bar    Status label, torch    Torch toggle activates phone
                toggle icon            flashlight for dark environments

  Error Overlay Red banner with error  Appears over viewfinder;
                text and retry button  auto-dismisses after 4 seconds
  -----------------------------------------------------------------------

**Screen M-02: Job Card Create (Mobile --- 4 Steps)**

This is a forced 4-step wizard on mobile --- the user cannot skip any
step or go back past Step 1 once the asset is locked in. A progress bar
at the top shows steps 1 through 4 with the current step highlighted.

  -----------------------------------------------------------------------
  **Step**      **Screen Content**              **Validation Before
                                                Next**
  ------------- ------------------------------- -------------------------
  Step 1 ---    Asset photo (from asset         Meter reading entered and
  Asset         master), asset code, asset      \>= last recorded reading
  Confirmed     name, current meter reading,    
                location. Read-only ---         
                pre-filled from QR scan.        

  Step 2 ---    Job Type dropdown (7 types),    Job type selected; fault
  Job Details   Priority selector (5 levels     description \>= 20 chars;
                with colour coding), Fault      conditional fields filled
                Description text area (min 20   if required
                chars), conditional fields (ECO 
                number for MODIFICATION,        
                accident report for ACCIDENT)   

  Step 3 ---    Add Task button opens inline    At least 1 task added;
  Tasks         form: description, task type,   each task has description
                assigned technician, mandatory  \>= 10 chars
                toggle, photo required toggle.  
                Task list shows below with      
                swipe-to-delete.                

  Step 4 ---    Supervisor selector (shows only Supervisor selected;
  Team & Submit users with JC_APPROVE privilege estimated duration \> 0;
                in same workshop), estimated    user reviews summary and
                duration field, estimated parts taps Submit
                cost (optional). Summary card   
                at bottom showing all entered   
                data.                           
  -----------------------------------------------------------------------

**Screen M-03: Task Execution (Mobile)**

This screen is the technician\'s working view during a job. It shows the
task list for the current Job Card, with each task displayed as a card.
Incomplete tasks have a grey left border; completed tasks have a green
left border. Tapping a task card expands it into the execution flow:
Before Photo capture button, Work Notes text area, After Photo capture
button, and a Mark Complete button that only activates when notes are
entered and the after-photo is taken (if required). A floating cost
meter at the top right shows the running total cost of the job updating
in real time as materials are issued.

  ------------------------------------------------------------------------
  **Component**    **State: Incomplete**       **State: Complete**
  ---------------- --------------------------- ---------------------------
  Task Card        Grey left border, task      Green left border, green
                   description, assigned       checkmark, completion
                   technician chip, \'Not      timestamp, completed-by
                   Started\' badge             name

  Before Photo     Orange button with camera   Replaced by thumbnail of
  Button           icon                        captured photo with retake
                                               option

  Work Notes Field Empty text area with        Shows entered notes in
                   placeholder                 read-only with edit pencil
                                               icon

  After Photo      Grey (disabled until work   Orange → captured thumbnail
  Button           notes entered)              shown

  Mark Complete    Disabled grey ---           Replaced by green
  Button           requirements checklist      \'Completed\' badge
                   shown below                 
  ------------------------------------------------------------------------

**Screen M-04: Material Request Create (Mobile)**

Accessed from the Job Card detail screen via the \'Request Materials\'
button. The screen shows a search bar at the top to find items from the
item master. Each search result shows the item name, item code, current
stock level in the selected store (colour-coded: green above min, amber
near min, red at zero), and unit of measure. Tapping an item adds it to
the request list below. Each line in the request list shows item name, a
quantity stepper (+ and - buttons), and a bin icon to remove the line. A
store selector at the top lets the technician choose which store to
request from. The bottom shows the estimated total cost updating as
quantities change, and a Submit button.

  -----------------------------------------------------------------------
  **Component**      **Detail**
  ------------------ ----------------------------------------------------
  Item Search Bar    Live search with 300ms debounce; shows top 10
                     results; search by item code or description

  Stock Level Badge  Green = above minimum stock; Amber = within 20% of
                     minimum; Red = zero stock (item still requestable
                     but triggers procurement alert)

  Quantity Stepper   Min 1; Max = item master max_single_issue value;
                     tapping max shows tooltip \'Maximum single issue
                     limit reached\'

  Store Selector     Dropdown showing all active stores the technician\'s
                     workshop has access to; defaults to primary workshop
                     store

  Cost Estimate      Sum of (quantity x current WAC) per line; updates in
  Footer             real time; shown as \'Estimated Cost: LKR X,XXX\'

  Submit Button      Active only when at least 1 line item exists;
                     triggers guard checks before navigating to
                     confirmation screen
  -----------------------------------------------------------------------

**Screen M-05: Technician Receipt Confirmation (Mobile)**

This screen appears when a Material Issue has been prepared by the
storekeeper and is ready for the technician to collect. The technician
receives a push notification directing them to this screen. It shows a
summary of all items prepared --- item names, quantities, bin locations
--- and a large PIN entry pad at the bottom. The technician must enter
their 6-digit PIN (or use biometric if enabled) to sign off on receiving
the items. Tapping Confirm triggers the MI to move to ISSUED status, the
stock ledger is updated, and a printable slip is generated. If any item
is incorrect, the technician taps \'Report Issue\' which pauses the MI
and notifies the storekeeper.

**Screen M-06: Return Initiation (Mobile)**

Accessed from the Job Card detail screen when a technician needs to
return unused materials or a tool. The screen shows all issued items for
the current job card. Each line has a checkbox and a quantity field
pre-filled with the originally issued quantity. The technician checks
the items to return, adjusts quantities if returning only part of an
issue, selects a return reason from a dropdown (Job completed without
using, Wrong item issued, Excess quantity, Tool return), and taps Submit
Return. For tool returns, the serial number of the tool is shown as
confirmation.

**18.2 Desktop UI --- Screen Layouts**

**Screen D-01: Supervisor Dashboard**

The supervisor dashboard is the command centre for the workshop. It is a
single-page view with six live metric cards at the top, a job card
status kanban board in the centre, and two side panels for pending
approvals and SLA breach alerts. All data updates in real time via
WebSocket without requiring a page refresh.

  -----------------------------------------------------------------------
  **Dashboard      **Content**                    **Update Mechanism**
  Zone**                                          
  ---------------- ------------------------------ -----------------------
  Top Metric Cards Open Jobs, Pending Approvals,  WebSocket real-time
  (6)              SLA Breaches, On-Hold Jobs,    push; count badge
                   Low Stock Alerts, Overdue      pulses red when new
                   Tools --- each card shows      item arrives
                   count with colour coding       
                   (green/amber/red)              

  Kanban Board     Columns: PENDING \| APPROVED   Cards move between
                   \| IN PROGRESS \| ON HOLD \|   columns in real time;
                   COMPLETED. Each job shown as a SLA timers count down
                   card with asset name,          live; overdue cards
                   technician, priority badge,    shown with red border
                   time elapsed, and SLA          
                   countdown timer.               

  Pending          List of pending Job Cards and  Badge count updates on
  Approvals Panel  Material Requests awaiting     new submission; items
  (right)          supervisor action; each item   disappear from list
                   shows requestor, type,         immediately on action
                   estimated cost, and time       
                   waiting; one-tap               
                   approve/reject.                

  SLA Breach       Chronological list of jobs     New breaches appear at
  Alerts Panel     that have breached or are      top of list; resolved
  (left)           about to breach their SLA;     items (job completed)
                   each shows job number, asset,  auto-removed
                   breach type, and minutes       
                   overdue.                       
  -----------------------------------------------------------------------

**Screen D-02: Store Counter UI (Desktop --- Storekeeper)**

This is the primary storekeeper interface used at the physical store
counter. It is a two-panel layout: the left panel shows counter status
(locked/available) for all counters in the store, and the right panel is
the active transaction workspace. When a storekeeper opens a new issue
transaction, the system acquires a Redis counter lock and the left panel
immediately shows their counter as \'LOCKED --- \[Name\]\' to all other
storekeepers. The MR lookup field in the right panel accepts either a
typed MR number or a scanned QR code from the technician\'s physical MR
slip. Once the MR is loaded, the right panel fills with the item lines,
quantities, bin locations, and batch/serial number fields. A prominent
Print Slip button generates the physical issue slip before the
transaction can be confirmed.

  ------------------------------------------------------------------------
  **Panel**      **Component**      **Detail**
  -------------- ------------------ --------------------------------------
  Left ---       Counter grid (1    Green card = Available; Red card with
  Counter Status card per counter)  name and timer = Locked; clicking a
                                    locked counter (supervisor only) shows
                                    force-release option

  Right --- MR   MR number input +  Auto-populates all line items on valid
  Lookup         QR scan icon       MR number; shows MR status badge;
                                    rejects if MR not in APPROVED status

  Right ---      Table: Item \| Bin Qty to Issue editable (cannot exceed
  Issue Lines    \| Batch/Serial \| outstanding quantity); Bin and Batch
                 Qty Requested \|   required fields; red highlight if
                 Qty to Issue \|    serial number already on active loan
                 WAC                

  Right ---      2-Person Verify    Opens verifier login prompt; verifier
  Verification   button (appears    must authenticate on same screen; both
                 for high-value     names shown on confirmed slip
                 lines)             

  Right ---      Print Slip         Confirm Issue disabled until slip is
  Actions        button + Confirm   printed; clicking Confirm triggers
                 Issue button       technician mobile notification
  ------------------------------------------------------------------------

**Screen D-03: Procurement --- PR Approval Queue (Desktop)**

The PR Approval Queue shows all Purchase Requests awaiting the logged-in
supervisor\'s action. It is a table with expandable rows. The top bar
shows three filter tabs: All, Local Purchase, and Head Office --- so a
supervisor can focus on just the channel relevant to their role. Each
row shows PR number, originator, linked job card, item count, estimated
value, routing channel badge (LOCAL in blue, HO in orange), days
waiting, and an action menu. Expanding a row shows the full line item
detail with current stock levels for each item, budget availability for
the cost centre, and the routing reason code explanation. The Approve
button opens a side panel where the supervisor can adjust quantities per
line before confirming approval.

**Screen D-04: Budget Dashboard (Desktop --- Manager/Finance)**

A visual budget control centre showing the real-time financial position
across all cost centres. The main area shows a horizontal stacked bar
chart for each cost centre with segments for: Original Budget (grey),
Committed / Encumbered (yellow), Obligated / GRN Received (orange), and
Actual Spend / Paid (red). The remaining available balance is shown as
white space. Hovering any segment shows the detailed breakdown. Below
the chart, a table lists every open Purchase Order contributing to the
committed figure, with PO number, supplier, value, and expected delivery
date. A traffic light legend shows green (below 80% utilised), amber
(80-90%), and red (above 90%).

**19. Prisma Schema --- Core Domain Tables**

This section defines the actual Prisma ORM schema for all core domain
tables. The schema is the authoritative source for the database
structure. Every migration must be generated from this schema --- never
edited manually after generation. Fields marked AUTO are managed by
Prisma middleware or database defaults and must never be set manually in
application code.

**19.1 Schema Conventions**

  -------------------------------------------------------------------------------------------
  **Convention**   **Rule**                   **Example**
  ---------------- -------------------------- -----------------------------------------------
  Primary Keys     UUID v4, generated by      id String \@id
                   database default           \@default(dbgenerated(\"gen_random_uuid()\"))
                                              \@db.Uuid

  Timestamps       All tables have createdAt  \@default(now()) for createdAt; \@updatedAt for
                   and updatedAt; set by      updatedAt
                   Prisma middleware          

  User Tracking    All tables have createdBy  createdBy String \@db.Uuid; createdByUser User
                   and updatedBy UUID FKs to  \@relation(\...)
                   users table                

  Soft Deletes     Use isActive Boolean       Never use hard deletes on domain tables; set
                   \@default(true) or         isActive = false
                   deletedAt DateTime?        

  Financial Fields Always Decimal with        \@db.Decimal(15, 2)
                   precision 15 scale 2       

  Enums            Defined in Prisma schema   enum JobCardStatus { DRAFT PENDING APPROVED
                   as enum blocks; never use  IN_PROGRESS ON_HOLD COMPLETED CLOSED CANCELLED
                   raw strings in application }
                   code                       

  Relations        Always define both sides   \@relation(\"JobCardOriginator\", fields:
                   of a relation; use         \[originatorId\], references: \[id\])
                   explicit \@relation names  
                   for multiple FKs to same   
                   model                      
  -------------------------------------------------------------------------------------------

**19.2 Core Enum Definitions**

  -------------------------------------------------------------------------
  **Enum Name**           **Values**
  ----------------------- -------------------------------------------------
  JobCardStatus           DRAFT, PENDING, APPROVED, IN_PROGRESS, ON_HOLD,
                          COMPLETED, CLOSED, CANCELLED, REJECTED

  JobCardType             CORRECTIVE, PREVENTIVE, INSPECTION, MODIFICATION,
                          ACCIDENT, CALIBRATION, WARRANTY

  JobCardPriority         LOW, NORMAL, HIGH, CRITICAL, EMERGENCY

  TaskType                INSPECT, REPLACE, REPAIR, ADJUST, CLEAN, TEST,
                          OTHER

  MaterialRequestStatus   DRAFT, PENDING, APPROVED, IN_PROGRESS, ISSUED,
                          ON_HOLD, CANCELLED, RETURNED, CLOSED,
                          STOCK_UNAVAILABLE, PARTIAL_RESERVED, REJECTED

  MaterialRequestType     JC_LINKED, EMERGENCY_STANDALONE, REPLENISHMENT,
                          WORKSHOP_CONSUMABLE

  MaterialIssueStatus     DRAFT, PENDING, ISSUED, PARTIAL, CANCELLED,
                          RETURN_INITIATED, RETURNED, CLOSED

  IssueType               STANDARD, EMERGENCY_DIRECT, INTER_STORE,
                          TOOL_LOAN, WORKSHOP_CONSUMABLE, SCRAP_WRITE_OFF

  ItemType                CONSUMABLE, REPLACEABLE, TOOL, BULK_COMMODITY

  ReturnCondition         GOOD, DAMAGED, LOST

  PurchaseRequestStatus   DRAFT, PENDING_APPROVAL, APPROVED, REJECTED,
                          RETURNED, PO_RAISED, PARTIALLY_RECEIVED,
                          FULFILLED, CANCELLED

  PurchaseChannel         LOCAL, HO, SPLIT

  POStatus                DRAFT, PENDING_APPROVAL, APPROVED, SENT,
                          ACKNOWLEDGED, PARTIALLY_RECEIVED, FULLY_RECEIVED,
                          INVOICED, CLOSED, CANCELLED, ON_HOLD

  InvoiceStatus           RECEIVED, MATCHED, VARIANCE, DISPUTED,
                          APPROVED_FOR_PAYMENT, PAID, CREDIT_NOTE_RECEIVED

  UserRiskLevel           LOW, MEDIUM, HIGH, CRITICAL

  ApprovalDecision        APPROVED, REJECTED, RETURNED, ESCALATED

  DocumentType            BEFORE_PHOTO, AFTER_PHOTO, INSPECTION_FORM,
                          CERTIFICATE, INVOICE, DELIVERY_NOTE, OTHER

  TransactionDirection    IN, OUT

  StockTransactionType    ISSUE_FROM_RESERVATION, EMERGENCY_ISSUE,
                          RETURN_TO_STOCK, RETURN_TO_QUARANTINE,
                          WRITE_OFF_LOSS, INTER_STORE_TRANSFER,
                          GRN_RECEIPT, OPENING_BALANCE, ADJUSTMENT

  LoanStatus              ACTIVE, RETURNED, OVERDUE, LOST
  -------------------------------------------------------------------------

**19.3 Job Card Schema**

  ----------------------------------------------------------------------------------------
  **Field**              **Type**          **Attribute / Constraint**
  ---------------------- ----------------- -----------------------------------------------
  id                     String            \@id
                                           \@default(dbgenerated(\"gen_random_uuid()\"))
                                           \@db.Uuid

  jcNumber               String            \@unique --- system generated JC-YYYY-NNNNN

  jcType                 JobCardType       enum --- required

  assetId                String            \@db.Uuid --- FK to assets

  assetQrScanHash        String            SHA-256 hash of scan event --- required; proves
                                           physical presence

  faultDescription       String            min length 20 enforced in service layer

  faultCode              String?           optional FK to fault_catalogue

  priority               JobCardPriority   enum --- required

  status                 JobCardStatus     \@default(DRAFT)

  originatorId           String            \@db.Uuid --- FK to users;
                                           \@relation(\"JCOriginator\")

  assignedSupervisorId   String            \@db.Uuid --- FK to users;
                                           \@relation(\"JCSupervisor\")

  departmentId           String            \@db.Uuid --- FK to departments

  locationId             String            \@db.Uuid --- FK to locations

  startMeterReading      Decimal?          \@db.Decimal(15,2) --- set when status →
                                           IN_PROGRESS

  endMeterReading        Decimal?          \@db.Decimal(15,2) --- set when status → CLOSED

  estimatedDurationHrs   Decimal           \@db.Decimal(8,2) --- required on create

  estimatedPartsCost     Decimal?          \@db.Decimal(15,2) --- optional

  pmScheduleId           String?           \@db.Uuid --- required if jcType = PREVENTIVE

  accidentReportId       String?           \@db.Uuid --- required if jcType = ACCIDENT

  ecoNumber              String?           required if jcType = MODIFICATION

  warrantyClaimRef       String?           required if jcType = WARRANTY

  downtimeStart          DateTime?         auto-set on approval; timezone-aware

  downtimeEnd            DateTime?         auto-set on closure

  reopenCount            Int               \@default(0) --- incremented by state machine
                                           only

  totalPartsCost         Decimal           \@default(0) \@db.Decimal(15,2) --- running sum

  totalLabourCost        Decimal           \@default(0) \@db.Decimal(15,2)

  totalExternalCost      Decimal           \@default(0) \@db.Decimal(15,2)

  totalCost              Decimal           \@default(0) \@db.Decimal(15,2) --- computed on
                                           each cost posting

  createdBy              String            \@db.Uuid --- FK to users

  createdAt              DateTime          \@default(now())

  updatedBy              String            \@db.Uuid --- FK to users

  updatedAt              DateTime          \@updatedAt
  ----------------------------------------------------------------------------------------

**19.4 Material Request Schema**

  --------------------------------------------------------------------------------------------
  **Field**            **Type**                **Attribute / Constraint**
  -------------------- ----------------------- -----------------------------------------------
  id                   String                  \@id
                                               \@default(dbgenerated(\"gen_random_uuid()\"))
                                               \@db.Uuid

  mrNumber             String                  \@unique --- MR-YYYY-NNNNN

  mrType               MaterialRequestType     enum --- required

  jcId                 String?                 \@db.Uuid --- FK to job_cards; required if
                                               mrType = JC_LINKED

  requestedById        String                  \@db.Uuid --- FK to users (employee session)

  storeId              String                  \@db.Uuid --- FK to stores

  requiredDate         DateTime                date technician needs materials by

  priority             JobCardPriority         inherited from JC or set on standalone

  justification        String                  min 10 chars

  totalEstimatedCost   Decimal                 \@default(0) \@db.Decimal(15,2) --- computed
                                               from lines

  status               MaterialRequestStatus   \@default(DRAFT)

  approvalComments     String?                 required when status → REJECTED or RETURNED

  approvedById         String?                 \@db.Uuid --- FK to users

  approvedAt           DateTime?               timestamp of approval

  reservationId        String?                 \@db.Uuid --- FK to stock_reservations; created
                                               on approval

  createdBy /          Standard audit fields   same pattern as job_cards
  updatedBy /                                  
  createdAt /                                  
  updatedAt                                    
  --------------------------------------------------------------------------------------------

**19.5 Material Issue Schema**

  ---------------------------------------------------------------------------------------------
  **Field**               **Type**              **Attribute / Constraint**
  ----------------------- --------------------- -----------------------------------------------
  id                      String                \@id
                                                \@default(dbgenerated(\"gen_random_uuid()\"))
                                                \@db.Uuid

  miNumber                String                \@unique --- MI-YYYY-NNNNN

  issueType               IssueType             enum --- required

  mrId                    String?               \@db.Uuid --- FK to material_requests; required
                                                for STANDARD type

  jcId                    String                \@db.Uuid --- FK to job_cards

  storeId                 String                \@db.Uuid --- FK to stores

  counterLockId           String?               Redis lock key reference; stored for audit

  issuedToEmployeeId      String                \@db.Uuid --- FK to employees

  issuedByStorekeeperId   String                \@db.Uuid --- FK to users (session)

  verifiedById            String?               \@db.Uuid --- required for high-value items

  totalCost               Decimal               \@default(0) \@db.Decimal(15,2) --- sum of line
                                                costs

  slipPrinted             Boolean               \@default(false)

  technicianSignature     String?               PIN hash or biometric token --- required before
                                                → ISSUED

  issueNotes              String?               optional storekeeper note

  status                  MaterialIssueStatus   \@default(DRAFT)

  issuedAt                DateTime?             set when status → ISSUED

  createdBy / updatedBy / Standard audit fields same pattern
  createdAt / updatedAt                         
  ---------------------------------------------------------------------------------------------

**19.6 Stock Transaction Ledger Schema**

  ------------------------------------------------------------------------------------------
  **Field**           **Type**               **Attribute / Constraint**
  ------------------- ---------------------- -----------------------------------------------
  id                  String                 \@id
                                             \@default(dbgenerated(\"gen_random_uuid()\"))
                                             \@db.Uuid

  transactionType     StockTransactionType   enum --- immutable after creation

  itemId              String                 \@db.Uuid --- FK to items

  storeId             String                 \@db.Uuid --- FK to stores

  binLocation         String                 specific bin/shelf in store

  quantity            Decimal                \@db.Decimal(15,2) --- always positive;
                                             direction determines in/out

  direction           TransactionDirection   enum IN or OUT

  referenceId         String                 \@db.Uuid --- FK to the source document (MI,
                                             GRN, Return, etc.)

  referenceType       String                 e.g. \'material_issue\', \'grn\', \'return\'

  wacBefore           Decimal                \@db.Decimal(15,2) --- WAC of item before this
                                             transaction

  wacAfter            Decimal                \@db.Decimal(15,2) --- WAC of item after this
                                             transaction

  balanceAfter        Decimal                \@db.Decimal(15,2) --- available_qty after this
                                             transaction

  deviceFingerprint   String                 device ID of issuing device --- anti-fraud
                                             tracking

  ipAddress           String                 \@db.Inet --- IP address of request

  transactedById      String                 \@db.Uuid --- FK to users

  transactedAt        DateTime               \@default(now()) --- immutable; no updatedAt on
                                             this table
  ------------------------------------------------------------------------------------------

**19.7 Audit Log Schema (Immutable Hash Chain)**

  ---------------------------------------------------------------------------------
  **Field**           **Type**      **Attribute / Constraint**
  ------------------- ------------- -----------------------------------------------
  id                  String        \@id
                                    \@default(dbgenerated(\"gen_random_uuid()\"))
                                    \@db.Uuid

  tableName           String        name of the table where the change occurred

  recordId            String        \@db.Uuid --- PK of the changed record

  action              String        INSERT, UPDATE, or DELETE

  beforeData          Json?         JSONB snapshot of row before change; null for
                                    INSERT

  afterData           Json?         JSONB snapshot of row after change; null for
                                    DELETE

  changedById         String        \@db.Uuid --- FK to users

  changedAt           DateTime      \@default(now())

  ipAddress           String        \@db.Inet

  deviceFingerprint   String        device ID

  previousHash        String?       SHA-256 hash of the previous audit_log row;
                                    null for first row

  currentHash         String        SHA-256 hash of (tableName + recordId +
                                    action + changedAt + previousHash)
  ---------------------------------------------------------------------------------

**20. API Request & Response Payloads**

This section defines the exact JSON request body and response structure
for every critical API endpoint across all modules. These specifications
are the contract between the frontend and backend teams --- the frontend
must send exactly this structure and can rely on exactly this response
shape. All endpoints require a valid JWT Bearer token in the
Authorization header unless noted otherwise.

**20.1 Job Card API Payloads**

**POST /job-cards --- Create Job Card**

  --------------------------------------------------------------------------------------------
  **Field**                         **Type**    **Required**   **Notes**
  --------------------------------- ----------- -------------- -------------------------------
  assetQrScanHash                   string      YES            SHA-256 hash generated by
                                                               mobile QR scanner at time of
                                                               scan

  assetId                           string      YES            Asset UUID resolved from QR
                                    (uuid)                     scan; must match hash

  jcType                            string      YES            CORRECTIVE \| PREVENTIVE \|
                                    (enum)                     INSPECTION \| MODIFICATION \|
                                                               ACCIDENT \| CALIBRATION \|
                                                               WARRANTY

  priority                          string      YES            LOW \| NORMAL \| HIGH \|
                                    (enum)                     CRITICAL \| EMERGENCY

  faultDescription                  string      YES            Minimum 20 characters

  faultCode                         string      NO             From fault catalogue; optional

  assignedSupervisorId              string      YES            Must have JC_APPROVE privilege
                                    (uuid)                     

  departmentId                      string      YES            Cost centre for job costing
                                    (uuid)                     

  locationId                        string      YES            Workshop bay or field site
                                    (uuid)                     

  estimatedDurationHrs              number      YES            Decimal hours e.g. 2.5

  estimatedPartsCost                number      NO             Optional estimate for variance
                                                               alerting

  pmScheduleId                      string      COND           Required if jcType = PREVENTIVE
                                    (uuid)                     

  ecoNumber                         string      COND           Required if jcType =
                                                               MODIFICATION

  warrantyClaimRef                  string      COND           Required if jcType = WARRANTY

  tasks                             array       YES            At least 1 task object (see
                                                               task structure below)

  tasks\[\].taskDescription         string      YES            Min 10 chars

  tasks\[\].taskType                string      YES            INSPECT \| REPLACE \| REPAIR \|
                                    (enum)                     ADJUST \| CLEAN \| TEST \|
                                                               OTHER

  tasks\[\].assignedToEmployeeId    string      YES            Must be an active employee in
                                    (uuid)                     the workshop

  tasks\[\].isMandatory             boolean     YES            If true, JC cannot complete
                                                               without this task

  tasks\[\].requiresPhotoEvidence   boolean     YES            If true, after-photo mandatory
                                                               before mark complete
  --------------------------------------------------------------------------------------------

Success Response 201 Created:

  -----------------------------------------------------------------------
  **Field**        **Type**      **Notes**
  ---------------- ------------- ----------------------------------------
  id               string (uuid) Newly created Job Card UUID

  jcNumber         string        System-generated e.g. JC-2025-00421

  status           string        DRAFT

  assetId /        string        Resolved asset details
  assetCode /                    
  assetName                      

  totalCost        number        0.00 on creation

  tasks            array         Created tasks with their IDs

  createdAt        string (ISO   Timestamp of creation
                   8601)         
  -----------------------------------------------------------------------

**POST /job-cards/:id/approve --- Approve Job Card**

  ---------------------------------------------------------------------------------
  **Request Field**    **Type**    **Required**   **Notes**
  -------------------- ----------- -------------- ---------------------------------
  comments             string      NO             Optional approval comment shown
                                                  in timeline

  startMeterOverride   number      NO             If supervisor needs to correct
                                                  the meter reading entered by
                                                  technician
  ---------------------------------------------------------------------------------

  -----------------------------------------------------------------------
  **Response       **Type**      **Notes**
  Field**                        
  ---------------- ------------- ----------------------------------------
  id               string (uuid) Job Card UUID

  status           string        APPROVED

  approvedBy       object        { id, name, role } of approving
                                 supervisor

  approvedAt       string (ISO   Timestamp
                   8601)         

  downtimeStart    string (ISO   Asset downtime clock started
                   8601)         

  transitionLog    object        { fromStatus: PENDING, toStatus:
                                 APPROVED, guardsPassed: \[\...\] }
  -----------------------------------------------------------------------

**POST /job-cards/:id/complete --- Complete Job Card**

  -------------------------------------------------------------------------------------
  **Request Field**          **Type**    **Required**   **Notes**
  -------------------------- ----------- -------------- -------------------------------
  endMeterReading            number      YES            Must be \>= startMeterReading;
                                                        validates against last recorded
                                                        meter

  completionNotes            string      YES            Min 20 chars --- technician\'s
                                                        summary of work done

  supervisorSignoffPhotoId   string      YES            Document ID of supervisor
                             (uuid)                     sign-off photo uploaded prior
  -------------------------------------------------------------------------------------

Guard failure response (422 Unprocessable Entity):

  -----------------------------------------------------------------------
  **Field**        **Type**      **Notes**
  ---------------- ------------- ----------------------------------------
  error            string        GUARD_FAILURE

  failedGuards     array of      e.g. \[\'JC_CLOSE_OPEN_MR_BLOCK\',
                   strings       \'JC_CLOSE_TOOL_RETURN_BLOCK\'\]

  detail           object        For each failed guard: description and
                                 list of blocking record IDs
  -----------------------------------------------------------------------

**20.2 Material Request API Payloads**

**POST /material-requests --- Create Material Request**

  ----------------------------------------------------------------------------------------
  **Request Field**             **Type**    **Required**   **Notes**
  ----------------------------- ----------- -------------- -------------------------------
  mrType                        string      YES            JC_LINKED \|
                                (enum)                     EMERGENCY_STANDALONE \|
                                                           REPLENISHMENT \|
                                                           WORKSHOP_CONSUMABLE

  jcId                          string      COND           Required if mrType = JC_LINKED;
                                (uuid)                     JC must be APPROVED or
                                                           IN_PROGRESS

  storeId                       string      YES            Store to draw materials from
                                (uuid)                     

  requiredDate                  string (ISO YES            Date materials needed by
                                8601)                      

  justification                 string      YES            Min 10 chars

  lines                         array       YES            At least 1 line item

  lines\[\].itemId              string      YES            Must be active item in item
                                (uuid)                     master

  lines\[\].requestedQuantity   number      YES            Decimal \> 0; validated against
                                                           item max_single_issue

  lines\[\].taskId              string      NO             Links material to a specific JC
                                (uuid)                     task for task-level costing
  ----------------------------------------------------------------------------------------

  ------------------------------------------------------------------------
  **Response Field (201 **Type**      **Notes**
  Created)**                          
  --------------------- ------------- ------------------------------------
  id / mrNumber         string        UUID and MR-YYYY-NNNNN reference

  status                string        DRAFT

  totalEstimatedCost    number        Sum of lines at current WAC

  lines                 array         Each line with id, itemCode,
                                      itemName, wacAtCreation, lineStatus

  stockCheck            array         Real-time stock availability per
                                      line: { itemId, availableQty,
                                      reservedQty, status:
                                      \'AVAILABLE\'\|\'LOW\'\|\'ZERO\' }
  ------------------------------------------------------------------------

**POST /material-requests/:id/approve --- Approve MR**

  -----------------------------------------------------------------------------------------------
  **Request Field**                    **Type**    **Required**   **Notes**
  ------------------------------------ ----------- -------------- -------------------------------
  lineApprovals                        array       YES            One entry per MR line; must
                                                                  include all lines

  lineApprovals\[\].mrLineId           string      YES            ID of the MR line being
                                       (uuid)                     approved

  lineApprovals\[\].approvedQuantity   number      YES            Can be less than
                                                                  requestedQuantity; cannot be
                                                                  more

  lineApprovals\[\].approved           boolean     YES            false = this specific line is
                                                                  rejected; others can still be
                                                                  approved

  comments                             string      NO             Overall approval comment
  -----------------------------------------------------------------------------------------------

  --------------------------------------------------------------------------
  **Response Field (200 **Type**      **Notes**
  OK)**                               
  --------------------- ------------- --------------------------------------
  status                string        APPROVED

  reservations          array         Stock reservations created: { itemId,
                                      reservedQty, storeId, expiresAt }

  partialReservations   array         Items where only partial stock was
                                      available; remainder triggers
                                      procurement alert

  unavailableItems      array         Items with zero stock; procurement PR
                                      draft IDs for storekeeper review
  --------------------------------------------------------------------------

**20.3 Material Issue API Payloads**

**POST /material-issues --- Create Material Issue**

  -------------------------------------------------------------------------------------
  **Request Field**          **Type**    **Required**   **Notes**
  -------------------------- ----------- -------------- -------------------------------
  issueType                  string      YES            STANDARD \| EMERGENCY_DIRECT \|
                             (enum)                     TOOL_LOAN \|
                                                        WORKSHOP_CONSUMABLE \|
                                                        SCRAP_WRITE_OFF

  mrId                       string      COND           Required if issueType =
                             (uuid)                     STANDARD; must be in APPROVED
                                                        status

  storeId                    string      YES            Source store; must hold the
                             (uuid)                     reservation for STANDARD type

  counterId                  string      YES            Physical counter ID; Redis lock
                                                        acquired on this counter

  issuedToEmployeeId         string      YES            Must be assigned to the linked
                             (uuid)                     JC

  lines                      array       YES            Items to issue

  lines\[\].mrLineId         string      COND           Required for STANDARD type
                             (uuid)                     

  lines\[\].itemId           string      YES            Item being issued
                             (uuid)                     

  lines\[\].binLocation      string      YES            Specific bin in store

  lines\[\].batchNumber      string      COND           Required for batch-tracked
                                                        items

  lines\[\].serialNumber     string      COND           Required for TOOL type items

  lines\[\].issuedQuantity   number      YES            Cannot exceed outstanding qty
                                                        on MR line

  lines\[\].returnDueDate    string (ISO COND           Required if issueType =
                             8601)                      TOOL_LOAN
  -------------------------------------------------------------------------------------

  ------------------------------------------------------------------------------
  **Response Field (201       **Type**      **Notes**
  Created)**                                
  --------------------------- ------------- ------------------------------------
  id / miNumber               string        UUID and MI-YYYY-NNNNN reference

  status                      string        PENDING --- awaiting technician
                                            confirmation

  counterLockId               string        Redis lock key; lock held until MI
                                            confirmed or cancelled

  totalCost                   number        Sum of (issuedQty x wacUnitCost) per
                                            line

  requiresVerification        boolean       true if any line exceeds high-value
                                            threshold

  verificationRequestedFrom   object \|     { userId, userName } of requested
                              null          2nd-person verifier

  slipUrl                     string        URL to generated printable slip PDF
  ------------------------------------------------------------------------------

**20.4 Procurement API Payloads**

**POST /procurement/pr --- Create Purchase Request**

  ----------------------------------------------------------------------------------------
  **Request Field**             **Type**    **Required**   **Notes**
  ----------------------------- ----------- -------------- -------------------------------
  jcId                          string      NO             Link to job card if procurement
                                (uuid)                     is job-specific

  budgetCodeId                  string      YES            FK to budget_lines;
                                (uuid)                     availability checked on submit

  priority                      string      YES            NORMAL \| URGENT \| EMERGENCY
                                (enum)                     

  requiredByDate                string (ISO YES            Date by which goods are needed
                                8601)                      

  justification                 string      YES            Min 20 chars --- business
                                                           justification

  lines\[\].itemId              string      YES            Item master reference
                                (uuid)                     

  lines\[\].quantityRequested   number      YES            Decimal \> 0

  lines\[\].estimatedUnitCost   number      YES            For budget availability check
                                                           and routing

  lines\[\].assetId             string      NO             If item is
                                (uuid)                     machine/vehicle-specific;
                                                           drives LOCAL routing

  attachments                   array of    NO             Pre-uploaded document IDs
                                uuids                      (specs, damage photos)
  ----------------------------------------------------------------------------------------

  ------------------------------------------------------------------------
  **Response Field (201 **Type**      **Notes**
  Created)**                          
  --------------------- ------------- ------------------------------------
  id / prNumber         string        UUID and PR-YYYY-NNNNN reference

  status                string        DRAFT

  channelDecision       object        { determinedChannel:
                                      \'LOCAL\'\|\'HO\',
                                      routingReasonCode: \'\...\',
                                      explanation: \'\...\' }

  splitPRs              array \| null If mixed-channel, array of { prId,
                                      prNumber, channel } for each sub-PR

  budgetCheck           object        { budgetCodeId, originalBudget,
                                      committed, available, willExceed:
                                      boolean }

  totalEstimatedValue   number        Sum of all line estimated values
  ------------------------------------------------------------------------

**POST /procurement/invoice/:id/match --- Trigger 3-Way Match**

  -----------------------------------------------------------------------------
  **Request Field**  **Type**    **Required**   **Notes**
  ------------------ ----------- -------------- -------------------------------
  invoiceId          string      YES (URL       Supplier invoice to match
                     (uuid)      param)         

  -----------------------------------------------------------------------------

  ------------------------------------------------------------------------
  **Response Field (200 **Type**      **Notes**
  OK)**                               
  --------------------- ------------- ------------------------------------
  matchStatus           string        MATCHED \| VARIANCE \| DISPUTED

  checks                array         One object per check: { checkType,
                                      poValue, grnValue, invoiceValue,
                                      withinTolerance, varianceAmount,
                                      variancePercent }

  blockedLines          array         Invoice lines that failed matching
                                      --- require resolution before
                                      payment

  autoApproved          boolean       true if all checks passed within
                                      tolerance and auto-approve is
                                      configured

  nextAction            string        Description of what action is
                                      required e.g. \'Raise supplier query
                                      for line 2\'
  ------------------------------------------------------------------------

**20.5 Authentication API Payloads**

**POST /auth/login --- User Login**

  ------------------------------------------------------------------------------
  **Request Field**   **Type**    **Required**   **Notes**
  ------------------- ----------- -------------- -------------------------------
  username            string      YES            Employee ID or email address

  password            string      YES            bcrypt hashed on client before
                                                 transmission

  deviceFingerprint   string      YES            Browser/device fingerprint
                                                 hash; validated against
                                                 device_registry

  workshopId          string      YES            Workshop the user is logging in
                      (uuid)                     from
  ------------------------------------------------------------------------------

  ------------------------------------------------------------------------
  **Response Field (200 **Type**      **Notes**
  OK)**                               
  --------------------- ------------- ------------------------------------
  accessToken           string (JWT)  15-minute expiry; contains userId,
                                      role, workshopId, privileges array

  refreshToken          string        7-day expiry; HttpOnly cookie; used
                                      to obtain new access tokens

  user                  object        { id, name, role, workshopId,
                                      privileges: string\[\], riskLevel }

  deviceRegistered      boolean       false if device is new and requires
                                      registration approval in production

  sessionId             string (uuid) Session ID for concurrent session
                                      management
  ------------------------------------------------------------------------

**21. SAP Integration Adapter --- Implementation Guide**

This section defines the NestJS integration module architecture, the
specific API calls and IDoc types used for each SAP interface, the error
handling and retry strategy, and the event mapping between WCP internal
events and SAP transactions. All SAP integration code lives in the
apps/api/src/integrations/sap/ directory.

**21.1 Integration Module Structure**

  -----------------------------------------------------------------------------
  **File / Module**           **Responsibility**
  --------------------------- -------------------------------------------------
  sap-integration.module.ts   NestJS module that registers all SAP services,
                              configures HTTP client with SAP OAuth2 client
                              credentials, and sets up BullMQ queues for async
                              SAP calls

  sap-auth.service.ts         Manages SAP OAuth2 token lifecycle; caches access
                              tokens with 5-minute buffer before expiry;
                              handles token refresh; throws SapAuthException on
                              failure

  sap-hcm.service.ts          Handles all SAP HCM integrations: employee sync,
                              training completions, leave data, payroll rates

  sap-mm.service.ts           Handles all SAP MM integrations: item master
                              sync, vendor master, purchase order mirroring,
                              GRN posting

  sap-fico.service.ts         Handles all SAP FICO integrations: GL posting
                              from job cost lines, cost centre updates, budget
                              commitment sync

  sap-pm.service.ts           Handles all SAP PM integrations: equipment master
                              sync, maintenance order creation/closure, PM plan
                              synchronisation

  sap-idoc.service.ts         Processes IDoc file generation and parsing for
                              legacy SAP ECC environments; handles ORDERS05,
                              MBGMCR02, HRMD_A

  sap-event.listener.ts       NestJS EventEmitter listener that subscribes to
                              WCP internal events and triggers the appropriate
                              SAP service call

  sap-sync.job.ts             BullMQ job processor for batch synchronisation
                              tasks (item master full sync, payroll rate
                              refresh)

  sap-integration.config.ts   Configuration schema: SAP base URL, client
                              ID/secret, system ID, target client, business
                              system ID for IDocs
  -----------------------------------------------------------------------------

**21.2 SAP HCM --- Employee Sync Interface**

  ------------------------------------------------------------------------------------------------
  **Interface        **Specification**
  Detail**           
  ------------------ -----------------------------------------------------------------------------
  SAP API Used       SAP S/4HANA OData API: /sap/opu/odata/sap/API_EMPLOYEE_SRV

  Endpoint           GET /A_WorkAgreement?\$filter=BusinessPartnerPerson eq
                     \'{employeeId}\'&\$expand=to_PersonWorkAgreementLeave,to_PersonCompensation

  Trigger            Scheduled BullMQ job runs daily at 01:00; also triggered on WCP user creation
                     event to fetch initial employee data

  Fields Mapped      EmployeeID → wcpEmployeeId; PersonFullName → name; CompanyCode → workshopId
                     mapping; CostCenter → departmentId; PayGrade → gradeCode for payroll rate
                     lookup; EmploymentStatus → isActive; ContractType → contractType
                     (PERMANENT/CONTRACT)

  Payroll Rate       GET /A_EmployeeCompensation --- retrieves hourly rate per grade; stored in
                     employee_grades table; used by WCP labour cost engine at time of job card
                     closure

  Leave Data         GET /A_TimeAccountBalance --- fetches approved leave periods; synced to
                     wcp_leave_calendar table daily; PM capacity planning engine reads this table

  Error Handling     On SAP API failure: log to integration_errors table with payload; retry 3
                     times with exponential backoff (30s, 2min, 10min); after 3 failures alert
                     integration admin via email

  Conflict Rule      SAP HCM always wins; WCP employee record updated unconditionally on sync;
                     WCP-only fields (riskLevel, deviceIds) never overwritten by SAP sync
  ------------------------------------------------------------------------------------------------

**21.3 SAP MM --- GRN Posting Interface**

  -----------------------------------------------------------------------
  **Interface        **Specification**
  Detail**           
  ------------------ ----------------------------------------------------
  SAP API Used       SAP S/4HANA OData API:
                     /sap/opu/odata/sap/API_MATERIAL_DOCUMENT_SRV

  Endpoint           POST /A_MaterialDocumentHeader --- creates a goods
                     receipt posting (equivalent to MIGO transaction)

  Trigger            WCP internal event: grn.confirmed --- fired when GRN
                     moves to CONFIRMED status after 2-person
                     verification

  Request Body       { GoodsMovementCode: \'01\', DocumentDate: grnDate,
                     PostingDate: grnDate, GoodsMovementType: \'101\' (GR
                     against PO), items: \[ { Material: itemCode, Plant:
                     workshopPlant, StorageLocation: storeCode, Batch:
                     batchNumber, Quantity: receivedQty, BaseUnit:
                     unitOfMeasure, PurchaseOrder: poNumber,
                     PurchaseOrderItem: poLineNumber } \] }

  Response Handling  On success: SAP material document number stored in
                     grn_headers.sapDocumentNumber; GRN status remains
                     CONFIRMED; stock update in SAP MM triggers callback
                     to WCP (if configured) or WCP reads updated stock on
                     next sync cycle

  On SAP Posting     WCP GRN stays in CONFIRMED status locally;
  Failure            integration error logged; manual reconciliation
                     alert sent to finance; retry queue processes every
                     15 minutes for up to 24 hours

  IDoc Alternative   For SAP ECC: sap-idoc.service generates MBGMCR02
                     IDoc; places in outbound IDoc folder; SAP picks up
                     via file-based interface; acknowledgement IDoc
                     (MBGMCR02 response) processed by WCP IDoc listener
  -----------------------------------------------------------------------

**21.4 SAP FICO --- Job Cost Posting Interface**

  -----------------------------------------------------------------------
  **Interface        **Specification**
  Detail**           
  ------------------ ----------------------------------------------------
  SAP API Used       SAP S/4HANA OData API:
                     /sap/opu/odata/sap/API_JOURNALENTRYITEMBASIC_SRV
                     (Journal Entry posting)

  Endpoint           POST /A_JournalEntry --- creates FI journal entry
                     for job card cost

  Trigger            WCP internal event: jobcard.closed --- fired when JC
                     moves to CLOSED status after supervisor sign-off

  GL Account Mapping Parts cost → maintenance materials GL account;
                     Labour cost → workshop labour GL account; External
                     repairs → subcontract cost GL account; Overhead →
                     overhead absorption GL account. Mapping table stored
                     in sap_gl_account_mapping table in WCP.

  Cost Centre        Derived from JC departmentId → mapped to SAP CO cost
                     centre code via cost_centre_mapping table

  Journal Entry      Debit: GL account for each cost type; amount = line
  Structure          total; cost centre = workshop cost centre. Credit:
                     Inventory clearing account (for parts); Payroll
                     clearing account (for labour). Internal order used
                     for MODIFICATION type JCs linked to SAP IM
                     investment orders.

  Warranty JC        jcType = WARRANTY: no FI posting from WCP; supplier
  Handling           warranty claim tracked separately; zero cost posted
                     to cost centre

  Budget Check       Before posting: GET /A_CostCenterActyCost to read
  Before Posting     current CO cost centre balance; if posting would
                     exceed budget, hold posting and alert finance
                     manager

  Response           On success: SAP accounting document number stored in
                     job_cards.sapAccountingDocNumber; On failure:
                     posting queued for manual review; JC closure is NOT
                     blocked by SAP posting failure --- WCP records are
                     always the execution system of record
  -----------------------------------------------------------------------

**21.5 SAP PM --- Maintenance Order Sync Interface**

  --------------------------------------------------------------------------------------
  **Interface        **Specification**
  Detail**           
  ------------------ -------------------------------------------------------------------
  SAP API Used       SAP S/4HANA OData API: /sap/opu/odata/sap/API_MAINTORDER_SRV

  Create Endpoint    POST /MaintenanceOrder --- mirrors WCP PREVENTIVE job cards as SAP
                     PM planned orders

  Complete Endpoint  PATCH
                     /MaintenanceOrder(\'{orderNumber}\')/to_MaintenanceOrderOperation
                     --- updates operation status to COMPLETED

  Equipment Sync     GET /A_Equipment --- reads SAP PM equipment master; maps to WCP
                     assets table by equipment number; updates assetSapEquipmentNumber
                     field

  Trigger for Create WCP internal event: jobcard.approved where jcType = PREVENTIVE ---
                     creates SAP PM order; SAP order number stored in
                     job_cards.sapPmOrderNumber

  Trigger for        WCP internal event: jobcard.closed --- updates SAP PM order to
  Complete           technically completed; triggers SAP cost settlement run

  Meter Reading Sync On JC closure: POST to /A_MaintOrderMeasuringPoint --- records hour
                     meter or KM reading back to SAP PM equipment counter; keeps SAP PM
                     maintenance plans current for future PM trigger calculation

  IoT Trigger        SAP BTP IoT sensor breach event → SAP Integration Suite → HTTP POST
  Inbound            to WCP /webhooks/sap/iot-alert endpoint; WCP creates CORRECTIVE
                     EMERGENCY JC automatically; sends push notification to workshop
                     supervisor
  --------------------------------------------------------------------------------------

**21.6 SAP Training Completion Sync --- HCM Interface**

  -----------------------------------------------------------------------
  **Interface        **Specification**
  Detail**           
  ------------------ ----------------------------------------------------
  SAP API Used       SAP SuccessFactors Learning OData API:
                     /learning/odatav4/restricted/getCompletedItems

  Trigger            Scheduled BullMQ job daily at 02:30; also triggered
                     by WCP webhook if SAP SuccessFactors is configured
                     to push completion events

  Fields Mapped      userId → wcpEmployeeId; courseId →
                     trainingCourseCode; completionDate → completedAt;
                     expiryDate → expiresAt; certificateUrl →
                     certificateStorageUrl

  Effect in WCP      On new completion record: INSERT into
                     training_completions table; if item has an
                     associated skill_certification record, update
                     employee_skill_certifications with new expiry date;
                     BullMQ job checks all pending JC task assignments
                     --- if a technician just gained a skill they were
                     previously blocked on, supervisor is notified

  Expiry Enforcement Daily BullMQ job scans employee_skill_certifications
                     for expiresAt \< (today + 30 days); sends reminder
                     to employee and supervisor; on expiry date,
                     certification marked EXPIRED; technician blocked
                     from new assignments of that task type in WCP
  -----------------------------------------------------------------------

**21.7 Integration Error Handling & Retry Strategy**

  ------------------------------------------------------------------------
  **Error Type**   **Retry Strategy**          **Escalation**
  ---------------- --------------------------- ---------------------------
  SAP OAuth2 token Auto-refresh before every   If refresh fails 3 times:
  expired          API call; no retry needed   alert integration admin;
                   --- handled transparently   queue all SAP calls as
                   by sap-auth.service.ts      PENDING_AUTH

  SAP API 429 Too  Respect Retry-After header; After 5 retries: mark as
  Many Requests    exponential backoff: 1min → FAILED; alert integration
                   5min → 30min; max 5 retries admin; daily digest of
                                               failed calls

  SAP API 5xx      Retry 3 times: 30s → 2min → Email alert to integration
  Server Error     10min; after 3 failures     admin with full
                   queue for manual review     request/response payload;
                                               dashboard counter
                                               increments

  SAP API 4xx      No retry --- client error   Alert to WCP development
  Client Error     means WCP sent invalid      team with payload for
                   data; log to                investigation; not retried
                   integration_errors with     automatically
                   MAPPING_ERROR status        

  IDoc             File-based retry: renames   After 6 retry cycles (30
  transmission     file with .retry extension; min): move to .error
  failure          SAP interface program       folder; alert SAP basis
                   retries on next polling     team and WCP integration
                   cycle (every 5 min)         admin

  Network timeout  2 retries with 15-second    After queued retry fails:
                   timeout each; if both fail, FAILED status; alert; WCP
                   queue as TIMEOUT_RETRY for  operation that triggered
                   processing after 5 minutes  SAP call proceeds normally
                                               (SAP integration is
                                               non-blocking)
  ------------------------------------------------------------------------

**21.8 Integration Events Map --- WCP to SAP**

  ----------------------------------------------------------------------------------
  **WCP Internal Event**         **SAP Action          **SAP        **Async or
                                 Triggered**           Module**     Sync**
  ------------------------------ --------------------- ------------ ----------------
  jobcard.approved (PREVENTIVE)  Create PM Maintenance SAP PM       Async (BullMQ)
                                 Order                              

  jobcard.closed                 Post FI Journal Entry SAP FICO     Async (BullMQ)
                                 for job costs                      

  jobcard.closed                 Complete PM           SAP PM       Async (BullMQ)
                                 Maintenance Order +                
                                 record meter reading               

  grn.confirmed                  Post Material         SAP MM       Async (BullMQ)
                                 Document (Goods                    
                                 Receipt against PO)                

  purchaseorder.approved (HO     Create Purchase Order SAP MM       Async (BullMQ)
  channel)                       in SAP MM                          

  invoice.approved_for_payment   Create Invoice        SAP MM /     Async (BullMQ)
                                 Verification document FI-AP        
                                 (MIRO equivalent)                  

  employee.created (new user in  Fetch employee master SAP HCM      Sync (on-demand)
  WCP)                           from SAP HCM to                    
                                 populate profile                   

  training.gate_failed           Fetch latest training SAP HCM /    Sync (on-demand)
                                 completions for       LMS          
                                 employee from                      
                                 SuccessFactors                     

  asset.meter_updated            Update Equipment      SAP PM       Async (BullMQ)
                                 Counter Reading in                 
                                 SAP PM                             

  stock.integrity_check_failed   Post stock adjustment SAP MM       Async (manual
                                 after manual                       trigger)
                                 reconciliation                     
                                 approval                           

  Inbound: SAP IoT alert webhook Create CORRECTIVE     SAP BTP IoT  Sync (webhook)
                                 EMERGENCY Job Card in → WCP        
                                 WCP                                

  Inbound: SAP HCM leave         Update WCP leave      SAP HCM →    Async (event
  approved                       calendar; re-check PM WCP          push)
                                 capacity for affected              
                                 period                             
  ----------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **WORKSHOP CONTROL PLATFORM --- SUPER MASTER PLAN**                   |
|                                                                       |
| React 18 + NestJS 10 + PostgreSQL 15 + Redis \| SAP HCM/MM/FICO/PM    |
| Integration \| 21 Sections \| Frontend + Backend + Database + API     |
| Payloads + Integration Code \| Confidential                           |
+-----------------------------------------------------------------------+

🏭

**WORKSHOP CONTROL PLATFORM**

**SUPER MASTER PLAN**

**GAP FILL SUPPLEMENT**

Filling All 22 Identified Gaps Across 4 Priority Levels

Version 1.0 · February 2026

  ------------------------------------------------------------------------
  **Priority Level**         **Gaps**        **Sections**
  -------------------------- --------------- -----------------------------
  CRITICAL                   5               GAP-01 to GAP-05

  SIGNIFICANT                6               GAP-06 to GAP-11

  MODERATE                   7               GAP-12 to GAP-18

  MINOR                      4               GAP-19 to GAP-22

  TOTAL                      22              Complete Supplement
  ------------------------------------------------------------------------

  ------------ --------------- --------------------------------------------
  **GAP-01**   **CRITICAL**    **STATUS: FILLED**

  ------------ --------------- --------------------------------------------

**GAP-01: Fuel & Lubricant Module --- Complete Design**

The Fuel & Lubricant Module is a high-fraud-risk area that requires the
same depth of design as the Material Issue module. It governs all fuel
dispensing events, lubricant top-ups, tank dip reconciliation, and
abnormal consumption detection across all fleet assets.

**1.1 Fuel Issue State Machine**

  -----------------------------------------------------------------------------
  **State**          **Description**       **Allowed             **Who Can
                                           Transitions**         Trigger**
  ------------------ --------------------- --------------------- --------------
  PENDING            Driver/operator       APPROVED, REJECTED,   Driver,
                     requests fuel via     CANCELLED             Supervisor
                     mobile app                                  

  APPROVED           Supervisor approved   DISPENSING, CANCELLED Supervisor
                     the fuel request                            

  DISPENSING         Fuel pump attendant   COMPLETED,            Pump Attendant
                     is actively           VARIANCE_FLAGGED      
                     dispensing                                  

  COMPLETED          Fuel dispensed, meter ABNORMAL_REVIEW       System
                     reading recorded,     (auto)                (auto-close)
                     receipt signed                              

  VARIANCE_FLAGGED   Actual vs expected    RESOLVED, ESCALATED   Supervisor, HO
                     consumption exceeds                         Admin
                     threshold                                   

  ABNORMAL_REVIEW    Background job        RESOLVED,             Fleet Manager
                     detected abnormal     INVESTIGATION         
                     consumption pattern                         

  INVESTIGATION      Formal investigation  RESOLVED,             Fleet Manager,
                     opened by Fleet       DISCIPLINARY          HO
                     Manager                                     

  RESOLVED           Investigation closed  Terminal              Fleet Manager,
                     with explanation                            HO
                     recorded                                    

  REJECTED           Fuel request rejected Terminal              Supervisor
                     by supervisor                               

  CANCELLED          Cancelled before      Terminal              Driver,
                     dispensing began                            Supervisor
  -----------------------------------------------------------------------------

**1.2 Abnormal Consumption Detection Algorithm**

The system computes Expected Fuel Consumption (EFC) for each asset and
flags any transaction where actual consumption deviates beyond the
configured threshold.

**1.2.1 EFC Calculation Formula**

+-----------------------------------------------------------------------+
| // For vehicles measured by KM:                                       |
|                                                                       |
| EFC_litres = (km_driven / baseline_km_per_litre)                      |
|                                                                       |
| // For equipment measured by hours:                                   |
|                                                                       |
| EFC_litres = (hours_operated × baseline_litres_per_hour)              |
|                                                                       |
| // Variance percentage:                                               |
|                                                                       |
| variance_pct = ((actual_litres - EFC_litres) / EFC_litres) × 100      |
|                                                                       |
| // Threshold triggers:                                                |
|                                                                       |
| // AMBER flag: variance_pct \> 15% (configurable per asset category)  |
|                                                                       |
| // RED flag: variance_pct \> 30% (configurable per asset category)    |
|                                                                       |
| // AUTO-BLOCK: variance_pct \> 50% --- blocks next dispensing pending |
| review                                                                |
+-----------------------------------------------------------------------+

**1.2.2 Baseline Establishment Rules**

-   New asset: uses asset category average for first 3 fuel transactions

-   Established asset: rolling 90-day average of last 20 completed fuel
    transactions

-   Seasonal adjustment: system stores separate summer/winter baselines
    if climate flag is enabled

-   Manual override: Fleet Manager can set a fixed baseline, logged to
    audit trail

**1.3 Fuel Tank Dip Reconciliation Process**

A physical dip measurement of the fuel tank is required at the start and
end of each shift. The system reconciles: opening dip + deliveries
received − issues dispensed = expected closing dip. Any deviation beyond
±50 litres triggers a reconciliation alert.

  ------------------------------------------------------------------------------
  **Step**   **Actor**     **Action**             **System Response**
  ---------- ------------- ---------------------- ------------------------------
  1          Pump          Record opening dip via System stores
             Attendant     mobile app (photo      opening_dip_litres, photo EXIF
                           required)              validated

  2          System        Pull all GRN           Adds delivery_litres to
                           deliveries to tank     running balance
                           since last closing dip 

  3          System        Sum all completed fuel Subtracts total_issued_litres
                           issues during shift    from balance

  4          Pump          Record closing dip at  System stores
             Attendant     shift end (photo       closing_dip_litres
                           required)              

  5          System        Compute variance =     If \|variance\| \> 50L →
                           closing_dip −          DIP_VARIANCE alert to
                           (opening + deliveries  Supervisor
                           − issues)              

  6          Supervisor    Review and add         Explanation stored; if
                           explanation or         unresolved after 24h → Fleet
                           escalate               Manager notified
  ------------------------------------------------------------------------------

**1.4 Meter Override Approval Workflow**

Fuel pump meter readings cannot be manually overridden without a
two-person approval. This prevents meter manipulation fraud.

Attendant submits override request with reason and supporting photo
evidence

Request routes to Supervisor --- must approve or reject within 2 hours

Supervisor approval routes to Fleet Manager for final sign-off if
override value exceeds 100 litres

All override events are written to the immutable audit log with both
approver IDs and timestamps

Three overrides in a 30-day rolling window triggers automatic escalation
to HO Fleet Admin

**1.5 Lubricant Sub-Flow**

Lubricant management follows a lighter variant of the fuel issue flow.
Lubricants are consumed in smaller volumes and are tracked at the
service job level.

  ---------------------------------------------------------------------------
  **Field**            **Type**   **Rule**
  -------------------- ---------- -------------------------------------------
  lubricant_type       Enum       ENGINE_OIL, GEARBOX_OIL, GREASE,
                                  HYDRAULIC_FLUID, COOLANT, BRAKE_FLUID

  quantity_litres      Decimal    Must be \> 0; max 50L per single issue

  job_card_id          UUID FK    Required --- lubricant issue must link to a
                                  job card

  asset_odometer_km    Integer    Mandatory for engine oil; triggers service
                                  reminder update

  next_oil_change_km   Integer    Computed: current_km +
                                  asset.oil_change_interval_km

  issued_by            UUID FK    Pump attendant who issued the lubricant

  verified_by          UUID FK    Supervisor or technician who verified the
                                  quantity
  ---------------------------------------------------------------------------

**1.6 Prisma Schema --- Fuel Module**

+-----------------------------------------------------------------------+
| model FuelTank {                                                      |
|                                                                       |
| id String \@id \@default(uuid())                                      |
|                                                                       |
| workshop_id String                                                    |
|                                                                       |
| name String // \"Main Diesel Tank\", \"Workshop 2 Petrol\"            |
|                                                                       |
| fuel_type FuelType                                                    |
|                                                                       |
| capacity_litres Decimal                                               |
|                                                                       |
| current_litres Decimal // Updated on every issue/delivery             |
|                                                                       |
| low_level_alert Decimal // Alert when stock falls below this          |
|                                                                       |
| created_at DateTime \@default(now())                                  |
|                                                                       |
| updated_at DateTime \@updatedAt                                       |
|                                                                       |
| tank_issues FuelIssue\[\]                                             |
|                                                                       |
| dip_records TankDipRecord\[\]                                         |
|                                                                       |
| }                                                                     |
|                                                                       |
| model FuelIssue {                                                     |
|                                                                       |
| id String \@id \@default(uuid())                                      |
|                                                                       |
| issue_number String \@unique // FI-2024-0001                          |
|                                                                       |
| fuel_tank_id String                                                   |
|                                                                       |
| asset_id String                                                       |
|                                                                       |
| job_card_id String?                                                   |
|                                                                       |
| state FuelIssueState \@default(PENDING)                               |
|                                                                       |
| fuel_type FuelType                                                    |
|                                                                       |
| requested_litres Decimal                                              |
|                                                                       |
| approved_litres Decimal?                                              |
|                                                                       |
| actual_litres Decimal?                                                |
|                                                                       |
| meter_reading_before Decimal? // Pump meter before dispensing         |
|                                                                       |
| meter_reading_after Decimal? // Pump meter after dispensing           |
|                                                                       |
| odometer_km Int? // Asset odometer at time of issue                   |
|                                                                       |
| hours_reading Decimal? // Asset hours meter if applicable             |
|                                                                       |
| efc_litres Decimal? // Expected fuel consumption (computed)           |
|                                                                       |
| variance_pct Decimal? // Computed: actual vs EFC                      |
|                                                                       |
| variance_flag VarFlag? // AMBER, RED, or null                         |
|                                                                       |
| attendant_id String                                                   |
|                                                                       |
| approved_by String?                                                   |
|                                                                       |
| receipt_photo_url String?                                             |
|                                                                       |
| created_at DateTime \@default(now())                                  |
|                                                                       |
| updated_at DateTime \@updatedAt                                       |
|                                                                       |
| workshop_id String                                                    |
|                                                                       |
| abnormal_detections AbnormalConsumptionDetection\[\]                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| model AbnormalConsumptionDetection {                                  |
|                                                                       |
| id String \@id \@default(uuid())                                      |
|                                                                       |
| fuel_issue_id String                                                  |
|                                                                       |
| asset_id String                                                       |
|                                                                       |
| detection_type String // SINGLE_EVENT \| PATTERN_ROLLING_30 \|        |
| TANK_DIP_VARIANCE                                                     |
|                                                                       |
| variance_pct Decimal                                                  |
|                                                                       |
| threshold_pct Decimal // The configured threshold at time of          |
| detection                                                             |
|                                                                       |
| baseline_used Decimal // Litres/100km or L/hr used in calculation     |
|                                                                       |
| flag_level VarFlag // AMBER or RED                                    |
|                                                                       |
| status String \@default(\"OPEN\") // OPEN \| RESOLVED \|              |
| INVESTIGATION                                                         |
|                                                                       |
| resolved_by String?                                                   |
|                                                                       |
| resolution_notes String?                                              |
|                                                                       |
| created_at DateTime \@default(now())                                  |
|                                                                       |
| resolved_at DateTime?                                                 |
|                                                                       |
| }                                                                     |
|                                                                       |
| model TankDipRecord {                                                 |
|                                                                       |
| id String \@id \@default(uuid())                                      |
|                                                                       |
| tank_id String                                                        |
|                                                                       |
| dip_type String // OPENING \| CLOSING \| AD_HOC                       |
|                                                                       |
| dip_litres Decimal                                                    |
|                                                                       |
| photo_url String                                                      |
|                                                                       |
| recorded_by String                                                    |
|                                                                       |
| shift_date DateTime                                                   |
|                                                                       |
| created_at DateTime \@default(now())                                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| enum FuelType { DIESEL PETROL_95 PETROL_93 AVGAS LPG HYDROGEN }       |
|                                                                       |
| enum FuelIssueState { PENDING APPROVED DISPENSING COMPLETED           |
| VARIANCE_FLAGGED ABNORMAL_REVIEW INVESTIGATION RESOLVED REJECTED      |
| CANCELLED }                                                           |
|                                                                       |
| enum VarFlag { AMBER RED }                                            |
+-----------------------------------------------------------------------+

**1.7 Fuel Module API Endpoints**

  --------------------------------------------------------------------------------------------------
  **Method**   **Endpoint**                              **Description**           **Auth**
  ------------ ----------------------------------------- ------------------------- -----------------
  POST         /fuel-issues                              Create fuel issue request Driver

  PATCH        /fuel-issues/:id/approve                  Supervisor approves       Supervisor
                                                         request                   

  PATCH        /fuel-issues/:id/dispense                 Record meter readings +   Attendant
                                                         actual litres             

  PATCH        /fuel-issues/:id/complete                 Complete issue, trigger   Attendant
                                                         EFC check                 

  GET          /fuel-issues                              List issues with filters  Supervisor+

  GET          /fuel-issues/:id                          Get issue detail with     Any
                                                         variance data             

  GET          /fuel-tanks                               List tanks with current   Supervisor+
                                                         levels                    

  POST         /tank-dips                                Record opening/closing    Attendant
                                                         dip                       

  GET          /abnormal-detections                      List all abnormal events  Fleet Manager+

  PATCH        /abnormal-detections/:id/resolve          Resolve with explanation  Fleet Manager

  POST         /fuel-issues/:id/meter-override           Submit meter override     Attendant
                                                         request                   

  PATCH        /fuel-issues/:id/meter-override/approve   Approve meter override    Supervisor +
                                                         (2-person)                Fleet Mgr
  --------------------------------------------------------------------------------------------------

  ------------ --------------- --------------------------------------------
  **GAP-02**   **CRITICAL**    **STATUS: FILLED**

  ------------ --------------- --------------------------------------------

**GAP-02: Labour Management Module --- Complete Design**

The Labour Management Module governs how technicians are assigned to job
tasks, how their time is recorded, how overtime is approved, and how
skill compliance is enforced before any assignment is made.

**2.1 Labour Assignment Workflow**

  ------------------------------------------------------------------------------
  **Step**   **Actor**     **Action**            **System Check**
  ---------- ------------- --------------------- -------------------------------
  1          Supervisor    Open Job Card → Add   Job card must be in OPEN or
                           Labour Assignment     IN_PROGRESS state

  2          System        Display eligible      Filter by: skill match,
                           technicians for task  availability, workshop, active
                           category              shift

  3          Supervisor    Select technician and System validates: required
                           task                  skills met + no active
                                                 conflicting assignment

  4          System        Create assignment in  Notification pushed to
                           ASSIGNED state        technician mobile device

  5          Technician    Tap \"Start Work\" on System records clock_in_at,
                           mobile                transitions assignment to
                                                 IN_PROGRESS

  6          Technician    Tap \"Pause\" (break, System records pause event;
                           waiting for parts)    assignment moves to PAUSED

  7          Technician    Tap \"Resume\"        System records resume event;
                                                 running time resumes

  8          Technician    Tap \"Complete\"      System records clock_out_at;
                                                 computes total_minutes

  9          Supervisor    Review and sign off   Supervisor can adjust time
                           labour entry          within ±15 min with reason
                                                 logged

  10         System        Compute labour cost = Posted as cost line to parent
                           total_hours ×         job card
                           hourly_rate           
  ------------------------------------------------------------------------------

**2.2 Skill Matrix Design**

Each technician has a skill profile. Each job task category has required
skills. Assignment is blocked if the technician\'s skill profile does
not meet the task requirements.

**2.2.1 Skill Definition Structure**

+-----------------------------------------------------------------------+
| Skill {                                                               |
|                                                                       |
| code: \"HVAC-L2\" // Unique skill code                                |
|                                                                       |
| name: \"HVAC Technician Level 2\"                                     |
|                                                                       |
| category: \"ELECTRICAL\" // MECHANICAL \| ELECTRICAL \| HYDRAULIC \|  |
| WELDING \| BODY                                                       |
|                                                                       |
| level: 2 // 1=Basic, 2=Intermediate, 3=Advanced, 4=Expert             |
|                                                                       |
| expires: true // Does this skill expire?                              |
|                                                                       |
| validity_days: 730 // 2 years                                         |
|                                                                       |
| certifying_body: \"OEM Training Centre\"                              |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

**2.2.2 Technician Skill Record**

+-----------------------------------------------------------------------+
| TechnicianSkill {                                                     |
|                                                                       |
| employee_id: \"EMP-001\"                                              |
|                                                                       |
| skill_code: \"HVAC-L2\"                                               |
|                                                                       |
| status: \"ACTIVE\" // ACTIVE \| EXPIRED \| SUSPENDED                  |
|                                                                       |
| awarded_date: \"2023-06-01\"                                          |
|                                                                       |
| expiry_date: \"2025-06-01\"                                           |
|                                                                       |
| certificate_url: \"s3://wcp-docs/certs/EMP001-HVAC-L2.pdf\"           |
|                                                                       |
| awarded_by: \"UUID of training record\"                               |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

**2.2.3 Training Gate Enforcement Logic**

When a supervisor attempts to assign a technician to a task:

System queries task_category.required_skills (array of skill codes)

For each required skill, system checks TechnicianSkill where employee_id
= technician AND skill_code = required AND status = ACTIVE AND
expiry_date \> NOW()

If any required skill is MISSING or EXPIRED, assignment is BLOCKED with
reason displayed

Supervisor cannot override a skill block --- exception: EMERGENCY job
cards allow override with mandatory reason logged to audit trail, and a
notification sent to HR within 1 hour

Skills expiring within 30 days show a YELLOW warning on the assignment
screen (not a block)

**2.3 Overtime Approval Process**

  -------------------------------------------------------------------------
  **Scenario**     **Threshold**   **Approval         **SLA**
                                   Required**         
  ---------------- --------------- ------------------ ---------------------
  Standard daily   ≤ 8 hrs/day     None               N/A
  hours                                               

  Overtime ---     8--10 hrs/day   Supervisor         30 min
  Level 1                                             

  Overtime ---     10--12 hrs/day  Supervisor +       1 hour
  Level 2                          Workshop Manager   

  Overtime ---     \>12 hrs/day    Workshop Manager + 2 hours
  Level 3                          HO HR              

  Rest day work    Any hours       Workshop Manager + 24 hrs prior
                                   HO HR              

  Public holiday   Any hours       HO HR Director     48 hrs prior
  work                                                
  -------------------------------------------------------------------------

**2.4 Labour Utilisation Reports**

-   Daily Technician Utilisation: hours billed vs hours clocked-in per
    technician

-   Workshop Labour Efficiency: total productive hours / total available
    hours × 100

-   Job Card Labour Cost Analysis: planned vs actual hours per job card

-   Overtime Trend Report: 4-week rolling overtime per technician with
    approver breakdown

-   Skill Expiry Report: technicians with skills expiring in next 90
    days

**2.5 Prisma Schema --- Labour Module**

+-----------------------------------------------------------------------+
| model LabourAssignment {                                              |
|                                                                       |
| id String \@id \@default(uuid())                                      |
|                                                                       |
| assignment_number String \@unique // LA-2024-0001                     |
|                                                                       |
| job_card_id String                                                    |
|                                                                       |
| job_task_id String                                                    |
|                                                                       |
| employee_id String                                                    |
|                                                                       |
| state LabourState \@default(ASSIGNED)                                 |
|                                                                       |
| planned_hours Decimal?                                                |
|                                                                       |
| clock_in_at DateTime?                                                 |
|                                                                       |
| clock_out_at DateTime?                                                |
|                                                                       |
| total_minutes Int? // Computed, excludes pauses                       |
|                                                                       |
| overtime_minutes Int? \@default(0)                                    |
|                                                                       |
| overtime_approved Boolean \@default(false)                            |
|                                                                       |
| overtime_approver String?                                             |
|                                                                       |
| hourly_rate Decimal? // Snapshotted at assignment time                |
|                                                                       |
| labour_cost Decimal? // total_minutes/60 × hourly_rate                |
|                                                                       |
| supervisor_notes String?                                              |
|                                                                       |
| created_at DateTime \@default(now())                                  |
|                                                                       |
| updated_at DateTime \@updatedAt                                       |
|                                                                       |
| pause_events LabourPauseEvent\[\]                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| model LabourPauseEvent {                                              |
|                                                                       |
| id String \@id \@default(uuid())                                      |
|                                                                       |
| assignment_id String                                                  |
|                                                                       |
| pause_reason String // WAITING_PARTS \| BREAK \| MEETING \| OTHER     |
|                                                                       |
| paused_at DateTime                                                    |
|                                                                       |
| resumed_at DateTime?                                                  |
|                                                                       |
| duration_minutes Int? // Computed on resume                           |
|                                                                       |
| }                                                                     |
|                                                                       |
| model TechnicianSkill {                                               |
|                                                                       |
| id String \@id \@default(uuid())                                      |
|                                                                       |
| employee_id String                                                    |
|                                                                       |
| skill_id String                                                       |
|                                                                       |
| status SkillStatus \@default(ACTIVE)                                  |
|                                                                       |
| awarded_date DateTime                                                 |
|                                                                       |
| expiry_date DateTime?                                                 |
|                                                                       |
| certificate_url String?                                               |
|                                                                       |
| training_ref String?                                                  |
|                                                                       |
| created_at DateTime \@default(now())                                  |
|                                                                       |
| @@unique(\[employee_id, skill_id\])                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| model Skill {                                                         |
|                                                                       |
| id String \@id \@default(uuid())                                      |
|                                                                       |
| code String \@unique                                                  |
|                                                                       |
| name String                                                           |
|                                                                       |
| category String                                                       |
|                                                                       |
| level Int                                                             |
|                                                                       |
| expires Boolean \@default(false)                                      |
|                                                                       |
| validity_days Int?                                                    |
|                                                                       |
| certifying_body String?                                               |
|                                                                       |
| task_requirements TaskRequiredSkill\[\]                               |
|                                                                       |
| technician_skills TechnicianSkill\[\]                                 |
|                                                                       |
| }                                                                     |
|                                                                       |
| enum LabourState { ASSIGNED IN_PROGRESS PAUSED COMPLETED CANCELLED }  |
|                                                                       |
| enum SkillStatus { ACTIVE EXPIRED SUSPENDED }                         |
+-----------------------------------------------------------------------+

  ------------ --------------- --------------------------------------------
  **GAP-03**   **CRITICAL**    **STATUS: FILLED**

  ------------ --------------- --------------------------------------------

**GAP-03: Preventive Maintenance Module --- Complete Design**

The Preventive Maintenance (PM) Module automates the scheduling,
dispatch, and tracking of all planned maintenance activities based on
calendar intervals, kilometre meters, or hour meters.

**3.1 PM Trigger Types --- Which Fires First Logic**

Each PM schedule can have up to three concurrent triggers. The system
fires whichever trigger condition is met first (OR logic between trigger
types).

  ------------------------------------------------------------------------
  **Trigger     **Basis**    **How Measured**       **Example**
  Type**                                            
  ------------- ------------ ---------------------- ----------------------
  CALENDAR      Fixed date   System clock; schedule Every 90 days
                interval     date computed at       regardless of usage
                             creation               

  KM_METER      Odometer     Asset odometer updated Every 5,000 km
                reading      on each fuel issue or  
                             manual entry           

  HOUR_METER    Engine hours Asset hours counter    Every 250 hours
                             updated on each fuel   
                             issue or manual entry  
  ------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| // PM Due Date Computation (runs nightly via BullMQ):                 |
|                                                                       |
| for each asset_pm_schedule where status = ACTIVE:                     |
|                                                                       |
| due_by_calendar = schedule.last_completed_at +                        |
| schedule.calendar_interval_days                                       |
|                                                                       |
| due_by_km = schedule.last_completed_odometer + schedule.km_interval   |
|                                                                       |
| due_by_hours = schedule.last_completed_hours + schedule.hour_interval |
|                                                                       |
| // Compute km/days and hours/days from rolling 30-day avg usage:      |
|                                                                       |
| days_to_km_due = (due_by_km - asset.current_odometer) /               |
| asset.avg_km_per_day                                                  |
|                                                                       |
| days_to_hr_due = (due_by_hours - asset.current_hours) /               |
| asset.avg_hours_per_day                                               |
|                                                                       |
| next_due_date = min(due_by_calendar, now + days_to_km_due, now +      |
| days_to_hr_due)                                                       |
|                                                                       |
| if next_due_date \<= now + 14 days: // 2-week advance warning         |
|                                                                       |
| create PM_UPCOMING notification to supervisor                         |
|                                                                       |
| if next_due_date \<= now:                                             |
|                                                                       |
| create PM_OVERDUE alert; block asset from new JC assignment           |
| (configurable)                                                        |
+-----------------------------------------------------------------------+

**3.2 PM Schedule Creation and Management**

  ---------------------------------------------------------------------------------
  **Field**                **Type**   **Rule**
  ------------------------ ---------- ---------------------------------------------
  pm_template_id           FK         Links to PM checklist template for this
                                      service type

  asset_id /               FK         Can be asset-specific or category-wide
  asset_category_id                   

  calendar_interval_days   Int        Nullable; set for calendar-triggered PMs

  km_interval              Int        Nullable; set for distance-triggered PMs

  hour_interval            Decimal    Nullable; set for hour-triggered PMs

  lead_days                Int        How many days before due to generate the PM
                                      job card. Default: 7

  capacity_check_enabled   Boolean    If true, system checks workshop capacity
                                      before scheduling

  priority                 Enum       LOW / MEDIUM / HIGH --- affects scheduling
                                      queue position
  ---------------------------------------------------------------------------------

**3.3 Capacity Planning Logic**

Before a PM job card is generated, if capacity_check_enabled = true, the
system:

Counts all open PM and CORRECTIVE job cards at the target workshop for
the scheduled date

Computes total planned technician-hours (sum of
pm_template.estimated_hours for all open jobs)

Compares against available technician-hours = (count of available
technicians × shift_hours)

If utilisation \> 90%, PM is deferred by 1 day and the check runs again
(max deferral: lead_days − 1)

If still no capacity after max deferral, PM is created with
CAPACITY_CONSTRAINED flag and Supervisor is notified

**3.4 PM Checklist Design**

Each PM template contains a set of mandatory checklist items.
Technicians must complete all items before the PM job card can be
closed.

+-----------------------------------------------------------------------+
| PM Template: \"10,000 KM SERVICE --- LIGHT VEHICLE\"                  |
|                                                                       |
| ──────────────────────────────────────────────────                    |
|                                                                       |
| Item 1: Replace engine oil \| Type: REPLACE \| Part required: Y \|    |
| Qty: 5L                                                               |
|                                                                       |
| Item 2: Replace oil filter \| Type: REPLACE \| Part required: Y \|    |
| Qty: 1                                                                |
|                                                                       |
| Item 3: Inspect air filter \| Type: INSPECT \| Pass/Fail/Replace      |
|                                                                       |
| Item 4: Check tyre pressure \| Type: MEASURE \| Record:               |
| FR/FL/RR/RL/Spare psi                                                 |
|                                                                       |
| Item 5: Inspect brake pads \| Type: MEASURE \| Record: FL/FR/RL/RR mm |
|                                                                       |
| Item 6: Check battery voltage \| Type: MEASURE \| Record: voltage;    |
| flag \< 12.2V                                                         |
|                                                                       |
| Item 7: Inspect belts and hoses \| Type: INSPECT \| Pass/Fail/Replace |
|                                                                       |
| Item 8: Top up coolant \| Type: TOP_UP \| Part required: Y \| Qty: up |
| to 2L                                                                 |
|                                                                       |
| Item 9: Reset service indicator \| Type: ACTION \| Confirmation       |
| checkbox                                                              |
|                                                                       |
| Item 10: Road test \| Type: ACTION \| Technician signature required   |
|                                                                       |
| Completion Rule: ALL items must be PASS, COMPLETED, or REPLACED       |
| before job card close.                                                |
|                                                                       |
| If any item is FAIL, system auto-creates a CORRECTIVE child job card. |
+-----------------------------------------------------------------------+

**3.5 PM Pause / Resume / Merge Logic**

When an asset is already in the workshop for corrective work and a PM
becomes due:

-   MERGE: If the corrective job card is open, system prompts supervisor
    to merge PM work into the existing job card. Merged PM items appear
    as an additional task group. PM schedule is updated as if the PM was
    completed normally.

-   PAUSE: If the asset is unavailable (e.g., awaiting parts for
    corrective work), the PM schedule can be paused for up to 30 days.
    Overdue notifications are suppressed during pause. Reason required.

-   RESUME: When the pause expires or is manually ended, PM due date is
    recalculated and the advance warning cycle restarts.

**3.6 Prisma Schema --- PM Module**

+-----------------------------------------------------------------------+
| model PmTemplate {                                                    |
|                                                                       |
| id String \@id \@default(uuid())                                      |
|                                                                       |
| code String \@unique // PM-LV-10K                                     |
|                                                                       |
| name String                                                           |
|                                                                       |
| asset_category String                                                 |
|                                                                       |
| estimated_hours Decimal                                               |
|                                                                       |
| checklist_items PmChecklistItem\[\]                                   |
|                                                                       |
| schedules PmSchedule\[\]                                              |
|                                                                       |
| }                                                                     |
|                                                                       |
| model PmSchedule {                                                    |
|                                                                       |
| id String \@id \@default(uuid())                                      |
|                                                                       |
| asset_id String?                                                      |
|                                                                       |
| asset_category_id String?                                             |
|                                                                       |
| pm_template_id String                                                 |
|                                                                       |
| calendar_interval_days Int?                                           |
|                                                                       |
| km_interval Int?                                                      |
|                                                                       |
| hour_interval Decimal?                                                |
|                                                                       |
| lead_days Int \@default(7)                                            |
|                                                                       |
| capacity_check_enabled Boolean \@default(true)                        |
|                                                                       |
| priority Priority \@default(MEDIUM)                                   |
|                                                                       |
| status String \@default(\"ACTIVE\")                                   |
|                                                                       |
| last_completed_at DateTime?                                           |
|                                                                       |
| last_completed_odometer Int?                                          |
|                                                                       |
| last_completed_hours Decimal?                                         |
|                                                                       |
| next_due_date DateTime?                                               |
|                                                                       |
| next_due_odometer Int?                                                |
|                                                                       |
| next_due_hours Decimal?                                               |
|                                                                       |
| created_at DateTime \@default(now())                                  |
|                                                                       |
| pm_job_cards PmJobCard\[\]                                            |
|                                                                       |
| }                                                                     |
|                                                                       |
| model PmJobCard {                                                     |
|                                                                       |
| id String \@id \@default(uuid())                                      |
|                                                                       |
| pm_schedule_id String                                                 |
|                                                                       |
| job_card_id String \@unique                                           |
|                                                                       |
| trigger_type String // CALENDAR \| KM_METER \| HOUR_METER             |
|                                                                       |
| trigger_value Decimal? // The km or hours that triggered this PM      |
|                                                                       |
| status String \@default(\"PENDING\")                                  |
|                                                                       |
| merged_into_jc String? // FK to corrective JC if merged               |
|                                                                       |
| capacity_flag Boolean \@default(false)                                |
|                                                                       |
| created_at DateTime \@default(now())                                  |
|                                                                       |
| checklist_results PmChecklistResult\[\]                               |
|                                                                       |
| }                                                                     |
|                                                                       |
| model PmChecklistItem {                                               |
|                                                                       |
| id String \@id \@default(uuid())                                      |
|                                                                       |
| template_id String                                                    |
|                                                                       |
| sequence Int                                                          |
|                                                                       |
| description String                                                    |
|                                                                       |
| item_type String // REPLACE \| INSPECT \| MEASURE \| TOP_UP \| ACTION |
|                                                                       |
| requires_part Boolean \@default(false)                                |
|                                                                       |
| part_item_id String?                                                  |
|                                                                       |
| default_qty Decimal?                                                  |
|                                                                       |
| measure_unit String?                                                  |
|                                                                       |
| fail_spawns_corrective Boolean \@default(true)                        |
|                                                                       |
| }                                                                     |
|                                                                       |
| model PmChecklistResult {                                             |
|                                                                       |
| id String \@id \@default(uuid())                                      |
|                                                                       |
| pm_jc_id String                                                       |
|                                                                       |
| checklist_item_id String                                              |
|                                                                       |
| result String // PASS \| FAIL \| REPLACED \| COMPLETED \| SKIPPED     |
|                                                                       |
| measured_value Decimal?                                               |
|                                                                       |
| notes String?                                                         |
|                                                                       |
| recorded_by String                                                    |
|                                                                       |
| recorded_at DateTime \@default(now())                                 |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

  ------------ --------------- --------------------------------------------
  **GAP-04**   **CRITICAL**    **STATUS: FILLED**

  ------------ --------------- --------------------------------------------

**GAP-04: External Repairs & Subcontracting Module --- Complete Design**

The External Repairs & Subcontracting Module governs all work performed
by external vendors on WCP-managed assets. It links external repair
activities back to the parent job card, enforces quotation requirements,
and provides performance tracking for subcontractors.

**4.1 Subcontractor Registration & Approval Process**

Workshop Supervisor submits subcontractor registration request with:
company name, registration number, trade licence, tax clearance
certificate, contact details, service categories

HO Procurement reviews and verifies documents --- minimum 3 business
days

Legal/Finance checks tax compliance and blacklist status

Upon approval, subcontractor record created with status = ACTIVE and
unique vendor code assigned

Subcontractors are reviewed annually; expired documents auto-suspend the
vendor account

**4.2 External Job Card Linkage**

An External Repair record is always a child of a parent WCP job card.
The parent job card may be a CORRECTIVE, BREAKDOWN, or INSPECTION type.
The flow:

Supervisor opens parent job card and determines external repair is
required

Supervisor creates EXTERNAL_REPAIR sub-record linked to parent JC

System checks repair cost estimate against quotation threshold table
(see §4.3)

If threshold requires quotation: RFQ is created and linked to the
external repair record

Upon PO award, external repair moves to SUBCONTRACTOR_IN_PROGRESS

Subcontractor returns asset; supervisor performs inspection and
completes external repair record

All costs sync back to parent job card as EXTERNAL_LABOUR and
EXTERNAL_PARTS cost lines

**4.3 Quotation Workflow --- Minimum 3 Quotes Above Threshold**

  --------------------------------------------------------------------------
  **Estimated      **Min          **Approval         **Notes**
  Value**          Quotations**   Authority**        
  ---------------- -------------- ------------------ -----------------------
  \< R5,000        0 --- Direct   Workshop           Single quote to
  (configurable)   Award          Supervisor         document cost

  R5,000 --        3 written      Workshop Manager   Lowest price wins
  R25,000          quotes                            unless justified

  R25,001 --       3 written      HO Procurement     Evaluation committee
  R100,000         quotes         Manager            recommended

  \> R100,000      3 formal       HO Director +      Formal tender process
                   tender quotes  Board if \>R500K   mandatory
  --------------------------------------------------------------------------

**4.4 Subcontractor Performance Rating**

After each completed external repair, the Workshop Manager rates the
subcontractor across five dimensions. Ratings are stored and used for
vendor selection recommendations.

  -----------------------------------------------------------------------------
  **Dimension**      **Weight**   **Scale**   **Notes**
  ------------------ ------------ ----------- ---------------------------------
  Quality of Work    30%          1--5        Based on post-repair inspection
                                              results

  Turnaround Time    25%          1--5        Actual vs quoted delivery date

  Invoice Accuracy   20%          1--5        Final invoice vs original quote
                                              variance

  Communication      15%          1--5        Responsiveness during job
                                              execution

  Safety Compliance  10%          1--5        Adherence to site safety rules
  -----------------------------------------------------------------------------

-   Overall Score = weighted average of 5 dimensions

-   Score \< 2.5 for 2 consecutive jobs → vendor placed on PROBATION

-   Score \< 2.0 overall → vendor SUSPENDED pending review

**4.5 Prisma Schema --- External Repairs Module**

+-----------------------------------------------------------------------+
| model ExternalRepair {                                                |
|                                                                       |
| id String \@id \@default(uuid())                                      |
|                                                                       |
| repair_number String \@unique // ER-2024-0001                         |
|                                                                       |
| parent_jc_id String                                                   |
|                                                                       |
| subcontractor_id String                                               |
|                                                                       |
| purchase_order_id String?                                             |
|                                                                       |
| state ExtRepairState \@default(DRAFT)                                 |
|                                                                       |
| description String                                                    |
|                                                                       |
| estimated_cost Decimal                                                |
|                                                                       |
| actual_cost Decimal?                                                  |
|                                                                       |
| pickup_date DateTime?                                                 |
|                                                                       |
| expected_return DateTime?                                             |
|                                                                       |
| actual_return DateTime?                                               |
|                                                                       |
| inspection_passed Boolean?                                            |
|                                                                       |
| inspector_id String?                                                  |
|                                                                       |
| inspection_notes String?                                              |
|                                                                       |
| created_by String                                                     |
|                                                                       |
| created_at DateTime \@default(now())                                  |
|                                                                       |
| updated_at DateTime \@updatedAt                                       |
|                                                                       |
| performance_rating SubcontractorRating?                               |
|                                                                       |
| }                                                                     |
|                                                                       |
| model Subcontractor {                                                 |
|                                                                       |
| id String \@id \@default(uuid())                                      |
|                                                                       |
| vendor_code String \@unique                                           |
|                                                                       |
| company_name String                                                   |
|                                                                       |
| registration_no String \@unique                                       |
|                                                                       |
| tax_clearance_url String?                                             |
|                                                                       |
| trade_licence_url String?                                             |
|                                                                       |
| service_categories String\[\]                                         |
|                                                                       |
| status String \@default(\"ACTIVE\") // ACTIVE \| PROBATION \|         |
| SUSPENDED \| DEREGISTERED                                             |
|                                                                       |
| avg_rating Decimal? // Computed from all ratings                      |
|                                                                       |
| created_at DateTime \@default(now())                                  |
|                                                                       |
| updated_at DateTime \@updatedAt                                       |
|                                                                       |
| ratings SubcontractorRating\[\]                                       |
|                                                                       |
| external_repairs ExternalRepair\[\]                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| model SubcontractorRating {                                           |
|                                                                       |
| id String \@id \@default(uuid())                                      |
|                                                                       |
| external_repair_id String \@unique                                    |
|                                                                       |
| subcontractor_id String                                               |
|                                                                       |
| quality_score Int                                                     |
|                                                                       |
| turnaround_score Int                                                  |
|                                                                       |
| invoice_accuracy Int                                                  |
|                                                                       |
| communication_score Int                                               |
|                                                                       |
| safety_score Int                                                      |
|                                                                       |
| overall_score Decimal // Computed weighted average                    |
|                                                                       |
| rated_by String                                                       |
|                                                                       |
| rated_at DateTime \@default(now())                                    |
|                                                                       |
| notes String?                                                         |
|                                                                       |
| }                                                                     |
|                                                                       |
| enum ExtRepairState { DRAFT QUOTATION_REQUIRED QUOTATION_IN_PROGRESS  |
| PO_RAISED SUBCONTRACTOR_IN_PROGRESS RETURNED_FOR_INSPECTION COMPLETED |
| CANCELLED }                                                           |
+-----------------------------------------------------------------------+

  ------------ --------------- --------------------------------------------
  **GAP-05**   **CRITICAL**    **STATUS: FILLED**

  ------------ --------------- --------------------------------------------

**GAP-05: Quality Management Module --- Complete Design**

The Quality Management Module governs inspection workflows,
non-conformance tracking, calibration certificate management, and ISO
9001 audit trail alignment within WCP.

**5.1 Inspection Workflow**

INSPECTION-type job cards follow a dedicated workflow. They are raised
by the Workshop Quality Officer or triggered automatically by PM
completion.

  -------------------------------------------------------------------------------
  **State**               **Description**       **Next State**
  ----------------------- --------------------- ---------------------------------
  PENDING                 Inspection job card   IN_PROGRESS
                          created and assigned  

  IN_PROGRESS             Inspector actively    PASS, CONDITIONAL_PASS, FAIL
                          completing checklist  

  PASS                    All inspection items  CLOSED
                          passed                

  CONDITIONAL_PASS        Minor defects found;  CORRECTIVE_RAISED, CLOSED
                          corrective action     
                          required within       
                          deadline              

  FAIL                    Critical defects      CORRECTIVE_RAISED
                          found; asset grounded 
                          pending corrective    
                          action                

  CORRECTIVE_RAISED       Corrective child job  AWAITING_REINSPECTION
                          card created and      
                          linked                

  AWAITING_REINSPECTION   Corrective work       IN_PROGRESS (re-open)
                          completed; new        
                          inspection cycle      
                          starts                

  CLOSED                  Inspection complete   Terminal
                          and signed off by     
                          Quality Officer       
  -------------------------------------------------------------------------------

**5.2 Inspection Form Structure**

Inspection forms are template-driven. Each template defines sections,
items, and severity levels. The system supports:

-   BINARY items: Pass / Fail

-   MEASURE items: numeric reading with min/max thresholds (e.g., brake
    pad thickness ≥ 3mm)

-   VISUAL items: Good / Acceptable / Defective with mandatory photo if
    Defective

-   DOCUMENT items: Verify certificate/document is present and valid
    (e.g., fire extinguisher certificate)

**5.2.1 Non-Conformance Severity Classification**

  -------------------------------------------------------------------------
  **Severity**   **Definition**     **Asset         **Notification**
                                    Action**        
  -------------- ------------------ --------------- -----------------------
  CRITICAL (S1)  Safety risk;       GROUNDED        Workshop Manager +
                 immediate danger   immediately     Fleet Manager within 15
                 if operated                        min

  MAJOR (S2)     Significant        RESTRICTED use  Workshop Supervisor
                 defect; affects    pending         within 1 hour
                 reliability        corrective      

  MINOR (S3)     Minor defect; does Continue        Supervisor within 24
                 not affect         operating;      hours
                 operation          corrective      
                                    within 7 days   

  OBSERVATION    Advisory only; no  No restriction  Included in weekly
  (S4)           immediate action                   summary report
  -------------------------------------------------------------------------

**5.3 Non-Conformance Notification Workflow**

Inspector records FAIL item on inspection form

System auto-classifies severity based on item_severity setting on
checklist template

System fires notification per severity classification (see table above)

System creates NCR (Non-Conformance Report) record with unique NCR
number (NCR-2024-0001)

NCR spawns a CORRECTIVE child job card with inherit_asset =
parent_inspection_jc.asset_id

Corrective job card description auto-populated with NCR description +
defect photo links

Quality Officer tracks NCR status; overdue corrective actions escalate
at T+48h

**5.4 Calibration Certificate Management**

CALIBRATION-type job cards are used for all measuring equipment (torque
wrenches, pressure gauges, multimeters, etc.). The module manages
certificate tracking and blocks use of expired equipment.

  ---------------------------------------------------------------------------
  **Field**            **Type**   **Rule**
  -------------------- ---------- -------------------------------------------
  equipment_id         FK → Asset Equipment registered as a sub-asset with
                                  type=MEASURING_EQUIPMENT

  calibration_date     DateTime   Date calibration was performed

  certificate_number   String     External calibration lab certificate number

  calibration_lab      String     SANAS-accredited lab name

  next_due_date        DateTime   Auto-computed: calibration_date +
                                  validity_days

  certificate_url      String     Scanned certificate stored in MinIO

  status               Enum       CURRENT \| DUE_SOON (\< 30 days) \| OVERDUE
                                  \| SUSPENDED
  ---------------------------------------------------------------------------

-   Equipment with status = OVERDUE or SUSPENDED is flagged on the
    storekeeper dashboard

-   Any material issue of calibration equipment with OVERDUE status
    triggers a warning popup requiring supervisor override with reason

**5.5 ISO 9001 Audit Trail Alignment**

All inspection records, NCRs, and corrective actions are stored in
immutable form and are directly exportable for ISO 9001 internal and
external audits.

-   Quality Records Report: all inspection job cards with outcomes,
    dates, and inspector IDs for a specified date range

-   NCR Summary Report: all non-conformances by severity, asset,
    workshop, and resolution status

-   Corrective Action Effectiveness: percentage of corrective job cards
    closed within SLA vs overdue

-   Calibration Compliance Report: all measuring equipment with
    current/overdue/suspended status

  ------------ ----------------- --------------------------------------------
  **GAP-06**   **SIGNIFICANT**   **STATUS: FILLED**

  ------------ ----------------- --------------------------------------------

**GAP-06: Full Test Strategy**

**6.1 Unit Test Coverage --- Key Services & Guards**

  --------------------------------------------------------------------------------
  **Service / Guard**       **Critical Scenarios to Test**     **Framework**
  ------------------------- ---------------------------------- -------------------
  JobCardService            State transition guards (cannot    Jest + Prisma mock
                            close with open MRs); QR scan      
                            validation; SLA timer creation     

  MaterialRequestService    Stock reservation race condition   Jest + Prisma mock
                            (concurrent approvals); emergency  
                            MR bypass flow                     

  MaterialIssueService      Counter lock acquisition and       Jest + Prisma mock
                            release; 2-person verification     
                            skip under threshold; return       
                            quantity validation                

  FuelIssueService          EFC calculation formula across 5   Jest
                            asset categories; variance         
                            threshold trigger; meter override  
                            block                              

  LabourAssignmentService   Skill gate blocking with expired   Jest
                            skill; overtime threshold          
                            escalation; clock-in without prior 
                            approval                           

  PmScheduleService         \"which fires first\" logic across Jest
                            3 trigger types; capacity planning 
                            algorithm; merge-into-corrective   
                            flow                               

  AuthGuard                 JWT expiry; device fingerprint     Jest + supertest
                            mismatch; workshop scope           
                            enforcement                        

  ApprovalWorkflowService   Auto-routing to correct approver   Jest
                            by amount; SLA breach escalation;  
                            parallel approval path             

  AuditLogService           Hash chain integrity (each log     Jest
                            entry hash includes previous       
                            hash); immutability (no            
                            update/delete allowed)             
  --------------------------------------------------------------------------------

**6.2 Integration Test Setup**

+-----------------------------------------------------------------------+
| // jest.integration.config.ts                                         |
|                                                                       |
| module.exports = {                                                    |
|                                                                       |
| testEnvironment: \"node\",                                            |
|                                                                       |
| globalSetup: \"./test/global-setup.ts\", // Spin up test PostgreSQL + |
| Redis                                                                 |
|                                                                       |
| globalTeardown: \"./test/global-teardown.ts\",                        |
|                                                                       |
| setupFilesAfterFramework: \[\"./test/setup.ts\"\], // Seed base data  |
|                                                                       |
| testMatch: \[\"\*\*/\*.integration.spec.ts\"\],                       |
|                                                                       |
| testTimeout: 30000,                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| // test/global-setup.ts --- uses testcontainers:                      |
|                                                                       |
| import { PostgreSqlContainer } from \"@testcontainers/postgresql\";   |
|                                                                       |
| import { RedisContainer } from \"@testcontainers/redis\";             |
|                                                                       |
| const pg = await new PostgreSqlContainer(\"postgres:15\").start();    |
|                                                                       |
| const redis = await new RedisContainer(\"redis:7\").start();          |
|                                                                       |
| process.env.DATABASE_URL = pg.getConnectionUri();                     |
|                                                                       |
| process.env.REDIS_URL = redis.getConnectionUrl();                     |
|                                                                       |
| // Run Prisma migrations against test DB:                             |
|                                                                       |
| execSync(\"npx prisma migrate deploy\");                              |
+-----------------------------------------------------------------------+

**6.3 Mandatory E2E Test Flows (Playwright)**

The following E2E test flows must pass before any production deployment
is approved:

  -----------------------------------------------------------------------------
  **\#**   **Flow Name**   **Steps**              **Pass Criteria**
  -------- --------------- ---------------------- -----------------------------
  E2E-01   Full Job Card   QR scan → Create JC →  JC status = CLOSED; all cost
           Lifecycle       Assign Technician →    lines present; audit log has
                           Raise MR → Approve MR  7+ entries
                           → Issue Materials →    
                           Complete JC            

  E2E-02   Procurement     PR raised → RFQ        PO status = INVOICED; budget
           End-to-End      created → 3 quotes     commitment released; SAP sync
                           submitted → PO awarded event fired
                           → GRN recorded → 3-way 
                           match → Invoice        
                           approved               

  E2E-03   Fuel Issue &    Fuel request → Approve AbnormalDetection record
           Abnormal        → Dispense with high   created; notification
           Detection       variance → EFC check   delivered to Fleet Manager
                           triggers RED flag →    
                           Notification sent      

  E2E-04   Offline Sync    Network disabled →     JC visible to all users;
           Roundtrip       Create JC offline →    audit log entries have
                           Network restored →     correct timestamps
                           Sync queue processes → 
                           JC appears on          
                           supervisor desktop     

  E2E-05   PM              PM due date reached →  PM schedule.last_completed_at
           Auto-Schedule & PM JC auto-generated → updated; corrective JC in
           Completion      Checklist completed →  OPEN state
                           FAIL item spawns       
                           corrective JC → PM     
                           schedule updated       

  E2E-06   Purchase        PR submitted \> LPA    PO channel = HO_PROCUREMENT;
           Authority       limit → System routes  audit shows override route
           Channel Routing to HO → HO approves →  
                           PO created under HO    
                           channel                
  -----------------------------------------------------------------------------

**6.4 k6 Load Test Scenarios**

+-----------------------------------------------------------------------+
| // k6 load test --- /src/tests/load/jc-workflow.js                    |
|                                                                       |
| import http from \"k6/http\";                                         |
|                                                                       |
| import { check, sleep } from \"k6\";                                  |
|                                                                       |
| export const options = {                                              |
|                                                                       |
| scenarios: {                                                          |
|                                                                       |
| ramp_up: {                                                            |
|                                                                       |
| executor: \"ramping-vus\",                                            |
|                                                                       |
| startVUs: 0,                                                          |
|                                                                       |
| stages: \[                                                            |
|                                                                       |
| { duration: \"2m\", target: 50 }, // Ramp to 50 users                 |
|                                                                       |
| { duration: \"5m\", target: 200 }, // Ramp to 200 concurrent          |
|                                                                       |
| { duration: \"5m\", target: 200 }, // Hold at 200                     |
|                                                                       |
| { duration: \"2m\", target: 0 }, // Ramp down                         |
|                                                                       |
| \],                                                                   |
|                                                                       |
| },                                                                    |
|                                                                       |
| },                                                                    |
|                                                                       |
| thresholds: {                                                         |
|                                                                       |
| \"http_req_duration\": \[\"p(95)\<500\"\], // P95 under 500ms         |
|                                                                       |
| \"http_req_failed\": \[\"rate\<0.01\"\], // Error rate \< 1%          |
|                                                                       |
| },                                                                    |
|                                                                       |
| };                                                                    |
|                                                                       |
| export default function () {                                          |
|                                                                       |
| // Simulate: login → list JCs → open JC → create MR                   |
|                                                                       |
| const loginRes = http.post(\"/api/auth/login\", JSON.stringify({      |
|                                                                       |
| username: \`user\_\${\_\_VU}@wcp.test\`, password: \"TestPass123!\"   |
|                                                                       |
| }), { headers: { \"Content-Type\": \"application/json\" } });         |
|                                                                       |
| check(loginRes, { \"login 200\": r =\> r.status === 200 });           |
|                                                                       |
| const token = loginRes.json(\"access_token\");                        |
|                                                                       |
| const jcRes = http.get(\"/api/job-cards?status=OPEN&limit=20\", {     |
|                                                                       |
| headers: { Authorization: \`Bearer \${token}\` }                      |
|                                                                       |
| });                                                                   |
|                                                                       |
| check(jcRes, { \"jc list 200\": r =\> r.status === 200, \"items       |
| present\": r =\> r.json(\"data.length\") \> 0 });                     |
|                                                                       |
| sleep(1);                                                             |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

**6.5 Security Test Checklist (OWASP Top 10)**

  ------------------------------------------------------------------------
  **OWASP Item**     **Test Method**        **Tool**
  ------------------ ---------------------- ------------------------------
  A01: Broken Access Attempt cross-workshop Playwright + manual
  Control            data access; verify    
                     403 returned           

  A02: Cryptographic Check HTTPS            ZAP scan + manual
  Failures           enforcement; verify no 
                     secrets in responses   

  A03: Injection     SQL injection via all  OWASP ZAP + SQLMap
                     string inputs; NoSQL   
                     via JSON fields        

  A04: Insecure      Verify all business    Manual code review
  Design             rules enforced         
                     server-side (not just  
                     client)                

  A05: Security      Check exposed admin    ZAP + manual
  Misconfiguration   endpoints; default     
                     credentials; error     
                     messages               

  A06: Vulnerable    npm audit + Snyk scan  npm audit, Snyk
  Components         --- zero critical CVEs 
                     policy                 

  A07: Auth &        JWT tampering; session Burp Suite
  Session Failures   fixation; brute force  
                     rate limiting          

  A08: Software      Verify CI pipeline     CI audit
  Integrity          signs artefacts; no    
                     unauthenticated        
                     updates                

  A09: Logging &     Confirm all auth       Log review
  Monitoring         failures, errors       
                     logged; no sensitive   
                     data in logs           

  A10: Server-Side   Test webhook URLs;     Manual + ZAP
  Request Forgery    verify allowlist       
                     enforced               
  ------------------------------------------------------------------------

  ------------ ----------------- --------------------------------------------
  **GAP-07**   **SIGNIFICANT**   **STATUS: FILLED**

  ------------ ----------------- --------------------------------------------

**GAP-07: Offline Sync Architecture --- Complete Specification**

**7.1 Service Worker Caching Strategy**

  -----------------------------------------------------------------------------------------
  **Resource      **Strategy**             **Max Age**      **Cached APIs**
  Type**                                                    
  --------------- ------------------------ ---------------- -------------------------------
  App Shell       Cache First              Version-locked   N/A
  (HTML/JS/CSS)                                             

  Static Assets   Cache First              30 days          N/A
  (images, icons)                                           

  Reference Data  Stale-While-Revalidate   1 hour           GET /assets, /items, /employees
  (assets, items,                                           
  users)                                                    

  Job Card List   Network First + Cache    15 min           GET /job-cards?status=OPEN
  (supervisor)    Fallback                                  

  Specific Job    Network First + Cache    5 min            GET /job-cards/:id
  Card Detail     Fallback                                  

  Mutating        Background Sync Queue    Until synced     All write operations
  Requests                                                  
  (POST/PATCH)                                              
  -----------------------------------------------------------------------------------------

**7.2 IndexedDB Schema for Offline Queue**

+-----------------------------------------------------------------------+
| // Database name: wcp-offline-db \| Version: 1                        |
|                                                                       |
| Object Store: \"sync_queue\"                                          |
|                                                                       |
| keyPath: id (auto-incremented)                                        |
|                                                                       |
| Indexes: \[ status, priority, entity_type, created_at \]              |
|                                                                       |
| Record shape: {                                                       |
|                                                                       |
| id: AutoIncrement                                                     |
|                                                                       |
| entity_type: \"JOB_CARD\" \| \"MATERIAL_REQUEST\" \| \"FUEL_ISSUE\"   |
| \| \...                                                               |
|                                                                       |
| entity_id: string (UUID generated offline)                            |
|                                                                       |
| operation: \"CREATE\" \| \"UPDATE\" \| \"STATUS_CHANGE\"              |
|                                                                       |
| payload: Object (full request body)                                   |
|                                                                       |
| endpoint: string (\"/api/job-cards\")                                 |
|                                                                       |
| http_method: \"POST\" \| \"PATCH\"                                    |
|                                                                       |
| status: \"PENDING\" \| \"IN_FLIGHT\" \| \"COMPLETED\" \| \"FAILED\"   |
| \| \"CONFLICT\"                                                       |
|                                                                       |
| priority: number (lower = higher priority; JC=1, MR=2, MI=3, Fuel=4)  |
|                                                                       |
| depends_on: string\[\] // IDs of sync_queue records that must sync    |
| first                                                                 |
|                                                                       |
| retry_count: number                                                   |
|                                                                       |
| last_error: string?                                                   |
|                                                                       |
| created_at: number (Unix timestamp)                                   |
|                                                                       |
| synced_at: number?                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| Object Store: \"offline_cache\"                                       |
|                                                                       |
| keyPath: cache_key                                                    |
|                                                                       |
| Indexes: \[ entity_type, cached_at \]                                 |
|                                                                       |
| Record shape: {                                                       |
|                                                                       |
| cache_key: string (\"job-cards-list\" \| \"asset-123-detail\")        |
|                                                                       |
| entity_type: string                                                   |
|                                                                       |
| data: Object                                                          |
|                                                                       |
| cached_at: number                                                     |
|                                                                       |
| expires_at: number                                                    |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

**7.3 Sync Queue Ordering & Dependency Handling**

The sync engine processes the queue in dependency order to prevent
foreign key violations on the server.

+-----------------------------------------------------------------------+
| // Sync worker --- processes queue in correct order:                  |
|                                                                       |
| async function processSyncQueue() {                                   |
|                                                                       |
| const pending = await db.sync_queue                                   |
|                                                                       |
| .where(\"status\").equals(\"PENDING\")                                |
|                                                                       |
| .sortBy(\"priority\"); // Lower priority number = processed first     |
|                                                                       |
| for (const record of pending) {                                       |
|                                                                       |
| // Check all dependencies are COMPLETED:                              |
|                                                                       |
| const depsComplete = await Promise.all(                               |
|                                                                       |
| record.depends_on.map(depId =\>                                       |
|                                                                       |
| db.sync_queue.where(\"id\").equals(depId)                             |
|                                                                       |
| .filter(r =\> r.status === \"COMPLETED\").count()                     |
|                                                                       |
| )                                                                     |
|                                                                       |
| );                                                                    |
|                                                                       |
| if (depsComplete.some(c =\> c === 0)) continue; // Skip until deps    |
| done                                                                  |
|                                                                       |
| await markInFlight(record.id);                                        |
|                                                                       |
| try {                                                                 |
|                                                                       |
| const res = await fetch(record.endpoint, {                            |
|                                                                       |
| method: record.http_method,                                           |
|                                                                       |
| body: JSON.stringify(record.payload),                                 |
|                                                                       |
| headers: { Authorization: \`Bearer \${getStoredToken()}\` }           |
|                                                                       |
| });                                                                   |
|                                                                       |
| if (res.status === 409) {                                             |
|                                                                       |
| await markConflict(record.id, await res.json());                      |
|                                                                       |
| } else if (res.ok) {                                                  |
|                                                                       |
| await markCompleted(record.id);                                       |
|                                                                       |
| } else {                                                              |
|                                                                       |
| await incrementRetry(record.id, await res.text());                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| } catch (networkErr) {                                                |
|                                                                       |
| await markPending(record.id); // Network still down, try again later  |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

**7.4 Conflict Resolution Algorithm**

A conflict occurs when the same entity was modified offline by the field
user AND online by a different user during the offline period.

  ------------------------------------------------------------------------
  **Scenario**     **Resolution Strategy**  **Who Sees Conflict UI**
  ---------------- ------------------------ ------------------------------
  JC status        Server wins --- server   Supervisor mobile
  changed          state is authoritative;  
  offline + JC     offline change           
  closed online    discarded; supervisor    
                   notified                 

  MR quantity      CONFLICT state raised;   Supervisor desktop
  updated          supervisor sees diff UI  
  offline + MR     showing both versions    
  approved online                           

  Fuel issue       Fuel issue synced as-is; Fleet Manager
  created          JC re-opened if still    
  offline + same   within grace period      
  asset JC closed  (configurable, default   
  online           2h)                      

  Labour clock-in  CONFLICT raised;         Workshop Manager
  offline +        Workshop Manager         
  technician       resolves; original       
  reassigned       assignment retained      
  online           unless explicitly        
                   overridden               
  ------------------------------------------------------------------------

**7.4.1 Conflict Diff UI --- Supervisor View**

When a CONFLICT record exists in the sync queue, the mobile app displays
a side-by-side comparison:

-   LEFT side: \"Your offline version\" --- what the field user
    created/changed offline

-   RIGHT side: \"Current server version\" --- what exists on the server
    now

-   Changed fields are highlighted in amber

-   Supervisor taps \"Keep Mine\" or \"Keep Server\" or \"Merge\" (where
    applicable)

-   Resolution choice is logged to the audit trail with supervisor ID
    and timestamp

-   Maximum offline duration: 72 hours. Records older than 72 hours in
    the sync queue are flagged for manual review by Workshop Manager

  ------------ ----------------- --------------------------------------------
  **GAP-08**   **SIGNIFICANT**   **STATUS: FILLED**

  ------------ ----------------- --------------------------------------------

**GAP-08: Notification System Design --- Complete Specification**

**8.1 Complete Notification Event Catalogue**

  ------------------------------------------------------------------------------
  **Event Code** **Trigger**       **Primary        **Channel**   **Escalation
                                   Recipients**                   (if unread)**
  -------------- ----------------- ---------------- ------------- --------------
  NTF-JC-01      Job Card created  Assigned         Push + In-app None
                                   supervisor                     

  NTF-JC-02      JC SLA breach     Supervisor       Push + Email  Workshop
                 (amber)                                          Manager at 2h

  NTF-JC-03      JC SLA breach     Workshop Manager Push +        HO Fleet
                 (red / overdue)                    Email + SMS   Manager at 4h

  NTF-JC-04      JC closed         Asset owner +    In-app        None
                                   Fleet Manager                  

  NTF-MR-01      MR requires       Supervisor       Push + In-app Workshop
                 approval                                         Manager at 4h

  NTF-MR-02      MR approved       Requesting       Push          None
                                   technician                     

  NTF-MR-03      MR rejected       Requesting       Push + In-app None
                                   technician                     

  NTF-MI-01      High-value issue  Storekeeper +    Push          None
                 requires 2nd      Supervisor                     
                 person                                           

  NTF-FUEL-01    Fuel variance     Supervisor       Push + Email  Fleet Manager
                 AMBER flag                                       at 2h

  NTF-FUEL-02    Fuel variance RED Fleet Manager    Push +        HO Admin at 1h
                 flag                               Email + SMS   

  NTF-FUEL-03    Tank level below  Stores Manager   Push + Email  Workshop
                 low_level_alert                                  Manager at 24h

  NTF-PM-01      PM due in 14 days Supervisor       Email         None

  NTF-PM-02      PM overdue        Supervisor +     Push + Email  HO Admin at
                                   Fleet Manager                  48h

  NTF-QA-01      CRITICAL          Workshop         Push +        HO Director at
                 non-conformance   Manager + Fleet  Email + SMS   1h
                 (S1)              Manager                        

  NTF-PROC-01    PR requires       Approving        Push + Email  Next authority
                 approval          authority                      at SLA

  NTF-PROC-02    PO awarded        Requesting       Email         None
                                   workshop                       

  NTF-PROC-03    Invoice matched / Finance          Email         None
                 payment ready                                    

  NTF-SKILL-01   Technician skill  HR + Supervisor  Email         None
                 expiring in 30                                   
                 days                                             
  ------------------------------------------------------------------------------

**8.2 Email Template Designs**

All system emails follow the WCP branded template. HTML/CSS email
templates are stored in /src/notifications/templates/. Below are the
subject line conventions and key body data for each category:

  --------------------------------------------------------------------------
  **Template**   **Subject Line        **Key Data Points**
                 Format**              
  -------------- --------------------- -------------------------------------
  JC SLA Breach  \[WCP ALERT\] Job     Asset ID, current status, assigned
                 Card {jc_number}      technician, open MRs count
                 overdue --- {hours}h  
                 past SLA              

  Fuel Variance  \[WCP FUEL ALERT\]    Asset details, issue number, EFC vs
                 Abnormal consumption  actual, link to investigation
                 on {asset_id} ---     
                 {variance}% variance  

  PM Overdue     \[WCP PM ALERT\]      PM template name, days overdue,
                 Preventive            workshop, last PM date
                 Maintenance overdue   
                 for {asset_id}        

  NCR Critical   \[WCP QUALITY         Asset grounded flag, defect
                 CRITICAL\]            description, inspector, workshop
                 Non-Conformance       
                 {ncr_number} ---      
                 Immediate Action      
                 Required              

  PR Approval    \[WCP PROCUREMENT\]   PR description, amount, requestor,
                 Approval Required:    deadline for approval
                 Purchase Request      
                 {pr_number} ---       
                 {amount}              
  --------------------------------------------------------------------------

**8.3 Push Notification Payload Structure**

+-----------------------------------------------------------------------+
| // FCM (Firebase Cloud Messaging) payload:                            |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"to\": \"{device_fcm_token}\",                                       |
|                                                                       |
| \"notification\": {                                                   |
|                                                                       |
| \"title\": \"Fuel Variance Alert\",                                   |
|                                                                       |
| \"body\": \"Asset TRK-042 --- 38% over expected consumption. Tap to   |
| review.\",                                                            |
|                                                                       |
| \"icon\": \"/icons/alert-red.png\"                                    |
|                                                                       |
| },                                                                    |
|                                                                       |
| \"data\": {                                                           |
|                                                                       |
| \"event_code\": \"NTF-FUEL-02\",                                      |
|                                                                       |
| \"entity_type\": \"FUEL_ISSUE\",                                      |
|                                                                       |
| \"entity_id\": \"uuid-of-fuel-issue\",                                |
|                                                                       |
| \"deep_link\": \"/fuel-issues/uuid-of-fuel-issue\",                   |
|                                                                       |
| \"priority\": \"HIGH\",                                               |
|                                                                       |
| \"sent_at\": \"2024-03-15T10:30:00Z\"                                 |
|                                                                       |
| },                                                                    |
|                                                                       |
| \"android\": { \"priority\": \"high\" },                              |
|                                                                       |
| \"apns\": { \"headers\": { \"apns-priority\": \"10\" } }              |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

**8.4 Notification Preference Management**

Each user can customise which notification channels they receive for
each event category. Preferences are stored per user and per event
category.

  ----------------------------------------------------------------------------------------
  **Setting**        **Default**   **User-Configurable?**   **Notes**
  ------------------ ------------- ------------------------ ------------------------------
  Push notifications ON            Yes                      Cannot disable CRITICAL alerts
  --- alerts                                                (S1 events)

  Push notifications ON            Yes                      e.g., MR approved, JC closed
  --- informational                                         

  Email --- alerts   ON            Yes                      Cannot disable CRITICAL alerts

  Email --- daily    OFF           Yes                      Daily summary of all events
  digest                                                    for the user

  SMS --- critical   OFF           Yes (admin enables per   Requires SMS gateway
  only                             role)                    configuration

  WhatsApp ---       OFF           Yes (admin enables per   Requires WhatsApp Business API
  critical only                    role)                    config
  ----------------------------------------------------------------------------------------

  ------------ ----------------- --------------------------------------------
  **GAP-09**   **SIGNIFICANT**   **STATUS: FILLED**

  ------------ ----------------- --------------------------------------------

**GAP-09: Reporting & MIS Module --- Complete Specification**

**9.1 Standard Reports Catalogue**

  ------------------------------------------------------------------------------------
  **Report   **Name**         **Audience**   **Frequency**   **Key Metrics**
  Code**                                                     
  ---------- ---------------- -------------- --------------- -------------------------
  RPT-01     Fleet            Fleet Manager  Daily / Monthly Operational %, downtime
             Availability                                    hours, reasons breakdown
             Report                                          

  RPT-02     Job Card         Workshop       Weekly          JCs opened/closed, avg
             Performance      Manager                        completion time, SLA
             Summary                                         compliance %

  RPT-03     Parts            Stores Manager Monthly         Top 20 items by cost,
             Consumption                                     consumption trend, stock
             Analysis                                        turn ratio

  RPT-04     Technician       Workshop       Weekly          Productive hours %,
             Utilisation      Manager                        overtime hours, jobs per
             Report                                          technician

  RPT-05     PM Compliance    Fleet Manager  Monthly         PM due vs completed,
             Report                                          overdue by
                                                             asset/workshop,
                                                             compliance %

  RPT-06     Procurement      Finance / HO   Monthly         Spend by vendor,
             Spend Analysis                                  category, workshop; PO vs
                                                             invoice variance

  RPT-07     Fuel Consumption Fleet Manager  Monthly         L/100km trend, abnormal
             Report                                          events, total fuel cost,
                                                             by fleet category

  RPT-08     Quality & NCR    Quality        Monthly         Inspections performed,
             Report           Manager                        pass/fail rates, open
                                                             NCRs by severity

  RPT-09     Subcontractor    Procurement    Quarterly       Average rating by vendor,
             Performance      Manager                        job count, cost analysis

  RPT-10     Asset Lifecycle  Fleet Director Annual          Total cost of ownership:
             Cost Report                                     labour + parts + fuel +
                                                             external per asset
  ------------------------------------------------------------------------------------

**9.2 Report Scheduling Engine**

Administrators configure report subscriptions. The BullMQ job scheduler
generates and distributes reports on the configured cadence.

+-----------------------------------------------------------------------+
| model ReportSubscription {                                            |
|                                                                       |
| id String \@id \@default(uuid())                                      |
|                                                                       |
| report_code String // RPT-01, RPT-02, etc.                            |
|                                                                       |
| subscriber_id String // User who receives the report                  |
|                                                                       |
| email String                                                          |
|                                                                       |
| schedule_cron String // Cron expression: \"0 7 \* \* 1\" = Mon 7am    |
|                                                                       |
| format String // PDF \| XLSX \| CSV                                   |
|                                                                       |
| filters Json // { workshop_id, date_range_days, asset_category }      |
|                                                                       |
| last_sent_at DateTime?                                                |
|                                                                       |
| is_active Boolean \@default(true)                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // BullMQ report generation job:                                      |
|                                                                       |
| reportQueue.process(async (job) =\> {                                 |
|                                                                       |
| const { subscription_id } = job.data;                                 |
|                                                                       |
| const sub = await getSubscription(subscription_id);                   |
|                                                                       |
| const data = await fetchReportData(sub.report_code, sub.filters);     |
|                                                                       |
| const file = await renderReport(data, sub.format); // PDF via         |
| Puppeteer or XLSX                                                     |
|                                                                       |
| await emailService.send({                                             |
|                                                                       |
| to: sub.email,                                                        |
|                                                                       |
| subject: \`\[WCP Report\] \${getReportName(sub.report_code)} ---      |
| \${formatDate(new Date())}\`,                                         |
|                                                                       |
| attachments: \[{ filename: file.name, content: file.buffer }\]        |
|                                                                       |
| });                                                                   |
|                                                                       |
| await updateLastSent(subscription_id);                                |
|                                                                       |
| });                                                                   |
+-----------------------------------------------------------------------+

**9.3 Export Specifications**

  ----------------------------------------------------------------------------
  **Format**   **Library**        **Max        **Notes**
                                  Records**    
  ------------ ------------------ ------------ -------------------------------
  PDF          Puppeteer          10,000 rows  Branded header/footer; charts
               (headless Chrome)               rendered via Chart.js

  XLSX         ExcelJS            500,000 rows Auto-filter on all columns;
                                               frozen header row; number
                                               formatting

  CSV          fast-csv           Unlimited    UTF-8 BOM for Excel
                                               compatibility; RFC 4180
                                               compliant
  ----------------------------------------------------------------------------

**9.4 7-Year Archival & Retrieval Process**

All report data is sourced from the live database for up to 2 years.
Records older than 2 years are archived to cold storage (AWS S3 Glacier
or MinIO lifecycle policy) in Parquet format.

BullMQ archival job runs on the 1st of each month at 01:00

Records older than 730 days are exported to Parquet and uploaded to the
archive bucket

Source records are replaced with a stub containing: id, archive_ref,
archived_at, archived_by

Archived data is retrievable via the Admin → Archive Retrieval screen
(HO Admin role only)

Retrieval request triggers async job; data restored to a temp reporting
table; user notified when ready

Temp retrieval tables are purged after 7 days

Full archive retention: 7 years from transaction date; auto-purge at 7
years 1 day per data retention policy

  ------------ ----------------- --------------------------------------------
  **GAP-10**   **SIGNIFICANT**   **STATUS: FILLED**

  ------------ ----------------- --------------------------------------------

**GAP-10: KPI Engine Design --- Complete Specification**

**10.1 KPI Catalogue with Exact Formulas**

  --------------------------------------------------------------------------------
  **KPI    **Name**        **Formula**              **Cadence**   **Thresholds
  Code**                                                          (Amber / Red)**
  -------- --------------- ------------------------ ------------- ----------------
  KPI-01   Fleet           (Assets with no open     Real-time     \< 90% / \< 80%
           Availability    BREAKDOWN/CORRECTIVE JC                
           Rate            / Total active assets) ×               
                           100                                    

  KPI-02   PM Compliance   (PMs completed on time   Daily         \< 85% / \< 70%
           Rate            in period / PMs due in                 
                           period) × 100                          

  KPI-03   Mean Time to    Avg(JC.closed_at −       Daily         \> 24h / \> 48h
           Repair (MTTR)   JC.created_at) in hours                
                           for CORRECTIVE/BREAKDOWN               
                           JCs                                    

  KPI-04   Mean Time       Avg(JC.created_at\[n\] − Weekly        \< 30 days / \<
           Between         JC.created_at\[n-1\])                  14 days
           Failures        per asset per 90 days                  

  KPI-05   SLA Compliance  (JCs closed within SLA / Daily         \< 90% / \< 80%
           Rate            Total JCs closed) × 100                

  KPI-06   Labour          (Total billed hours /    Daily         \< 70% / \< 50%
           Utilisation     Total available hours) ×               
           Rate            100                                    

  KPI-07   Parts           (MRs fulfilled in full   Daily         \< 85% / \< 75%
           Availability    at first request / Total               
           Rate            MRs) × 100                             

  KPI-08   Fuel Efficiency Avg(actual L/100km) /    Weekly        \> 115% / \>
           Index           baseline_L/100km × 100                 130%
                           per fleet category                     

  KPI-09   Procurement     Avg(PO.awarded_at −      Weekly        \> 5 days / \>
           Lead Time       PR.created_at) in                      10 days
                           business days                          

  KPI-10   Cost Per        Total(labour + parts +   Monthly       Configurable per
           Kilometre       fuel + external) /                     fleet category
                           total_km_driven for                    
                           period                                 
  --------------------------------------------------------------------------------

**10.2 KPI Computation Engine Design**

+-----------------------------------------------------------------------+
| // BullMQ KPI snapshot job --- runs on configurable cadence:          |
|                                                                       |
| kpiQueue.process(async (job) =\> {                                    |
|                                                                       |
| const { kpi_code, workshop_id, snapshot_date } = job.data;            |
|                                                                       |
| const value = await computeKpi(kpi_code, workshop_id, snapshot_date); |
|                                                                       |
| const config = await getKpiConfig(kpi_code, workshop_id); //          |
| amber/red thresholds                                                  |
|                                                                       |
| const flag =                                                          |
|                                                                       |
| value \<= config.red_threshold ? \"RED\" :                            |
|                                                                       |
| value \<= config.amber_threshold ? \"AMBER\" : \"GREEN\";             |
|                                                                       |
| await prisma.kpiSnapshot.upsert({                                     |
|                                                                       |
| where: { kpi_code_workshop_id_snapshot_date: { kpi_code, workshop_id, |
| snapshot_date } },                                                    |
|                                                                       |
| update: { value, flag, computed_at: new Date() },                     |
|                                                                       |
| create: { kpi_code, workshop_id, snapshot_date, value, flag,          |
| computed_at: new Date() }                                             |
|                                                                       |
| });                                                                   |
|                                                                       |
| if (flag !== \"GREEN\") {                                             |
|                                                                       |
| await notificationService.fire(\`NTF-KPI-\${flag}\`, { kpi_code,      |
| value, flag, workshop_id });                                          |
|                                                                       |
| }                                                                     |
|                                                                       |
| });                                                                   |
+-----------------------------------------------------------------------+

**10.3 kpi_snapshots Table Schema**

+-----------------------------------------------------------------------+
| model KpiSnapshot {                                                   |
|                                                                       |
| id String \@id \@default(uuid())                                      |
|                                                                       |
| kpi_code String // KPI-01 through KPI-10                              |
|                                                                       |
| workshop_id String? // null = organisation-wide                       |
|                                                                       |
| snapshot_date DateTime // Date of the snapshot                        |
|                                                                       |
| value Decimal // The computed KPI value                               |
|                                                                       |
| flag String // GREEN \| AMBER \| RED                                  |
|                                                                       |
| computed_at DateTime \@default(now())                                 |
|                                                                       |
| @@unique(\[kpi_code, workshop_id, snapshot_date\])                    |
|                                                                       |
| @@index(\[workshop_id, snapshot_date\])                               |
|                                                                       |
| }                                                                     |
|                                                                       |
| model KpiThresholdConfig {                                            |
|                                                                       |
| id String \@id \@default(uuid())                                      |
|                                                                       |
| kpi_code String                                                       |
|                                                                       |
| workshop_id String? // null = default for all workshops               |
|                                                                       |
| amber_threshold Decimal                                               |
|                                                                       |
| red_threshold Decimal                                                 |
|                                                                       |
| higher_is_worse Boolean \@default(false) // For MTTR: higher is worse |
|                                                                       |
| updated_by String                                                     |
|                                                                       |
| updated_at DateTime \@updatedAt                                       |
|                                                                       |
| @@unique(\[kpi_code, workshop_id\])                                   |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

  ------------ ----------------- --------------------------------------------
  **GAP-11**   **SIGNIFICANT**   **STATUS: FILLED**

  ------------ ----------------- --------------------------------------------

**GAP-11: Document Management System --- Complete Specification**

**11.1 File Upload Flow**

Client selects file (mobile camera or file picker)

Client reads EXIF metadata client-side and sends with upload request

Client sends multipart/form-data POST to /api/documents/upload

NestJS DocumentsController receives file via Multer interceptor (max
20MB, allowed: jpg, jpeg, png, pdf)

Server reads EXIF via exifr library --- extracts: GPSLatitude,
GPSLongitude, DateTimeOriginal, Make, Model

Server performs EXIF validation (see §11.2)

Server applies security watermark (see §11.3)

Server uploads watermarked file to MinIO under path:
/{tenant_id}/{entity_type}/{entity_id}/{uuid}.{ext}

Server generates signed URL (1-hour expiry for view; 10-minute expiry
for download)

Server creates Document record in database and returns document_id +
signed_url

**11.2 EXIF Validation Rules**

  --------------------------------------------------------------------------------
  **Field**          **Validation Rule**    **Action if Fails**   **Override
                                                                  Allowed?**
  ------------------ ---------------------- --------------------- ----------------
  DateTimeOriginal   Must be within ±15     EXIF_TIMESTAMP_FLAG   Supervisor
                     minutes of server time raised; document      override with
                     at upload              quarantined           reason

  GPS Coordinates    Must be within 5km of  EXIF_LOCATION_FLAG    Fleet Manager
                     registered workshop    raised; document      override
                     location               quarantined           

  GPS Coordinates    If no GPS data present EXIF_NO_GPS warning;  N/A
                     (GPS stripped)         not a block unless    
                                            mandatory photo type  

  Make / Model       Must match a           EXIF_UNKNOWN_DEVICE   Admin
                     registered device in   warning               investigation
                     device_registry                              
  --------------------------------------------------------------------------------

**11.3 Watermark Composition Specification**

All uploaded photos receive a visible watermark overlay composed of the
following elements:

+-----------------------------------------------------------------------+
| Watermark composition (applied via Sharp library):                    |
|                                                                       |
| TOP-LEFT: WCP logo (40px height, 80% opacity)                         |
|                                                                       |
| TOP-RIGHT: Upload timestamp in format: \"DD MMM YYYY HH:mm:ss         |
| (UTC+2)\"                                                             |
|                                                                       |
| BOTTOM-LEFT: \"Employee: {employee_name} \| ID: {employee_id}\"       |
|                                                                       |
| BOTTOM-RIGHT: \"Asset: {asset_id} \| WC: {workshop_code}\"            |
|                                                                       |
| DIAGONAL OVERLAY: Semi-transparent text \"WCP EVIDENCE\" at 45°, 15%  |
| opacity, grey                                                         |
|                                                                       |
| Font: Arial Bold, 14px for corner text, 48px for diagonal overlay     |
|                                                                       |
| Text colour: White with 1px black shadow for readability on any       |
| background                                                            |
|                                                                       |
| Padding from edges: 12px                                              |
+-----------------------------------------------------------------------+

**11.4 Signed URL Generation & Expiry Policy**

  ---------------------------------------------------------------------------
  **Use Case**       **Expiry**   **HTTP       **Notes**
                                  Method**     
  ------------------ ------------ ------------ ------------------------------
  View in UI (inline 60 minutes   GET          URL refreshed automatically if
  preview)                                     user is still viewing

  Download link      10 minutes   GET          Single-use token; expire on
                                               first access

  External share     7 days       GET          Requires HO Admin approval;
  (auditor)                                    logged to audit trail

  Report attachment  24 hours     GET          Generated when report is
                                               emailed; expires independently
  ---------------------------------------------------------------------------

**11.5 Document Versioning Workflow**

Documents linked to job cards, MRs, and procurement records are
versioned. The original is never overwritten.

-   Every document upload for the same entity_id and document_type
    creates a new version (version_number auto-incremented)

-   The latest version is marked is_current = true; all previous
    versions set to is_current = false

-   All versions are retained in MinIO and the Document table

-   The UI shows the current version but allows authorised users to view
    version history

-   Deletion is soft-delete only (deleted_at timestamp set); MinIO files
    are never purged except by the 7-year archival policy

  ------------ --------------- --------------------------------------------
  **GAP-12**   **MODERATE**    **STATUS: FILLED**

  ------------ --------------- --------------------------------------------

**GAP-12: Multi-Workshop & Organisation Structure**

**12.1 Organisation Hierarchy**

WCP uses a three-tier hierarchy: Organisation → Region (optional) →
Workshop. All data is scoped at the Workshop level except for HO-level
views.

  --------------------------------------------------------------------------------
  **Level**   **Entity**     **Scope**          **Example**
  ----------- -------------- ------------------ ----------------------------------
  1           Organisation   Global --- owns    WCP Corp (single tenant)
                             all data           

  2           Region         Groups workshops   Northern Region, Southern Region
              (optional)     by geography       

  3           Workshop       Operational unit;  Workshop 1, Workshop 2, HO
                             all transactions   Workshop
                             belong here        
  --------------------------------------------------------------------------------

**12.2 Cross-Workshop Access Rules**

-   Supervisors and Storekeepers: can only see data for their assigned
    workshop

-   Workshop Managers: can see all data for their workshop; read-only
    access to workshops in their region

-   Regional Fleet Managers: read-only dashboard across all workshops in
    their region

-   HO Fleet Admin / Finance / Procurement: read/write access
    organisation-wide

-   Cross-workshop parts transfer: requires approval from both sending
    and receiving Workshop Managers

**12.3 HO Procurement Queue --- Multi-Workshop**

When multiple workshops raise PRs that route to HO simultaneously, HO
Procurement sees a unified queue filtered by channel, amount, and
category. Queue processing follows:

PRs are sorted by: priority flag, then amount ascending, then created_at
ascending

HO Procurement Officer locks a PR record before editing (optimistic
locking with 15-min timeout)

If two PRs require the same item from the same supplier, HO can
consolidate into a single PO (Consolidated Purchase Order flow)

  ------------ --------------- --------------------------------------------
  **GAP-13**   **MODERATE**    **STATUS: FILLED**

  ------------ --------------- --------------------------------------------

**GAP-13: Data Migration Plan**

**13.1 Migration Source Assessment**

Before migration begins, a source assessment workshop is conducted to
catalogue all legacy data sources. Common sources in fleet workshop
environments:

  --------------------------------------------------------------------------
  **Legacy         **Data Type**   **Migration   **Notes**
  Source**                         Priority**    
  ---------------- --------------- ------------- ---------------------------
  Excel/CSV        Assets, parts   HIGH          Manual data cleaning
  registers        catalogue,                    required
                   employee list                 

  Legacy CMMS (if  Job history, PM MEDIUM        Extract via CSV export or
  any)             history                       API

  ERP (SAP/Oracle) Vendors, stock  HIGH          Use SAP integration
                   items,                        adapters from Section 21
                   employees                     

  Paper records    Historical job  LOW           Digitise priority records
                   cards, fuel                   only; archive the rest
                   logs                          
  --------------------------------------------------------------------------

**13.2 Migration Script Architecture**

+-----------------------------------------------------------------------+
| migration/                                                            |
|                                                                       |
| ├── extract/ \# Read from legacy source                               |
|                                                                       |
| │ ├── assets.ts                                                       |
|                                                                       |
| │ ├── items.ts                                                        |
|                                                                       |
| │ └── employees.ts                                                    |
|                                                                       |
| ├── transform/ \# Clean, map, validate                                |
|                                                                       |
| │ ├── asset-mapper.ts                                                 |
|                                                                       |
| │ └── validators.ts                                                   |
|                                                                       |
| ├── load/ \# Insert into WCP database                                 |
|                                                                       |
| │ ├── seed-assets.ts                                                  |
|                                                                       |
| │ └── seed-items.ts                                                   |
|                                                                       |
| ├── validate/ \# Post-load checks                                     |
|                                                                       |
| │ └── record-count-check.ts                                           |
|                                                                       |
| └── run-migration.ts \# Orchestrator with rollback support            |
+-----------------------------------------------------------------------+

**13.3 Parallel Run Strategy**

-   Parallel run period: 4 weeks minimum before final cutover

-   Both legacy system and WCP are operated simultaneously during
    parallel run

-   Weekly reconciliation report: counts of assets, job cards, and stock
    transactions must match between systems

-   Discrepancies \> 2% trigger a halt and investigation before
    proceeding

-   Final cutover: legacy system set to read-only at 18:00 Friday; WCP
    becomes primary at 06:00 Monday

  ------------ --------------- --------------------------------------------
  **GAP-14**   **MODERATE**    **STATUS: FILLED**

  ------------ --------------- --------------------------------------------

**GAP-14: UAT & Training Plan**

**14.1 UAT Test Script --- Role-Based Scenarios**

  -----------------------------------------------------------------------
  **Role**      **UAT Scenarios (must sign   **Sign-off Authority**
                off)**                       
  ------------- ---------------------------- ----------------------------
  Technician    1\. Clock in/out on job      Workshop Supervisor
                task. 2. Complete PM         
                checklist. 3. Use offline    
                mode and sync.               

  Storekeeper   1\. Process material issue   Stores Manager
                (standard + high-value). 2.  
                Receive GRN. 3. Conduct      
                stock count.                 

  Supervisor    1\. Open/close job card. 2.  Workshop Manager
                Approve MR + MI. 3. Review   
                dashboard KPIs. 4. Manage    
                technician assignments.      

  Workshop      1\. Full procurement         HO Fleet Director
  Manager       workflow PR→PO. 2. View      
                reports. 3. Manage           
                subcontractor.               

  HO            1\. Process RFQ. 2. Award    Finance Director
  Procurement   PO. 3. 3-way invoice match.  
                4. Consolidated PO across    
                workshops.                   

  Fleet Manager 1\. Review fleet             HO Director
                availability dashboard. 2.   
                Investigate fuel variance.   
                3. View asset lifecycle      
                cost.                        
  -----------------------------------------------------------------------

**14.2 Training Curriculum Per Role**

  -----------------------------------------------------------------------------------
  **Role**              **Duration**   **Format**      **Topics**
  --------------------- -------------- --------------- ------------------------------
  Technician            2 hours        Mobile app      App install, QR scan, time
                                       walkthrough +   clocking, offline mode, photo
                                       hands-on        capture

  Storekeeper           4 hours        Desktop +       Material issue flow, GRN,
                                       mobile          stock count, dip records,
                                       walkthrough     print slips

  Supervisor            6 hours        Classroom +     JC lifecycle, MR approval,
                                       system demo     labour assignment, dashboards,
                                                       reports

  Workshop Manager      8 hours        Classroom +     Full procurement,
                                       case studies    subcontractor, PM scheduling,
                                                       KPIs, escalation rules

  HO                    6 hours        Classroom       3-way match, budget control,
  Finance/Procurement                                  PO consolidation, vendor
                                                       management
  -----------------------------------------------------------------------------------

**14.3 Go-Live Success Criteria**

-   100% of UAT scenarios signed off by all role types

-   E2E test suite passing (all 6 flows from GAP-06 §6.3)

-   Load test passing at 200 concurrent users, P95 \< 500ms

-   Security checklist complete (zero critical CVEs)

-   All training completed and attendance records signed

-   Rollback plan documented and tested in staging

  ------------ --------------- --------------------------------------------
  **GAP-15**   **MODERATE**    **STATUS: FILLED**

  ------------ --------------- --------------------------------------------

**GAP-15: Security Hardening Specification**

**15.1 Rate Limiting Configuration Per Endpoint**

  -------------------------------------------------------------------------
  **Endpoint         **Rate       **Window**      **Response on Exceed**
  Category**         Limit**                      
  ------------------ ------------ --------------- -------------------------
  POST /auth/login   5 requests   1 minute per IP 429 Too Many Requests +
                                                  15-min IP block

  POST /auth/refresh 10 requests  5 minutes per   429 + notify user
                                  user            

  All authenticated  300 requests 1 minute per    429 (no block)
  GET                             user            

  All authenticated  60 requests  1 minute per    429 (no block)
  POST/PATCH                      user            

  File upload        20 requests  5 minutes per   429 (no block)
  endpoints                       user            

  Webhook inbound    100 requests 1 minute per    429 + alert admin
  (SAP)                           source IP       
  -------------------------------------------------------------------------

**15.2 HTTP Security Headers**

+-----------------------------------------------------------------------+
| // Nginx config --- security headers:                                 |
|                                                                       |
| add_header Content-Security-Policy                                    |
|                                                                       |
| \"default-src \'self\'; script-src \'self\'; style-src \'self\'       |
| \'unsafe-inline\';                                                    |
|                                                                       |
| img-src \'self\' data: blob:; connect-src \'self\'                    |
| wss://api.wcp.local;                                                  |
|                                                                       |
| font-src \'self\'; frame-ancestors \'none\';\" always;                |
|                                                                       |
| add_header X-Frame-Options \"DENY\" always;                           |
|                                                                       |
| add_header X-Content-Type-Options \"nosniff\" always;                 |
|                                                                       |
| add_header Referrer-Policy \"strict-origin-when-cross-origin\"        |
| always;                                                               |
|                                                                       |
| add_header Permissions-Policy \"camera=(), geolocation=(self),        |
| microphone=()\" always;                                               |
|                                                                       |
| add_header Strict-Transport-Security \"max-age=31536000;              |
| includeSubDomains\" always;                                           |
+-----------------------------------------------------------------------+

**15.3 Secrets Rotation Policy**

  -------------------------------------------------------------------------
  **Secret Type**  **Rotation    **Method**               **Owner**
                   Frequency**                            
  ---------------- ------------- ------------------------ -----------------
  JWT signing key  90 days       HashiCorp Vault or env   DevOps
                                 replacement;             
                                 zero-downtime rotation   
                                 via key versioning       

  Database         90 days       Vault dynamic secrets;   DevOps
  credentials                    connection pool recycles 
                                 on rotation              

  MinIO access     90 days       Vault; update in env;    DevOps
  keys                           rolling restart          

  SAP integration  30 days       SAP OAuth token          DevOps + SAP
  tokens                         rotation; update in WCP  Admin
                                 Vault                    

  FCM server key   As needed     Firebase console + Vault DevOps
                   (key          update                   
                   compromise)                            
  -------------------------------------------------------------------------

  ------------ --------------- --------------------------------------------
  **GAP-16**   **MODERATE**    **STATUS: FILLED**

  ------------ --------------- --------------------------------------------

**GAP-16: Performance & Scalability Targets**

**16.1 Expected Transaction Volumes --- Peak Day**

  -------------------------------------------------------------------------
  **Transaction Type**  **Daily Volume  **Peak          **Notes**
                        (10             Concurrent**    
                        workshops)**                    
  --------------------- --------------- --------------- -------------------
  Job Card              500             50              Morning shift start
  open/update/close                                     peak

  Material Requests     300             30              Spread through
                                                        shift

  Material Issues       600             40              Clustered around MR
                                                        approvals

  Fuel Issues           200             20              Shift start and end
                                                        clusters

  File uploads (photos) 800             60              Average 3 photos
                                                        per JC or issue

  API read requests     10,000          200             Supervisors
  (dashboards)                                          refreshing
                                                        dashboards

  WebSocket events      5,000           200 connections Real-time state
                                                        change broadcasts
  -------------------------------------------------------------------------

**16.2 Database Growth Projections**

  ------------------------------------------------------------------------------
  **Table**            **Rows/Year**   **Size/Year     **5-Year Projection**
                                       (est.)**        
  -------------------- --------------- --------------- -------------------------
  job_cards            180,000         500 MB          2.5 GB

  audit_logs           5,000,000       8 GB            40 GB

  stock_transactions   1,000,000       2 GB            10 GB

  fuel_issues          70,000          200 MB          1 GB

  documents (metadata) 300,000         300 MB          1.5 GB

  MinIO (files)        300,000 files   150 GB          750 GB
  ------------------------------------------------------------------------------

**16.3 Infrastructure Sizing**

  ------------------------------------------------------------------------
  **Component**   **Minimum Spec** **Recommended       **Scaling
                                   Spec**              Strategy**
  --------------- ---------------- ------------------- -------------------
  NestJS API      2 vCPU / 4GB RAM 4 vCPU / 8GB RAM ×  Horizontal --- add
  (Node.js)                        2 instances         instances behind
                                                       Nginx load balancer

  PostgreSQL 15   4 vCPU / 16GB    8 vCPU / 32GB RAM / Read replica for
                  RAM / 500GB SSD  1TB NVMe            reports; PgBouncer
                                                       connection pooler

  Redis 7         2 vCPU / 4GB RAM 4 vCPU / 8GB RAM    Redis Sentinel for
                                                       HA

  MinIO           4 vCPU / 8GB RAM 8 vCPU / 16GB RAM / Distributed mode
                  / 2TB HDD        10TB HDD            across 4 nodes

  Nginx           2 vCPU / 2GB RAM 4 vCPU / 4GB RAM    Upstream pool to
                                                       NestJS instances
  ------------------------------------------------------------------------

  ------------ --------------- --------------------------------------------
  **GAP-17**   **MODERATE**    **STATUS: FILLED**

  ------------ --------------- --------------------------------------------

**GAP-17: Prisma Schema --- Remaining Modules**

**17.1 Users, Roles & Devices Schema**

+-----------------------------------------------------------------------+
| model User {                                                          |
|                                                                       |
| id String \@id \@default(uuid())                                      |
|                                                                       |
| employee_id String \@unique                                           |
|                                                                       |
| email String \@unique                                                 |
|                                                                       |
| password_hash String                                                  |
|                                                                       |
| role UserRole                                                         |
|                                                                       |
| workshop_id String?                                                   |
|                                                                       |
| is_active Boolean \@default(true)                                     |
|                                                                       |
| last_login_at DateTime?                                               |
|                                                                       |
| created_at DateTime \@default(now())                                  |
|                                                                       |
| updated_at DateTime \@updatedAt                                       |
|                                                                       |
| registered_devices DeviceRegistry\[\]                                 |
|                                                                       |
| }                                                                     |
|                                                                       |
| model DeviceRegistry {                                                |
|                                                                       |
| id String \@id \@default(uuid())                                      |
|                                                                       |
| user_id String                                                        |
|                                                                       |
| device_fingerprint String \@unique                                    |
|                                                                       |
| device_name String                                                    |
|                                                                       |
| device_os String                                                      |
|                                                                       |
| app_version String                                                    |
|                                                                       |
| registered_at DateTime \@default(now())                               |
|                                                                       |
| registered_by String // Admin who approved registration               |
|                                                                       |
| status String \@default(\"ACTIVE\") // ACTIVE \| SUSPENDED \|         |
| DEREGISTERED                                                          |
|                                                                       |
| last_seen_at DateTime?                                                |
|                                                                       |
| deregistered_at DateTime?                                             |
|                                                                       |
| deregistered_by String?                                               |
|                                                                       |
| }                                                                     |
|                                                                       |
| enum UserRole { TECHNICIAN STOREKEEPER SUPERVISOR WORKSHOP_MANAGER    |
| HO_PROCUREMENT HO_FLEET_ADMIN FINANCE SYSTEM_ADMIN }                  |
+-----------------------------------------------------------------------+

**17.2 Asset & Fleet Schema**

+-----------------------------------------------------------------------+
| model Asset {                                                         |
|                                                                       |
| id String \@id \@default(uuid())                                      |
|                                                                       |
| asset_code String \@unique // WCP-TRK-001                             |
|                                                                       |
| qr_code String \@unique                                               |
|                                                                       |
| name String                                                           |
|                                                                       |
| category AssetCategory                                                |
|                                                                       |
| asset_type String // VEHICLE \| EQUIPMENT \| MEASURING_DEVICE         |
|                                                                       |
| make String?                                                          |
|                                                                       |
| model String?                                                         |
|                                                                       |
| year Int?                                                             |
|                                                                       |
| serial_number String?                                                 |
|                                                                       |
| registration_no String?                                               |
|                                                                       |
| workshop_id String                                                    |
|                                                                       |
| status AssetStatus \@default(OPERATIONAL)                             |
|                                                                       |
| current_odometer_km Int?                                              |
|                                                                       |
| current_hours Decimal?                                                |
|                                                                       |
| avg_km_per_day Decimal? // Rolling 30-day average                     |
|                                                                       |
| avg_hours_per_day Decimal?                                            |
|                                                                       |
| fuel_type FuelType?                                                   |
|                                                                       |
| fuel_tank_capacity_litres Decimal?                                    |
|                                                                       |
| oil_change_interval_km Int?                                           |
|                                                                       |
| created_at DateTime \@default(now())                                  |
|                                                                       |
| updated_at DateTime \@updatedAt                                       |
|                                                                       |
| }                                                                     |
|                                                                       |
| enum AssetStatus { OPERATIONAL UNDER_REPAIR GROUNDED AWAITING_PARTS   |
| DECOMMISSIONED }                                                      |
|                                                                       |
| enum AssetCategory { LIGHT_VEHICLE HEAVY_VEHICLE PLANT EQUIPMENT      |
| GENERATOR FORKLIFT MEASURING_EQUIPMENT }                              |
+-----------------------------------------------------------------------+

**17.3 Stores & Inventory Schema**

+-----------------------------------------------------------------------+
| model StoreItem {                                                     |
|                                                                       |
| id String \@id \@default(uuid())                                      |
|                                                                       |
| item_code String \@unique                                             |
|                                                                       |
| description String                                                    |
|                                                                       |
| category String                                                       |
|                                                                       |
| unit_of_measure String // EA, L, KG, M, BOX                           |
|                                                                       |
| is_critical Boolean \@default(false)                                  |
|                                                                       |
| is_hazardous Boolean \@default(false)                                 |
|                                                                       |
| created_at DateTime \@default(now())                                  |
|                                                                       |
| stock_levels StoreStock\[\]                                           |
|                                                                       |
| }                                                                     |
|                                                                       |
| model StoreStock {                                                    |
|                                                                       |
| id String \@id \@default(uuid())                                      |
|                                                                       |
| item_id String                                                        |
|                                                                       |
| workshop_id String                                                    |
|                                                                       |
| qty_on_hand Decimal \@default(0)                                      |
|                                                                       |
| qty_reserved Decimal \@default(0)                                     |
|                                                                       |
| qty_on_order Decimal \@default(0)                                     |
|                                                                       |
| reorder_point Decimal \@default(0)                                    |
|                                                                       |
| reorder_qty Decimal \@default(0)                                      |
|                                                                       |
| max_stock_level Decimal?                                              |
|                                                                       |
| bin_location String?                                                  |
|                                                                       |
| unit_cost Decimal \@default(0) // Weighted average cost               |
|                                                                       |
| updated_at DateTime \@updatedAt                                       |
|                                                                       |
| @@unique(\[item_id, workshop_id\])                                    |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

**17.4 Procurement Tables Schema**

+-----------------------------------------------------------------------+
| model PurchaseRequest {                                               |
|                                                                       |
| id String \@id \@default(uuid())                                      |
|                                                                       |
| pr_number String \@unique                                             |
|                                                                       |
| workshop_id String                                                    |
|                                                                       |
| requestor_id String                                                   |
|                                                                       |
| total_amount Decimal                                                  |
|                                                                       |
| channel String // LPA \| HO_PROCUREMENT                               |
|                                                                       |
| status String                                                         |
|                                                                       |
| priority Priority \@default(MEDIUM)                                   |
|                                                                       |
| created_at DateTime \@default(now())                                  |
|                                                                       |
| lines PrLine\[\]                                                      |
|                                                                       |
| rfq_headers RfqHeader\[\]                                             |
|                                                                       |
| purchase_orders PurchaseOrder\[\]                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| model RfqHeader {                                                     |
|                                                                       |
| id String \@id \@default(uuid())                                      |
|                                                                       |
| rfq_number String \@unique                                            |
|                                                                       |
| pr_id String                                                          |
|                                                                       |
| status String // DRAFT \| SENT \| QUOTES_RECEIVED \| EVALUATED \|     |
| AWARDED \| CANCELLED                                                  |
|                                                                       |
| created_at DateTime \@default(now())                                  |
|                                                                       |
| rfq_lines RfqLine\[\]                                                 |
|                                                                       |
| quotes SupplierQuote\[\]                                              |
|                                                                       |
| }                                                                     |
|                                                                       |
| model PurchaseOrder {                                                 |
|                                                                       |
| id String \@id \@default(uuid())                                      |
|                                                                       |
| po_number String \@unique                                             |
|                                                                       |
| pr_id String                                                          |
|                                                                       |
| vendor_id String                                                      |
|                                                                       |
| status String                                                         |
|                                                                       |
| total_amount Decimal                                                  |
|                                                                       |
| created_at DateTime \@default(now())                                  |
|                                                                       |
| po_lines PoLine\[\]                                                   |
|                                                                       |
| grn_headers GrnHeader\[\]                                             |
|                                                                       |
| invoices SupplierInvoice\[\]                                          |
|                                                                       |
| }                                                                     |
|                                                                       |
| model SupplierInvoice {                                               |
|                                                                       |
| id String \@id \@default(uuid())                                      |
|                                                                       |
| invoice_number String \@unique                                        |
|                                                                       |
| po_id String                                                          |
|                                                                       |
| vendor_id String                                                      |
|                                                                       |
| invoice_amount Decimal                                                |
|                                                                       |
| match_status String // PENDING \| MATCHED \| DISPUTED \| APPROVED     |
|                                                                       |
| created_at DateTime \@default(now())                                  |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

  ------------ --------------- --------------------------------------------
  **GAP-18**   **MODERATE**    **STATUS: FILLED**

  ------------ --------------- --------------------------------------------

**GAP-18: API Payloads --- Remaining Modules**

**18.1 Asset Management API**

+-----------------------------------------------------------------------+
| // GET /assets --- List assets with filters                           |
|                                                                       |
| Query:                                                                |
| ?wo                                                                   |
| rkshop_id=x&status=OPERATIONAL&category=LIGHT_VEHICLE&page=1&limit=20 |
|                                                                       |
| Response: { data: Asset\[\], total, page, limit }                     |
|                                                                       |
| // POST /assets/:id/odometer-update                                   |
|                                                                       |
| Body: { reading_km: 125000, recorded_at: \"2024-03-15\",              |
| evidence_photo_url: \"\...\" }                                        |
|                                                                       |
| Response: 200 { asset_id, new_odometer, prev_odometer, updated_by }   |
|                                                                       |
| // GET /assets/:id/lifecycle-cost                                     |
|                                                                       |
| Query: ?from=2022-01-01&to=2024-03-31                                 |
|                                                                       |
| Response: { labour_cost, parts_cost, fuel_cost, external_cost,        |
| total_cost, cost_per_km }                                             |
+-----------------------------------------------------------------------+

**18.2 Inventory / Stock API**

+-----------------------------------------------------------------------+
| // GET /stock --- Stock levels across workshop                        |
|                                                                       |
| Query: ?workshop_id=x&below_reorder=true&item_code=FILTER-001         |
|                                                                       |
| Response: { data: \[{ item_code, description, qty_on_hand,            |
| qty_reserved, reorder_point, status }\] }                             |
|                                                                       |
| // POST /stock/count                                                  |
|                                                                       |
| Body: { workshop_id, count_date, items: \[{ item_id, counted_qty,     |
| bin_location }\] }                                                    |
|                                                                       |
| Response: { count_id, variances: \[{ item_id, system_qty,             |
| counted_qty, variance }\] }                                           |
|                                                                       |
| // POST /stock/transfer                                               |
|                                                                       |
| Body: { from_workshop_id, to_workshop_id, items: \[{ item_id, qty     |
| }\], reason }                                                         |
|                                                                       |
| Response: { transfer_id, status: \"PENDING_APPROVAL\" }               |
+-----------------------------------------------------------------------+

**18.3 KPI Dashboard API**

+-----------------------------------------------------------------------+
| // GET /kpis/dashboard                                                |
|                                                                       |
| Query: ?workshop_id=x&snapshot_date=2024-03-15                        |
|                                                                       |
| Response: {                                                           |
|                                                                       |
| snapshot_date: \"2024-03-15\",                                        |
|                                                                       |
| workshop_id: \"uuid\",                                                |
|                                                                       |
| kpis: \[                                                              |
|                                                                       |
| { code: \"KPI-01\", name: \"Fleet Availability\", value: 87.5, flag:  |
| \"AMBER\", target: 90 },                                              |
|                                                                       |
| { code: \"KPI-02\", name: \"PM Compliance\", value: 92.1, flag:       |
| \"GREEN\", target: 85 },                                              |
|                                                                       |
| \...                                                                  |
|                                                                       |
| \]                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| // GET /kpis/:code/trend                                              |
|                                                                       |
| Query: ?workshop_id=x&days=90                                         |
|                                                                       |
| Response: { kpi_code, data: \[{ date, value, flag }\] }               |
+-----------------------------------------------------------------------+

**18.4 SAP Webhook Inbound Endpoint Specifications**

+-----------------------------------------------------------------------+
| // POST /webhooks/sap/employee-sync                                   |
|                                                                       |
| Headers: { \"X-SAP-Source\": \"HCM\", \"X-SAP-Signature\":            |
| \"hmac-sha256-of-body\" }                                             |
|                                                                       |
| Body: { event: \"EMPLOYEE_UPDATED\", employee_id: \"EMP001\", \... }  |
|                                                                       |
| Response: 202 Accepted                                                |
|                                                                       |
| // POST /webhooks/sap/budget-update                                   |
|                                                                       |
| Headers: { \"X-SAP-Source\": \"FICO\", \"X-SAP-Signature\": \"\...\"  |
| }                                                                     |
|                                                                       |
| Body: { event: \"BUDGET_REVISED\", cost_centre: \"WS-001\",           |
| new_budget: 150000, \... }                                            |
|                                                                       |
| Response: 202 Accepted                                                |
|                                                                       |
| // POST /webhooks/sap/stock-update                                    |
|                                                                       |
| Headers: { \"X-SAP-Source\": \"MM\", \"X-SAP-Signature\": \"\...\" }  |
|                                                                       |
| Body: { event: \"STOCK_POSTED\", material_code: \"10000123\",         |
| qty_change: -5, plant: \"P001\" }                                     |
|                                                                       |
| Response: 202 Accepted                                                |
|                                                                       |
| // All SAP webhooks: idempotent. Duplicate event_id returns 200 (no   |
| reprocessing).                                                        |
|                                                                       |
| // HMAC signature verified against shared secret stored in Vault.     |
|                                                                       |
| // Failed webhook processing retried 3× with 30s back-off; alert sent |
| on 3rd failure.                                                       |
+-----------------------------------------------------------------------+

  ------------ --------------- --------------------------------------------
  **GAP-19**   **MINOR**       **STATUS: FILLED**

  ------------ --------------- --------------------------------------------

**GAP-19: Accessibility & Internationalisation**

**19.1 Accessibility Standards**

-   Desktop UI (React): WCAG 2.1 Level AA compliance target

-   Mobile PWA: WCAG 2.1 Level A minimum; Level AA for primary flows (JC
    creation, MR approval)

-   Keyboard navigation: all primary workflows must be completable
    without a mouse on the desktop UI

-   Screen reader: ARIA labels on all form inputs, icons, and status
    indicators; tested with VoiceOver (iOS) and TalkBack (Android)

-   Colour contrast: minimum 4.5:1 ratio for body text; 3:1 for large
    text and UI components

-   Focus indicators: visible focus ring on all interactive elements (do
    not remove outline)

**19.2 Internationalisation**

-   Phase 1 (launch): English only

-   i18n library: react-i18next with JSON translation files for future
    language support

-   Date format: DD/MM/YYYY (configurable per organisation locale
    setting)

-   Number format: space as thousands separator, comma as decimal (e.g.,
    1 234,56) --- configurable

-   Currency: ZAR (R) by default; symbol and decimal places configurable
    in org settings

-   No RTL language support in Phase 1; react-i18next supports RTL via
    direction attribute for future use

  ------------ --------------- --------------------------------------------
  **GAP-20**   **MINOR**       **STATUS: FILLED**

  ------------ --------------- --------------------------------------------

**GAP-20: Print Slip Specifications**

**20.1 Material Issue Slip Layout**

  -----------------------------------------------------------------------
  **Section**     **Content**
  --------------- -------------------------------------------------------
  Header          WCP Logo \| Workshop Name \| \"MATERIAL ISSUE SLIP\" \|
                  Slip No: MI-2024-0001

  Date/Time       Issue Date, Issue Time, Shift

  Job Reference   Job Card No, Asset ID, Asset Description

  Items Table     Item Code \| Description \| Unit \| Qty Issued \| Unit
                  Cost \| Total Cost

  Totals          Total Items Issued \| Total Value (ZAR)

  Signatures      Issued By (name + signature line) \| Received By
                  (name + signature line) \| Supervisor (name + signature
                  line)

  Footer          Printed at: {timestamp} \| Authorised use only ---
                  retain for audit
  -----------------------------------------------------------------------

**20.2 Other Slip Formats**

  -----------------------------------------------------------------------
  **Slip Type**   **Key Fields**                  **Printer Format**
  --------------- ------------------------------- -----------------------
  GRN Receipt     GRN No, PO No, Vendor, Items    A4 / 80mm thermal roll
  Slip            received, qty, condition,       
                  receiver signature              

  Fuel Issue Slip Fuel Issue No, Asset ID,        80mm thermal roll
                  Driver, Litres dispensed, Meter 
                  before/after, Attendant +       
                  Driver signatures               

  Job Card Work   JC No, Asset, Priority,         A4
  Order           Description, Assigned           
                  technicians, Parts issued       
                  summary                         
  -----------------------------------------------------------------------

-   80mm thermal roll format: font size minimum 9pt; 48 character width;
    no images; dashed lines as dividers

-   A4 format: uses browser print CSS (@media print); all navigation and
    buttons hidden; QR code of the record ID printed in top-right corner

  ------------ --------------- --------------------------------------------
  **GAP-21**   **MINOR**       **STATUS: FILLED**

  ------------ --------------- --------------------------------------------

**GAP-21: Device Registration Workflow**

**21.1 New Device Registration Process**

User installs WCP mobile app on new device

App generates device fingerprint: hash of (deviceId + manufacturer +
model + OS version + appInstallId)

User enters credentials (username + password)

If device fingerprint is NOT in device_registry: auth returns 403 with
code DEVICE_NOT_REGISTERED

App displays: \"This device is not registered. Submit a registration
request?\"

User taps Yes → app sends registration request to server including:
device fingerprint, device name, OS, app version, employee ID

Admin (System Admin role) receives notification: \"New device
registration request from {employee_name}\"

Admin reviews and approves/rejects in Admin → Device Management screen

User notified via push (on a previously registered device) or email once
approved

Device enters ACTIVE status; user can now log in from this device

**21.2 Lost / Stolen Device Deregistration**

User or supervisor submits deregistration request in Admin → Device
Management (or by contacting IT admin)

Admin immediately sets device status = DEREGISTERED and records reason
and date

All active sessions for that device fingerprint are immediately
invalidated (Redis session store purged)

Next API call from the deregistered device returns 401
DEVICE_DEREGISTERED

Deregistration event logged to immutable audit trail with admin ID

**21.3 device_registry Table Schema**

+-----------------------------------------------------------------------+
| // Already included in GAP-17 §17.1 --- see DeviceRegistry model      |
|                                                                       |
| // Key fields: device_fingerprint (unique), status, registered_by,    |
| deregistered_at                                                       |
|                                                                       |
| // Production mode flag (environment variable):                       |
|                                                                       |
| DEVICE_FINGERPRINT_ENFORCEMENT=strict                                 |
|                                                                       |
| // strict: unregistered device → 403 (production default)             |
|                                                                       |
| // permissive: unregistered device → warning only                     |
| (development/testing)                                                 |
+-----------------------------------------------------------------------+

  ------------ --------------- --------------------------------------------
  **GAP-22**   **MINOR**       **STATUS: FILLED**

  ------------ --------------- --------------------------------------------

**GAP-22: Disaster Recovery Runbook**

**22.1 DR Targets**

  ------------------------------------------------------------------------
  **Target**            **Value**    **Meaning**
  --------------------- ------------ -------------------------------------
  RPO (Recovery Point   1 hour       Maximum data loss acceptable ---
  Objective)                         WAL-based streaming replication
                                     provides near-continuous backup

  RTO (Recovery Time    4 hours      System must be back online within 4
  Objective)                         hours of declared disaster
  ------------------------------------------------------------------------

**22.2 Failover Procedure --- Step by Step**

\[00:00\] Incident detected --- monitoring alert fires or user report
received

\[00:05\] Incident commander (DevOps Lead) declares DR event; notifies
management via predefined contact list

\[00:10\] Assess failure scope: primary database down? API servers down?
Full DC failure?

\[00:20\] If primary PostgreSQL down: promote read replica to primary
using pg_promote()

\[00:25\] Update DATABASE_URL in Vault and perform NestJS rolling
restart pointing to new primary

\[00:30\] Verify application health: run smoke test script against key
endpoints

\[00:45\] If API servers down: provision new NestJS instances from
Docker image in container registry

\[01:00\] Communicate status to users: \"WCP is experiencing disruption;
estimated restoration by {RTO time}\"

\[02:00\] Monitor restored environment; verify data integrity with
record count checks

\[04:00\] RTO deadline --- escalate to vendor support if system not
restored

\[Post-recovery\] Root cause analysis within 48 hours; update runbook if
procedure gaps found

**22.3 Database Restore from WAL Backup**

+-----------------------------------------------------------------------+
| \# If both primary and replica are unavailable, restore from WAL      |
| backup:                                                               |
|                                                                       |
| 1\. Identify latest WAL archive in backup store:                      |
|                                                                       |
| aws s3 ls s3://wcp-wal-backups/ \--recursive \| sort \| tail -10      |
|                                                                       |
| 2\. Restore base backup to new PostgreSQL instance:                   |
|                                                                       |
| aws s3 cp s3://wcp-wal-backups/base.tar.gz /var/lib/postgresql/       |
|                                                                       |
| tar -xzf base.tar.gz -C /var/lib/postgresql/15/main/                  |
|                                                                       |
| 3\. Configure recovery.conf:                                          |
|                                                                       |
| restore_command = \'aws s3 cp s3://wcp-wal-backups/%f %p\'            |
|                                                                       |
| recovery_target_time = \'2024-03-15 10:00:00\' // Set to 1h before    |
| failure                                                               |
|                                                                       |
| 4\. Start PostgreSQL --- it will replay WAL until                     |
| recovery_target_time                                                  |
|                                                                       |
| 5\. Verify record counts match last known good state                  |
|                                                                       |
| 6\. Promote to primary: SELECT pg_promote();                          |
+-----------------------------------------------------------------------+

**22.4 Post-Recovery Validation Checklist**

-   Record count comparison: job_cards, audit_logs, stock_transactions
    within 0.1% of pre-failure counts

-   Smoke test all 6 E2E flows (abbreviated --- manual spot check)

-   Verify MinIO file store accessible and recent files readable

-   Confirm Redis cache cleared and freshly populated (no stale state)

-   Verify WebSocket connections restoring on client reconnect

-   Check SAP integration adapters reconnected and syncing

-   Confirm all background BullMQ jobs resumed processing

**Supplement Summary --- All 22 Gaps Filled**

This supplement provides complete design specifications for all 22
identified gaps in the WCP Super Master Plan. The table below summarises
what was added and the recommended integration point into the main
document.

  -----------------------------------------------------------------------------
  **Gap    **Title**              **Priority**   **Insert After Section**
  ID**                                           
  -------- ---------------------- -------------- ------------------------------
  GAP-01   Fuel & Lubricant       CRITICAL       Section 6 (Material Issue)
           Module                                

  GAP-02   Labour Management      CRITICAL       Section 6 (Material Issue)
           Module                                

  GAP-03   Preventive Maintenance CRITICAL       Section 9 (Anti-Fraud)
           Module                                

  GAP-04   External Repairs &     CRITICAL       Section 7 (Procurement)
           Subcontracting                        

  GAP-05   Quality Management     CRITICAL       Section 9 (Anti-Fraud)
           Module                                

  GAP-06   Full Test Strategy     SIGNIFICANT    Section 13
                                                 (Environment/DevOps)

  GAP-07   Offline Sync           SIGNIFICANT    Section 13
           Architecture                          (Environment/DevOps)

  GAP-08   Notification System    SIGNIFICANT    Section 11 (Cross-Module
           Design                                Guards)

  GAP-09   Reporting & MIS Module SIGNIFICANT    Section 15 (Deliverables)

  GAP-10   KPI Engine Design      SIGNIFICANT    Section 11 (Cross-Module
                                                 Guards)

  GAP-11   Document Management    SIGNIFICANT    Section 13
           System                                (Environment/DevOps)

  GAP-12   Multi-Workshop / Org   MODERATE       Section 3 (Backend Modules)
           Structure                             

  GAP-13   Data Migration Plan    MODERATE       Section 14 (Risk Register)

  GAP-14   UAT & Training Plan    MODERATE       Section 10 (Sprint Roadmap)

  GAP-15   Security Hardening     MODERATE       Section 13
           Specification                         (Environment/DevOps)

  GAP-16   Performance &          MODERATE       Section 13
           Scalability Targets                   (Environment/DevOps)

  GAP-17   Prisma Schema ---      MODERATE       Section 19 (Prisma Schema)
           Remaining Modules                     

  GAP-18   API Payloads ---       MODERATE       Section 20 (API Payloads)
           Remaining Modules                     

  GAP-19   Accessibility &        MINOR          Section 18 (Wireframes)
           Internationalisation                  

  GAP-20   Print Slip             MINOR          Section 6 (Material Issue)
           Specifications                        

  GAP-21   Device Registration    MINOR          Section 9 (Anti-Fraud)
           Workflow                              

  GAP-22   Disaster Recovery      MINOR          Section 14 (Risk Register)
           Runbook                               
  -----------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **✅ Next Step: Merge Into Main Document**                            |
|                                                                       |
| Each section of this supplement is ready to be inserted into the main |
| WCP Super Master Plan at the \"Insert After Section\" column above.   |
| The section numbering should be updated to continue the main          |
| document\'s numbering scheme. The Prisma schemas in GAP-17 extend     |
| Section 19 and the API payloads in GAP-18 extend Section 20 directly. |
+-----------------------------------------------------------------------+
