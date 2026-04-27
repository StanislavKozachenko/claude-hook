import puppeteer from 'puppeteer-core'
import { writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outPath = resolve(__dirname, '../assets/social-preview.png')

const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1280px; height: 640px; overflow: hidden;
    background: #0d1117;
    font-family: -apple-system, 'Segoe UI', sans-serif;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 72px 96px;
  }

  .left {
    display: flex;
    flex-direction: column;
    gap: 24px;
    flex: 0 0 auto;
    max-width: 520px;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(249,115,22,0.12);
    border: 1px solid rgba(249,115,22,0.3);
    border-radius: 6px;
    padding: 6px 14px;
    width: fit-content;
  }
  .badge-dot {
    width: 8px; height: 8px;
    background: #f97316;
    border-radius: 50%;
  }
  .badge-text {
    font-size: 13px;
    font-weight: 600;
    color: #f97316;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .title {
    font-size: 72px;
    font-weight: 800;
    color: #f0f6fc;
    letter-spacing: -2px;
    line-height: 1;
  }
  .title span { color: #f97316; }

  .tagline {
    font-size: 22px;
    color: #8b949e;
    font-weight: 400;
    line-height: 1.4;
  }

  .code-card {
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 12px;
    padding: 28px 32px;
    flex: 0 0 auto;
    width: 560px;
  }
  .code-bar {
    display: flex;
    gap: 8px;
    margin-bottom: 20px;
  }
  .dot { width: 12px; height: 12px; border-radius: 50%; }
  .dot-r { background: #ff5f57; }
  .dot-y { background: #febc2e; }
  .dot-g { background: #28c840; }

  pre {
    font-family: 'Cascadia Code', 'Fira Code', 'Menlo', monospace;
    font-size: 14.5px;
    line-height: 1.75;
    color: #e6edf3;
    white-space: pre;
  }
  .kw  { color: #ff7b72; }
  .fn  { color: #d2a8ff; }
  .str { color: #a5d6ff; }
  .cm  { color: #8b949e; }
  .op  { color: #79c0ff; }
  .ev  { color: #f97316; }
</style>
</head>
<body>
  <div class="left">
    <div class="badge">
      <div class="badge-dot"></div>
      <span class="badge-text">npm · pnpm · yarn · bun</span>
    </div>
    <div class="title">claude<span>-</span>hook</div>
    <div class="tagline">TypeScript middleware<br>for Claude Code hooks</div>
  </div>

  <div class="code-card">
    <div class="code-bar">
      <div class="dot dot-r"></div>
      <div class="dot dot-y"></div>
      <div class="dot dot-g"></div>
    </div>
    <pre><span class="kw">import</span> { <span class="fn">createHook</span> } <span class="kw">from</span> <span class="str">'claude-hook'</span>

<span class="kw">const</span> hook = <span class="fn">createHook</span>()

hook.<span class="fn">on</span>(<span class="ev">'PreToolUse'</span>, <span class="str">'Bash'</span>, (ctx) <span class="op">=></span> {
  <span class="kw">if</span> (ctx.input.command.<span class="fn">includes</span>(<span class="str">'rm -rf'</span>))
    ctx.<span class="fn">block</span>(<span class="str">'too dangerous'</span>)
})

hook.<span class="fn">on</span>(<span class="ev">'UserPromptSubmit'</span>, <span class="str">'*'</span>, (ctx) <span class="op">=></span> {
  ctx.<span class="fn">addContext</span>(<span class="str">'project: my-app'</span>)
})

hook.<span class="fn">run</span>()</pre>
  </div>
</body>
</html>`

const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  args: ['--no-sandbox'],
})

const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 640, deviceScaleFactor: 2 })
await page.setContent(html, { waitUntil: 'networkidle0' })
const screenshot = await page.screenshot({ type: 'png' })
await browser.close()

writeFileSync(outPath, screenshot)
console.log('saved:', outPath)
