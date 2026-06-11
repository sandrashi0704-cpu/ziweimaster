---
name: ziwei-doushu
description: 紫微斗数命盘排盘与解读 - 输入生辰即可获得完整的紫微斗数命盘排盘、十二宫解读、四化分析、大限流年运势、事业财运感情全方位剖析
---

# 紫微斗数 · 命盘排盘与解读

> **版本**：v1.0 | **体系**：传统三合派紫微斗数

本 Skill 使用 `iztro` 紫微斗数开源库进行精确排盘，包含完整排盘算法、四化系统、格局分析。

---

## 输入格式

只需用户提供以下信息即可排盘：

```
性别：男/女
出生日期：1995年7月4日（公历/农历均可）
出生时辰：凌晨3点（如不知具体时辰可让用户描述：凌晨/早/上午/中午/下午/傍晚/夜晚）
出生地点：内蒙古呼和浩特（城市即可）
现居地点：湖北省武汉市（可选，用于迁移宫分析）
```

> 如果用户不确定时辰，可以按以下口诀帮用户反推：
> - 子时 23:00-00:59 | 丑时 01:00-02:59 | 寅时 03:00-04:59
> - 卯时 05:00-06:59 | 辰时 07:00-08:59 | 巳时 09:00-10:59
> - 午时 11:00-12:59 | 未时 13:00-14:59 | 申时 15:00-16:59
> - 酉时 17:00-18:59 | 戌时 19:00-20:59 | 亥时 21:00-22:59

---

## 排盘步骤

### Step 1: 安装依赖

确保 `iztro` 和 `lunar-javascript` 库可用：

```bash
npm install iztro lunar-javascript
```

### Step 2: 执行排盘

使用以下 JavaScript 代码进行排盘（通过 Node.js REPL 执行）：

```javascript
import { astro } from 'iztro';
import { Solar } from 'lunar-javascript';

// ===== 用户输入 =====
const birthYear = 1995;
const birthMonth = 7;
const birthDay = 4;
const birthHour = 3;
const gender = '女';
const userName = '用户';
// ====================

// 1. 排盘
const astrolabe = astro.bySolar(
  `${birthYear}-${birthMonth}-${birthDay}`,
  birthHour,
  gender === '男' ? 'male' : 'female',
  true,
  'zh-CN'
);

// 2. 农历信息
const solar = Solar.fromYmd(birthYear, birthMonth, birthDay);
const lunar = solar.getLunar();

// 3. 命盘基本信息
const basicInfo = {
  姓名: userName,
  性别: gender,
  公历: `${birthYear}年${birthMonth}月${birthDay}日`,
  农历: `${lunar.getYearInChinese()}年${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}日`,
  生肖: lunar.getYearShengXiao(),
  年柱: `${lunar.getYearGan()}${lunar.getYearZhi()}`,
  月柱: `${lunar.getMonthGan()}${lunar.getMonthZhi()}`,
  日柱: `${lunar.getDayGan()}${lunar.getDayZhi()}`,
  时柱: (() => {
    const zhi = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'][birthHour > 23 ? 0 : Math.floor(birthHour / 2) % 12];
    const gan = lunar.getTimeGan(zhi);
    return gan + zhi;
  })(),
  五行局: astrolabe.fiveElementsClass,
  命宫地支: astrolabe.earthlyBranchOfSoulPalace,
  身宫地支: astrolabe.earthlyBranchOfBodyPalace,
};
```

### Step 3: 获取十二宫详情

```javascript
const palaces = astrolabe.palaces.map(p => ({
  宫名: p.name,
  地支: p.earthlyBranch,
  天干: p.heavenlyStem,
  主星: (p.majorStars || []).map(s => ({
    星名: s.name,
    亮度: s.brightness,
    四化: s.mutagen || null,
  })),
  辅星: (p.minorStars || []).map(s => s.name),
  杂曜: (p.adjectiveStars || []).map(s => s.name),
  身宫: p.isBodyPalace || false,
  大限: p.decadal ? `${p.decadal.range[0]}-${p.decadal.range[1]}岁` : null,
}));
```

