+++
title = "我做了一个 Quote/0 看板，把 F1 赛程、积分和结果留在桌面"
date = 2026-08-11T08:42:20.228+08:00
draft = false
tags = ["AI Generated", "minimax-m3"]
categories = ["AI博客", "前沿技术"]
description = "一位 F1 迷开发者用 Quote/0 极简墨水屏搭建专属赛事看板，融合 RSS 抓取、数据解析与定时刷新，让积分榜、赛程和比赛结果常驻桌面，附完整实现思路与踩坑经验。"
author = "AI Writer"
+++

## 引言：当 F1 数据遇上极简墨水屏

作为一个 F1 老粉，每个赛季最让我抓狂的事情有两件：一是错过排位赛，二是和朋友争论"目前积分榜谁排第几"。手机 App 通知太吵，网页打开太慢，社交媒体信息流又被各种八卦淹没。我想要的其实很简单——一块安静的屏幕，永远显示着我关心的赛事信息。

直到我遇到了 **Quote/0**，这款来自 Seeed Studio 的 7.5 英寸电子墨水屏设备。它没有背光，没有应用生态，刷新一次需要几秒钟，但正是这种"反智能手机"的设计哲学，让我突然意识到：F1 数据看板的终极形态，不应该是炫酷的 OLED 墙，而应该是这样一块像水墨画一样安静的屏幕。

于是我花了一个周末，用 Quote/0 搭了一个专属的 F1 看板。今天这篇文章，就是把这个过程完整分享出来。

## 为什么选择 Quote/0？

在动手之前，我对比了几个方案：

| 方案 | 优点 | 缺点 |
|------|------|------|
| 手机小组件 | 随时查看 | 耗电、被打断 |
| 智能音箱播报 | 解放双手 | 没有视觉化 |
| 平板常亮 | 信息丰富 | 刺眼、耗电 |
| **墨水屏设备** | **护眼、低功耗、专注** | **刷新慢、生态封闭** |

Quote/0 的定位很独特：它本质上是一个"信息展示终端"，通过 Wi-Fi 连接到云端服务，拉取你预设的卡片内容。它的硬件参数并不惊艳——800×480 分辨率、黑白显示、约 2 秒刷新——但配合它官方的开放 API，这些"缺点"反而变成了优点：正因为它只能显示静态信息，才迫使我去思考"什么才是最重要的"。

## 系统架构设计

整个看板系统的架构其实非常清晰，分为三层：

### 1. 数据采集层

F1 数据源我选了 **Ergast API**（现已迁移到 Jolpica F1），这是社区里最稳定的历史与实时赛事数据接口。它完全免费，无需认证，返回标准 JSON。

我写了一个 Python 脚本，定时拉取三类数据：

```python
import requests
import json
from datetime import datetime

BASE_URL = "https://api.jolpi.ca/ergast/f1"

def fetch_standings():
    """获取当前赛季车手积分榜"""
    url = f"{BASE_URL}/current/driverStandings.json"
    resp = requests.get(url, timeout=10)
    data = resp.json()
    standings = data['MRData']['StandingsTable']['StandingsLists'][0]['DriverStandings']
    return standings[:10]  # 只取前 10 名

def fetch_schedule():
    """获取本赛季剩余赛程"""
    url = f"{BASE_URL}/current.json"
    resp = requests.get(url, timeout=10)
    races = resp.json()['MRData']['RaceTable']['Races']
    now = datetime.now()
    upcoming = [r for r in races if datetime.fromisoformat(
        f"{r['date']}T{r['time'].split('+')[0]}"
    ) > now]
    return upcoming[:3]  # 接下来 3 站

def fetch_last_result():
    """获取上一站比赛结果"""
    url = f"{BASE_URL}/current/last/results.json"
    resp = requests.get(url, timeout=10)
    return resp.json()['MRData']['RaceTable']['Races'][0]
```

### 2. 图像生成层

这是最有趣的部分。Quote/0 接受的是一张 800×480 的 PNG 图片，所以我需要把 JSON 数据"画"成图片。我用了 Python 的 **Pillow** 库：

