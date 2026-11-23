+++
title = "把 Lean 塞进浏览器的一周：wasm64 的三个坑与 mahler32 的打包劫"
date = 2026-11-23T14:52:07+08:00
draft = false
tags = ["周报","GitHub","AI Generated","Step 5 Preview"]
categories = ["周报","工程复盘"]
description = "主战场是 lean-init-ide：为在浏览器里跑 Std/Mathlib 接入实验性 wasm64，连踩启动 TypeError、约 1MB Worker 栈溢出与 [object ErrorEvent] 三个坑，最终靠 Lean 差分门禁和内存护栏兜底；另一半时间在 mahler32 做 Mahler 递推形式化，卡点几乎全在 LICENSE 与 Lake 打包。"
author = "安卓人"
+++

## wasm64：想在浏览器里装下 Mathlib

精力大头在 [lean-online/lean-init-ide](https://github.com/lean-online/lean-init-ide)。起因很实在：wasm32 的寻址空间装不下 Std/Lean 核心加 Mathlib 扩展库，于是去接 Emscripten 的实验性 wasm64（[#29](https://github.com/lean-online/lean-init-ide/pull/29)，R2 / 魔搭双源、单 Pages Function）；默认仍走 wasm32，wasm64 留了手动开关（[#28](https://github.com/lean-online/lean-init-ide/pull/28)）。原以为难在编译，结果坑全在运行时。

**启动就 TypeError。** zstd 解码共享索引时把索引原地改坏了，先复制再解码才修好（[#30](https://github.com/lean-online/lean-init-ide/pull/30)）。坑不深，位置烦——不复制就永远起不来。

**栈溢出与丢诊断。** 密集战术一跑，浏览器 Worker 那约 1MB 的栈直接爆掉；Emscripten 的 pthread 还把 ErrorEvent 层层嵌套，报错只剩一个 `[object ErrorEvent]`，等于没诊断。[#32](https://github.com/lean-online/lean-init-ide/pull/32) 负责展开嵌套、留住栈溢出信息，[#38](https://github.com/lean-online/lean-init-ide/pull/38) 修了热点战术的栈溢出，同时上了真实 Lean 差分门禁——在浏览器里查 Wasm 内存问题太磨人，拿原生 Lean 当参照物比对行为反而省事。

栈的限制绕不开，最后只能外围兜底：混合内存守卫、OOM 手动恢复、wasm64 能力探测（[#27](https://github.com/lean-online/lean-init-ide/pull/27)，[#58](https://github.com/lean-online/lean-init-ide/pull/58) 升到 v2），功能侧也挂上了 Std/Lean 核心与 Mathlib 扩展库（[#47](https://github.com/lean-online/lean-init-ide/pull/47)）。另有两条想走捷径的路没走通：开 tail call 让尾递归不压原生栈（[#23](https://github.com/lean-online/lean-init-ide/pull/23)）、wasm64 构建与栈补丁门禁（[#39](https://github.com/lean-online/lean-init-ide/pull/39)），都关掉没合；SEO 的 JSON-LD（[#42](https://github.com/lean-online/lean-init-ide/pull/42)）也是开完即弃。顺手给上游开了个 issue：[leanprover/lean4#16564](https://github.com/leanprover/lean4/issues/16564)，讲 Emscripten wasm64 支持与浏览器 Worker 约 1MB 栈的限制，还挂着。

## mahler32：证明之外的打包劫

数学线落在 [3y3y3y-huaiji/mahler32](https://github.com/3y3y3y-huaiji/mahler32)。内容推进了三件：3/2 Mahler 递推及其 parity windows 的形式化（[8eefc5d](https://github.com/3y3y3y-huaiji/mahler32/commit/8eefc5d89a56a9b46cfe2be1d08e59deb08cbdaa)）、2^k 个合法剩余类改用显式双焦计数（[2bf320f](https://github.com/3y3y3y-huaiji/mahler32/commit/2bf320ffe1a00c76ecdb8733acac0c3fc73e2192)）、CI 给新定理加公理审计（[c96d8a0](https://github.com/3y3y3y-huaiji/mahler32/commit/c96d8a02d12e829d81e9ad86d46ac2c5db4de08c)）。

但时间主要耗在打包，不在证明。Challenge/Solution 得注册成 Lake targets 才会被构建（[22df8379](https://github.com/3y3y3y-huaiji/mahler32/commit/22df837912f84ec60439f4f3d56c79900466b42d)），库根缺 module header 也报错。最琐碎的是 LICENSE，来回折腾了四五轮：删掉重复的 Apache 副本，又恢复 verbatim Apache-2.0 文本；Mulan PSL v2 换成 verbatim 文本 GitHub 才认（[2aec0969](https://github.com/3y3y3y-huaiji/mahler32/commit/2aec09695fcb45be0754f0930b3525c6d924f2fc)）；最后换成 GitHub 标准的双文件双许可布局（[0be9eae](https://github.com/3y3y3y-huaiji/mahler32/commit/0be9eae22965ba6f29fd49a7a6830ce046c34eca)）才算稳。工具链钉在 Lean/Mathlib v4.36.0（[PR #1](https://github.com/3y3y3y-huaiji/mahler32/pull/1)），配了完整 preflight workflow，顺手把凭据和草稿文件挡在 commit 之外。

插曲一个：这套递推形式化先以 draft 开在 [lean4-carmichael](https://github.com/3y3y3y-huaiji/lean4-carmichael) 的 [PR #1](https://github.com/3y3y3y-huaiji/lean4-carmichael/pull/1)，自己评论一轮后关掉没合，活最终落在 mahler32。

## 其余

lean-init-ide 剩下的多是治理与边角，不细说：架构不变量门禁与 ESLint（[#52](https://github.com/lean-online/lean-init-ide/pull/52)）、在途 PR 门禁自动刷新与 Docs-as-Code（[#51](https://github.com/lean-online/lean-init-ide/pull/51)）、供应链加固与 OpenSSF Scorecard（[#60](https://github.com/lean-online/lean-init-ide/pull/60)）、/cdn 缓存键失配与 CodeQL 告警（[#67](https://github.com/lean-online/lean-init-ide/pull/67)）；课程扩到 27 节并清掉 sorry，挑战区从零基础导览（[#22](https://github.com/lean-online/lean-init-ide/pull/22)）一路做到 Proof Arcade 的战绩导入导出（[#54](https://github.com/lean-online/lean-init-ide/pull/54)/[#57](https://github.com/lean-online/lean-init-ide/pull/57)/[#59](https://github.com/lean-online/lean-init-ide/pull/59)）。这周开进去 54 个 PR、合掉 50 个，大半是这种小刀快剁。

---

*基于公开 GitHub 活动自动整理，所有链接均来自公开数据。*
