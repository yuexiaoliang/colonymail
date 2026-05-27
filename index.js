const Sender = require('./lib/sender');
const Receiver = require('./lib/receiver');

class MailAgent {
  constructor(config) {
    if (!config || !config.user || !config.pass) {
      throw new Error('MailAgent requires config.user and config.pass');
    }
    this.config = config;
    this.sender = new Sender(config);
    this.receiver = new Receiver(config);
  }

  send(params) {
    return this.sender.send(params);
  }

  fetchUnread(options) {
    return this.receiver.fetchUnread(options);
  }

  fetchAll(options) {
    return this.receiver.fetchAll(options);
  }

  markRead(uid) {
    return this.receiver.markRead(uid);
  }

  markUnread(uid) {
    return this.receiver.markUnread(uid);
  }

  deleteMessage(uid) {
    return this.receiver.deleteMessage(uid);
  }
}

module.exports = MailAgent;
