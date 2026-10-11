import { addDays, addMinutes, isWeekend, setHours, setMinutes, startOfDay, subDays, subHours, subMinutes } from 'date-fns';

/*
 * Fictional demo data. All names, companies, addresses, phone numbers (555
 * range) and email domains (.example) are made up.
 *
 * Dates are generated relative to the moment the demo is first seeded so the
 * dashboard always has a meaningful "this week". The seeded result is stored
 * in LocalStorage and stays fixed afterwards (see services/mockDb.js).
 *
 * Seeded attendance records intentionally have no GPS coordinates: location
 * is only ever stored when the browser actually provides it.
 */

export const DEMO_EMPLOYEE_ID = 'emp-1001';
export const OTHER_EMPLOYEE_ID = 'emp-1002';

/** Demo-only credentials. Never use real credentials in frontend code. */
export const DEMO_CREDENTIALS = [{ email: 'employee@example.com', password: 'Employee123!', employeeId: DEMO_EMPLOYEE_ID }];

export const employees = [
  {
    id: DEMO_EMPLOYEE_ID,
    fullName: 'Alex Morgan',
    displayName: 'Alex',
    email: 'employee@example.com',
    phone: '+1 (555) 014-2297',
    employeeNumber: 'EMP-1001',
    jobTitle: 'Field Service Technician',
    department: 'Field Operations',
    role: 'employee',
    avatar: null,
    status: 'active',
    employmentStartDate: '2022-03-14',
    supervisor: 'Dana Whitfield',
    homeBase: 'Oakland Service Depot',
    assignedProjectIds: ['proj-101', 'proj-102', 'proj-201', 'proj-202', 'proj-301', 'proj-302', 'proj-401', 'proj-501'],
  },
  {
    // Second employee exists only to prove that other people's records are never shown.
    id: OTHER_EMPLOYEE_ID,
    fullName: 'Jordan Reyes',
    displayName: 'Jordan',
    email: 'jordan.reyes@example.com',
    phone: '+1 (555) 017-4410',
    employeeNumber: 'EMP-1002',
    jobTitle: 'Network Installer',
    department: 'Field Operations',
    role: 'employee',
    avatar: null,
    status: 'active',
    employmentStartDate: '2023-08-01',
    supervisor: 'Dana Whitfield',
    homeBase: 'San Jose Service Depot',
    assignedProjectIds: ['proj-502', 'proj-601'],
  },
];

export const customers = [
  {
    id: 'cust-01',
    companyName: 'Brightwell Logistics',
    industry: 'Logistics & Warehousing',
    contactPerson: 'Priya Nair',
    contactRole: 'Operations Manager',
    email: 'p.nair@brightwell.example',
    phone: '+1 (555) 010-3381',
    address: '1200 Harbor Freight Rd, Oakland, CA 94607',
    description:
      'Regional third-party logistics provider operating a 240,000 sq ft cross-dock distribution center serving Bay Area retailers.',
  },
  {
    id: 'cust-02',
    companyName: 'Meridian Health Clinic',
    industry: 'Healthcare',
    contactPerson: 'Thomas Becker',
    contactRole: 'Facilities Coordinator',
    email: 'facilities@meridianhealth.example',
    phone: '+1 (555) 012-7740',
    address: '455 Elm Street, Berkeley, CA 94704',
    description:
      'Multi-specialty outpatient clinic with 38 exam rooms. Work areas are shared with patients — follow the clinic visitor policy at all times.',
  },
  {
    id: 'cust-03',
    companyName: 'Northgate Retail Group',
    industry: 'Retail',
    contactPerson: 'Sofia Alvarez',
    contactRole: 'Store Systems Lead',
    email: 's.alvarez@northgate.example',
    phone: '+1 (555) 013-9902',
    address: '88 Market Plaza, San Leandro, CA 94577',
    description: 'Home and garden retailer with four Bay Area locations. Installations are scheduled around store opening hours.',
  },
  {
    id: 'cust-04',
    companyName: 'Cedar & Pine Architects',
    industry: 'Professional Services',
    contactPerson: 'Marcus Lee',
    contactRole: 'Office Manager',
    email: 'office@cedarpine.example',
    phone: null,
    address: '310 Grand Avenue, Suite 400, Oakland, CA 94610',
    description: 'Architecture studio relocating to a newly leased floor; electrical fit-out precedes their move-in.',
  },
  {
    id: 'cust-05',
    companyName: 'Lakeside Community College',
    industry: 'Education',
    contactPerson: 'Hannah Okafor',
    contactRole: 'IT Services Director',
    email: 'it-services@lakeside.example',
    phone: '+1 (555) 016-2245',
    address: '2500 Lakeshore Blvd, Alameda, CA 94501',
    description: 'Public community college campus with eleven teaching buildings and a central library.',
  },
  {
    id: 'cust-06',
    companyName: 'Summit Data Centers',
    industry: 'Technology',
    contactPerson: 'Ravi Shah',
    contactRole: 'Site Manager',
    email: 'site@summitdc.example',
    phone: '+1 (555) 019-6631',
    address: '17 Innovation Way, San Jose, CA 95134',
    description: 'Colocation facility. Not assigned to the demo employee.',
  },
];