### Step 4: 分析四化

```javascript
const sihua = [];
for (const p of astrolabe.palaces) {
  for (const s of p.majorStars || []) {
    if (s.mutagen) {
      sihua.push({ 星曜: s.name, 四化: s.mutagen, 宫位: p.name, 亮度: s.brightness });
    }
  }
}
```

### Step 5: 计算当前大限

```javascript
const currentAge = new Date().getFullYear() - birthYear;
let currentDaXian = null;
let nextDaXian = null;
for (const p of astrolabe.palaces) {
  if (p.decadal && currentAge >= p.decadal.range[0] && currentAge <= p.decadal.range[1]) {
    currentDaXian = { 宫位: p.name, 年龄: `${p.decadal.range[0]}-${p.decadal.range[1]}` };
  }
  if (p.decadal && p.decadal.range[0] > currentAge && !nextDaXian) {
    nextDaXian = { 宫位: p.name, 年龄: `${p.decadal.range[0]}-${p.decadal.range[1]}` };
  }
}
```

---

## 命盘解读框架

拿到命盘数据后，按以下维度进行解读：

### 命格总论
- 命宫主星 + 辅星 - 性格特质
- 身宫位置 - 人生重心
- 五行局 - 先天禀赋
- 特殊格局（紫府同宫、杀破狼、机月同梁等）

### 事业分析
- 官禄宫主星 + 辅星 - 适合行业和工作性质
- 迁移宫 - 异地发展
- 当前大限宫位 - 当前10年事业主题
- 流年官禄 - 具体求职机会月份

### 财运分析
- 财帛宫主星 + 辅星 - 财源性质和风险偏好
- 命宫个性 - 是否适合短线
- 当前大限 + 下一大限 - 入场时机
- 流年财帛 + 流年四化 - 最佳入场年份

### 感情婚姻分析
- 夫妻宫主星 - 配偶特质
- 夫妻宫辅星 - 感情细节
- 夫妻宫四化 - 感情重点
- 命宫桃花星（红鸾、天喜、咸池）- 桃花类型
- 福德宫 - 对感情的精神需求

### 健康分析
- 疾厄宫主星 - 先天体质倾向
- 疾厄宫辅星 - 需要注意的方面

---

## 输出格式

命盘解读按以下格式输出给用户：

```
╔══════════════════════════════════════╗
║       紫微斗数命盘深度解读           ║
║     姓名：XXX                        ║
║     八字：乙亥 庚午 丙申 庚寅        ║
║     五行局：金四局                   ║
╚══════════════════════════════════════╝

📋 基本资料
  公历：1995年7月4日
  农历：一九九五年六月初七日（猪）
  命宫：寅（天干甲）
  身宫：戌（天干壬）

🗺 十二宫排盘
  [以表格或ASCII图展示]

🏷 四化分布
  天机化禄（子女） 天梁化权（田宅）
  紫微化科（夫妻） 太阴化忌（兄弟）

🔮 命盘重点解读
  [3-5条核心发现]

📊 [场景专题分析]
  [根据用户需求深入分析]

💡 建议总结
  [2-3条可行建议]
```

---

## 注意事项

1. **解读仅供参考**，不作为决策依据
2. **保护隐私**：不要要求用户提供真实姓名，仅需生辰和性别
3. **不确定时辰**：先按午时12点排盘，提示"时辰未确认，可能影响准确度"
4. **语气保持积极正面**：指出优势和发展方向
5. **合理收费定位**：基础排盘免费，专题深度解读可收费

---

## 数据来源

本项目使用了 **紫微斗数开源样本数据集 v3.0**（518,400 条）

来源：https://github.com/Renhuai123/ziwei-doushu

作者：王多鱼AI
