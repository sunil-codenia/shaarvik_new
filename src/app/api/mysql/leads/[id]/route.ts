import { NextRequest, NextResponse } from 'next/server';
import { getLeadById, updateLead, deleteLead } from '@/lib/mysql-leads';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;
    const lead = await getLeadById(id);
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });
    }
    return NextResponse.json(lead);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch lead.' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;
    const body = await request.json();
    
    await updateLead(id, body);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update lead.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;
    await deleteLead(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to delete lead.' },
      { status: 500 }
    );
  }
}
