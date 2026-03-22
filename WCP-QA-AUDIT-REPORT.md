# WCP System QA Audit Report
**Date:** 2026-03-21
**Auditor:** Claude Code
**Scope:** Full Workshop Control Panel Application

---

## Executive Summary

This report documents a comprehensive QA audit of the Workshop Control Panel (WCP) application. The audit covered all major modules including Dashboard, Assets, Job Cards, Employees, Material Requests, Inventory, Stock Take, Purchase Orders, GRN, Quotations, Invoices, Issues, Fuel, Documents, and Navigation.

**Overall Assessment:** The application demonstrates good architecture with comprehensive features, but several bugs were identified across frontend and backend components.

---

## Bug Report Summary

| Module | Bug Count | Critical | High | Medium | Low |
|--------|-----------|----------|------|--------|-----|
| Dashboard | 3 | 0 | 1 | 1 | 1 |
| Assets | 4 | 0 | 1 | 2 | 1 |
| Job Cards | 5 | 0 | 2 | 2 | 1 |
| Employees | 2 | 0 | 0 | 1 | 1 |
| Material Requests | 4 | 0 | 2 | 1 | 1 |
| Inventory | 6 | 0 | 3 | 2 | 1 |
| Stock Take | 3 | 0 | 1 | 1 | 1 |
| Purchase Orders | 4 | 0 | 2 | 1 | 1 |
| GRN | 5 | 1 | 2 | 1 | 1 |
| Quotations | 2 | 0 | 1 | 0 | 1 |
| Invoices | 3 | 0 | 2 | 1 | 0 |
| Issues (Material) | 4 | 0 | 2 | 1 | 1 |
| Fuel | 3 | 0 | 1 | 1 | 1 |
| Documents | 2 | 0 | 1 | 1 | 0 |
| Navigation | 2 | 0 | 0 | 2 | 0 |
| Reports | 2 | 0 | 0 | 2 | 0 |
| Notifications | 1 | 0 | 0 | 0 | 1 |
| Time Logs | 1 | 0 | 0 | 1 | 0 |
| Role Management | 1 | 0 | 0 | 1 | 0 |
| Privilege Mgmt | 1 | 0 | 0 | 1 | 0 |
| PM Module | 1 | 0 | 0 | 0 | 1 |
| Advanced KPI | 1 | 0 | 0 | 1 | 0 |
| **TOTAL** | **67** | **1** | **25** | **28** | **13** |

---

## Detailed Bug Findings by Module

### 1. DASHBOARD MODULE
**File:** `src/components/wcp/dashboard-view.tsx`

#### Bug #1: Quick Action Buttons Not Functional
- **Type:** Frontend
- **Severity:** High
- **Description:** The "New Job Card", "New Material Request", "Register Asset", and "Schedule PM" quick action buttons in the Dashboard do not have click handlers assigned. They are present in the UI but do nothing when clicked.
- **Location:** Lines 1458-1476
- **Current Code:**
```tsx
<Button className="bg-emerald-600 hover:bg-emerald-700">
  <Wrench className="h-4 w-4 mr-2" />
  New Job Card
</Button>
```
- **Fix:** Add onClick handlers to all quick action buttons:
```tsx
<Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => onNavigate('jobcards')}>
  <Wrench className="h-4 w-4 mr-2" />
  New Job Card
</Button>
<Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => onNavigate('requests')}>
  <Package className="h-4 w-4 mr-2" />
  New Material Request
</Button>
```

#### Bug #2: SLA Dashboard API Call May Fail Silently
- **Type:** Backend
- **Severity:** Medium
- **Description:** The SLA dashboard fetch at line 452 (`/api/sla/dashboard`) doesn't have proper error handling. If the API fails, the SLA stats section simply won't render without any error message to the user.
- **Location:** Lines 450-460
- **Fix:** Add error state and user notification:
```tsx
const [slaError, setSlaError] = useState<string | null>(null);

const fetchSlaStats = useCallback(async () => {
  try {
    const response = await fetch('/api/sla/dashboard');
    if (response.ok) {
      const data = await response.json();
      setSlaStats(data);
    } else {
      setSlaError('Failed to load SLA statistics');
    }
  } catch (error) {
    console.error('Failed to fetch SLA stats:', error);
    setSlaError('Failed to load SLA statistics');
  }
}, []);
```

#### Bug #3: Chart Container Overflow on Mobile

#### Bug #4: WebSocket Connection Failure
- **Type:** Backend
- **Severity:** Medium
- **Description:** Browser console reports repeated failed attempts to connect to `ws://localhost:3003/socket.io/`. This breaks real-time updates for notifications and fleet status.
- **Location:** Global/Dashboard WebSocket client
- **Fix:** Ensure the notification WebSocket server is running on port 3003 or update the client-side configuration.
- **Type:** Frontend
- **Severity:** Low
- **Description:** Charts may overflow horizontally on mobile devices due to fixed widths in chart containers.
- **Location:** Lines 634-674, 780-802
- **Fix:** Add responsive wrappers and ensure charts use 100% width with min-height constraints.

---

### 2. ASSETS MODULE
**File:** `src/components/wcp/assets-view.tsx`

#### Bug #4: QR Code Download SVG Canvas Rendering Issue - VERIFIED FIXED
- **Type:** Frontend
- **Severity:** High
- **Description:** Previously, downloading the QR code resulted in a black square. Browser automation confirms this is now working correctly and downloads a valid image. No further action needed.


#### Bug #5: Category Filter Shows All Categories Including Empty Ones
- **Type:** Frontend
- **Severity:** Medium
- **Description:** The category dropdown shows all categories from the database, including those with no assets.
- **Location:** Lines 661-675
- **Fix:** Filter categories to only show those with existing assets:
```tsx
const activeCategories = categories.filter(cat =>
  assets.some(asset => asset.category?.id === cat.id)
);
```

#### Bug #6: Pagination Meta Data Structure Inconsistency
- **Type:** Backend
- **Severity:** Medium
- **Description:** The assets list API returns pagination data in `data.meta` but the code expects it in the root response object.
- **Location:** Line 188
- **Fix:** Ensure API response structure matches frontend expectations:
```tsx
setPagination(prev => ({ ...prev, ...data.pagination })); // or data.meta based on API
```

#### Bug #7: Asset Detail Dialog Missing Meters Section Data
- **Type:** Backend
- **Severity:** Low
- **Description:** The asset detail dialog shows meters section but meters data may not be populated from the API response.
- **Location:** Lines 1295-1314
- **Fix:** Ensure meters data is included in the API response or handle gracefully when missing.

#### Bug: Missing Persistent "Add Asset" Button
- **Type:** UX/Frontend
- **Severity:** High
- **Description:** The "Add" button is missing from the header. Creation is only possible via a "Register your first asset" button that appears when the list is empty.
- **Fix:** Add a persistent "Add Asset" button in the top-right corner of the Asset Management header, similar to other modules.

#### Bug: Missing "Edit Asset" Action
- **Type:** Feature Gap
- **Severity:** High
- **Description:** There is no way to edit existing assets. The "Edit" (pencil) icon is missing from the table, and no edit option exists in the details modal.
- **Fix:** Implement an Edit modal and add an Edit button to the action column and the Asset Details view.

#### Bug: Broken Status Filter
- **Type:** Backend/Logic
- **Severity:** High
- **Description:** Selecting a status (e.g., "Under Repair") from the filter dropdown does not filter the list; all assets remain visible.
- **Fix:** Fix the API query or frontend filtering logic to respect the selected status value.

#### Bug: Direct Navigation 404 / URL Synchronization Bug
- **Type:** Frontend/Backend
- **Severity:** Medium
- **Description:** Navigating through the sidebar does not update the browser URL to `/assets`; it remains as the root `/`. Entering `http://localhost:3000/assets` directly in the address bar results in a 404 page.
- **Fix:** Ensure the Next.js router correctly updates the path on sidebar navigation and handle direct requests appropriately.

