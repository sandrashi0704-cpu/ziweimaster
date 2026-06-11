import { detectPatterns, getMingGongSummary } from '@/lib/ziwei/patterns';
import type { ZiweiChart } from '@/lib/ziwei/types';

export const runtime = 'nodejs';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const starDescriptions: Record<string, string> = JSON.parse('{"紫微":"北斗帝星，主尊贵权威。入命则格局宏大，有领导气质，自尊心强，不甘人下。喜得左辅右弼、天魁天钺夹辅，则贵气更显。","天机":"南斗益算星，主智慧谋略。思维敏捷，善策划分析，口才佳。最喜化禄化权，主智谋得用；化忌则易思虑过度、心神不宁。","太阳":"官禄星，主光明磊落。性情豪爽大方，热心助人。寅卯辰巳宫为旺，酉戌亥子宫为陷。化权增贵气，化忌主劳心劳力。","武曲":"财帛星，主刚毅果决。性格刚强，有执行力，适合军警、金融、技术等行业。化禄增财，化权增权威，化忌主财务纠纷。","天同":"福星，主温和善良。性格平和，知足常乐，有艺术天赋。喜化禄化权，主福气深厚；化忌则福气打折。","廉贞":"次桃花星，主才华横溢。聪明多才，感情丰富，有艺术品味。化禄增财，化忌主感情困扰或官非。","天府":"财库星，主稳重保守。有领导才能，理财有道，善于守成。喜得禄存同宫，主财库丰盈。","太阴":"财富星，主温柔细腻。性格内敛，有审美才华，适合艺术、设计、财务等行业。化权增贵，化忌主感情困扰。","贪狼":"正桃花星，主多才多艺。社交能力强，有艺术天赋，欲望较强。化禄增桃花财运，化忌主欲望失控。","巨门":"是非星，主口才出众。善于分析思考，适合研究、咨询、法律等行业。化禄增口才，化忌主口舌是非。","天相":"印绶星，主协调辅助。性格稳重可靠，适合行政、管理、服务等行业。喜得化权增贵，化忌易被人牵制。","天梁":"荫星，主庇护长辈。性格成熟稳重，有责任感，适合医疗、教育、慈善等行业。化禄增福荫，化忌主健康困扰。","七杀":"将星，主果断坚决。性格刚强，敢闯敢拼，适合军警、创业等行业。喜得化权增权威，化忌主孤克。","破军":"变动星，主破旧立新。性格叛逆，勇于改变，适合创新、改革等领域。化禄增变动财，化忌主动荡不安。"}');

const palaceMeanings: Record<string, string> = JSON.parse('{"命宫":"代表一个人的先天性格、气质、格局与人生走向","兄弟宫":"代表手足关系、合作运、同辈助力","夫妻宫":"代表感情观念、婚姻状态、配偶特质","子女宫":"代表子女缘分、桃花后续、创作才华","财帛宫":"代表赚钱模式、财富观念、消费习惯","疾厄宫":"代表先天体质、健康弱项、容易生病的部位","迁移宫":"代表外出运、发展空间、人际关系广度","交友宫":"代表社交圈子、朋友质量、下属关系","官禄宫":"代表事业方向、职场表现、社会地位","田宅宫":"代表不动产运、家庭环境、积蓄能力","福德宫":"代表精神世界、内心福气、晚年运势","父母宫":"代表父母缘分、遗传特质、与长辈的关系"}');

function getStarInterpretation(starName: string): string {
  return starDescriptions[starName] || `${starName}，需结合宫位和亮度综合判断。`;
}

function getBrightnessMeaning(brightness: string): string {
  const map: Record<string, string> = JSON.parse('{"旺":"星曜力量最强，正面特质充分发挥","庙":"星曜力量强，吉利程度高","平":"星曜力量中等，需结合其他星曜判断","陷":"星曜力量较弱，正面特质难以发挥","利":"星曜力量较好，能发挥一定正面作用"}');
  return map[brightness] || '';
}

