/**
 * Demo dataset
 * ------------
 * Generated deterministically (seeded PRNG) relative to the date the demo is
 * first opened, so attendance, invoices and charts always look current.
 * Invoices are produced with the same calculation engine the app uses, so
 * every seeded total is mathematically consistent with its attendance records.
 *
 * All names, companies, addresses and identifiers are fictional.
 */
import { addDays, addMonths, endOfMonth, format, getDay, startOfMonth, subDays, subMonths } from 'date-fns';
import {
  ATTENDANCE_STATUS,
  buildBillingRows,
  calculateDueDate,
  calculateInvoiceTotals,
  calculateRecordedMinutes,
  computeInvoiceStatus,
  groupBillingRowsIntoLines,
} from '../utils/calculations';
import { toDate, toDateKey } from '../utils/dateUtils';
import { formatInvoiceNumber } from '../utils/invoiceNumber';

export const DEMO_ADMIN = {
  id: 'adm_01',
  name: 'Alexandra Weber',
  email: 'admin@example.com',
  role: 'Owner',
  title: 'Managing Director',
};

export const DEMO_CREDENTIALS = { email: 'admin@example.com', password: 'Admin123!' };

/* Seeded PRNG so the dataset is identical on every reset. */
function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pad = (n, len = 2) => String(n).padStart(len, '0');
const at = (date, hours, minutes = 0) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, 0, 0);
  return d.toISOString();
};
const key = (d) => format(d, 'yyyy-MM-dd');

function buildBusiness() {
  return {
    id: 'biz_01',
    name: 'Brightline Workforce Solutions GmbH',
    logo: null,
    email: 'billing@brightline-workforce.example',
    phone: '+49 30 5550 1820',
    address: { street: 'Torstraße 118', postalCode: '10119', city: 'Berlin', country: 'Germany' },
    website: 'https://brightline-workforce.example',
    registrationNumber: 'HRB 214587 B',
    taxId: 'DE318274650',
    currency: 'EUR',
    timezone: 'Europe/Berlin',
  };
}

function buildInvoiceSettings() {
  return {
    prefix: 'INV',
    nextSequence: 1,
    defaultPaymentTerms: 14,
    currency: 'EUR',
    defaultTaxRate: 19,
    pricesIncludeTax: false,
    dueDateRule: 'issue_plus_terms',
    paymentInstructions:
      'Please transfer the amount due to Brightline Workforce Solutions GmbH, IBAN DE89 3704 0044 0532 0130 00, BIC COBADEFFXXX, quoting the invoice number as reference.',
    footer: 'Brightline Workforce Solutions GmbH · Torstraße 118 · 10119 Berlin · HRB 214587 B · VAT DE318274650',
    defaultNotes: 'Thank you for your business. Hours are based on approved attendance records for the billing period.',
    defaultGrouping: 'employee_project',
  };
}

function buildWorkingHours() {
  return {
    timezone: 'Europe/Berlin',
    workingDays: [1, 2, 3, 4, 5],
    expectedDailyHours: 8,
    defaultBreakMinutes: 30,
    reviewShiftsOverHours: 12,
    openShiftAlertHours: 14,
    requireCorrectionReason: true,
    locationCapture: 'optional',
    defaultBillingPeriod: 'last_month',
  };
}

const CUSTOMERS = [
  {
    id: 'cus_01',
    customerNumber: 'CUS-1001',
    companyName: 'Hartmann Logistik GmbH',
    contactPerson: 'Stefan Hartmann',
    email: 'accounts@hartmann-logistik.example',
    phone: '+49 40 5550 2210',
    billingAddress: { street: 'Am Sandtorkai 41', postalCode: '20457', city: 'Hamburg', country: 'Germany' },
    serviceAddress: 'Distribution Centre Waltershof, Köhlbranddeich 30, 21129 Hamburg',
    taxId: 'DE287415539',
    currency: 'EUR',
    paymentTerms: 14,
    taxRate: 19,
    status: 'active',
    notes: 'Key account since 2024. Purchase order number required on every invoice (PO 4500-2210).',
  },
  {
    id: 'cus_02',
    customerNumber: 'CUS-1002',
    companyName: 'Meridian Retail Group B.V.',
    contactPerson: 'Femke de Vries',
    email: 'ap@meridian-retail.example',
    phone: '+31 10 555 4120',
    billingAddress: { street: 'Wilhelminakade 91', postalCode: '3072 AP', city: 'Rotterdam', country: 'Netherlands' },
    serviceAddress: 'Lijnbaan 52, 3012 EP Rotterdam',
    taxId: 'NL859210473B01',
    currency: 'EUR',
    paymentTerms: 30,
    taxRate: 0,
    status: 'active',
    notes: 'Intra-EU B2B service: VAT reverse charge applies (0 % on invoice).',
  },
  {
    id: 'cus_03',
    customerNumber: 'CUS-1003',
    companyName: 'Alpenblick Hotels AG',
    contactPerson: 'Johanna Bauer',
    email: 'buchhaltung@alpenblick-hotels.example',
    phone: '+49 89 5550 7731',
    billingAddress: { street: 'Maximilianstraße 17', postalCode: '80539', city: 'München', country: 'Germany' },
    serviceAddress: 'Hotel Alpenblick München City, Sonnenstraße 9, 80331 München',
    taxId: 'DE811920334',
    currency: 'EUR',
    paymentTerms: 14,
    taxRate: 19,
    status: 'active',
    notes: 'Weekend shifts possible during peak season.',
  },
  {
    id: 'cus_04',
    customerNumber: 'CUS-1004',
    companyName: 'Nordlicht Kliniken gGmbH',
    contactPerson: 'Dr. Markus Engel',
    email: 'rechnungen@nordlicht-kliniken.example',
    phone: '+49 30 5550 9045',
    billingAddress: { street: 'Invalidenstraße 80', postalCode: '10115', city: 'Berlin', country: 'Germany' },
    serviceAddress: 'Klinikum Mitte, Luisenstraße 64, 10117 Berlin',
    taxId: 'DE290118457',
    currency: 'EUR',
    paymentTerms: 14,
    taxRate: 19,
    status: 'active',
    notes: 'Invoices must reference cost centre KST-4410.',
  },
  {
    id: 'cus_05',
    customerNumber: 'CUS-1005',
    companyName: 'Vantage Office Parks GmbH',
    contactPerson: 'Lena Gruber',
    email: 'finance@vantage-parks.example',
    phone: '+43 1 555 3380',
    billingAddress: { street: 'Wienerbergstraße 11', postalCode: '1100', city: 'Wien', country: 'Austria' },
    serviceAddress: 'Vantage Tower Wienerberg, Wienerbergstraße 11, 1100 Wien',
    taxId: 'ATU71284509',
    currency: 'EUR',
    paymentTerms: 21,
    taxRate: 0,
    status: 'active',
    notes: 'New customer. Intra-EU reverse charge (0 % VAT on invoice).',
  },
  {
    id: 'cus_06',
    customerNumber: 'CUS-1006',
    companyName: 'Kestrel Engineering Ltd',
    contactPerson: 'Aoife Gallagher',
    email: 'payables@kestrel-eng.example',
    phone: '+353 1 555 0192',
    billingAddress: { street: '14 Grand Canal Quay', postalCode: 'D02 X5Y7', city: 'Dublin', country: 'Ireland' },
    serviceAddress: 'Kestrel Plant 2, Ballymount Road, Dublin 12',
    taxId: 'IE3374120WH',
    currency: 'EUR',
    paymentTerms: 30,
    taxRate: 0,
    status: 'inactive',
    notes: 'Shutdown project completed. No further work scheduled.',
  },
];

