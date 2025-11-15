"""AutoML endpoints for forecasting, anomaly detection, and insights."""
from fastapi import APIRouter

from ...schemas.automl import (
    AnomalyDetectionRequest,
    AnomalyDetectionResponse,
    FeatureImportanceRequest,
    FeatureImportanceResponse,
    ForecastRequest,
    ForecastResponse,
    InsightsRequest,
    InsightsResponse,
)
from ...services.automl_service import AutoMLService

router = APIRouter()
automl_service = AutoMLService()


@router.post("/forecast", response_model=ForecastResponse, summary="Forecast metric values")
async def forecast_metric(request: ForecastRequest) -> ForecastResponse:
    """Generate forecast for a metric using time series analysis."""
    result = automl_service.forecast_metric(
        metric=request.metric,
        periods=request.periods,
        filters=request.filters,
    )
    return ForecastResponse(**result)


@router.post("/anomalies", response_model=AnomalyDetectionResponse, summary="Detect anomalies in metrics")
async def detect_anomalies(request: AnomalyDetectionRequest) -> AnomalyDetectionResponse:
    """Detect anomalies in metric values using machine learning."""
    result = automl_service.detect_anomalies(
        metric=request.metric,
        filters=request.filters,
        contamination=request.contamination,
    )
    return AnomalyDetectionResponse(**result)


@router.post("/insights", response_model=InsightsResponse, summary="Generate automated insights")
async def generate_insights(request: InsightsRequest) -> InsightsResponse:
    """Generate automated insights explaining metric changes and patterns."""
    result = automl_service.generate_insights(
        metrics=request.metrics,
        filters=request.filters,
    )
    return InsightsResponse(**result)


@router.post("/feature-importance", response_model=FeatureImportanceResponse, summary="Analyze feature importance")
async def feature_importance(request: FeatureImportanceRequest) -> FeatureImportanceResponse:
    """Determine which features are most important for predicting a target metric."""
    result = automl_service.feature_importance(
        target_metric=request.target_metric,
        feature_metrics=request.feature_metrics,
        filters=request.filters,
    )
    return FeatureImportanceResponse(**result)

