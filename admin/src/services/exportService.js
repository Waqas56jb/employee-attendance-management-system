/**
 * CSV and PDF exports, generated entirely in the browser.
 */
import { formatMoney } from '../utils/currency';
import { formatDate, formatPeriod } from '../utils/dateUtils';
import { formatHoursValue, joinAddress } from '../utils/formatters';
import { invoiceLabel, PAYMENT_METHODS } from './invoiceService';

/* ----------------------------------- CSV ----------------------------------- */

function csvCell(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  // Neutralise spreadsheet formula injection and quote when needed.
  const safe = /^[=+\-@\t\r]/.test(text) && !/^-?\d/.test(text) ? `'${text}` : text;
  return /[",\n;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/**
 * columns: [{ header, value: (row) => any }]
 * totals:  optional row object rendered after the data (same columns)
 */
export function toCsv(columns, rows, totals) {
  const lines = [columns.map((c) => csvCell(c.header)).join(',')];
  rows.forEach((row) => lines.push(columns.map((c) => csvCell(c.value(row))).join(',')));
  if (totals) lines.push(columns.map((c) => csvCell(c.total ? c.total(totals) : '')).join(','));
  return lines.join('\r\n');
}

export function downloadBlob(content, filename, type) {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadCsv(filename, columns, rows, totals) {
  // BOM so Excel opens UTF-8 (umlauts, €) correctly.
  downloadBlob(`﻿${toCsv(columns, rows, totals)}`, filename.endsWith('.csv') ? filename : `${filename}.csv`, 'text/csv;charset=utf-8');
}

export function exportFilename(base) {
  const stamp = new Date().toISOString().slice(0, 10);
  return `${base}-${stamp}.csv`;
}

/* ----------------------------------- PDF ----------------------------------- */

/** jsPDF's built-in fonts use WinAnsi; normalise characters it cannot draw. */
function pdfText(value) {
  return String(value ?? '')
    .replace(/[   ]/g, ' ')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‒–—]/g, '-')
    .replace(/…/g, '...');
}

const BRAND = [79, 70, 229];
const INK = [15, 23, 42];
const MUTED = [100, 116, 139];
const LINE = [228, 231, 236];

function imageFormat(dataUrl) {
  const match = /^data:image\/(png|jpe?g|webp)/i.exec(dataUrl ?? '');
  if (!match) return null;
  return match[1].toUpperCase().replace('JPG', 'JPEG');
}

/**
 * Builds the invoice PDF.
 * ctx: { business, invoiceSettings, customer (live record), payments, projectsById }
 * Finalized invoices print their frozen customer snapshot.
 */
export async function generateInvoicePdf(invoice, ctx) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const { business, invoiceSettings } = ctx;
  const customer = invoice.customerSnapshot ?? ctx.customer ?? {};
  const money = (v) => pdfText(formatMoney(v, invoice.currency));
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  let y = margin;

  // Letterhead
  const fmt = imageFormat(business.logo);
  if (fmt) {
    try {
      doc.addImage(business.logo, fmt, margin, y - 6, 44, 44);
    } catch {
      // Unsupported image: skip the logo but keep the invoice.
    }
  } else {
    doc.setFillColor(...BRAND);
    doc.roundedRect(margin, y - 6, 44, 44, 8, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(pdfText(business.name).slice(0, 1), margin + 22, y + 22, { align: 'center' });
  }
  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(pdfText(business.name), margin + 56, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(pdfText(joinAddress(business.address)), margin + 56, y + 22);
  doc.text(pdfText([business.email, business.phone].filter(Boolean).join('  ·  ')), margin + 56, y + 34);
  if (business.website) doc.text(pdfText(business.website), margin + 56, y + 46);

  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(invoice.status === 'draft' ? 'DRAFT INVOICE' : 'INVOICE', pageWidth - margin, y + 10, { align: 'right' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MUTED);
  doc.text(pdfText(invoiceLabel(invoice)), pageWidth - margin, y + 26, { align: 'right' });
  if (invoice.status === 'void') {
    doc.setTextColor(185, 28, 28);
    doc.setFont('helvetica', 'bold');
    doc.text('VOID', pageWidth - margin, y + 40, { align: 'right' });
  }

  y += 80;
  doc.setDrawColor(...LINE);
  doc.line(margin, y, pageWidth - margin, y);
  y += 22;

  // Bill-to and meta
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...MUTED);
  doc.text('BILL TO', margin, y);
  doc.text('DETAILS', pageWidth / 2 + 20, y);
  y += 14;
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'bold');
  doc.text(pdfText(customer.companyName), margin, y);
  doc.setFont('helvetica', 'normal');
  const billLines = [
    customer.contactPerson ? `Attn. ${customer.contactPerson}` : '',
    customer.billingAddress?.street,
    [customer.billingAddress?.postalCode, customer.billingAddress?.city].filter(Boolean).join(' '),
    customer.billingAddress?.country,
    customer.taxId ? `VAT ID: ${customer.taxId}` : '',
    customer.customerNumber ? `Customer no.: ${customer.customerNumber}` : '',
  ].filter(Boolean);
  billLines.forEach((line, i) => doc.text(pdfText(line), margin, y + 14 * (i + 1)));

  const meta = [
    ['Invoice date', formatDate(invoice.issueDate)],
    ['Due date', formatDate(invoice.dueDate)],
    ['Billing period', formatPeriod(invoice.billingPeriodStart, invoice.billingPeriodEnd)],
    ['Payment terms', `${invoice.paymentTerms} days`],
    ['Currency', invoice.currency],
  ];
  meta.forEach(([label, value], i) => {
    doc.setTextColor(...MUTED);
    doc.text(label, pageWidth / 2 + 20, y + 14 * i);
    doc.setTextColor(...INK);
    doc.text(pdfText(value), pageWidth - margin, y + 14 * i, { align: 'right' });
  });
  y += Math.max(billLines.length + 1, meta.length) * 14 + 18;

  // Line items
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Description', 'Hours', 'Rate', 'Amount']],
    body: invoice.lineItems.map((line) => [
      pdfText(line.description),
      line.type === 'hours' || line.quantityHours ? formatHoursValue(line.quantityHours, { suffix: false }) : '',
      line.hourlyRate ? money(line.hourlyRate) : '',
      money(line.amount),
    ]),
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 6, textColor: INK, lineColor: LINE, lineWidth: 0 },
    headStyles: { fillColor: [243, 244, 246], textColor: MUTED, fontStyle: 'bold', fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'right', cellWidth: 56 },
      2: { halign: 'right', cellWidth: 72 },
      3: { halign: 'right', cellWidth: 84 },
    },
    didParseCell: (data) => {
      if (data.section === 'body') data.cell.styles.lineWidth = { bottom: 0.5 };
      if (data.section === 'head' && data.column.index > 0) data.cell.styles.halign = 'right';
    },
  });
  y = doc.lastAutoTable.finalY + 16;

  // Totals
  const totals = [
    ['Subtotal', money(invoice.subtotal)],
    ...(invoice.discountAmount > 0
      ? [[`Discount${invoice.discountType === 'percent' ? ` (${invoice.discountValue}%)` : ''}`, `-${money(invoice.discountAmount)}`]]
      : []),
    ['Net amount (excl. tax)', money(invoice.taxableAmount)],
    [`${pdfText(invoice.taxLabel || 'Tax')} ${invoice.taxRate}% on ${money(invoice.taxableAmount)}`, money(invoice.taxAmount)],
  ];
  if (y + totals.length * 16 + 90 > pageHeight - margin) {
    doc.addPage();
    y = margin;
  }
  const labelX = pageWidth - margin - 250;
  doc.setFontSize(9);
  totals.forEach(([label, value]) => {
    doc.setTextColor(...MUTED);
    doc.text(pdfText(label), labelX, y);
    doc.setTextColor(...INK);
    doc.text(value, pageWidth - margin, y, { align: 'right' });
    y += 16;
  });
  doc.setDrawColor(...LINE);
  doc.line(labelX, y - 6, pageWidth - margin, y - 6);
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Total (incl. tax)', labelX, y);
  doc.text(money(invoice.total), pageWidth - margin, y, { align: 'right' });
  y += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text('Amount paid', labelX, y);
  doc.setTextColor(...INK);
  doc.text(money(invoice.amountPaid), pageWidth - margin, y, { align: 'right' });
  y += 16;
  doc.setFont('helvetica', 'bold');
  doc.text('Balance due', labelX, y);
  doc.text(money(invoice.balanceDue), pageWidth - margin, y, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  y += 28;

  // Payments
  const payments = ctx.payments ?? [];
  if (payments.length) {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Payment date', 'Method', 'Reference', 'Amount']],
      body: payments.map((p) => [
        formatDate(p.paymentDate),
        PAYMENT_METHODS.find((m) => m.value === p.method)?.label ?? p.method,
        pdfText(p.reference || '-'),
        money(p.amount),
      ]),
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 4, textColor: INK },
      headStyles: { fillColor: [243, 244, 246], textColor: MUTED, fontStyle: 'bold' },
      columnStyles: { 3: { halign: 'right' } },
      didParseCell: (data) => {
        if (data.section === 'head' && data.column.index === 3) data.cell.styles.halign = 'right';
      },
    });
    y = doc.lastAutoTable.finalY + 20;
  }

  // Notes, payment instructions, footer
  const blocks = [
    ['Payment instructions', invoiceSettings.paymentInstructions],
    ['Notes', invoice.notes],
  ].filter(([, text]) => text);
  blocks.forEach(([title, text]) => {
    const wrapped = doc.splitTextToSize(pdfText(text), pageWidth - margin * 2);
    if (y + wrapped.length * 12 + 30 > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(title.toUpperCase(), margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    doc.text(wrapped, margin, y + 13);
    y += wrapped.length * 12 + 26;
  });

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    const footer = pdfText(invoiceSettings.footer || business.name);
    doc.text(footer, pageWidth / 2, pageHeight - 32, { align: 'center', maxWidth: pageWidth - margin * 2 });
    doc.text(`Page ${i} of ${pages}`, pageWidth / 2, pageHeight - 18, { align: 'center' });
  }

  return doc;
}

export async function downloadInvoicePdf(invoice, ctx) {
  const doc = await generateInvoicePdf(invoice, ctx);
  doc.save(`${invoiceLabel(invoice)}.pdf`);
}
