import { NextResponse } from 'next/server';
import { alertManager } from '@/lib/monitoring/alerts';

export async function GET() {
  try {
    const alerts = alertManager.getActiveAlerts();
    return NextResponse.json(alerts);
  } catch (error) {
    console.error('Error fetching alerts data:', error);
    return NextResponse.json({ error: 'Failed to fetch alerts data' }, { status: 500 });
  }
}