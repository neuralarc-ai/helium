import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// List of personal email providers to reject
const PERSONAL_EMAIL_PROVIDERS = [
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com',
  'aol.com', 'icloud.com', 'me.com', 'mac.com', 'protonmail.com',
  'tutanota.com', 'mail.com', 'yandex.com', 'zoho.com', 'fastmail.com',
  'gmx.com', 'web.de', 't-online.de', 'orange.fr', 'laposte.net',
  'libero.it', 'virgilio.it', 'terra.com.br', 'uol.com.br', 'bol.com',
  'telenet.be', 'skynet.be', 'tiscali.it', 'alice.it', 'tin.it',
  'mail.ru', 'rambler.ru', 'bk.ru', 'list.ru', 'inbox.ru',
  'rediffmail.com', 'sify.com', 'indiatimes.com', 'rediff.com',
  'rocketmail.com', 'msn.com', 'windowslive.com', 'live.co.uk',
  'btinternet.com', 'virginmedia.com', 'sky.com', 'talktalk.net',
  'ntlworld.com', 'blueyonder.co.uk', 'tiscali.co.uk', 'orange.net',
  'wanadoo.fr', 'free.fr', 'laposte.net', 'sfr.fr', 'bouygtel.fr',
  'numericable.fr', 'neuf.fr', 'club-internet.fr', 'voila.fr',
  'aliceadsl.fr', 'tele2.fr', 'noos.fr', 'cegetel.fr', '9online.fr',
  'libertysurf.fr', 'infonie.fr', 'easynet.fr', 'worldonline.fr',
  'chello.nl', 'planet.nl', 'hetnet.nl', 'xs4all.nl', 'casema.nl',
  'ziggo.nl', 'kpn.nl', 'online.nl', 'telfort.nl', 'versatel.nl',
  'chello.be', 'telenet.be', 'skynet.be', 'belgacom.be', 'scarlet.be',
  'proximus.be', 'mobistar.be', 'base.be', 'orange.be', 'telenet.be',
  'skynet.be', 'belgacom.be', 'scarlet.be', 'proximus.be', 'mobistar.be',
  'base.be', 'orange.be', 'telenet.be', 'skynet.be', 'belgacom.be',
  'scarlet.be', 'proximus.be', 'mobistar.be', 'base.be', 'orange.be'
];

// Custom validation function for company emails
const validateCompanyEmail = (email: string) => {
  const domain = email.split('@')[1]?.toLowerCase();
  
  if (!domain) {
    return false;
  }
  
  // Check if it's a personal email provider
  if (PERSONAL_EMAIL_PROVIDERS.includes(domain)) {
    return false;
  }
  
  // Additional checks for common personal email patterns
  if (domain.includes('personal') || 
      domain.includes('private') || 
      domain.includes('home') ||
      domain.includes('family') ||
      domain.includes('individual')) {
    return false;
  }
  
  return true;
};

