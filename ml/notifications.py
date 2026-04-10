"""
IntelliShop — Notification Service Utility
============================================
Utility module for sending email and SMS notifications related to
order updates, fraud alerts, and promotional campaigns.

Supported channels:
  • Email       — via SMTP (Gmail, SendGrid, or custom SMTP)
  • SMS         — via Twilio API
  • Slack       — via Incoming Webhooks (for internal fraud alerts)

Usage:
    python notifications.py

Dependencies:
    smtplib (stdlib), requests  (see requirements.txt)

Note:
    This is a supplementary utility module. It does NOT connect to or
    modify any part of the IntelliShop frontend or backend.
    All credentials below are PLACEHOLDERS — replace with real values
    before use in production.
"""

import smtplib
import json
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from typing import Optional

# Optional imports — graceful fallback if not installed
try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False


# =============================================================================
# CONFIGURATION (environment variables with fallback defaults)
# =============================================================================

class NotificationConfig:
    """
    Centralized notification settings.
    In production, all values should come from environment variables.
    """

    # Email — SMTP
    SMTP_HOST     = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT     = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER     = os.getenv("SMTP_USER", "noreply@intellishop.com")
    SMTP_PASSWORD  = os.getenv("SMTP_PASSWORD", "placeholder_password")
    EMAIL_FROM     = os.getenv("EMAIL_FROM", "IntelliShop <noreply@intellishop.com>")

    # SMS — Twilio
    TWILIO_SID     = os.getenv("TWILIO_SID", "placeholder_sid")
    TWILIO_TOKEN   = os.getenv("TWILIO_TOKEN", "placeholder_token")
    TWILIO_FROM    = os.getenv("TWILIO_FROM", "+1234567890")

    # Slack — Webhook
    SLACK_WEBHOOK  = os.getenv("SLACK_WEBHOOK", "https://hooks.slack.com/services/placeholder")

    # Feature flags
    DRY_RUN = os.getenv("NOTIFICATION_DRY_RUN", "true").lower() == "true"


# =============================================================================
# 1. EMAIL SERVICE
# =============================================================================

