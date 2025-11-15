"use client";

import { useEffect, useState } from "react";
import { forecastMetric } from "@/lib/api";
import type { ForecastResponse } from "@/types/analytics";

interface ForecastChartProps {
  metric: string;
  periods?: number;
}

export function ForecastChart({ metric, periods = 30 }: ForecastChartProps) {
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    forecastMetric(metric, periods)
      .then(setForecast)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [metric, periods]);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700">
          {metric.charAt(0).toUpperCase() + metric.slice(1)} Forecast
        </h3>
        <p className="mt-2 text-sm text-slate-500">Generating forecast...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-red-700">Forecast Error</h3>
        <p className="mt-2 text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!forecast || forecast.forecast.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700">
          {metric.charAt(0).toUpperCase() + metric.slice(1)} Forecast
        </h3>
        <p className="mt-2 text-sm text-slate-500">
          {forecast?.message || "Insufficient data for forecasting"}
        </p>
      </div>
    );
  }

  // Calculate min/max for scaling
  const allValues = [
    ...forecast.forecast.map((f) => f.value),
    ...forecast.confidence_intervals.map((c) => c.upper),
    ...forecast.confidence_intervals.map((c) => c.lower),
  ].filter((v) => !isNaN(v) && isFinite(v));

  const maxValue = Math.max(...allValues, 1);
  const minValue = Math.min(...allValues, 0);

  const getBarHeight = (value: number) => {
    if (maxValue === minValue) return "10%";
    return `${((value - minValue) / (maxValue - minValue)) * 100}%`;
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-700">
          {metric.charAt(0).toUpperCase() + metric.slice(1)} Forecast ({periods} days)
        </h3>
        <span className="text-xs text-slate-500">{forecast.method}</span>
      </div>

      <div className="space-y-3">
        {/* Forecast bars */}
        <div className="flex items-end gap-1 h-32">
          {forecast.forecast.slice(0, 14).map((point, idx) => {
            const date = new Date(point.date);
            const ci = forecast.confidence_intervals[idx];
            return (
              <div key={idx} className="flex-1 flex flex-col items-center group relative">
                <div className="w-full flex flex-col items-center justify-end h-full">
                  {/* Confidence interval background */}
                  {ci && (
                    <div
                      className="w-full bg-slate-100 opacity-30 rounded-t"
                      style={{
                        height: getBarHeight(ci.upper - ci.lower),
                        marginBottom: getBarHeight(ci.lower),
                      }}
                    />
                  )}
                  {/* Forecast bar */}
                  <div
                    className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors"
                    style={{ height: getBarHeight(point.value) }}
                  />
                </div>
                {/* Date label */}
                <span className="text-xs text-slate-500 mt-1 transform -rotate-45 origin-top-left whitespace-nowrap">
                  {date.getMonth() + 1}/{date.getDate()}
                </span>
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-900 text-white text-xs rounded px-2 py-1 z-10">
                  {date.toLocaleDateString()}: {point.value.toFixed(0)}
                  {ci && ` (${ci.lower.toFixed(0)} - ${ci.upper.toFixed(0)})`}
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200">
          <div>
            <p className="text-xs text-slate-500">Avg Forecast</p>
            <p className="text-sm font-semibold text-slate-900">
              {(
                forecast.forecast.reduce((sum, p) => sum + p.value, 0) /
                forecast.forecast.length
              ).toFixed(0)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Peak</p>
            <p className="text-sm font-semibold text-slate-900">
              {Math.max(...forecast.forecast.map((p) => p.value)).toFixed(0)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Data Points</p>
            <p className="text-sm font-semibold text-slate-900">
              {forecast.historical_points || "N/A"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


