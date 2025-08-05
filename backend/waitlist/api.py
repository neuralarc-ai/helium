from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, validator
from typing import List
import re
import os
from datetime import datetime, timezone
from services.supabase import DBConnection
from utils.logger import logger

router = APIRouter()

# List of personal email providers to reject
PERSONAL_EMAIL_PROVIDERS = [
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
    'proximus.be', 'mobistar.be', 'base.be', 'orange.be'
]

class WaitlistRequest(BaseModel):
    name: str
    companyEmail: str
    
    @validator('name')
    def validate_name(cls, v):
        if not v.strip():
            raise ValueError('Name is required')
        if len(v.strip()) > 100:
            raise ValueError('Name must be less than 100 characters')
        return v.strip()
    
    @validator('companyEmail')
    def validate_company_email(cls, v):
        if not v.strip():
            raise ValueError('Company email is required')
        
        # Basic email format validation
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, v):
            raise ValueError('Please enter a valid email address')
        
        # Check for personal email providers
        domain = v.split('@')[1].lower()
        if domain in PERSONAL_EMAIL_PROVIDERS:
            raise ValueError('Please use your company email address. Personal email addresses (Gmail, Yahoo, Hotmail, etc.) are not accepted.')
        
        # Additional checks for common personal email patterns
        if any(keyword in domain for keyword in ['personal', 'private', 'home', 'family', 'individual']):
            raise ValueError('Please use your company email address. Personal email addresses are not accepted.')
        
        return v.strip().lower()

class WaitlistResponse(BaseModel):
    success: bool
    message: str

async def get_db() -> DBConnection:
    """Dependency to get database connection."""
    return DBConnection()

@router.post("/waitlist", response_model=WaitlistResponse)
async def submit_waitlist(
    request: WaitlistRequest,
    db: DBConnection = Depends(get_db)
):
    """
    Submit a waitlist entry with validation and email notification.
    """
    try:
        logger.info(f"Processing waitlist submission for: {request.name} ({request.companyEmail})")
        
        # Get database client
        supabase = await db.client
        
        # Check if email already exists
        existing = await supabase.table('waitlist').select('id').eq('email', request.companyEmail).execute()
        
        if existing.data:
            logger.info(f"Email already exists in waitlist: {request.companyEmail}")
            return WaitlistResponse(
                success=True,
                message="You're already on the waitlist! We'll be in touch soon."
            )
        
        # Insert into database
        result = await supabase.table('waitlist').insert({
            'name': request.name,
            'email': request.companyEmail,
            'company_email': request.companyEmail,
            'created_at': datetime.now(timezone.utc).isoformat()
        }).execute()
        
        # Check if the insert was successful
        if not result.data:
            logger.error(f"Database insert failed: {result}")
            raise HTTPException(status_code=500, detail="Failed to save to database")
        
        logger.info(f"Successfully added {request.name} to waitlist")
        
        # Try to send email notification
        try:
            await send_waitlist_email(request.name, request.companyEmail)
            logger.info(f"Email sent successfully to {request.companyEmail}")
        except Exception as email_error:
            logger.error(f"Failed to send email: {email_error}")
            # Don't fail the request if email fails
        
        return WaitlistResponse(
            success=True,
            message="Successfully joined the waitlist! We'll be in touch soon."
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in waitlist submission: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

async def send_waitlist_email(name: str, email: str):
    """
    Send welcome email to waitlist subscriber using SMTP.
    """
    try:
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        
        # Get SMTP configuration from environment
        smtp_host = os.getenv('SMTP_HOST')
        smtp_port = int(os.getenv('SMTP_PORT', '587'))
        smtp_user = os.getenv('SMTP_USER')
        smtp_pass = os.getenv('SMTP_PASS')
        
        if not all([smtp_host, smtp_user, smtp_pass]):
            logger.warning("SMTP configuration not found, skipping email")
            return
        
        # Create email content
        html_content = f"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>You're on the Waitlist – NeuralArc</title>
  <style>
    body {{
      margin: 0;
      padding: 0;
      background-color: #000000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      color: #ffffff;
    }}
    .email-container {{
      max-width: 600px;
      margin: 0 auto;
      background-color: #000000;
    }}
    .hero-section {{
      background: linear-gradient(135deg, #1b0e08 0%, #0f0805 50%, #070402 100%);
      position: relative;
      padding: 60px 40px;
      text-align: center;
      overflow: hidden;
      background-image:
        radial-gradient(ellipse at 20% 50%, rgba(54, 189, 160, 0.2) 0%, transparent 50%),
        radial-gradient(ellipse at 80% 20%, rgba(54, 189, 160, 0.15) 0%, transparent 50%),
        linear-gradient(45deg, transparent 30%, rgba(54, 189, 160, 0.1) 50%, transparent 70%);
    }}
    .hero-content {{
      position: relative;
      z-index: 2;
    }}
    .logo {{
      font-size: 14px;
      font-weight: 300;
      margin-bottom: 10px;
      color: #36BDA0;
      letter-spacing: 1px;
    }}
    .main-heading {{
      font-size: 48px;
      font-weight: 300;
      margin: 0;
      color: #ffffff;
    }}
    .email-body {{
      padding: 50px 40px;
      text-align: center;
      background-color: #000000;
    }}
    .greeting {{
      font-size: 20px;
      color: #cccccc;
      margin-bottom: 24px;
    }}
    .welcome-heading {{
      font-size: 32px;
      font-weight: 300;
      margin-bottom: 16px;
      color: #ffffff;
    }}
    .info-text {{
      font-size: 16px;
      color: #bbbbbb;
      line-height: 1.6;
      margin-bottom: 30px;
    }}
    .cta-button {{
      display: inline-block;
      background-color: #36BDA0;
      color: #000000;
      padding: 14px 28px;
      border-radius: 8px;
      font-size: 16px;
      text-decoration: none;
      font-weight: 500;
      transition: background 0.3s ease;
    }}
    .cta-button:hover {{
      background-color: #2aa88c;
    }}
    .footer {{
      padding: 40px 20px 60px 20px;
      text-align: center;
      border-top: 1px solid #222;
      font-size: 13px;
      color: #888;
    }}
    @media only screen and (max-width: 600px) {{
      .hero-section {{
        padding: 40px 20px;
      }}
      .main-heading {{
        font-size: 36px;
      }}
      .email-body {{
        padding: 40px 20px;
      }}
      .welcome-heading {{
        font-size: 24px;
      }}
      .info-text {{
        font-size: 14px;
      }}
      .cta-button {{
        font-size: 15px;
        padding: 12px 20px;
      }}
    }}
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
      <p class="greeting">Hi {name} 👋</p>
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
        """
        
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = 'Welcome to the Waitlist!'
        msg['From'] = f"NeuralArc Inc. <{smtp_user}>"
        msg['To'] = email
        
        # Attach HTML content
        html_part = MIMEText(html_content, 'html')
        msg.attach(html_part)
        
        # Send email
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
        
        logger.info(f"Waitlist email sent successfully to {email}")
            
    except Exception as e:
        logger.error(f"Error sending waitlist email: {e}")
        # Don't raise the exception to avoid failing the waitlist submission 