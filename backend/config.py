from pydantic import BaseSettings

class Settings(BaseSettings):
    OPENAI_API_KEY: str
    ENV: str = "prod"
    ALLOW_LOG_TEXT: bool = False

    class Config:
        env_file = ".env"

settings = Settings()
