"use client";

import { useEffect, useState } from "react";
import { fetchKpis } from "@/lib/api";
import { MetricCard } from "./MetricCard";
import type { MetricTrend } from "@/types/analytics";

export function OverviewMetrics() {
  const [metrics, setMetrics] = useState<MetricTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMetrics() {
      try {
        setLoading(true);
        const kpiMetrics = ["revenue", "aov", "roas", "conversion_rate"];
        const result = await fetchKpis(kpiMetrics);
        
        // Calculate trends by comparing with previous period
        // For now, we'll use a simple approach - in production, you'd fetch historical data
        const metricTrends: MetricTrend[] = [
          {
            label: "Revenue",
            value: result.kpis.revenue || 0,
            delta: 0, // Would calculate from historical data
            trend: "up",
          },
          {
            label: "AOV",
            value: result.kpis.aov || 0,
            delta: 0,
            trend: "flat",
          },
          {
            label: "ROAS",
            value: result.kpis.roas || 0,
            delta: 0,
            trend: "up",
          },
          {
            label: "Conversion Rate",
            value: (result.kpis.conversion_rate || 0) * 100, // Convert to percentage
            delta: 0,
            trend: "flat",
          },
        ];
        
        setMetrics(metricTrends);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load metrics");
        console.error("Error loading metrics:", err);
      } finally {
        setLoading(false);
      }
    }

    loadMetrics();
  }, []);

  if (loading) {
    return (
      <div className="grid gap-6 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-24 mb-4"></div>
            <div className="h-8 bg-slate-200 rounded w-32"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-700">
        <p className="text-sm font-medium">Error loading metrics: {error}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-4">
      {metrics.map((metric) => (
        <MetricCard key={metric.label} metric={metric} />
      ))}
    </div>
  );
}


