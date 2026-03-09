const nodemailer = require('nodemailer');
const { env } = require('../config/env');

let transporter;

const isMailerConfigured = () => {
  return Boolean(env.smtpHost && env.smtpPort && env.smtpFrom);
};

const getTransporter = () => {
  if (transporter) {
    return transporter;
  }

  const transportConfig = {
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
  };

  if (env.smtpUser && env.smtpPass) {
    transportConfig.auth = {
      user: env.smtpUser,
      pass: env.smtpPass,
    };
  }

  transporter = nodemailer.createTransport(transportConfig);
  return transporter;
};

const sendEmail = async ({ to, subject, text, html }) => {
  if (!isMailerConfigured() || env.isTest) {
    return { skipped: true };
  }

  const mailOptions = {
    from: env.smtpFrom,
    to,
    subject,
    text,
    html,
  };

  if (env.smtpReplyTo) {
    mailOptions.replyTo = env.smtpReplyTo;
  }

  await getTransporter().sendMail(mailOptions);
  return { skipped: false };
};

module.exports = {
  isMailerConfigured,
  sendEmail,
};