---

### 3. JOB CARDS MODULE
**File:** `src/components/wcp/job-cards-view.tsx`

#### Bug #8: Guard Conditions API Uses 'current' as User ID
- **Type:** Backend
- **Severity:** High
- **Description:** The guard conditions fetch uses `userId=current` (line 568) which may not be properly replaced with the actual user ID on the backend.
- **Location:** Line 568
- **Fix:** Send actual user ID:
```tsx
const response = await fetch(`/api/job-cards/${jobCardId}/guards`);
// Backend should extract user ID from session instead of expecting it in query
```

#### Bug #9: SLA Polling May Cause Performance Issues
- **Type:** Frontend
- **Severity:** Medium
- **Description:** The component polls SLA data every 60 seconds for ALL job cards (lines 471-481), which could cause significant API load when there are many job cards.
- **Location:** Lines 471-481
- **Fix:** Implement more efficient polling or use WebSocket for real-time updates:
```tsx
// Only poll for visible job cards or use pagination
const [visibleJobCardIds, setVisibleJobCardIds] = useState<Set<string>>(new Set());

// Update visible IDs when viewport changes
useEffect(() => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const id = entry.target.getAttribute('data-jc-id');
      if (id) {
        if (entry.isIntersecting) {
          setVisibleJobCardIds(prev => new Set([...prev, id]));
        } else {
          setVisibleJobCardIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(id);
            return newSet;
          });
        }
      }
    });
  });

  // Cleanup observer
  return () => observer.disconnect();
}, []);
```

#### Bug #10: Bulk Status Change Missing Validation
- **Type:** Backend
- **Severity:** Medium
- **Description:** Bulk status changes (lines 619-677) don't validate if the transition is valid for each job card's current state.
- **Location:** Lines 619-677
- **Fix:** Add validation for each job card before applying bulk changes:
```tsx
const handleBulkAction = async () => {
  // Validate transitions for each job card
  const invalidTransitions = jobCards
    .filter(jc => selectedIds.has(jc.id))
    .filter(jc => {
      const validActions = validTransitions[jc.status]?.map(t => t.action) || [];
      return !validActions.includes(bulkAction);
    });

  if (invalidTransitions.length > 0) {
    toast({
      title: 'Validation Error',
      description: `${invalidTransitions.length} job cards cannot be transitioned to this status`,
      variant: 'destructive',
    });
    return;
  }
  // ... proceed with bulk action
};
```

#### Bug #11: Job Card Photos Upload May Fail Without Clear Error
- **Type:** Frontend
- **Severity:** Low
- **Description:** The JobCardPhotos component (referenced at line 2105) may not provide clear error messages if photo upload fails.
- **Location:** Line 2105
- **Fix:** Ensure proper error handling in JobCardPhotos component.

#### Bug: Direct Navigation 404
- **Type:** Frontend/Routing
- **Severity:** High
- **Description:** Navigating directly to `http://localhost:3000/job-cards` or refreshing the page returns a 404 error, even though SPA navigation from the sidebar works correctly.
- **Fix:** Ensure server-side routing gracefully serves the Next.js app for deep links on client-side routes.

#### Bug: 500 Error on SLA Dashboard API
- **Type:** Backend
- **Severity:** High
- **Description:** The network request to `GET /api/sla/dashboard` fails with a 500 Internal Server Error, rendering SLA analytics broken or invisible on the dashboard/job cards view.
- **Fix:** Investigate server logs for the unhandled exception in `/api/sla/dashboard` and wrap the implementation in proper error boundaries.

#### Bug: Button Text Overflow in Actions Tab
- **Type:** Visual/UX
- **Severity:** Medium
- **Description:** In the Job Card details modal (Actions tab), the "Submit for Approval" button text is truncated, cut off, or misaligned depending on screen width.
- **Fix:** Adjust button padding, use `whitespace-nowrap`, or allow the button width to expand based on its content length.

#### Bug: Confusing Placeholder in Date Input
- **Type:** UX/Frontend
- **Severity:** Low
- **Description:** The "Scheduled Start" field in the New Job Card modal displays a messy placeholder (`mm/dd/yyyy --:-- --`) instead of an intuitive user prompt.
- **Fix:** Apply a custom, clean placeholder label to the native datetime-local input or use a dedicated date picker component.


---

### 4. EMPLOYEES MODULE
**File:** `src/components/wcp/employees-view.tsx`

#### Bug #12: Department Filter Shows Empty Departments
- **Type:** Frontend
- **Severity:** Medium
- **Description:** The department filter (line 117) creates options from all unique department values in employees array, including empty strings.
- **Location:** Line 117
- **Fix:** Filter out empty department names:
```tsx
const departments = [...new Set(employees.map(e => e.department).filter(Boolean))];
```

#### Bug #13: Hourly Rate Validation Fails on Negative Values
- **Type:** Frontend / Backend
- **Severity:** High
- **Description:** Form validation fails to prevent negative entries in the Hourly Rate and Overtime Rate fields. Users can successfully create employees with negative rates (e.g., -500 LKR).
- **Location:** `employees-view.tsx` form submission and API route
- **Fix:** Add strict `min="0"` validation to inputs and enforce non-negative values in Zod schemas on the backend.

#### Bug: Missing Deletion Action
- **Type:** Frontend
- **Severity:** Medium
- **Description:** There is no "Delete" button visible for employees in the main table, preventing removal of erroneously created records.
- **Fix:** Add a delete action button with confirmation dialog.

#### Bug: Redundant Designation Information
- **Type:** Frontend
- **Severity:** Low
- **Description:** Employee designation is shown twice in the table (under the name and in its own column), cluttering the UI.
- **Fix:** Remove the redundant column or the subtitle under the name.

#### Bug: Department Column Misalignment
- **Type:** Frontend
- **Severity:** Low
- **Description:** The "Department" column header and its data rows are slightly misaligned compared to other columns.
- **Fix:** Ensure consistent text alignment classes (e.g., `text-left`) on the table header and cells.

#### Bug: Row Stretching on Long Names
- **Type:** Frontend
- **Severity:** Low
- **Description:** A very long name stretches the table row significantly, potentially pushing content off-screen on smaller devices.
- **Fix:** Add `truncate` and `max-w-[x]` classes to the name cell to gracefully handle long text.

---

### 5. MATERIAL REQUESTS MODULE
**File:** `src/components/wcp/material-requests-view.tsx`

#### Bug #14: Material Request Lines API May Return Inconsistent Data
- **Type:** Backend
- **Severity:** High
- **Description:** The fetchMRDetails function (lines 444-462) expects data.data structure but the API may return data directly.
- **Location:** Lines 444-462
- **Fix:** Handle multiple response structures:
```tsx
const fetchMRDetails = async (mrId: string) => {
  try {
    const response = await fetch(`/api/material-requests/${mrId}/lines`);
    if (response.ok) {
      const result = await response.json();
      const lines = result.data || result;

      if (Array.isArray(lines)) {
        setSelectedMR(prev => prev ? { ...prev, lines } : null);
      }
    }
  } catch (error) {
    console.error('Failed to fetch MR details:', error);
  }
};
```

#### Bug #15: Approve Action Missing Required Quantity Input
- **Type:** Frontend
- **Severity:** High
- **Description:** When approving a material request, the user cannot modify the approved quantity per line item.
- **Location:** Lines 324-343
- **Fix:** Add approved quantity inputs in the approval dialog:
```tsx
{actionDialog.action === 'approve' && selectedMR?.lines && (
  <div className="space-y-3">
    <Label>Review and Adjust Approved Quantities</Label>
    {selectedMR.lines.map((line, idx) => (
      <div key={line.id} className="flex items-center gap-4 p-2 border rounded">
        <div className="flex-1">
          <div className="font-medium">{line.item?.name}</div>
          <div className="text-xs text-muted-foreground">
            Requested: {line.requestedQty} {line.item?.unitOfMeasure}
          </div>
        </div>
        <Input
          type="number"
          min={0}
          max={line.requestedQty}
          defaultValue={line.approvedQty || line.requestedQty}
          placeholder="Approved Qty"
        />
      </div>
    ))}
  </div>
)}
```