/** Project templates. Dates are offsets in days from the seed date. */
const projectTemplates = [
  {
    id: 'proj-101',
    name: 'Warehouse Network Upgrade',
    customerId: 'cust-01',
    description:
      'Replace end-of-life access switches and wireless access points across the distribution center to support new handheld scanners.',
    location: 'Building B, 1200 Harbor Freight Rd, Oakland, CA 94607',
    startOffset: -45,
    endOffset: 40,
    status: 'active',
    instructions: [
      'Check in with the security gate and collect a contractor badge.',
      'High-visibility vest and safety boots are mandatory on the warehouse floor.',
      'Network changes inside racks 1–4 require approval from Priya Nair before 10:00.',
    ],
    contact: { name: 'Priya Nair', role: 'Operations Manager', phone: '+1 (555) 010-3381', email: 'p.nair@brightwell.example' },
    assignments: { [DEMO_EMPLOYEE_ID]: { assignedOffset: -46, role: 'Lead Technician', scheduledHours: 120 } },
  },
  {
    id: 'proj-102',
    name: 'Dock Scanner Maintenance',
    customerId: 'cust-01',
    description: 'Recurring preventive maintenance of handheld scanners and charging cradles used at the loading docks.',
    location: 'Loading Docks 1–12, 1200 Harbor Freight Rd, Oakland, CA 94607',
    startOffset: -60,
    endOffset: 90,
    status: 'active',
    instructions: [
      'Log any device sent for repair in the dock supervisor binder.',
      'Do not service devices while trucks are being loaded at the same dock.',
    ],
    contact: { name: 'Luis Ortega', role: 'Dock Supervisor', phone: '+1 (555) 010-3392', email: null },
    assignments: { [DEMO_EMPLOYEE_ID]: { assignedOffset: -60, role: 'Technician', scheduledHours: 40 } },
  },
  {
    id: 'proj-201',
    name: 'Clinic HVAC Controls Retrofit',
    customerId: 'cust-02',
    description: 'Install networked thermostat controllers and integrate them with the clinic building management system.',
    location: '455 Elm Street, Berkeley, CA 94704 — East & West wings',
    startOffset: -30,
    endOffset: 20,
    status: 'active',
    instructions: [
      'Enter through the staff entrance on Cedar Street, not the patient lobby.',
      'Exam rooms may only be accessed when marked “Available” on the door panel.',
      'Keep noisy work to before 9:00 or after 17:00 where possible.',
    ],
    contact: { name: 'Thomas Becker', role: 'Facilities Coordinator', phone: '+1 (555) 012-7740', email: 'facilities@meridianhealth.example' },
    assignments: { [DEMO_EMPLOYEE_ID]: { assignedOffset: -31, role: 'Controls Technician', scheduledHours: 80 } },
  },
  {
    id: 'proj-202',
    name: 'Patient Wi-Fi Expansion',
    customerId: 'cust-02',
    description: 'Extend guest Wi-Fi coverage to the waiting areas and the new pediatric wing.',
    location: '455 Elm Street, Berkeley, CA 94704 — Pediatric wing',
    startOffset: 10,
    endOffset: 35,
    status: 'upcoming',
    instructions: ['A site survey walkthrough with Thomas Becker is scheduled for the first morning.'],
    contact: { name: 'Thomas Becker', role: 'Facilities Coordinator', phone: '+1 (555) 012-7740', email: 'facilities@meridianhealth.example' },
    assignments: { [DEMO_EMPLOYEE_ID]: { assignedOffset: 0, role: 'Technician', scheduledHours: 32 } },
  },
  {
    id: 'proj-301',
    name: 'Store Security Camera Rollout',
    customerId: 'cust-03',
    description: 'Install and configure IP security cameras across the San Leandro flagship store, including the garden center.',
    location: '88 Market Plaza, San Leandro, CA 94577',
    startOffset: -20,
    endOffset: 25,
    status: 'active',
    instructions: [
      'Ladder work in customer aisles must be cordoned off with barriers.',
      'Store opens at 9:00 — complete aisle work before opening where possible.',
    ],
    contact: { name: 'Sofia Alvarez', role: 'Store Systems Lead', phone: '+1 (555) 013-9902', email: 's.alvarez@northgate.example' },
    assignments: { [DEMO_EMPLOYEE_ID]: { assignedOffset: -21, role: 'Installer', scheduledHours: 96 } },
  },
  {
    id: 'proj-302',
    name: 'POS Terminal Refresh',
    customerId: 'cust-03',
    description: 'Replaced 22 point-of-sale terminals and receipt printers ahead of the holiday season.',
    location: '88 Market Plaza, San Leandro, CA 94577 — Checkout lanes',
    startOffset: -35,
    endOffset: -15,
    status: 'completed',
    instructions: ['Project completed. Contact your supervisor for follow-up work.'],
    contact: { name: 'Sofia Alvarez', role: 'Store Systems Lead', phone: '+1 (555) 013-9902', email: 's.alvarez@northgate.example' },
    assignments: { [DEMO_EMPLOYEE_ID]: { assignedOffset: -36, role: 'Technician', scheduledHours: 24 } },
  },
  {
    id: 'proj-401',
    name: 'Office Fit-Out Electrical',
    customerId: 'cust-04',
    description: 'Data and power outlet installation for the new fourth-floor studio layout.',
    location: '310 Grand Avenue, Suite 400, Oakland, CA 94610',
    startOffset: -40,
    endOffset: 30,
    status: 'on-hold',
    instructions: [
      'On hold pending the building permit amendment. Do not start work on site until your supervisor confirms the restart date.',
    ],
    contact: { name: 'Marcus Lee', role: 'Office Manager', phone: null, email: 'office@cedarpine.example' },
    assignments: { [DEMO_EMPLOYEE_ID]: { assignedOffset: -41, role: 'Electrician Assistant', scheduledHours: 60 } },
  },
  {
    id: 'proj-501',
    name: 'Campus AV Installation',
    customerId: 'cust-05',
    description: 'Install projectors, speakers and lecture capture hardware in Halls C and D.',
    location: 'Halls C & D, 2500 Lakeshore Blvd, Alameda, CA 94501',
    startOffset: -28,
    endOffset: 30,
    status: 'active',
    instructions: [
      'Collect room keys from Campus Security (Building A) and return them the same day.',
      'Lecture rooms are in use 10:00–15:00 on weekdays; check the room schedule posted at each door.',
    ],
    contact: { name: 'Hannah Okafor', role: 'IT Services Director', phone: '+1 (555) 016-2245', email: 'it-services@lakeside.example' },
    assignments: { [DEMO_EMPLOYEE_ID]: { assignedOffset: -29, role: 'AV Technician', scheduledHours: 72 } },
  },
  {
    id: 'proj-502',
    name: 'Library Network Cabling',
    customerId: 'cust-05',
    description: 'Structured cabling for the library study rooms.',
    location: 'Central Library, 2500 Lakeshore Blvd, Alameda, CA 94501',
    startOffset: -14,
    endOffset: 21,
    status: 'active',
    instructions: [],
    contact: { name: 'Hannah Okafor', role: 'IT Services Director', phone: '+1 (555) 016-2245', email: 'it-services@lakeside.example' },
    assignments: { [OTHER_EMPLOYEE_ID]: { assignedOffset: -15, role: 'Installer', scheduledHours: 48 } },
  },
  {
    id: 'proj-601',
    name: 'Data Hall Rack Installation',
    customerId: 'cust-06',
    description: 'Rack and stack for data hall 3.',
    location: '17 Innovation Way, San Jose, CA 95134',
    startOffset: -10,
    endOffset: 40,
    status: 'active',
    instructions: [],
    contact: { name: 'Ravi Shah', role: 'Site Manager', phone: '+1 (555) 019-6631', email: 'site@summitdc.example' },
    assignments: { [OTHER_EMPLOYEE_ID]: { assignedOffset: -11, role: 'Installer', scheduledHours: 80 } },
  },
];

