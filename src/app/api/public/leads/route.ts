import { NextResponse } from 'next/server';
import { RowDataPacket } from 'mysql2/promise';
import { mysqlPool } from '@/lib/mysql';

export const runtime = 'nodejs';

type CompanyRow = RowDataPacket & {
  id: string;
  name: string;
};

/**
 * Public External API for lead insertion
 * 
 * Headers:
 * Content-Type: application/json
 * 
 * Body:
 * {
 *   "name": "Full Name",        // Required
 *   "email": "email@test.com",  // Required
 *   "company": "Company Name",   // Optional
 *   "phone": "1234567890",      // Optional
 *   "notes": "Custom notes",    // Optional
 *   "source": "api_integration" // Optional (default: "external_api")
 * }
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = String(body?.name || '').trim();
    const email = String(body?.email || '').trim();
    const companyName = String(body?.company || '').trim();
    const phone = String(body?.phone || '').trim();
    const notes = String(body?.notes || '').trim();
    const source = String(body?.source || 'external_api').trim();

    // Basic Validation
    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required fields.' },
        { status: 400 }
      );
    }

    // Get the default company for ID fallback
    const [companyRows] = await mysqlPool.query<CompanyRow[]>(
      `
        SELECT id, name
        FROM companies
        ORDER BY createdAt ASC
        LIMIT 1
      `
    );
    const company = companyRows[0];

    // Insert Lead
    const [leadResult] = await mysqlPool.query<any>(
      `
        INSERT INTO leads (
          title,
          name,
          full_name,
          email,
          phone,
          company_name,
          source,
          username,
          password,
          status,
          notes,
          is_converted,
          company_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        `External API Lead - ${name}`,
        name,
        name,
        email,
        phone || null,
        companyName || 'External Inquiry',
        source,
        email,
        '123456',
        'new',
        notes || 'No notes provided.',
        0,
        company?.id || null,
      ]
    );

    return NextResponse.json(
      { 
        success: true, 
        message: 'Lead created successfully.',
        leadId: String(leadResult.insertId) 
      },
      { 
        status: 201,
        headers: {
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  } catch (error: any) {
    console.error('External Lead API Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process external lead data.' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  }
}
