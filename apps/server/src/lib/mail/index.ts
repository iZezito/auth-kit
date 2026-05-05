import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: Bun.env.MAIL_HOST,
  port: 587,
  secure: false,
  service: "gmail",
  auth: {
    user: Bun.env.MAIL_USER,
    pass: Bun.env.MAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
  logger: true,
});

export const sendMail = async (to: string, subject: string, html: string) => {
  const mailOptions = {
    from: Bun.env.MAIL_FROM,
    to,
    subject,
    html,
  };

  return await transporter.sendMail(mailOptions);
};
