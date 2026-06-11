import { detectPatterns, getMingGongSummary } from '@/lib/ziwei/patterns';
import type { ZiweiChart, Palace } from '@/lib/ziwei/types';

export const runtime = 'nodejs';

function starDesc(n: string): string {
  const m: Record<string, string> = {
    "紫微":"尊贵领导","天机":"智慧谋略","太阳":"光明热情","武曲":"刚毅果断",
    "天同":"温和福气","廉贞":"才华桃花","天府":"稳重财库","太阴":"温柔细腻",
    "贪狼":"多才桃花","巨门":"口才分析","天相":"协调辅助","天梁":"庇佑慈善",
    "七杀":"果断敢拼","破军":"变革创新"
  };
  return m[n] || n;
}

function getPalace(chart: ZiweiChart, name: string): Palace | undefined {
  return chart.palaces.find(p => p.name === name);
}

function pm(p: Palace | undefined): string {
  if (!p) return '空宫';
  const m = p.stars.filter(s => s.type === 'major').map(s => s.name);
  return m.length > 0 ? m.join('、') : (p.borrowedStars?.length ? `借${p.borrowedFromName}：${p.borrowedStars.join('、')}` : '空宫');
}

function analyzeCompatibility(a: ZiweiChart, b: ZiweiChart, question: string): string[] {
  const lines: string[] = [];
  const c1 = getPalace(a, '夫妻宫');
  const c2 = getPalace(b, '夫妻宫');
  const m1 = a.palaces.find(p => p.branch === a.mingGongBranch);
  const m2 = b.palaces.find(p => p.branch === b.mingGongBranch);

  lines.push('══════════════ 双方命盘对比 ══════════════');
  lines.push('');
  
  // 命宫对比
  lines.push('【命宫对比】');
  lines.push(`甲方命宫：${pm(m1)}`);
  lines.push(`乙方命宫：${pm(m2)}`);
  lines.push('');
  
  // 夫妻宫
  lines.push('【夫妻宫对比】');
  lines.push(`甲方夫妻宫：${pm(c1)}`);
  lines.push(`乙方夫妻宫：${pm(c2)}`);
  lines.push('');

  // 十二宫逐个对比
  const palaces = ['命宫','兄弟宫','夫妻宫','子女宫','财帛宫','疾厄宫','迁移宫','交友宫','官禄宫','田宅宫','福德宫','父母宫'];
  lines.push('【十二宫逐一对比】');
  for (const name of palaces) {
    const pa = getPalace(a, name);
    const pb = getPalace(b, name);
    lines.push(`  ${name}：甲方【${pm(pa)}】 vs 乙方【${pm(pb)}】`);
  }
  lines.push('');

  // 命盘格局共同点
  lines.push('【格局共同点】');
  const pa = detectPatterns(a);
  const pb = detectPatterns(b);
  const aNames = pa.map(p => p.name);
  const bNames = pb.map(p => p.name);
  const common = aNames.filter(n => bNames.includes(n));
  if (common.length > 0) {
    lines.push(`双方命盘共同格局：${common.join('、')}`);
  } else {
    lines.push('双方无明显共同格局。');
  }
  lines.push('');

  // 合盘解读
  lines.push('══════════════ 合盘解读 ══════════════');
  lines.push('');

  if (question.includes('感情') || question.includes('婚姻') || question.includes('结婚')) {
    lines.push('【感情合盘分析】');
    const aLove = pm(c1);
    const bLove = pm(c2);
    if (aLove === bLove) {
      lines.push('双方夫妻宫主星相同，感情观念有共鸣，但也可能有相同的盲点。');
    }
    const peachStars = ['贪狼','廉贞','太阴'];
    const aPeach = a.stars.some(s => peachStars.includes(s.name));
    const bPeach = b.stars.some(s => peachStars.includes(s.name));
    if (aPeach && bPeach) lines.push('双方命宫均带桃花星，互相吸引力强，但需注意感情稳定性。');
    const shaStars = ['擎羊','陀罗','火星','铃星'];
    const aSha = (c1?.stars || []).some(s => shaStars.includes(s.name));
    const bSha = (c2?.stars || []).some(s => shaStars.includes(s.name));
    if (aSha || bSha) lines.push('一方或双方夫妻宫带煞星，沟通是维系感情的关键。');
    lines.push('');
  }

  if (question.includes('事业') || question.includes('创业') || question.includes('合作')) {
    lines.push('【事业合盘分析】');
    const aCare = pm(getPalace(a, '官禄宫'));
    const bCare = pm(getPalace(b, '官禄宫'));
    lines.push(`甲方事业方向：${aCare}，适合${starDesc((getPalace(a,'官禄宫')?.stars.find(s=>s.type==='major'))?.name||'')}相关领域`);
    lines.push(`乙方事业方向：${bCare}，适合${starDesc((getPalace(b,'官禄宫')?.stars.find(s=>s.type==='major'))?.name||'')}相关领域`);
    lines.push('');
  }

  if (question.includes('财运') || question.includes('财富')) {
    lines.push('【财富合盘分析】');
    lines.push(`甲方财帛宫：${pm(getPalace(a, '财帛宫'))}`);
    lines.push(`乙方财帛宫：${pm(getPalace(b, '财帛宫'))}`);
    lines.push('');
  }

  // 综合建议
  lines.push('【合盘建议】');
  lines.push('无论命盘如何匹配，感情的经营、事业的合作都需要双方共同的努力和付出。命盘提示的是先天倾向，后天的沟通和理解才是关键。');

  return lines;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { chartA, chartB, question } = body;
    if (!chartA || !chartB) {
      return new Response(JSON.stringify({ error: '缺少数据' }), { status: 400 });
    }

    const q = question || '感情匹配度如何？';
    const lines = analyzeCompatibility(chartA, chartB, q);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        for (const line of lines) {
          controller.enqueue(encoder.encode('data: ' + JSON.stringify({ delta: { text: line + '\n' } }) + '\n\n'));
          await new Promise(r => setTimeout(r, 10));
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    });
  } catch (err) {
    console.error('heming error:', err);
    return new Response(JSON.stringify({ error: '分析失败' }), { status: 500 });
  }
}
