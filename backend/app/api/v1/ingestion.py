"""Endpoints for data ingestion orchestration."""
import tempfile
import uuid
from pathlib import Path
from typing import List

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from ...schemas.ingestion import (
    CsvIngestionRequest,
    CsvIngestionResponse,
    ShopifyMarketingIngestionRequest,
    ShopifyMarketingIngestionResponse,
    SourceRegistrationRequest,
    SourceRegistrationResponse,
)
from ...services.ingestion_service import IngestionService

router = APIRouter()
ingestion_service = IngestionService()


@router.post("/sources", response_model=SourceRegistrationResponse, summary="Register a data source")
async def register_source(payload: SourceRegistrationRequest) -> SourceRegistrationResponse:
    """Register a Shopify store, CSV feed, or plugin data source for ingestion."""
    result = ingestion_service.register_source(payload.model_dump())
    return SourceRegistrationResponse(source_id=result["source_id"], status=result["status"])


@router.post("/csv", response_model=CsvIngestionResponse, summary="Ingest CSV data")
async def ingest_csv(payload: CsvIngestionRequest) -> CsvIngestionResponse:
    """Kick off CSV ingestion job and return job metadata."""
    result = ingestion_service.submit_csv_job(payload.model_dump())
    return CsvIngestionResponse(
        job_id=result["job_id"],
        status=result["status"],
        ingested_count=result["ingested_count"],
        datasets=result["datasets"],
        warnings=result.get("warnings") or None,
    )


@router.post(
    "/csv/upload",
    response_model=CsvIngestionResponse,
    summary="Upload a CSV file and ingest it",
)
async def upload_csv_dataset(
    dataset_name: str | None = Form(
        None,
        description="Optional dataset name or prefix (filename fallback is used if omitted or multiple files provided).",
    ),
    business: str | None = Form(None, description="Optional business label"),
    files: List[UploadFile] = File(...),
) -> CsvIngestionResponse:
    """Accept one or more CSV uploads, store them temporarily, and run the ingestion workflow."""
    if not files:
        raise HTTPException(status_code=400, detail="At least one CSV file is required.")

    temp_paths: List[Path] = []
    combined_datasets = []
    warnings: List[str] = []
    ingested_count = 0
    status = "completed"

    try:
        for index, file in enumerate(files):
            contents = await file.read()
            if not contents:
                warnings.append(f"{file.filename or 'file'} was empty and skipped.")
                status = "failed"
                continue

            suffix = Path(file.filename or "dataset.csv").suffix or ".csv"
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                tmp.write(contents)
                temp_path = Path(tmp.name)
                temp_paths.append(temp_path)

            derived_name = dataset_name
            if len(files) > 1:
                prefix = dataset_name or (Path(file.filename or f"dataset_{index+1}").stem)
                derived_name = f"{prefix}_{index + 1}"
            elif not derived_name:
                derived_name = Path(file.filename or "dataset").stem

            payload = {
                "dataset_name": derived_name,
                "file_path": str(temp_path),
            }
            if business:
                payload["business"] = business

            result = ingestion_service.submit_csv_job(payload)
            combined_datasets.extend(result["datasets"])
            ingested_count += result["ingested_count"]
            if result.get("warnings"):
                warnings.extend(result["warnings"])
            if result["status"] != "completed":
                status = "failed"
    finally:
        for temp_path in temp_paths:
            temp_path.unlink(missing_ok=True)

    job_id = f"job_batch_{uuid.uuid4().hex[:8]}"
    return CsvIngestionResponse(
        job_id=job_id,
        status=status,
        ingested_count=ingested_count,
        datasets=combined_datasets,
        warnings=warnings or None,
    )


@router.post(
    "/shopify/marketing",
    response_model=ShopifyMarketingIngestionResponse,
    summary="Ingest Shopify marketing events",
)
async def ingest_shopify_marketing(
    payload: ShopifyMarketingIngestionRequest,
) -> ShopifyMarketingIngestionResponse:
    """Fetch Shopify marketing events via Admin API and ingest them."""
    result = ingestion_service.ingest_shopify_marketing(payload.model_dump(exclude_unset=True))
    return ShopifyMarketingIngestionResponse(
        job_id=result["job_id"],
        status=result["status"],
        ingested_count=result["ingested_count"],
        datasets=result["datasets"],
        warnings=result.get("warnings") or None,
    )