function analyzeStarCombination(stars: string[]): string {
  const combos: Record<string, string> = JSON.parse('{"紫微,天府":"紫府同宫格，帝王与财库相会，格局极高。主大贵大富，有领导才能且善于理财。","紫微,破军":"紫破同宫，变革与创新格局。有开创精神，但过程多有起伏。宜军警、创业等动态行业。","紫微,七杀":"紫杀同宫，威权格局。刚毅果决，有将帅之风，但孤性较强。","武曲,七杀":"武杀同宫，刚强格局。执行力极强，适合军警、技术行业，但人际关系较硬。","武曲,破军":"武破同宫，变动求财格局。财运起伏大，靠创新和冒险赚钱。","廉贞,七杀":"廉杀同宫，刑杖格局。刚强果断但易惹是非，宜法律、军警行业。","廉贞,破军":"廉破同宫，动荡格局。一生多变动，感情和事业起伏较大。","天机,天梁":"机月同梁格局，善策划有谋略。适合教育、研究、咨询等行业。","太阳,太阴":"日月同宫或对照，光明格局。性格外柔内刚，适合公众事业。","贪狼,廉贞":"贪廉会照，桃花与才华交织。艺术天赋强，但感情较为复杂。"}');
  const key = [...stars].sort().join(',');
  return combos[key] || '';
}

function analyzeMainPalace(chart: ZiweiChart) {
  const ming = chart.palaces.find(p => p.branch === chart.mingGongBranch);
  if (!ming) return [];
  const majors = ming.stars.filter(s => s.type === 'major');
  const minors = ming.stars.filter(s => s.type === 'minor');
  const result: string[] = [];
  
  if (majors.length === 0) {
    result.push('命宫为空宫，需借对宫（迁移宫）星曜来看。性格易受环境影响，人生方向需后天探索。');
  } else {
    for (const s of majors) {
      let text = `${s.name}：${getStarInterpretation(s.name)}`;
      if (s.brightness) {
        text += `（${s.brightness}：${getBrightnessMeaning(s.brightness)}）`;
      }
      if (s.mutagen) {
        const muMap: Record<string, string> = JSON.parse('{"化禄":"增加财运与好运","化权":"增加权威与掌控力","化科":"增加名声与贵人运","化忌":"带来困扰与考验"}');
        text += ` 且${s.mutagen}——${muMap[s.mutagen] || ''}`;
      }
      result.push(text);
    }
    
    // 星曜组合分析
    const majorNames = majors.map(s => s.name);
    const combo = analyzeStarCombination(majorNames);
    if (combo) {
      result.push(`格局：${combo}`);
    }
    
    // 桃花星判断
    const peachStars = ['贪狼', '廉贞', '太阴'];
    const hasPeach = majorNames.some(n => peachStars.includes(n));
    if (hasPeach) result.push('命宫带桃花星，异性缘佳，有艺术审美方面的天赋。');
  }
  
  // 辅星分析
  if (minors.length > 0) {
    const joyStars = ['左辅', '右弼', '天魁', '天钺', '禄存', '文昌', '文曲', '天马'];
    const shaStars = ['擎羊', '陀罗', '火星', '铃星', '地空', '地劫'];
    const joys = minors.filter(s => joyStars.includes(s.name));
    const shas = minors.filter(s => shaStars.includes(s.name));
    if (joys.length > 0) result.push(`吉辅：${joys.map(s => s.name).join('、')}入命，增强贵气和机遇。`);
    if (shas.length > 0) result.push(`煞星：${shas.map(s => s.name).join('、')}入命，需注意其带来的挑战和磨练。`);
  }
  
  return result;
}

