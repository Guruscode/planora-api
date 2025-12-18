import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class ZeptomailService {
  private readonly logger = new Logger(ZeptomailService.name);
  private readonly client: AxiosInstance;
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor(private configService: ConfigService) {
    const token = this.configService.get<string>('ZEPTOMAIL_TOKEN');
    this.fromEmail = this.configService.get<string>('ZEPTOMAIL_FROM_EMAIL') || 'noreply@planorra.com';
    this.fromName = this.configService.get<string>('ZEPTOMAIL_FROM_NAME') || 'PlanOrra';

    if (!token) {
      throw new Error('ZEPTOMAIL_TOKEN is required');
    }

    this.client = axios.create({
      baseURL: 'https://api.zeptomail.com/v1.1/email',
      headers: {
        'Authorization': token.startsWith('Zoho-enczapikey') ? token : `Zoho-enczapikey ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    this.logger.log('Zeptomail service initialized');
  }

  private log(msg: string) {
    this.logger.log(msg);
  }

  private error(msg: string, trace?: any) {
    this.logger.error(msg, trace);
  }

  async sendOtp(email: string, otp: string, fullName?: string) {
    const subject = 'Your PlanOrra Verification Code';
    const name = fullName?.split(' ')[0] || 'there';

    const html = this.getOtpHtml(otp, name);
    const text = this.getOtpText(otp, name);

    return this.send({
      to: email,
      subject,
      htmlbody: html,
      textbody: text,
    });
  }

  private async send(payload: any): Promise<boolean> {
    try {
      const response = await this.client.post('', {
        from: { address: this.fromEmail, name: this.fromName },
        to: [{ email_address: { address: payload.to } }],
        subject: payload.subject,
        htmlbody: payload.htmlbody,
        textbody: payload.textbody,
      });

      this.log(`OTP email sent to ${payload.to}`);
      return true;
    } catch (error: any) {
      this.error(`Failed to send email to ${payload.to}`, error.response?.data || error.message);
      return false;
    }
  }

  private getOtpHtml(otp: string, name: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your PlanOrra Account</title>
  <style>
    body { font-family: 'Segoe UI', sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #6b46c1, #9f7aea); padding: 40px 30px; text-align: center; color: white; }
    .logo { font-size: 32px; font-weight: bold; }
    .content { padding: 40px 30px; text-align: center; }
    .otp { font-size: 48px; font-weight: bold; letter-spacing: 15px; background: #f3e8ff; color: #6b46c1; padding: 20px; border-radius: 12px; margin: 30px 0; }
    .footer { background: #1a1a1a; color: #888; padding: 30px; text-align: center; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">PlanOrra</div>
      <h2>Email Verification</h2>
    </div>
    <div class="content">
      <h2>Hey ${name}!</h2>
      <p>Use this code to verify your email and start creating amazing events:</p>
      <div class="otp">${otp}</div>
      <p><strong>Expires in 10 minutes</strong></p>
      <p>If you didn't request this, just ignore this email.</p>
    </div>
    <div class="footer">
      © 2025 PlanOrra • Made with love for event creators
    </div>
  </div>
</body>
</html>`;
  }

  private getOtpText(otp: string, name: string): string {
    return `
PlanOrra - Email Verification

Hey ${name}!

Your verification code is: ${otp}

This code expires in 10 minutes.

If you didn't sign up, ignore this email.

© 2025 PlanOrra
    `.trim();
  }
async sendLoginCode(email: string, orgName: string, code: string, role: string) {
  const subject = `Your PlanOrra Login Code — ${orgName}`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:40px auto;background:white;padding:40px;border-radius:20px;text-align:center">
      <h1 style="color:#6b46c1">PlanOrra</h1>
      <h2>You've been invited to <strong>${orgName}</strong> as <strong>${role}</strong></h2>
      <div style="background:#f0e6ff;padding:40px;border-radius:20px;margin:40px 0">
        <h1 style="font-size:60px;letter-spacing:15px;color:#6b46c1">${code}</h1>
        <p style="font-size:18px">Use this code as your password to log in</p>
      </div>
      <p>Go to login → enter your email → use <strong>${code}</strong> as password</p>
      <p style="color:#666">Code expires in 30 minutes</p>
    </div>`;

  await this.send({
    to: email,
    subject,
    htmlbody: html,
    textbody: `Your PlanOrra login code: ${code} (expires in 30 min)`,
  });
}
}