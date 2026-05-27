---
name: colonymail
description: 通过 colonymail CLI 收发邮件、处理验证码、注册账号、找回密码等 IMAP/SMTP 邮件操作。
metadata:
  author: yuexiaoliang
  version: '1.0.0'
---

# colonymail CLI

本 skill 用于通过 `colonymail` 命令行工具帮助 Agent 完成邮件收发任务。

## 触发场景

当用户提出以下需求时，应优先使用本 skill：

- 发送邮件、接收邮件、查询邮件内容
- 使用邮箱注册网站账号
- 接收邮箱验证码、填写验证码
- 验证邮箱地址、激活账号
- 通过邮件找回密码、重置密码
- 轮询未读邮件、处理邮件通知
- 下载邮件附件、管理邮件状态（标记已读/未读/删除）
- 任何涉及 IMAP/SMTP 协议的邮件操作

## 安装

```bash
npm install -g colonymail
colonymail setup
```

## 查看已绑定邮箱

```bash
colonymail whoami
```

返回示例：

```json
{
  "success": true,
  "email": "your@domain.com",
  "configSource": "global",
  "imap": {
    "host": "imap.example.com",
    "port": 993,
    "secure": true
  },
  "smtp": {
    "host": "smtp.example.com",
    "port": 465,
    "secure": true
  }
}
```

- `email`：当前绑定的邮箱地址
- `configSource`：配置来源（`env` 环境变量 / `local` 当前目录 `.env` / `global` 全局配置 / `none` 未配置）
- 该命令不需要邮箱密码即可执行，方便快速确认当前使用的账号

## 前置检查

在使用邮件功能前，Agent 应先执行以下检查。

### 1. 检查全局命令是否可用

```bash
which colonymail
```

- 正常：返回类似 `/usr/local/bin/colonymail`
- 异常：未找到命令，需要执行 `npm install -g colonymail`

### 2. 快速连通性测试

```bash
colonymail fetch-unread --limit 1
```

- 正常：返回 JSON（即使 `count: 0` 也说明配置正确）
- 异常：返回 `Missing MAIL_USER or MAIL_PASS` 或连接超时，需要执行 `colonymail setup` 或手动创建 `~/.config/colonymail/.env`

如果以上检查全部通过，再执行具体的收发任务。

## 配置文件格式

文件位置：`~/.config/colonymail/.env`

```
MAIL_USER=your@domain.com
MAIL_PASS=your-password
IMAP_HOST=imap.example.com
IMAP_PORT=993
IMAP_SECURE=true
SMTP_HOST=smtp.example.com
SMTP_PORT=465
SMTP_SECURE=true
```

配置优先级：环境变量 > 当前目录 `.env` > `~/.config/colonymail/.env`。

## 命令一览

**Agent 在使用任何命令前，应先执行 `colonymail -h` 获取当前 CLI 支持的所有命令及参数。** 以下仅为使用模式的参考，具体命令和选项以 help 输出为准。

所有命令均输出 JSON，方便程序解析。

### 发送邮件

最佳实践是通过 `--json` 传入完整 payload：

```bash
colonymail send --json '{"to":"user@example.com","subject":"标题","text":"正文"}'
```

返回结构（参考）：
```json
{
  "success": true,
  "result": {
    "messageId": "<xxx@domain.com>",
    "accepted": ["user@example.com"],
    "rejected": []
  }
}
```

### 接收邮件

常用命令（参考）：
- `colonymail fetch-unread --limit <n>` — 获取未读邮件
- `colonymail fetch-all --limit <n>` — 获取所有邮件

返回结构（参考）：
```json
{
  "success": true,
  "count": 2,
  "mails": [
    {
      "uid": 15,
      "subject": "邮件标题",
      "from": "sender@example.com",
      "to": ["your@domain.com"],
      "date": "2026-05-27T08:00:00.000Z",
      "text": "纯文本正文...",
      "html": "<p>HTML 正文...</p>",
      "flags": ["\\Seen"],
      "attachments": [
        { "filename": "doc.pdf", "contentType": "application/pdf", "size": 12345 }
      ]
    }
  ]
}
```

### 邮件状态管理

常用命令（参考）：
- `colonymail mark-read --uid <n[,n...]>`
- `colonymail mark-unread --uid <n[,n...]>`
- `colonymail delete --uid <n[,n...]>`

返回结构（参考）：
```json
{ "success": true, "uid": [15, 16], "action": "mark-read" }
```

## 常见工作流

Agent 可参考 CLI 的 `Examples` 部分了解基础用法，以下只描述业务思路：

1. **发送结果报告**：使用 `send` 命令，通过 `--json` 传入收件人、主题、正文及附件路径。
2. **轮询未读并处理**：使用 `fetch-unread` 获取未读邮件，处理完成后用 `mark-read` 标记已读。
3. **回复特定邮件**：先用 `fetch-unread`/`fetch-all` 找到目标邮件 uid 和发件人，再用 `send` 回复（subject 前加 `Re:`），最后用 `mark-read` 标记原邮件已读。

## 注意事项

- 所有命令均返回 JSON，错误时 exit code 非 0
- `uid` 是邮件的唯一标识，由 IMAP 服务器分配，同一邮件在不同会话中 uid 不变
- `fetch-unread` 默认按时间倒序返回
- 附件传入 `--attachments` 时使用绝对路径最可靠
- 如果邮箱开启了二次验证，需要使用专用密码或授权码填入 `MAIL_PASS`