/**
 * Attendance templates: [businessDaysAgo, "HH:mm" start, durationMinutes, projectId, checkInNote, checkOutNote]
 * Multiple shifts on the same day never overlap.
 */
const attendanceTemplates = [
  [1, '07:30', 510, 'proj-101', 'Continuing switch replacements in Building B.', 'Replaced 6 access switches; racks 3–4 remain.'],
  [2, '08:00', 255, 'proj-201', 'Thermostat controller install, east wing.', 'East wing controllers online; awaiting commissioning.'],
  [2, '13:15', 195, 'proj-102', '', 'Serviced 9 handheld scanners, 2 sent for repair.'],
  [3, '07:45', 495, 'proj-301', 'Camera mounting, aisles 1–8.', 'Mounted 14 cameras. Cabling still pending in aisle 7.'],
  [4, '08:30', 465, 'proj-501', 'Projector installs in Hall C.', 'Hall C rooms 101–104 complete.'],
  [5, '07:30', 525, 'proj-101', 'Wireless access point survey.', 'Survey complete; 18 AP locations marked.'],
  [6, '08:00', 480, 'proj-201', 'West wing controller wiring.', ''],
  [7, '09:00', 240, 'proj-102', 'Charging cradle inspection.', 'Replaced 3 cradle power supplies.'],
  [7, '13:45', 210, 'proj-301', '', 'Garden center camera brackets installed.'],
  [8, '07:30', 510, 'proj-301', 'Network video recorder setup.', 'NVR configured; 22 of 40 cameras recording.'],
  [9, '08:15', 450, 'proj-501', 'Speaker installation, Hall D.', 'Hall D speakers mounted, testing tomorrow.'],
  [10, '07:30', 500, 'proj-101', 'Cable tray installation.', 'Cable trays installed along north wall.'],
  [11, '08:00', 470, 'proj-201', 'BMS integration testing.', 'Integration testing passed for 12 zones.'],
  [12, '07:30', 485, 'proj-302', 'Terminal swap, lanes 1–8.', 'Lanes 1–8 live on new terminals.'],
  [13, '08:00', 460, 'proj-302', 'Terminal swap, lanes 9–16.', 'Lanes 9–16 live. Printers calibrated.'],
  [14, '07:45', 505, 'proj-201', 'Site walkthrough and controller mapping.', ''],
  [15, '08:00', 490, 'proj-101', 'Removed legacy switches.', 'Legacy equipment staged for recycling.'],
  [16, '08:30', 300, 'proj-401', 'Floor box layout marking.', 'Work paused — permit amendment required.'],
  [17, '07:30', 510, 'proj-501', 'Hall C site survey.', 'Mounting points confirmed with facilities.'],
];

