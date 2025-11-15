"use client";

import { useEffect, useState } from "react";
import { fetchExperimentPlans } from "@/lib/api";
import { ExperimentList } from "./ExperimentList";
import type { ExperimentPlan } from "@/types/analytics";

export function ExperimentPlannerWrapper() {
  const [experiments, setExperiments] = useState<ExperimentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadExperiments() {
      try {
        setLoading(true);
        const result = await fetchExperimentPlans(["revenue", "conversion_rate", "roas"]);
        
        // Transform API response to match component expectations
        const transformed: ExperimentPlan[] = result.experiments.map((exp, idx) => ({
          id: `exp-${idx.toString().padStart(3, "0")}`,
          name: exp.name,
          hypothesis: exp.hypothesis,
          primaryMetric: exp.primary_metric,
          status: (exp.status.toLowerCase() as "draft" | "testing" | "complete") || "draft",
          eta: exp.eta,
        }));
        
        setExperiments(transformed);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load experiment plans");
        console.error("Error loading experiments:", err);
      } finally {
        setLoading(false);
      }
    }

    loadExperiments();
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-700">Experiment Planner</h3>
        </div>
        <div className="p-4">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-700">
        <p className="text-sm font-medium">Error loading experiments: {error}</p>
      </div>
    );
  }

  if (experiments.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-700">Experiment Planner</h3>
        </div>
        <div className="p-4 text-sm text-slate-600">
          No experiment plans available at this time.
        </div>
      </div>
    );
  }

  return <ExperimentList experiments={experiments} />;
}


