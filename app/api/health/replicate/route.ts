import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const revalidate = 0;

type ReplicateStatusIndicator = 'none' | 'minor' | 'major' | 'critical' | string;

type ReplicateStatusResponse = {
  status?: {
    indicator?: ReplicateStatusIndicator;
    description?: string;
  };
};

type HealthStatus = 'operational' | 'degraded' | 'outage' | 'unknown';

function mapIndicator(indicator: ReplicateStatusIndicator | undefined): HealthStatus {
  if (!indicator) return 'unknown';
  if (indicator === 'none') return 'operational';
  if (indicator === 'critical') return 'outage';
  return 'degraded'; // minor or major
}

export async function GET() {
  const checkedAt = new Date().toISOString();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    let data: ReplicateStatusResponse;
    try {
      const res = await fetch('https://status.replicate.com/api/v2/status.json', {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timeout);
      if (!res.ok) {
        return NextResponse.json({ status: 'unknown', description: `Status page returned ${res.status}`, checkedAt });
      }
      data = (await res.json()) as ReplicateStatusResponse;
    } catch {
      clearTimeout(timeout);
      return NextResponse.json({ status: 'unknown', description: 'Could not reach Replicate status page', checkedAt });
    }

    const indicator = data?.status?.indicator;
    const description = data?.status?.description ?? '';
    const status = mapIndicator(indicator);

    return NextResponse.json({ status, description, checkedAt });
  } catch {
    return NextResponse.json({ status: 'unknown', description: 'Internal error during health check', checkedAt });
  }
}
