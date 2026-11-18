# 黄历八字小工具

[![test](https://github.com/Aegink/huangli-bazi/actions/workflows/test.yml/badge.svg)](https://github.com/Aegink/huangli-bazi/actions/workflows/test.yml)

一个给自己用的离线黄历工具：挑日子、排生辰八字、看今天宜忌，并且能把自己那本书里的规矩录进去，让它按你的规矩来选。

在线版：<https://aegink.github.io/huangli-bazi/>（GitHub Pages，公开访问；手机也能开）

- 单页 HTML，无框架、无构建、无接口，双击 `index.html` 就能用
- 全部计算在本机浏览器完成，不上传任何数据；唯一的外部请求是字体样式表，断网时自动回落到系统字体，功能与计算结果不受影响
- 规则与档案只存在浏览器 localStorage 里，换设备靠导出 / 导入 JSON

## 四个页面

| 页面 | 作用 |
| --- | --- |
| 择日 | 选事项与时间范围，按分数排序，每个日子可展开「依据」看每一分的来处；含十二时辰吉凶与方位 |
| 八字 | 四柱、十神、大运、近十年流年；按出生地经度做真太阳时校正 |
| 今天 | 当天干支、建除、值神、宜忌、冲煞、彭祖百忌，以及命中了哪些你录的规矩 |
| 规则书 | 9 种规则类型、CSV / JSON 导入校验、自定义事项、打分权重、规则自测、撤销上次导入 |

## 用法

1. 打开 `index.html`（Chrome / Edge）。
2. `assets/lunar.js` 必须与 `index.html` 同目录，它是历法计算库 lunar-javascript 1.7.8 的本地副本。
3. 想改代码：改 `src/` 里的文件，然后 `node tools/build.js` 重新生成 `index.html`。
4. 详见 [交接文档](交接文档.md)。

## 开发与测试

源码在 `src/`（`template.html` + `style.css` + 15 个按职责拆分的 js），`index.html` 是拼出来的产物，**不要直接改**。

```bash
node tools/build.js        # src/ → index.html（约 10 毫秒）
node tests/run.js          # 或 npm test，66 项断言
node tools/build.js --check  # 只校验产物是否与源码同步（CI 用）
```

不需要安装任何依赖，Node 18+ 即可。测试按构建顺序拼接 `src/` 后，在带 DOM 桩、冻结时钟（2026-11-18）的沙箱里执行，断言五组：

| 组 | 验什么 |
| --- | --- |
| A 历法与天文 | 干支 60 日循环、2026 年 24 节气与间隔、2025 闰六月 / 2033 闰十一月、均时差与 NOAA 偏差 ≤1.5 分钟、已知四柱样例 |
| B 规则引擎 | 条件解析与非法输入拦截、CSV / JSON 导入、重复导入去重、一票否决、节气前一日精确命中、事项隔离、分数上限、导入快照与撤销 |
| C 界面渲染 | 四视图冒烟（无 `undefined` / `NaN`）、十二时辰表行数、流年干支与十神、主题切换 |
| D 工程约束 | viewport、无外链脚本、除字体外无外部依赖、打印样式、暗色变量组 |
| E 构建同步 | `index.html` 与 `src/` 逐字节一致（调用 `build.js --check`）、产物内联历法库、不含 `src/` 引用 |

CI 在每次 push 与 PR 先校验构建同步、再跑断言（`.github/workflows/test.yml`）。视觉与排版仍需人工截图验收。

**为什么源码拆开、产物仍是单文件**：拆开是为了改得动（改择日只开 `view-pick.js`）；产物保持单文件是为了用得动（双击、断网、手机、U 盘都照旧）。构建只做一件事——把 CSS 与 JS 内联进模板，不引入任何打包器或依赖。细节见交接文档第十一节。

## 边界

分数只是"这天适不适合办这件事"的排序工具，不是吉凶判断，更不预测运势。各家说法不一的民俗日（杨公忌、三娘煞、红沙等）没有内置，请按自己手上的书核对后录入并标注出处。
