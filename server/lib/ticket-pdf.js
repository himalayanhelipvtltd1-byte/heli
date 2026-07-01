const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const { rowToDraft, formatBookedAt } = require('./booking');
const { getPackage } = require('./packages');

const GREEN = rgb(0.09, 0.4, 0.2);
const DARK = rgb(0.12, 0.16, 0.23);
const GRAY = rgb(0.4, 0.45, 0.5);
const LIGHT_BG = rgb(0.97, 0.98, 0.99);
const BORDER = rgb(0.85, 0.88, 0.92);

const COMPANY_GST = '05AAACT0236C2Z2';
const COMPANY_NAME = 'Trans Bharat Aviation';

function fmtInr(n) {
  return `Rs. ${Math.round(Number(n)).toLocaleString('en-IN')}`;
}

function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = String(iso).split('T')[0].split('-');
  return `${d}/${m}/${y}`;
}

function maskAadhaar(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length < 4) return 'XXXXXXXX';
  return `XXXXXXXX${digits.slice(-4)}`;
}

function maskReg(value) {
  const raw = String(value || '');
  if (raw.length <= 4) return raw;
  return `XXXXXXXX${raw.slice(-4)}`;
}

function normalizeTicketData(source) {
  if (source.booking_id) {
    return rowToDraft(source);
  }
  const packageId = String(source.packageId || '1');
  const pkg = source.pkg?.route ? source.pkg : (getPackage(packageId) || {});
  return {
    bookingId: source.bookingId || 'PENDING',
    packageId,
    packageName: source.packageName || pkg.name || '',
    departureDate: source.departureDate || '',
    returnDate: source.returnDate || '',
    timeSlot: source.timeSlot || '',
    returnTimeSlot: source.returnTimeSlot || '',
    passengerCount: source.passengerCount || (source.passengers || []).length || 1,
    passengers: source.passengers || [],
    total: source.total || (pkg.total || 0) * (source.passengerCount || 1),
    bookedAt: source.bookedAt || formatBookedAt(new Date()),
    pkg,
  };
}

