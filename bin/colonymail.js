#!/usr/bin/env node
const minimist = require('minimist');
const path = require('path');
const fs = require('fs');
const os = require('os');

const GLOBAL_DIR = path.join(os.homedir(), '.config', 'colonymail');
const GLOBAL_ENV = path.join(GLOBAL_DIR, '.env');

// 加载顺序：当前目录 .env 优先，然后是全局配置
require('dotenv').config();
if (fs.existsSync(GLOBAL_ENV)) {
  require('dotenv').config({ path: GLOBAL_ENV });
}

const MailAgent = require('../index');

function loadConfig() {
  return {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
    imap: {
      host: process.env.IMAP_HOST || 'imap.example.com',
      port: parseInt(process.env.IMAP_PORT, 10) || 993,
      secure: process.env.IMAP_SECURE !== 'false'
    },
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.example.com',
      port: parseInt(process.env.SMTP_PORT, 10) || 465,
      secure: process.env.SMTP_SECURE !== 'false'
    }
  };
}

function out(data) {
  console.log(JSON.stringify(data, null, 2));
}

function fail(msg, code = 1) {
  console.error(JSON.stringify({ error: msg }, null, 2));
  process.exit(code);
}

const { version } = require('../package.json');

const argv = minimist(process.argv.slice(2));
const cmd = argv._[0];

if (argv.version || argv.v) {
  console.log(version);
  process.exit(0);
}

if (!cmd || cmd === 'help' || argv.help || argv.h) {
  console.log(`colonymail - Agent-friendly email CLI

Usage:
  colonymail <command> [options]

Commands:
  send [options]              Send an email
  fetch-unread [options]      Fetch unread emails
  fetch-all [options]         Fetch all emails
  mark-read --uid <n[,n...]>  Mark email(s) as read
  mark-unread --uid <n[,n...]> Mark email(s) as unread
  delete --uid <n[,n...]>     Delete email(s)
  whoami                      Show current config (email, servers)
  setup                       Copy .env to ~/.config/colonymail/

Send options:
  --to <email>                Recipient (required)
  --subject <text>            Subject (required)
  --text <text>               Plain text body
  --html <text>               HTML body
  --cc <email>                CC recipient
  --bcc <email>               BCC recipient
  --attachments <paths>       Comma-separated file paths
  --json <json>               Full payload as JSON (overrides others)

Fetch options:
  --limit <n>                 Max results (default: 10)

Options:
  --version, -v               Show version
  --help, -h                  Show help

Examples:
  colonymail send --to a@b.com --subject hi --text hello
  colonymail send --json '{"to":"a@b.com","subject":"hi"}'
  colonymail fetch-unread --limit 5
  colonymail mark-read --uid 12

Config:
  Global: ~/.config/colonymail/.env
  Local:  ./.env (takes precedence)
  Env:    MAIL_USER, MAIL_PASS, IMAP_HOST, IMAP_PORT, IMAP_SECURE, SMTP_HOST, SMTP_PORT, SMTP_SECURE
`);
  process.exit(0);
}

async function main() {
  if (cmd === 'whoami') {
    const config = loadConfig();
    const configSource = process.env.MAIL_USER ? 'env' : (fs.existsSync(path.resolve('.env')) ? 'local' : (fs.existsSync(GLOBAL_ENV) ? 'global' : 'none'));
    out({
      success: true,
      email: config.user || null,
      configSource,
      imap: config.user ? { host: config.imap.host, port: config.imap.port, secure: config.imap.secure } : null,
      smtp: config.user ? { host: config.smtp.host, port: config.smtp.port, secure: config.smtp.secure } : null
    });
    return;
  }

  if (cmd === 'setup') {
    if (!fs.existsSync(GLOBAL_DIR)) {
      fs.mkdirSync(GLOBAL_DIR, { recursive: true });
    }
    const localEnv = path.resolve('.env');
    if (fs.existsSync(localEnv)) {
      fs.copyFileSync(localEnv, GLOBAL_ENV);
      out({ success: true, message: `Config copied to ${GLOBAL_ENV}` });
    } else {
      fs.writeFileSync(GLOBAL_ENV, 'MAIL_USER=\nMAIL_PASS=\nIMAP_HOST=imap.example.com\nIMAP_PORT=993\nIMAP_SECURE=true\nSMTP_HOST=smtp.example.com\nSMTP_PORT=465\nSMTP_SECURE=true\n');
      out({ success: true, message: `Template created at ${GLOBAL_ENV}. Please edit it.` });
    }
    return;
  }

  const config = loadConfig();
  if (!config.user || !config.pass) {
    fail('Missing MAIL_USER or MAIL_PASS. Run "colonymail setup" from a directory with .env, or set env vars.');
  }

  const agent = new MailAgent(config);

  switch (cmd) {
    case 'send': {
      let payload;
      if (argv.json) {
        try {
          payload = JSON.parse(argv.json);
        } catch (e) {
          fail('Invalid JSON: ' + e.message);
        }
      } else {
        if (!argv.to) fail('Missing --to');
        if (!argv.subject) fail('Missing --subject');
        payload = {
          to: argv.to,
          cc: argv.cc,
          bcc: argv.bcc,
          subject: argv.subject,
          text: argv.text || '',
          html: argv.html || '',
          attachments: argv.attachments ? argv.attachments.split(',').map(s => s.trim()).filter(Boolean) : []
        };
      }
      const res = await agent.send(payload);
      out({ success: true, result: res });
      break;
    }

    case 'fetch-unread': {
      const limit = parseInt(argv.limit, 10) || 10;
      const mails = await agent.fetchUnread({ limit });
      out({ success: true, count: mails.length, mails });
      break;
    }

    case 'fetch-all': {
      const limit = parseInt(argv.limit, 10) || 10;
      const mails = await agent.fetchAll({ limit });
      out({ success: true, count: mails.length, mails });
      break;
    }

    case 'mark-read': {
      if (!argv.uid) fail('Missing --uid');
      const uids = argv.uid.toString().split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
      await agent.markRead(uids.length === 1 ? uids[0] : uids);
      out({ success: true, uid: uids, action: 'mark-read' });
      break;
    }

    case 'mark-unread': {
      if (!argv.uid) fail('Missing --uid');
      const uids = argv.uid.toString().split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
      await agent.markUnread(uids.length === 1 ? uids[0] : uids);
      out({ success: true, uid: uids, action: 'mark-unread' });
      break;
    }

    case 'delete': {
      if (!argv.uid) fail('Missing --uid');
      const uids = argv.uid.toString().split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
      await agent.deleteMessage(uids.length === 1 ? uids[0] : uids);
      out({ success: true, uid: uids, action: 'delete' });
      break;
    }

    default:
      fail(`Unknown command: ${cmd}. Run "colonymail" for help.`);
  }
}

main().catch(e => fail(e.message));
