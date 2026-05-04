import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { RowDataPacket } from 'mysql2/promise';

interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string | Date;
  dueDate: string | Date;
  amount: number;
  finalAmount: number;
  paidAmount: number;
  status: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  clientAddress?: string;
  companyName?: string;
  companyEmail?: string;
  subscriptionPlan?: string;
  gateway?: string;
}

/**
 * Generates a professional PDF invoice using jsPDF (Server-side reliable)
 */
export async function generateInvoicePDF(inv: InvoiceData): Promise<Buffer> {
  const doc = new jsPDF() as any;

  // Colors
  const primaryColor = [15, 23, 42]; // Slate 900
  const accentColor = [59, 130, 246];  // Blue 500
  const textColor = [30, 41, 59];    // Slate 800
  const lightText = [100, 116, 139]; // Slate 500

  // formatters
  const fmt = (n: any) => {
    const num = Number(n || 0);
    return 'Rs. ' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  const dateFmt = (d: any) => {
    if (!d) return 'N/A';
    try {
      return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
      return 'N/A';
    }
  };

  // Safe text helper to prevent jsPDF crashes on null/undefined
  const t = (val: any) => (val == null ? '' : String(val));

  // 1. Header Section (Premium Sleek Banner)
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 45, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.text('INVOICE', 15, 25);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(203, 213, 225);
  doc.text(`#${t(inv.invoiceNumber)}`, 15, 33);

  // Provider Details
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(t(inv.companyName || 'Shaarvik Technologies LLP'), 195, 20, { align: 'right' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text('Shaarvik Technologies Control Panel', 195, 27, { align: 'right' });
  doc.text(t(inv.companyEmail || 'support@shaarvik.com'), 195, 32, { align: 'right' });

  // 2. Info Bar
  doc.setFillColor(248, 250, 252);
  doc.rect(15, 55, 180, 20, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(15, 55, 180, 20, 'S');

  doc.setFontSize(8);
  doc.setTextColor(...lightText);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE DATE', 20, 62);
  doc.text('DUE DATE', 65, 62);
  doc.text('PAYMENT MODE', 110, 62);
  doc.text('STATUS', 170, 62);

  doc.setFontSize(10);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'normal');
  doc.text(dateFmt(inv.invoiceDate), 20, 69);
  doc.text(dateFmt(inv.dueDate), 65, 69);
  
  const gatewayLabel = (t(inv.gateway).toLowerCase() === 'razorpay' || t(inv.gateway).toLowerCase() === 'online') ? 'ONLINE' : 'OFFLINE';
  doc.text(gatewayLabel, 110, 69);
  
  const status = t(inv.status || 'pending').toUpperCase();
  if (status === 'PAID') doc.setTextColor(34, 197, 94);
  else if (status === 'OVERDUE') doc.setTextColor(239, 68, 68);
  else doc.setTextColor(245, 158, 11);
  doc.setFont('helvetica', 'bold');
  doc.text(status, 170, 69);

  // 3. Billing Info
  let y = 85;
  doc.setTextColor(...accentColor);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO', 15, y);
  
  y += 6;
  doc.setTextColor(...primaryColor);
  doc.setFontSize(12);
  doc.text(t(inv.companyName || inv.clientName), 15, y);
  
  doc.setTextColor(...textColor);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  if (inv.clientAddress) {
    y += 5;
    const splitAddress = doc.splitTextToSize(t(inv.clientAddress), 80);
    doc.text(splitAddress, 15, y);
    y += (splitAddress.length * 4);
  } else {
    y += 5;
  }
  doc.text(t(inv.companyEmail || inv.clientEmail), 15, y);
  if (inv.clientPhone) {
    y += 4;
    doc.text(t(inv.clientPhone), 15, y);
  }

  // 4. Products Table
  doc.autoTable({
    startY: y + 10,
    head: [['DESCRIPTION', 'QTY', 'UNIT PRICE', 'TOTAL']],
    body: [
      [t(inv.subscriptionPlan || 'SaaS Subscription Plan'), '1', fmt(inv.amount), fmt(inv.amount)]
    ],
    headStyles: { fillColor: primaryColor, fontSize: 9, fontStyle: 'bold' },
    bodyStyles: { textColor: textColor, fontSize: 10 },
    columnStyles: {
      1: { halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'right' }
    },
    margin: { left: 15, right: 15 }
  });

  // 5. Totals Section
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFillColor(248, 250, 252);
  doc.rect(120, finalY, 75, 30, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(120, finalY, 75, 30, 'S');

  doc.setFontSize(8);
  doc.setTextColor(...lightText);
  doc.text('SUBTOTAL', 125, finalY + 10);
  doc.text('TAX / GST', 125, finalY + 18);
  
  doc.setTextColor(...textColor);
  doc.setFontSize(10);
  doc.text(fmt(inv.amount), 190, finalY + 10, { align: 'right' });
  doc.text(fmt(0), 190, finalY + 18, { align: 'right' });

  doc.setFillColor(...primaryColor);
  doc.rect(120, finalY + 22, 75, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL AMOUNT', 125, finalY + 27);
  doc.text(fmt(inv.finalAmount), 190, finalY + 27, { align: 'right' });

  // 6. Footer
  doc.setTextColor(...lightText);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Thank you for choosing Shaarvik Technologies.', 105, 285, { align: 'center' });
  doc.text('This is an electronically generated invoice.', 105, 289, { align: 'center' });

  return Buffer.from(doc.output('arraybuffer'));
}
