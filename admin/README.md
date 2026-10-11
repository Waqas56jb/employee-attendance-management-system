# Shiftwise Admin — Workforce, Attendance, Billing & Invoice Management

Administrator dashboard for a business whose employees work at customer locations. The owner manages employees, customers and projects, reviews and corrects attendance, configures customer-specific hourly rates, calculates billable hours, and generates, tracks and exports invoices.

This folder contains the **admin frontend only**. It is a complete, working demo: all data lives in the browser (LocalStorage) behind a service layer that will be replaced by calls to the `server/` API.

```
employee-attendance-management-system/
├── client/   Employee app (check-in / check-out)          — separate project
├── admin/    Administrator dashboard (this project)
└── server/   Backend API, auth, business rules, database  — planned
```

---

## Quick start

Requirements: Node.js 18+ and npm 9+.

```bash
cd admin
npm install
npm run dev        # http://localhost:5174
```

| Command           | What it does                              |
| ----------------- | ----------------------------------------- |
| `npm run dev`     | Development server with hot reload         |
| `npm run build`   | Production build into `dist/`              |
| `npm run preview` | Serves the production build locally        |

### Demo administrator

| Email               | Password    |
| ------------------- | ----------- |
| `admin@example.com` | `Admin123!` |

The login page has a "Fill in demo credentials" shortcut.

---

## Features

**Authentication** — login with validation, show/hide password, remember me (14-day vs. browser-session demo session), forgot-password placeholder, protected routes, redirect of signed-in users away from `/login`.

**Dashboard** — greeting, date-range selector, KPI cards (total/active employees, active projects, hours worked, billable value, outstanding invoices) that link to pre-filtered pages, live attendance overview (working now, completed today, not yet checked in, hours today, missing check-outs), charts (hours over time, billable hours by customer, monthly invoiced vs. collected, invoice status distribution), recent activity, recent invoices, upcoming projects, quick actions.

**Employees** — searchable/filterable/sortable list with CSV export, create & edit with unique employee IDs, project assignments (only to existing, open projects), status management (active / inactive / archived), safe archiving instead of deleting employees with history, detail page with hours, attendance history, project history and billable work.

**Customers** — list with current rate and outstanding balance, create & edit (company, reference, contacts, billing/service address, VAT ID, payment terms, currency, tax override), detail workspace with tabs: Overview, Projects, Attendance & Hours, Hourly Rates, Invoices, Customer Information.

**Projects** — list and filters (status, customer, employee), create & edit with required customer and multi-select team, detail page with hours vs. target, attendance timeline, invoice history and notes. Completing or archiving keeps all history.

**Attendance** — summary cards, active-shift panel with live timers, full table with combined filters, record details (timestamps, duration, notes, captured location, billing state, audit history), manual correction with mandatory reason and before/after audit entry, administrative closing of abandoned shifts, approve / flag for review / cancel / restore, manual records.

**Billing & hourly rates** — dated rate history per customer (create, schedule future rates, edit future rates, end or deactivate rates) with an effect preview; billable-hours workspace per customer and period with quick ranges, applied rate per work date, review status per record, billable-hour adjustments and exclusions (always with reason and history).

**Invoices** — guided creation (customer → period → eligible/excluded records → totals → review & adjust → preview → save draft or finalize), unique numbering on finalization, frozen invoice snapshots, PDF download, mark as sent, payment recording (partial/full), void with reason, controlled release of a void invoice's records for re-billing, draft recalculation when attendance changes.

**Reports** — employee hours, customer billable hours, project hours, attendance history, invoice summary, outstanding invoices, revenue by customer, monthly billing summary — all filterable and exportable to CSV with matching totals.

**Notifications & activity log** — read/unread, mark all read, filter, search, deep links to records; audit log of administrator actions with previous/new values and reasons.

**Settings** — business profile (incl. logo preview), invoice settings (prefix, sequence with duplicate protection, terms, tax, due-date rule, texts), working-hours rules (review thresholds, open-shift alerts, default billing period, location policy).

---

## Technology

React 18 · Vite 5 · JavaScript (JSX) · React Router 6 · Tailwind CSS 3 · lucide-react · Recharts · React Hook Form + Zod · date-fns · Sonner · jsPDF + jspdf-autotable · LocalStorage.

