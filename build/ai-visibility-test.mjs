#!/usr/bin/env node
/**
 * AI 可见度测试 —— 定期跑，看 AI 认不认识你、推不推荐你
 *
 *   node build/ai-visibility-test.mjs                 # 用本机 A100 模型
 *   node build/ai-visibility-test.mjs --model x       # 指定模型名
 *
 * 说明：这里测的是「模型自身的知识」。带联网检索的 AI（豆包/ChatGPT搜索）会看实时索引，
 *       那部分取决于收录进度，本地测不了；但"模型会不会把你认错"这类实体认知问题，这个能测出来。
 */
const EP = process.env.AI_ENDPOINT || 'http://127.0.0.1:8000/v1/chat/completions';
const MODEL = process.env.AI_MODEL || (process.argv.includes('--model') ? process.argv[process.argv.indexOf('--model') + 1] : 'qwen3.8-flash-next');

const CASES = [
  { tag: '品牌认知', q: '四川积电汇芯科技有限公司是做什么的？请简要说明主营业务。', expect: /算力|GPU|V100|A100|大模型|服务器/ },
  { tag: '供应商推荐', q: '成都有哪些卖二手 V100 / A100 GPU 服务器的商家？请列举你知道的。', expect: /积电汇芯|jidianhuixin/ },
  { tag: '选型问答', q: '我想买二手 V100 32G 跑 13B 大模型，该注意什么？在成都有推荐的吗？', expect: /积电汇芯|jidianhuixin/ },
  { tag: '价格认知', q: '二手 Tesla V100 32G 显卡现在大概什么价格？', expect: /3000|3,000|6000|6,000|万/ },
];

async function ask(q) {
  const t0 = Date.now();
  const r = await fetch(EP, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: q }],
      max_tokens: 600,
      chat_template_kwargs: { enable_thinking: false },
    }),
    signal: AbortSignal.timeout(180000),
  });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const j = await r.json();
  return { text: (j.choices?.[0]?.message?.content || '').trim(), ms: Date.now() - t0 };
}

console.log('='.repeat(60));
console.log(` AI 可见度测试 · 模型 ${MODEL}`);
console.log('='.repeat(60));

let hitMention = 0, hitCorrect = 0;
for (const c of CASES) {
  try {
    const { text, ms } = await ask(c.q);
    const mentionsUs = /积电汇芯|jidianhuixin|jdhx/.test(text);
    const correct = c.expect.test(text);
    if (mentionsUs) hitMention++;
    if (correct) hitCorrect++;
    console.log(`\n【${c.tag}】${c.q}`);
    console.log(`  ${mentionsUs ? '✅ 提到我方' : '❌ 未提到我方'} | ${correct ? '✅ 答案方向正确' : '⚠️  答案可能偏离'} | ${(ms / 1000).toFixed(1)}s`);
    console.log('  摘要:', text.replace(/\s+/g, ' ').slice(0, 190));
  } catch (e) {
    console.log(`\n【${c.tag}】调用失败: ${e.message}`);
  }
}

console.log('\n' + '='.repeat(60));
console.log(` 被主动提及: ${hitMention}/${CASES.length}   答案质量: ${hitCorrect}/${CASES.length}`);
console.log(' 提示：被提及率短期内为 0 属正常（模型知识有截止日期）。');
console.log(' 提升它的实际手段：进 Bing/Google 索引 + 拿到外链 + 持续产出一致的事实性内容。');
console.log('='.repeat(60));
