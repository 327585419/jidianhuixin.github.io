#!/usr/bin/env node
/**
 * 批量生成 SEO 长尾文章页 → /home/jdhx/四川积电汇芯网站/articles/
 *
 * 用法：
 *   node build/gen-articles.mjs                # 生成全部
 *   node build/gen-articles.mjs --only slug1,slug2
 *   node build/gen-articles.mjs --force        # 覆盖已存在的
 *
 * 依赖：DEEPSEEK_API_KEY（从 ~/.dsh/.credentials.yaml 读取）
 */
import fs from 'node:fs';
import path from 'node:path';
import { MANIFEST } from './manifest.mjs';

const SITE = '/home/jdhx/四川积电汇芯网站';
const ART_DIR = path.join(SITE, 'articles');
const SITE_URL = 'https://327585419.github.io/jidianhuixin.github.io';
const TODAY = '2026-09-24';
const PHONE = '186-8342-1636';
const PHONE_TEL = '+8618683421636';
const EMAIL = '327585419@qq.com';
const ADDR = '成都市武侯区晋阳路432号1栋E馆3楼329室';
const COMPANY = '四川积电汇芯科技有限公司';

// ---------- 读取 API key ----------
function loadKey() {
  if (process.env.DEEPSEEK_API_KEY) return process.env.DEEPSEEK_API_KEY;
  const f = '/home/jdhx/.dsh/.credentials.yaml';
  const txt = fs.readFileSync(f, 'utf8');
  const m = txt.match(/DEEPSEEK_API_KEY:\s*(\S+)/);
  if (!m) throw new Error('未找到 DEEPSEEK_API_KEY');
  return m[1].replace(/['"]/g, '');
}
const KEY = loadKey();

// ---------- 系统提示：品牌与事实约束 ----------
const COMPANY_BRIEF = `
【公司事实·只能按此表述，不得编造】
- 名称：${COMPANY}，位于${ADDR}，电话/微信 ${PHONE}。
- 主营：V100 / A100 GPU 服务器与单卡销售、GPU 服务器定制（1~8 卡）、本地大模型私有化部署、算力服务器升级与运维。
- 服务：含系统与 CUDA 环境安装、模型部署调试、上门/远程交付、技术支持；成都可面交/上门，外地顺丰保价。
- 有二手现货与定制整机；也提供"先租后买 / 月付整卡服务"（租金可抵货款）。
- 不要编造具体的成交价、客户名、认证、融资、团队人数。

【写作要求】
1. 面向中国大陆读者，简体中文，专业但通俗，像懂行的工程师在给人支招。
2. 必须给"可执行结论"，不要空话；用二级标题（##）分 3~5 节，可用表格（Markdown 表格）和列表。
3. 涉及价格一律用"区间 + 时效声明"，例如"截至 2026 年，二手行情约 X~Y 元（具体以当日货源为准）"。
4. 技术参数必须准确（见下方技术事实），不确定的写"需实测确认"，绝不编造跑分。
5. 结尾用一段"结论/建议"收束，并在最后另起一段给出一句自然的行动引导（提示读者可在文末联系获取配置与报价），但不要写成硬广。
6. 全文字数 900~1400 个汉字，不要用"首先/其次/最后"这种模板腔，不要出现"作为AI"之类的话。
7. 直接输出 Markdown 正文，不要输出 HTML，不要输出标题（标题我会另外加）。
`.trim();

const TECH_FACTS = `
【V100（Volta, 2017）准确参数】
- GV100，12nm，815mm²，211 亿晶体管；CUDA 计算能力 7.0
- 显存：HBM2，16GB 或 32GB 两种；位宽 4096-bit；带宽 900 GB/s
- FP32 约 15.7 TFLOPS；FP16 张量核心约 125 TFLOPS（16GB PCIe 版约 112 TFLOPS）；FP64 约 7.8 TFLOPS
- 功耗：PCIe 版约 250W（双宽）；SXM2 版约 300W。均为被动散热，需服务器风道
- 互联：PCIe 3.0 x16；SXM2 版支持 NVLink 2.0（6 链路、约 300 GB/s 双向聚合）、NVSwitch
- 支持 FP16 混合精度；不支持 BF16、不支持 FP8；无 MIG
- 软件：主流新版 PyTorch/vLLM 已逐步淡化对 sm_70 的官方支持，实际可用性取决于版本组合，部署前需实测确认

【A100（Ampere, 2020）准确参数】
- 显存：40GB 或 80GB HBM2/HBM2e（80GB 实际可用约 80GB 中的 79.x GB）；带宽约 1555 / 2039 GB/s
- FP16 张量核心约 312 TFLOPS（40GB）/ 312 TFLOPS 级（80GB 按规格约 312/624 稀疏）
- 支持 BF16、TF32、FP8(部分精度路径)、MIG 多实例
- 对比口径必须写清是"SXM4 还是 PCIe"，两者带宽与功耗不同

【RTX 4090（消费级）】
- 24GB GDDR6X，约 1008 GB/s 带宽；不支持 NVLink、无 ECC、非服务器风道
- 单卡性价比高，但显存上限 24GB，多卡并行时缺少 NVLink 且被动/主动散热与服务器形态不同

【市场行情（2026 年公开信息，必须标注"仅供参考、以当日货源为准"）】
- 二手 V100 32G SXM2 拆机卡：约 3000~6000 元
- 二手 V100 32G PCIe：约 6000~9000 元
- 二手 V100 32G 整机（九成新）：约 1.8 万~2.3 万元
- 云上 V100 实例：月付约 3800 元级（以云厂商当期报价为准）
- V100 云租用：约 0.16 美元/GPU/小时起
`;

// ---------- 单篇生成 ----------
async function genOne(item, attempt = 1) {
  const prompt = `请写一篇中文长文，主题：${item.title}
写作角度/必须覆盖的点：
${item.points.map((p) => '- ' + p).join('\n')}
${item.extra ? '\n额外要求：' + item.extra : ''}

${COMPANY_BRIEF}

${TECH_FACTS}

现在开始输出 Markdown 正文（不要包含一级标题）：`;

  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 3000,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    if (attempt < 3) {
      console.warn(`  ↻ ${item.slug} 第 ${attempt} 次失败(${res.status})，重试…`);
      await new Promise((r) => setTimeout(r, 2500 * attempt));
      return genOne(item, attempt + 1);
    }
    throw new Error(`${item.slug}: HTTP ${res.status} ${t.slice(0, 200)}`);
  }
  const j = await res.json();
  return j.choices[0].message.content.trim();
}

// ---------- Markdown → HTML（够用即可） ----------
function inline(s) {
  return s
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}
function mdToHtml(md) {
  const lines = md.replace(/\r/g, '').split('\n');
  const out = [];
  let list = null; // 'ul' | 'ol'
  const closeList = () => { if (list) { out.push(`</${list}>`); list = null; } };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    if (!line) { closeList(); continue; }

    // 表格
    if (/^\|.*\|$/.test(line) && /^\|[\s:|-]+\|$/.test((lines[i + 1] || '').trim())) {
      closeList();
      const cells = (r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const head = cells(line);
      i += 2;
      const body = [];
      while (i < lines.length && /^\|.*\|$/.test(lines[i].trim())) { body.push(cells(lines[i].trim())); i++; }
      i--;
      out.push('<table><thead><tr>' + head.map((h) => `<th>${inline(h)}</th>`).join('') + '</tr></thead><tbody>' +
        body.map((r) => '<tr>' + r.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') + '</tbody></table>');
      continue;
    }
    let m;
    if ((m = line.match(/^(#{2,4})\s+(.*)$/))) { closeList(); const lv = Math.min(m[1].length, 3); out.push(`<h${lv}>${inline(m[2])}</h${lv}>`); continue; }
    if ((m = line.match(/^>\s?(.*)$/))) { closeList(); out.push(`<blockquote>${inline(m[1])}</blockquote>`); continue; }
    if ((m = line.match(/^[-*+]\s+(.*)$/))) { if (list !== 'ul') { closeList(); out.push('<ul>'); list = 'ul'; } out.push(`<li>${inline(m[1])}</li>`); continue; }
    if ((m = line.match(/^\d+[.)]\s+(.*)$/))) { if (list !== 'ol') { closeList(); out.push('<ol>'); list = 'ol'; } out.push(`<li>${inline(m[1])}</li>`); continue; }
    if (/^[-*_]{3,}$/.test(line)) { closeList(); out.push('<hr>'); continue; }
    closeList();
    out.push(`<p>${inline(line)}</p>`);
  }
  closeList();
  return out.join('\n');
}
const plain = (md) => md.replace(/[#*`>|-]/g, '').replace(/\s+/g, ' ').trim();
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ---------- 页面模板 ----------
function page(item, html, excerpt, idx) {
  const url = `${SITE_URL}/articles/${item.slug}.html`;
  const prev = MANIFEST[idx - 1];
  const next = MANIFEST[idx + 1];
  const related = [prev, next].filter(Boolean);
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article', headline: item.title, description: excerpt,
        datePublished: TODAY, dateModified: TODAY, inLanguage: 'zh-CN',
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        author: { '@type': 'Organization', name: COMPANY },
        publisher: {
          '@type': 'Organization', name: COMPANY,
          logo: { '@type': 'ImageObject', url: `${SITE_URL}/assets/img/品牌宣传片_封面.webp` },
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '首页', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: '算力知识库', item: `${SITE_URL}/articles/` },
          { '@type': 'ListItem', position: 3, name: item.title, item: url },
        ],
      },
    ],
  };

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#f7fafc">
<title>${esc(item.title)} | ${COMPANY}</title>
<meta name="description" content="${esc(excerpt)}">
<meta name="keywords" content="${esc(item.keywords.join(','))}">
<meta name="author" content="${COMPANY}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${url}">
<meta property="og:type" content="article">
<meta property="og:locale" content="zh_CN">
<meta property="og:site_name" content="${COMPANY}">
<meta property="og:title" content="${esc(item.title)}">
<meta property="og:description" content="${esc(excerpt)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE_URL}/assets/img/神机宣传图_横版.webp">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='12' fill='%2304060c'/%3E%3Ctext x='32' y='42' font-size='30' text-anchor='middle' fill='%2322d3ee' font-family='monospace' font-weight='bold'%3E%E7%A7%AF%3C/text%3E%3C/svg%3E">
<link rel="stylesheet" href="article.css">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>
<body>
<header class="art-top">
  <div class="container">
    <a class="art-brand" href="../index.html"><span class="mark">积</span>积电汇芯 · 算力知识库</a>
    <nav class="art-nav">
      <a href="index.html">全部文章</a>
      <a href="../index.html#products">产品服务</a>
      <a href="../index.html#contact">联系我们</a>
    </nav>
  </div>
</header>
<main class="art">
  <article class="art-wrap">
    <nav class="art-crumb"><a href="../index.html">首页</a> / <a href="index.html">算力知识库</a> / 正文</nav>
    <h1 class="art-title">${esc(item.title)}</h1>
    <div class="art-meta">
      <span>发布：${TODAY}</span>
      <span>分类：${esc(item.category)}</span>
      <span>阅读约 ${Math.max(3, Math.round(plain(html).length / 400))} 分钟</span>
    </div>
    <div class="art-body">
${html}
    </div>

    <aside class="art-cta">
      <h2>需要一份具体的配置与报价？</h2>
      <p>${COMPANY}提供 V100 / A100 单卡与整机、1~8 卡定制、本地大模型私有化部署。报需求即出配置清单与报价，成都可面交上门，外地顺丰保价。</p>
      <div class="btns">
        <a class="btn" href="tel:${PHONE_TEL}">电话/微信 ${PHONE}</a>
        <a class="btn ghost" href="../index.html#contact">在线留言</a>
      </div>
    </aside>

    ${related.length ? `<nav class="art-rel">
      <h2>继续了解</h2>
      <ul>
${related.map((r) => `        <li><a href="${r.slug}.html">${esc(r.title)}</a></li>`).join('\n')}
      </ul>
    </nav>` : ''}
  </article>

  <footer class="art-foot">
    <div class="art-wrap">
      <p><strong>${COMPANY}</strong> · ${ADDR}</p>
      <p>电话/微信：<a href="tel:${PHONE_TEL}">${PHONE}</a> ｜ 邮箱：<a href="mailto:${EMAIL}">${EMAIL}</a> ｜ <a href="../index.html">返回官网首页</a></p>
      <p>本文为通用选型与技术科普内容，行情与参数随货源、批次、软件版本变化，实际配置与价格以沟通确认为准。</p>
    </div>
  </footer>
</main>
</body>
</html>
`;
}

// ---------- 索引页 ----------
function indexPage() {
  const byCat = {};
  for (const it of MANIFEST) (byCat[it.category] ||= []).push(it);
  const url = `${SITE_URL}/articles/`;
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${COMPANY} · 算力知识库`,
    url,
    inLanguage: 'zh-CN',
    isPartOf: { '@type': 'WebSite', url: `${SITE_URL}/`, name: COMPANY },
  };
  const sections = Object.entries(byCat).map(([cat, items]) => `
    <h2 style="margin-top:38px;font-size:1.25rem;padding-left:12px;border-left:4px solid var(--primary)">${esc(cat)}</h2>
    <div class="art-index-grid">
${items.map((it) => `      <a class="art-index-card" href="${it.slug}.html"><h3>${esc(it.title)}</h3><p>${esc(it.summary)}</p></a>`).join('\n')}
    </div>`).join('\n');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#f7fafc">
<title>算力知识库 · V100/A100 选型、行情与本地部署指南 | ${COMPANY}</title>
<meta name="description" content="V100/A100 二手行情、单卡与整机选型、显存与回本测算、本地大模型部署实操的原创长文合集，共 ${MANIFEST.length} 篇，持续更新。成都 AI 算力服务器供应商积电汇芯出品。">
<meta name="keywords" content="V100价格,V100二手,GPU服务器选型,本地部署大模型,A100,算力服务器,成都GPU服务器">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:title" content="算力知识库 · V100/A100 选型与本地部署指南">
<meta property="og:description" content="V100/A100 行情、选型、显存测算、部署实操原创长文合集，共 ${MANIFEST.length} 篇。">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE_URL}/assets/img/神机宣传图_横版.webp">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='12' fill='%2304060c'/%3E%3Ctext x='32' y='42' font-size='30' text-anchor='middle' fill='%2322d3ee' font-family='monospace' font-weight='bold'%3E%E7%A7%AF%3C/text%3E%3C/svg%3E">
<link rel="stylesheet" href="article.css">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>
<body>
<header class="art-top">
  <div class="container">
    <a class="art-brand" href="../index.html"><span class="mark">积</span>积电汇芯 · 算力知识库</a>
    <nav class="art-nav">
      <a href="../index.html#products">产品服务</a>
      <a href="../index.html#solutions">解决方案</a>
      <a href="../index.html#contact">联系我们</a>
    </nav>
  </div>
</header>
<main class="art">
  <div class="art-wrap">
    <nav class="art-crumb"><a href="../index.html">首页</a> / 算力知识库</nav>
    <h1 class="art-title">算力知识库</h1>
    <p style="color:var(--muted);line-height:1.9;margin-bottom:10px">
      V100 / A100 的二手行情、选型逻辑、显存与回本测算、本地大模型部署实操 —— 全部是能直接拿去做决策的干货，共 ${MANIFEST.length} 篇，持续更新。
    </p>
${sections}
    <aside class="art-cta" style="margin-top:44px">
      <h2>拿不准买哪张卡、配几卡？</h2>
      <p>把模型名称、日调用量、是否训练告诉我们，${COMPANY}给一份配置建议 + 报价，不推销超配方案。</p>
      <div class="btns">
        <a class="btn" href="tel:${PHONE_TEL}">电话/微信 ${PHONE}</a>
        <a class="btn ghost" href="../index.html#contact">在线留言</a>
      </div>
    </aside>
  </div>
  <footer class="art-foot">
    <div class="art-wrap">
      <p><strong>${COMPANY}</strong> · ${ADDR} ｜ 电话/微信 <a href="tel:${PHONE_TEL}">${PHONE}</a> ｜ <a href="mailto:${EMAIL}">${EMAIL}</a></p>
    </div>
  </footer>
</main>
</body>
</html>
`;
}

// ---------- 主流程 ----------
const args = process.argv.slice(2);
const onlyArg = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const only = onlyArg ? new Set(onlyArg.split(',')) : null;
const force = args.includes('--force');

fs.mkdirSync(ART_DIR, { recursive: true });

const todo = MANIFEST.filter((it) => (!only || only.has(it.slug)));
console.log(`📝 计划生成 ${todo.length} 篇（共 ${MANIFEST.length} 篇）\n`);

const CONCURRENCY = Number(process.env.CONCURRENCY || 5);
const results = [];
let cursor = 0, done = 0;

async function worker(id) {
  while (cursor < todo.length) {
    const item = todo[cursor++];
    const file = path.join(ART_DIR, `${item.slug}.html`);
    if (fs.existsSync(file) && !force) {
      console.log(`⏭  [${++done}/${todo.length}] ${item.slug} 已存在，跳过`);
      results.push({ item, file });
      continue;
    }
    const t0 = Date.now();
    try {
      const md = await genOne(item);
      const html = mdToHtml(md);
      const bodyText = plain(md);
      const excerpt = item.summary || bodyText.slice(0, 120);
      const full = page(item, html, excerpt, MANIFEST.indexOf(item));
      fs.writeFileSync(file, full);
      console.log(`✅ [${++done}/${todo.length}] ${item.slug} (${bodyText.length}字, ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
      results.push({ item, file });
    } catch (e) {
      console.error(`❌ [${++done}/${todo.length}] ${item.slug} — ${e.message}`);
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i)));

// 索引页 + robots + sitemap（用 --no-site 可跳过）
if (!args.includes('--no-site')) {
  fs.writeFileSync(path.join(ART_DIR, 'index.html'), indexPage());
  console.log('\n✅ articles/index.html 生成完成');

  const urls = [
    `${SITE_URL}/`,
    `${SITE_URL}/articles/`,
    ...MANIFEST.map((it) => `${SITE_URL}/articles/${it.slug}.html`),
    `${SITE_URL}/tools/gpu-advisor.html`,
  ];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${u}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>${u === SITE_URL + '/' ? 'weekly' : 'monthly'}</changefreq>
    <priority>${u === SITE_URL + '/' ? '1.0' : u.endsWith('/articles/') ? '0.9' : '0.8'}</priority>
  </url>`).join('\n')}
</urlset>
`;
  fs.writeFileSync(path.join(SITE, 'sitemap.xml'), sitemap);
  console.log(`✅ sitemap.xml 生成完成（${urls.length} 条 URL）`);

  fs.writeFileSync(path.join(SITE, 'robots.txt'), `User-agent: *
Allow: /
Disallow: /thanks.html

# 全站站点地图（首页 + 算力知识库全部文章）
Sitemap: ${SITE_URL}/sitemap.xml
`);
  console.log('✅ robots.txt 生成完成');
}

console.log(`\n🎉 完成：${results.length} 篇成功`);
