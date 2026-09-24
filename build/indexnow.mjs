#!/usr/bin/env node
/**
 * IndexNow 批量提交 —— 把 sitemap.xml 里的全部 URL 即时推送给 Bing / Yandex / Seznam 等
 * 用法：node build/indexnow.mjs [--dry]
 *
 * 原理：IndexNow 需要在站点根目录放一个 {key}.txt（内容=key）做所有权验证，
 *       然后 POST JSON 到 https://api.indexnow.org/indexnow。
 *       本仓库根目录已放好 key 文件（build/indexnow-key.txt 记录当前 key）。
 */
import fs from 'node:fs';
import path from 'node:path';

const SITE = '/home/jdhx/四川积电汇芯网站';
const SITE_URL = 'https://327585419.github.io/jidianhuixin.github.io';
const HOST = '327585419.github.io';
const dry = process.argv.includes('--dry');

// 找到仓库根目录里的 key 文件（32 位十六进制 .txt）
const keyFile = fs.readdirSync(SITE).find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
if (!keyFile) {
  console.error('❌ 未找到 IndexNow 密钥文件（形如 fac1623f....txt）');
  process.exit(1);
}
const KEY = keyFile.replace('.txt', '');

const sitemap = fs.readFileSync(path.join(SITE, 'sitemap.xml'), 'utf8');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
if (!urls.length) { console.error('❌ sitemap.xml 里没有 URL'); process.exit(1); }

const payload = {
  host: HOST,
  key: KEY,
  keyLocation: `${SITE_URL}/${keyFile}`,
  urlList: urls,
};

console.log(`📤 IndexNow 提交 ${urls.length} 条 URL`);
console.log(`   key: ${KEY}`);
console.log(`   验证文件: ${SITE_URL}/${keyFile}`);
if (dry) { console.log(JSON.stringify(payload, null, 2)); process.exit(0); }

const endpoints = ['https://api.indexnow.org/indexnow', 'https://www.bing.com/indexnow'];
let ok = 0;
for (const ep of endpoints) {
  try {
    const res = await fetch(ep, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
    });
    // 200/202 = 成功受理；403 = key 验证失败；422 = URL 不属于该 host
    const good = res.status === 200 || res.status === 202;
    console.log(`${good ? '✅' : '⚠️ '} ${ep} → HTTP ${res.status}`);
    if (good) ok++;
    else console.log('   ', (await res.text()).slice(0, 200));
  } catch (e) {
    console.error(`❌ ${ep} → ${e.message}`);
  }
}
console.log(ok ? `\n🎉 已提交成功（${ok}/${endpoints.length} 个端点受理）` : '\n❌ 全部端点失败');
process.exit(ok ? 0 : 1);
