import { detectPatterns, getMingGongSummary } from '@/lib/ziwei/patterns';
import type { ZiweiChart, Palace, Star } from '@/lib/ziwei/types';

export const runtime = 'nodejs';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const STARS: Record<string, string> = {
  "紫微":"北斗帝星，主尊贵权威。格局宏大，有领导气质，不甘人下。得左右魁钺则贵气更显。",
  "天机":"南斗益算星，主智慧谋略。思维敏捷，善策划分析。化禄化权则智谋得用；化忌则思虑过度。",
  "太阳":"官禄星，主光明磊落。豪爽大方，热心助人。寅卯辰巳旺，酉戌亥子陷。化权增贵气。",
  "武曲":"财帛星，主刚毅果决。执行力强，适合军警、金融、技术行业。化禄增财，化权增权威。",
  "天同":"福星，主温和善良。平和知足，有艺术天赋。化禄化权则福气深厚。",
  "廉贞":"次桃花星，主才华横溢。聪明多才，感情丰富。化禄增财，化忌主感情困扰。",
  "天府":"财库星，主稳重保守。有领导才能，理财有道。得禄存同宫则财库丰盈。",
  "太阴":"财富星，主温柔细腻。内敛有审美，适合设计、财务行业。化权增贵，化忌主感情困扰。",
  "贪狼":"正桃花星，主多才多艺。社交强，有艺术天赋。化禄增桃花财运，化忌主欲望失控。",
  "巨门":"是非星，主口才出众。善分析思考，适合研究、法律行业。化禄增口才，化忌主口舌。",
  "天相":"印绶星，主协调辅助。稳重可靠，适合行政、管理、服务行业。",
  "天梁":"荫星，主庇护长辈。成熟稳重，适合医疗、教育、慈善行业。化禄增福荫。",
  "七杀":"将星，主果断坚决。刚强敢闯，适合军警、创业。喜化权增权威，化忌主孤克。",
  "破军":"变动星，主破旧立新。勇于改变，适合创新领域。化禄增变动财，化忌主动荡。",
};

const JOY = ['左辅','右弼','天魁','天钺','禄存','文昌','文曲','天马'];
const SHA = ['擎羊','陀罗','火星','铃星','地空','地劫'];

function desc(s: string): string { return STARS[s] || ''; }

function pd(s: string | undefined): string {
  if (!s) return '';
  return { bright: '庙旺', normal: '平', dim: '落陷' }[s] || '';
}

function pst(s: string | undefined): string {
  if (!s) return '';
  return { '禄': '化禄——财运亨通', '权': '化权——权威增强', '科': '化科——名声远扬', '忌': '化忌——困扰考验' }[s] || '';
}

function starText(palace: Palace): string[] {
  const r: string[] = [];
  const majors = palace.stars.filter(s => s.type === 'major');
  const minors = palace.stars.filter(s => s.type !== 'major');

  if (majors.length === 0) {
    if (palace.borrowedStars && palace.borrowedStars.length > 0) {
      r.push(`空宫，借对宫${palace.borrowedFromName || ''}：${palace.borrowedStars.join('、')}`);
    } else {
      r.push('空宫，需借对宫来看。');
    }
    return r;
  }

  for (const s of majors) {
    let t = `● ${s.name}：${desc(s.name)}`;
    const bt = pd(s.brightness);
    if (bt) t += ` 【${bt}】`;
    const st = pst(s.siHua);
    if (st) t += ` ${st}`;
    r.push(t);
  }

  const joys = minors.filter(s => JOY.includes(s.name));
  const shas = minors.filter(s => SHA.includes(s.name));
  if (joys.length > 0) r.push(`✓ 吉辅：${joys.map(s => s.name).join('、')}，增强贵气与人缘。`);
  if (shas.length > 0) r.push(`⚠ 煞星：${shas.map(s => s.name).join('、')}，带来挑战与磨练，需注意其负面作用。`);

  // 组合格局
  if (majors.length >= 2) {
    const names = majors.map(s => s.name).sort().join(',');
    const combos: Record<string, string> = {
      "紫微,天府": "★ 紫府同宫格：帝王与财库相会，格局极高。大贵大富，有领导才能且善于理财。",
      "紫微,破军": "★ 紫破同宫：变革与创新，有开创精神但过程多起伏。",
      "紫微,七杀": "★ 紫杀同宫：威权格局，刚毅果决，有将帅之风。",
      "武曲,七杀": "★ 武杀同宫：刚强格局，执行力极强，人际关系较硬。",
      "廉贞,七杀": "★ 廉杀同宫：刑杖格局，刚强果断但易惹是非。",
      "天机,天梁": "★ 机月同梁：善策划谋略，适合教育、研究、咨询。",
      "太阳,太阴": "★ 日月并明：性格外柔内刚，适合公众事业。",
      "贪狼,廉贞": "★ 桃花才华交织：艺术天赋强，感情较复杂。",
    };
    if (combos[names]) r.push(combos[names]);
  }
  return r;
}