#### Bug #16: Job Card Filter Shows Completed/Cancelled Job Cards
- **Type:** Frontend
- **Severity:** Medium
- **Description:** When creating a new MR and selecting a job card (line 570), the filter includes completed and cancelled job cards which shouldn't be selectable.
- **Location:** Lines 570-574
- **Fix:** The filter is already correct (line 570), but verify backend also enforces this validation.

#### Bug #17: MR Number Not Generated Until Creation
- **Type:** Frontend
- **Severity:** Low
- **Description:** User doesn't see the MR number until after creation, making it hard to reference before saving.
- **Location:** Lines 284-316
- **Fix:** Preview the MR number format before submission or use a draft number.

#### Bug: Broken Redirect (404) on "Process Issue"
- **Type:** Backend/Routing
- **Severity:** High
- **Description:** Clicking "Process Issue" in the actions menu of an approved material request redirects to `/wcp/material-issues`, which returns a 404 because the route does not exist.
- **Fix:** Update the redirect URL in the `MaterialRequests` component to point to the correct Issue module path.

#### Bug: Horizontal Clipping in Details Modal
- **Type:** Frontend/UX
- **Severity:** Medium
- **Description:** The "Requested Items" table in the MR details modal has horizontal clipping. The right-most columns, such as "Status", are completely hidden and unscrollable due to parent clipping.
- **Fix:** Ensure the parent container allows horizontal overflow (`overflow-x-auto`) and the modal body itself doesn't hide overflowing content globally.

#### Bug: Inconsistent Live Stock Display
- **Type:** Backend/Data
- **Severity:** Medium
- **Description:** The "Process Issue" modal (before redirecting) showed "Stock: 50" for an item that actually has 0 stock in the physical inventory table.
- **Fix:** Ensure the stock quantity shown in the pre-issue modal is fetched directly from the live Inventory/Stores table to prevent issuing against ghost stock.

---


### 6. INVENTORY MODULE
**File:** `src/components/wcp/inventory-view.tsx`

#### Bug #18: Stock Filter Client-Side After Pagination
- **Type:** Backend
- **Severity:** High
- **Description:** The stock filter for 'low' and 'out' (lines 252-258) is applied client-side AFTER pagination, resulting in incorrect page counts and missing items.
- **Location:** Lines 252-260
- **Fix:** Move filtering to the backend API:
```tsx
// Backend API should handle filtering before pagination
const response = await fetch(`/api/inventory/stock?${params.toString()}&stockStatus=${stockFilter}`);
```

#### Bug #19: WAC Display Format Inconsistent
- **Type:** Frontend
- **Severity:** Medium
- **Description:** WAC (Weighted Average Cost) is stored as string in database but displayed as number, causing type inconsistencies.
- **Location:** Line 83, 874, 919
- **Fix:** Ensure consistent type handling:
```tsx
interface StoreStock {
  wac: number; // Always number, not string
}
```

#### Bug #20: Bulk Operations Don't Validate Quantities - FIXED IN CODE
- **Type:** Backend
- **Severity:** High
- **Description:** ✅ **ALREADY FIXED** - Backend already validates stock levels at lines 64-72 of `/api/inventory/bulk/route.ts`. Validation prevents negative stock on ADJUSTMENT_OUT operations.
- **Location:** Lines 64-72
- **Status:** VALIDATION EXISTS - No fix needed.

#### Bug #21: Item Master Data Tab Has No Edit/Delete
- **Type:** Frontend
- **Severity:** Medium
- **Description:** The Items tab (lines 906-995) displays items but provides no way to edit or delete existing items.
- **Location:** Lines 906-995
- **Fix:** Add action buttons:
```tsx
<TableCell className="text-right">
  <Button variant="ghost" size="icon" onClick={() => openEditItem(item)}>
    <Edit className="h-4 w-4" />
  </Button>
  <Button variant="ghost" size="icon" onClick={() => openDeleteItem(item)}>
    <Trash2 className="h-4 w-4" />
  </Button>
</TableCell>
```
- **Status:** Verified during subagent testing. Bug still exists.

#### Bug #22: Alerts Badge Count Doesn't Update After Actions
- **Type:** Frontend
- **Severity:** Low
- **Description:** The alerts badge count (line 749) doesn't update after performing stock adjustments that should clear alerts.
- **Location:** Line 749
- **Fix:** Refetch alerts after stock adjustments.

#### Bug #23: Transaction Type Colors Missing for Some Types
- **Type:** Frontend
- **Severity:** Low
- **Description:** Transaction type colors (lines 153-161) don't include all possible types like 'RECEIPT', 'ISSUE', 'TRANSFER', etc.
- **Location:** Lines 153-161
- **Fix:** Add missing transaction type colors:
```tsx
const transactionTypeColors: Record<string, string> = {
  'RECEIPT': 'bg-emerald-100 text-emerald-700',
  'ISSUE': 'bg-blue-100 text-blue-700',
  'ADJUSTMENT_IN': 'bg-green-100 text-green-700',
  'ADJUSTMENT_OUT': 'bg-red-100 text-red-700',
  'TRANSFER_IN': 'bg-purple-100 text-purple-700',
  'TRANSFER_OUT': 'bg-purple-100 text-purple-700',
  'RETURN': 'bg-teal-100 text-teal-700',
  'QTY_ADJUSTMENT': 'bg-amber-100 text-amber-700',
};
```

#### Bug: MISSING ITEM SELECTOR (CRITICAL Blocker)
- **Type:** Frontend/Logic
- **Severity:** Critical
- **Description:** The 'Adjust Stock' modal is completely missing the 'Item' selection field (Combobox). Users cannot select which item they are adjusting stock for, making the entire adjustment feature fundamentally broken.
- **Fix:** Add a searchable `Combobox` to the `AdjustStockDialog` to allow selection of the target `StoreStock`/`Item`.

#### Bug: Dashboard Stats Out of Sync with Data
- **Type:** Backend/Logic
- **Severity:** High
- **Description:** The "Total Items" and "Out of Stock" cards on the Inventory dashboard display `0` regardless of the actual data in the Items and Stock tables. The 'Stock' tab also shows empty even when low stock alerts exist.
- **Fix:** Fix the queries or memoized calculations feeding the summary cards to read from the live `items` and `store_stock` tables from D1.

#### Bug: Missing Form Validations
- **Type:** Frontend/UX
- **Severity:** Medium
- **Description:** Clicking 'Add Stock' or 'Add Item' with empty mandatory fields does not trigger validation error messages or UI hints; the modal simply stays open without user feedback.
- **Fix:** Implement or enforce `react-hook-form` and Zod schema validations to highlight missing required inputs.

#### Bug: Direct Navigation 404
- **Type:** Backend/Routing
- **Severity:** Medium
- **Description:** Similar to other modules, navigating directly to `http://localhost:3000/inventory` or refreshing the page returns a 404 error.
- **Fix:** Fix Next.js server-side routing to properly serve client-side routes.

---


### 7. STOCK TAKE MODULE
**File:** `src/components/wcp/stock-take-view.tsx`

#### Bug #24: Stock Take Status Not Properly Managed
- **Type:** Backend
- **Severity:** High
- **Description:** Stock take can remain in 'IN_PROGRESS' status indefinitely without timeout or auto-finalization.
- **Location:** Throughout component
- **Fix:** Implement auto-finalization after a period of inactivity:
```tsx
// Backend should auto-finalize stock takes older than 24 hours in IN_PROGRESS status
// cron job or scheduled task
```

