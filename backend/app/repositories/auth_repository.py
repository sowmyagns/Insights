"""Data access for authentication and password-reset tokens."""

import logging
from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, selectinload

from app.models.security import PasswordResetToken
from app.models.user import User
from app.utils.token import generate_token, hash_token


logger = logging.getLogger(__name__)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class AuthRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_user_by_email(self, email: str) -> User | None:
        try:
            return self.db.scalars(
                select(User)
                .where(User.email == email.lower().strip())
                .options(selectinload(User.tenant))
            ).first()
        except SQLAlchemyError:
            self.db.rollback()
            logger.exception("auth_repository_get_user_by_email_failed email=%s", email)
            raise

    def get_user_by_id(self, user_id: int, tenant_id: int | None = None) -> User | None:
        try:
            stmt = select(User).where(User.id == user_id)
            if tenant_id is not None:
                stmt = stmt.where(User.tenant_id == tenant_id)
            return self.db.scalars(stmt).first()
        except SQLAlchemyError:
            self.db.rollback()
            logger.exception(
                "auth_repository_get_user_by_id_failed user_id=%s tenant_id=%s",
                user_id,
                tenant_id,
            )
            raise

    def invalidate_active_reset_tokens(self, user_id: int) -> None:
        try:
            self.db.execute(
                update(PasswordResetToken)
                .where(
                    PasswordResetToken.user_id == user_id,
                    PasswordResetToken.used.is_(False),
                )
                .values(used=True)
            )
        except SQLAlchemyError:
            self.db.rollback()
            logger.exception("auth_repository_invalidate_active_reset_tokens_failed user_id=%s", user_id)
            raise

    def create_password_reset_token(
        self, user_id: int, *, expires_at: datetime
    ) -> str:
        """Create a one-time reset token. Returns raw token for email link."""
        try:
            self.invalidate_active_reset_tokens(user_id)
            raw = generate_token()
            self.db.add(
                PasswordResetToken(
                    user_id=user_id,
                    token_hash=hash_token(raw),
                    expires_at=expires_at,
                    used=False,
                )
            )
            self.db.flush()
            return raw
        except SQLAlchemyError:
            self.db.rollback()
            logger.exception(
                "auth_repository_create_password_reset_token_failed user_id=%s expires_at=%s",
                user_id,
                expires_at,
            )
            raise

    def get_reset_token_row(self, raw_token: str) -> PasswordResetToken | None:
        try:
            token_hash = hash_token(raw_token)
            return self.db.scalars(
                select(PasswordResetToken).where(PasswordResetToken.token_hash == token_hash)
            ).first()
        except SQLAlchemyError:
            self.db.rollback()
            logger.exception("auth_repository_get_reset_token_row_failed raw_token=%s", raw_token)
            raise

    def mark_reset_token_used(self, row: PasswordResetToken) -> None:
        try:
            row.used = True
            self.db.flush()
        except SQLAlchemyError:
            self.db.rollback()
            logger.exception("auth_repository_mark_reset_token_used_failed token_id=%s", row.id)
            raise

    def delete_reset_token(self, row: PasswordResetToken) -> None:
        """Permanently remove a reset token so it cannot be reused."""
        try:
            self.db.delete(row)
            self.db.flush()
        except SQLAlchemyError:
            self.db.rollback()
            logger.exception("auth_repository_delete_reset_token_failed token_id=%s", row.id)
            raise

    def update_user_password(self, user: User, hashed_password: str) -> None:
        try:
            user.hashed_password = hashed_password
            user.failed_login_attempts = 0
            user.locked_until = None
            self.db.flush()
        except SQLAlchemyError:
            self.db.rollback()
            logger.exception("auth_repository_update_user_password_failed user_id=%s", user.id)
            raise

    def commit(self) -> None:
        try:
            self.db.commit()
        except SQLAlchemyError:
            self.db.rollback()
            logger.exception("auth_repository_commit_failed")
            raise

    def refresh(self, obj) -> None:
        try:
            self.db.refresh(obj)
        except SQLAlchemyError:
            self.db.rollback()
            logger.exception("auth_repository_refresh_failed obj=%s", type(obj).__name__)
            raise
