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
  if (joys.length > 0) r.push(`? 吉辅：${joys.map(s => s.name).join('、')}，增强贵气与人缘。`);
  if (shas.length > 0) r.push(`? 煞星：${shas.map(s => s.name).join('、')}，带来挑战与磨练，需注意其负面作用。`);

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
        addLine(`? ${summary.stars.join('、')}坐命 · ${chart.wuxingJuName}`);
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
        for (const p of good.slice(0, 5)) addLine(`? ${p.name}`);
        for (const p of bad.slice(0, 3)) addLine(`? ${p.name}`);
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
      addLine('══════════════ 感情婚姻深度分析 ══════════════', '');
      addLine('感情走向是人生重大课题，夫妻宫的星曜组合揭示了您的姻缘特质与相处模式。');
      addLine('');
      const lp = pMap['夫妻宫'];
      if (lp) {
        addLine('【夫妻宫详解】—— 感情核心宫位');
        addLine(...starText(lp));
        addLine('');
        const ms = lp.stars.filter(s => s.type === 'major');
        if (ms.length > 0) {
          const n = ms.map(s => s.name);
          addLine('【主星感情模式分析】');
          if (n.includes('紫微')) addLine('紫微入夫妻宫：配偶有领导气质，社会地位较高，但需注意对方可能在关系中较强势。紫微喜得左右魁钺，则婚姻和谐贵气；若遇煞星，则易生隔阂。晚婚更吉。');
          if (n.includes('天机')) addLine('天机入夫妻宫：配偶聪慧灵活，善沟通交流，但心思易变，感情易有起伏。天机化禄则感情融洽，化忌则多思多虑，易因猜疑影响关系。');
          if (n.includes('太阳')) addLine('太阳入夫妻宫：感情光明正大，配偶热心开朗。太阳庙旺则婚姻和美，落陷则配偶较忙碌，需互相理解。');
          if (n.includes('武曲')) addLine('武曲入夫妻宫：感情较理性务实，配偶刚毅果断。武曲为孤星，感情中略带距离感，宜晚婚。武曲化禄则夫妻同心共创事业，化忌则易因钱财起争执。');
          if (n.includes('天同')) addLine('天同入夫妻宫：配偶温和善良，婚姻和谐美满。天同化禄化权则福气深厚，夫妻生活甜蜜；天同化忌则需注意情绪问题。');
          if (n.includes('廉贞')) addLine('廉贞入夫妻宫：感情丰富细腻，但廉贞为次桃花星，感情经历较复杂，需注意感情专一度。廉贞化禄则因才华吸引异性，化忌则感情困扰多。');
          if (n.includes('天府')) addLine('天府入夫妻宫：配偶稳重实在，注重家庭生活，经济观念强。天府为财库星，配偶擅理财，婚姻生活物质稳定。');
          if (n.includes('太阴')) addLine('太阴入夫妻宫：配偶温柔细腻，敏感体贴，注重感情品质。太阴化权则配偶有管理能力，化忌则易生感情上的牵挂与困扰。');
          if (n.includes('贪狼')) addLine('贪狼入夫妻宫：桃花运旺盛，异性缘极佳，社交活跃。贪狼化禄则桃花更旺，需注意感情专一度；化忌则欲望失控。贪狼入夫妻宫宜晚婚。');
          if (n.includes('巨门')) addLine('巨门入夫妻宫：配偶口才好善表达，但巨门为是非星，沟通中易产生口舌。巨门化禄则沟通顺畅；化忌则易争吵，需多包容忍让。');
          if (n.includes('天相')) addLine('天相入夫妻宫：配偶体贴周到，是贤内助。天相为印绶星，婚姻中注重体面，善于协调关系。');
          if (n.includes('天梁')) addLine('天梁入夫妻宫：配偶成熟稳重，有长者风范。天梁为荫星，婚姻中能得到配偶的庇护与照顾。年龄差距较大的婚姻反更和谐。');
          if (n.includes('七杀')) addLine('七杀入夫妻宫：感情中带有决断力与独立性，不喜被约束。七杀入夫妻宫感情多波折，宜晚婚。七杀化权则能在关系中掌握主动权。');
          if (n.includes('破军')) addLine('破军入夫妻宫：感情变化较多，感情路上需经历几次波折方能稳定。破军入夫妻宫主先破后立。');
        }
        addLine('');
        addLine('【桃花星与煞星影响】');
        const peach = lp.stars.some(s => ['红鸾','天喜','咸池'].includes(s.name));
        if (peach) addLine('✓ 桃花星入夫妻宫：异性缘好，感情机会多。红鸾天喜为正式桃花，主正缘；咸池为偏桃花，需注意感情分寸。');
        const hasSha = lp.stars.some(s => SHA.includes(s.name));
        if (hasSha) addLine('⚠ 煞星入夫妻宫：感情中需多注意沟通，避免因小事争执。擎羊陀罗入夫妻宫易有争吵，火星铃星则易因情绪爆发影响关系。');
      } else {
        addLine('夫妻宫为空宫，需借对宫官禄宫来看感情走向。');
      }
      addLine('');
      addLine('【相关宫位联动分析】');
      for (const n of ['官禄宫','迁移宫','福德宫','子女宫']) {
        const p = pMap[n];
        if (p) {
          const ms = p.stars.filter(s => s.type === 'major').map(s => s.name);
          addLine('  ' + n + '：' + (ms.length > 0 ? ms.join('、') : '空宫'));
        }
      }
      if (pMap['迁移宫']?.stars.some(s => s.name === '天马')) addLine('  → 天马在迁移宫：可能有异地姻缘。');
      if (pMap['子女宫']?.stars.some(s => ['红鸾','天喜'].includes(s.name))) addLine('  → 红鸾天喜在子女宫：婚后感情与子女缘分深。');
      addLine('');
      if (dx) {
        addLine('⏰ 【当前大限感情提示】');
        addLine('当前' + dx.palaceName + '大限（' + dx.startAge + '-' + dx.endAge + '岁），此阶段感情走势与该宫位主题密切相关。');
        const dp = pMap[dx.palaceName];
        if (dp) {
          const dms = dp.stars.filter(s => s.type === 'major').map(s => s.name);
          if (dms.length > 0) addLine('此大限宫位主星为' + dms.join('、') + '，感情上宜关注该宫位所暗示的方向。');
        }
        addLine('');
      }
      addLine('【感情经营建议】');
      addLine('用心经营，互相包容，坦诚沟通是维系感情的基石。了解彼此的星曜特质，结合大限走势，顺势而为。');
    }
    if (tk === '2') { // 事业
      addLine('══════════════ 事业发展深度分析 ══════════════', '');
      addLine('事业发展的轨迹由官禄宫主导，结合财帛宫与命宫的综合配置，可以描绘出最适合您的事业路径。');
      addLine('');
      const cp = pMap['官禄宫'];
      if (cp) {
        addLine('【官禄宫详解】—— 事业核心分析');
        addLine(...starText(cp));
        addLine('');
        const ms = cp.stars.filter(s => s.type === 'major').map(s => s.name);
        const jobs = [];
        if (ms.some(s => ['紫微','天府'].includes(s))) jobs.push('🏛 管理、领导层、政府部门——有统御才能');
        if (ms.some(s => ['天机','天梁','巨门'].includes(s))) jobs.push('📚 教育、研究、咨询、法律、医疗——靠智慧与口才');
        if (ms.some(s => ['太阳','天相'].includes(s))) jobs.push('🌞 公共服务、行政、媒体、公益——需要热心与组织力');
        if (ms.some(s => ['武曲','七杀'].includes(s))) jobs.push('⚔ 军警、技术、工程、金融——需要果断与执行力');
        if (ms.some(s => ['贪狼','廉贞'].includes(s))) jobs.push('🎨 艺术、娱乐、创意、社交、公关——发挥才华与人脉');
        if (ms.some(s => ['太阴','天同'].includes(s))) jobs.push('🎵 设计、财务、文化艺术、美学相关——细腻感知的领域');
        if (ms.some(s => ['破军'].includes(s))) jobs.push('🚀 创业、科技创新、变革型行业——勇于开拓的领域');
        if (jobs.length > 0) {
          addLine('【推荐行业方向——星曜指引的事业路径】');
          jobs.forEach(j => addLine('  ' + j));
          addLine('');
        }
        addLine('【官禄宫主星详细解读】');
        if (ms.includes('紫微')) addLine('紫微入官禄：帝星入事业宫，格局宏大，有出色的领导能力和管理天赋。天生适合担任决策角色，在大型组织或政府机构中容易脱颖而出。紫微得辅弼魁钺，事业更上一层楼。');
        if (ms.includes('天机')) addLine('天机入官禄：靠智慧和灵活思维发展事业，适合策划、策略、咨询类工作。天机化禄则智谋得用，可考虑创业方向；化忌则思虑过多，需果断行动。');
        if (ms.includes('太阳')) addLine('太阳入官禄：事业光明，做事坦荡磊落，适合公众事业、媒体、外交、公益等领域。太阳庙旺则事业如日中天，落陷则需多付出努力才能成功。太阳化权增贵气。');
        if (ms.includes('武曲')) addLine('武曲入官禄：执行力强，适合技术、金融、军警等需要决断力的行业。武曲为财星入官禄，事业与财富直接挂钩。武曲化禄则事业顺遂财源广进，化权则晋升掌权。');
        if (ms.includes('天府')) addLine('天府入官禄：适合稳定管理岗位，在成熟平台中发展最为有利。天府为财库星，事业上善于整合资源，适合财务、资产管理等领域。');
        if (ms.includes('天同')) addLine('天同入官禄：天同为福星，事业中以和为贵，适合协作性工作。天同不宜承担过大压力，适合文化艺术、心理咨询、教育等较温和的领域。化禄则福气助力事业。');
        if (ms.includes('七杀') || ms.includes('破军')) addLine('七杀/破军入官禄：事业多变动，适合动态挑战型工作。这类配置的人不适合一成不变的工作，越有挑战性的环境越能激发潜力。创业或高风险高回报的行业是好选择。');
        if (ms.includes('贪狼')) addLine('贪狼入官禄：多才多艺，适合需要社交和创新的领域。贪狼在事业中善于整合资源和人脉，在娱乐、社交、艺术领域容易获得成就。化禄则事业机遇多。');
        if (ms.includes('廉贞')) addLine('廉贞入官禄：才华横溢，适合创意、策划、公关类工作。廉贞在事业中既重才华也重人际关系，适合需要协调多方资源的工作。化禄则事业亨通。');
        if (ms.includes('巨门')) addLine('巨门入官禄：靠口才和专业知识立足，适合法律、咨询、教育、媒体等领域。巨门喜化禄化权，则口才变利器；化忌则易有职场是非，需谨言慎行。');
        if (ms.includes('天梁')) addLine('天梁入官禄：善策划谋略，适合医疗、教育、公益、研究等领域。天梁为荫星，事业上趋于稳定发展，宜在成熟机构中深耕。化禄则福荫深厚，贵人相助。');
        if (ms.includes('天相')) addLine('天相入官禄：协调能力强，适合行政、管理、人力资源、服务行业。天相在事业中注重团队协作，适合承担辅助和协调角色。');
      }
      addLine('');
      addLine('【事业格局判断】');
      const good = patterns.filter(p => ['good','excellent'].includes(p.level));
      const bad = patterns.filter(p => p.level === 'caution');
      if (good.length > 0 || bad.length > 0) {
        for (const p of good.slice(0, 5)) addLine('✓ ' + p.name);
        for (const p of bad.slice(0, 3)) addLine('⚠ ' + p.name);
      }
      addLine('');
      addLine('【财帛宫联动——赚钱模式分析】');
      const wp = pMap['财帛宫'];
      if (wp) {
        const wm = wp.stars.filter(s => s.type === 'major').map(s => s.name);
        addLine('财帛宫主星：' + (wm.length > 0 ? wm.join('、') : '空宫'));
        addLine('');
        addLine('【财帛宫主星详细解读】');
        if (wm.includes('紫微')) addLine('紫微入财帛：格局宏大，有大进大出之象，适合做大项目、大宗交易。紫微在财帛提示应往大处着眼，不适合小本经营。');
        if (wm.includes('武曲')) addLine('武曲入财帛：正财安稳，赚钱能力强且善于守财。武曲是财帛正星，主通过专业技能和实干赚取稳定收入。');
        if (wm.includes('天府')) addLine('天府入财帛：财库丰盈，理财稳健，适合靠资产增值和稳定收入积累财富。天府守财帛，不适合冒险投机。');
        if (wm.includes('太阴')) addLine('太阴入财帛：偏财有机会，适合投资理财、艺术收藏等领域。太阴化禄则财源广进，化忌则财务易有困扰。');
        if (wm.includes('贪狼')) addLine('贪狼入财帛：偏财运强，适合多元化收入。贪狼守财帛提示可发展副业，通过社交和人脉获取赚钱机会。但切忌投机过度。');
        if (wm.includes('破军')) addLine('破军入财帛：财运起伏较大，适合靠创新和变革赚钱。破军守财帛提示需敢于尝试新的赚钱模式。');
        if (wm.includes('巨门')) addLine('巨门入财帛：靠口才和专业技能赚钱，适合咨询、法律、教育等行业。巨门守财帛需主动展示专业能力才能获财。');
        if (wm.includes('天机')) addLine('天机入财帛：靠智慧和策划赚钱，思维灵活多变，适合多元化投资。但天机化忌时需注意投资判断失误。');
        if (wm.includes('太阳')) addLine('太阳入财帛：光明正大地赚钱，适合与公众打交道的工作。太阳庙旺则财源广进，落陷则需付出更多努力。');
        if (wm.includes('天同')) addLine('天同入财帛：福气生财，赚钱方式较为轻松，适合靠品味、兴趣变现。天同在财帛提示可做自己喜欢的事来赚钱。');
        if (wm.includes('天相')) addLine('天相入财帛：通过服务他人和协调资源来赚钱，适合中间人、服务类角色。');
        if (wm.includes('七杀')) addLine('七杀入财帛：靠拼劲和冒险精神赚钱，财富积累速度较快，但风险也高。七杀守财帛适合通过竞争和挑战获取财富。');
        if (wm.includes('廉贞')) addLine('廉贞入财帛：靠才华和社交赚钱，财富来源多样化。廉贞化禄则才华变现能力强，化忌则注意财务纠纷。');
      }
      addLine('');
      const hp = pMap['田宅宫'];
      if (hp) {
        const hm = hp.stars.filter(s => s.type === 'major').map(s => s.name);
        addLine('【田宅宫——不动产与积蓄】' + (hm.length > 0 ? hm.join('、') : '空宫'));
        if (hm.includes('天府')) addLine('天府守田宅：不动产运佳，置业能力强，适合长期持有房产。');
        if (hm.includes('太阴')) addLine('太阴守田宅：宜投资房产，特别是靠近水景或环境优美的不动产。');
        if (hm.includes('武曲')) addLine('武曲守田宅：通过努力工作积累房产，偏好在市中心或商圈附近置业。');
        if (hm.includes('紫微')) addLine('紫微守田宅：不动产格局大，宜购置高档物业。');
        if (hm.includes('贪狼')) addLine('贪狼守田宅：房产变动较多，可能因投资或改善需求频繁换房。');
      }
      addLine('');
      if (dx) {
        addLine('⏰ 【当前大限事业提示】');
        addLine('当前' + dx.palaceName + '大限（' + dx.startAge + '-' + dx.endAge + '岁），事业走势与此宫位主题密切相关。');
        const dp = pMap[dx.palaceName];
        if (dp) {
          const dms = dp.stars.filter(s => s.type === 'major').map(s => s.name);
          if (dms.length > 0) addLine('此大限宫位主星为' + dms.join('、') + '，事业上应把握此宫位所代表的机遇。');
        }
        addLine('');
      }
      addLine('【事业发展建议】');
      addLine('根据官禄宫星曜选择适合的行业方向，结合财帛宫的赚钱模式，制定长期职业规划。');
    }
    if (tk === '3') { // 财运
      addLine('══════════════ 财运深度分析 ══════════════', '');
      addLine('财运分析综合财帛宫、田宅宫与福德宫的资产格局，揭示最适合您的财富积累模式。');
      addLine('');
      const wp = pMap['财帛宫'];
      if (wp) {
        addLine('【财帛宫详解】—— 赚钱与财富模式');
        addLine(...starText(wp));
        addLine('');
        const ms = wp.stars.filter(s => s.type === 'major').map(s => s.name);
        addLine('【财帛宫主星深度解读】');
        if (ms.includes('紫微')) addLine('紫微入财帛：格局宏大，有大进大出之象，适合做大项目、大投资。紫微在财帛提示您天生有做大生意的格局，不适合小打小闹。但紫微也主花费大，需注意控制开支。');
        if (ms.includes('武曲')) addLine('武曲入财帛：正财安稳，是典型的务实赚钱模式。武曲为财星正位，通过专业技能、实干努力赚取稳定收入。武曲化禄则财运亨通，化权则财权在握。');
        if (ms.includes('天府')) addLine('天府入财帛：财库丰盈，是守财的典范。天府在财帛提示理财稳健，善于积累，不适合冒险投机。天府得禄存同宫则财库更加丰盈。');
        if (ms.includes('太阴')) addLine('太阴入财帛：偏财机会多，适合投资理财、艺术收藏、房产投资等领域。太阴化禄则财源不断，且多为被动收入；化忌则需注意财务上的牵绊与损失。');
        if (ms.includes('贪狼')) addLine('贪狼入财帛：偏财运极强，适合多元化收入模式。贪狼在财帛提示可以通过社交、人脉、副业获取额外收入。但贪狼化忌时需特别注意投机风险和过度消费。');
        if (ms.includes('破军')) addLine('破军入财帛：财运起伏较大，财富积累需要不断突破旧模式。破军在财帛提示适合靠创新、变革获取财富，不适合依靠固定工资。化禄则变动中得财。');
        if (ms.includes('巨门')) addLine('巨门入财帛：靠口才和专业知识赚钱，白手起家的典型配置。巨门在财帛适合咨询、法律、教育、媒体等语言相关行业。化禄则财运大好，化忌则易因口舌破财。');
        if (ms.includes('天机')) addLine('天机入财帛：靠智慧和灵活思维赚钱，适合策划、咨询、投资分析等脑力工作。天机在财帛赚钱门路多，但不适合长期死守一种方式。化禄则智谋变现。');
        if (ms.includes('太阳')) addLine('太阳入财帛：光明正大赚钱，靠服务和公众形象获取财富。太阳庙旺则财源广进，落陷则需加倍努力才能有同等回报。');
        if (ms.includes('天同')) addLine('天同入财帛：福气生财，赚钱较为轻松愉快。天同在财帛适合靠兴趣、品位、创意变现，如艺术、美食、休闲产业等。');
        if (ms.includes('天相')) addLine('天相入财帛：靠服务和协调能力赚钱，如中介、咨询、服务行业。天相在财帛需积累口碑和信誉方能财源广进。');
        if (ms.includes('七杀')) addLine('七杀入财帛：靠果断和冒险精神赚钱，适合创业、投资等领域。七杀在财帛赚钱速度快，但风险也高，需学会见好就收。');
        if (ms.includes('廉贞')) addLine('廉贞入财帛：靠才华和社交变现，财富来源多样化。廉贞化禄则才华横溢赚钱多，化忌则需注意财务纠纷和投资失误。');
        if (ms.includes('天梁')) addLine('天梁入财帛：财源稳定，且常有贵人相助。天梁在财帛提示财富可通过教育、医疗、慈善等福荫行业获得。化禄则福荫深厚。');
      }
      addLine('');
      addLine('【储蓄与不动产分析】');
      const hp = pMap['田宅宫'];
      if (hp) {
        const hm = hp.stars.filter(s => s.type === 'major').map(s => s.name);
        addLine('田宅宫（财库）：' + (hm.length > 0 ? hm.join('、') : '空宫'));
        addLine('');
        addLine('【田宅宫主星详细解读】');
        if (hm.includes('天府')) addLine('天府守田宅：财库扎实，不动产运极佳，置业能力强。天府在田宅是最理想的配置之一，代表房产积累稳固。');
        if (hm.includes('太阴')) addLine('太阴守田宅：宜投资房产，特别是注重环境的住宅。太阴在田宅适合通过房产长期增值获利。');
        if (hm.includes('武曲')) addLine('武曲守田宅：通过努力积累房产，偏好城市核心地段。武曲在田宅主先苦后甘，中年后房产运逐渐上升。');
        if (hm.includes('紫微')) addLine('紫微守田宅：不动产格局大，宜购置高档物业或大面积房产。');
        if (hm.includes('贪狼')) addLine('贪狼守田宅：房产变动较频繁，可能因投资或改善居住环境多次换房。贪狼化禄则房产投资得利。');
        if (hm.includes('天同')) addLine('天同守田宅：居住环境宜舒适优雅，在家居布置上有品味。天同在田宅主晚年居住条件好。');
        if (hm.includes('七杀') || hm.includes('破军')) addLine('七杀/破军守田宅：房产变动较多，可能经常搬家或更换住所。需注意由于事业变动影响居住稳定性。');
        if (hm.includes('巨门')) addLine('巨门守田宅：适合在靠近学校、文化区的地段置业。巨门在田宅需注意邻里关系。');
        const hasSha = hp.stars.some(s => SHA.includes(s.name));
        if (hasSha) addLine('⚠ 煞星入田宅宫：需注意房产交易中的纠纷，置业前务必做足功课。');
      }
      addLine('');
      addLine('【消费模式与理财习惯】');
      const fp = pMap['福德宫'];
      if (fp) {
        const fms = fp.stars.filter(s => s.type === 'major').map(s => s.name);
        if (fms.some(s => ['贪狼','廉贞'].includes(s))) addLine('您的消费观念偏向享乐型，需注意控制冲动消费，建议建立强制储蓄计划。');
        if (fms.some(s => ['紫微','天府'].includes(s))) addLine('您的消费观念比较大气，注重品质，但需注意收支平衡，避免过度铺张。');
        if (fms.some(s => ['武曲','天相'].includes(s))) addLine('您的消费观念比较理性务实，懂得精打细算，理财习惯良好。');
      }
      addLine('');
      if (dx) {
        addLine('⏰ 【当前大限财运提示】');
        addLine('当前' + dx.palaceName + '大限（' + dx.startAge + '-' + dx.endAge + '岁），财运走势与此宫位主题密切相关。');
        const dp = pMap[dx.palaceName];
        if (dp) {
          const dms = dp.stars.filter(s => s.type === 'major').map(s => s.name);
          if (dms.some(s => ['武曲','天府','太阴'].includes(s))) addLine('此大限财运较佳，适合积极理财和投资。');
          if (dms.some(s => ['破军','七杀'].includes(s))) addLine('此大限财运波动较大，宜稳健为主，避免冒进。');
          if (dms.some(s => ['天同','天梁'].includes(s))) addLine('此大限财运稳中有升，贵人助力明显。');
        }
        addLine('');
      }
      addLine('【财务建议】');
      addLine('合理规划收支，开源节流并举。善用您的财帛宫星曜特质选择最适合的赚钱模式，田宅宫则决定了您的不动产策略。');
    }
    if (tk === '4') { // 健康
      addLine('══════════════ 健康深度分析 ══════════════', '');
      addLine('健康运势由疾厄宫主星主导，结合各宫位星曜配置，全面解析体质特征、潜在风险与养生方向。');
      addLine('');
      const hp = pMap['疾厄宫'];
      if (hp) {
        addLine('【疾厄宫详解】—— 体质根基分析');
        addLine(...starText(hp));
        addLine('');
        const ms = hp.stars.filter(s => s.type === 'major').map(s => s.name);
        addLine('【疾厄宫主星深度解读】');
        if (ms.includes('紫微')) addLine('紫微入疾厄：体质总体较好，有较强的抵抗力。但需注意脾胃及消化系统问题，不宜暴饮暴食。紫微得煞星对照时需注意心血管问题。中年后应重视保养。');
        if (ms.includes('天机')) addLine('天机入疾厄：神经系统较为敏感，易有失眠、焦虑、神经衰弱等问题。天机化忌时思虑过度影响睡眠质量，需注意调节心态和作息。适合瑜伽、冥想等调息养生。');
        if (ms.includes('太阳')) addLine('太阳入疾厄：心脏和眼睛是需特别关注的部位。太阳庙旺则体质较好，落陷则需注意心血管健康。避免过度劳累，定期检查血压和视力。');
        if (ms.includes('武曲')) addLine('武曲入疾厄：呼吸系统和骨骼方面需要关注。武曲在疾厄提示适合通过运动增强体质，但需注意运动伤害，特别是关节和呼吸道问题。');
        if (ms.includes('天同')) addLine('天同入疾厄：福星护体，总体体质较好，恢复能力强。但天同也带享乐倾向，需注意饮食节制和适度运动，避免因贪吃导致代谢问题。');
        if (ms.includes('廉贞')) addLine('廉贞入疾厄：需注意心血系统、内分泌和免疫系统问题。廉贞化忌时情绪波动较大，易引发内分泌失调。应避免长期劳累，注意调节工作与生活的平衡。');
        if (ms.includes('天府')) addLine('天府入疾厄：体质稳定扎实，脾胃功能较好，但需注意饮食过量导致的消化负担。天府在疾厄提示宜养成规律的生活习惯。');
        if (ms.includes('太阴')) addLine('太阴入疾厄：肾脏和生殖系统需多加关注。太阴化忌时易有妇科或泌尿系统困扰。太阴在疾厄提示注重滋阴养肾，保证充足睡眠。');
        if (ms.includes('贪狼')) addLine('贪狼入疾厄：需注意肝火旺盛、代谢紊乱、脂肪肝等问题。贪狼化忌时需节制饮食，避免过度饮酒和熬夜。贪狼在疾厄提示应少吃刺激性食物。');
        if (ms.includes('巨门')) addLine('巨门入疾厄：消化系统较为敏感，易有肠胃炎、胃痛、消化不良等问题。巨门化忌时症状会更明显，饮食需定时定量，避免生冷刺激食物。');
        if (ms.includes('天相')) addLine('天相入疾厄：体质较为均衡，但需注意皮肤和消化系统问题。天相在疾厄提示注重饮食卫生和规律作息。');
        if (ms.includes('天梁')) addLine('天梁入疾厄：天梁为荫星，有化解病灾的能力，总体体质较好，即使生病也容易康复。但仍需注意肠胃消化问题。天梁在疾厄适合中医养生调理。');
        if (ms.includes('七杀')) addLine('七杀入疾厄：需特别注意意外伤害和筋骨损伤，避免高风险运动和过度疲劳。七杀在疾厄提示体质刚强但易积劳成疾，需学会劳逸结合。');
        if (ms.includes('破军')) addLine('破军入疾厄：身体易有突发性健康问题，且恢复过程较长。破军在疾厄提示需定期体检，尤其是中年后更应重视。避免过度消耗体能。');
        addLine('');
        addLine('【主要健康风险与注意事项】');
        const risks = [];
        if (ms.some(s => ['七杀','破军'].includes(s))) risks.push('注意意外伤害、筋骨损伤，避免高风险运动');
        if (ms.includes('廉贞')) risks.push('注意心血系统和内分泌问题，避免过度劳累');
        if (ms.includes('巨门')) risks.push('注意消化系统、肠胃问题，饮食务必规律');
        if (ms.includes('天机')) risks.push('注意神经系统和睡眠质量，避免思虑过度');
        if (ms.includes('贪狼')) risks.push('注意肝火和代谢问题，节制饮食和饮酒');
        if (ms.some(s => ['紫微','天府'].includes(s))) risks.push('脾胃需注意保养，不宜暴饮暴食');
        if (ms.some(s => ['天同','天梁'].includes(s))) risks.push('总体体质较好，但需注意饮食节制和适当运动');
        if (ms.includes('太阳')) risks.push('注意心血管和眼睛健康，避免过度用眼和劳累');
        if (ms.includes('武曲')) risks.push('注意呼吸系统和关节保养，运动前做好热身');
        if (ms.includes('太阴')) risks.push('注意肾脏和泌尿系统，保证充足睡眠');
        if (risks.length > 0) {
          risks.forEach(r => addLine('⚕ ' + r));
        }
        addLine('');
        const hasSha = hp.stars.some(s => SHA.includes(s.name));
        if (hasSha) {
          addLine('⚠ 【煞星影响】煞星入疾厄宫，需特别关注突发健康问题，强烈建议每年定期全面体检。');
          addLine('  擎羊入疾厄：易有外伤或急症；陀罗入疾厄：慢性病缠身需长期调理；');
          addLine('  火星入疾厄：易有发炎、发热问题；铃星入疾厄：注意隐性疾病。');
        }
      }
      addLine('');
      addLine('【命宫与健康的关系】');
      const mingM = pMap['命宫']?.stars.filter(s => s.type === 'major').map(s => s.name) || [];
      if (mingM.includes('天机')) addLine('命宫天机：思虑较多影响身心，宜规律运动释放压力。');
      if (mingM.includes('廉贞')) addLine('命宫廉贞：情绪对健康影响较大，保持心态平和很重要。');
      if (mingM.includes('贪狼')) addLine('命宫贪狼：需注意生活习惯，避免熬夜、应酬过多。');
      addLine('');
      if (dx) {
        addLine('⏰ 【当前大限健康提示】');
        addLine('当前' + dx.palaceName + '大限（' + dx.startAge + '-' + dx.endAge + '岁），宜特别关注此宫位对应的身体部位和健康领域。');
        addLine('');
      }
      addLine('【养生建议】');
      addLine('保持规律作息，均衡饮食，根据疾厄宫星曜的提示针对性地关注相关身体部位。定期体检，防患于未然。');
    }
    if (tk === '5') { // 性格
      addLine('══════════════ 性格深度分析 ══════════════', '');
      addLine('性格由命宫主星为核心，结合三方四正的星曜联动，共同塑造您的思维方式、行为模式和人际风格。');
      addLine('');
      const ming = pMap['命宫'];
      if (ming && summary.stars.length > 0) {
        addLine('✨ ' + summary.stars.join('、') + '坐命 · ' + summary.nature);
        addLine('');
        addLine('【命宫详解】—— 性格核心');
        addLine(...starText(ming));
        addLine('');
        const ms = ming.stars.filter(s => s.type === 'major').map(s => s.name);
        addLine('【主星性格深度解读】');
        if (ms.includes('紫微')) addLine('紫微坐命：格局宏大，天生有领导气质。自尊心强有主见，不甘人下，但有时显得高冷。紫微坐命之人宜培养谦逊和包容心，学会倾听他人意见。');
        if (ms.includes('天机')) addLine('天机坐命：聪明机敏，思维敏捷，善于策划分析。但天机坐命之人容易想太多，陷入过度分析，需培养行动力。天机化忌时更易思虑过度，影响决策效率。');
        if (ms.includes('太阳')) addLine('太阳坐命：性格光明磊落，热情大方，乐于助人。太阳坐命之人热心公益，但可能因过于热心而忽略自身需求。太阳庙旺则性格开朗，陷地则内心较孤独。');
        if (ms.includes('武曲')) addLine('武曲坐命：刚毅果决，执行力极强，但性格较硬，人际关系方面需注意柔化。武曲坐命之人适合做决断者，但需培养耐心和同理心。');
        if (ms.includes('天同')) addLine('天同坐命：温和善良，与世无争，性格随和讨人喜欢。天同坐命之人有艺术天赋，但可能过于安于现状，缺乏进取心。化禄化权则福气深厚。');
        if (ms.includes('廉贞')) addLine('廉贞坐命：才华横溢，聪明多情，做事有自己的原则和坚持。廉贞坐命之人情感丰富，在艺术创作方面有天赋。但需注意情绪管理和人际分寸。');
        if (ms.includes('天府')) addLine('天府坐命：稳重踏实，保守务实，做事有计划有条理。天府坐命之人善于理财和积累，适合做长远规划。但有时过于保守，缺乏冒险精神。');
        if (ms.includes('太阴')) addLine('太阴坐命：内敛温柔，心思细腻，审美品味高。太阴坐命之人适合设计、艺术、财务等需要细腻感知的工作。化权增贵气，化忌则易感情困扰。');
        if (ms.includes('贪狼')) addLine('贪狼坐命：多才多艺，社交能力极强，兴趣爱好广泛。贪狼坐命之人天生善于整合资源和人脉。但需注意专注度不够，避免因兴趣太广而分散精力。');
        if (ms.includes('巨门')) addLine('巨门坐命：口才出众，善于表达和辩论，适合从事需要表达的工作。巨门坐命之人分析能力强，但有时言语过于直率，需注意说话的分寸。化禄则口才变优势。');
        if (ms.includes('天相')) addLine('天相坐命：稳重可靠，协调能力强，是天然的辅助型人才。天相坐命之人注重仪表和形象，在人际关系中善于扮演桥梁角色。');
        if (ms.includes('天梁')) addLine('天梁坐命：成熟稳重，有长者风范，天生受长辈喜爱和庇护。天梁坐命之人有正义感，适合从事教育、医疗、慈善等福荫行业。化禄则福荫深厚。');
        if (ms.includes('七杀')) addLine('七杀坐命：果断刚强，敢作敢为，有将帅之风。七杀坐命之人在压力下反而更能发挥潜力。但性格刚硬，需学会柔化，注意人际关系中的冲突。');
        if (ms.includes('破军')) addLine('破军坐命：勇于变革，不拘一格，是天生的改革者。破军坐命之人一生多变动，在变化中成长。需注意稳定性的培养，学会在变动中沉淀。');
      } else {
        addLine('命宫为空宫，性格具有可塑性，易受环境和后天经历的影响。需借对宫迁移宫来看性格特质。');
      }
      addLine('');
      addLine('【三方四正影响——性格的多面性】');
      for (const n of ['官禄宫','财帛宫','迁移宫']) {
        const p = pMap[n];
        if (p) {
          const ms = p.stars.filter(s => s.type === 'major').map(s => s.name);
          addLine('  ' + n + '（' + (n === '官禄宫' ? '事业发展风格' : n === '财帛宫' ? '金钱价值观' : '外在表现与机遇') + '）：' + (ms.length > 0 ? ms.join('、') : '空宫'));
        }
      }
      addLine('');
      addLine('【人际关系模式分析】');
      for (const n of ['交友宫','兄弟宫','子女宫']) {
        const p = pMap[n];
        if (p) {
          const ms = p.stars.filter(s => s.type === 'major').map(s => s.name);
          addLine('  ' + n + '：' + (ms.length > 0 ? ms.join('、') : '空宫'));
        }
      }
      addLine('');
      addLine('【性格天赋与发展方向】');
      const good = patterns.filter(p => ['good','excellent'].includes(p.level));
      const bad = patterns.filter(p => p.level === 'caution');
      if (good.length > 0) {
        addLine('✓ 性格优势格局：');
        for (const p of good.slice(0, 5)) addLine('  ・' + p.name);
      }
      if (bad.length > 0) {
        addLine('⚠ 需注意的性格倾向：');
        for (const p of bad.slice(0, 3)) addLine('  ・' + p.name);
      }
      addLine('');
      if (dx) {
        addLine('⏰ 【当前大限对性格的影响】');
        addLine('当前' + dx.palaceName + '大限（' + dx.startAge + '-' + dx.endAge + '岁），此阶段的人生经历将塑造和改变您的某些性格特质。');
        addLine('');
      }
      addLine('【性格成长建议】');
      addLine('了解自己的性格特质和惯性模式，发挥天赋优势，有意识地调整不足。命格没有绝对的好坏，关键在于如何运用自己的特质应对人生挑战。');
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


