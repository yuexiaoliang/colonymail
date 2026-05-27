const nodemailer = require('nodemailer');

class Sender {
  constructor(config) {
    this.transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure ?? true,
      auth: {
        user: config.user,
        pass: config.pass
      }
    });
  }

  async send({ to, cc, bcc, subject, text, html, attachments = [] }) {
    const info = await this.transporter.sendMail({
      from: this.transporter.options.auth.user,
      to,
      cc,
      bcc,
      subject,
      text,
      html,
      attachments: attachments.map(att => {
        if (typeof att === 'string') {
          return { path: att };
        }
        return att;
      })
    });
    return {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected
    };
  }
}

module.exports = Sender;
