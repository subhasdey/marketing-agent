"use client";

import { useEffect, useState } from "react";
import { generateInsights } from "@/lib/api";
import type { InsightsResponse } from "@/types/analytics";

interface AutoInsightsProps {
  metrics: string[];
}

export function AutoInsights({ metrics }: AutoInsightsProps) {
  const [insights, setInsights] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (metrics.length === 0) return;

    setLoading(true);
    setError(null);
    generateInsights(metrics)
      .then(setInsights)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [metrics.join(",")]);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700">AutoML Insights</h3>
        <p className="mt-2 text-sm text-slate-500">Analyzing metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-red-700">AutoML Insights</h3>
        <p className="mt-2 text-sm text-red-600">Error: {error}</p>
      </div>
    );
  }

  if (!insights || insights.insights.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700">AutoML Insights</h3>
        <p className="mt-2 text-sm text-slate-500">No significant insights detected.</p>
      </div>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-rose-100 text-rose-700 border-rose-200";
      case "medium":
        return "bg-amber-100 text-amber-700 border-amber-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-700">AutoML Insights</h3>
        <span className="text-xs text-slate-500">
          {insights.insights.length} insight{insights.insights.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="space-y-4">
        {insights.insights.map((insight, idx) => (
          <div
            key={idx}
            className={`rounded-lg border p-4 ${getSeverityColor(insight.severity)}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-semibold text-sm mb-1">
                  {insight.metric.replace(/_/g, " ").toUpperCase()}
                </h4>
                <p className="text-sm mb-2">{insight.insight}</p>
                <div className="text-xs opacity-75">
                  Change: {insight.change_percent > 0 ? "+" : ""}
                  {insight.change_percent.toFixed(1)}% ({insight.change_absolute > 0 ? "+" : ""}
                  {insight.change_absolute.toFixed(0)})
                </div>
              </div>
              <span
                className={`px-2 py-1 rounded text-xs font-semibold ${getSeverityColor(insight.severity)}`}
              >
                {insight.severity.toUpperCase()}
              </span>
            </div>
            {insight.recommendations.length > 0 && (
              <div className="mt-3 pt-3 border-t border-current/20">
                <p className="text-xs font-semibold mb-1">Recommendations:</p>
                <ul className="text-xs space-y-1">
                  {insight.recommendations.map((rec, i) => (
                    <li key={i}>• {rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}


