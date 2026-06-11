import { generateChart } from '@/lib/ziwei/algorithm';
import type { BirthInfo, ZiweiChart } from '@/lib/ziwei/types';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const info: BirthInfo = await request.json();
    const chart: ZiweiChart = generateChart(info);
    return Response.json(chart);
  } catch (error) {
    console.error('generate error:', error);
    return new Response(JSON.stringify({ error: '排盘失败' }), { status: 500 });
  }
}
