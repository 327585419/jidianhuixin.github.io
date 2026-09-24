#!/usr/bin/env node
/**
 * 用现有文章正文重新套用页面模板（不重新调用模型，省 token）
 * 用途：模板升级（如新增结论块、改结构化数据）后批量重渲染
 */
import fs from 'node:fs';
import path from 'node:path';
import { MANIFEST } from './manifest.mjs';

const SITE = '/home/jdhx/四川积电汇芯网站';
const ART = path.join(SITE, 'articles');

// 从 gen-articles.mjs 复用模板：直接 import 不方便（有副作用），所以这里内联同款渲染
const SITE_URL = 'https://327585419.github.io/jidianhuixin.github.io';
const TODAY = '2026-09-24';
const PHONE = '186-8342-1636', PHONE_TEL = '+8618683421636', EMAIL = '327585419@qq.com';
const ADDR = '成都市武侯区晋阳路432号1栋E馆3楼329室';
const COMPANY = '四川积电汇芯科技有限公司';
const esc = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const plain = (h) => h.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

function buildPage(item, bodyHtml, excerpt, idx) {
  const url = `${SITE_URL}/articles/${item.slug}.html`;
  const prev = MANIFEST[idx - 1], next = MANIFEST[idx + 1];
  const related = [prev, next].filter(Boolean);

  const leadText = (() => {
    const firstP = bodyHtml.match(/<p>([\s\S]*?)<\/p>/);
    if (firstP) {
      const t = plain(firstP[1]);
      if (t.length >= 30 && t.length <= 170) return t;
    }
    const s = (item.summary || excerpt || '').replace(/\s+/g, ' ').trim();
    return s.length > 160 ? s.slice(0, 158) + '…' : s;
  })();

  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Article', headline: item.title, description: excerpt, datePublished: TODAY, dateModified: TODAY,
        inLanguage: 'zh-CN', mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        author: { '@type': 'Organization', name: COMPANY, url: `${SITE_URL}/` },
        publisher: { '@type': 'Organization', name: COMPANY, logo: { '@type': 'ImageObject', url: `${SITE_URL}/assets/img/品牌宣传片_封面.webp` } },
        about: item.keywords.map((k) => ({ '@type': 'Thing', name: k })),
        isPartOf: { '@type': 'CollectionPage', name: '算力知识库', url: `${SITE_URL}/articles/` } },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: '首页', item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: '算力知识库', item: `${SITE_URL}/articles/` },
        { '@type': 'ListItem', position: 3, name: item.title, item: url } ] },
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
      <a href="../index.html#stock">现货价</a>
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
      <span>阅读约 ${Math.max(3, Math.round(plain(bodyHtml).length / 400))} 分钟</span>
    </div>
    <div class="art-body">
      <p class="art-lead"><strong>结论先行：</strong>${leadText}</p>
${bodyHtml}
    </div>

    <aside class="art-cta">
      <h2>需要一份具体的配置与报价？</h2>
      <p>${COMPANY}提供 V100 / A100 单卡与整机、1~8 卡定制、本地大模型私有化部署。报需求即出配置清单与报价，成都可面交上门，外地顺丰保价。</p>
      <div class="btns">
        <a class="btn" href="tel:${PHONE_TEL}">电话/微信 ${PHONE}</a>
        <a class="btn ghost" href="../tools/gpu-advisor.html">免费算力选型</a>
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

let n = 0, skip = 0;
for (const item of MANIFEST) {
  const f = path.join(ART, `${item.slug}.html`);
  if (!fs.existsSync(f)) { console.log('⏭ 缺少源文件:', item.slug); skip++; continue; }
  const src = fs.readFileSync(f, 'utf8');
  const m = src.match(/<div class="art-body">([\s\S]*?)<\/div>\s*\n\s*<aside class="art-cta">/);
  if (!m) { console.log('⏭ 无法提取正文:', item.slug); skip++; continue; }
  // 去掉可能已存在的结论块，避免叠加
  const body = m[1].replace(/<p class="art-lead">[\s\S]*?<\/p>\s*/g, '').trim();
  const desc = (src.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
  fs.writeFileSync(f, buildPage(item, body, desc.replace(/&quot;/g, '"').replace(/&amp;/g, '&'), MANIFEST.indexOf(item)));
  n++;
}
console.log(`✅ 重新渲染完成：${n} 篇${skip ? `，跳过 ${skip} 篇` : ''}`);
