# <picture><source media="(prefers-color-scheme: dark)" srcset="docs/references/badges/openchamber-logo-dark.svg"><img src="docs/references/badges/openchamber-logo-light.svg" width="32" height="32" align="absmiddle" /></picture> OpenChamber

[![GitHub stars](https://img.shields.io/github/stars/openchamber/openchamber?style=flat&labelColor=100F0F&color=66800B)](https://github.com/openchamber/openchamber/stargazers)
[![GitHub release](https://img.shields.io/github/v/release/openchamber/openchamber?style=flat&labelColor=100F0F&color=205EA6)](https://github.com/openchamber/openchamber/releases/latest)
[![Discord](https://img.shields.io/badge/Discord-join.svg?style=flat&labelColor=100F0F&color=8B7EC8&logo=discord&logoColor=FFFCF0)](https://discord.gg/ZYRSdnwwKA)
[![Support the project](https://img.shields.io/badge/Support-Project-black?style=flat&labelColor=100F0F&color=EC8B49&logo=patreon&logoColor=FFFCF0)](https://www.patreon.com/openchamber)

<a href="https://www.blacksmith.sh/"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/references/badges/blacksmith-dark.svg"><img src="docs/references/badges/blacksmith-light.svg" height="28" alt="CI 由 Blacksmith 提供支持" /></picture></a>

## 运行智能体工作。掌控全程。随处交付。

**OpenChamber 是一个开源工作区，用于在桌面端、网页端、VS Code 和移动端运行并审查 AI 编程工作。**

启动智能体任务，查看改动内容，并走完审查与发布流程。切换设备或暂时离开时，你的项目和会话依然保持可用。

<picture><source media="(prefers-color-scheme: dark)" srcset="docs/references/desktop_dark.png"><img src="docs/references/desktop_light.png" alt="OpenChamber 桌面应用"></picture>

<details>
<summary>更多截图</summary>

![VS Code 扩展](packages/vscode/extension.jpg)

<p>
<picture><source media="(prefers-color-scheme: dark)" srcset="docs/references/mobile/new_session_dark.png"><img src="docs/references/mobile/new_session_light.png" width="30%" alt="OpenChamber 移动端新会话"></picture>
<picture><source media="(prefers-color-scheme: dark)" srcset="docs/references/mobile/chat_dark.png"><img src="docs/references/mobile/chat_light.png" width="30%" alt="OpenChamber 移动端聊天"></picture>
<picture><source media="(prefers-color-scheme: dark)" srcset="docs/references/mobile/context_usage_dark.png"><img src="docs/references/mobile/context_usage_light.png" width="30%" alt="OpenChamber 移动端上下文与用量"></picture>
</p>

</details>

## 你可以用 OpenChamber 做什么

### 自动持续推进的目标

用**会话目标（Session Goals）**为会话设定终点。OpenChamber 会在每一轮结束后检查结果，并让智能体持续工作，直到达成目标、遇到阻塞或达到你设置的上限。即使你关闭应用，它也能继续运行。

### 对比并合并多次运行

使用**多路运行（Multi-run）**把同一个任务交给最多五个模型，各自在独立的会话中运行，也可以使用各自独立的 worktree。看看每个模型实际构建出了什么，挑选最佳结果，或使用**融合（Fusion）**把最强的部分合并成一个新的会话。

### 引导式变更导览

**变更导览（Changes Walkthrough）**会把一份大型 diff 变成由 AI 引导的变更讲解。它把相关编辑分组为步骤，按照变更的合理顺序排列，并解释各个部分是如何协同工作的。

### 检查运行中的应用

通过**预览（Preview）**在对话旁边打开你的应用。指向某个元素，即可把它的截图、样式、位置和浏览器报错一并发送给智能体。再也不用费力解释“就是这里这个东西”。桌面应用还能通过内置浏览器对任意网页执行同样的操作。

### 从 issue 到 pull request 的 GitHub 上下文

从 GitHub issue 或 pull request 发起会话，并自动附带上下文。可以把失败的检查或审查评论发回给智能体，然后直接在 OpenChamber 中更新或合并 pull request。

### 在其他设备上继续

通过桌面端、网页/PWA、VS Code、iOS 或 Android 打开相同的项目和会话。查看进度、回答提问、审查改动，并重新接入正在运行的终端。

### 私有远程访问

通过一次性二维码配对设备，并借助**私有中继（Private Relay）**进行连接，无需开放端口或暴露公网服务器。连接采用端到端加密，且可随时撤销。同时也支持直连、局域网/VPN 访问、Cloudflare/Ngrok 隧道以及 SSH。

### 跨项目跟踪工作

查看哪些会话正在运行、等待、已完成或已失败，以及审批、定时任务、服务商限额、token 用量和费用。把会话整理进文件夹，并把笔记、待办事项和可复用的项目操作放在手边。

### 定时执行周期性工作

按单次、每天、每周或 cron 计划运行一个提示词。定时任务可以使用会话目标，因此它们会朝着结果持续推进，而不是在一次回复后便停止。

## 在你工作的地方使用它

| 使用端 | 定位 |
| --- | --- |
| **桌面端** | 面向 macOS、Windows 和 Linux 的完整工作区，支持多窗口、Mini Chat、远程机器、SSH 和原生通知 |
| **网页 / PWA** | 在浏览器中打开工作区，将其安装为应用，并通过后台通知随时掌握最新动态 |
| **VS Code** | 让会话与代码并存，把选中的内容发给智能体，在编辑器中打开结果，并比较并行运行的结果 |
| **iOS / Android** | 离开工位也能审查和把控工作，接收完成提醒，并通过触控操作使用终端 |
| **CLI / 服务器** | 在工作站或服务器上运行 OpenChamber，安排任务、管理远程访问，并在登录后保持可用 |

## 快速开始

### 适用于 macOS、Windows 和 Linux 的桌面端

从 [GitHub Releases](https://github.com/openchamber/openchamber/releases/latest) 下载最新版本。桌面端已内置匹配的 OpenCode CLI，无需单独安装 OpenCode。

Linux 版本提供 x86_64 和 ARM64 架构的 `.deb`（Debian、Ubuntu）、`.rpm`（Fedora、openSUSE）以及 AppImage。软件包会把 OpenChamber 安装进应用菜单，应用内更新时会要求输入密码来安装新软件包：

```bash
sudo apt install ./OpenChamber-*-linux-amd64.deb    # Debian, Ubuntu
sudo dnf install ./OpenChamber-*-linux-x86_64.rpm   # Fedora
```

AppImage 无需安装。赋予其可执行权限，并保存在可写位置以便应用内更新；首次启动时它会把自己添加到应用菜单：

```bash
chmod +x OpenChamber-*.AppImage
./OpenChamber-*.AppImage
```

Linux AppImage 需要 FUSE（`libfuse.so.2`）。没有 FUSE 时，可使用 `APPIMAGE_EXTRACT_AND_RUN=1` 运行。

### VS Code

从 [Visual Studio Marketplace 安装 OpenChamber](https://marketplace.visualstudio.com/items?itemName=fedaykindev.openchamber)，或在扩展面板中搜索“OpenChamber”。

### 面向网页端和 PWA 的 CLI

需要 Node.js 24.14 或更高版本。CLI/网页端和 VS Code 都会使用你已安装的 [OpenCode CLI](https://opencode.ai)。

```bash
curl -fsSL https://raw.githubusercontent.com/openchamber/openchamber/main/scripts/install.sh | bash
openchamber --ui-password be-creative-here
```

常用操作：

```bash
openchamber status
openchamber connect-url --qr
openchamber tunnel start --provider cloudflare --mode quick --qr
openchamber startup enable
openchamber logs
openchamber stop
openchamber update
```

OpenChamber 默认绑定到 localhost。请仅在可信网络中使用 `--lan`，并使用 `--ui-password` 保护浏览器访问。

## 指南

通过 OpenChamber 指南深入了解：

- [快速开始](packages/docs/content/docs/quickstart.mdx)
- [安装](packages/docs/content/docs/install.mdx)
- [连接设备](packages/docs/content/docs/connect-devices.mdx)
- [私有中继（Private Relay）](packages/docs/content/docs/private-relay.mdx)
- [多路运行（Multi-run）](packages/docs/content/docs/multi-run.mdx)
- [会话目标（Session Goals）](packages/docs/content/docs/session-goals.mdx)
- [变更导览（Changes Walkthrough）](packages/docs/content/docs/walkthrough.mdx)
- [预览与开发服务器](packages/docs/content/docs/preview.mdx)
- [GitHub 工作流](packages/docs/content/docs/github.mdx)
- [移动端](packages/docs/content/docs/mobile.mdx)
- [安全](packages/docs/content/docs/security.mdx)
- [故障排除](packages/docs/content/docs/troubleshooting.mdx)

自托管的详细说明请参阅[反向代理指南](docs/REVERSE_PROXY.md)。自定义主题的制作请参阅[自定义主题指南](docs/CUSTOM_THEMES.md)。

## 为什么选择 OpenCode？

OpenChamber 使用 [OpenCode](https://opencode.ai) 来运行编程智能体。我们选择它是因为它开源、API 稳固且易于扩展。

OpenChamber 负责工作流的其余部分：你可以决定要尝试什么，让智能体保持在正轨上，审查结果，从其他设备接入，并交付变更。

OpenChamber 是一个独立项目，与 OpenCode 团队没有隶属关系。

## 参与贡献

欢迎通过 PR 提交 bug 修复和小型改进。新功能和行为变更请先在 [Ideas 讨论](https://github.com/openchamber/openchamber/discussions/categories/ideas)中发起，以便在任何人动手写代码之前先就产品方向达成共识。提交 PR 前请先阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)，其中包含环境搭建、审查约定，以及大型无计划 PR 的处理方式。文档撰写指南位于 [`packages/docs`](packages/docs/README.md)。

Bug 请提交到 [issues](https://github.com/openchamber/openchamber/issues/new/choose)。疑问请前往 [Q&A 讨论](https://github.com/openchamber/openchamber/discussions/categories/q-a)。

## 致谢

特别感谢：

- [OpenCode](https://opencode.ai) —— 提供了 OpenChamber 赖以构建的 API 与开源架构
- [Pierre](https://pierrejs-docs.vercel.app/) —— 提供 diff 查看器和语法高亮
- [T3 Code](https://github.com/pingdotgg/t3code) 团队 —— 提供了 [libghostty-vt](https://github.com/ghostty-org/ghostty) 的浏览器适配器，我们的终端正是基于它构建
- [Yulia Ivashko](https://github.com/yulia-ivashko) —— 制作了每次成功推送时播放的烟花庆祝动画
- 所有贡献代码、报告 bug 或分享想法的人

## 许可证

MIT