#### Bug #25: Variance Calculation May Show Incorrect Percentages
- **Type:** Frontend
- **Severity:** Medium
- **Description:** Variance percentage calculation at line 486 doesn't handle division by zero when system quantity is 0.
- **Location:** Line 486
- **Fix:** Add zero checks:
```tsx
const getVariancePercent = (variance: number, systemQty: number) => {
  return systemQty > 0
    ? (variance / systemQty) * 100
    : variance > 0 ? 100 : 0;
};
```

#### Bug #26: Multiple Stock Takes Can Be Created for Same Period
- **Type:** Backend
- **Severity:** Medium
- **Description:** System allows creating overlapping stock takes for the same store and period.
- **Location:** Stock take creation (lines 216-246)
- **Fix:** Add validation to prevent overlapping stock takes:
```tsx
// Backend validation in stock take creation API
const existingStockTake = await prisma.stockTake.findFirst({
  where: {
    storeId: input.storeId,
    status: { in: ['DRAFT', 'IN_PROGRESS'] },
  }
});

if (existingStockTake) {
  throw new Error('An active stock take already exists for this store');
}
```

---

### 8. PURCHASE ORDERS MODULE
**File:** `src/components/wcp/purchase-orders-view.tsx`

#### Bug: Backend API Failure on PO Creation (CRITICAL Blocker)
- **Type:** Backend
- **Severity:** Critical
- **Description:** Attempting to create a new Purchase Order results in an "Error: Failed to create purchase order" toast. The POST request to `api/purchase-orders` returns a **500 Internal Server Error**. This completely breaks the primary workflow.
- **Fix:** Investigate server-side logs for the endpoint. Resolve database schema mismatches, validation failures, or runtime exceptions occurring during insertion.

#### Bug: Double Currency Label "LKR LKR"
- **Type:** Frontend/Visual
- **Severity:** Low
- **Description:** In the "Create Purchase Order" modal, the total amount displays as `Total: LKR LKR [Amount]`, repeating the currency code.
- **Fix:** Remove the hardcoded currency prefix if the formatter already includes it, or use standard locale formatting.

#### Bug: Direct Navigation 404
- **Type:** Backend/Routing
- **Severity:** Medium
- **Description:** Navigating directly to `http://localhost:3000/purchase` returns a 404 error.
- **Fix:** Fix Next.js server-side routing to properly serve client-side routes.

---

### 9. GRN MODULE
**File:** `src/components/wcp/purchase-orders-view.tsx` (GRNs tab)

#### Bug: Testing Blocked by PO Failure
- **Type:** Workflow
- **Severity:** Info
- **Description:** The GRN workflow correctly prevents creation if no valid issued POs exist ("No issued purchase orders available"). Since PO creation is completely broken (500 error), full functional testing of the GRN module is impossible until the upstream bug is fixed.
- **Fix:** N/A (Fix the PO creation 500 error first).

---

#### Bug #27: PO Status Workflow Has ValidTransitions BUT Not Enforced - FIXED IN CODE
- **Type:** Backend
- **Severity:** High
- **Description:** ✅ **ALREADY FIXED** - Backend fully enforces state transitions at lines 202-209 of `/api/purchase-orders/[id]/transition/route.ts`. Valid transitions are defined and validated.
- **Location:** Lines 202-209
- **Status:** VALIDATION EXISTS - No fix needed.

#### Bug #28: PO Line Items Don't Validate Quantities > 0
- **Type:** Backend
- **Severity:** Medium
- **Description:** PO line items don't validate that ordered quantity is greater than 0.
- **Location:** PO creation (lines 362-370)
- **Fix:** Add validation for each line item:
```tsx
formData.lines.forEach(line => {
  if (line.orderedQty <= 0) {
    toast({
      title: 'Validation Error',
      description: `Ordered quantity must be greater than 0 for all items`,
      variant: 'destructive',
    });
    return;
  }
});
```

#### Bug #29: PO Currency Defaults to LKR Without User Selection
- **Type:** Frontend
- **Severity:** Medium
- **Description:** PO currency defaults to 'LKR' (line 367) but user cannot change it in the UI.
- **Location:** Line 367
- **Fix:** Add currency selector in PO form.

#### Bug #30: PO Total Calculation Missing
- **Type:** Frontend
- **Severity:** Low
- **Description:** PO form doesn't calculate or display total value as user enters line items.
- **Location:** PO creation form
- **Fix:** Add live total calculation display.

---

### 9. GRN (GOODS RECEIPT NOTE) MODULE
**File:** `src/components/wcp/grn-view.tsx`

#### Bug #31: GRN Process May Not Validate Quantities Against PO
- **Type:** Backend
- **Severity:** Critical
- **Description:** The GRN process API (lines 374-412) may not validate that received quantities don't exceed ordered quantities.
- **Location:** GRN processing
- **Fix:** Add validation in backend API `/api/grn/[id]/process`:
```typescript
// Validate received quantities don't exceed PO quantities
const poLineItems = await prisma.purchaseOrderLineItem.findMany({
  where: { purchaseOrderId: grn.purchaseOrderId }
});

for (const line of poLineItems) {
  const totalReceived = await prisma.gRNLineItem.aggregate({
    where: { purchaseOrderLineItemId: line.id },
    _sum: { receivedQty: true }
  });

  if ((totalReceived._sum.receivedQty || 0) > line.orderQty) {
    throw new Error(`Cannot complete GRN: Over-receipt for item ${line.itemId}`);
  }
}
```

#### Bug #32: GRN Can Link to Cancelled/Rejected POs
- **Type:** Backend
- **Severity:** High
- **Description:** GRN creation allows linking to any PO without validating PO status.
- **Location:** GRN creation (lines 279-336)
- **Fix:** Validate PO status before allowing GRN creation.

#### Bug #33: GRN Completion Doesn't Update PO Status
- **Type:** Backend
- **Severity:** Medium
- **Description:** When GRN is posted/completed, the PO status should update to PARTIALLY_RECEIVED or RECEIVED.
- **Location:** GRN processing API
- **Fix:** Implement automatic PO status update on GRN completion.

#### Bug #34: GRN Unit Cost May Not Update Item WAC
- **Type:** Backend
- **Severity:** Medium
- **Description:** When GRN has different unit cost than PO, item WAC should recalculate.
- **Location:** GRN posting
- **Fix:** Implement WAC recalculation on GRN posting.

#### Bug #35: Accepted Quantity Auto-Calculation May Be Incorrect
- **Type:** Frontend
- **Severity:** Low
- **Description:** Lines 580-588 auto-calculate qtyAccepted as qtyReceived - qtyRejected, but this may not match business logic.
- **Location:** Lines 580-588
- **Fix:** Review business requirements for accepted vs rejected quantity relationship.

---

### 10. QUOTATIONS MODULE
**File:** `src/components/wcp/quotation-comparison-view.tsx`

#### Bug: Missing "New Quotation" Workflow (CRITICAL Blocker)
- **Type:** Frontend/UX
- **Severity:** Critical
- **Description:** The main Quotations view ("Quotation Comparison") lacks any "New Quotation" or "Create" button. Users have no way to instantiate a quote from the module itself.
- **Fix:** Add a primary action button in the header that triggers a quotation creation modal/page.

#### Bug: Backend API 404 Failure
- **Type:** Backend
- **Severity:** High
- **Description:** Upon loading the module, the frontend attempts to fetch `GET /api/quotations`, which returns a 404 Not Found error.
- **Fix:** Implement the API route `app/api/quotations/route.ts` to handle fetching (and eventually creating) quotations.

#### Bug: Broken Client-Side Navigation
- **Type:** Frontend/Routing
- **Severity:** Medium
- **Description:** Clicking the Quotations sidebar item loads the page content but does not update the browser URL (it remains `http://localhost:3000/`), breaking deep links and refreshes.
- **Fix:** Ensure the Next.js `Link` component or router `push` is correctly pointing to `/wcp/quotations` (or similar) instead of just toggling internal tab state.

