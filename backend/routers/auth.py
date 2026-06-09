from __future__ import annotations
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, EmailStr

from auth import verify_password, create_access_token, get_current_user
from database import get_conn

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    token: str
    user: dict


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest):
    async with get_conn() as conn:
        cursor = await conn.execute(
            "SELECT id, name, email, password_hash, role, lead_search_enabled FROM lu_users WHERE email = ?",
            (body.email,),
        )
        row = await cursor.fetchone()

    if not row or not verify_password(body.password, row["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
        )

    token = create_access_token(row["id"], row["email"], row["role"])

    return {
        "token": token,
        "user": {
            "id": row["id"],
            "name": row["name"],
            "email": row["email"],
            "role": row["role"],
            "lead_search_enabled": bool(row["lead_search_enabled"]),
        },
    }


@router.get("/me")
async def me(current_user: dict = Depends(get_current_user)):
    return current_user
