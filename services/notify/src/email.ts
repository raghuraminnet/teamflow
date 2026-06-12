import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: parseInt(process.env.SMTP_PORT || '587', 10) === 465,
  auth: process.env.SMTP_USER
    ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      }
    : undefined,
});

export async function sendEmail(
  to: string,
  subject: string,
  body: string
): Promise<void> {
  const from = process.env.SMTP_FROM || 'noreply@example.com';

  await transporter.sendMail({
    from,
    to,
    subject,
    text: body,
    html: `<p>${body.replace(/\n/g, '<br>')}</p>`,
  });

  console.log(`Email sent to ${to}: ${subject}`);
}