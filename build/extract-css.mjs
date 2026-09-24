#!/usr/bin/env node
/**
 * 从官网 index.html 抽取 <style> 块 → articles/article.css
 * 目的：文章页与主站视觉 100% 一致，避免维护两份样式
 */
import fs from 'node:fs';
import path from 'node:path';

const SITE = '/home/jdhx/四川积电汇芯网站';
const src = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8');

const m = src.match(/<style>([\s\S]*?)<\/style>/);
if (!m) { console.error('未找到 <style> 块'); process.exit(1); }

let css = m[1];

// 文章页需要的补充样式（主站没有的排版元素）
css += `

/* ===== 文章页补充样式（由 build 脚本自动追加，勿手工改动上面部分） ===== */
.container { max-width: 1120px; margin: 0 auto; padding: 0 20px; }
.art-wrap { max-width: 820px; margin: 0 auto; padding: 0 20px; }
.art-top { position: sticky; top: 0; z-index: 50; background: rgba(247,250,252,.92); backdrop-filter: blur(12px); border-bottom: 1px solid var(--line); }
.art-top .container { display: flex; align-items: center; justify-content: space-between; height: var(--nav-h); gap: 16px; }
.art-brand { display: flex; align-items: center; gap: 10px; font-weight: 700; color: var(--text); text-decoration: none; letter-spacing: .5px; }
.art-brand span.mark { width: 30px; height: 30px; border-radius: 8px; background: linear-gradient(135deg,#0891b2,#2563eb); color: #fff; display: grid; place-items: center; font-size: 15px; }
.art-nav { display: flex; gap: 18px; font-size: 14px; }
.art-nav a { color: var(--muted); text-decoration: none; }
.art-nav a:hover { color: var(--primary); }
main.art { padding: 40px 0 72px; }
.art-crumb { font-size: 13px; color: var(--muted); margin-bottom: 18px; }
.art-crumb a { color: var(--primary); text-decoration: none; }
h1.art-title { font-size: clamp(1.5rem, 3.6vw, 2.1rem); line-height: 1.35; color: var(--text); margin-bottom: 14px; }
.art-meta { display: flex; flex-wrap: wrap; gap: 8px 16px; font-size: 13px; color: var(--muted); padding-bottom: 22px; border-bottom: 1px solid var(--line); margin-bottom: 30px; }
.art-body { font-size: 16.5px; line-height: 1.9; color: var(--text); }
.art-body h2 { font-size: 1.32rem; margin: 38px 0 14px; padding-left: 12px; border-left: 4px solid var(--primary); line-height: 1.5; }
.art-body h3 { font-size: 1.1rem; margin: 26px 0 10px; color: var(--text); }
.art-body p { margin: 0 0 16px; }
.art-body ul, .art-body ol { margin: 0 0 18px; padding-left: 24px; }
.art-body li { margin-bottom: 8px; }
.art-body strong { color: var(--text); font-weight: 700; }
.art-body a { color: var(--primary); }
.art-body code { font-family: var(--mono); font-size: .9em; background: var(--bg-soft); padding: 2px 6px; border-radius: 5px; }
.art-body table { width: 100%; border-collapse: collapse; margin: 18px 0 24px; font-size: 15px; display: block; overflow-x: auto; }
.art-body th, .art-body td { border: 1px solid var(--line); padding: 10px 12px; text-align: left; vertical-align: top; }
.art-body th { background: var(--bg-soft); font-weight: 700; white-space: nowrap; }
.art-body blockquote { margin: 20px 0; padding: 14px 18px; background: var(--card); border-left: 4px solid var(--line-strong); border-radius: 0 var(--radius) var(--radius) 0; color: var(--muted); }
.art-cta { margin: 40px 0 0; padding: 26px 24px; border-radius: 16px; background: linear-gradient(135deg, rgba(8,145,178,.08), rgba(37,99,235,.08)); border: 1px solid var(--line-strong); }
.art-cta h2 { border: none; padding: 0; margin: 0 0 10px; font-size: 1.2rem; }
.art-cta p { margin: 0 0 14px; color: var(--muted); font-size: 15px; }
.art-cta .btns { display: flex; flex-wrap: wrap; gap: 12px; }
.art-cta .btn { display: inline-block; padding: 11px 22px; border-radius: 50px; background: linear-gradient(135deg,#0891b2,#2563eb); color: #fff; text-decoration: none; font-weight: 600; font-size: 15px; }
.art-cta .btn.ghost { background: transparent; color: var(--primary); border: 1px solid var(--line-strong); }
.art-rel { margin-top: 46px; padding-top: 28px; border-top: 1px solid var(--line); }
.art-rel h2 { font-size: 1.1rem; margin-bottom: 14px; }
.art-rel ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }
.art-rel a { color: var(--primary); text-decoration: none; font-size: 15px; }
.art-foot { border-top: 1px solid var(--line); margin-top: 60px; padding: 30px 0; font-size: 13.5px; color: var(--muted); line-height: 1.9; }
.art-foot a { color: var(--primary); text-decoration: none; }
.art-index-grid { display: grid; gap: 14px; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); margin-top: 26px; }
.art-index-card { display: block; text-decoration: none; background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 18px 20px; transition: border-color .25s, transform .25s; }
.art-index-card:hover { border-color: var(--line-strong); transform: translateY(-3px); }
.art-index-card h3 { margin: 0 0 8px; font-size: 1.02rem; color: var(--text); line-height: 1.5; }
.art-index-card p { margin: 0; font-size: 14px; color: var(--muted); line-height: 1.7; }
@media (max-width: 720px) {
  .art-nav { display: none; }
  .art-body { font-size: 16px; }
}
`;

fs.mkdirSync(path.join(SITE, 'articles'), { recursive: true });
fs.writeFileSync(path.join(SITE, 'articles', 'article.css'), css);
console.log(`✅ article.css 生成完成：${css.length} 字节`);