const otherEmployeeAttendance = [
  [1, '08:00', 480, 'proj-502', 'Cable pulls, study rooms 1–6.', ''],
  [2, '07:30', 495, 'proj-601', 'Rack delivery and unboxing.', ''],
];

function businessDaysAgo(now, count) {
  let date = startOfDay(now);
  let remaining = count;
  while (remaining > 0) {
    date = subDays(date, 1);
    if (!isWeekend(date)) remaining -= 1;
  }
  return date;
}

function atTime(day, hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return setMinutes(setHours(day, h), m);
}

function buildAttendance(templates, employeeId, projectsById, now, idPrefix) {
  return templates.map(([daysAgo, start, minutes, projectId, inNote, outNote], index) => {
    const checkIn = atTime(businessDaysAgo(now, daysAgo), start);
    const checkOut = addMinutes(checkIn, minutes);
    const ageInDays = (now - checkOut) / 86_400_000;
    return {
      id: `${idPrefix}-${String(index + 1).padStart(3, '0')}`,
      employeeId,
      customerId: projectsById[projectId].customerId,
      projectId,
      checkInAt: checkIn.toISOString(),
      checkOutAt: checkOut.toISOString(),
      durationMinutes: minutes,
      // Older shifts have been reviewed by a supervisor; recent ones await review.
      status: ageInDays > 7 ? 'approved' : 'completed',
      checkInNote: inNote,
      checkOutNote: outNote,
      checkInLocation: null,
      checkOutLocation: null,
    };
  });
}