function analyzeLove(chart: ZiweiChart) {
  const palace = chart.palaces.find(p => p.name === '夫妻宫');
  if (!palace) return ['暂无法获取夫妻宫信息。'];
  const majors = palace.stars.filter(s => s.type === 'major');
  const minors = palace.stars.filter(s => s.type === 'minor');
  const result: string[] = [];
  
  if (majors.length === 0) {
    result.push('夫妻宫为空宫，需借对宫（官禄宫）来看感情。配偶特质与事业有关，或通过工作认识对象。');
  } else {
    for (const s of majors) {
      result.push(`${s.name}坐夫妻宫：${getStarInterpretation(s.name)}`);
    }
    const majorNames = majors.map(s => s.name);
    if (majorNames.includes('紫微')) result.push('配偶有领导才能，社会地位较高。');
    if (majorNames.includes('天同')) result.push('配偶性格温和善良，婚姻生活和谐。');
    if (majorNames.includes('太阴')) result.push('配偶温柔细腻，注重感情质量。');
    if (majorNames.includes('贪狼')) result.push('感情丰富，桃花运旺，需注意感情专一度。');
    if (majorNames.includes('七杀')) result.push('感情积极直接，但需注意沟通方式。');
    if (majorNames.includes('破军')) result.push('感情变动较多，宜晚婚。');
  }
  
  // 桃花星
  const peach = ['红鸾', '天喜', '咸池'];
  const hasPeach = minors.some(s => peach.includes(s.name));
  if (hasPeach) result.push('桃花星入夫妻宫，异性缘好，容易遇到感情机会。');
  
  // 煞星
  const sha = ['擎羊', '陀罗', '火星', '铃星'];
  const hasSha = minors.some(s => sha.includes(s.name));
  if (hasSha) result.push('煞星入夫妻宫，感情中需多注意沟通，避免因小事争执。');
  
  // 迁移宫暗示
  const mig = chart.palaces.find(p => p.name === '迁移宫');
  if (mig && mig.stars.some(s => s.name === '天马')) result.push('天马在迁移宫，可能遇到异地姻缘或与旅行、外地有关的情感经历。');
  
  return result;
}

function analyzeCareer(chart: ZiweiChart) {
  const palace = chart.palaces.find(p => p.name === '官禄宫');
  if (!palace) return ['暂无法获取官禄宫信息。'];
  const majors = palace.stars.filter(s => s.type === 'major');
  const result: string[] = [];
  
  if (majors.length === 0) {
    result.push('官禄宫为空宫，需借对宫（夫妻宫）来看事业。事业方向与伴侣或合作伙伴相关。');
  } else {
    for (const s of majors) {
      result.push(`${s.name}坐官禄宫：${getStarInterpretation(s.name)}`);
    }
    const names = majors.map(s => s.name);
    const suitable: string[] = [];
    if (names.includes('紫微') || names.includes('天府')) suitable.push('管理、领导岗位、政府部门');
    if (names.includes('天机') || names.includes('天梁')) suitable.push('教育、研究、咨询、医疗');
    if (names.includes('太阳') || names.includes('天相')) suitable.push('公共服务、行政、媒体');
    if (names.includes('武曲') || names.includes('七杀')) suitable.push('军警、技术、工程、金融');
    if (names.includes('贪狼') || names.includes('廉贞')) suitable.push('艺术、娱乐、创意、社交行业');
    if (names.includes('太阴') || names.includes('天同')) suitable.push('设计、财务、文化艺术');
    if (names.includes('破军')) suitable.push('创业、变革性行业、技术创新');
    if (suitable.length > 0) result.push(`适合行业方向：${suitable.join('、')}。`);
    
    if (names.includes('天府')) result.push('天府为财库星入官禄，适合稳定型管理岗位，宜在大机构发展。');
    if (names.includes('七杀') || names.includes('破军')) result.push('变动星入官禄，事业多变动，适合动态型、有挑战性的工作。');
  }
  
  // 财帛宫联动
  const wealth = chart.palaces.find(p => p.name === '财帛宫');
  if (wealth) {
    const wMajors = wealth.stars.filter(s => s.type === 'major').map(s => s.name);
    if (wMajors.length > 0) {
      result.push(`财帛宫${wMajors.join('、')}，赚钱方式与这些星曜的特质相关。`);
    }
  }
  
  return result;
}

