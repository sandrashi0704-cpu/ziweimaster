import { detectPatterns, getMingGongSummary } from '@/lib/ziwei/patterns';
import type { ZiweiChart, Palace, Star } from '@/lib/ziwei/types';

export const runtime = 'nodejs';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function getStarInterpretation(name: string): string {
  const map: Record<string, string> = JSON.parse('{"紫微":"北斗帝星，主尊贵权威。入命则格局宏大，有领导气质，自尊心强，不甘人下。得左右魁钺夹辅则贵气更显。","天机":"南斗益算星，主智慧谋略。思维敏捷，善策划分析，口才佳。化禄化权则智谋得用；化忌则易思虑过度。","太阳":"官禄星，主光明磊落。性情豪爽大方，热心助人。寅卯辰巳宫为旺，酉戌亥子宫为陷。化权增贵气，化忌主劳心。","武曲":"财帛星，主刚毅果决。性格刚强，有执行力，适合军警、金融、技术等行业。化禄增财，化权增权威。","天同":"福星，主温和善良。性格平和，知足常乐，有艺术天赋。化禄化权则福气深厚。","廉贞":"次桃花星，主才华横溢。聪明多才，感情丰富，有艺术品味。化禄增财，化忌主感情困扰。","天府":"财库星，主稳重保守。有领导才能，理财有道，善于守成。得禄存同宫则财库丰盈。","太阴":"财富星，主温柔细腻。性格内敛，有审美才华，适合艺术、设计、财务等行业。","贪狼":"正桃花星，主多才多艺。社交能力强，有艺术天赋。化禄增桃花财运，化忌主欲望失控。","巨门":"是非星，主口才出众。善于分析思考，适合研究、咨询、法律等行业。化禄增口才，化忌主口舌。","天相":"印绶星，主协调辅助。性格稳重可靠，适合行政、管理、服务等行业。","天梁":"荫星，主庇护长辈。性格成熟稳重，有责任感，适合医疗、教育、慈善等行业。","七杀":"将星，主果断坚决。性格刚强，敢闯敢拼，适合军警、创业。喜化权增权威，化忌主孤克。","破军":"变动星，主破旧立新。性格叛逆，勇于改变，适合创新、改革。化禄增变动财，化忌主动荡。"}');
  return map[name] || '';
}

function getBrightnessText(b: string | undefined): string {
  if (!b) return '';
  const m: Record<string, string> = { bright: "庙旺", normal: "平", dim: "落陷" };
  return m[b] || '';
}

function getSiHuaText(s: string | undefined): string {
  if (!s) return '';
  const m: Record<string, string> = { "禄": "化禄——财运亨通", "权": "化权——权威增强", "科": "化科——名声远扬", "忌": "化忌——困扰考验" };
  return m[s] || '';
}

function analyzePalaceStars(palace: Palace, detail: boolean = false): string[] {
  const majors = palace.stars.filter(s => s.type === 'major');
  const minors = palace.stars.filter(s => s.type === 'minor' || s.type === 'lucky' || s.type === 'sha');
  const r: string[] = [];
  if (majors.length === 0) {
    if (palace.isEmpty && palace.borrowedFromName) {
      r.push(`空宫，借对宫${palace.borrowedFromName}星曜来看：${palace.borrowedStars?.join('、') || ''}`);
    } else {
      r.push('空宫，需借对宫来看。');
    }
  } else {
    for (const s of majors) {
      let text = `${s.name}：${getStarInterpretation(s.name)}`;
      const bt = getBrightnessText(s.brightness);
      if (bt) text += `【${bt}】`;
      const st = getSiHuaText(s.siHua);
      if (st) text += ` 且${st}`;
      r.push(text);
    }
    if (detail && majors.length >= 2) {
      const combo = analyzeCombo(majors.map(s => s.name));
      if (combo) r.push(`组合格局：${combo}`);
    }
  }
  if (minors.length > 0 && detail) {
    const joys = minors.filter(s => ['左辅','右弼','天魁','天钺','禄存','文昌','文曲','天马'].includes(s.name));
    const shas = minors.filter(s => ['擎羊','陀罗','火星','铃星','地空','地劫'].includes(s.name));
    if (joys.length > 0) r.push(`吉辅：${joys.map(s => s.name).join('、')}，增强贵气。`);
    if (shas.length > 0) r.push(`煞星：${shas.map(s => s.name).join('、')}，带来挑战与磨练。`);
  }
  return r;
}

