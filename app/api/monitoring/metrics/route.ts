import { NextResponse } from 'next/server';
import { metricsCollector } from '@/lib/monitoring/metrics';

export async function GET() {
  try {
    const metrics = await metricsCollector.getMetrics();
    return new NextResponse(metrics, {
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  }
}