const EMPLOYEES = [
  ['emp_01', 'EMP-1001', 'Lukas Brandt', 'Warehouse Team Lead', 'Logistics'],
  ['emp_02', 'EMP-1002', 'Amira Haddad', 'Operations Specialist', 'Logistics'],
  ['emp_03', 'EMP-1003', 'Jonas Keller', 'Forklift Operator', 'Logistics'],
  ['emp_04', 'EMP-1004', 'Sofia Marino', 'Inventory Analyst', 'Logistics'],
  ['emp_05', 'EMP-1005', 'Mateusz Nowak', 'Shopfitter', 'Retail Services'],
  ['emp_06', 'EMP-1006', 'Elif Yilmaz', 'Visual Merchandiser', 'Retail Services'],
  ['emp_07', 'EMP-1007', 'Daniel Okafor', 'Housekeeping Supervisor', 'Hospitality'],
  ['emp_08', 'EMP-1008', 'Clara Lindqvist', 'Room Attendant', 'Hospitality'],
  ['emp_09', 'EMP-1009', 'Tomasz Zielinski', 'Facility Technician', 'Facility Services'],
  ['emp_10', 'EMP-1010', 'Hannah Fischer', 'Front Desk Coordinator', 'Facility Services'],
  ['emp_11', 'EMP-1011', 'Marco Bianchi', 'Facility Technician', 'Facility Services'],
  ['emp_12', 'EMP-1012', 'Petra Novak', 'Mechanical Fitter', 'Industrial'],
];