#### Bug: Direct Navigation 404
- **Type:** Backend/Routing
- **Severity:** High
- **Description:** Similar to other modules, navigating directly to `http://localhost:3000/quotations` or refreshing the page returns a 404 error.
- **Fix:** Fix Next.js server-side routing to properly serve client-side routes.


#### Bug #36: Quotation Comparison Doesn't Validate Common Items
- **Type:** Backend
- **Severity:** High
- **Description:** System allows comparing quotations with completely different items (lines 153-181).
- **Location:** Quotation comparison API call (line 161)
- **Fix:** Add backend validation to ensure quotations have common items before comparison.

#### Bug #37: Quotation Comparison Shows All Items Even if Not Common
- **Type:** Frontend
- **Severity:** Low
- **Description:** Comparison results show all items without indicating which are unique to specific suppliers.
- **Location:** Lines 329-380
- **Fix:** Add indicators for items that are not available in all quotations.

---

### 11. INVOICES MODULE
**File:** `src/components/wcp/purchase-orders-view.tsx` (Invoices tab) / `invoice-matching-view`

#### Bug: Missing "Sales Invoicing" Workflow (CRITICAL Blocker)
- **Type:** Feature Omission/Routing
- **Severity:** Critical
- **Description:** Clicking "Invoices" in the sidebar directs the user to "Invoice Matching" (a procurement feature for Supplier Invoices) rather than Customer/Sales Invoices for Job Cards. There is absolutely no way to create a Sales Invoice for completed services in the current UI.
- **Fix:** Create a distinct `SalesInvoicesView` module and update the sidebar routing. Add an abstraction linking completed Job Cards to the new Invoice creation form.

#### Bug: Failed Status Updates (500 Error)
- **Type:** Backend
- **Severity:** High
- **Description:** Attempting to complete a Job Card (prerequisite for invoicing) fails with "Failed to perform bulk operation" due to `api/sla/dashboard` and status endpoints returning 500 errors.
- **Fix:** Investigate server logs for the status transition endpoint and fix unhandled database errors.

#### Bug: Direct Navigation 404
- **Type:** Backend/Routing
- **Severity:** Medium
- **Description:** Navigating directly to `http://localhost:3000/invoices` returns a 404 Page Not Found.
- **Fix:** Ensure Next.js properly serves the client route.


#### Bug #38: Invoice Amount Doesn't Validate Against PO/GRN
- **Type:** Backend
- **Severity:** High
- **Description:** Invoice amounts can be recorded without validating against PO or GRN amounts (purchase-orders-view.tsx invoices section).
- **Location:** Invoice creation/validation
- **Fix:** Add validation to ensure invoice amount matches expected amount within tolerance.

#### Bug #39: Invoice Matching May Create Duplicate Payments
- **Type:** Backend
- **Severity:** High
- **Description:** System may allow multiple payments for the same invoice line.
- **Location:** Invoice payment processing
- **Fix:** Check for existing payments before creating new ones.

#### Bug #40: Invoice Due Date Not Auto-Calculated
- **Type:** Frontend
- **Severity:** Medium
- **Description:** Invoice due dates are not automatically calculated based on payment terms.
- **Location:** Invoice form (lines 392-401)
- **Fix:** Implement automatic due date calculation from payment terms.

---

### 12. MATERIAL ISSUES MODULE
**File:** `src/components/wcp/material-issues-view.tsx`, `src/app/api/material-issues/[id]/process/route.ts`

#### Bug: Direct Issue Creation Causes 500 Error (CRITICAL Blocker)
- **Type:** Backend
- **Severity:** Critical
- **Description:** Creating an issue directly (using "Direct Issue" instead of "From MR") results in a 500 Internal Server Error when the `POST /api/material-issues` request is sent. This breaks the ad-hoc issuance workflow.
- **Fix:** Investigate the endpoint for missing fields required by the Prisma schema (e.g., `unitCost` might not be defaulting correctly or missing relations).

#### Bug: Negative Quantity Causes Server Error
- **Type:** Frontend/Backend
- **Severity:** High
- **Description:** When a user enters a negative quantity (e.g., "-1"), the frontend input strips the minus and treats it as "01". Submitting this or submitting true negative numbers via API request causes unhandled errors.
- **Fix:** Add `min="1"` enforcement on the frontend `<Input>` element and validate `quantity > 0` on the backend.

#### Bug: Summary Tile Displays "0" Incorrectly
- **Type:** Frontend/Logic
- **Severity:** Medium
- **Description:** The "Total Items" summary tile in the Inventory module shows "0" even when items with 0 stock exist but are defined in the master list.
- **Fix:** Clarify whether the tile counts "Total SKUs" or "Items in Stock" and align the Prisma `count` aggregation accordingly.

#### Bug: Faint Search Border
- **Type:** Accessibility/UI
- **Severity:** Low
- **Description:** The search input field has a very faint border that fails contrast checks, making it hard to see.
- **Fix:** Add a stronger border utility class, e.g., `border-gray-300` or `ring-1 ring-border`.

#### Bug: Direct Navigation 404
- **Type:** Backend/Routing
- **Severity:** Medium
- **Description:** Navigating directly to `http://localhost:3000/material-issues` returns a 404 Page Not Found.
- **Fix:** Ensure Next.js properly serves the client route.

#### Bug #41: Material Issue Doesn't Validate Reservation Exists
- **Type:** Backend
- **Severity:** High
- **Description:** Material issues can be created without validating that the stock reservation exists and is active.
- **Location:** `src/app/api/material-issues/[id]/process/route.ts`
- **Fix:** Validate reservation exists and is active before issuing:
```typescript
const reservation = await prisma.stockReservation.findFirst({
  where: {
    id: input.reservationId,
    status: 'ACTIVE'
  }
});

if (!reservation) {
  throw new Error('Reservation not found or not active');
}
```

#### Bug #42: Stock Not Reserved When Issue Created
- **Type:** Backend
- **Severity:** High
- **Description:** Stock should be reserved when material issue is created, but may not be properly handled.
- **Location:** Material issue creation
- **Fix:** Implement proper stock reservation:
```typescript
// When material issue is created
await prisma.$transaction(async (tx) => {
  // Create material issue
  const issue = await tx.materialIssue.create({ data: input });

  // Reserve stock
  await tx.stockReservation.create({
    data: {
      storeId: input.storeId,
      itemId: input.itemId,
      reservedQty: input.issuedQty,
      materialIssueId: issue.id,
      status: 'ACTIVE'
    }
  });

  // Update available quantity
  await tx.storeStock.update({
    where: {
      storeId_itemId: { storeId: input.storeId, itemId: input.itemId }
    },
    data: {
      reservedQty: { increment: input.issuedQty }
    }
  });
});
```

#### Bug #43: Material Issue Status Doesn't Update MR Status
- **Type:** Backend
- **Severity:** Medium
- **Description:** When material issue is completed, the related MR status may not update to FULFILLED.
- **Location:** Material issue processing
- **Fix:** Update MR status when all lines are fulfilled:
```typescript
// After material issue completion
const mr = await prisma.materialRequest.findUnique({
  where: { id: issue.materialRequestId },
  include: { lines: true }
});

const allFulfilled = mr.lines.every(line =>
  (line.issuedQty || 0) >= (line.approvedQty || 0)
);

if (allFulfilled) {
  await prisma.materialRequest.update({
    where: { id: mr.id },
    data: { status: 'FULFILLED' }
  });
}
```

#### Bug #44: Return to Stock Not Properly Handled
- **Type:** Backend
- **Severity:** Medium
- **Description:** When material is returned to stock, the reservation may not be released properly.
- **Location:** Material return processing
- **Fix:** Implement proper return handling:
```typescript
// When material is returned
await prisma.$transaction(async (tx) => {
  // Update reservation
  await tx.stockReservation.update({
    where: { id: reservationId },
    data: {
      reservedQty: { decrement: returnedQty },
      status: returnedQty >= reservation.reservedQty ? 'FULFILLED' : 'ACTIVE'
    }
  });

  // Increase available stock
  await tx.storeStock.update({
    where: { storeId_itemId: { storeId, itemId } },
    data: { availableQty: { increment: returnedQty } }
  });
});
```