function getPalaces(chart: ZiweiChart): Record<string, Palace | undefined> {
  const map: Record<string, Palace | undefined> = {};
  for (const p of chart.palaces) map[p.name] = p;
  return map;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { chart, messages }: { chart: ZiweiChart; messages: Message[] } = body;
    if (!chart || !messages) return new Response(JSON.stringify({ error: '无数据' }), { status: 400 });

    const last = [...messages].reverse().find(m => m.role === 'user')?.content || '';
    const topicMap: Record<string, string> = { '命格':'0','感情':'1','事业':'2','财运':'3','健康':'4','性格':'5' };
    const tk = Object.entries(topicMap).find(([k]) => last.includes(k))?.[1] || '0';

    const age = new Date().getFullYear() - (chart.birthInfo?.year || 1995);
    const pMap = getPalaces(chart);
    const patterns = detectPatterns(chart);
    const summary = getMingGongSummary(chart);
    const dx = chart.daXians?.find(d => age >= d.startAge && age <= d.endAge) || null;

    const lines: string[] = [];
    const addLine = (...strs: string[]) => strs.forEach(s => lines.push(s));

    if (tk === '0') { // 命格
      addLine('══════════════ 命格总论 ══════════════', '');
      if (summary.stars.length > 0) {
        addLine(`✨ ${summary.stars.join('、')}坐命 · ${chart.wuxingJuName}`);
        addLine('', '【命宫详解】');
        addLine(...starText(pMap['命宫']!));
      } else {
        addLine('命宫为空宫，性格受环境影响较大。');
      }
      addLine('');
      const good = patterns.filter(p => ['good','excellent'].includes(p.level));
      const bad = patterns.filter(p => p.level === 'caution');
      if (good.length > 0 || bad.length > 0) {
        addLine('【格局分析】');
        for (const p of good.slice(0, 5)) addLine(`✓ ${p.name}`);
        for (const p of bad.slice(0, 3)) addLine(`⚠ ${p.name}`);
        addLine('');
      }
      if (dx) {
        addLine(`【当前大限】${dx.palaceName}（${dx.startAge}-${dx.endAge}岁）`);
        const dp = pMap[dx.palaceName];
        if (dp) {
          const ms = dp.stars.filter(s => s.type === 'major').map(s => s.name);
          if (ms.length > 0) addLine(`主星：${ms.join('、')}`);
        }
      }
      addLine('', '命盘格局仅供参考，人生方向掌握在自己手中。');
    }

    if (tk === '1') { // 感情
      addLine('══════════════ 感情婚姻 ══════════════', '');
      const lp = pMap['夫妻宫'];
      if (lp) {
        addLine('【夫妻宫详解】');
        addLine(...starText(lp));
        const ms = lp.stars.filter(s => s.type === 'major');
        if (ms.length > 0) {
          const n = ms.map(s => s.name);
          if (n.includes('紫微')) addLine('配偶有领导才能，社会地位较高。');
          if (n.includes('天同')) addLine('配偶温和善良，婚姻和谐。');
          if (n.includes('太阴')) addLine('配偶温柔细腻，注重感情质量。');
          if (n.includes('贪狼')) addLine('桃花运旺，需注意感情专一度。');
          if (n.includes('七杀') || n.includes('破军')) addLine('感情宜晚婚，早婚多波折。');
          if (n.includes('天府')) addLine('配偶稳重顾家，经济观念强。');
          if (n.includes('天相')) addLine('配偶体贴周到，是贤内助。');
        }
        const peach = lp.stars.some(s => ['红鸾','天喜','咸池'].includes(s.name));
        if (peach) addLine('桃花星入夫妻宫，异性缘好，感情机会多。');
        const hasSha = lp.stars.some(s => SHA.includes(s.name));
        if (hasSha) addLine('煞星入夫妻宫，感情中需多注意沟通，避免因小事争执。');
      }
      addLine('');
      addLine('【相关宫位联动】');
      for (const n of ['官禄宫','迁移宫','福德宫']) {
        const p = pMap[n];
        if (p) {
          const ms = p.stars.filter(s => s.type === 'major').map(s => s.name);
          addLine(`${n}：${ms.length > 0 ? ms.join('、') : '空宫'}`);
        }
      }
      if (pMap['迁移宫']?.stars.some(s => s.name === '天马')) addLine('天马在迁移宫，可能遇到异地姻缘。');
      addLine('');
      if (dx) addLine(`⏰ 当前${dx.palaceName}大限（${dx.startAge}-${dx.endAge}岁），感情走势与此宫位主题相关。`);
      addLine('', '感情需要用心经营，多沟通、多包容。');
    }

    if (tk === '2') { // 事业
      addLine('══════════════ 事业发展 ══════════════', '');
      const cp = pMap['官禄宫'];
      if (cp) {
        addLine('【官禄宫详解】');
        addLine(...starText(cp));
        const ms = cp.stars.filter(s => s.type === 'major').map(s => s.name);
        const jobs: string[] = [];
        if (ms.some(s => ['紫微','天府'].includes(s))) jobs.push('管理、领导、政府部门');
        if (ms.some(s => ['天机','天梁','巨门'].includes(s))) jobs.push('教育、研究、咨询、法律、医疗');
        if (ms.some(s => ['太阳','天相'].includes(s))) jobs.push('公共服务、行政、媒体');
        if (ms.some(s => ['武曲','七杀'].includes(s))) jobs.push('军警、技术、工程、金融');
        if (ms.some(s => ['贪狼','廉贞'].includes(s))) jobs.push('艺术、娱乐、创意、社交');
        if (ms.some(s => ['太阴','天同'].includes(s))) jobs.push('设计、财务、文化艺术');
        if (ms.some(s => ['破军'].includes(s))) jobs.push('创业、技术创新变革');
        if (jobs.length > 0) addLine('', `推荐行业方向：${jobs.join('、')}`, '');
        if (ms.includes('天府')) addLine('天府为财库星入官禄，适合稳定管理岗位，宜在成熟平台发展。');
        if (ms.includes('七杀') || ms.includes('破军')) addLine('变动星入官禄，事业多变动，适合动态挑战型工作。');
        if (ms.includes('紫微')) addLine('紫微帝星入官禄，有领导潜力，适合管理岗位。');
      }
      addLine('');
      const wp = pMap['财帛宫'];
      if (wp) {
        const wm = wp.stars.filter(s => s.type === 'major').map(s => s.name);
        addLine(`【财帛联动】${wm.length > 0 ? wm.join('、') : '空宫'}坐财帛宫，赚钱方式与之相关。`);
      }
      addLine('');
      if (dx) addLine(`⏰ 当前${dx.palaceName}大限（${dx.startAge}-${dx.endAge}岁），宜围绕该宫位主题发展事业。`);
      addLine('', '选择适合自己星曜特质的方向，稳扎稳打。');
    }

    if (tk === '3') { // 财运
      addLine('══════════════ 财运分析 ══════════════', '');
      const wp = pMap['财帛宫'];
      if (wp) {
        addLine('【财帛宫详解】');
        addLine(...starText(wp));
        const ms = wp.stars.filter(s => s.type === 'major').map(s => s.name);
        if (ms.includes('武曲')) addLine('武曲为财帛正星，财运稳定，有理财天赋。');
        if (ms.includes('天府') || ms.includes('太阴')) addLine('财库星入财帛，善于积蓄，财源稳定。');
        if (ms.includes('紫微')) addLine('紫微入财帛，有大进大出之象，格局大但需注意风险。');
        if (ms.includes('贪狼')) addLine('贪狼入财帛，偏财运强，适合多元化收入，但切忌投机。');
        if (ms.includes('破军')) addLine('破军入财帛，财运起伏较大，适合靠创新和变革赚钱。');
        if (ms.includes('巨门')) addLine('巨门入财帛，靠口才和专业技能赚钱，适合咨询、法律等行业。');
        if (ms.includes('天机')) addLine('天机入财帛，靠智慧和策划赚钱，思维灵活多变。');
      }
      addLine('');
      const hp = pMap['田宅宫'];
      if (hp) {
        const hm = hp.stars.filter(s => s.type === 'major').map(s => s.name);
        addLine(`【田宅宫财库】${hm.length > 0 ? hm.join('、') : '空宫'}，影响不动产和积蓄能力。`);
        if (hm.includes('天府')) addLine('天府守田宅，不动产运佳。');
        if (hm.includes('太阴')) addLine('太阴守田宅，宜投资房产。');
      }
      addLine('');
      addLine('合理规划收支，避免冲动投资。财帛宫星曜决定了最适合你的赚钱模式。');
    }

    if (tk === '4') { // 健康
      addLine('══════════════ 健康分析 ══════════════', '');
      const hp = pMap['疾厄宫'];
      if (hp) {
        addLine('【疾厄宫详解】');
        addLine(...starText(hp));
        const ms = hp.stars.filter(s => s.type === 'major').map(s => s.name);
        const risks: string[] = [];
        if (ms.some(s => ['七杀','破军'].includes(s))) risks.push('注意意外伤害、筋骨损伤，避免高风险运动');
        if (ms.includes('廉贞')) risks.push('注意心血系统和内分泌问题，避免劳累');
        if (ms.includes('巨门')) risks.push('注意消化系统、肠胃问题，饮食宜规律');
        if (ms.includes('天机')) risks.push('注意神经系统和睡眠质量，避免思虑过度');
        if (ms.includes('贪狼')) risks.push('注意肝火和代谢问题，少吃刺激性食物');
        if (ms.some(s => ['紫微','天府'].includes(s))) risks.push('脾胃需注意，不宜暴饮暴食');
        if (ms.some(s => ['天同','天梁'].includes(s))) risks.push('总体体质较好，但要注意饮食节制和运动');
        if (ms.includes('太阳')) risks.push('注意心血管和眼睛，避免过度劳累');
        if (risks.length > 0) {
          addLine('', '【主要风险】');
          risks.forEach(r => addLine(`⚕ ${r}`));
        }
        const hasSha = hp.stars.some(s => SHA.includes(s.name));
        if (hasSha) addLine('', '煞星入疾厄宫，需注意突发健康问题，定期体检很重要。');
      }
      addLine('');
      if (dx) addLine(`⏰ 当前${dx.palaceName}大限，宜关注该宫位对应的健康领域。`);
      addLine('', '保持规律作息，均衡饮食，定期体检，防患于未然。');
    }

    if (tk === '5') { // 性格
      addLine('══════════════ 性格分析 ══════════════', '');
      const ming = pMap['命宫'];
      if (ming && summary.stars.length > 0) {
        addLine(`✨ ${summary.stars.join('、')}坐命 · ${summary.nature}`);
        addLine('', '【性格详解】');
        addLine(...starText(ming));
      } else {
        addLine('命宫为空宫，性格具有可塑性，易受环境影响。');
      }
      addLine('');
      addLine('【三方四正影响】');
      for (const n of ['官禄宫','财帛宫','迁移宫']) {
        const p = pMap[n];
        if (p) {
          const ms = p.stars.filter(s => s.type === 'major').map(s => s.name);
          addLine(`  ${n}：${ms.length > 0 ? ms.join('、') : '空宫'}`);
        }
      }
      addLine('');
      addLine('【人际关系】');
      for (const n of ['交友宫','兄弟宫']) {
        const p = pMap[n];
        if (p) {
          const ms = p.stars.filter(s => s.type === 'major').map(s => s.name);
          addLine(`  ${n}：${ms.length > 0 ? ms.join('、') : '空宫'}`);
        }
      }
      addLine('');
      addLine('了解自己的性格特质和惯性模式，发挥天赋优势，有意识地调整不足。');
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        for (const line of lines) {
          controller.enqueue(encoder.encode('data: ' + JSON.stringify({ delta: { text: line + '\n' } }) + '\n\n'));
          await new Promise(r => setTimeout(r, 12));
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    });
  } catch (err) {
    console.error('API error:', err);
    return new Response(JSON.stringify({ error: '内部错误' }), { status: 500 });
  }
}
