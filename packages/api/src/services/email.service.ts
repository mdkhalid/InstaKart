import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.resend.com",
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
});

const EMAIL_FROM = process.env.EMAIL_FROM || "noreply@instamart.com";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async ({ to, subject, html }: EmailOptions) => {
  try {
    await transporter.sendMail({
      from: `"InstaCart" <${EMAIL_FROM}>`,
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error("Email sending failed:", error);
    // Don't throw - email failures shouldn't block the main flow
  }
};

export const sendWelcomeEmail = async (email: string, firstName: string) => {
  await sendEmail({
    to: email,
    subject: "Welcome to InstaCart!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #16a34a;">Welcome to InstaCart!</h1>
        <p>Hi ${firstName},</p>
        <p>Thank you for signing up with InstaCart. We're excited to have you!</p>
        <p>Start shopping now and get your groceries delivered to your doorstep.</p>
        <a href="${process.env.CLIENT_URL || "http://localhost:3000"}"
           style="display: inline-block; padding: 12px 24px; background-color: #16a34a; color: white; text-decoration: none; border-radius: 6px;">
          Start Shopping
        </a>
      </div>
    `,
  });
};

export const sendPasswordResetEmail = async (email: string, resetToken: string) => {
  const resetUrl = `${process.env.CLIENT_URL || "http://localhost:3000"}/reset-password/${resetToken}`;
  await sendEmail({
    to: email,
    subject: "Reset Your InstaCart Password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">Reset Your Password</h2>
        <p>You requested a password reset. Click the link below to reset your password.</p>
        <p>This link will expire in 1 hour.</p>
        <a href="${resetUrl}"
           style="display: inline-block; padding: 12px 24px; background-color: #16a34a; color: white; text-decoration: none; border-radius: 6px;">
          Reset Password
        </a>
        <p style="margin-top: 20px; color: #666;">If you didn't request this, please ignore this email.</p>
      </div>
    `,
  });
};

export const sendOrderConfirmationEmail = async (
  email: string,
  firstName: string,
  orderNumber: string,
  items: { name: string; quantity: number; price: number }[],
  total: number,
  estimatedDelivery: string
) => {
  const itemsHtml = items
    .map(
      (item) =>
        `<tr><td>${item.name}</td><td>x${item.quantity}</td><td style="text-align: right;">₹${item.price.toFixed(2)}</td></tr>`
    )
    .join("");

  await sendEmail({
    to: email,
    subject: `Order Confirmed - ${orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #16a34a;">Order Confirmed!</h1>
        <p>Hi ${firstName},</p>
        <p>Your order <strong>${orderNumber}</strong> has been confirmed.</p>
        <p>Estimated delivery: <strong>${estimatedDelivery}</strong></p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="padding: 10px; text-align: left;">Item</th>
              <th style="padding: 10px;">Qty</th>
              <th style="padding: 10px; text-align: right;">Price</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
          <tfoot>
            <tr><td colspan="2" style="padding: 10px;"><strong>Total</strong></td><td style="padding: 10px; text-align: right;"><strong>₹${total.toFixed(2)}</strong></td></tr>
          </tfoot>
        </table>
      </div>
    `,
  });
};
