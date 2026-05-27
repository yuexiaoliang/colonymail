const MailAgent = require('../index');
const config = require('../config');

async function main() {
  const agent = new MailAgent(config);

  // 1. 发邮件
  console.log('Sending...');
  const sent = await agent.send({
    to: 'someone@example.com',
    subject: 'Agent 测试邮件',
    text: '这是一封由 colonymail 发送的测试邮件。'
  });
  console.log('Sent:', sent);

  // 2. 获取未读邮件
  console.log('\nFetching unread...');
  const mails = await agent.fetchUnread({ limit: 5 });
  for (const mail of mails) {
    console.log(`- [${mail.uid}] ${mail.subject} | from: ${mail.from}`);
    console.log(`  text: ${mail.text.substring(0, 100)}...`);
  }

  // 3. 标记第一封为已读（如果有）
  if (mails.length > 0) {
    await agent.markRead(mails[0].uid);
    console.log(`\nMarked ${mails[0].uid} as read.`);
  }
}

main().catch(console.error);
