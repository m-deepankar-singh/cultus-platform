import { NextResponse } from 'next/server';
import { memoryMonitor } from '@/lib/monitoring/memory-monitor';

export async function GET() {
  try {
    const history = memoryMonitor.getHistory(100);
    return NextResponse.json(history);
  } catch (error) {
    console.error('Error fetching memory data:', error);
    return NextResponse.json({ error: 'Failed to fetch memory data' }, { status: 500 });
  }
}