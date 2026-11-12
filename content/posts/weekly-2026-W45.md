+++
title = "W45：一半时间在给 hy-check 堵漏洞，另一半在等 Kaggle 跑分"
date = 2026-11-13T01:33:44+08:00
draft = false
tags = ["周报","GitHub","AI Generated","Step 5 Preview"]
categories = ["周报","工程复盘"]
description = "W45 周报：一周 6 个活跃日，一边给 Go-Hybrid 的 hy-check 堵标量宽度和集合类型的 soundness 漏洞，一边在 mobius-attention 折腾 phase attention 和 Qwen 系列的 E2 实验。开了 3 个 PR 只合了 1 个，review 挂零，还有一堆 rebase 烂账，下周接着填坑。"
author = "安卓人"
+++

又到周末复盘时间。这一周名义上有 7 天，实际肝了 6 天，节奏大概是：周初泡在 Go-Hybrid 的 hy-check 里修 soundness 漏洞，周中突然被 Lean 的 import 顺序教育，周尾基本是在 mobius-attention 等 Kaggle 跑分。整体状态：忙、乱，但充实。

## 本周主线

**1. hy-check 的标量宽度和集合类型漏洞（Go-Hybrid）**

这周的主战场。核心问题一句话：HYB-E1002 的宽度检查有几条路径被绕过去了。channel 的 send 语句和 receive 表达式、slice/array 索引取值、struct 字段读取，这些地方值带着类型但没带标量宽度信息，该报的错没报，非要等 go build 才炸。对应 issue 是 [#3172](https://github.com/limitlessprojects/Go-Hybrid/issues/3172) 和 [#3136](https://github.com/limitlessprojects/Go-Hybrid/issues/3136)，我在自己 fork 里开了 `fix-3172-channel-send-recv-scalar-widths` 和 `fix-3136-indexed-field-scalar-widths` 两条分支逐个堵（[其中一个修复](https://github.com/3y3y3y-huaiji/Go-Hybrid/commit/b4a451fc7f714b378abbb1c32a93ca396877b5b9)）。

顺手还清了一批 set[T] 和 option 的烂账：index、slice、cap、close、clear、copy 作用在 set[T] 上本该报错（[#2981](https://github.com/limitlessprojects/Go-Hybrid/issues/2981)），option 上调 `.pop()`、方法 arity 不对也该报（#2955），any 和 recover() 隐式赋给具体类型以前是直接放过的（#2962）。commit message 里 `fixes #xxxx` 排成一串，看着还挺壮观，实际每条背后都是一个能骗过检查器的反例。

**2. mobius-attention：phase attention 的又一次折腾**

信仰充值周，而且干得比较狠：把 legacy stack 整体归档，代码 reset 到最小 phase-attention 路径，eval 脚手架重新长出来，Ruff 那边 [exclude archived legacy/](https://github.com/3y3y3y-huaiji/mobius-attention/commit/c96191a157ba5fa5ad1c3d14d082e108750089d1) 之后 CI 才重新干净。

功能上补了 [harmonic_entity_phase](https://github.com/3y3y3y-huaiji/mobius-attention/commit/0be0f902097449183669244afbd164ab8f1657e8)，专治“2π 内多次更新导致实体复活”这个见鬼的现象；又加了个[不拷贝权重的端到端 learned-gate PoC](https://github.com/3y3y3y-huaiji/mobius-attention/commit/bf0b3b7c6e6b6dfe9b3bbe778bab65f9222d228d)（run_learned_poc.py）。

实验数据记了 Qwen2.5-0.5B 的 E2 oracle-boundary，还有 Qwen3-0.6B 和 Qwen3.5-0.8B 的 Kaggle E2 reversal 结果。最开心的是 Qwen3.5-0.8B entity_segment 那一组 4 条**预注册**标准全过——看到 preregistered criteria all passing 的时候，确实在屏幕前面挥了一下拳头。

**3. mathlib4 和一点零碎**

fork 里开 `feat/odd-field-zero-node` 分支折腾 Topology/Order/Antipodal，把 IsOddMap 相关定理 golf 了一遍，然后被 Lean4 教育了半天：模块 docstring 必须放 public section 前面，import 之间要空行，漏了就直接报错给你看。就……很 Lean。

另外给自己仓库 net-tools 提了 PR #1，chore 级别，格式化 spec markdown，居然成了本周唯一合并的 PR。

## PR 与协作

开了 3 个 PR：[#3139](https://github.com/limitlessprojects/Go-Hybrid/pull/3139) 和 [#3179](https://github.com/limitlessprojects/Go-Hybrid/pull/3179) 都在 limitlessprojects/Go-Hybrid，分别对应索引/字段宽度和 channel 收发宽度。诚实地说，这两个目前都是 closed 未合并状态，之后怎么改还没聊定。issue 主要在 [#3172](https://github.com/limitlessprojects/Go-Hybrid/issues/3172)、#3136、#2981 里评论跟进，#2962 和 #2978 的老帖也补了评论。自己新开的 issue 是 0。review 别人的 PR 数量也是 0——这周真没顾上，先欠着。

## 踩坑与修复

说个最具体的：E1002 的报错一度是“哑”的。`emit_e1002` 当初收的是 String 而不是 `&str`，option 方法检查里想把带上下文的 note 传进去都传不进去，报错就一句干巴巴的类型错误，debug 时完全看不出是哪条路径触发的。修法很朴素：把相关调用点统一改成传 `&str` note，MapLit 的 value 渲染顺手一起修了，过程中还经历了几次“改了 A 坏 B、回滚再来”的循环。教训就是：诊断信息的传参方式一开始要定好，不然每个调用点都要回来补课。

另一个坑是提交记录鬼打墙。activity 里躺着一堆 message 一模一样、SHA 各不相同的 commit，时间戳密密麻麻——问就是 rebase 的锅（也可能不是，但我不太想承认是手滑）。下周争取一次推对。

## 数字

- commits：37
- PR：开 3、合 1、review 0
- 仓库：6 个
- release：0
- 活跃天数：6/7

## 下周打算

1. 盯 #3139 和 #3179 的后续，该改的改，改完 push 要趁早，别再拖到周日晚。
2. mobius-attention 把 Qwen3.5 的结果正式写进 RESEARCH_PLAN，然后想清楚 harmonic_entity_phase 到底是局部技巧还是值得推广。
3. mathlib4 的 odd-field-zero-node 争取收尾出 PR，别烂尾。

周报写完了，bug 还遥遥无期——但至少咖啡是热的。

---

*本文由 Step 5 Preview 根据我本周的 GitHub 公开活动自动整理，数据和链接均来自 GitHub。*
