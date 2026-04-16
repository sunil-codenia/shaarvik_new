const mysql = require('mysql2/promise');
require('dotenv').config();

async function testQuery() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'shaarvik',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  const input = {
    fullName: 'Test Lead',
    phone: '1234567890',
    email: 'test@example.com',
    companyName: 'Test Corp',
    dealValue: 5000,
    followUpDate: null,
    notes: 'Testing',
    campaignId: null,
    createdBy: null
  };

  const title = `Lead - ${input.fullName.trim()}`;
  
  try {
    const [result] = await pool.query(
      `
        INSERT INTO leads (
          title,
          name,
          full_name,
          phone,
          email,
          company_name,
          status,
          value,
          deal_value,
          follow_up_date,
          notes,
          is_converted,
          company_id,
          campaign_id,
          created_by
        )
        VALUES (?, ?, ?, ?, ?, ?, 'new', ?, ?, ?, ?, 0, ?, ?, ?)
      `,
      [
        title,
        input.fullName.trim(),
        input.fullName.trim(),
        input.phone.trim(),
        input.email?.trim() || null,
        input.companyName?.trim() || null,
        input.dealValue ?? null,
        input.dealValue ?? null,
        input.followUpDate || null,
        input.notes?.trim() || null,
        null, // company_id
        input.campaignId || null,
        input.createdBy || null,
      ]
    );
    console.log('Success:', result);
  } catch (err) {
    console.error('Error details:', err);
  } finally {
    await pool.end();
  }
}

testQuery();