function analyzeCombo(names: string[]): string {
  const key = [...names].sort().join(',');
  const m: Record<string, string> = JSON.parse('{"紫微,天府":"紫府同宫格，帝王与财库相会，格局极高。主大贵大富，有领导才能且善于理财。","紫微,破军":"紫破同宫，变革与创新格局。有开创精神，但过程多有起伏。","紫微,七杀":"紫杀同宫，威权格局。刚毅果决，有将帅之风。","武曲,七杀":"武杀同宫，刚强格局。执行力极强，但人际关系较硬。","廉贞,七杀":"廉杀同宫，刑杖格局。刚强果断但易惹是非。","天机,天梁":"机月同梁格局，善策划有谋略。适合教育、研究、咨询。","太阳,太阴":"日月同宫或对照，光明格局。性格外柔内刚。","贪狼,廉贞":"桃花与才华交织。艺术天赋强，感情较为复杂。"}');
  return m[key] || '';
}

function getPalaceMeaning(name: string): string {
  const m: Record<string, string> = JSON.parse('{"命宫":"先天性格与格局","兄弟宫":"手足合作与人脉","夫妻宫":"感情婚姻与配偶","子女宫":"子女缘分与创作","财帛宫":"赚钱模式与财富","疾厄宫":"先天体质与健康","迁移宫":"外出发展与人缘","交友宫":"社交圈子与朋友","官禄宫":"事业方向与地位","田宅宫":"不动产与家庭运","福德宫":"精神世界与福气","父母宫":"父母缘分与遗传"}');
  return m[name] || '';
}

