from pydantic import BaseModel, ConfigDict


class RegisterInput(BaseModel):
    username: str
    email: str
    password: str


class LoginInput(BaseModel):
    username: str = ""
    password: str = ""


class ProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="allow")

    email: str | None = None
    username: str | None = None


class ForgotPasswordInput(BaseModel):
    email: str


class ResetInput(BaseModel):
    token: str
    new_password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict
    flag: str | None = None