export function buildDemoData(now = new Date()) {
  const rand = mulberry32(20261012);
  const pick = (list) => list[Math.floor(rand() * list.length)];
  const between = (min, max) => min + Math.floor(rand() * (max - min + 1));

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const M0 = startOfMonth(today);
  const M1 = subMonths(M0, 1);
  const M2 = subMonths(M0, 2);
  const M3 = subMonths(M0, 3);
  const nextMonth = addMonths(M0, 1);
  const seedStamp = subMonths(M0, 7).toISOString();

  /* --------------------------- Customers & rates --------------------------- */
  const customers = CUSTOMERS.map((c, i) => ({
    ...c,
    createdAt: subMonths(M0, 14 - i).toISOString(),
    updatedAt: subMonths(M0, 2).toISOString(),
  }));

  const rate = (id, customerId, euros, from, to = null, status = 'active', notes = '') => ({
    id,
    customerId,
    amount: Math.round(euros * 100),
    currency: 'EUR',
    effectiveFrom: from,
    effectiveTo: to,
    status,
    notes,
    createdAt: new Date(`${from}T09:00:00`).toISOString(),
    updatedAt: new Date(`${from}T09:00:00`).toISOString(),
  });

  const hourlyRates = [
    rate('rate_01', 'cus_01', 34, key(subMonths(M0, 14)), key(subDays(M1, 1)), 'active', 'Initial contract rate'),
    rate('rate_02', 'cus_01', 36.5, key(M1), null, 'active', 'Annual rate review (+7.4 %)'),
    rate('rate_03', 'cus_02', 32, key(subMonths(M0, 13)), null, 'active', 'Framework agreement 2025'),
    rate('rate_04', 'cus_03', 38, key(subMonths(M0, 12)), key(subDays(nextMonth, 1)), 'active', 'Hospitality rate'),
    rate('rate_05', 'cus_03', 40, key(nextMonth), null, 'active', 'Scheduled peak-season rate'),
    rate('rate_06', 'cus_04', 42, key(subMonths(M0, 11)), null, 'active', 'Healthcare facility rate incl. certification'),
    rate('rate_07', 'cus_05', 35, key(subMonths(M0, 2)), null, 'active', 'Introductory rate'),
    rate('rate_08', 'cus_06', 30, key(subMonths(M0, 9)), key(endOfMonth(M3)), 'active', 'Shutdown project rate'),
  ];

  /* ------------------------------- Projects -------------------------------- */
  const projects = [
    {
      id: 'prj_01',
      projectNumber: 'PRJ-2401',
      name: 'Warehouse Operations Support',
      customerId: 'cus_01',
      description: 'Ongoing staffing for inbound/outbound operations at the Waltershof distribution centre.',
      address: 'Köhlbranddeich 30, 21129 Hamburg',
      geo: { lat: 53.5236, lng: 9.9314 },
      startDate: key(subMonths(M0, 6)),
      endDate: '',
      status: 'active',
      assignedEmployeeIds: ['emp_01', 'emp_02', 'emp_03'],
      targetHours: 3200,
      instructions: 'Report to gate 4. Safety shoes and high-visibility vest required at all times.',
      internalNotes: 'Customer wants the same core team on site where possible.',
    },
    {
      id: 'prj_02',
      projectNumber: 'PRJ-2402',
      name: 'Q4 Inventory Audit',
      customerId: 'cus_01',
      description: 'Full cycle count and reconciliation ahead of year-end closing.',
      address: 'Köhlbranddeich 30, 21129 Hamburg',
      geo: { lat: 53.5236, lng: 9.9314 },
      startDate: key(M1),
      endDate: key(endOfMonth(nextMonth)),
      status: 'active',
      assignedEmployeeIds: ['emp_04', 'emp_03'],
      targetHours: 640,
      instructions: 'Scanner devices are issued at the shift office. Count sheets must be signed off daily.',
      internalNotes: '',
    },
    {
      id: 'prj_03',
      projectNumber: 'PRJ-2403',
      name: 'Store Fit-out Rotterdam Centrum',
      customerId: 'cus_02',
      description: 'Shopfitting and fixture installation for the flagship store refurbishment.',
      address: 'Lijnbaan 52, 3012 EP Rotterdam',
      geo: { lat: 51.9198, lng: 4.4744 },
      startDate: key(M3),
      endDate: key(endOfMonth(nextMonth)),
      status: 'active',
      assignedEmployeeIds: ['emp_05', 'emp_06'],
      targetHours: 1400,
      instructions: 'Store is open during works: keep the customer area clear before 09:30.',
      internalNotes: 'Night work not approved by the landlord.',
    },
    {
      id: 'prj_04',
      projectNumber: 'PRJ-2404',
      name: 'Seasonal Merchandising Rollout',
      customerId: 'cus_02',
      description: 'Holiday window and floor displays across five Dutch stores.',
      address: 'Various stores, Randstad region',
      geo: null,
      startDate: key(addDays(nextMonth, 2)),
      endDate: key(endOfMonth(nextMonth)),
      status: 'planned',
      assignedEmployeeIds: ['emp_06'],
      targetHours: 320,
      instructions: 'Display guidelines will be shared by the customer one week before start.',
      internalNotes: '',
    },
    {
      id: 'prj_05',
      projectNumber: 'PRJ-2405',
      name: 'Housekeeping Support Munich City',
      customerId: 'cus_03',
      description: 'Room attendant and supervisor support for 180-room city hotel.',
      address: 'Sonnenstraße 9, 80331 München',
      geo: { lat: 48.1374, lng: 11.5655 },
      startDate: key(subMonths(M0, 5)),
      endDate: '',
      status: 'active',
      assignedEmployeeIds: ['emp_07', 'emp_08'],
      targetHours: null,
      instructions: 'Check in at the staff entrance on Schwanthalerstraße. Uniforms provided by the hotel.',
      internalNotes: '',
    },
    {
      id: 'prj_06',
      projectNumber: 'PRJ-2406',
      name: 'Facility Maintenance Klinikum Mitte',
      customerId: 'cus_04',
      description: 'Preventive maintenance and on-call technician cover.',
      address: 'Luisenstraße 64, 10117 Berlin',
      geo: { lat: 52.5251, lng: 13.3775 },
      startDate: key(subMonths(M0, 8)),
      endDate: '',
      status: 'active',
      assignedEmployeeIds: ['emp_09', 'emp_10', 'emp_11'],
      targetHours: 4000,
      instructions: 'Hygiene briefing required before first shift. Sign the technical log at every visit.',
      internalNotes: 'Contract renewal due at year end.',
    },
    {
      id: 'prj_07',
      projectNumber: 'PRJ-2407',
      name: 'Reception & Front Desk Services',
      customerId: 'cus_05',
      description: 'Front desk, visitor management and mailroom for Vantage Tower.',
      address: 'Wienerbergstraße 11, 1100 Wien',
      geo: { lat: 48.1717, lng: 16.3439 },
      startDate: key(M1),
      endDate: '',
      status: 'active',
      assignedEmployeeIds: ['emp_10', 'emp_02'],
      targetHours: 900,
      instructions: 'Business attire. Visitor badges must be returned at the end of each shift.',
      internalNotes: '',
    },
    {
      id: 'prj_08',
      projectNumber: 'PRJ-2408',
      name: 'Plant Shutdown Support',
      customerId: 'cus_06',
      description: 'Mechanical support during planned annual maintenance shutdown.',
      address: 'Ballymount Road, Dublin 12',
      geo: { lat: 53.3165, lng: -6.3618 },
      startDate: key(M3),
      endDate: key(endOfMonth(M3)),
      status: 'completed',
      assignedEmployeeIds: ['emp_12', 'emp_05'],
      targetHours: 320,
      instructions: 'Permit-to-work system applies.',
      internalNotes: 'Completed on schedule. Customer satisfied.',
    },
    {
      id: 'prj_09',
      projectNumber: 'PRJ-2409',
      name: 'Medical Equipment Relocation',
      customerId: 'cus_04',
      description: 'Relocation of imaging equipment to the new radiology wing.',
      address: 'Luisenstraße 64, 10117 Berlin',
      geo: { lat: 52.5251, lng: 13.3775 },
      startDate: key(M2),
      endDate: key(endOfMonth(nextMonth)),
      status: 'on_hold',
      assignedEmployeeIds: ['emp_09'],
      targetHours: 240,
      instructions: 'Coordinate with the radiology department lead before moving any equipment.',
      internalNotes: 'Paused: waiting for the new wing to receive its operating permit.',
    },
  ].map((p, i) => ({ ...p, createdAt: subMonths(M0, 9 - (i % 4)).toISOString(), updatedAt: seedStamp }));

  /* ------------------------------- Employees ------------------------------- */
  const employees = EMPLOYEES.map(([id, number, fullName, jobTitle, department], i) => {
    const [first, last] = fullName.toLowerCase().split(' ');
    const status = id === 'emp_11' ? 'inactive' : id === 'emp_12' ? 'archived' : 'active';
    return {
      id,
      employeeNumber: number,
      fullName,
      email: `${first}.${last}@brightline-workforce.example`,
      phone: `+49 151 555 ${pad(30 + i)}${pad(between(10, 99))}`,
      jobTitle,
      department,
      employmentStartDate: key(subMonths(M0, 30 - i * 2)),
      status,
      assignedProjectIds: projects.filter((p) => p.assignedEmployeeIds.includes(id)).map((p) => p.id),
      notes:
        id === 'emp_11'
          ? 'On extended leave. Historical attendance retained.'
          : id === 'emp_12'
            ? 'Contract ended after the Kestrel shutdown project.'
            : '',
      createdAt: subMonths(M0, 30 - i * 2).toISOString(),
      updatedAt: seedStamp,
    };
  });

  /* ------------------------------ Attendance ------------------------------- */
  // Each employee's work windows: [projectId, fromDate, toDate].
  const windows = {
    emp_01: [['prj_01', M3, today]],
    emp_02: [['prj_01', M3, subDays(M1, 1)], ['prj_01', M1, today], ['prj_07', M1, today]],
    emp_03: [['prj_01', M3, today], ['prj_02', M1, today]],
    emp_04: [['prj_02', M1, today]],
    emp_05: [['prj_08', M3, endOfMonth(M3)], ['prj_03', M2, today]],
    emp_06: [['prj_03', M3, today]],
    emp_07: [['prj_05', M3, today]],
    emp_08: [['prj_05', M3, today]],
    emp_09: [['prj_06', M3, today], ['prj_09', M2, endOfMonth(M2)]],
    emp_10: [['prj_06', M3, subDays(M1, 1)], ['prj_07', M1, today]],
    emp_11: [['prj_06', M3, endOfMonth(M2)]],
    emp_12: [['prj_08', M3, endOfMonth(M3)]],
  };
  const projectById = Object.fromEntries(projects.map((p) => [p.id, p]));
  const checkInNotes = ['', '', '', 'Started at loading bay 3', 'Briefing with site manager', 'Key collected from security', ''];
  const checkOutNotes = ['', '', 'All tasks completed', 'Handover to evening shift', 'Materials ordered for tomorrow', '', 'Site locked and keys returned'];

  const attendance = [];
  let seq = 1;
  const nextAttendanceId = () => `att_${pad(seq++, 4)}`;

  const location = (project, timestamp) =>
    project?.geo && rand() < 0.75
      ? {
          latitude: Number((project.geo.lat + (rand() - 0.5) * 0.002).toFixed(5)),
          longitude: Number((project.geo.lng + (rand() - 0.5) * 0.002).toFixed(5)),
          accuracyMeters: between(6, 40),
          capturedAt: timestamp,
        }
      : null;

  const makeRecord = (employeeId, projectId, checkInAt, checkOutAt, extra = {}) => {
    const project = projectById[projectId];
    const recorded = calculateRecordedMinutes(checkInAt, checkOutAt);
    return {
      id: nextAttendanceId(),
      employeeId,
      customerId: project.customerId,
      projectId,
      checkInAt,
      checkOutAt,
      recordedDurationMinutes: recorded,
      billableDurationMinutes: null,
      status: checkOutAt ? ATTENDANCE_STATUS.COMPLETED : ATTENDANCE_STATUS.ACTIVE,
      checkInNote: pick(checkInNotes),
      checkOutNote: checkOutAt ? pick(checkOutNotes) : '',
      checkInLocation: location(project, checkInAt),
      checkOutLocation: checkOutAt ? location(project, checkOutAt) : null,
      correctionHistory: [],
      billingAdjustments: [],
      billingExclusion: null,
      invoiceId: null,
      source: 'employee_app',
      createdAt: checkInAt,
      updatedAt: checkOutAt ?? checkInAt,
      updatedBy: null,
      ...extra,
    };
  };

  const yesterday = subDays(today, 1);
  for (let day = new Date(M3); day <= yesterday; day = addDays(day, 1)) {
    const weekday = getDay(day);
    Object.entries(windows).forEach(([employeeId, empWindows]) => {
      const options = empWindows.filter(([, from, to]) => day >= from && day <= to).map(([pid]) => pid);
      const uniqueOptions = [...new Set(options)];
      if (uniqueOptions.length === 0) return;
      const isHotel = uniqueOptions.includes('prj_05');
      if (weekday === 0) return;
      if (weekday === 6 && !(isHotel && rand() < 0.35)) return;
      if (rand() < 0.08) return; // day off / sick / holiday
      const projectId = uniqueOptions[Math.floor(day.getDate() + Number(employeeId.slice(-2))) % uniqueOptions.length];
      const startH = between(6, 8);
      const startM = pick([0, 5, 10, 15, 20, 30, 40, 45, 50]);
      const durationMinutes = between(84, 114) * 5; // 7h00 – 9h30
      const checkInAt = at(day, startH, startM);
      const checkOutAt = new Date(new Date(checkInAt).getTime() + durationMinutes * 60000).toISOString();
      attendance.push(makeRecord(employeeId, projectId, checkInAt, checkOutAt));
    });
  }

  const findRecord = (predicate) => attendance.find(predicate);
  const recordsOf = (employeeId, from, to) =>
    attendance.filter((a) => a.employeeId === employeeId && a.checkInAt >= from.toISOString() && a.checkInAt < to.toISOString());

  // Needs review: a 13h shift last month at Vantage (customer not yet invoiced for that month).
  const longShift = recordsOf('emp_10', addDays(M1, 8), endOfMonth(M1)).find((a) => a.projectId === 'prj_07');
  if (longShift) {
    const start = new Date(longShift.checkInAt);
    longShift.checkOutAt = new Date(start.getTime() + 13 * 60 * 60000 + 20 * 60000).toISOString();
    longShift.recordedDurationMinutes = calculateRecordedMinutes(longShift.checkInAt, longShift.checkOutAt);
    longShift.status = ATTENDANCE_STATUS.NEEDS_REVIEW;
    longShift.checkOutNote = 'Forgot to check out at end of shift — checked out the next morning';
    longShift.updatedAt = longShift.checkOutAt;
  }

  // Needs review: suspicious short shift this week at Hartmann.
  const shortShift = recordsOf('emp_01', subDays(today, 6), today).slice(-2)[0];
  if (shortShift) {
    shortShift.checkOutAt = new Date(new Date(shortShift.checkInAt).getTime() + 42 * 60000).toISOString();
    shortShift.recordedDurationMinutes = 42;
    shortShift.status = ATTENDANCE_STATUS.NEEDS_REVIEW;
    shortShift.checkOutNote = 'Checked out by mistake, continued working until 16:00';
  }

  // Corrected record last month (Hartmann) — check-in was recorded late.
  const corrected = recordsOf('emp_03', addDays(M1, 3), addDays(M1, 14)).find((a) => a.projectId === 'prj_01');
  if (corrected) {
    const originalCheckIn = new Date(new Date(corrected.checkInAt).getTime() + 95 * 60000).toISOString();
    corrected.status = ATTENDANCE_STATUS.CORRECTED;
    corrected.correctionHistory = [
      {
        id: 'cor_01',
        at: new Date(new Date(corrected.checkOutAt).getTime() + 18 * 60 * 60000).toISOString(),
        by: DEMO_ADMIN.name,
        byId: DEMO_ADMIN.id,
        type: 'correction',
        reason: 'Employee app was offline at the gate; site supervisor confirmed actual start time.',
        previous: {
          checkInAt: originalCheckIn,
          checkOutAt: corrected.checkOutAt,
          recordedDurationMinutes: calculateRecordedMinutes(originalCheckIn, corrected.checkOutAt),
          customerId: corrected.customerId,
          projectId: corrected.projectId,
        },
        next: {
          checkInAt: corrected.checkInAt,
          checkOutAt: corrected.checkOutAt,
          recordedDurationMinutes: corrected.recordedDurationMinutes,
          customerId: corrected.customerId,
          projectId: corrected.projectId,
        },
      },
    ];
    corrected.updatedAt = corrected.correctionHistory[0].at;
    corrected.updatedBy = DEMO_ADMIN.name;
  }

  // Cancelled duplicate this month (Meridian).
  const dupSource = recordsOf('emp_06', M0, today)[0] ?? recordsOf('emp_06', M1, M0)[0];
  if (dupSource) {
    const dup = makeRecord('emp_06', dupSource.projectId, new Date(new Date(dupSource.checkInAt).getTime() + 4 * 60000).toISOString(), dupSource.checkOutAt);
    dup.status = ATTENDANCE_STATUS.CANCELLED;
    dup.checkInNote = 'Duplicate check-in (double tap)';
    dup.correctionHistory = [
      {
        id: 'cor_02',
        at: dupSource.checkOutAt,
        by: DEMO_ADMIN.name,
        byId: DEMO_ADMIN.id,
        type: 'cancellation',
        reason: 'Duplicate record created by a double check-in. Original record kept.',
        previous: { status: ATTENDANCE_STATUS.COMPLETED },
        next: { status: ATTENDANCE_STATUS.CANCELLED },
      },
    ];
    attendance.push(dup);
  }

  // Excluded from billing: internal safety training this month (Hartmann).
  const training = recordsOf('emp_02', M0, today).find((a) => a.projectId === 'prj_01') ?? recordsOf('emp_02', M1, M0).slice(-1)[0];
  if (training) {
    training.checkInNote = 'Forklift safety recertification (internal training)';
    training.billingExclusion = {
      reason: 'Internal safety training — not billable to customer.',
      at: training.checkOutAt,
      by: DEMO_ADMIN.name,
    };
  }

  // Billable adjustment: customer agreed to pay 30 minutes less for an extended lunch break (Q4 audit).
  const adjusted = recordsOf('emp_04', M0, today)[0] ?? recordsOf('emp_04', M1, M0).slice(-1)[0];
  if (adjusted) {
    adjusted.billableDurationMinutes = adjusted.recordedDurationMinutes - 30;
    adjusted.billingAdjustments = [
      {
        id: 'adj_01',
        at: adjusted.checkOutAt,
        by: DEMO_ADMIN.name,
        field: 'billableDurationMinutes',
        previous: adjusted.recordedDurationMinutes,
        next: adjusted.billableDurationMinutes,
        reason: 'Extended lunch break during stock-count system outage — agreed with customer not to bill 30 min.',
      },
    ];
  }

  // Missing check-out: shift opened on the previous working day and never closed.
  const prevWorkday = getDay(yesterday) === 0 ? subDays(yesterday, 2) : getDay(yesterday) === 6 ? subDays(yesterday, 1) : yesterday;
  const prevKey = key(prevWorkday);
  const openIndex = attendance.findIndex((a) => a.employeeId === 'emp_07' && toDateKey(a.checkInAt) === prevKey);
  const openShift = makeRecord('emp_07', 'prj_05', at(prevWorkday, 7, 10), null, { checkInNote: 'Early shift — floor 3 to 5' });
  if (openIndex >= 0) attendance.splice(openIndex, 1, { ...openShift, id: attendance[openIndex].id });
  else attendance.push(openShift);
  // An employee cannot work again while a shift is still open.
  for (let i = attendance.length - 1; i >= 0; i -= 1) {
    const a = attendance[i];
    if (a.employeeId === 'emp_07' && a.checkInAt > openShift.checkInAt) attendance.splice(i, 1);
  }

  // Today's activity: active shifts and one completed early shift.
  const minutesSinceMidnight = (now.getTime() - today.getTime()) / 60000;
  const activeToday = [
    ['emp_01', 'prj_01', 7 * 60 + 5],
    ['emp_03', 'prj_02', 7 * 60 + 30],
    ['emp_05', 'prj_03', 7 * 60 + 45],
    ['emp_08', 'prj_05', 6 * 60 + 55],
    ['emp_09', 'prj_06', 8 * 60],
  ];
  activeToday.forEach(([employeeId, projectId, startMinute], i) => {
    const startedAt =
      minutesSinceMidnight > startMinute + 15
        ? new Date(today.getTime() + startMinute * 60000)
        : new Date(now.getTime() - (25 + i * 11) * 60000);
    attendance.push(makeRecord(employeeId, projectId, startedAt.toISOString(), null, { checkInNote: pick(checkInNotes) }));
  });
  if (minutesSinceMidnight > 12 * 60) {
    attendance.push(makeRecord('emp_06', 'prj_03', at(today, 6, 30), at(today, 11, 45), { checkOutNote: 'Half day — fixtures delivered' }));
  }

  attendance.sort((a, b) => a.checkInAt.localeCompare(b.checkInAt));

  /* ------------------------------- Invoices -------------------------------- */
  const invoiceSettings = buildInvoiceSettings();
  const workingHours = buildWorkingHours();
  const employeesById = Object.fromEntries(employees.map((e) => [e.id, e]));
  const invoices = [];
  const payments = [];
  const year = now.getFullYear();
  let invoiceSeq = 1;
  let lineSeq = 1;
  let paymentSeq = 1;
  const cap = (d) => (d > today ? today : d);

  const createInvoice = ({ customerId, month, issueDate, finalize = true, sent = true, idSuffix }) => {
    const customer = customers.find((c) => c.id === customerId);
    const from = key(month);
    const to = key(endOfMonth(month));
    const records = attendance.filter((a) => a.customerId === customerId && toDateKey(a.checkInAt) >= from && toDateKey(a.checkInAt) <= to);
    const rows = buildBillingRows(records, {
      rates: hourlyRates,
      invoices,
      currency: customer.currency,
      reviewShiftsOverHours: workingHours.reviewShiftsOverHours,
    });
    const lineItems = groupBillingRowsIntoLines(rows, invoiceSettings.defaultGrouping, {
      employeesById,
      projectsById: projectById,
      idFactory: () => `line_${pad(lineSeq++, 4)}`,
    });
    const totals = calculateInvoiceTotals({ lineItems, taxRate: customer.taxRate ?? invoiceSettings.defaultTaxRate });
    const issueKey = key(cap(issueDate));
    const id = `inv_${pad(invoices.length + 1, 4)}${idSuffix ?? ''}`;
    const invoice = {
      id,
      invoiceNumber: finalize ? formatInvoiceNumber(invoiceSettings.prefix, year, invoiceSeq++) : null,
      customerId,
      customerSnapshot: finalize ? snapshotCustomer(customer) : null,
      issueDate: issueKey,
      dueDate: calculateDueDate(issueKey, customer.paymentTerms),
      paymentTerms: customer.paymentTerms,
      billingPeriodStart: from,
      billingPeriodEnd: to,
      projectId: null,
      currency: customer.currency,
      grouping: invoiceSettings.defaultGrouping,
      lineItems,
      discountType: 'none',
      discountValue: 0,
      discountReason: '',
      taxRate: customer.taxRate ?? invoiceSettings.defaultTaxRate,
      taxLabel: customer.taxRate === 0 ? 'VAT (reverse charge)' : 'VAT',
      ...totals,
      notes:
        customer.taxRate === 0
          ? `${invoiceSettings.defaultNotes} VAT reverse charge: the recipient is liable for VAT (Art. 196 VAT Directive).`
          : invoiceSettings.defaultNotes,
      status: 'draft',
      createdAt: new Date(`${issueKey}T10:00:00`).toISOString(),
      updatedAt: new Date(`${issueKey}T10:00:00`).toISOString(),
      finalizedAt: finalize ? new Date(`${issueKey}T11:00:00`).toISOString() : null,
      sentAt: finalize && sent ? new Date(`${issueKey}T11:30:00`).toISOString() : null,
      voidedAt: null,
      voidReason: '',
      needsRecalculation: false,
      auditTrail: [
        { at: new Date(`${issueKey}T10:00:00`).toISOString(), by: DEMO_ADMIN.name, action: 'Draft created from attendance' },
        ...(finalize ? [{ at: new Date(`${issueKey}T11:00:00`).toISOString(), by: DEMO_ADMIN.name, action: 'Invoice finalized' }] : []),
        ...(finalize && sent ? [{ at: new Date(`${issueKey}T11:30:00`).toISOString(), by: DEMO_ADMIN.name, action: 'Marked as sent' }] : []),
      ],
    };
    if (finalize) {
      lineItems.forEach((line) => line.attendanceRecordIds.forEach((rid) => {
        const rec = attendance.find((a) => a.id === rid);
        rec.invoiceId = id;
      }));
    }
    invoice.status = computeInvoiceStatus(invoice, key(today));
    invoices.push(invoice);
    return invoice;
  };

  const addPayment = (invoice, amount, date, method = 'bank_transfer', reference = '') => {
    const payment = {
      id: `pay_${pad(paymentSeq++, 3)}`,
      invoiceId: invoice.id,
      paymentDate: key(cap(date)),
      amount,
      method,
      reference: reference || `TRX-${invoice.invoiceNumber.slice(-4)}-${between(1000, 9999)}`,
      notes: '',
      recordedAt: new Date(`${key(cap(date))}T15:00:00`).toISOString(),
      recordedBy: DEMO_ADMIN.name,
    };
    payments.push(payment);
    invoice.amountPaid += amount;
    invoice.balanceDue = invoice.total - invoice.amountPaid;
    invoice.status = computeInvoiceStatus(invoice, key(today));
    invoice.auditTrail.push({ at: payment.recordedAt, by: DEMO_ADMIN.name, action: `Payment recorded (${(amount / 100).toFixed(2)} ${invoice.currency})` });
    return payment;
  };

  // Month M-3: everything invoiced and paid.
  ['cus_01', 'cus_02', 'cus_03', 'cus_04', 'cus_06'].forEach((cid, i) => {
    const inv = createInvoice({ customerId: cid, month: M3, issueDate: addDays(M2, 2 + (i % 2)) });
    addPayment(inv, inv.total, addDays(M2, 12 + i * 2));
  });

  // Month M-2: Meridian invoice voided and re-issued; Nordlicht overdue.
  const voided = createInvoice({ customerId: 'cus_02', month: M2, issueDate: addDays(M1, 1) });
  voided.taxRate = 21;
  Object.assign(voided, calculateInvoiceTotals({ lineItems: voided.lineItems, taxRate: 21 }));
  voided.taxLabel = 'VAT';
  voided.voidedAt = new Date(`${key(addDays(M1, 2))}T09:15:00`).toISOString();
  voided.voidReason = 'Issued with Dutch VAT (21 %) in error — reverse charge applies. Replaced by corrected invoice.';
  voided.status = 'void';
  voided.billingReleasedAt = new Date(`${key(addDays(M1, 2))}T09:20:00`).toISOString();
  voided.billingReleaseReason = 'Records released to be re-billed on the corrected invoice.';
  voided.releasedAttendanceIds = voided.lineItems.flatMap((l) => l.attendanceRecordIds);
  voided.auditTrail.push(
    { at: voided.voidedAt, by: DEMO_ADMIN.name, action: `Invoice voided: ${voided.voidReason}` },
    { at: voided.billingReleasedAt, by: DEMO_ADMIN.name, action: 'Attendance records released for re-billing' },
  );
  attendance.forEach((a) => {
    if (a.invoiceId === voided.id) {
      a.invoiceId = null;
      a.billingHistory = [{ at: voided.billingReleasedAt, invoiceId: voided.id, action: 'released', reason: voided.billingReleaseReason }];
    }
  });

  const m2Invoices = {
    cus_01: createInvoice({ customerId: 'cus_01', month: M2, issueDate: addDays(M1, 1) }),
    cus_02: createInvoice({ customerId: 'cus_02', month: M2, issueDate: addDays(M1, 2) }),
    cus_03: createInvoice({ customerId: 'cus_03', month: M2, issueDate: addDays(M1, 2) }),
    cus_04: createInvoice({ customerId: 'cus_04', month: M2, issueDate: addDays(M1, 2) }),
    cus_05: createInvoice({ customerId: 'cus_05', month: M2, issueDate: addDays(M1, 3) }),
  };
  addPayment(m2Invoices.cus_01, m2Invoices.cus_01.total, addDays(M1, 13));
  addPayment(m2Invoices.cus_02, m2Invoices.cus_02.total, addDays(M1, 24));
  addPayment(m2Invoices.cus_03, m2Invoices.cus_03.total, addDays(M1, 11), 'card');
  if (m2Invoices.cus_05.lineItems.length === 0) {
    invoices.splice(invoices.indexOf(m2Invoices.cus_05), 1);
    invoiceSeq -= 1;
  } else {
    addPayment(m2Invoices.cus_05, m2Invoices.cus_05.total, addDays(M1, 18));
  }
  // cus_04 (Nordlicht) stays unpaid → overdue.

  // Month M-1: mix of sent, partially paid, finalized (not sent) and a draft. Vantage left to invoice.
  createInvoice({ customerId: 'cus_01', month: M1, issueDate: addDays(M0, 1) });
  const meridianM1 = createInvoice({ customerId: 'cus_02', month: M1, issueDate: addDays(M0, 1) });
  addPayment(meridianM1, Math.round(meridianM1.total * 0.5), addDays(M0, 8), 'bank_transfer');
  createInvoice({ customerId: 'cus_04', month: M1, issueDate: addDays(M0, 2), sent: false });
  createInvoice({ customerId: 'cus_03', month: M1, issueDate: addDays(M0, 3), finalize: false });

  invoiceSettings.nextSequence = invoiceSeq;

  /* ---------------------- Notifications & activity log --------------------- */
  const iso = (d, h = 9, m = 0) => at(d, h, m);
  const lastInvoice = (cid) => [...invoices].reverse().find((i) => i.customerId === cid);
  const overdueInv = m2Invoices.cus_04;

  const notifications = [
    { title: 'Shift remains open', message: `Daniel Okafor checked in on ${format(prevWorkday, 'dd MMM')} at 07:10 and has not checked out.`, type: 'attendance', relatedEntityType: 'attendance', relatedEntityId: openShift.id, createdAt: iso(today, 6, 0) },
    longShift && { title: 'Attendance needs review', message: 'Hannah Fischer recorded a 13h 20m shift at Vantage Office Parks.', type: 'attendance', relatedEntityType: 'attendance', relatedEntityId: longShift.id, createdAt: longShift.checkOutAt },
    shortShift && { title: 'Attendance needs review', message: 'Lukas Brandt recorded a 42-minute shift with a checkout note.', type: 'attendance', relatedEntityType: 'attendance', relatedEntityId: shortShift.id, createdAt: shortShift.checkOutAt },
    { title: 'Invoice overdue', message: `${overdueInv.invoiceNumber} for Nordlicht Kliniken gGmbH was due on ${format(toDate(overdueInv.dueDate), 'dd MMM yyyy')}.`, type: 'invoice', relatedEntityType: 'invoice', relatedEntityId: overdueInv.id, createdAt: iso(addDays(toDate(overdueInv.dueDate), 1), 8, 0), isRead: true },
    { title: 'Invoice draft created', message: 'Draft invoice for Alpenblick Hotels AG is ready for review.', type: 'invoice', relatedEntityType: 'invoice', relatedEntityId: lastInvoice('cus_03').id, createdAt: iso(cap(addDays(M0, 3)), 10, 0) },
    { title: 'Payment recorded', message: `Partial payment received for ${meridianM1.invoiceNumber} (Meridian Retail Group B.V.).`, type: 'payment', relatedEntityType: 'invoice', relatedEntityId: meridianM1.id, createdAt: iso(cap(addDays(M0, 8)), 15, 0) },
    { title: 'Invoice paid', message: `${m2Invoices.cus_03.invoiceNumber} from Alpenblick Hotels AG has been paid in full.`, type: 'payment', relatedEntityType: 'invoice', relatedEntityId: m2Invoices.cus_03.id, createdAt: iso(addDays(M1, 11), 15, 0), isRead: true },
    { title: 'Hourly rate scheduled', message: `Alpenblick Hotels AG: €40.00/h takes effect on ${format(nextMonth, 'dd MMM yyyy')}.`, type: 'billing', relatedEntityType: 'customer', relatedEntityId: 'cus_03', createdAt: iso(addDays(M1, 20), 11, 0), isRead: true },
    { title: 'Hourly rate updated', message: 'Hartmann Logistik GmbH: rate increased from €34.00/h to €36.50/h.', type: 'billing', relatedEntityType: 'customer', relatedEntityId: 'cus_01', createdAt: iso(subDays(M1, 3), 11, 0), isRead: true },
    { title: 'Project assignment updated', message: 'Hannah Fischer and Amira Haddad assigned to Reception & Front Desk Services.', type: 'project', relatedEntityType: 'project', relatedEntityId: 'prj_07', createdAt: iso(subDays(M1, 4), 14, 0), isRead: true },
    { title: 'Customer added', message: 'Vantage Office Parks GmbH was added as a new customer.', type: 'customer', relatedEntityType: 'customer', relatedEntityId: 'cus_05', createdAt: iso(subMonths(M0, 2), 9, 30), isRead: true },
  ]
    .filter(Boolean)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((n, i) => ({ id: `ntf_${pad(i + 1, 3)}`, isRead: false, ...n }));

  const activity = [
    { action: 'invoice.payment_recorded', entityType: 'invoice', entityId: meridianM1.id, summary: `Recorded partial payment on ${meridianM1.invoiceNumber}`, createdAt: iso(cap(addDays(M0, 8)), 15, 0) },
    { action: 'invoice.draft_created', entityType: 'invoice', entityId: lastInvoice('cus_03').id, summary: 'Created draft invoice for Alpenblick Hotels AG', createdAt: iso(cap(addDays(M0, 3)), 10, 0) },
    { action: 'invoice.finalized', entityType: 'invoice', entityId: lastInvoice('cus_04').id, summary: `Finalized ${lastInvoice('cus_04').invoiceNumber} for Nordlicht Kliniken gGmbH`, createdAt: iso(cap(addDays(M0, 2)), 11, 0) },
    { action: 'invoice.finalized', entityType: 'invoice', entityId: meridianM1.id, summary: `Finalized ${meridianM1.invoiceNumber} for Meridian Retail Group B.V.`, createdAt: iso(cap(addDays(M0, 1)), 11, 0) },
    corrected && { action: 'attendance.corrected', entityType: 'attendance', entityId: corrected.id, summary: 'Corrected check-in time for Jonas Keller', reason: corrected.correctionHistory[0].reason, previousValues: corrected.correctionHistory[0].previous, newValues: corrected.correctionHistory[0].next, createdAt: corrected.correctionHistory[0].at },
    { action: 'invoice.voided', entityType: 'invoice', entityId: voided.id, summary: `Voided ${voided.invoiceNumber} (Meridian Retail Group B.V.)`, reason: voided.voidReason, createdAt: voided.voidedAt },
    { action: 'rate.created', entityType: 'customer', entityId: 'cus_03', summary: 'Scheduled €40.00/h rate for Alpenblick Hotels AG', createdAt: iso(addDays(M1, 20), 11, 0) },
    { action: 'project.assigned', entityType: 'project', entityId: 'prj_07', summary: 'Assigned 2 employees to Reception & Front Desk Services', createdAt: iso(subDays(M1, 4), 14, 0) },
    { action: 'rate.created', entityType: 'customer', entityId: 'cus_01', summary: 'Hartmann Logistik GmbH rate changed €34.00 → €36.50/h', previousValues: { amount: 3400 }, newValues: { amount: 3650 }, createdAt: iso(subDays(M1, 3), 11, 0) },
    { action: 'project.created', entityType: 'project', entityId: 'prj_07', summary: 'Created project Reception & Front Desk Services', createdAt: iso(subDays(M1, 5), 10, 0) },
    { action: 'customer.created', entityType: 'customer', entityId: 'cus_05', summary: 'Added customer Vantage Office Parks GmbH', createdAt: iso(subMonths(M0, 2), 9, 30) },
    { action: 'employee.updated', entityType: 'employee', entityId: 'emp_11', summary: 'Set Marco Bianchi to inactive', previousValues: { status: 'active' }, newValues: { status: 'inactive' }, createdAt: iso(addDays(M1, 0), 9, 0) },
  ]
    .filter(Boolean)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((a, i) => ({ id: `act_${pad(i + 1, 3)}`, actorId: DEMO_ADMIN.id, actorName: DEMO_ADMIN.name, previousValues: null, newValues: null, reason: '', ...a }));

  return {
    version: 1,
    seededAt: now.toISOString(),
    business: buildBusiness(),
    admin: DEMO_ADMIN,
    invoiceSettings,
    workingHours,
    customers,
    hourlyRates,
    projects,
    employees,
    attendance,
    invoices,
    payments,
    notifications,
    activity,
  };
}

/** Frozen copy of the customer's billing details stored on finalized invoices. */
export function snapshotCustomer(customer) {
  return {
    id: customer.id,
    customerNumber: customer.customerNumber,
    companyName: customer.companyName,
    contactPerson: customer.contactPerson,
    email: customer.email,
    phone: customer.phone,
    billingAddress: { ...customer.billingAddress },
    taxId: customer.taxId,
  };
}
