import nodemailer from 'nodemailer';
import { generateInvoicePDF } from './pdf-service';

const smtpConfig = {
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: (process.env.SMTP_PASS || '').replace(/['"]/g, ''), // Strip possible quotes
  },
};

export const transporter = nodemailer.createTransport(smtpConfig);

// Validate SMTP config on load
if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
  const { logSystem } = require('./mysql-logger');
  logSystem('warn', 'SMTP_USER or SMTP_PASS is missing in .env');
}

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: any[];
}

export async function sendEmail(options: EmailOptions) {
  try {
    const { logSystem } = require('./mysql-logger');
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'Shaarvik Technologies'}" <${process.env.SMTP_FROM_EMAIL}>`,
      ...options,
    });
    await logSystem('info', `Email sent: ${info.messageId}`, { to: options.to, subject: options.subject });
    return info;
  } catch (err: any) {
    const { logSystem } = require('./mysql-logger');
    await logSystem('error', `Email delivery failed: ${err.message}`, { to: options.to, subject: options.subject });
    throw err;
  }
}

/**
 * Higher-level function to generate and send an invoice email
 */
export async function sendInvoiceEmail(invoice: any) {
  try {
    const pdfBuffer = await generateInvoicePDF(invoice);
    
    const subject = `Invoice ${invoice.invoiceNumber} from Shaarvik Technologies`;
    const text = `Dear ${invoice.clientName},\n\nPlease find attached your invoice ${invoice.invoiceNumber} for your ${invoice.subscriptionPlan || 'subscription'}.\n\nTotal Amount: Rs. ${invoice.finalAmount}\n\nThank you for choosing us!`;
    
    const credsHtml = (invoice.username && invoice.password) ? `
      <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #bfdbfe;">
        <h3 style="color: #1e40af; margin-top: 0; font-size: 16px;">Service Access Credentials</h3>
        <p style="margin: 10px 0; font-size: 14px;">Use the following details to log into your portal:</p>
        <div style="background: white; padding: 12px; border-radius: 6px; border: 1px solid #dbeafe;">
          <p style="margin: 0; font-family: monospace; font-size: 13px;"><strong>Username:</strong> ${invoice.username}</p>
          <p style="margin: 5px 0 0 0; font-family: monospace; font-size: 13px;"><strong>Password:</strong> ${invoice.password}</p>
        </div>
        <p style="margin: 12px 0 0 0; font-size: 12px; color: #1e40af;">We recommend changing your password after your first login.</p>
      </div>
    ` : '';

    const html = `
      <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px;">
        <h2 style="color: #0f172a;">Invoice #${invoice.invoiceNumber}</h2>
        <p>Dear ${invoice.clientName},</p>
        <p>Thank you for your business. Please find attached the invoice for your <strong>${invoice.subscriptionPlan || 'SaaS Subscription'}</strong>.</p>
        
        ${credsHtml}

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background: #f8fafc;">
            <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>Plan</strong></td>
            <td style="padding: 10px; border: 1px solid #e2e8f0;">${invoice.subscriptionPlan || 'SaaS Subscription'}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>Amount</strong></td>
            <td style="padding: 10px; border: 1px solid #e2e8f0;">Rs. ${invoice.finalAmount.toLocaleString('en-IN')}</td>
          </tr>
          <tr style="background: #f8fafc;">
            <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>Status</strong></td>
            <td style="padding: 10px; border: 1px solid #e2e8f0;">${(invoice.status || 'pending').toUpperCase()}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>Payment Mode</strong></td>
            <td style="padding: 10px; border: 1px solid #e2e8f0;">${(invoice.gateway?.toLowerCase() === 'razorpay' || invoice.gateway?.toLowerCase() === 'online') ? 'ONLINE' : 'OFFLINE'}</td>
          </tr>
        </table>

        <p>You can also view and download all your invoices by logging into your dashboard.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #64748b; text-align: center;">Shaarvik Technologies LLP<br/>This is an automated message, please do not reply directly.</p>
      </div>
    `;

    await sendEmail({
      to: invoice.clientEmail,
      subject,
      text,
      html,
      attachments: [
        {
          filename: `Invoice_${invoice.invoiceNumber}.pdf`,
          content: pdfBuffer,
        }
      ],
    });
  } catch (err) {
    console.error('Failed to send invoice email:', err);
    throw err;
  }
}