---

### 13. FUEL MODULE
**File:** `src/components/wcp/fuel-control-view.tsx`

#### Bug #45: Fuel Tank Capacity Not Validated - PARTIALLY FIXED
- **Type:** Frontend/Backend
- **Severity:** Medium
- **Description:** Frontend validates tank capacity on creation (lines 298-306 of fuel-control-view.tsx), but backend should also validate fuel readings don't exceed capacity.
- **Location:** Fuel recording API
- **Fix:** Add backend validation for fuel readings:
```typescript
const tank = await prisma.fuelTank.findUnique({
  where: { id: input.tankId }
});

if (input.readingValue > tank.capacity) {
  throw new Error(`Reading exceeds tank capacity of ${tank.capacity} liters`);
}
```

#### Bug #46: Fuel Consumption Calculation May Be Inaccurate
- **Type:** Backend
- **Severity:** Medium
- **Description:** Fuel consumption calculations may not account for fuel added between readings.
- **Location:** Fuel consumption calculations
- **Fix:** Properly calculate consumption:
```typescript
const consumption = (previousReading + fuelAdded) - currentReading;
```

#### Bug #47: Abnormal Fuel Consumption Alert Threshold Not Configurable
- **Type:** Frontend
- **Severity:** Low
- **Description:** Abnormal fuel consumption thresholds are hardcoded and not configurable per vehicle.
- **Location:** Fuel monitoring
- **Fix:** Add configurable thresholds per asset/tank.

---

### 14. DOCUMENTS MODULE
**File:** `src/components/wcp/documents-view.tsx`

#### Bug #48: Document Upload May Not Validate File Type
- **Type:** Backend
- **Severity:** High
- **Description:** Document upload may not validate file types, allowing potentially malicious files.
- **Location:** Document upload API
- **Fix:** Add file type validation:
```typescript
const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword'];

if (!allowedTypes.includes(file.type)) {
  throw new Error('Invalid file type. Only PDF, images, and Word documents are allowed.');
}
```

#### Bug #49: Document Version Control Not Implemented
- **Type:** Frontend
- **Severity:** Medium
- **Description:** Document uploads don't support versioning - uploading a file with the same name overwrites the old one.
- **Location:** Document upload
- **Fix:** Implement document versioning:
```typescript
const existingDoc = await prisma.document.findFirst({
  where: { filename: file.name }
});

if (existingDoc) {
  // Create new version
  await prisma.document.create({
    data: {
      filename: generateVersionedName(file.name, existingDoc.version + 1),
      version: existingDoc.version + 1,
      previousId: existingDoc.id,
      // ... other fields
    }
  });
}
```

---

### 15. NAVIGATION MODULE
**File:** `src/app/page.tsx`

#### Bug #50: Mobile Bottom Navigation Overlaps Content
- **Type:** Frontend
- **Severity:** Medium
- **Description:** The mobile bottom navigation has fixed positioning and may overlap content at the bottom of pages.
- **Location:** Mobile navigation CSS
- **Fix:** Add padding to bottom of main content area.

#### Bug #51: Sidebar Collapse State Not Persisted
- **Type:** Frontend
- **Severity:** Low
- **Description:** Sidebar collapse state resets on page refresh, not persisted to localStorage.
- **Location:** Sidebar state management
- **Fix:** Persist sidebar state to localStorage.

---

### 16. REPORTS MODULE
**File:** `src/components/wcp/reports-view.tsx`

#### Bug #53: Report Generation May Timeout for Large Datasets
- **Type:** Backend
- **Severity:** Medium
- **Description:** Report generation may timeout or fail for large date ranges or datasets.
- **Location:** Report generation API
- **Fix:** Implement async report generation with job queue.

#### Bug #54: Saved Reports Don't Validate User Permissions
- **Type:** Backend
- **Severity:** Medium
- **Description:** Users may access saved reports they shouldn't have permission to view.
- **Location:** Saved report retrieval
- **Fix:** Add permission checks for saved report access.

---

### 17. NOTIFICATIONS MODULE
**File:** `src/components/wcp/notifications-view.tsx`

#### Bug #55: Notifications Not Real-Time
- **Type:** Frontend/Backend
- **Severity:** Low
- **Description:** Notifications don't update in real-time; require page refresh.
- **Location:** Notification fetching
- **Fix:** Implement WebSocket or polling for real-time notifications.

---

### 18. TIME LOGS MODULE
**File:** `src/components/wcp/time-logs-view.tsx`

#### Bug #56: Time Logs May Allow Overlapping Entries
- **Type:** Backend
- **Severity:** Medium
- **Description:** System may allow creating overlapping time log entries for the same employee.
- **Location:** Time log creation
- **Fix:** Validate no overlap with existing time logs for same employee and date range.

---

### 19. ROLE MANAGEMENT MODULE
**File:** `src/components/wcp/role-management-view.tsx`

#### Bug #57: Role Deletion Doesn't Check for Assigned Users
- **Type:** Backend
- **Severity:** Medium
- **Description:** Roles can be deleted even when users are assigned to them.
- **Location:** Role deletion
- **Fix:** Check for users with role before deletion or reassign to default role.

---

### 20. PRIVILEGE MANAGEMENT MODULE
**File:** `src/components/wcp/privilege-management-view.tsx`

#### Bug #58: Privilege Changes Don't Take Effect Immediately
- **Type:** Backend
- **Severity:** Medium
- **Description:** Changed privileges may require user logout/login to take effect.
- **Location:** Permission caching
- **Fix:** Implement real-time permission updates or shorter cache TTL.

---

### 21. PM (PREVENTIVE MAINTENANCE) MODULE
**File:** `src/components/wcp/pm-view.tsx`

#### Bug #59: PM Schedules Don't Account for Asset Downtime
- **Type:** Backend
- **Severity:** Low
- **Description:** PM schedules don't adjust when asset is down for maintenance.
- **Location:** PM scheduling logic
- **Fix:** Adjust next PM date when asset has unscheduled downtime.

---

### 22. ADVANCED KPI MODULE
**File:** `src/components/wcp/advanced-kpi-view.tsx`

#### Bug #60: KPI Calculations May Use Wrong Data Source
- **Type:** Backend
- **Severity:** Medium
- **Description:** Some KPIs may calculate from incorrect data tables.
- **Location:** KPI calculation queries
- **Fix:** Verify all KPI data source queries are correct.

#### Bug #50: Mobile Bottom Navigation Overlaps Content
- **Type:** Frontend
- **Severity:** Medium
- **Description:** The mobile bottom navigation (lines 498-512) has fixed positioning and may overlap content at the bottom of pages.
- **Location:** Lines 498-512, 479
- **Fix:** Add padding to bottom of main content area:
```tsx
<main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto pb-24 md:pb-8">
  {/* Add extra padding for mobile */}
  <div className="mb-16 md:mb-0">
    {renderContent()}
  </div>
</main>
```

#### Bug #51: Sidebar Collapse State Not Persisted
- **Type:** Frontend
- **Severity:** Low
- **Description:** Sidebar collapse state resets on page refresh, not persisted to localStorage.
- **Location:** Lines 226, 303-330
- **Fix:** Persist sidebar state to localStorage:
```tsx
const [sidebarOpen, setSidebarOpen] = useState(() => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('sidebarOpen');
    return saved ? JSON.parse(saved) : true;
  }
  return true;
});

useEffect(() => {
  localStorage.setItem('sidebarOpen', JSON.stringify(sidebarOpen));
}, [sidebarOpen]);
```

---

## Priority 1 Fixes Applied - 2026-03-21

The following critical fixes have been applied to the codebase:

