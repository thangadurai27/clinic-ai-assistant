"""
Gmail API Service — handles OAuth2 authentication and sending/replying to emails.
Replaces SMTP for production-ready, reliable email communication.
"""
from __future__ import annotations

import base64
import logging
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any, Dict, Optional

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from app.config.settings import settings

logger = logging.getLogger(__name__)

class GmailService:
    """Service to interact with the Gmail API via OAuth2."""

    def __init__(self):
        self.creds: Optional[Credentials] = None
        self.service: Optional[Any] = None

    def refresh_access_token(self) -> Credentials:
        """
        Refresh and return OAuth2 credentials.
        Automatically uses refreshing logic provided by google-auth.
        """
        scopes = ["https://mail.google.com/"]
        
        creds = Credentials(
            None,
            refresh_token=settings.GOOGLE_REFRESH_TOKEN,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=settings.GOOGLE_CLIENT_ID,
            client_secret=settings.GOOGLE_CLIENT_SECRET
        )

        try:
            if not creds or not creds.valid:
                if creds and creds.expired and creds.refresh_token:
                    logger.info("GSM: Refreshing expired access token...")
                    creds.refresh(Request())
                else:
                    # Initial valid credentials
                    creds.refresh(Request())
            
            self.creds = creds
            return creds
        except Exception as e:
            logger.error("GSM: Failed to refresh Gmail access token: %s", e)
            raise ValueError(f"Invalid or expired Google OAuth2 credentials: {e}")

    def get_access_token(self) -> str:
        """Get a valid access token string."""
        creds = self.refresh_access_token()
        return creds.token

    def initialize_gmail_client(self):
        """Build the Gmail API service client thread-safely."""
        try:
            creds = self.refresh_access_token()
            self.service = build("gmail", "v1", credentials=creds, cache_discovery=False)
            logger.info("GSM: Gmail API client initialized successfully")
        except Exception as e:
            logger.error("GSM: Initialization failed: %s", e)
            raise

    async def get_thread(self, thread_id: str) -> Dict[str, Any]:
        """Fetch a full Gmail thread including all messages."""
        if not self.service:
            self.initialize_gmail_client()
        
        try:
            from app.db.async_utils import run_blocking
            return await run_blocking(lambda: self.service.users().threads().get(userId="me", id=thread_id).execute())
        except HttpError as e:
            logger.error("GSM: Error fetching thread %s: %s", thread_id, e)
            raise

    def _create_message(self, to: str, subject: str, body: str, thread_id: Optional[str] = None, in_reply_to: Optional[str] = None, references: Optional[str] = None) -> Dict[str, Any]:
        """
        Create a base64url encoded email message complying with Gmail API requirements.
        Preserves threading via In-Reply-To and References headers.
        """
        message = MIMEMultipart("alternative")
        message["To"] = to
        message["From"] = f"{settings.CLINIC_NAME} <{settings.CLINIC_EMAIL}>"
        message["Subject"] = subject
        
        # Threading support
        if in_reply_to:
            message["In-Reply-To"] = in_reply_to
        if references:
            message["References"] = references

        # Plain text
        message.attach(MIMEText(body, "plain"))

        # Premium HTML Template
        html_body = body.replace("\n", "<br>")
        html = (
            f'<html><body style="font-family:\'Segoe UI\',Helvetica,Arial,sans-serif;background-color:#f6f9fc;padding:40px 20px;color:#333;">'
            f'<div style="max-width:600px;margin:0 auto;background-color:#ffffff;border-radius:16px;box-shadow:0 10px 25px rgba(0,0,0,0.05);overflow:hidden;border:1px solid #eef2f7;">'
            f'<div style="background:linear-gradient(135deg,#7c3aed,#6366f1);padding:30px;text-align:center;">'
            f'<h1 style="color:#ffffff;margin:0;font-size:24px;letter-spacing:-0.5px;">{settings.CLINIC_NAME}</h1>'
            f'</div>'
            f'<div style="padding:40px 30px;line-height:1.8;font-size:16px;color:#4a5568;">'
            f'{html_body}'
            f'</div>'
            f'<div style="padding:30px;background-color:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">'
            f'<p style="margin:0;font-size:13px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Clinic Information</p>'
            f'<p style="margin:10px 0 0;font-size:14px;color:#64748b;">{settings.CLINIC_ADDRESS}</p>'
            f'<p style="margin:5px 0 0;font-size:14px;color:#64748b;">{settings.CLINIC_PHONE} • {settings.CLINIC_HOURS}</p>'
            f'</div>'
            f'</div>'
            f'<div style="max-width:600px;margin:20px auto;text-align:center;font-size:12px;color:#94a3b8;">'
            f'This is an automated communication from {settings.CLINIC_NAME}.'
            f'</div>'
            f'</body></html>'
        )
        message.attach(MIMEText(html, "html"))

        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")
        body_data = {"raw": raw_message}
        if thread_id:
            body_data["threadId"] = thread_id
            
        return body_data

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((HttpError, TimeoutError)),
        reraise=True
    )
    async def send_email(self, to_email: str, subject: str, body: str) -> bool:
        """Send a new email message with retry logic."""
        if not self.service:
            self.initialize_gmail_client()

        try:
            from app.db.async_utils import run_blocking
            message_body = self._create_message(to_email, subject, body)
            
            logger.info("GSM: Attempting to send new email to %s", to_email)
            sent_msg = await run_blocking(lambda: self.service.users().messages().send(userId="me", body=message_body).execute())
            
            logger.info("GSM: Transaction Successful | To: %s | MsgID: %s", to_email, sent_msg.get("id"))
            return True
        except Exception as e:
            logger.error("GSM: Transaction Failed | To: %s | Error: %s", to_email, e)
            raise

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((HttpError, TimeoutError)),
        reraise=True
    )
    async def reply_email(self, to_email: str, subject: str, body: str, thread_id: str, in_reply_to: str, references: Optional[str] = None) -> bool:
        """Reply to an existing email thread with automatic retry logic."""
        if not self.service:
            self.initialize_gmail_client()

        try:
            from app.db.async_utils import run_blocking
            message_body = self._create_message(
                to=to_email,
                subject=subject,
                body=body,
                thread_id=thread_id,
                in_reply_to=in_reply_to,
                references=references or in_reply_to
            )
            
            logger.info("GSM: Attempting to reply to thread %s | Recipient: %s", thread_id, to_email)
            sent_msg = await run_blocking(lambda: self.service.users().messages().send(userId="me", body=message_body).execute())
            
            logger.info("GSM: Reply Successful | Thread: %s | MsgID: %s", thread_id, sent_msg.get("id"))
            return True
        except Exception as e:
            logger.error("GSM: Reply Failed | Thread: %s | Error: %s", thread_id, e)
            raise

# Singleton instance
gmail_service = GmailService()
