import { NextResponse } from 'next/server';
import { metricsCollector } from '@/lib/monitoring/metrics';

export async function GET() {
  try {
    const healthStatus = await metricsCollector.getHealthStatus();
    return NextResponse.json(healthStatus);
  } catch (error) {
    console.error('Error fetching health status:', error);
    return NextResponse.json({ error: 'Failed to fetch health status' }, { status: 500 });
  }
}