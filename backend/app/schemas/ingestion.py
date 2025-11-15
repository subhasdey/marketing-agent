"""Schemas for data ingestion operations."""
from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class IngestedDatasetSummary(BaseModel):
    table_name: str
    business: str
    category: str
    dataset_name: str
    source_file: str
    row_count: int
    columns: List[str]


class SourceRegistrationRequest(BaseModel):
    name: str = Field(..., description="Human-readable name for the data source")
    source_type: str = Field(..., description="Type of source, e.g., shopify, csv, plugin")
    configuration: Dict[str, str] = Field(default_factory=dict, description="Source-specific configuration settings")


class SourceRegistrationResponse(BaseModel):
    source_id: str
    status: str
    registered_at: datetime = Field(default_factory=datetime.utcnow)


class CsvIngestionRequest(BaseModel):
    dataset_name: str = Field(..., description="Identifier for the ingestion job")
    file_path: Optional[str] = Field(
        None, description="Path to a single CSV file or directory containing dataset folders"
    )
    business: Optional[str] = Field(None, description="Optional business name filter when ingesting a directory")
    column_mappings: Dict[str, str] = Field(default_factory=dict)
    tags: List[str] = Field(default_factory=list)
    metadata: Dict[str, str] = Field(default_factory=dict)


class CsvIngestionResponse(BaseModel):
    job_id: str
    status: str
    submitted_at: datetime = Field(default_factory=datetime.utcnow)
    warnings: Optional[List[str]] = None
    ingested_count: int = Field(..., description="Number of datasets ingested during the job")
    datasets: List[IngestedDatasetSummary] = Field(
        default_factory=list, description="Metadata for ingested datasets"
    )


class ShopifyMarketingIngestionRequest(BaseModel):
    store_domain: Optional[str] = Field(
        None, description="Shopify store domain (my-store.myshopify.com). Defaults to settings."
    )
    access_token: Optional[str] = Field(
        None, description="Admin API access token. Defaults to settings."
    )
    api_version: Optional[str] = Field(
        None, description="Shopify Admin API version (e.g., 2024-04). Defaults to settings."
    )
    start_date: Optional[datetime] = Field(
        None, description="Optional marketing event start date filter (ISO-8601)."
    )
    end_date: Optional[datetime] = Field(
        None, description="Optional marketing event end date filter (ISO-8601)."
    )


class ShopifyMarketingIngestionResponse(BaseModel):
    job_id: str
    status: str
    submitted_at: datetime = Field(default_factory=datetime.utcnow)
    warnings: Optional[List[str]] = None
    ingested_count: int = Field(..., description="Number of datasets ingested")
    datasets: List[IngestedDatasetSummary] = Field(default_factory=list)