class EmailService:
    """
    Send transactional and alert emails via SMTP.
    Supports HTML templates for professional-looking order notifications.
    """

    def __init__(self, config: NotificationConfig = None):
        self.config = config or NotificationConfig()

    def _build_order_confirmation_html(self, order: dict) -> str:
        """Generate an HTML email body for order confirmation."""
        return f"""
        <html>
        <body style="font-family: 'Inter', Arial, sans-serif; background: #f9fafb; padding: 30px;">
            <div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 16px;
                        box-shadow: 0 4px 20px rgba(0,0,0,0.06); overflow: hidden;">

                <!-- Header -->
                <div style="background: linear-gradient(135deg, #E8614A, #d4533e); padding: 28px 30px; color: #fff;">
                    <h1 style="margin: 0; font-size: 22px;">🛍️ IntelliShop</h1>
                    <p style="margin: 6px 0 0; opacity: 0.9; font-size: 13px;">Order Confirmation</p>
                </div>

                <!-- Body -->
                <div style="padding: 28px 30px;">
                    <p style="font-size: 15px; color: #374151;">
                        Hi <strong>{order.get('customer_name', 'Customer')}</strong>,
                    </p>
                    <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
                        Thank you for your order! Here's a summary:
                    </p>

                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                        <tr style="border-bottom: 1px solid #e5e7eb;">
                            <td style="padding: 10px 0; font-size: 13px; color: #6b7280;">Order ID</td>
                            <td style="padding: 10px 0; font-size: 13px; font-weight: 700; text-align: right;">
                                {order.get('order_id', 'N/A')}
                            </td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e5e7eb;">
                            <td style="padding: 10px 0; font-size: 13px; color: #6b7280;">Product</td>
                            <td style="padding: 10px 0; font-size: 13px; text-align: right;">
                                {order.get('product', 'N/A')}
                            </td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e5e7eb;">
                            <td style="padding: 10px 0; font-size: 13px; color: #6b7280;">Amount</td>
                            <td style="padding: 10px 0; font-size: 15px; font-weight: 800; color: #E8614A; text-align: right;">
                                ₹{order.get('amount', 0):,.2f}
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; font-size: 13px; color: #6b7280;">Payment</td>
                            <td style="padding: 10px 0; font-size: 13px; text-align: right;">
                                {order.get('payment_method', 'N/A')}
                            </td>
                        </tr>
                    </table>

                    <p style="font-size: 13px; color: #6b7280; line-height: 1.6;">
                        Estimated delivery: <strong>{order.get('delivery_estimate', '3–5 business days')}</strong>
                    </p>

                    <a href="https://intellishop.vercel.app" style="display: inline-block; margin-top: 16px;
                       padding: 12px 24px; background: #E8614A; color: #fff; border-radius: 8px;
                       text-decoration: none; font-size: 13px; font-weight: 700;">
                        Track Your Order →
                    </a>
                </div>

                <!-- Footer -->
                <div style="background: #f9fafb; padding: 18px 30px; border-top: 1px solid #e5e7eb;">
                    <p style="font-size: 11px; color: #9ca3af; margin: 0;">
                        IntelliShop Fashion · Mumbai, India · © {datetime.now().year}
                    </p>
                </div>
            </div>
        </body>
        </html>
        """

    def _build_fraud_alert_html(self, alert: dict) -> str:
        """Generate an HTML email body for fraud alerts sent to admins."""
        score = alert.get("risk_score", 0)
        color = "#ef4444" if score > 80 else "#f97316" if score > 60 else "#eab308"

        flags_html = "".join(
            f'<li style="padding: 4px 0; font-size: 12px;">{f}</li>'
            for f in alert.get("flags", [])
        )

        return f"""
        <html>
        <body style="font-family: 'Inter', Arial, sans-serif; background: #0f172a; padding: 30px;">
            <div style="max-width: 560px; margin: 0 auto; background: #1e293b; border-radius: 16px;
                        border: 1px solid #334155; overflow: hidden;">

                <!-- Header -->
                <div style="background: linear-gradient(135deg, {color}, {color}99); padding: 20px 30px; color: #fff;">
                    <h2 style="margin: 0; font-size: 18px;">🚨 Fraud Alert — IntelliShop</h2>
                    <p style="margin: 4px 0 0; opacity: 0.9; font-size: 12px;">
                        {alert.get('recommendation', 'REVIEW REQUIRED')}
                    </p>
                </div>

                <!-- Body -->
                <div style="padding: 24px 30px; color: #e2e8f0;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; font-size: 12px; color: #94a3b8;">User ID</td>
                            <td style="padding: 8px 0; font-size: 13px; font-weight: 700; text-align: right; font-family: monospace;">
                                {alert.get('user_id', 'N/A')}
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-size: 12px; color: #94a3b8;">Order Amount</td>
                            <td style="padding: 8px 0; font-size: 14px; font-weight: 800; color: {color}; text-align: right;">
                                ₹{alert.get('amount', 0):,.0f}
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-size: 12px; color: #94a3b8;">Risk Score</td>
                            <td style="padding: 8px 0; font-size: 16px; font-weight: 900; color: {color}; text-align: right; font-family: monospace;">
                                {score}/100
                            </td>
                        </tr>
                    </table>

                    <div style="margin-top: 16px;">
                        <p style="font-size: 11px; color: #94a3b8; font-weight: 700; text-transform: uppercase;">
                            Flags Triggered:
                        </p>
                        <ul style="color: #fca5a5; padding-left: 20px; margin: 8px 0;">
                            {flags_html}
                        </ul>
                    </div>
                </div>

                <div style="padding: 16px 30px; border-top: 1px solid #334155;">
                    <p style="font-size: 10px; color: #64748b; margin: 0;">
                        Sent by IntelliShop Fraud Intelligence · {datetime.now().strftime('%d %b %Y, %I:%M %p')}
                    </p>
                </div>
            </div>
        </body>
        </html>
        """

    def send_email(self, to: str, subject: str, html_body: str) -> dict:
        """
        Send an email via SMTP.

        Returns
        -------
        dict
            { "success": bool, "message": str }
        """
        if self.config.DRY_RUN:
            print(f"  [DRY RUN] Email → {to}")
            print(f"            Subject: {subject}")
            print(f"            Body length: {len(html_body)} chars")
            return {"success": True, "message": "Dry run — email not actually sent"}

        try:
            msg = MIMEMultipart("alternative")
            msg["From"] = self.config.EMAIL_FROM
            msg["To"] = to
            msg["Subject"] = subject
            msg.attach(MIMEText(html_body, "html"))

            with smtplib.SMTP(self.config.SMTP_HOST, self.config.SMTP_PORT) as server:
                server.starttls()
                server.login(self.config.SMTP_USER, self.config.SMTP_PASSWORD)
                server.send_message(msg)

            return {"success": True, "message": f"Email sent to {to}"}

        except Exception as e:
            return {"success": False, "message": str(e)}

    def send_order_confirmation(self, order: dict) -> dict:
        """Send an order confirmation email to the customer."""
        html = self._build_order_confirmation_html(order)
        subject = f"Order Confirmed — {order.get('order_id', '')} | IntelliShop"
        return self.send_email(order.get("email", ""), subject, html)

    def send_fraud_alert(self, alert: dict, admin_email: str = "admin@intellishop.com") -> dict:
        """Send a fraud alert email to the admin team."""
        html = self._build_fraud_alert_html(alert)
        subject = f"🚨 Fraud Alert — Risk {alert.get('risk_score', 0)}/100 — {alert.get('user_id', '')}"
        return self.send_email(admin_email, subject, html)