/** Builds the full demo dataset relative to `now`. */
export function createDemoData(now = new Date()) {
  const today = startOfDay(now);

  const projects = projectTemplates.map(({ startOffset, endOffset, assignments, ...rest }) => ({
    ...rest,
    startDate: addDays(today, startOffset).toISOString(),
    endDate: addDays(today, endOffset).toISOString(),
    assignedEmployeeIds: Object.keys(assignments),
    assignments: Object.fromEntries(
      Object.entries(assignments).map(([employeeId, { assignedOffset, ...detail }]) => [
        employeeId,
        { ...detail, assignedAt: addDays(today, assignedOffset).toISOString() },
      ]),
    ),
  }));
  const projectsById = Object.fromEntries(projects.map((p) => [p.id, p]));

  // When the demo is first opened on a weekday afternoon, include a finished
  // morning shift so "today" and "this week" are not empty during a demo.
  const morningStart = atTime(today, '07:30');
  const morningMinutes = Math.min(270, Math.floor((now - morningStart) / 60_000) - 60);
  const todayShift =
    !isWeekend(now) && morningMinutes >= 120
      ? [
          {
            id: 'att-1001-000',
            employeeId: DEMO_EMPLOYEE_ID,
            customerId: 'cust-03',
            projectId: 'proj-301',
            checkInAt: morningStart.toISOString(),
            checkOutAt: addMinutes(morningStart, morningMinutes).toISOString(),
            durationMinutes: morningMinutes,
            status: 'completed',
            checkInNote: 'Aisle 7 cabling.',
            checkOutNote: 'Aisle 7 cameras connected and recording.',
            checkInLocation: null,
            checkOutLocation: null,
          },
        ]
      : [];

  const attendance = [
    ...todayShift,
    ...buildAttendance(attendanceTemplates, DEMO_EMPLOYEE_ID, projectsById, now, 'att-1001'),
    ...buildAttendance(otherEmployeeAttendance, OTHER_EMPLOYEE_ID, projectsById, now, 'att-1002'),
  ];

  const lastShift = attendance.find((r) => r.id === 'att-1001-001');

  const notifications = [
    {
      id: 'ntf-001',
      employeeId: DEMO_EMPLOYEE_ID,
      title: 'New project assignment',
      message: `You have been assigned to Patient Wi-Fi Expansion at Meridian Health Clinic, starting in 10 days.`,
      type: 'new-assignment',
      link: '/projects/proj-202',
      createdAt: subHours(now, 2).toISOString(),
      isRead: false,
    },
    {
      id: 'ntf-002',
      employeeId: DEMO_EMPLOYEE_ID,
      title: 'Schedule reminder',
      message: 'Campus AV Installation: collect Hall D keys from Campus Security before 8:00 on your next visit.',
      type: 'schedule-reminder',
      link: '/projects/proj-501',
      createdAt: subHours(now, 5).toISOString(),
      isRead: false,
    },
    {
      id: 'ntf-003',
      employeeId: DEMO_EMPLOYEE_ID,
      title: 'Check-out recorded',
      message: `Your shift on Warehouse Network Upgrade (Brightwell Logistics) was recorded: 8h 30m.`,
      type: 'check-out',
      link: '/attendance',
      createdAt: lastShift.checkOutAt,
      isRead: true,
    },
    {
      id: 'ntf-004',
      employeeId: DEMO_EMPLOYEE_ID,
      title: 'Assignment updated',
      message: 'Office Fit-Out Electrical is on hold pending a building permit amendment. Your supervisor will confirm the restart date.',
      type: 'assignment-update',
      link: '/projects/proj-401',
      createdAt: subDays(now, 1).toISOString(),
      isRead: false,
    },
    {
      id: 'ntf-005',
      employeeId: DEMO_EMPLOYEE_ID,
      title: 'Quarterly safety training',
      message: 'The Q4 ladder and electrical safety module is available in the learning portal. Please complete it by the end of the month.',
      type: 'announcement',
      link: null,
      createdAt: subDays(now, 2).toISOString(),
      isRead: true,
    },
    {
      id: 'ntf-006',
      employeeId: DEMO_EMPLOYEE_ID,
      title: 'Shift started',
      message: 'Check-in confirmed for Clinic HVAC Controls Retrofit at Meridian Health Clinic.',
      type: 'shift-confirmation',
      link: '/attendance',
      createdAt: attendance.find((r) => r.id === 'att-1001-002').checkInAt,
      isRead: true,
    },
    {
      id: 'ntf-007',
      employeeId: DEMO_EMPLOYEE_ID,
      title: 'Holiday schedule published',
      message: 'The end-of-year holiday schedule is now available. Speak to your supervisor about planned leave by November 15.',
      type: 'announcement',
      link: null,
      createdAt: subMinutes(subDays(now, 4), 90).toISOString(),
      isRead: false,
    },
    {
      id: 'ntf-101',
      employeeId: OTHER_EMPLOYEE_ID,
      title: 'New project assignment',
      message: 'You have been assigned to Data Hall Rack Installation.',
      type: 'new-assignment',
      link: '/projects/proj-601',
      createdAt: subDays(now, 3).toISOString(),
      isRead: false,
    },
  ];

  return { employees, customers, projects, attendance, notifications };
}