function buildInterpretation(chart: ZiweiChart, topic: string): string[] {
  const lines: string[] = [];
  const age = new Date().getFullYear() - (chart.birthInfo?.year || 1995);
  const patterns = detectPatterns(chart);
  const summary = getMingGongSummary(chart);
  const ming = chart.palaces.find(p => p.branch === chart.mingGongBranch);
  const currentDxIdx = chart.daXians?.findIndex(d => age >= d.startAge && age <= d.endAge) ?? -1;
  const currentDx = currentDxIdx >= 0 ? chart.daXians?.[currentDxIdx] : null;

  if (topic === 'overview') {
    lines.push('══════════════ 命格总论 ══════════════');
    lines.push('');
    if (summary.stars.length > 0) {
      lines.push(`✨ 命宫：${summary.stars.join('、')}坐命`);
      lines.push(`✨ 五行局：${chart.wuxingJuName}`);
      lines.push('');
      lines.push('【命宫详解】');
      if (ming) lines.push(...analyzePalaceStars(ming, true));
    } else {
      lines.push('命宫为空宫，性格受环境影响较大。');
    }
    lines.push('');
    const goodP = patterns.filter(p => p.level === 'good' || p.level === 'excellent');
    const badP = patterns.filter(p => p.level === 'caution');
    if (goodP.length > 0 || badP.length > 0) {
      lines.push('【格局分析】');
      for (const p of goodP.slice(0, 5)) lines.push(`✓ ${p.name}：${p.description.slice(0, 80)}`);
      for (const p of badP.slice(0, 3)) lines.push(`⚠ ${p.name}：${p.description.slice(0, 80)}`);
      lines.push('');
    }
    lines.push('【大限信息】');
    if (currentDx) {
      const dxPalace = chart.palaces.find(p => p.branch === currentDx.palaceBranch);
      lines.push(`当前${currentDx.palaceName}大限（${currentDx.startAge}-${currentDx.endAge}岁）`);
      if (dxPalace) {
        const dxMajors = dxPalace.stars.filter(s => s.type === 'major');
        if (dxMajors.length > 0) lines.push(`主星：${dxMajors.map(s => s.name).join('、')}`);
      }
    } else {
      lines.push(`当前${age}岁。`);
    }
    lines.push('');
    lines.push('命盘格局仅供参考，人生方向掌握在自己手中。');
  }

  if (topic === 'love') {
    lines.push('══════════════ 感情婚姻 ══════════════');
    lines.push('');
    const lp = chart.palaces.find(p => p.name === '夫妻宫');
    if (lp) {
      lines.push('【夫妻宫】');
      lines.push(...analyzePalaceStars(lp, true));
    }
    lines.push('');
    lines.push('【相关宫位】');
    for (const n of ['官禄宫', '迁移宫', '福德宫']) {
      const p = chart.palaces.find(pp => pp.name === n);
      if (p) {
        const ms = p.stars.filter(s => s.type === 'major').map(s => s.name);
        lines.push(`${n}：${ms.length > 0 ? ms.join('、') : '空宫'}`);
      }
    }
    lines.push('');
    lines.push('⏰ 当前大限');
    if (currentDx) lines.push(`当前${currentDx.palaceName}大限（${currentDx.startAge}-${currentDx.endAge}岁），感情走势与此宫位主题相关。`);
    lines.push('');
    lines.push('感情需要用心经营，多沟通、多包容。');
  }

  if (topic === 'career') {
    lines.push('══════════════ 事业发展 ══════════════');
    lines.push('');
    const cp = chart.palaces.find(p => p.name === '官禄宫');
    if (cp) {
      lines.push('【官禄宫】');
      lines.push(...analyzePalaceStars(cp, true));
      const cMajors = cp.stars.filter(s => s.type === 'major').map(s => s.name);
      const jobs: string[] = [];
      if (cMajors.some(s => ['紫微','天府'].includes(s))) jobs.push('管理、领导岗位、政府部门');
      if (cMajors.some(s => ['天机','天梁','巨门'].includes(s))) jobs.push('教育、研究、咨询、法律、医疗');
      if (cMajors.some(s => ['太阳','天相'].includes(s))) jobs.push('公共服务、行政、媒体');
      if (cMajors.some(s => ['武曲','七杀'].includes(s))) jobs.push('军警、技术、工程、金融');
      if (cMajors.some(s => ['贪狼','廉贞'].includes(s))) jobs.push('艺术、娱乐、创意、社交');
      if (cMajors.some(s => ['太阴','天同'].includes(s))) jobs.push('设计、财务、文化艺术');
      if (cMajors.some(s => ['破军'].includes(s))) jobs.push('创业、技术创新、变革性行业');
      if (jobs.length > 0) lines.push(`推荐方向：${jobs.join('、')}`);
    }
    lines.push('');
    lines.push('【财帛联动】');
    const wp = chart.palaces.find(p => p.name === '财帛宫');
    if (wp) {
      const wm = wp.stars.filter(s => s.type === 'major').map(s => s.name);
      lines.push(`财帛宫${wm.length > 0 ? wm.join('、') : '空宫'}，赚钱方式与之相关。`);
    }
    lines.push('');
    lines.push('⏰ 当前大限');
    if (currentDx) lines.push(`当前${currentDx.palaceName}大限（${currentDx.startAge}-${currentDx.endAge}岁），宜围绕此宫位主题发展。`);
    lines.push('');
    lines.push('选择适合自己星曜特质的行业，稳中求进。');
  }

  if (topic === 'wealth') {
    lines.push('══════════════ 财运分析 ══════════════');
    lines.push('');
    const wp = chart.palaces.find(p => p.name === '财帛宫');
    if (wp) {
      lines.push('【财帛宫】');
      lines.push(...analyzePalaceStars(wp, true));
      const wm = wp.stars.filter(s => s.type === 'major').map(s => s.name);
      if (wm.includes('武曲')) lines.push('武曲为财帛正星，财运稳定，有理财天赋。');
      if (wm.includes('天府') || wm.includes('太阴')) lines.push('财库星入财帛，善于积蓄。');
      if (wm.includes('贪狼')) lines.push('贪狼入财帛，偏财运强，适合多元化收入。');
    }
    lines.push('');
    lines.push('【田宅宫（财库）】');
    const hp = chart.palaces.find(p => p.name === '田宅宫');
    if (hp) {
      const hm = hp.stars.filter(s => s.type === 'major').map(s => s.name);
      lines.push(`田宅宫${hm.length > 0 ? hm.join('、') : '空宫'}，影响不动产和积蓄能力。`);
    }
    lines.push('');
    lines.push('合理规划财务，避免冲动投资。');
  }

  if (topic === 'health') {
    lines.push('══════════════ 健康分析 ══════════════');
    lines.push('');
    const hp = chart.palaces.find(p => p.name === '疾厄宫');
    if (hp) {
      lines.push('【疾厄宫】');
      lines.push(...analyzePalaceStars(hp, true));
      const hm = hp.stars.filter(s => s.type === 'major').map(s => s.name);
      const risks: string[] = [];
      if (hm.includes('七杀')) risks.push('注意意外伤害、筋骨损伤');
      if (hm.includes('廉贞')) risks.push('注意心血系统和内分泌问题');
      if (hm.includes('巨门')) risks.push('注意消化系统、肠胃问题');
      if (hm.includes('天机')) risks.push('注意神经系统和睡眠质量');
      if (hm.includes('贪狼')) risks.push('注意肝火和代谢问题');
      if (hm.includes('紫微') || hm.includes('天府')) risks.push('脾胃需注意');
      if (risks.length > 0) {
        lines.push('');
        lines.push('【健康提示】');
        risks.forEach(r => lines.push(`⚕ ${r}`));
      }
      const hasSha = hp.stars.some(s => ['擎羊','陀罗','火星','铃星'].includes(s.name));
      if (hasSha) lines.push('煞星入疾厄，需注意突发健康问题，定期体检。');
    }
    lines.push('');
    lines.push('保持规律作息，定期体检，防患于未然。');
  }

  if (topic === 'personality') {
    lines.push('══════════════ 性格分析 ══════════════');
    lines.push('');
    if (summary.stars.length > 0 && ming) {
      lines.push(`✨ ${summary.stars.join('、')}坐命，${summary.nature}`);
      lines.push('');
      lines.push('【性格详解】');
      lines.push(...analyzePalaceStars(ming, true));
    } else {
      lines.push('命宫为空宫，性格可塑性强。');
    }
    lines.push('');
    lines.push('【三方四正】');
    for (const n of ['官禄宫', '财帛宫', '迁移宫']) {
      const p = chart.palaces.find(pp => pp.name === n);
      if (p) {
        const ms = p.stars.filter(s => s.type === 'major').map(s => s.name);
        lines.push(`${n}：${ms.length > 0 ? ms.join('、') : '空宫'}——${getPalaceMeaning(n)}`);
      }
    }
    lines.push('');
    lines.push('了解自己的性格特质，发挥天赋优势，有意识地调整不足。');
  }

  return lines;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { chart, messages }: { chart: ZiweiChart; messages: Message[] } = body;

    if (!chart || !messages) {
      return new Response(JSON.stringify({ error: '缺少数据' }), { status: 400 });
    }

    const lastUser = [...messages].reverse().find(m => m.role === 'user')?.content || '';
    const topicKey = lastUser.includes('感情') ? 'love' : lastUser.includes('事业') ? 'career' : lastUser.includes('财运') ? 'wealth' : lastUser.includes('健康') ? 'health' : lastUser.includes('性格') ? 'personality' : 'overview';

    const lines = buildInterpretation(chart, topicKey);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        for (const line of lines) {
          controller.enqueue(encoder.encode('data: ' + JSON.stringify({ delta: { text: line + '\n' } }) + '\n\n'));
          await new Promise(r => setTimeout(r, 15));
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    });
  } catch (error) {
    console.error('API error:', error);
    return new Response(JSON.stringify({ error: '内部错误' }), { status: 500 });
  }
}
