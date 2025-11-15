"use client";

import { useEffect, useState } from "react";
import { detectAnomalies } from "@/lib/api";
import type { AnomalyResponse } from "@/types/analytics";

interface AnomalyAlertsProps {
  metric: string;
}

export function AnomalyAlerts({ metric }: AnomalyAlertsProps) {
  const [anomalies, setAnomalies] = useState<AnomalyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    detectAnomalies(metric, 0.1)
      .then(setAnomalies)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [metric]);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700">Anomaly Detection</h3>
        <p className="mt-2 text-sm text-slate-500">Analyzing {metric}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-red-700">Anomaly Detection</h3>
        <p className="mt-2 text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!anomalies || anomalies.anomalies.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-emerald-700">Anomaly Detection</h3>
        <p className="mt-2 text-sm text-emerald-600">
          No anomalies detected in {metric}. Data looks normal.
        </p>
        {anomalies && (
          <p className="mt-1 text-xs text-emerald-600">
            Analyzed {anomalies.total_points} data points
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-amber-700">Anomaly Detection</h3>
        <span className="px-2 py-1 bg-amber-200 text-amber-800 rounded text-xs font-semibold">
          {anomalies.anomaly_count} Anomal{anomalies.anomaly_count !== 1 ? "ies" : "y"}
        </span>
      </div>

      <div className="space-y-3">
        {anomalies.anomalies.slice(0, 5).map((anomaly, idx) => {
          const date = new Date(anomaly.date);
          const severity =
            anomaly.anomaly_score < -0.7
              ? "high"
              : anomaly.anomaly_score < -0.5
                ? "medium"
                : "low";

          return (
            <div
              key={idx}
              className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-200"
            >
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800">
                  {date.toLocaleDateString()}
                </p>
                <p className="text-xs text-slate-600">
                  Value: {anomaly.value.toFixed(2)} | Score: {anomaly.anomaly_score.toFixed(3)}
                </p>
              </div>
              <span
                className={`px-2 py-1 rounded text-xs font-semibold ${
                  severity === "high"
                    ? "bg-rose-100 text-rose-700"
                    : severity === "medium"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-slate-100 text-slate-700"
                }`}
              >
                {severity.toUpperCase()}
              </span>
            </div>
          );
        })}
      </div>

      {anomalies.anomalies.length > 5 && (
        <p className="mt-4 text-xs text-amber-700">
          Showing 5 of {anomalies.anomalies.length} anomalies
        </p>
      )}

      {anomalies.total_points && (
        <p className="mt-2 text-xs text-amber-600">
          Analyzed {anomalies.total_points} total data points
        </p>
      )}
    </div>
  );
}


