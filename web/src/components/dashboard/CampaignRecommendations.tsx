"use client";

import { useEffect, useState } from "react";
import { fetchCampaignRecommendations } from "@/lib/api";
import { RecommendationBoard } from "./RecommendationBoard";
import type { CampaignRecommendation } from "@/types/analytics";

export function CampaignRecommendations() {
  const [recommendations, setRecommendations] = useState<CampaignRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRecommendations() {
      try {
        setLoading(true);
        const result = await fetchCampaignRecommendations();
        
        // Transform API response to match component expectations
        const transformed: CampaignRecommendation[] = result.recommendations.map((rec, idx) => ({
          id: `campaign-${idx}`,
          channel: rec.channel,
          objective: rec.name,
          expectedUplift: rec.expected_uplift ? `${rec.expected_uplift.toFixed(1)}%` : "N/A",
          summary: rec.talking_points.join(" ") || "No summary available",
          status: "planned" as const,
        }));
        
        setRecommendations(transformed);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load campaign recommendations");
        console.error("Error loading recommendations:", err);
      } finally {
        setLoading(false);
      }
    }

    loadRecommendations();
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-700">Campaign Recommendations</h3>
        </div>
        <div className="p-4">
          <div className="animate-pulse space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 bg-slate-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-700">
        <p className="text-sm font-medium">Error loading recommendations: {error}</p>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-700">Campaign Recommendations</h3>
        </div>
        <div className="p-4 text-sm text-slate-600">
          No campaign recommendations available at this time.
        </div>
      </div>
    );
  }

  return <RecommendationBoard recommendations={recommendations} />;
}