function analyzeWealth(chart: ZiweiChart) {
  const palace = chart.palaces.find(p => p.name === '财帛宫');
  if (!palace) return ['暂无法获取财帛宫信息。'];
  const majors = palace.stars.filter(s => s.type === 'major');
  const result: string[] = [];
  
  if (majors.length === 0) {
    result.push('财帛宫为空宫，需借对宫（福德宫）来看财运。财运与精神追求、兴趣爱好相关。');
  } else {
    for (const s of majors) {
      result.push(`${s.name}坐财帛宫：${getStarInterpretation(s.name)}`);
      if (s.mutagen === '化禄') result.push(`${s.name}化禄在财帛宫，财运亨通，赚钱机会多。`);
      if (s.mutagen === '化忌') result.push(`${s.name}化忌在财帛宫，需注意财务纠纷和投资风险。`);
    }
    const names = majors.map(s => s.name);
    if (names.includes('武曲')) result.push('武曲为财帛正星，财运稳定，有理财天赋。');
    if (names.includes('天府') || names.includes('太阴')) result.push('财库星入财帛，善于积蓄和理财。');
    if (names.includes('贪狼')) result.push('贪狼入财帛，偏财运强，适合投资和多元化收入。');
    if (names.includes('破军')) result.push('破军入财帛，财运起伏大，适合靠创新和变革赚钱。');
  }
  
  return result;
}

function analyzeHealth(chart: ZiweiChart) {
  const palace = chart.palaces.find(p => p.name === '疾厄宫');
  if (!palace) return ['暂无法获取疾厄宫信息。'];
  const majors = palace.stars.filter(s => s.type === 'major');
  const result: string[] = [];
  
  if (majors.length === 0) {
    result.push('疾厄宫为空宫，总体体质较好，但仍需注意日常保健。');
  } else {
    for (const s of majors) {
      result.push(`${s.name}坐疾厄宫：${getStarInterpretation(s.name)}`);
    }
    const names = majors.map(s => s.name);
    if (names.includes('七杀')) result.push('注意意外伤害、筋骨损伤，避免高风险运动。');
    if (names.includes('廉贞')) result.push('注意心血系统和内分泌问题，避免过度劳累。');
    if (names.includes('巨门')) result.push('注意消化系统、肠胃问题，饮食宜规律。');
    if (names.includes('天机')) result.push('注意神经系统和睡眠质量，避免思虑过度。');
    if (names.includes('贪狼')) result.push('注意肝火和代谢问题，少吃刺激性食物。');
    if (names.includes('紫微') || names.includes('天府')) result.push('脾胃需注意，不宜暴饮暴食。');
    if (names.includes('天同') || names.includes('天梁')) result.push('总体体质较好，有福星庇佑，但要注意饮食节制。');
  }
  
  // 检查煞星
  const shaStars = ['擎羊', '陀罗', '火星', '铃星'];
  const hasSha = palace.stars.some(s => shaStars.includes(s.name));
  if (hasSha) result.push('煞星入疾厄宫，需注意突发的健康问题，定期体检很有必要。');
  
  return result;
}

function analyzePersonality(chart: ZiweiChart) {
  const ming = chart.palaces.find(p => p.branch === chart.mingGongBranch);
  if (!ming) return [];
  const result: string[] = [];
  const majors = ming.stars.filter(s => s.type === 'major');
  
  // 三方四正补充
  const sanFang = ['官禄宫', '财帛宫', '迁移宫'].map(name => chart.palaces.find(p => p.name === name)).filter(Boolean);
  
  if (majors.length > 0) {
    for (const s of majors) {
      result.push(`${s.name}坐命：${getStarInterpretation(s.name)}`);
    }
  } else {
    result.push('命宫为空宫，性格具有可塑性，易受环境和教育影响。');
    const mig = chart.palaces.find(p => p.name === '迁移宫');
    if (mig) {
      const migM = mig.stars.filter(s => s.type === 'major');
      if (migM.length > 0) result.push(`需参考迁移宫${migM.map(s => s.name).join('、')}来综合判断性格。`);
    }
  }
  
  // 身宫位置
  const shen = chart.palaces.find(p => p.isBodyPalace);
  if (shen) {
    result.push(`身宫在${shen.name}，人生重心在${palaceMeanings[shen.name] || shen.name}。`);
  }
  
  // 人际关系
  const friends = chart.palaces.find(p => p.name === '交友宫');
  if (friends) {
    const fMajors = friends.stars.filter(s => s.type === 'major');
    if (fMajors.length > 0) result.push(`交友宫${fMajors.map(s => s.name).join('、')}，朋友特质与这些星曜相关，善用社交圈可获助力。`);
  }
  
  return result;
}

