import { NextResponse } from 'next/server';
import { cacheMonitor } from '@/lib/monitoring/cache-monitor';

export async function GET() {
  try {
    const stats = cacheMonitor.getAllCacheStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching cache data:', error);
    return NextResponse.json({ error: 'Failed to fetch cache data' }, { status: 500 });
  }
}