The design tokens (colors, shadows, typography) are shared with the employee app in `client/`, so both products look like one system.

---

## Folder structure

```
admin/
├── public/                  favicon, login background pattern
└── src/
    ├── components/
    │   ├── common/          design system: Button, Card, DataTable, Modal, ConfirmDialog,
    │   │                    FormField, SelectField, MultiSelect, DateRangePicker, StatusBadge, …
    │   ├── layout/          AdminLayout, sidebar, topbar, global search, notifications, user menu
    │   ├── dashboard/  employees/  customers/  projects/  attendance/
    │   ├── billing/  invoices/  reports/  settings/
    ├── context/             one provider per domain (+ AppProviders)
    ├── hooks/               useEmployees, useInvoices, … useQueryState, useAsyncAction, useDb
    ├── data/demoData.js     deterministic demo dataset generator
    ├── services/            business logic and persistence (the future API boundary)
    │   ├── db.js            LocalStorage store, transactions, audit/notification helpers
    │   ├── authService.js  employeeService.js  customerService.js  projectService.js
    │   ├── attendanceService.js  billingService.js  invoiceService.js
    │   ├── reportService.js  settingsService.js  notificationService.js  exportService.js
    ├── utils/
    │   ├── calculations.js  calculation engine (durations, rates, eligibility, totals, statuses)
    │   ├── currency.js      integer minor-unit money helpers and formatting
    │   ├── dateUtils.js  formatters.js  invoiceNumber.js  validation.js (Zod schemas)
    ├── pages/               one file per route
    ├── App.jsx              routes (code-split)
    └── main.jsx
```

**Data flow:** pages and components read data from domain contexts (`useEmployees()`, …) and call service functions for every change. Services validate business rules, write through a single transactional store (`services/db.js`), add activity-log entries and notifications, and every screen updates immediately. Business logic never lives in page components.

---

## Calculation rules

All amounts are stored as **integer minor units** (cents); durations as **integer minutes**. Formatting happens only for display, so rounding never affects totals.

| Value              | Rule |
| ------------------ | ---- |
| Recorded duration  | check-out − check-in (rejected if ≤ 0 or > 24 h) |
| Billable duration  | administrator-adjusted value if set, otherwise recorded duration (both kept) |
| Applicable rate    | the customer's active rate whose effective range contains the **work date**; if none, the record is flagged "No rate" and not billed |
| Line amount        | billable hours (2 decimals) × hourly rate, rounded to the cent; rows at different rates are never merged |
| Discount           | none, percentage of subtotal, or fixed amount (capped at subtotal) |
| Taxable amount     | subtotal − discount |
| Tax                | taxable amount × tax % (customer override or default from invoice settings) |
| Total              | taxable amount + tax |
| Balance due        | total − recorded payments |

**Billing eligibility** — only completed or corrected (approved) records count. Excluded: active shifts, missing check-outs, cancelled or invalid records, records awaiting review (explicitly flagged, or longer than the review threshold in working-hours settings), records excluded by an administrator, records on another draft, records already billed on a finalized invoice, and work dates without a valid rate. Excluded hours are always shown, never silently dropped.

**Invoice lifecycle** — `Draft → Finalized → Sent → Partially paid → Paid`; unpaid finalized/sent invoices past their due date become `Overdue` (checked on load and via the dashboard refresh). Paid invoices never become overdue. `Void` is available for finalized invoices without payments.

- Finalizing assigns the next number (`INV-YYYY-NNNN`, prefix and sequence configurable, collisions skipped), freezes the customer details, lines, rates, quantities and totals, and marks the attendance records as billed.
- Later changes to attendance, rates or customer data never rewrite a finalized invoice. Corrections to billed records add an audit note to the invoice instead.
- Changes to records on a **draft** flag it for recalculation; it cannot be finalized until recalculated.
- Voiding keeps the records linked to the void invoice. They only become billable again through the explicit **Release records for re-billing** action (reason required, audited).

---

## Demo data

On first load the app generates a realistic dataset relative to the current date (seeded random generator, so every reset produces the same data):