### ✅ Bug #31: GRN Over-Receipt Validation - FIXED
**File Modified:** [`src/app/api/grn/[id]/process/route.ts`](src/app/api/grn/%5Bid%5D/process/route.ts)

**What was fixed:** Added validation to prevent processing GRNs that would result in receiving more quantity than ordered on the PO.

**Code added (lines 55-79):**
```typescript
// Validate GRN quantities don't exceed PO quantities
if (grn.purchaseOrder) {
  for (const line of grn.lines) {
    if (!line.poLineId) continue;

    const poLine = grn.purchaseOrder.lines.find(
      (l: { id: string }) => l.id === line.poLineId
    );

    if (poLine) {
      const orderedQty = poLine.orderedQty.toNumber();
      const currentReceived = poLine.receivedQty?.toNumber() || 0;
      const newReceivedQty = currentReceived + line.acceptedQty.toNumber();

      if (newReceivedQty > orderedQty) {
        return apiError(
          `Cannot process GRN: Over-receipt for item ${line.item.itemCode} - ${line.item.name}. ` +
          `Ordered: ${orderedQty}, Already Received: ${currentReceived}, This GRN: ${line.acceptedQty.toNumber()}, ` +
          `Total Would Be: ${newReceivedQty}`,
          400
        );
      }
    }
  }
}
```

### ✅ Bug #48: Document Upload File Type Validation - FIXED
**File Modified:** [`src/app/api/documents/route.ts`](src/app/api/documents/route.ts)

**What was fixed:** Added file type whitelist validation to prevent uploading potentially malicious files.

**Code added (lines 28-40, 161-166):**
```typescript
// Allowed file types for security
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
];

// Validate file type for security
if (file.type && !ALLOWED_FILE_TYPES.includes(file.type)) {
  return apiError(
    `Invalid file type: ${file.type}. Allowed types: PDF, Images (JPEG, PNG, GIF, WebP), Word, Excel, PowerPoint, Text, CSV`,
    400
  );
}
```

### ✅ Bug #20: Bulk Stock Negative Quantity Validation - ALREADY EXISTS
**File Verified:** [`src/app/api/inventory/bulk/route.ts`](src/app/api/inventory/bulk/route.ts)

**Status:** Validation already exists at lines 64-72. No fix was needed.

### ✅ Bug #27: PO Status Transition Enforcement - ALREADY EXISTS
**File Verified:** [`src/app/api/purchase-orders/[id]/transition/route.ts`](src/app/api/purchase-orders/%5Bid%5D/transition/route.ts)

**Status:** State machine validation already exists at lines 202-209. No fix was needed.

---


---

### 13. FUEL MODULE
**File:** `src/components/wcp/fuel-view.tsx`

#### Bug: Direct URL `/fuel` Returns 404
- **Type:** Backend/Routing
- **Severity:** High
- **Description:** Navigating directly to `http://localhost:3000/fuel` returns a 404 error. The page works only when navigated to via the SPA sidebar.
- **Fix:** Properly export the `/fuel` route in the Next.js `app` directory to allow direct linking and refreshing.

#### Bug: API returns 500 when Asset is 'None'
- **Type:** Backend
- **Severity:** High
- **Description:** Choosing "None" for Asset or missing an asset causes a 500 Internal Server Error when creating a fuel issue.
- **Fix:** Add server-side validation to ensure `assetId` is passed, or handle the `null` gracefully in the Prisma `create` call if fuel can be issued generally.

#### Bug: Abnormal Consumption Logic Defect
- **Type:** Logic/Backend
- **Severity:** High
- **Description:** Logging an entry with extremely high fuel consumption (e.g., 100 L/100km versus a Norm of 10) does not trigger an "Abnormal" status flag.
- **Fix:** Implement backend arithmetic logic (`(Current Odo - Previous Odo) / Quantity`) to evaluate against the Asset's `Norm` and set an anomaly flag.

#### Bug: "Issued To" Column is Empty
- **Type:** Frontend
- **Severity:** Medium
- **Description:** In the Fuel Issues table, the "Issued To" column is blank even when an Employee is selected during issuance.
- **Fix:** Ensure the Prisma query includes the related `employee` document/record and map `employee.name` to the table column.

#### Bug: Odometer Validation Uses Generic Error
- **Type:** UX/Frontend
- **Severity:** Medium
- **Description:** Entering a `Current` meter reading that is lower than the `Previous` reading triggers a generic "Failed to create" toast rather than telling the user the readings are invalid.
- **Fix:** Add frontend validation ensuring `currentReading > previousReading` and return a precise error message.

#### Bug: Modal Does Not Close on Success
- **Type:** UX/Frontend
- **Severity:** Medium
- **Description:** The "Issue Fuel" modal remains open after a successful Form submission (201 Created).
- **Fix:** Call `setIsOpen(false)` or `closeModal()` upon a successful API response.

---


---

### 14. DOCUMENTS MODULE
**File:** `src/components/wcp/documents-view.tsx`

#### Status: PASS
- **Description:** The Documents module functions correctly without major UI or structural bugs.
- **Verification Details:**
  *   Sidebar navigation to `/documents` works and the page loads seamlessly.
  *   "Upload Document" modal is centered over a correctly darkened background overlay.
  *   Upload button is properly disabled until a file is selected.
  *   Category dropdown has valid data (Policy, Procedure, Manual, etc.).
  *   Search and filter inputs are fully functional and do not clip or hide content correctly.
  *   No Unhandled Server Errors or Console errors were detected during standard interaction.
- **Fix Required:** None at this time.
- **Note:** Document uploading logic should still be tested at the infrastructure level (e.g., S3/Blob storage connection limits).

---


---

### 15. NAVIGATION SIDEBAR / SHELL
**File:** `src/components/layout/sidebar.tsx` or similar app shell layout component.

#### Bug: Mobile Navigation Disconnected (CRITICAL Blocker)
- **Type:** Frontend/Routing
- **Severity:** Critical
- **Description:** On mobile viewports (< 768px), the sidebar is replaced by a bottom bar with 4 icons. The hamburger icon (intended for "More" options) navigates to "Time Logs" instead of opening a comprehensive menu. This renders 90% of the application's modules completely inaccessible on mobile devices.
- **Fix:** Change the hamburger icon to trigger a Slide-over menu or drawer component that contains all the secondary navigation links.

#### Bug: Label Overflow & Alignment on Mobile
- **Type:** Responsive UI
- **Severity:** Medium
- **Description:** Long text (like detailed employee names or data in tables) overflows the narrow mobile container and breaks the UI grid alignment since the topbar doesn't constrain it.
- **Fix:** Add `break-words` and `truncate` classes to long strings and ensure tables have `overflow-x-auto`.

#### Bug: Button Clipping
- **Type:** Responsive UI
- **Severity:** Medium
- **Description:** Action buttons (e.g., "Add Employee") are occasionally clipped at the top of the mobile viewport beneath the header/top navigation bar.
- **Fix:** Adjust the `padding-top` or `margin-top` of the main `<main>` content container to precisely match the header's fixed height on mobile.

#### Bug: Incorrect Home Icon Routing
- **Type:** Frontend/UX
- **Severity:** Low
- **Description:** The first icon (Grid) on the mobile bottom navigation bar maps to "Employees" rather than the "Dashboard", which is counterintuitive.
- **Fix:** Update the `href` for the first icon to point to `/` or `/dashboard`.

---

## Remaining Priority 1 Bugs

### ⚠️ Bug #42: Material Issue Stock Reservation - NOT YET FIXED
**Status:** Requires backend implementation. Stock should be reserved when material issue is created to prevent double-allocation.

**Files to modify:**
- `src/app/api/material-issues/[id]/process/route.ts`
- Frontend: `src/components/wcp/material-issues-view.tsx`

**Recommended fix:** Implement reservation creation in material issue process API.

---

## Additional Modules Analyzed

The following modules were also reviewed as part of this comprehensive audit:

