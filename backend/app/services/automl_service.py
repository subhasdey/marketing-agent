"""AutoML service for forecasting, anomaly detection, and automated insights."""
from __future__ import annotations

import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest, RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sqlalchemy import text
from sqlalchemy.engine import Engine

from ..core.config import settings
from ..db.session import engine
from ..services.analytics_service import AnalyticsService
from ..workflows.local_csv_ingestion import DATASET_REGISTRY_TABLE


class AutoMLService:
    """Automated machine learning for marketing metrics analysis."""

    def __init__(self, db_engine: Optional[Engine] = None) -> None:
        self.engine = db_engine or engine
        self.analytics_service = AnalyticsService(db_engine)

    def forecast_metric(
        self,
        metric: str,
        periods: int = 30,
        filters: Optional[Dict[str, str]] = None,
    ) -> Dict[str, any]:
        """Forecast a metric for future periods using time series analysis."""
        filters = filters or {}
        
        # Get historical data
        historical_data = self._get_time_series_data(metric, filters)
        
        if len(historical_data) < 7:
            return {
                "metric": metric,
                "forecast": [],
                "confidence_intervals": [],
                "method": "insufficient_data",
                "message": "Not enough historical data for forecasting",
            }

        # Prepare data for forecasting
        df = pd.DataFrame(historical_data)
        df["date"] = pd.to_datetime(df["date"])
        df = df.sort_values("date")
        df = df.set_index("date")

        # Simple moving average with trend
        forecast_values = []
        confidence_intervals = []
        
        # Use last N periods for trend calculation
        window = min(14, len(df))
        recent_values = df["value"].tail(window).values
        
        # Calculate trend
        if len(recent_values) >= 2:
            trend = (recent_values[-1] - recent_values[0]) / len(recent_values)
            last_value = recent_values[-1]
            std_dev = np.std(recent_values)
        else:
            trend = 0
            last_value = recent_values[-1] if len(recent_values) > 0 else 0
            std_dev = 0

        # Generate forecast
        last_date = df.index[-1]
        for i in range(1, periods + 1):
            forecast_date = last_date + timedelta(days=i)
            forecast_value = last_value + (trend * i)
            forecast_values.append({
                "date": forecast_date.isoformat(),
                "value": max(0, forecast_value),  # Ensure non-negative
            })
            confidence_intervals.append({
                "date": forecast_date.isoformat(),
                "lower": max(0, forecast_value - 1.96 * std_dev),
                "upper": max(0, forecast_value + 1.96 * std_dev),
            })

        return {
            "metric": metric,
            "forecast": forecast_values,
            "confidence_intervals": confidence_intervals,
            "method": "trend_analysis",
            "historical_points": len(df),
        }

    def detect_anomalies(
        self,
        metric: str,
        filters: Optional[Dict[str, str]] = None,
        contamination: float = 0.1,
    ) -> Dict[str, any]:
        """Detect anomalies in metric values using Isolation Forest."""
        filters = filters or {}
        
        # Get historical data
        historical_data = self._get_time_series_data(metric, filters)
        
        if len(historical_data) < 10:
            return {
                "metric": metric,
                "anomalies": [],
                "method": "insufficient_data",
                "message": "Not enough data for anomaly detection",
            }

        df = pd.DataFrame(historical_data)
        df["date"] = pd.to_datetime(df["date"])
        df = df.sort_values("date")

        # Prepare features (value, day_of_week, day_of_month, trend)
        features = []
        for idx, row in df.iterrows():
            date = row["date"]
            features.append([
                row["value"],
                date.dayofweek,
                date.day,
                date.month,
            ])

        X = np.array(features)
        
        # Detect anomalies
        iso_forest = IsolationForest(contamination=contamination, random_state=42)
        anomalies = iso_forest.fit_predict(X)
        
        # Get anomaly points
        anomaly_points = []
        for i, (idx, row) in enumerate(df.iterrows()):
            if anomalies[i] == -1:
                anomaly_points.append({
                    "date": row["date"].isoformat(),
                    "value": row["value"],
                    "anomaly_score": float(iso_forest.score_samples([X[i]])[0]),
                })

        return {
            "metric": metric,
            "anomalies": anomaly_points,
            "total_points": len(df),
            "anomaly_count": len(anomaly_points),
            "method": "isolation_forest",
        }

    def generate_insights(
        self,
        metrics: List[str],
        filters: Optional[Dict[str, str]] = None,
    ) -> Dict[str, any]:
        """Generate automated insights explaining metric changes and patterns."""
        filters = filters or {}
        insights = []
        
        for metric in metrics:
            # Get current and previous period data
            current_data = self._get_time_series_data(metric, filters, days=30)
            previous_data = self._get_time_series_data(metric, filters, days=60, end_days_ago=30)
            
            if not current_data or not previous_data:
                continue

            current_avg = np.mean([d["value"] for d in current_data])
            previous_avg = np.mean([d["value"] for d in previous_data])
            
            if previous_avg == 0:
                continue

            change_pct = ((current_avg - previous_avg) / previous_avg) * 100
            change_abs = current_avg - previous_avg

            # Generate insight text
            if abs(change_pct) > 5:
                direction = "increased" if change_pct > 0 else "decreased"
                magnitude = "significantly" if abs(change_pct) > 20 else "moderately"
                
                insight_text = (
                    f"{metric.replace('_', ' ').title()} {magnitude} {direction} "
                    f"by {abs(change_pct):.1f}% ({change_abs:+.0f}) compared to the previous period."
                )
                
                # Add recommendations
                recommendations = []
                if change_pct < -10:
                    recommendations.append(f"Investigate factors causing {metric} decline")
                    recommendations.append("Review recent campaign changes or external factors")
                elif change_pct > 10:
                    recommendations.append(f"Identify successful drivers of {metric} growth")
                    recommendations.append("Consider scaling successful strategies")

                insights.append({
                    "metric": metric,
                    "current_value": current_avg,
                    "previous_value": previous_avg,
                    "change_percent": change_pct,
                    "change_absolute": change_abs,
                    "insight": insight_text,
                    "recommendations": recommendations,
                    "severity": "high" if abs(change_pct) > 20 else "medium" if abs(change_pct) > 10 else "low",
                })

        return {
            "insights": insights,
            "generated_at": datetime.utcnow().isoformat(),
            "metrics_analyzed": len(metrics),
        }

    def feature_importance(
        self,
        target_metric: str,
        feature_metrics: List[str],
        filters: Optional[Dict[str, str]] = None,
    ) -> Dict[str, any]:
        """Determine feature importance for predicting a target metric."""
        filters = filters or {}
        
        # Get data for all metrics
        target_data = self._get_time_series_data(target_metric, filters)
        feature_data = {metric: self._get_time_series_data(metric, filters) for metric in feature_metrics}
        
        if len(target_data) < 10:
            return {
                "target_metric": target_metric,
                "feature_importance": {},
                "method": "insufficient_data",
            }

        # Align data by date
        df = pd.DataFrame(target_data)
        df["date"] = pd.to_datetime(df["date"])
        df = df.set_index("date")
        df = df.rename(columns={"value": target_metric})

        for metric, data in feature_data.items():
            if data:
                feat_df = pd.DataFrame(data)
                feat_df["date"] = pd.to_datetime(feat_df["date"])
                feat_df = feat_df.set_index("date")
                df[metric] = feat_df["value"]

        df = df.dropna()

        if len(df) < 10:
            return {
                "target_metric": target_metric,
                "feature_importance": {},
                "method": "insufficient_data",
            }

        # Train Random Forest to get feature importance
        X = df[feature_metrics].values
        y = df[target_metric].values

        if len(X) == 0 or X.shape[1] == 0:
            return {
                "target_metric": target_metric,
                "feature_importance": {},
                "method": "insufficient_data",
            }

        model = RandomForestRegressor(n_estimators=50, random_state=42)
        model.fit(X, y)

        # Get feature importance
        importance_dict = {}
        for i, metric in enumerate(feature_metrics):
            importance_dict[metric] = float(model.feature_importances_[i])

        # Sort by importance
        sorted_importance = dict(
            sorted(importance_dict.items(), key=lambda x: x[1], reverse=True)
        )

        return {
            "target_metric": target_metric,
            "feature_importance": sorted_importance,
            "method": "random_forest",
            "data_points": len(df),
        }

    def _get_time_series_data(
        self,
        metric: str,
        filters: Dict[str, str],
        days: int = 90,
        end_days_ago: int = 0,
    ) -> List[Dict[str, any]]:
        """Get time series data for a metric."""
        datasets = self._load_available_datasets()
        all_data = []

        # Find date and value columns
        for dataset in datasets:
            table_name = dataset["table_name"]
            columns = dataset.get("columns", [])

            # Find date column (prioritize month, then date, time)
            date_cols = []
            for col in columns:
                col_lower = col.lower()
                if "month" in col_lower:
                    date_cols.insert(0, col)  # Prioritize month
                elif any(x in col_lower for x in ["date", "time", "day"]):
                    date_cols.append(col)
            
            # Find value column for metric
            value_cols = []
            metric_lower = metric.lower()
            for col in columns:
                col_lower = col.lower()
                if metric_lower in col_lower:
                    value_cols.insert(0, col)  # Exact match first
                elif any(x in col_lower for x in ["sales", "revenue", "value", "amount", "total", "gross"]):
                    value_cols.append(col)

            if not date_cols or not value_cols:
                continue

            try:
                date_col = date_cols[0]
                value_col = value_cols[0]
                
                where_clause = self._build_where_clause(filters)
                query = text(f'SELECT "{date_col}", "{value_col}" FROM "{table_name}" {where_clause} LIMIT 1000')
                
                with self.engine.begin() as connection:
                    result = connection.execute(query)
                    for row in result:
                        try:
                            date_val = row[0]
                            value_val = row[1]
                            
                            # Skip None values
                            if value_val is None:
                                continue
                                
                            try:
                                value_val = float(value_val)
                            except (ValueError, TypeError):
                                continue
                            
                            # Parse date
                            if isinstance(date_val, str):
                                # Try to parse various date formats
                                parsed = False
                                for fmt in ["%Y-%m", "%Y-%m-%d", "%m/%d/%Y", "%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S"]:
                                    try:
                                        date_val = datetime.strptime(date_val, fmt)
                                        # If only year-month, set to first of month
                                        if fmt == "%Y-%m":
                                            date_val = date_val.replace(day=1)
                                        parsed = True
                                        break
                                    except:
                                        continue
                                
                                if not parsed:
                                    continue
                            
                            if isinstance(date_val, datetime):
                                all_data.append({
                                    "date": date_val,
                                    "value": value_val,
                                })
                        except Exception as e:
                            # Silently skip problematic rows
                            continue
            except Exception as e:
                # Silently skip problematic tables
                continue

        # Filter by date range, but if no data in range, use all available data
        end_date = datetime.now() - timedelta(days=end_days_ago)
        start_date = end_date - timedelta(days=days)
        
        filtered_data = [
            d for d in all_data
            if isinstance(d["date"], datetime) and start_date <= d["date"] <= end_date
        ]

        # If no data in requested range, use all available data (sorted by date)
        if not filtered_data and all_data:
            filtered_data = sorted(all_data, key=lambda x: x["date"])
            # Take the most recent N points
            filtered_data = filtered_data[-min(days, len(filtered_data)):]

        return filtered_data

    def _load_available_datasets(self) -> List[Dict[str, str]]:
        """Load dataset registry."""
        query = text(f"SELECT table_name, business, category, columns FROM {DATASET_REGISTRY_TABLE}")
        with self.engine.begin() as connection:
            result = connection.execute(query)
            rows = [dict(row._mapping) for row in result]
        for row in rows:
            if isinstance(row.get("columns"), str):
                try:
                    row["columns"] = json.loads(row["columns"])
                except:
                    row["columns"] = []
        return rows

    def _build_where_clause(self, filters: Dict[str, str]) -> str:
        """Build WHERE clause from filters."""
        if not filters:
            return ""
        conditions = []
        for key, value in filters.items():
            conditions.append(f'"{key}" = "{value}"')
        return "WHERE " + " AND ".join(conditions) if conditions else ""

