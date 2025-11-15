"""Centralized application configuration and settings management."""
from functools import lru_cache
from typing import List, Sequence

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="allow")

    app_name: str = "Marketing Agent Backend"
    version: str = "0.1.0"
    api_prefix: str = "/api"

    database_url: str = "sqlite:///../storage/marketing_agent.db"
    analytics_schema: str = "analytics"
    ingestion_data_root: str = "/Users/kerrief/projects/mappe/data"
    shopify_store_domain: str = Field(
        default="", description="Default Shopify store domain (e.g., my-shop.myshopify.com)"
    )
    shopify_access_token: str = Field(
        default="", description="Private Admin API access token for Shopify ingestion"
    )
    shopify_api_version: str = Field(default="2024-04", description="Shopify Admin API version")

    allowed_origins: List[str] = Field(default_factory=lambda: ["http://localhost:2222"])

    # LLM Configuration
    openai_api_key: str = Field(default="", description="OpenAI API key for LLM workflows")
    openai_model: str = Field(default="gpt-4o-mini", description="OpenAI model for prompt-to-SQL and intelligence")
    anthropic_api_key: str = Field(default="", description="Anthropic API key (alternative LLM provider)")
    ollama_base_url: str = Field(default="http://localhost:11434", description="Ollama API base URL")
    ollama_model: str = Field(default="llama3.2", description="Ollama model name for prompt-to-SQL and intelligence")
    ollama_max_tables: int = Field(default=6, description="Maximum number of tables to include in Ollama prompt")
    ollama_max_columns: int = Field(default=15, description="Maximum number of columns per table to show in Ollama prompt")
    default_llm_provider: str = Field(default="openai", description="Default LLM provider: openai, anthropic, or ollama")
    use_llm_for_sql: bool = Field(default=True, description="Use LLM for prompt-to-SQL generation")

    # Vector Search Configuration
    enable_vector_search: bool = Field(default=False, description="Enable vector search for semantic discovery")
    vector_db_path: str = Field(default="../storage/vectors", description="Path for vector database storage")

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def _coerce_allowed_origins(cls, value: Sequence[str] | str) -> List[str]:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return list(value)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
