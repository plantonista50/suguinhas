from fastapi import Header, HTTPException

async def verify_token(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token ausente")

    token = authorization.replace("Bearer ", "")
    
    # Aqui você pode:
    # - validar JWT do Supabase
    # - ou aceitar token mock em dev

    if len(token) < 20:
        raise HTTPException(status_code=401, detail="Token inválido")

    return {"user_id": "ok"}
