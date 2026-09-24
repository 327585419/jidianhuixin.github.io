#!/usr/bin/env node
/**
 * GEO（生成式引擎优化）就绪度自检
 *   node build/geo-audit.mjs [站点根URL]
 *
 * 检查 AI 能否抓到你、抓到后会不会答错。这不是"保证被AI推荐"的魔法，
 * 而是排查下限问题：抓不到 / 抓错 / 无事实可引。
 */
import fs from 'node:fs';
import path from 'node:path';

const SITE_DIR = '/home/jdhx/四川积电汇芯网站';
const BASE = process.argv[2] || 'https://327585419.github.io/jidianhuixin.github.io';
const U = (p) => `${BASE}${p}`;

let pass = 0, warn = 0, fail = 0;
const ok = (m, d = '') => { console.log(`  ✅ ${m}${d ? '  ' + d : ''}`); pass++; };
const wn = (m, d = '') => { console.log(`  ⚠️  ${m}${d ? '  ' + d : ''}`); warn++; };
const no = (m, d = '') => { console.log(`  ❌ ${m}${d ? '  ' + d : ''}`); fail++; };

const get = async (url, asText = true) => {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(12000) });
    return { status: r.status, body: asText ? await r.text() : null, headers: r.headers };
  } catch (e) { return { status: 0, body: '', error: e.message }; }
};

console.log('='.repeat(56));
console.log(' GEO 就绪度自检 ——', BASE);
console.log('='.repeat(56));

// 1. AI 专用发现文件
console.log('\n[1/6] AI 发现文件（给模型一份权威事实，避免它自己猜错）');
for (const f of ['/llms.txt', '/ai.txt']) {
  const local = path.join(SITE_DIR, f.slice(1));
  if (!fs.existsSync(local)) { no(`${f} 本地文件不存在`); continue; }
  const r = await get(U(f));
  if (r.status === 200 && (r.body || '').length > 200) ok(`${f} 可访问`, `${r.body.length} 字符`);
  else no(`${f} 线上不可访问`, `HTTP ${r.status}`);
}

// 2. robots.txt 是否放行 AI 爬虫
console.log('\n[2/6] robots.txt 是否放行 AI 爬虫');
const rb = await get(U('/robots.txt'));
if (rb.status !== 200) no('robots.txt 不可访问');
else {
  const bots = ['GPTBot', 'OAI-SearchBot', 'ClaudeBot', 'PerplexityBot', 'Bytespider', 'Google-Extended'];
  const missing = bots.filter((b) => !rb.body.includes(b));
  missing.length === 0 ? ok('主流 AI 爬虫均已显式允许') : wn('未显式声明:', missing.join(', '));
  const blocksAll = /User-agent:\s*\*[\s\S]{0,80}Disallow:\s*\/\s*$/m.test(rb.body);
  blocksAll ? no('存在对全站爬虫的 Disallow: /（会挡住 AI）') : ok('没有全站屏蔽');
}

// 3. 事实一致性（价格/电话/地址是否与 llms.txt 一致）
console.log('\n[3/6] 事实一致性（AI 最怕抓到的数字前后矛盾）');
const llms = fs.existsSync(path.join(SITE_DIR, 'llms.txt')) ? fs.readFileSync(path.join(SITE_DIR, 'llms.txt'), 'utf8') : '';
const idx = fs.readFileSync(path.join(SITE_DIR, 'index.html'), 'utf8');
const facts = [
  ['联系电话', '186-8342-1636'],
  ['邮箱', '327585419@qq.com'],
  ['地址关键词', '晋阳路432号'],
];
for (const [name, val] of facts) {
  const inLlms = llms.includes(val);
  const inSite = idx.includes(val);
  inLlms && inSite ? ok(`${name} 双处一致`, val) : (inLlms || inSite ? wn(`${name} 只在一处出现`) : no(`${name} 缺失`));
}
const priceInLlms = /3,000|1\.5 万|3\.6 万/.test(llms);
const priceInSite = /3,000|1\.5万|3\.6万/.test(idx);
priceInLlms && priceInSite ? ok('价格区间双处一致') : wn('价格信息未双处对齐', `llms:${priceInLlms} site:${priceInSite}`);

// 4. 结构化数据
console.log('\n[4/6] 结构化数据（模型判断"这是什么实体"的依据）');
const ldBlocks = [...idx.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
let ldTypes = [];
for (const b of ldBlocks) { try { const j = JSON.parse(b[1]); const t = j['@graph'] ? j['@graph'].map((x) => x['@type']) : [j['@type']]; ldTypes.push(...t.flat()); } catch {} }
const want = ['Organization', 'LocalBusiness', 'WebApplication', 'FAQPage', 'Offer'];
const have = want.filter((t) => ldTypes.some((x) => String(x).includes(t)));
have.length >= 3 ? ok('结构化数据类型齐备', have.join(', ')) : wn('结构化数据偏少', have.join(', ') || '无');
const hasOffer = ldTypes.some((t) => String(t).includes('Offer')) || /"makesOffer"/.test(idx);
hasOffer ? ok('含 Offer / makesOffer（价格可被 AI 直接读取）') : wn('缺 Offer，AI 可能不知道你的价格');

// 5. 可引用性：文章是否有结论块
console.log('\n[5/6] 内容可引用性（AI 倾向引用"开头就给答案"的段落）');
const artDir = path.join(SITE_DIR, 'articles');
const arts = fs.readdirSync(artDir).filter((f) => f.endsWith('.html') && f !== 'index.html');
let withLead = 0;
for (const f of arts) {
  const h = fs.readFileSync(path.join(artDir, f), 'utf8');
  // 认两种写法：显式结论块（art-lead）或正文首段足够精炼
  const lead = h.match(/<p class="art-lead"[^>]*>([\s\S]*?)<\/p>/);
  const firstP = h.match(/<div class="art-body">\s*<p[^>]*>([\s\S]*?)<\/p>/);
  const pick = lead ? lead[1] : (firstP ? firstP[1] : '');
  const text = pick.replace(/<[^>]+>/g, '').replace(/^结论先行：/, '').trim();
  if (text.length >= 40 && text.length <= 260) withLead++;
}
const ratio = arts.length ? Math.round((withLead / arts.length) * 100) : 0;
ratio >= 70 ? ok('多数文章开头有结论块', `${withLead}/${arts.length} 篇 (${ratio}%)`) : wn('部分文章开头缺少精炼结论块', `${withLead}/${arts.length} 篇 (${ratio}%)`);

// 6. 索引可达性（AI 检索的底层来源）
console.log('\n[6/6] 检索可达性（AI 实时回答依赖搜索引擎索引）');
const sm = await get(U('/sitemap.xml'));
sm.status === 200 ? ok('sitemap.xml 可访问', `${(sm.body.match(/<loc>/g) || []).length} 条 URL`) : no('sitemap.xml 不可访问');
const fake = await get(U('/llms-nonexistent-probe.txt'));
fake.status === 404 ? ok('未收录的路径正确返回 404（爬虫不会抓到软404）') : wn('异常路径返回 ' + fake.status + '，可能存在软 404');

console.log('\n' + '='.repeat(56));
console.log(` 通过 ${pass} · 警告 ${warn} · 失败 ${fail}`);
console.log(fail === 0 ? ' GEO 基建已就绪（但收录与被引用仍需时间与外链）' : ' 按 ❌ 逐项处理');
console.log('='.repeat(56));
