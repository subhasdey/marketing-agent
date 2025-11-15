"use client";

import { useEffect, useState } from "react";
import { fetchCohorts } from "@/lib/api";
import { CohortTable } from "./CohortTable";
import type { CohortInsight } from "@/types/analytics";

export function CohortTableWrapper() {
  const [cohorts, setCohorts] = useState<CohortInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCohorts() {
      try {
        setLoading(true);
        // Use a common cohort dimension - adjust based on your data
        const result = await fetchCohorts("channel", "revenue");
        
        // Transform API response to match component expectations
        const transformed: CohortInsight[] = result.cohorts.map((cohort: any) => ({
          cohort: cohort.cohort_label || cohort.label || "Unknown",
          conversionRate: cohort.metrics?.conversion_rate || cohort.metrics?.conversion || 0,
          lift: cohort.metrics?.lift || 0,
          size: cohort.member_count || cohort.size || 0,
        }));
        
        setCohorts(transformed);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load cohort data");
        console.error("Error loading cohorts:", err);
        // Set empty array on error to show empty state
        setCohorts([]);
      } finally {
        setLoading(false);
      }
    }

    loadCohorts();
  }, []);

  if (loading) {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-700">Cohort Performance</h3>
        </div>
        <div className="p-4">
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="overflow-hidden rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-700">
        <p className="text-sm font-medium">Error loading cohort data: {error}</p>
      </div>
    );
  }

  if (cohorts.length === 0) {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-700">Cohort Performance</h3>
        </div>
        <div className="p-4 text-sm text-slate-600">
          No cohort data available at this time.
        </div>
      </div>
    );
  }

  return <CohortTable cohorts={cohorts} />;
}


