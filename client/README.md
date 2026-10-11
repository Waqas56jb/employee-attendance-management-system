# ShiftLine — Employee Portal

The employee-facing frontend of an attendance and workforce management system. Employees use it to check in and out at customer locations, track their working hours, and view their assigned projects and customers.

> **Scope.** This folder contains **only the employee application**. The administrator panel and the backend are separate future projects. Employees cannot reach any administrator functionality: `/admin/*` addresses show an "access denied" page.

> **Demo mode.** Authentication and data are mocked in the browser using LocalStorage. This is for demonstration only and is **not production-secure**. See [Limitations](#localstorage-limitations).

---

## Features

| Area | What it does |
| --- | --- |
| **Authentication** | Login with validation, show/hide password, "keep me signed in", friendly errors, loading state, forgot-password flow, logout (with a warning if a shift is still running). |
| **Dashboard** | Time-based greeting, today / this week / completed shifts / assigned projects metrics, live active-shift card, weekly hours chart (with a table view), recent attendance, assigned projects with progress, latest notifications, recent customers, quick actions. All figures are computed from attendance data. |
| **Check In / Check Out** | Three-step check-in (customer → project → details → confirm), live local time, optional browser geolocation, optional notes. Check-out shows the active shift and live elapsed time, takes a completion note, and asks for confirmation. Includes a timeline of today's sessions. |
| **My Attendance** | Totals, completed shifts, and average per working day for the selected period. Filters for this week, last week, this month, last month, all time, or a custom range, plus customer, project, status and search. Sortable columns, pagination, a mobile card layout, and a per-project hours breakdown. Filters are kept in the URL, so they survive a refresh. |
| **My Projects** | Assigned projects only, with search, a status filter (Active / Upcoming / Completed / On Hold) and a customer filter. Shows recorded vs. scheduled hours, assignment date and contacts. |
| **Project details** | Description, address, dates, site instructions, contact, your sessions and hours, and a context-aware check-in action. If another shift is active, it explains that you must check out first. |
| **My Customers / Customer details** | Only customers linked to your assignments: contact details, your projects for that customer, hours recorded, and recent sessions. |
| **Notifications** | Unread indicator, mark as read / mark all as read, All/Unread and type filters, relative timestamps, and read state saved in the browser. Check-in and check-out create notifications. |
| **Profile** | Display name and phone are editable (validated). Employee ID, role and employment data are read-only. |
| **Settings** | Display name, light/dark/system theme, 12/24-hour clock, date format, week start day, per-category notification toggles, a password-change form (clearly marked unavailable in demo mode), and a reset for the demo data. Every setting changes the UI immediately. |
| **Quality** | Responsive from 320px to desktop, keyboard-accessible dialogs with a focus trap, visible focus rings, a skip link, labelled controls, loading skeletons, empty states, and a 404 page. |

## Mobile app, tablet and desktop

Employees mostly use the portal on their phones, so it is built as an **installable Progressive Web App (PWA)**. The layout adapts to the device:

| Device | Layout |
| --- | --- |
| **Phone** (< 768px) | App shell with a native-style **app bar** and a **bottom tab bar**: Home · Attendance · a raised **Check In** button · Projects · More. During a shift the centre button turns green and shows the live timer. Large page titles move into the app bar as you scroll. Detail pages get a back button. Dialogs open as bottom sheets. The tab bar hides while the keyboard is open. |
| **Tablet** (768–1023px) | Compact icon rail on the left plus the top bar. Lists use card layouts. |
| **Laptop / desktop** (≥ 1024px) | Full sidebar, top bar and data tables. |

App behaviour on phones:

- **Install to home screen.** Android/Chrome shows an *Install app* button (on the dashboard and in Settings). On iPhone, the app shows the *Share → Add to Home Screen* steps. Once installed, the app opens full-screen with its own icon, splash colour and shortcuts (Check In, Attendance).
- **Works offline.** A service worker caches the app, and demo data lives on the device. An offline banner appears when there is no connection.
- **Native feel.** Safe areas for notched screens, status-bar colour that follows the theme, no tap flash or double-tap zoom, no iOS zoom on input focus, press feedback, a short vibration on check-in/check-out (Android), and no bounce scrolling in the installed app.

The PWA (service worker and install) only works on the **production build** served over **HTTPS** (or `localhost`): `npm run build && npm run preview`, or any static host. The dev server (`npm run dev`) does not register the service worker.

## Technology stack

- **React 18** + **Vite 5** (JavaScript / JSX)
- **React Router 6** — routing and route guards
- **Tailwind CSS 3** — design tokens via CSS variables (light and dark themes)
- **Lucide React** — icons
- **Recharts** — weekly hours chart
- **React Hook Form** + **Zod** — forms and validation
- **date-fns** — date maths and formatting
- **Sonner** — toast notifications
- **Context API** — state (auth, preferences, assignments, attendance, notifications)

## Getting started

Requirements: **Node.js 18+** and npm.

```bash
cd client
npm install
npm run dev        # http://localhost:5173
```

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server with hot reload |
| `npm run build` | Create a production build in `dist/` |
| `npm run preview` | Serve the production build locally |

The app is a single-page application. When you deploy it, configure the web server to send all unknown paths to `index.html`, so that refreshing a nested route such as `/projects/proj-101` works.

### Demo credentials

| Email | Password |
| --- | --- |
| `employee@example.com` | `Employee123!` |

The login page has a **Fill in demo credentials** button.

## Environment variables

Copy `.env.example` to `.env.local`:

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `https://api.example.com/v1` | Base URL of the future backend API. |
| `VITE_USE_MOCK_API` | `true` | `true` uses the LocalStorage mock services. Set it to `false` to call the backend. |
| `VITE_REQUIRE_LOCATION` | `false` | When `true`, check-in and check-out are blocked until the browser provides a location. |

Only `VITE_*` variables reach the browser, and anything in the bundle is public. **Never put API keys or secrets in frontend environment variables.**

## Folder structure

```
client/
├── public/                     favicon and static images
├── src/
│   ├── components/
│   │   ├── common/             design-system primitives (Button, Card, Modal, Badge, FormField, …)
│   │   ├── layout/             AppLayout, sidebar, top bar, mobile header and bottom nav, route guards
│   │   ├── attendance/         check-in/out dialogs, active shift card, history table, filters, timeline
│   │   ├── dashboard/          greeting, weekly chart, recent activity, assignments, quick actions
│   │   ├── projects/           project card, details, filters, status badge
│   │   ├── customers/          customer card and details
│   │   ├── notifications/      notification icon
│   │   └── profile/            profile form, security (password) settings
│   ├── context/                Auth, Preferences, Assignment, Attendance, Notification, ShiftDialog providers
│   ├── data/demoData.js        fictional demo dataset (generated relative to the seed date)
│   ├── hooks/                  useAuth, useAttendance, useNotifications, useLocalStorage, useGeolocation, …
│   ├── pages/                  route-level pages (auth/, dashboard, attendance, projects, …)
│   ├── services/               service layer: auth, attendance, project, customer, notification
│   │                           + apiClient (future backend), mockDb (LocalStorage), config, errors
│   ├── utils/                  dateUtils (working-time maths), formatters, validation schemas, storage
│   ├── App.jsx                 providers and routes
│   ├── main.jsx                entry point
│   └── index.css               Tailwind and design tokens
├── .env.example
├── index.html
├── tailwind.config.js
└── vite.config.js
```

## Mock data

`src/data/demoData.js` contains fictional, internally consistent data:

- **2 employees.** The demo employee, plus one other employee whose data must never appear. This is how the per-employee filtering is tested.
- **6 customers.** Five are linked to the demo employee; *Summit Data Centers* is not.
- **10 projects.** Eight are assigned to the demo employee (5 active, 1 upcoming, 1 completed, 1 on hold). *Library Network Cabling* and *Data Hall Rack Installation* belong to the other employee and are never shown.
- **19+ attendance records** across different days, projects and customers. Records older than 7 days are "Approved"; newer ones are "Submitted". If the demo is first opened on a weekday afternoon, a completed shift from that morning is added too.
- **7 notifications** of every type.

Dates are generated relative to the first time the app loads, so "this week" always contains realistic data. The generated dataset is then stored and stays fixed. **Settings → Reset demo data** regenerates it.

Seeded records deliberately have **no GPS coordinates**. Coordinates are stored only when the browser actually provides them.

## Working-time rules

- Durations are stored as **integer minutes**: `durationMinutes = checkOutAt − checkInAt`, calculated at check-out from real timestamps.
- An active shift's elapsed time is always calculated as `now − checkInAt` from the stored timestamp. The live timer therefore stays correct after a refresh, in another tab, or after logging out and back in.
- A shift belongs to the **local day on which it started**. A shift that crosses midnight is counted once, which avoids double-counting.
- Confirmed totals include only finished shifts. Live time from an active shift is shown separately (for example "+1h 20m in progress").
- Weeks start on Monday by default. You can change this in Settings.
- Only one shift can be active at a time. This is enforced in the UI, the attendance context and the service (which re-reads storage before writing, so it also holds across tabs). An in-flight lock prevents duplicate submissions from rapid clicks.
- Employees cannot edit or delete attendance records.
- No billing rates, invoices or other commercial data exist in the employee client.

## Location support

Check-in and check-out can optionally capture `navigator.geolocation` coordinates (latitude, longitude and accuracy). Geolocation requires HTTPS or `localhost`. If permission is denied or unavailable, the employee can continue, unless `VITE_REQUIRE_LOCATION=true`. The UI states clearly that a browser location **does not prove** that the employee is at the customer site. Geofencing and verification belong on the server.

## LocalStorage limitations

- All demo data (`shiftline:*` keys) lives in **this browser only**. It is not shared across devices, and it is lost if site data is cleared.
- LocalStorage is **not secure**. Any script on the page can read it, and it is not encrypted. It must not hold real employee data or real credentials in production.
- The demo "token" is a random string. There is no signature, expiry enforcement on a server, or revocation.
- Route guards in the frontend only control what is displayed. **All authorization must be enforced by the backend.**

## Backend integration notes

Pages and components never read storage directly. They use the service modules in `src/services/`. Each service function already contains a branch for the real API:

```js
export async function getMyAttendance() {
  if (!config.useMockApi) return apiClient.get('/me/attendance');
  // …mock implementation
}
```

To connect a backend, implement these endpoints and set `VITE_USE_MOCK_API=false`:

| Method | Endpoint | Used by |
| --- | --- | --- |
| POST | `/auth/login` → `{ session, employee }` | `authService.login` |
| POST | `/auth/logout` | `authService.logout` |
| POST | `/auth/password-reset` | `authService.requestPasswordReset` |
| GET / PATCH | `/me` | current employee, profile update (`displayName`, `phone` only) |
| POST | `/me/password` | password change |
| GET | `/me/projects`, `/me/projects/:id` | projects assigned to the caller |
| GET | `/me/customers`, `/me/customers/:id` | customers linked to the caller |
| GET | `/me/attendance` | the caller's attendance records |
| POST | `/me/attendance/check-in` / `check-out` | start and end a shift |
| GET | `/me/notifications` | the caller's notifications |
| POST | `/me/notifications/:id/read`, `/me/notifications/read-all` | read state |

Recommendations for the backend:

- Identify the employee from the auth token. Never trust an `employeeId` sent by the client.
- Take check-in and check-out timestamps from the **server clock**, enforce the one-active-shift rule in the database (with a unique constraint or a transaction), and validate the project/customer/assignment relationships.
- Return 404 for records that belong to other employees, as the mock does.
- Prefer httpOnly, secure cookies over Web Storage for session tokens.
- Generate notifications on the server. The client's `createNotification` mock then becomes a no-op.
