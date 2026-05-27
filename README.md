# colonymail

Agent 友好的邮件收发 CLI，通过 IMAP/SMTP 协议工作，支持任意邮箱。

## 安装

```bash
npm install -g colonymail
colonymail setup  # 初始化配置文件
```

之后在任何目录都可以直接运行 `colonymail`。

## CLI 用法

所有命令输出均为 JSON，方便 Agent 解析。

### 发邮件

```bash
# 基础用法
colonymail send --to user@example.com --subject "标题" --text "正文"

# 带副本、HTML、附件
colonymail send \
  --to user@example.com \
  --cc boss@example.com \
  --subject "报告" \
  --text "请查看附件" \
  --attachments "/path/to/file.pdf,/path/to/img.png"

# Agent 最便捷的方式：整体 JSON 传参
colonymail send --json '{"to":"a@b.com","subject":"hi","text":"hello"}'
```

### 收邮件

```bash
# 获取未读
colonymail fetch-unread --limit 5

# 获取所有（包含已读）
colonymail fetch-all --limit 10
```

返回结构：
```json
{
  "success": true,
  "count": 1,
  "mails": [
    {
      "uid": 12,
      "subject": "邮件标题",
      "from": "sender@example.com",
      "to": ["me@example.com"],
      "date": "2026-05-27T00:00:00.000Z",
      "text": "纯文本正文",
      "html": "<p>HTML正文</p>",
      "attachments": [{"filename": "a.pdf", "contentType": "application/pdf", "size": 12345}]
    }
  ]
}
```

### 邮件管理

```bash
colonymail mark-read --uid 12
colonymail mark-unread --uid 12
colonymail delete --uid 12
```

## Node.js 模块用法

```js
const MailAgent = require('colonymail');

const agent = new MailAgent({
  user: 'your@email.com',
  pass: 'your-password',
  imap: { host: 'imap.example.com', port: 993 },
  smtp: { host: 'smtp.example.com', port: 465 }
});

await agent.send({ to: 'a@b.com', subject: 'hi', text: 'hello' });
const mails = await agent.fetchUnread({ limit: 5 });
await agent.markRead(mails[0].uid);
```

## 配置

优先级：环境变量 > 当前目录 `.env` > `~/.config/colonymail/.env` > 默认值

初始化全局配置：
```bash
colonymail setup
```

或手动创建 `~/.config/colonymail/.env`：
```
MAIL_USER=your@email.com
MAIL_PASS=your-password
IMAP_HOST=imap.example.com
IMAP_PORT=993
IMAP_SECURE=true
SMTP_HOST=smtp.example.com
SMTP_PORT=465
SMTP_SECURE=true
```

> `IMAP_SECURE` / `SMTP_SECURE` 设为 `false` 可关闭 TLS，用于 STARTTLS（如 587 端口）或非加密连接。