# =============================================================================
# 2. SMS SERVICE (Twilio)
# =============================================================================

class SMSService:
    """Send transactional SMS via Twilio REST API."""

    TWILIO_API_URL = "https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json"

    def __init__(self, config: NotificationConfig = None):
        self.config = config or NotificationConfig()

    def send_sms(self, to: str, message: str) -> dict:
        """
        Send an SMS message.

        Parameters
        ----------
        to : str
            Recipient phone number in E.164 format (e.g., +919876543210)
        message : str
            SMS body (max 1600 chars)
        """
        if self.config.DRY_RUN:
            print(f"  [DRY RUN] SMS → {to}")
            print(f"            Message: {message[:80]}...")
            return {"success": True, "message": "Dry run — SMS not actually sent"}

        if not HAS_REQUESTS:
            return {"success": False, "message": "requests library not installed"}

        try:
            url = self.TWILIO_API_URL.format(sid=self.config.TWILIO_SID)
            response = requests.post(url, data={
                "From": self.config.TWILIO_FROM,
                "To": to,
                "Body": message,
            }, auth=(self.config.TWILIO_SID, self.config.TWILIO_TOKEN))

            if response.status_code == 201:
                return {"success": True, "message": f"SMS sent to {to}"}
            else:
                return {"success": False, "message": response.text}

        except Exception as e:
            return {"success": False, "message": str(e)}

    def send_order_update(self, phone: str, order_id: str, status: str) -> dict:
        """Send an order status update SMS."""
        messages = {
            "Confirmed":  f"✅ IntelliShop: Your order {order_id} is confirmed! We'll notify you when it ships.",
            "Shipped":    f"📦 IntelliShop: Your order {order_id} has been shipped! Track it in our app.",
            "Delivered":  f"🎉 IntelliShop: Your order {order_id} has been delivered! Rate your purchase.",
            "Cancelled":  f"❌ IntelliShop: Your order {order_id} has been cancelled. Refund will be processed in 3–5 days.",
        }
        msg = messages.get(status, f"IntelliShop: Order {order_id} status updated to {status}.")
        return self.send_sms(phone, msg)

    def send_otp(self, phone: str, otp: str) -> dict:
        """Send an OTP for authentication."""
        msg = f"🔐 IntelliShop: Your OTP is {otp}. Valid for 5 minutes. Do not share with anyone."
        return self.send_sms(phone, msg)


# =============================================================================
# 3. SLACK SERVICE (Internal Alerts)
# =============================================================================

