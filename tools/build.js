/*
 * 构建：把 src/ 源码拼回根目录的 index.html（单文件、可双击、可离线）。
 *
 *   node tools/build.js          生成 index.html
 *   node tools/build.js --check  只检查 index.html 是否与 src/ 同步（CI 用），不同步则退出码 1
 *
 * 为什么要有这一步：产品必须保持"一个 html 拖进浏览器就能用"，所以发布物是拼好的单文件；
 * 但源码按职责拆在 src/ 里，方便改。index.html 是产物，不要直接编辑它。
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'index.html');

// 顺序即依赖顺序（老式脚本，靠全局函数与 const 组织；函数声明会自动提升）
const { JS_FILES } = require('./manifest');

function read(p) {
  if (!fs.existsSync(p)) throw new Error('缺少文件：' + path.relative(ROOT, p));
  return fs.readFileSync(p, 'utf8');
}

function build() {
  const template = read(path.join(SRC, 'template.html'));
  if (!template.includes('@@STYLE@@') || !template.includes('@@SCRIPT@@')) {
    throw new Error('src/template.html 缺少 @@STYLE@@ 或 @@SCRIPT@@ 占位');
  }

  const css = read(path.join(SRC, 'style.css')).trim();
  const js = JS_FILES.map(f => {
    const body = read(path.join(SRC, f)).trim();
    if (/<\/script/i.test(body)) throw new Error(f + ' 里出现了 </script>，内联时会截断脚本');
    return body;
  }).join('\n\n');

  return template.split('@@STYLE@@').join(css).split('@@SCRIPT@@').join(js);
}

const result = build();

if (process.argv.includes('--check')) {
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (current !== result) {
    console.error('index.html 与 src/ 不同步。请运行：node tools/build.js');
    process.exit(1);
  }
  console.log('index.html 与 src/ 同步（' + result.length + ' 字节）');
} else {
  fs.writeFileSync(OUT, result, 'utf8');
  console.log('已生成 index.html：' + result.length + ' 字节，源码 ' + (JS_FILES.length + 2) + ' 个文件');
}
