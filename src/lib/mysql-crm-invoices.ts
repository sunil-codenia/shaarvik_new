import { mysqlPool } from './mysql';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

interface CreateInvoiceParams {
  clientId: string;
  subscriptionId: string;
  companyId: string;
  amount: number;
  finalAmount: number;
  paidAmount: number;
  status: 'paid' | 'pending' | 'overdue' | 'cancelled';
  gateway?: string;
  transactionId?: string;
  notes?: string;
}

/**
 * Shared utility to create a new invoice in the database
 */
export async function createNewInvoice(params: CreateInvoiceParams) {
  const connection = await mysqlPool.getConnection();
  try {
    await connection.beginTransaction();

    const year = new Date().getFullYear();
    const [invoiceRows] = await connection.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM invoices WHERE invoice_number LIKE ?',
      [`INV-${year}-%`]
    );
    const nextNum = (invoiceRows[0]?.count || 0) + 1;
    const invoiceNumber = `INV-${year}-${String(nextNum).padStart(4, '0')}`;

    const [result] = await connection.query<ResultSetHeader>(
      `
        INSERT INTO invoices (
          invoice_number, invoice_date, due_date, amount, final_amount, 
          paid_amount, balance_amount, status, client_id, subscription_id, 
          company_id, transaction_id, gateway
        )
        VALUES (?, NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        invoiceNumber,
        params.amount,
        params.finalAmount,
        params.paidAmount,
        params.finalAmount - params.paidAmount,
        params.status,
        params.clientId,
        params.subscriptionId,
        params.companyId,
        params.transactionId || null,
        params.gateway || null,
      ]
    );

    await connection.commit();
    return { 
      id: result.insertId, 
      invoiceNumber 
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Fetch full invoice details for PDF/Email
 */
export async function getFullInvoiceForEmail(invoiceId: number | string) {
  const [rows] = await mysqlPool.query<RowDataPacket[]>(
    `SELECT 
      i.*, 
      sp.name as plan_name,
      plt.name as platform_name,
      s.billing_cycle,
      c.name as provider_name, 
      c.email as provider_email,
      cl.name as client_name,
      cl.email as client_email,
      cl.phone as client_phone,
      cl.address as client_address
     FROM invoices i
     LEFT JOIN subscriptions s ON s.id = i.subscription_id
     LEFT JOIN saas_plans sp ON sp.id = s.saas_plan_id
     LEFT JOIN saas_platforms plt ON plt.id = sp.platform_id
     LEFT JOIN companies c ON c.id = i.company_id
     LEFT JOIN clients cl ON cl.id = i.client_id
     WHERE i.id = ?`,
    [invoiceId]
  );
  
  if (rows.length === 0) return null;
  const row = rows[0];

  return {
    ...row,
    id: String(row.id),
    invoiceNumber: row.invoice_number,
    invoiceDate: row.invoice_date,
    dueDate: row.due_date,
    amount: Number(row.amount || 0),
    finalAmount: Number(row.final_amount || 0),
    paidAmount: Number(row.paid_amount || 0),
    clientName: row.client_name,
    clientEmail: row.client_email,
    clientPhone: row.client_phone,
    clientAddress: row.client_address,
    companyName: row.provider_name,
    companyEmail: row.provider_email,
    subscriptionPlan: row.plan_name 
      ? `${row.plan_name}${row.platform_name ? ` - ${row.platform_name}` : ''} (${row.billing_cycle || 'monthly'})` 
      : 'SaaS Subscription'
  };
}