class SlackService:
    """Send internal alerts to Slack via Incoming Webhooks."""

    def __init__(self, config: NotificationConfig = None):
        self.config = config or NotificationConfig()

    def send_alert(self, text: str, channel: Optional[str] = None) -> dict:
        """Post a message to a Slack channel via webhook."""
        if self.config.DRY_RUN:
            print(f"  [DRY RUN] Slack → #{channel or 'default'}")
            print(f"            Message: {text[:80]}...")
            return {"success": True, "message": "Dry run — Slack message not sent"}

        if not HAS_REQUESTS:
            return {"success": False, "message": "requests library not installed"}

        try:
            payload = {"text": text}
            if channel:
                payload["channel"] = f"#{channel}"

            response = requests.post(
                self.config.SLACK_WEBHOOK,
                json=payload,
                headers={"Content-Type": "application/json"},
            )

            if response.status_code == 200:
                return {"success": True, "message": "Slack alert sent"}
            else:
                return {"success": False, "message": response.text}

        except Exception as e:
            return {"success": False, "message": str(e)}

    def send_fraud_alert(self, alert: dict) -> dict:
        """Format and send a fraud alert to the #fraud-alerts channel."""
        score = alert.get("risk_score", 0)
        emoji = "🔴" if score > 80 else "🟠" if score > 60 else "🟡"

        flags_text = "\n".join(f"  • {f}" for f in alert.get("flags", []))

        message = (
            f"{emoji} *Fraud Alert* — Risk Score: *{score}/100*\n"
            f"```\n"
            f"User:    {alert.get('user_id', 'N/A')}\n"
            f"Amount:  ₹{alert.get('amount', 0):,.0f}\n"
            f"Action:  {alert.get('recommendation', 'REVIEW')}\n"
            f"```\n"
            f"*Flags:*\n{flags_text}"
        )

        return self.send_alert(message, channel="fraud-alerts")


# =============================================================================
# 4. NOTIFICATION DISPATCHER — Unified Interface
# =============================================================================

class NotificationDispatcher:
    """
    Unified notification dispatcher that routes messages to the
    appropriate channel (email, SMS, Slack) based on event type.
    """

    def __init__(self):
        self.email = EmailService()
        self.sms = SMSService()
        self.slack = SlackService()

    def on_order_placed(self, order: dict):
        """Trigger notifications when a new order is placed."""
        print(f"\n📦 Order Placed: {order.get('order_id')}")

        # Email confirmation to customer
        result = self.email.send_order_confirmation(order)
        print(f"  Email: {result['message']}")

        # SMS confirmation
        if order.get("phone"):
            result = self.sms.send_order_update(order["phone"], order["order_id"], "Confirmed")
            print(f"  SMS:   {result['message']}")

    def on_fraud_detected(self, alert: dict):
        """Trigger notifications when fraud is detected."""
        score = alert.get("risk_score", 0)
        print(f"\n🚨 Fraud Detected: {alert.get('user_id')} — Score: {score}")

        # Email to admin
        result = self.email.send_fraud_alert(alert)
        print(f"  Email: {result['message']}")

        # Slack alert
        result = self.slack.send_fraud_alert(alert)
        print(f"  Slack: {result['message']}")

    def on_order_shipped(self, order: dict):
        """Trigger notifications when an order is shipped."""
        print(f"\n📦 Order Shipped: {order.get('order_id')}")

        if order.get("phone"):
            result = self.sms.send_order_update(order["phone"], order["order_id"], "Shipped")
            print(f"  SMS:   {result['message']}")


# =============================================================================
# 5. DEMO
# =============================================================================

if __name__ == "__main__":
    print("=" * 60)
    print("  IntelliShop — Notification Service Demo")
    print("  Mode: DRY RUN (no real messages sent)")
    print("=" * 60)

    dispatcher = NotificationDispatcher()

    # Order confirmation
    dispatcher.on_order_placed({
        "order_id": "ORD-010042",
        "customer_name": "Priya Patel",
        "email": "priya.patel@gmail.com",
        "phone": "+919876543210",
        "product": "Silk Saree — Royal Blue",
        "amount": 2499.00,
        "payment_method": "UPI - GPay",
        "delivery_estimate": "12–14 Apr 2026",
    })

    # Fraud alert
    dispatcher.on_fraud_detected({
        "user_id": "USR-01087",
        "amount": 18500,
        "risk_score": 92,
        "recommendation": "AUTO_BLOCK",
        "flags": [
            "VPN/Proxy Detected",
            "Multiple Cards in Session (3 cards)",
            "Velocity Anomaly (6 orders/min)",
            "Bot / Headless Browser Detected",
        ],
    })

    # Shipment update
    dispatcher.on_order_shipped({
        "order_id": "ORD-010042",
        "phone": "+919876543210",
    })

    print(f"\n{'=' * 60}")
    print("  ✅ Demo complete. Set NOTIFICATION_DRY_RUN=false to send real messages.")
    print(f"{'=' * 60}\n")
