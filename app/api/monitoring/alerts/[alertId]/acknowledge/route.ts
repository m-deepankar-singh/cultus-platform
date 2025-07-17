import { NextRequest, NextResponse } from 'next/server';
import { alertManager } from '@/lib/monitoring/alerts';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ alertId: string }> }
) {
  try {
    const { alertId } = await params;
    alertManager.acknowledgeAlert(alertId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    return NextResponse.json({ error: 'Failed to acknowledge alert' }, { status: 500 });
  }
}