- 1 business profile (Brightline Workforce Solutions GmbH, Berlin, EUR, 19 % VAT default)
- 6 customers in DE, NL, AT and IE (incl. reverse-charge customers at 0 % VAT and one inactive customer)
- 8 hourly rates, including a rate increase last month and a scheduled future rate
- 9 projects (active, planned, on hold, completed)
- 12 employees (10 active, 1 inactive, 1 archived)
- ~700 attendance records over the last three months, including active shifts today, a missing check-out, records needing review, a corrected record with audit history, a cancelled duplicate, an excluded training shift and a billable-hours adjustment
- ~14 invoices: paid, partially paid, sent, finalized, overdue, a draft, and a void invoice whose records were released and re-billed
- payments, notifications and an activity log consistent with the above

All seeded invoice totals are produced by the same calculation engine as the UI.

### Resetting the demo

Open the account menu (top-right avatar) → **Reset demo data**, or **Business Settings → Demo data → Reset**. Both ask for confirmation. Alternatively clear the site data in the browser (keys starting with `shiftwise.admin`).

### LocalStorage limitations

- Data exists only in this browser profile; other devices and users do not see it.
- Private windows or cleared site data lose all changes.
- Storage is limited (~5 MB per origin); very large demo sessions may hit the limit (the app reports it and suggests a reset).
- Several tabs stay in sync via the `storage` event, but there is no conflict resolution.
- Anyone with access to the browser can read or modify the data.

---

## Exports

- **CSV** — every list and report exports exactly the currently filtered rows (UTF-8 with BOM for Excel; formula-injection characters are neutralised). Reports include a totals row.
- **PDF invoices** — generated in the browser with jsPDF: letterhead with logo, customer billing details, invoice number and dates, billing period, lines with hours and rates, subtotal, discount, net amount, tax breakdown, total, amount paid, balance due, payment history, payment instructions, notes and footer. Business-profile changes in settings are reflected in previews and PDFs; finalized invoices keep their frozen customer details.

---

## Environment variables

Copy `.env.example` to `.env.local`:

```bash
VITE_API_BASE_URL=http://localhost:5000/api   # future backend
VITE_USE_MOCK_API=true                         # reserved: switch to real API
```

Both variables are placeholders for the backend switch — the current build always uses the LocalStorage services.

Only `VITE_`-prefixed variables reach the browser, and **everything in the bundle is public**. Never put secrets (API keys, database credentials, mail passwords) in frontend environment variables. The demo runs without any backend.

---

## Backend integration plan

The service modules are the integration boundary: their function signatures stay, their bodies switch from `transact()` to HTTP calls.

1. **Auth** — `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/password-reset`. Sessions via httpOnly secure cookies; password hashing, rate limiting, MFA and role-based permissions on the server.
2. **Master data** — REST resources `/employees`, `/customers`, `/projects`, `/rates` with server-side uniqueness, relationship and status rules (mirroring `employeeService`, `customerService`, `projectService`, `billingService`).
3. **Attendance** — written by the employee app (`client/`); admin endpoints for correction, close-shift, approve, flag, cancel, manual entry. The server enforces "one active shift per employee", timestamp validation, location policy and writes immutable audit records.
4. **Billing** — `GET /billing/rows?customerId&from&to…` computed server-side with the same rules as `utils/calculations.js` (port or share the module); adjustments and exclusions as audited commands.
5. **Invoices** — draft CRUD, `POST /invoices/:id/finalize` performing number allocation and record locking **in one database transaction**, payments, void, release. Server-generated PDFs and email delivery via a mail provider.
6. **Reports** — aggregate endpoints or a reporting view; CSV generation can stay client-side.
7. **Notifications & audit log** — persisted server-side, append-only audit table; optional WebSocket/SSE for live updates (active shifts).
8. **Settings** — business profile with logo upload to object storage; invoice and working-hours settings validated server-side.

When the endpoints exist, read `VITE_API_BASE_URL` / `VITE_USE_MOCK_API` in the service layer to choose between the mock and HTTP implementations.

---

## Security limitations (demo)

- Authentication, sessions and "remember me" are simulated in the browser and provide **no security**. Any user can edit LocalStorage.
- Authorization, audit-log integrity, invoice numbering uniqueness, duplicate-billing protection and all validation **must be enforced by the backend**; the frontend checks are for usability only.
- No emails are sent (employee invitations, password resets, invoices) and no payments are processed — payment entries are accounting records only.
- Uploaded logos are stored as data URLs in the browser; nothing is uploaded.
- Time zones: dates are interpreted in the browser's local time zone; the configured business time zone must be applied by the backend.