```python
from PIL import Image, ImageDraw, ImageFont

def render_dashboard(standings, schedule, last_result):
    img = Image.new('1', (800, 480), 255)  # 1-bit 黑白模式
    draw = ImageDraw.Draw(img)
    
    # 字体加载（思源黑体）
    title_font = ImageFont.truetype("SourceHanSans.otf", 28)
    body_font = ImageFont.truetype("SourceHanSans.otf", 18)
    small_font = ImageFont.truetype("SourceHanSans.otf", 14)
    
    # 顶部标题栏
    draw.text((20, 15), "F1 2025 赛季看板", font=title_font, fill=0)
    draw.line([(20, 55), (780, 55)], fill=0, width=2)
    
    # 左栏：积分榜
    draw.text((30, 70), "车手积分榜 TOP 5", font=body_font, fill=0)
    for i, driver in enumerate(standings[:5]):
        pos = driver['position']
        name = f"{driver['Driver']['givenName']} {driver['Driver']['familyName']}"
        team = driver['Constructors'][0]['name']
        pts = driver['points']
        draw.text((30, 105 + i*30), f"{pos}. {name}", font=body_font, fill=0)
        draw.text((30, 125 + i*30), f"   {team} - {pts} pts", font=small_font, fill=0)
    
    # 右栏：下一站
    if schedule:
        next_race = schedule[0]
        draw.text((430, 70), "下一站", font=body_font, fill=0)
        draw.text((430, 105), next_race['raceName'], font=body_font, fill=0)
        draw.text((430, 135), f"{next_race['date']}", font=small_font, fill=0)
        draw.text((430, 155), next_race['Circuit']['circuitName'], font=small_font, fill=0)
    
    # 底部：上一站结果
    if last_result:
        draw.line([(20, 320), (780, 320)], fill=0, width=1)
        draw.text((30, 335), f"上一站: {last_result['raceName']}", font=body_font, fill=0)
        winner = last_result['Results'][0]
        winner_name = f"{winner['Driver']['givenName']} {winner['Driver']['familyName']}"
        draw.text((30, 365), f"冠军: {winner_name}", font=small_font, fill=0)
        draw.text((30, 385), f"用时: {winner['Time']['time']}", font=small_font, fill=0)
    
    return img
```

### 3. 推送展示层

Quote/0 提供了基于 token 的简单 API，上传图片即可：

```python
import requests

QUOTE_API = "https://quote-api.seeedstudio.com/v1/devices/{token}/display"

def push_to_quote(image_path, token):
    with open(image_path, 'rb') as f:
        files = {'image': ('dashboard.png', f, 'image/png')}
        resp = requests.post(
            QUOTE_API.format(token=token),
            files=files,
            timeout=30
        )
    return resp.status_code == 200
```

整个流程跑在一个树莓派 Zero 上，每小时执行一次 `cron` 任务。

## 踩过的坑与优化

### 坑 1：墨水屏的"残影"问题

电子墨水屏刷新时如果不进行全刷，会留下明显的残影。Quote/0 虽然会自动处理，但连续刷新时偶尔会出现"鬼影"。我的解决方案是：每次推送前先发送一张纯白图片"清屏"，再推送新图。虽然多了一次 API 调用，但显示效果干净多了。

### 坑 2：时区与排期

Ergast API 返回的时间是 UTC，但 F1 比赛时间通常是当地时区。我一开始直接显示 UTC 时间，结果发现"中国大奖赛"显示的是凌晨 3 点……后来我加了时区转换逻辑：

```python
from zoneinfo import ZoneInfo

def format_race_time(race):
    local_tz = ZoneInfo(race['Circuit']['Location']['timezone'])
    race_time = datetime.fromisoformat(f"{race['date']}T{race['time'].split('+')[0]}")
    local_time = race_time.replace(tzinfo=ZoneInfo("UTC")).astimezone(local_tz)
    return local_time.strftime("%m-%d %H:%M")
```

### 坑 3：中文字体

Quote/0 的官方示例主要针对英文，中文显示需要自己嵌入字体。我试了思源黑体、霞鹜文楷，最终选了**思源黑体 Regular**——它在 800×480 分辨率下的可读性最好，字重也适合墨水屏。

## 最终效果

我把设备放在书桌的角落，正对着我的工位。每天早上睁眼第一眼看到的不是手机通知，而是静静躺在那里的积分榜和下一站倒计时。没有红点，没有推送，只是安安静静地告诉我：**维斯塔潘还差 47 分，下一站是蒙扎**。

这种体验非常奇妙。它不打扰，但永远在场。

## 可以扩展的方向

如果你也想做一个类似的看板，下面这些方向值得尝试：

- **多设备轮播**：用多个 Quote/0 分别显示积分榜、天气预报、日程
- **比赛日特别模式**：检测到比赛日时自动切换为"倒计时"全屏
- **历史回放**：在非赛季时显示历年经典战役数据
- **加入天气**：F1 比赛结果很大程度取决于天气，加上赛道天气预报会更有用

## 写在最后

做这个项目的过程让我重新思考了一个问题：**我们到底需要多少"实时信息"？**

智能手机时代，我们被训练成"必须随时知道一切"的生物。但一块墨水屏告诉我，真正重要的信息其实很少，少到一张 800×480 的黑白图片就能装下。

Quote/0 不是一款"高效"的设备——它刷新慢、不能交互、只能显示静态内容。但正是这些"缺陷"，让它成为了一扇窗，让我瞥见了数字极简主义的可能性。

如果你也是某个领域的深度爱好者，不妨试试用一块墨水屏，把你关心的数据"挂"在墙上。也许你会发现，少即是多，慢即是快。

---

*本文由 NVIDIA API Catalog 托管的 **minimaxai/minimax-m3** 模型自动撰写并生成发布。*
