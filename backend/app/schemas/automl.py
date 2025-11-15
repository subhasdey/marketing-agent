"""Schemas for AutoML requests and responses."""
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class ForecastRequest(BaseModel):
    metric: str = Field(..., description="Metric to forecast (e.g., 'revenue', 'roas', 'aov')")
    periods: int = Field(default=30, description="Number of future periods to forecast")
    filters: Dict[str, str] = Field(default_factory=dict, description="Filters to apply")


class ForecastPoint(BaseModel):
    date: str
    value: float


class ConfidenceInterval(BaseModel):
    date: str
    lower: float
    upper: float


class ForecastResponse(BaseModel):
    metric: str
    forecast: List[ForecastPoint]
    confidence_intervals: List[ConfidenceInterval]
    method: str
    historical_points: Optional[int] = None
    message: Optional[str] = None


class AnomalyDetectionRequest(BaseModel):
    metric: str = Field(..., description="Metric to analyze for anomalies")
    filters: Dict[str, str] = Field(default_factory=dict, description="Filters to apply")
    contamination: float = Field(default=0.1, description="Expected proportion of anomalies (0.0-0.5)")


class AnomalyPoint(BaseModel):
    date: str
    value: float
    anomaly_score: float


class AnomalyDetectionResponse(BaseModel):
    metric: str
    anomalies: List[AnomalyPoint]
    total_points: Optional[int] = None
    anomaly_count: Optional[int] = None
    method: str
    message: Optional[str] = None


class InsightsRequest(BaseModel):
    metrics: List[str] = Field(..., description="List of metrics to generate insights for")
    filters: Dict[str, str] = Field(default_factory=dict, description="Filters to apply")


class MetricInsight(BaseModel):
    metric: str
    current_value: float
    previous_value: float
    change_percent: float
    change_absolute: float
    insight: str
    recommendations: List[str]
    severity: str


class InsightsResponse(BaseModel):
    insights: List[MetricInsight]
    generated_at: str
    metrics_analyzed: int


class FeatureImportanceRequest(BaseModel):
    target_metric: str = Field(..., description="Metric to predict")
    feature_metrics: List[str] = Field(..., description="Metrics to use as features")
    filters: Dict[str, str] = Field(default_factory=dict, description="Filters to apply")


class FeatureImportanceResponse(BaseModel):
    target_metric: str
    feature_importance: Dict[str, float]
    method: str
    data_points: Optional[int] = None