// Zod schema for waitlist form validation
const WaitlistFormSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .trim(),
  companyEmail: z.string()
    .email('Please enter a valid email address')
    .min(1, 'Company email is required')
    .max(255, 'Email must be less than 255 characters')
    .trim()
    .toLowerCase()
    .refine(
      validateCompanyEmail,
      'Please use your company email address. Personal email addresses (Gmail, Yahoo, Hotmail, etc.) are not accepted.'
    ),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate the request body using Zod
    const validationResult = WaitlistFormSchema.safeParse(body);
    
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => err.message).join(', ');
      return NextResponse.json({ 
        error: `Validation failed: ${errors}` 
      }, { status: 400 });
    }

    const { name, companyEmail } = validationResult.data;

    // Store in Supabase
    const supabase = await createClient();
    const { error } = await supabase.from('waitlist').insert([
      { 
        name, 
        email: companyEmail, 
        company_email: companyEmail,
        created_at: new Date().toISOString()
      }
    ]);
    
    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ 
        error: 'Failed to save to database. Please try again.' 
      }, { status: 500 });
    }

    // Try to send email with nodemailer if available
    try {
      const nodemailer = await import('nodemailer');
      
      const transporter = nodemailer.default.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>You're on the Waitlist – NeuralArc</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #000000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      color: #ffffff;
    }

    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #000000;
    }

    .hero-section {
      background: linear-gradient(135deg, #1b0e08 0%, #0f0805 50%, #070402 100%);
      position: relative;
      padding: 60px 40px;
      text-align: center;
      overflow: hidden;
      background-image:
        radial-gradient(ellipse at 20% 50%, rgba(54, 189, 160, 0.2) 0%, transparent 50%),
        radial-gradient(ellipse at 80% 20%, rgba(54, 189, 160, 0.15) 0%, transparent 50%),
        linear-gradient(45deg, transparent 30%, rgba(54, 189, 160, 0.1) 50%, transparent 70%);
    }

    .hero-section::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background:
        repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(54, 189, 160, 0.05) 2px, rgba(54, 189, 160, 0.05) 4px),
        repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(54, 189, 160, 0.03) 3px, rgba(54, 189, 160, 0.03) 6px);
      animation: flow 30s linear infinite;
    }

    @keyframes flow {
      0% { transform: translateX(-100px) translateY(-50px); }
      100% { transform: translateX(100px) translateY(50px); }
    }

    .hero-content {
      position: relative;
      z-index: 2;
    }

    .logo {
      font-size: 14px;
      font-weight: 300;
      margin-bottom: 10px;
      color: #36BDA0;
      letter-spacing: 1px;
    }

    .main-heading {
      font-size: 48px;
      font-weight: 300;
      margin: 0;
      color: #ffffff;
    }

    .email-body {
      padding: 50px 40px;
      text-align: center;
      background-color: #000000;
    }

    .greeting {
      font-size: 20px;
      color: #cccccc;
      margin-bottom: 24px;
    }

    .welcome-heading {
      font-size: 32px;
      font-weight: 300;
      margin-bottom: 16px;
      color: #ffffff;
    }

    .info-text {
      font-size: 16px;
      color: #bbbbbb;
      line-height: 1.6;
      margin-bottom: 30px;
    }

    .pill-box {
      background: #111111;
      border: 1px solid #222;
      padding: 20px;
      border-radius: 12px;
      margin-bottom: 30px;
    }

    .pill-box p {
      margin: 8px 0;
      font-size: 15px;
      color: #dddddd;
    }

    .cta-button {
      display: inline-block;
      background-color: #36BDA0;
      color: #000000;
      padding: 14px 28px;
      border-radius: 8px;
      font-size: 16px;
      text-decoration: none;
      font-weight: 500;
      transition: background 0.3s ease;
    }

    .cta-button:hover {
      background-color: #2aa88c;
    }

    .footer {
      padding: 40px 20px 60px 20px;
      text-align: center;
      border-top: 1px solid #222;
      font-size: 13px;
      color: #888;
    }

    @media only screen and (max-width: 600px) {
      .hero-section {
        padding: 40px 20px;
      }

      .main-heading {
        font-size: 36px;
      }

      .email-body {
        padding: 40px 20px;
      }

      .welcome-heading {
        font-size: 24px;
      }

      .info-text {
        font-size: 14px;
      }

      .cta-button {
        font-size: 15px;
        padding: 12px 20px;
      }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="hero-section">
      <div class="hero-content">
        <div class="logo">NEURALARC</div>
        <h1 class="main-heading">Waitlist Confirmed</h1>
      </div>
    </div>

    <div class="email-body">
      <p class="greeting">Hi ${name} 👋</p>
      <h2 class="welcome-heading">You're on the waitlist!</h2>
      <p class="info-text">
        Thanks for joining the Helium AI waitlist. You are now part of an early group that's about to explore the future of Enterprise AI.
      </p>

      <a href="https://neuralarc.ai" class="cta-button">Visit Our Website</a>
    </div>

    <div class="footer">
      NeuralArc Inc. • All rights reserved<br/>
      <a href="mailto:support@neuralarc.ai" style="color:#888; text-decoration:none;">support@neuralarc.com</a>
    </div>
  </div>
</body>
</html>
`;

      await transporter.sendMail({
        from: `"NeuralArc Inc." <${process.env.SMTP_USER}>`,
        to: companyEmail,
        subject: 'Welcome to the Waitlist!',
        html,
      });
    } catch (emailError) {
      // If email sending fails, just log it but don't fail the request
      console.error('Email sending failed:', emailError);
    }

    return NextResponse.json({ 
      success: true,
      message: 'Successfully joined the waitlist!'
    });
  } catch (err: any) {
    console.error('Waitlist API error:', err);
    return NextResponse.json({ 
      error: 'Internal server error. Please try again.' 
    }, { status: 500 });
  }
}

