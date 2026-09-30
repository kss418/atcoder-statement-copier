const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { test, before, after } = require('node:test');
const { chromium } = require(process.env.ASC_PLAYWRIGHT_PATH || 'playwright');

const repo = process.env.ASC_EXTENSION_DIR || path.resolve(__dirname, '..');
const fixture = `<!doctype html><meta charset="utf-8">
<style>.lang-ja { display: none; }</style>
<main><h2>Example task</h2><div id="task-statement">
  <span class="lang-ja"><section><h3>問題文</h3><p>整数を出力してください。</p></section></span>
  <span class="lang-en">
    <section><h3>Problem Statement</h3><p>Find <var><span class="katex"><span class="katex-mathml"><math><semantics><mi>x</mi><annotation encoding="application/x-tex">x_i</annotation></semantics></math></span><span class="katex-html" aria-hidden="true">RENDERED_MATH</span></span></var>.<br>Print the answer.</p></section>
    <section><h3>Constraints</h3><ul><li>1 &lt;= N &lt;= 10</li></ul></section>
    <section><h3>Sample Input 1</h3><pre>2 3\n  4 5\n</pre></section>
    <section><h3>Sample Output 1</h3><pre>9\n</pre></section>
  </span>
</div></main>`;
const english = 'Problem Statement\n\nFind $x_i$.\nPrint the answer.\n\nConstraints\n\n- 1 <= N <= 10\n\nSample Input 1\n\n2 3\n  4 5\n\nSample Output 1\n\n9\n';
let server;
let browser;
let origin;

before(async () => {
  server = http.createServer((request, response) => {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(fixture);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ channel: 'chrome', headless: true });
});

after(async () => {
  await browser?.close();
  if (server) await new Promise((resolve) => server.close(resolve));
});

async function inject(page) {
  const manifest = JSON.parse(fs.readFileSync(path.join(repo, 'manifest.json'), 'utf8'));
  for (const group of manifest.content_scripts) {
    for (const file of group.css || []) await page.addStyleTag({ path: path.join(repo, file) });
    for (const file of group.js || []) await page.addScriptTag({ path: path.join(repo, file) });
  }
}

async function openPage(t, html = fixture) {
  const context = await browser.newContext();
  t.after(() => context.close());
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  await page.goto(origin);
  await page.setContent(html);
  await inject(page);
  return page;
}

