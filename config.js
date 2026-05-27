require('dotenv').config();

module.exports = {
  user: process.env.MAIL_USER,
  pass: process.env.MAIL_PASS,
  imap: {
    host: process.env.IMAP_HOST,
    port: parseInt(process.env.IMAP_PORT, 10) || 993,
    secure: process.env.IMAP_SECURE !== 'false'
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 465,
    secure: process.env.SMTP_SECURE !== 'false'
  }
};