function getTopicInterpretation(chart: ZiweiChart, topicKey: string): string {
  const age = new Date().getFullYear() - parseInt(chart.birthYear || '1995');
  const currentDx = chart.palaces.find(p => p.decadal && age >= p.decadal.range[0] && age <= p.decadal.range[1]);
  const patterns = detectPatterns(chart);
  const summary = getMingGongSummary(chart);
  const lines: string[] = [];

  if (topicKey === 'overview') {
    lines.push('【命格定位】');
    if (summary.stars.length > 0) lines.push(`${summary.stars.join('、')}坐命，${summary.nature}。${summary.keywords.join('、')}。`);
    lines.push('');
    lines.push('【命宫详解】');
    lines.push(...analyzeMainPalace(chart));
    lines.push('');
    lines.push('【格局分析】');
    const good = patterns.filter(p => p.level === 'good' || p.level === 'excellent').slice(0, 4);
    const bad = patterns.filter(p => p.level === 'caution').slice(0, 2);
    if (good.length > 0) lines.push(...good.map(p => `吉格：${p.name}——${p.description.slice(0, 60)}`));
    if (bad.length > 0) lines.push(...bad.map(p => `凶格：${p.name}——${p.description.slice(0, 60)}`));
    if (good.length === 0 && bad.length === 0) lines.push('基础格局，无明显特殊格局。');
    lines.push('');
    lines.push('【当前大限】');
    if (currentDx) {
      const dxStars = currentDx.stars.filter(s => s.type === 'major');
      lines.push(`当前处于${currentDx.name}大限（${currentDx.decadal!.range[0]}-${currentDx.decadal!.range[1]}岁）。`);
      if (dxStars.length > 0) lines.push(`${currentDx.name}主星为${dxStars.map(s => s.name).join('、')}，${currentDx.name}相关议题是这十年的重点。`);
      const dxSihua = currentDx.stars.filter(s => s.mutagen);
      if (dxSihua.length > 0) lines.push(`${currentDx.name}有四化星（${dxSihua.map(s => `${s.name}${s.mutagen}`).join('、')}），增强该宫位的力量。`);
    } else {
      lines.push(`当前${age}岁，不在大限范围内。`);
    }
    lines.push('');
    lines.push('【综合建议】');
    lines.push('命盘格局仅供参考，人生方向掌握在自己手中。发挥优势星曜的力量，注意煞星和化忌带来的磨练，顺势而为。');
  }

  if (topicKey === 'love') {
    lines.push('【感情格局】');
    lines.push(...analyzeLove(chart));
    lines.push('');
    lines.push('【当前大限感情运】');
    if (currentDx) {
      lines.push(`当前${currentDx.name}大限（${currentDx.decadal!.range[0]}-${currentDx.decadal!.range[1]}岁），感情走势与${currentDx.name}宫位主题相关。`);
    } else {
      lines.push(`当前${age}岁。`);
    }
    lines.push('');
    lines.push('【建议】');
    lines.push('感情需要双方用心经营。了解自己夫妻宫的特质，选择适合的伴侣类型，多沟通、多包容。');
  }

  if (topicKey === 'career') {
    lines.push('【事业格局】');
    lines.push(...analyzeCareer(chart));
    lines.push('');
    lines.push('【当前大限事业运】');
    if (currentDx) {
      lines.push(`当前${currentDx.name}大限（${currentDx.decadal!.range[0]}-${currentDx.decadal!.range[1]}岁），事业方向与${currentDx.name}宫位主题密切相关。这十年宜围绕${currentDx.name}代表的领域展开。`);
    }
    lines.push('');
    lines.push('【建议】');
    lines.push('选择适合自己官禄宫星曜特质的行业，结合当前大限方向，稳中求进。');
  }

  if (topicKey === 'wealth') {
    lines.push('【财运格局】');
    lines.push(...analyzeWealth(chart));
    lines.push('');
    lines.push('【田宅宫财库】');
    const home = chart.palaces.find(p => p.name === '田宅宫');
    if (home) {
      const hMajors = home.stars.filter(s => s.type === 'major');
      lines.push(`田宅宫${hMajors.length > 0 ? hMajors.map(s => s.name).join('、') : '空宫'}，${hMajors.length > 0 ? '不动产和积蓄能力与这些星曜相关。' : '需借对宫（子女宫）来看不动产运。'}`);
    }
    lines.push('');
    lines.push('【当前大限财运】');
    if (currentDx) {
      const w = chart.palaces.find(p => p.name === '财帛宫');
      const isWealthDx = currentDx.name === '财帛宫';
      lines.push(`当前${currentDx.name}大限（${currentDx.decadal!.range[0]}-${currentDx.decadal!.range[1]}岁）。${isWealthDx ? '财帛宫大限，是财运高峰期，宜积极把握。' : '非财帛宫大限，财运相对平稳，以稳为主。'}`);
    }
    lines.push('');
    lines.push('【建议】');
    lines.push('合理规划收支，避免冲动投资。财帛宫星曜特质决定了最适合你的赚钱方式。');
  }

  if (topicKey === 'health') {
    lines.push('【健康分析】');
    lines.push(...analyzeHealth(chart));
    lines.push('');
    lines.push('【当前大限健康走势】');
    if (currentDx) {
      const h = chart.palaces.find(p => p.name === '疾厄宫');
      const isHealthDx = currentDx.name === '疾厄宫';
      lines.push(`当前${currentDx.name}大限（${currentDx.decadal!.range[0]}-${currentDx.decadal!.range[1]}岁）。${isHealthDx ? '疾厄宫大限期间，需特别注意身体健康。' : '非疾厄宫大限，健康总体平稳。'}`);
    }
    lines.push('');
    lines.push('【预防建议】');
    lines.push('保持规律作息，均衡饮食，定期体检。了解疾厄宫星曜提示的健康风险点，提前预防。');
  }

  if (topicKey === 'personality') {
    lines.push('【性格分析】');
    lines.push(...analyzePersonality(chart));
    lines.push('');
    lines.push('【三方四正影响】');
    for (const name of ['官禄宫', '财帛宫', '迁移宫']) {
      const p = chart.palaces.find(pp => pp.name === name);
      if (p) {
        const s = p.stars.filter(ss => ss.type === 'major').map(ss => ss.name);
        lines.push(`${name}：${s.length > 0 ? s.join('、') : '空宫'}——${palaceMeanings[name] || ''}`);
      }
    }
    lines.push('');
    lines.push('【优势与人生课题】');
    if (summary.stars.length > 0) {
      for (const s of summary.stars) {
        lines.push(`- ${s}：${getStarInterpretation(s).slice(0, 40)}`);
      }
    }
    lines.push('');
    lines.push('了解自己的性格特质和惯性模式，发挥天赋优势，有意识地调整不足。');
  }

  return lines.join('\n');
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { chart, messages }: { chart: ZiweiChart; messages: Message[] } = body;

    if (!chart || !messages) {
      return new Response(JSON.stringify({ error: 'Missing chart or messages' }), { status: 400 });
    }

    const userMsg = [...messages].reverse().find(m => m.role === 'user');
    const content = userMsg?.content || '';
    const topicMatch = content.match(/(命格|感情|事业|财运|健康|性格)/);
    const topicMap: Record<string, string> = JSON.parse('{"命格":"overview","感情":"love","事业":"career","财运":"wealth","健康":"health","性格":"personality"}');
    const topicKey = topicMatch ? (topicMap[topicMatch[1]] || 'overview') : 'overview';

    const interpretation = getTopicInterpretation(chart, topicKey);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const lines = interpretation.split('\n');
        for (const line of lines) {
          const data = JSON.stringify({ delta: { text: line + '\n' } });
          controller.enqueue(encoder.encode('data: ' + data + '\n\n'));
          await new Promise(resolve => setTimeout(resolve, 15));
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('API error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}
