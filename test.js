const MailAgent = require('./index');
const config = require('./config');

async function test() {
  const agent = new MailAgent(config);

  console.log('1. 测试发送邮件...');
  try {
    const sent = await agent.send({
      to: config.user,
      subject: `Mail-Agent 测试 ${new Date().toLocaleString()}`,
      text: '这是一封由 colonymail 自动发送的测试邮件。\n时间：' + new Date().toISOString()
    });
    console.log('✅ 发送成功', sent);
  } catch (err) {
    console.error('❌ 发送失败', err.message);
    console.error(err);
    return;
  }

  console.log('\n2. 等待 3 秒让邮件到达...');
  await new Promise(r => setTimeout(r, 3000));

  console.log('\n3. 读取未读邮件...');
  try {
    const mails = await agent.fetchUnread({ limit: 5 });
    console.log(`✅ 获取到 ${mails.length} 封未读邮件`);
    for (const m of mails) {
      console.log(`   [${m.uid}] ${m.subject} | from: ${m.from}`);
    }
  } catch (err) {
    console.error('❌ 读取失败', err.message);
    console.error(err);
  }
}

test();