async function readClipboard(page) {
  // Windows converts clipboard line endings to CRLF. Compare text content
  // using LF while still checking all spaces and indentation exactly.
  return (await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n');
}

test('copies only the visible statement, preserving math and sample whitespace', async (t) => {
  const page = await openPage(t);
  const text = await page.evaluate(() => globalThis.AtCoderCopier?.extractStatement?.() ?? null);
  assert.equal(text, english);
});

test('extracts the language selected after the scripts have loaded', async (t) => {
  const page = await openPage(t);
  await page.evaluate(() => {
    document.querySelector('.lang-en').style.display = 'none';
    document.querySelector('.lang-ja').style.display = 'inline';
  });
  const text = await page.evaluate(() => globalThis.AtCoderCopier?.extractStatement?.() ?? null);
  assert.equal(text, '問題文\n\n整数を出力してください。');
});

test('sample content retains consecutive blank lines, blank-line spaces, and trailing spaces', async (t) => {
  const html = '<!doctype html><div id="task-statement"><section><h3>Sample Input</h3><pre>a  \n\n\nb\n  \nc  \n</pre></section></div>';
  const page = await openPage(t, html);
  const text = await page.evaluate(() => AtCoderCopier.extractStatement());
  assert.equal(text, 'Sample Input\n\na  \n\n\nb\n  \nc  \n');
});

test('reinjecting the scripts adds only one button outside the statement', async (t) => {
  const page = await openPage(t);
  await inject(page);
  assert.equal(await page.locator('button.asc-copy-button').count(), 1);
  assert.equal(await page.locator('#task-statement .asc-copy-button').count(), 0);
});

test('clicking the button writes the current statement to the real browser clipboard', async (t) => {
  const page = await openPage(t);
  assert.equal(await page.locator('button.asc-copy-button').count(), 1);
  await page.evaluate(() => { document.querySelector('.lang-en p').textContent = 'Updated statement.'; });
  await page.locator('button.asc-copy-button').click();
  await page.waitForFunction(() => document.querySelector('.asc-copy-button').textContent === 'Copied!');
  const text = await readClipboard(page);
  assert.equal(text, english.replace('Find $x_i$.\nPrint the answer.', 'Updated statement.'));
  assert.equal(await page.locator('button.asc-copy-button').isEnabled(), true);
});

test('an empty statement reports failure without overwriting the clipboard', async (t) => {
  const page = await openPage(t);
  assert.equal(await page.locator('button.asc-copy-button').count(), 1);
  await page.evaluate(async () => {
    await navigator.clipboard.writeText('KEEP_EXISTING_TEXT');
    document.querySelector('.lang-en').replaceChildren();
  });
  await page.locator('button.asc-copy-button').click();
  await page.waitForFunction(() => document.querySelector('.asc-copy-button').textContent === 'Copy failed');
  assert.equal(await readClipboard(page), 'KEEP_EXISTING_TEXT');
  assert.equal(await page.locator('button.asc-copy-button').isEnabled(), true);
});

test('clipboard permission failure is displayed and allows a successful retry', async (t) => {
  const page = await openPage(t);
  assert.equal(await page.locator('button.asc-copy-button').count(), 1);
  await page.evaluate(() => {
    globalThis.originalWriteText = navigator.clipboard.writeText.bind(navigator.clipboard);
    navigator.clipboard.writeText = async () => { throw new DOMException('Permission denied', 'NotAllowedError'); };
  });
  await page.locator('button.asc-copy-button').click();
  await page.waitForFunction(() => document.querySelector('.asc-copy-button').textContent === 'Copy failed');
  assert.equal(await page.locator('button.asc-copy-button').isEnabled(), true);
  assert.match(await page.locator('button.asc-copy-button').getAttribute('title'), /Permission denied/);
  await page.evaluate(() => { navigator.clipboard.writeText = globalThis.originalWriteText; });
  await page.locator('button.asc-copy-button').click();
  await page.waitForFunction(() => document.querySelector('.asc-copy-button').textContent === 'Copied!');
  assert.equal(await readClipboard(page), english);
});

test('pages without a statement get no copy button', async (t) => {
  const page = await openPage(t, '<!doctype html><p>Task list</p>');
  assert.equal(await page.locator('button.asc-copy-button').count(), 0);
});

test('raw AtCoder variables become inline LaTeX, including the input format', async (t) => {
  const html = String.raw`<!doctype html><div id="task-statement"><p>Use <var>N</var> and <var>a_{i+1}</var>.</p><p>Limit <var>1 \le N,K \le 10^8</var>.</p><pre><var>N</var> <var>K</var>
</pre></div>`;
  const page = await openPage(t, html);
  const text = await page.evaluate(() => AtCoderCopier.extractStatement());
  assert.equal(text, 'Use $N$ and $a_{i+1}$.\n\nLimit $1 \\le N,K \\le 10^8$.\n\n$N$ $K$\n');
});

test('standalone KaTeX uses original LaTeX with inline and display delimiters', async (t) => {
  const html = String.raw`<!doctype html><div id="task-statement"><p>Ratio <span class="katex"><span class="katex-mathml"><math><semantics><annotation encoding="application/x-tex">\frac{x_i}{10^8}</annotation></semantics></math></span><span class="katex-html" aria-hidden="true">VISUAL_RATIO</span></span>.</p><span class="katex-display"><span class="katex"><span class="katex-mathml"><math><semantics><annotation encoding="application/x-tex">a^2 + b^2 = c^2</annotation></semantics></math></span><span class="katex-html" aria-hidden="true">VISUAL_EQUATION</span></span></span></div>`;
  const page = await openPage(t, html);
  const text = await page.evaluate(() => AtCoderCopier.extractStatement());
  assert.equal(text, 'Ratio $\\frac{x_i}{10^8}$.\n\n$$\na^2 + b^2 = c^2\n$$');
});

test('sample copy controls are omitted while actual Copy text and sample whitespace remain', async (t) => {
  const html = '<!doctype html><div id="task-statement"><section><h3>Sample Input 1<span class="btn btn-default btn-sm btn-copy ml-1" tabindex="0" data-target="pre-sample1">Copy</span></h3><div class="div-btn-copy"><span class="btn-copy btn-pre" tabindex="0" data-target="pre-sample1">Copy</span></div><pre id="pre-sample1">Copy  value\n\n\n  4  \n</pre></section><section><h3>Explanation</h3><p>Copy the answer.</p></section></div>';
  const page = await openPage(t, html);
  const text = await page.evaluate(() => AtCoderCopier.extractStatement());
  assert.equal(text, 'Sample Input 1\n\nCopy  value\n\n\n  4  \n\nExplanation\n\nCopy the answer.');
});
