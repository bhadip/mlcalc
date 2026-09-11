"""
OAuth providers — Google and Microsoft authentication via Cloudflare Access.
"""

import httpx
from fastapi import HTTPException, status

from app.config import settings


class GoogleOAuth:
    """Google OAuth 2.0 provider."""

    AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
    TOKEN_URL = "https://oauth2.googleapis.com/token"
    USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"

    @classmethod
    def get_authorization_url(cls, state: str) -> str:
        params = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
            "access_type": "offline",
            "prompt": "consent",
        }
        query = "&".join(f"{k}={v}" for k, v in params.items())
        return f"{cls.AUTH_URL}?{query}"

    @classmethod
    async def exchange_code(cls, code: str) -> dict:
        """Exchange authorization code for tokens and user info."""
        async with httpx.AsyncClient() as client:
            # Exchange code for tokens
            token_response = await client.post(
                cls.TOKEN_URL,
                data={
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                },
            )

            if token_response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to exchange authorization code",
                )

            tokens = token_response.json()
            access_token = tokens.get("access_token")

            # Get user info
            userinfo_response = await client.get(
                cls.USERINFO_URL,
                headers={"Authorization": f"Bearer {access_token}"},
            )

            if userinfo_response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to fetch user info",
                )

            userinfo = userinfo_response.json()

            return {
                "provider": "google",
                "subject": userinfo.get("sub"),
                "email": userinfo.get("email"),
                "name": userinfo.get("name"),
                "avatar_url": userinfo.get("picture"),
                "access_token": tokens.get("access_token"),
                "refresh_token": tokens.get("refresh_token"),
            }


class MicrosoftOAuth:
    """Microsoft OAuth 2.0 provider (Azure AD v2.0)."""

    AUTH_URL = f"https://login.microsoftonline.com/{settings.MS_TENANT_ID}/oauth2/v2.0/authorize"
    TOKEN_URL = f"https://login.microsoftonline.com/{settings.MS_TENANT_ID}/oauth2/v2.0/token"
    USERINFO_URL = "https://graph.microsoft.com/v1.0/me"

    @classmethod
    def get_authorization_url(cls, state: str) -> str:
        params = {
            "client_id": settings.MS_CLIENT_ID,
            "redirect_uri": settings.MS_REDIRECT_URI,
            "response_type": "code",
            "scope": "openid email profile User.Read",
            "state": state,
        }
        query = "&".join(f"{k}={v}" for k, v in params.items())
        return f"{cls.AUTH_URL}?{query}"

    @classmethod
    async def exchange_code(cls, code: str) -> dict:
        """Exchange authorization code for tokens and user info."""
        async with httpx.AsyncClient() as client:
            # Exchange code for tokens
            token_response = await client.post(
                cls.TOKEN_URL,
                data={
                    "client_id": settings.MS_CLIENT_ID,
                    "client_secret": settings.MS_CLIENT_SECRET,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": settings.MS_REDIRECT_URI,
                    "scope": "openid email profile User.Read",
                },
            )

            if token_response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to exchange authorization code",
                )

            tokens = token_response.json()
            access_token = tokens.get("access_token")

            # Get user info from Microsoft Graph
            userinfo_response = await client.get(
                cls.USERINFO_URL,
                headers={"Authorization": f"Bearer {access_token}"},
            )

            if userinfo_response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to fetch user info",
                )

            userinfo = userinfo_response.json()

            return {
                "provider": "microsoft",
                "subject": userinfo.get("id"),
                "email": userinfo.get("mail") or userinfo.get("userPrincipalName"),
                "name": userinfo.get("displayName"),
                "avatar_url": None,  # Microsoft Graph requires separate call for photo
                "access_token": tokens.get("access_token"),
                "refresh_token": tokens.get("refresh_token"),
            }
