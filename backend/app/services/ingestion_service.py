"""Ingestion service orchestrating CSV and API datasets."""
from __future__ import annotations

import uuid
from pathlib import Path
from typing import Any, Dict

from ..core.config import settings
from ..workflows.local_csv_ingestion import ingest_directory, ingest_csv_file
from ..workflows.shopify_marketing_ingestion import ingest_shopify_marketing_events


class IngestionService:
    """Coordinate ingestion flows for Shopify, CSV, and plugin sources."""

    def register_source(self, configuration: Dict[str, Any]) -> Dict[str, Any]:
        """Register a new data source and return metadata."""
        return {"source_id": "src_placeholder", "status": "registered", "configuration": configuration}

    def submit_csv_job(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Submit a CSV ingestion job into the orchestration queue."""
        directory = payload.get("file_path") or payload.get("directory")
        business = payload.get("business")

        base_path = Path(directory) if directory else Path(settings.ingestion_data_root)
        dataset_name = payload.get("dataset_name")
        try:
            if base_path.is_file():
                ingested = [
                    ingest_csv_file(
                        base_path,
                        business=business,
                        dataset_name=dataset_name,
                    )
                ]
            else:
                ingested = ingest_directory(base_path, business=business)
            status = "completed"
            warnings = []
        except FileNotFoundError as exc:
            ingested = []
            status = "failed"
            warnings = [str(exc)]

        return {
            "job_id": f"job_{uuid.uuid4().hex[:8]}",
            "status": status,
            "ingested_count": len(ingested),
            "datasets": [dataset.__dict__ for dataset in ingested],
            "warnings": warnings,
        }

    def ingest_shopify_marketing(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Fetch Shopify marketing events and ingest into the warehouse."""
        store_domain = payload.get("store_domain")
        access_token = payload.get("access_token")
        api_version = payload.get("api_version")
        start_date = payload.get("start_date")
        end_date = payload.get("end_date")

        try:
            dataset = ingest_shopify_marketing_events(
                store_domain=store_domain,
                access_token=access_token,
                api_version=api_version,
                start_date=start_date,
                end_date=end_date,
            )
            status = "completed"
            warnings: list[str] = []
            ingested = [dataset]
        except Exception as exc:  # pragma: no cover - defensive
            status = "failed"
            warnings = [str(exc)]
            ingested = []

        return {
            "job_id": f"job_{uuid.uuid4().hex[:8]}",
            "status": status,
            "ingested_count": len(ingested),
            "datasets": [dataset.__dict__ for dataset in ingested],
            "warnings": warnings,
        }

