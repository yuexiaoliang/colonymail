---
name: colonymail
title: Mail Agent CLI
description: 通过全局 CLI colonymail 收发邮件，通过 IMAP/SMTP 协议工作。
---

# Mail Agent CLI

本 skill 用于通过 `colonymail` 命令行工具帮助 Agent 完成邮件收发任务。

## 安装

```bash
npm install -g colonymail
colonymail setup
```

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

所有命令输出均为 JSON，方便程序解析。

### 发送邮件

```bash
# 基础用法
colonymail send --to <email> --subject <text> --text <body>

# 完整参数
colonymail send \
  --to "recipient@example.com" \
  --cc "cc@example.com" \
  --bcc "bcc@example.com" \
  --subject "邮件标题" \
  --text "纯文本正文" \
  --html "<p>HTML 正文</p>" \
  --attachments "/path/to/file1.pdf,/path/to/file2.jpg"

# Agent 最佳实践：通过 JSON 传入整体 payload
colonymail send --json '<JSON字符串>'
```

示例：
```bash
colonymail send --json '{
  "to": "user@example.com",
  "subject": "任务完成通知",
  "text": "您的任务已完成，请查收。",
  "attachments": ["/tmp/report.pdf"]
}'
```

返回示例：
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

```bash
# 获取未读邮件（默认最多 10 封）
colonymail fetch-unread --limit <n>

# 获取所有邮件
colonymail fetch-all --limit <n>
```

返回示例：
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

```bash
colonymail mark-read --uid <n[,n...]>
colonymail mark-unread --uid <n[,n...]>
colonymail delete --uid <n[,n...]>
```

返回示例：
```json
{ "success": true, "uid": [15, 16], "action": "mark-read" }
```

## 常见工作流

### 工作流 1：发送结果报告

```bash
colonymail send --json '{
  "to": "boss@company.com",
  "subject": "每日报告 - '今天'",
  "text": "今日任务已全部完成，详情见附件。",
  "attachments": ["/tmp/daily-report.pdf"]
}'
```

### 工作流 2：轮询未读并处理

```bash
# 1. 获取未读
mails=$(colonymail fetch-unread --limit 10)

# 2. 遍历并处理（通过脚本或代码）
# 3. 处理完成后标记已读
colonymail mark-read --uid <uid>
```

### 工作流 3：回复特定邮件

```bash
# 先获取邮件列表找到对应 uid
colonymail fetch-unread --limit 5

# 然后回复（发信时在 subject 前加 Re: 并引用原文）
colonymail send --json '{
  "to": "original-sender@example.com",
  "subject": "Re: 原标题",
  "text": "感谢您的邮件。\n\n--- 原邮件 ---\n...原文..."
}'

# 最后标记原邮件已读
colonymail mark-read --uid <original-uid>
```

## 注意事项

- 所有命令均返回 JSON，错误时 exit code 非 0
- `uid` 是邮件的唯一标识，由 IMAP 服务器分配，同一邮件在不同会话中 uid 不变
- `fetch-unread` 默认按时间倒序返回
- 附件传入 `--attachments` 时使用绝对路径最可靠
- 如果邮箱开启了二次验证，需要使用专用密码或授权码填入 `MAIL_PASS`