function wrapText(text, maxWidth, font, size) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) > maxWidth) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function generateTicketPdf(source) {
  const d = normalizeTicketData(source);
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const margin = 40;
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const contentWidth = pageWidth - margin * 2;

  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const ensureSpace = (needed) => {
    if (y - needed < margin) {
      page = doc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
  };

  const drawText = (text, x, yPos, size = 10, bold = false, color = DARK) => {
    page.drawText(String(text), {
      x,
      y: yPos,
      size,
      font: bold ? fontBold : font,
      color,
    });
  };

  const drawSectionTitle = (title) => {
    ensureSpace(28);
    drawText(title, margin, y, 12, true, DARK);
    y -= 18;
  };

  const drawLabelValue = (label, value, x, colWidth) => {
    drawText(label, x, y, 8, false, GRAY);
    const lines = wrapText(value, colWidth - 4, fontBold, 10);
    lines.forEach((line, i) => {
      drawText(line, x, y - 12 - i * 12, 10, true, DARK);
    });
    return 12 + lines.length * 12 + 8;
  };

  // Header
  page.drawRectangle({
    x: margin,
    y: y - 58,
    width: contentWidth,
    height: 62,
    color: rgb(0.94, 0.98, 0.95),
    borderColor: GREEN,
    borderWidth: 1,
  });
  drawText('Trans Bharat Aviation Ticket', margin + 12, y - 22, 16, true, GREEN);
  drawText('Official helicopter yatra booking confirmation', margin + 12, y - 38, 9, false, GRAY);
  drawText('Status: CONFIRMED', margin + 12, y - 52, 9, true, GREEN);
  y -= 78;

  // Booking meta grid (2 columns)
  const colW = contentWidth / 2 - 8;
  const meta = [
    ['Booking ID', d.bookingId],
    ['Booking Date & Time', d.bookedAt || '-'],
    ['Number of Passengers', String(d.passengerCount)],
    ['Booking Type', 'GENERAL'],
    ['Reporting Time', `${fmtDate(d.departureDate)} ${d.timeSlot}`],
    ['Package', d.packageName],
  ];
  for (let i = 0; i < meta.length; i += 2) {
    ensureSpace(50);
    const h1 = drawLabelValue(meta[i][0], meta[i][1], margin, colW);
    const h2 = meta[i + 1]
      ? drawLabelValue(meta[i + 1][0], meta[i + 1][1], margin + colW + 16, colW)
      : 0;
    y -= Math.max(h1, h2);
  }
  y -= 8;

  // Onward route
  ensureSpace(90);
  page.drawRectangle({
    x: margin,
    y: y - 72,
    width: contentWidth,
    height: 78,
    color: LIGHT_BG,
    borderColor: BORDER,
    borderWidth: 1,
  });
  drawText('ONWARD', margin + 10, y - 14, 8, true, GRAY);
  drawText(d.pkg.route || d.packageName, margin + 10, y - 30, 11, true, DARK);
  drawText(
    `${fmtDate(d.departureDate)}  |  ${d.timeSlot}  |  ${d.pkg.helipad || ''}`,
    margin + 10,
    y - 44,
    9,
    false,
    GRAY,
  );
  drawText(`Operator: ${COMPANY_NAME}`, margin + 10, y - 58, 9, false, GRAY);
  drawText(`To: ${d.pkg.to || 'Kedarnath'}`, margin + 10, y - 70, 9, true, DARK);
  y -= 88;

  // Return route
  if (d.pkg.hasReturn && d.returnDate) {
    ensureSpace(60);
    page.drawRectangle({
      x: margin,
      y: y - 48,
      width: contentWidth,
      height: 54,
      color: LIGHT_BG,
      borderColor: BORDER,
      borderWidth: 1,
    });
    drawText('RETURN', margin + 10, y - 14, 8, true, GRAY);
    drawText(
      `${d.pkg.to || 'Kedarnath'}  |  ${fmtDate(d.returnDate)}${d.returnTimeSlot ? `  |  ${d.returnTimeSlot}` : ''}`,
      margin + 10,
      y - 30,
      10,
      true,
      DARK,
    );
    drawText(d.pkg.helipad || '', margin + 10, y - 44, 9, false, GRAY);
    y -= 64;
  }

  // Passenger table
  drawSectionTitle('Passenger Details');
  const cols = [28, 95, 48, 32, 95, 95, 72];
  const headers = ['S No.', 'Name', 'Gender', 'Age', 'ID Proof', 'Yatra Reg.', 'Status'];
  const tableX = margin;
  const rowH = 18;

  ensureSpace(30 + d.passengers.length * rowH);
  let tx = tableX;
  page.drawRectangle({
    x: margin,
    y: y - rowH,
    width: contentWidth,
    height: rowH,
    color: rgb(0.9, 0.93, 0.96),
  });
  headers.forEach((h, i) => {
    drawText(h, tx + 3, y - 13, 7, true, DARK);
    tx += cols[i];
  });
  y -= rowH;

  d.passengers.forEach((p, index) => {
    ensureSpace(rowH + 10);
    if (index % 2 === 0) {
      page.drawRectangle({
        x: margin,
        y: y - rowH,
        width: contentWidth,
        height: rowH,
        color: rgb(0.99, 0.99, 1),
      });
    }
    const cells = [
      String(index + 1),
      p.name || '',
      p.gender || '',
      String(p.age || ''),
      `Aadhaar ${maskAadhaar(p.aadhaar)}`,
      maskReg(p.registration),
      'CONFIRMED',
    ];
    tx = tableX;
    cells.forEach((cell, i) => {
      const clipped = cell.length > 18 && i !== 0 ? `${cell.slice(0, 16)}..` : cell;
      drawText(clipped, tx + 3, y - 13, 7, false, DARK);
      tx += cols[i];
    });
    y -= rowH;
  });
  y -= 10;

  // Total
  ensureSpace(36);
  page.drawRectangle({
    x: margin,
    y: y - 28,
    width: contentWidth,
    height: 32,
    color: rgb(0.94, 0.98, 0.95),
    borderColor: GREEN,
    borderWidth: 1,
  });
  drawText(`Total Paid: ${fmtInr(d.total)}`, margin + 12, y - 18, 12, true, GREEN);
  y -= 44;

  // GST details
  drawSectionTitle('GST Details');
  const gst = [
    ['Booker Name', '-'],
    ['Booker GST No.', '-'],
    ['Helicopter Service Operator', COMPANY_NAME],
    ['Service Provider Name', 'Trans Bharat Aviation'],
    ['GST No. (Operator)', COMPANY_GST],
    ['GST No. (Trans Bharat Aviation)', COMPANY_GST],
    ['Place of Supply', 'Uttarakhand'],
    ['State Code', 'Delhi'],
    ['Booker State', 'Delhi'],
  ];
  for (let i = 0; i < gst.length; i += 2) {
    ensureSpace(44);
    const h1 = drawLabelValue(gst[i][0], gst[i][1], margin, colW);
    const h2 = gst[i + 1]
      ? drawLabelValue(gst[i + 1][0], gst[i + 1][1], margin + colW + 16, colW)
      : 0;
    y -= Math.max(h1, h2);
  }
  y -= 8;

  // Important notes
  drawSectionTitle('Important');
  const notes = [
    'Kindly carry the original ID proofs along with the ticket.',
    'Report at the designated helipad at least 2 hours before departure.',
    'Ticket booking is subject to weather and operational clearance.',
  ];
  notes.forEach((note) => {
    ensureSpace(16);
    drawText(`• ${note}`, margin, y, 8, false, GRAY);
    y -= 14;
  });

  return Buffer.from(await doc.save());
}

module.exports = { generateTicketPdf, normalizeTicketData };
