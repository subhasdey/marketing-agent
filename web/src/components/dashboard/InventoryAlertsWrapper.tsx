"use client";

import { useEffect, useState } from "react";
import { fetchInventoryAlerts } from "@/lib/api";
import { InventoryAlerts } from "./InventoryAlerts";
import type { InventoryAlert } from "@/types/analytics";

export function InventoryAlertsWrapper() {
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAlerts() {
      try {
        setLoading(true);
        const result = await fetchInventoryAlerts(30);
        
        // Transform API response to match component expectations
        const transformed: InventoryAlert[] = result.alerts.map((alert) => ({
          sku: alert.sku,
          productName: alert.product_name,
          daysRemaining: alert.days_remaining,
          priority: (alert.priority.toLowerCase() as "high" | "medium" | "low") || "medium",
        }));
        
        setAlerts(transformed);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load inventory alerts");
        console.error("Error loading inventory alerts:", err);
      } finally {
        setLoading(false);
      }
    }

    loadAlerts();
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-700">Inventory Alerts</h3>
        </div>
        <div className="p-4">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-700">
        <p className="text-sm font-medium">Error loading inventory alerts: {error}</p>
      </div>
    );
  }

  return <InventoryAlerts alerts={alerts} />;
}