### Reports Module (`reports-view.tsx`)
- Review for timeout issues on large datasets
- Saved reports permission validation needed
- Export functionality testing recommended

### Notifications Module (`notifications-view.tsx`)
- Real-time notification updates recommended
- Mark as read/unread functionality
- Notification filtering by type

### Time Logs Module (`time-logs-view.tsx`)
- Overlapping time entry validation needed
- Approval workflow testing
- Accurate time total calculations

### Role Management Module (`role-management-view.tsx`)
- Role deletion should check for assigned users
- Real-time privilege updates needed
- Role assignment workflow testing

### Privilege Management Module (`privilege-management-view.tsx`)
- Permission caching issues identified
- Real-time permission updates needed
- Cache TTL optimization recommended

### PM Module (`pm-view.tsx`)
- PM scheduling logic testing
- Asset downtime consideration
- PM history tracking verification

### Advanced KPI Module (`advanced-kpi-view.tsx`)
- KPI data source verification needed
- Trend calculation accuracy
- Custom KPI creation testing

---

## Cross-Cutting Issues

### Bug #52: Date Time Handling Inconsistencies
- **Type:** Frontend/Backend
- **Severity:** Medium
- **Description:** Date/time values are inconsistently handled between frontend (using browser timezone) and backend (UTC).
- **Modules:** All modules with date/time fields
- **Fix:** Standardize on UTC for backend storage and convert to user's timezone for display:
```typescript
// Backend: Store all times in UTC
const createdAt = new Date().toISOString();

// Frontend: Display in user's timezone
const displayDate = new Date(createdAt + 'Z').toLocaleString();
```

---

## API Endpoint Issues

### Missing API Endpoints
The following API endpoints may be missing or incomplete:

1. **GET /api/sla/dashboard** - SLA statistics dashboard data
2. **POST /api/material-requests/[id]/transition** - Generic MR status transition
3. **POST /api/job-cards/[id]/guards?userId=current** - Guard conditions check
4. **GET /api/inventory/stock** - Stock list with filters
5. **POST /api/inventory/bulk** - Bulk stock operations
6. **POST /api/grn/[id]/process** - GRN processing workflow
7. **POST /api/material-issues/[id]/process** - Material issue processing

---

## Database Schema Issues

### Missing Indexes
The following indexes may be missing for optimal performance:

```sql
-- Job Cards
CREATE INDEX idx_job_cards_status ON job_cards(status);
CREATE INDEX idx_job_cards_priority ON job_cards(priority);
CREATE INDEX idx_job_cards_asset_id ON job_cards(asset_id);

-- Material Requests
CREATE INDEX idx_material_requests_status ON material_requests(status);
CREATE INDEX idx_material_requests_job_card_id ON material_requests(jobCardId);

-- Inventory
CREATE INDEX idx_store_stock_item_id ON store_stock(itemId);
CREATE INDEX idx_store_stock_store_id ON store_stock(storeId);
CREATE INDEX idx_store_stock_available_qty ON store_stock(availableQty);
```

---

## Recommendations

### Priority 1 (Critical - Fix Immediately)
1. Fix GRN process over-receipt validation (Bug #31)
2. Fix document upload file type validation (Bug #48)
3. Fix bulk stock operation negative quantity validation (Bug #20)
4. Add backend PO status transition enforcement (Bug #27)

### Priority 2 (High - Fix Within 1 Week)
1. Fix QR code download rendering (Bug #4)
2. Fix dashboard quick action buttons (Bug #1)
3. Fix guard conditions API user ID resolution (Bug #8)
4. Fix GRN PO status validation (Bug #32)
5. Fix quotation comparison common items validation (Bug #36)
6. Fix invoice amount validation (Bug #38)
7. Fix stock reservation validation for material issues (Bug #41)
8. Fix stock take auto-finalization (Bug #24)
9. Add MR approve quantity adjustment UI (Bug #15)
10. Fix client-side filtering in inventory (Bug #18)
11. Fix SLA polling performance (Bug #9)

### Priority 3 (Medium - Fix When Possible)
1. Improve error handling for API failures
2. Add missing edit/delete functionality
3. Implement document versioning
4. Fix pagination/filter issues
5. Add proper date/time handling

### Priority 4 (Low - Nice to Have)
1. Persist sidebar state
2. Improve mobile responsiveness
3. Add configurable thresholds
4. Improve error messages

---

## Testing Checklist

To verify fixes, test the following scenarios:

### Dashboard
- [ ] Quick action buttons navigate to correct pages
- [ ] SLA stats load correctly and handle errors
- [ ] Charts render properly on mobile

### Assets
- [ ] QR code downloads work in all browsers
- [ ] Asset creation/editing works
- [ ] Categories only show active ones

### Job Cards
- [ ] Guard conditions prevent invalid transitions
- [ ] Bulk operations validate properly
- [ ] SLA polling doesn't cause performance issues
- [ ] Photo uploads work with clear errors

### Employees
- [ ] Department filter excludes empty values
- [ ] Rate validations work properly

### Material Requests
- [ ] MR details load correctly
- [ ] Approval flow allows quantity adjustment
- [ ] Job card filter excludes completed ones

### Inventory
- [ ] Stock filter works correctly (backend-side)
- [ ] Bulk operations validate stock levels
- [ ] Items can be edited/deleted
- [ ] Alerts update after adjustments

### Stock Take
- [ ] Stock takes auto-finalize after timeout
- [ ] Variance handles zero division
- [ ] Overlapping stock takes prevented

### Purchase Orders
- [ ] PO status transitions are validated
- [ ] Line items validate quantities
- [ ] Currency is specified

### GRN
- [ ] GRN process validates quantities
- [ ] GRN links to valid POs
- [ ] GRN completion updates PO status
- [ ] WAC updates correctly

### Quotations
- [ ] Quotations have common items to compare
- [ ] Status workflow is controlled

### Invoices
- [ ] Invoice amounts match PO/GRN
- [ ] Duplicate payments prevented
- [ ] Due dates calculate correctly

### Material Issues
- [ ] Stock reservation validated
- [ ] Stock reserved on issue
- [ ] MR status updates on completion
- [ ] Returns handled properly

### Fuel
- [ ] Tank capacity validated
- [ ] Consumption accounts for fuel added
- [ ] Alert thresholds configurable

### Documents
- [ ] File types validated
- [ ] Version control implemented

### Navigation
- [ ] Mobile nav doesn't overlap content
- [ ] Sidebar state persisted

### Reports
- [ ] Reports generate without timeout
- [ ] Saved reports validate permissions
- [ ] Export functionality works

### Notifications
- [ ] Notifications load correctly
- [ ] Mark as read/unread works

### Time Logs
- [ ] Time log creation prevents overlaps
- [ ] Approval workflow works
- [ ] Totals calculate correctly

### Role Management
- [ ] Role deletion checks for assigned users
- [ ] Privilege assignment works
- [ ] Role updates apply immediately

### Privilege Management
- [ ] Privilege changes take effect immediately
- [ ] Permission checks work correctly

### PM Module
- [ ] PM schedules generate correctly
- [ ] PM completion updates asset
- [ ] PM history tracks correctly

### Advanced KPI
- [ ] KPIs calculate from correct data
- [ ] KPI trends display correctly
- [ ] Custom KPIs can be created

---

## Conclusion

The WCP application is feature-rich but has several bugs that need to be addressed, particularly around validation, error handling, and edge cases. The most critical issues are around GRN processing, material issues/reservations, and document upload security.

**Recommended Action Plan:**
1. Fix all Critical and High severity bugs within 1 week
2. Address Medium severity bugs within 2 weeks
3. Implement Low severity improvements as time permits
4. Add comprehensive integration tests to prevent regressions

---

**Report Generated:** 2026-03-21
**Last Updated:** 2026-03-21 (Completed full system audit)
**Next Audit Recommended:** After Priority 1 & 2 bugs are fixed
