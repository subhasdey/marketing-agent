"""Ingest Shopify marketing events into the analytics warehouse."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional, Union

import httpx
import pandas as pd
from sqlalchemy.engine import Engine

from ..core.config import settings
from ..db.session import engine
from .local_csv_ingestion import IngestedDataset, _ensure_registry, _normalize_identifier, _record_dataset


def _build_records(events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    records: List[Dict[str, Any]] = []
    for event in events:
        engagements = event.get("engagements") or []
        total_impressions = 0
        total_clicks = 0
        total_spend = 0.0
        for engagement in engagements:
            if isinstance(engagement, dict):
                total_impressions += int(engagement.get("impressions") or 0)
                total_clicks += int(engagement.get("clicks") or 0)
                total_spend += float(engagement.get("ad_spend") or 0.0)

        record = {
            "event_id": event.get("id"),
            "remote_id": event.get("remote_id"),
            "event_type": event.get("event_type"),
            "marketing_channel": event.get("marketing_channel"),
            "budget": event.get("budget"),
            "currency": event.get("currency"),
            "started_at": event.get("started_at"),
            "ended_at": event.get("scheduled_to_end_at"),
            "utm_campaign": event.get("utm_campaign"),
            "utm_source": event.get("utm_source"),
            "utm_medium": event.get("utm_medium"),
            "utm_content": event.get("utm_content"),
            "utm_term": event.get("utm_term"),
            "paid": event.get("paid"),
            "preview_url": event.get("preview_url"),
            "status": event.get("status"),
            "platform": event.get("platform"),
            "total_impressions": total_impressions,
            "total_clicks": total_clicks,
            "total_spend": total_spend,
        }
        records.append(record)
    return records


def fetch_shopify_marketing_events(
    *,
    store_domain: str,
    access_token: str,
    api_version: Optional[str] = None,
    start_date: Optional[Union[str, datetime]] = None,
    end_date: Optional[Union[str, datetime]] = None,
    limit: int = 250,
) -> List[Dict[str, Any]]:
    if not store_domain:
        raise ValueError("Shopify store domain is required")
    if not access_token:
        raise ValueError("Shopify Admin API access token is required")

    version = api_version or settings.shopify_api_version
    base_url = f"https://{store_domain}/admin/api/{version}/marketing_events.json"
    headers = {"X-Shopify-Access-Token": access_token}

    params: Dict[str, Any] = {"limit": limit}
    if start_date:
        params["started_at_min"] = start_date.isoformat() if isinstance(start_date, datetime) else start_date
    if end_date:
        params["ended_at_max"] = end_date.isoformat() if isinstance(end_date, datetime) else end_date

    events: List[Dict[str, Any]] = []
    since_id: Optional[int] = None

    with httpx.Client(timeout=30) as client:
        while True:
            if since_id:
                params["since_id"] = since_id
            response = client.get(base_url, headers=headers, params=params)
            response.raise_for_status()
            chunk = response.json().get("marketing_events", [])
            if not chunk:
                break
            events.extend(chunk)
            if len(chunk) < limit:
                break
            since_id = chunk[-1].get("id")
            if not since_id:
                break

    return events


def ingest_shopify_marketing_events(
    *,
    store_domain: Optional[str] = None,
    access_token: Optional[str] = None,
    api_version: Optional[str] = None,
    start_date: Optional[Union[str, datetime]] = None,
    end_date: Optional[Union[str, datetime]] = None,
    engine_override: Optional[Engine] = None,
) -> IngestedDataset:
    domain = store_domain or settings.shopify_store_domain
    token = access_token or settings.shopify_access_token
    events = fetch_shopify_marketing_events(
        store_domain=domain,
        access_token=token,
        api_version=api_version or settings.shopify_api_version,
        start_date=start_date,
        end_date=end_date,
    )

    if not events:
        raise ValueError("No marketing events returned from Shopify")

    records = _build_records(events)
    df = pd.DataFrame(records)
    business_name = domain or "shopify_store"
    business_slug = _normalize_identifier(business_name)
    table_name = f"{business_slug}_marketing_events"

    work_engine = engine_override or engine
    _ensure_registry(work_engine)

    df.to_sql(table_name, work_engine, if_exists="replace", index=False)

    dataset = IngestedDataset(
        table_name=table_name,
        business=business_name,
        category="marketing",
        dataset_name=f"{business_slug}_shopify_marketing",
        source_file=f"shopify://{business_name}/marketing_events",
        row_count=len(df),
        columns=list(df.columns),
    )
    _record_dataset(work_engine, dataset)
    return dataset


def ingest_default_shopify_marketing() -> IngestedDataset:
    """Helper for manual execution."""
    start = datetime.utcnow().isoformat()
    dataset = ingest_shopify_marketing_events()
    print(f"[{start}] Ingested Shopify marketing dataset: {dataset.table_name}")
    return dataset


__all__ = ["ingest_shopify_marketing_events", "fetch_shopify_marketing_events"]

