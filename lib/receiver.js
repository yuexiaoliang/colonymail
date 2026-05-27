const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');

class Receiver {
  constructor(config) {
    this.config = config;
  }

  _createClient() {
    return new ImapFlow({
      host: this.config.imap.host,
      port: this.config.imap.port,
      secure: this.config.imap.secure ?? true,
      auth: {
        user: this.config.user,
        pass: this.config.pass
      },
      logger: false
    });
  }

  async _fetch(criteria, options = {}) {
    const limit = options.limit || 10;
    const client = this._createClient();
    await client.connect();

    const lock = await client.getMailboxLock('INBOX');
    try {
      const uids = await client.search(criteria);
      if (uids.length === 0) return [];

      const targetUids = uids.slice(-limit);
      const messages = await client.fetch(targetUids, {
        uid: true,
        envelope: true,
        source: true,
        flags: true
      });

      const results = [];
      for await (const msg of messages) {
        const parsed = await simpleParser(msg.source);
        results.push({
          uid: msg.uid,
          subject: msg.envelope.subject || '(no subject)',
          from: this._formatAddress(msg.envelope.from),
          to: this._formatAddresses(msg.envelope.to),
          date: msg.envelope.date || new Date(),
          text: parsed.text || '',
          html: parsed.html || '',
          flags: msg.flags || [],
          attachments: parsed.attachments.map(att => ({
            filename: att.filename || 'unnamed',
            contentType: att.contentType,
            size: att.size
          }))
        });
      }

      return results.reverse();
    } finally {
      lock.release();
      await client.logout();
    }
  }

  fetchUnread(options) {
    return this._fetch({ unseen: true }, options);
  }

  fetchAll(options) {
    return this._fetch({ all: true }, options);
  }

  async markRead(uid) {
    const uids = Array.isArray(uid) ? uid : [uid];
    const client = this._createClient();
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      await client.messageFlagsAdd({ uid: uids }, ['\\Seen'], { uid: true });
      return true;
    } finally {
      lock.release();
      await client.logout();
    }
  }

  async markUnread(uid) {
    const uids = Array.isArray(uid) ? uid : [uid];
    const client = this._createClient();
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      await client.messageFlagsRemove({ uid: uids }, ['\\Seen'], { uid: true });
      return true;
    } finally {
      lock.release();
      await client.logout();
    }
  }

  async deleteMessage(uid) {
    const uids = Array.isArray(uid) ? uid : [uid];
    const client = this._createClient();
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      await client.messageDelete({ uid: uids }, { uid: true });
      return true;
    } finally {
      lock.release();
      await client.logout();
    }
  }

  _formatAddress(addrList) {
    if (!addrList || addrList.length === 0) return '';
    const a = addrList[0];
    return a.name ? `${a.name} <${a.address}>` : a.address;
  }

  _formatAddresses(addrList) {
    if (!addrList) return [];
    return addrList.map(a => a.address);
  }
}

module.exports = Receiver;
