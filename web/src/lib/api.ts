import type { CsvIngestionResponse } from "@/types/analytics";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000/api";

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function fetchHealth() {
  const response = await fetch(`${API_BASE}/v1/health`);
  return handleResponse<{ status: string; timestamp: string }>(response);
}

export async function fetchKpis(metrics: string[]) {
  const response = await fetch(`${API_BASE}/v1/analytics/kpi`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ metrics }),
  });
  return handleResponse<{ kpis: Record<string, number> }>(response);
}

export async function fetchCohorts(groupBy: string, metric: string) {
  const response = await fetch(`${API_BASE}/v1/analytics/cohort`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ group_by: groupBy, metric }),
  });
  return handleResponse<{ group_key: string; cohorts: unknown[] }>(response);
}

export async function generateSqlFromPrompt(prompt: string) {
  const response = await fetch(`${API_BASE}/v1/analytics/prompt-sql`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  return handleResponse<{
    table_name: string;
    business: string;
    dataset_name: string;
    sql: string;
    columns: string[];
    rows: Record<string, unknown>[];
  }>(response);
}

export async function forecastMetric(metric: string, periods: number = 30) {
  const response = await fetch(`${API_BASE}/v1/automl/forecast`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ metric, periods }),
  });
  return handleResponse<{
    metric: string;
    forecast: Array<{ date: string; value: number }>;
    confidence_intervals: Array<{ date: string; lower: number; upper: number }>;
    method: string;
    historical_points?: number;
    message?: string;
  }>(response);
}

export async function detectAnomalies(metric: string, contamination: number = 0.1) {
  const response = await fetch(`${API_BASE}/v1/automl/anomalies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ metric, contamination }),
  });
  return handleResponse<{
    metric: string;
    anomalies: Array<{ date: string; value: number; anomaly_score: number }>;
    total_points?: number;
    anomaly_count?: number;
    method: string;
    message?: string;
  }>(response);
}

export async function generateInsights(metrics: string[]) {
  const response = await fetch(`${API_BASE}/v1/automl/insights`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ metrics }),
  });
  return handleResponse<{
    insights: Array<{
      metric: string;
      current_value: number;
      previous_value: number;
      change_percent: number;
      change_absolute: number;
      insight: string;
      recommendations: string[];
      severity: string;
    }>;
    generated_at: string;
    metrics_analyzed: number;
  }>(response);
}

export async function fetchCampaignRecommendations(objectives: string[] = ["increase revenue", "improve ROAS"]) {
  const response = await fetch(`${API_BASE}/v1/intelligence/campaigns`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ objectives, audience_segments: [], constraints: {} }),
  });
  return handleResponse<{
    recommendations: Array<{
      name: string;
      channel: string;
      expected_uplift: number | null;
      talking_points: string[];
    }>;
    rationale: string;
    generated_at: string;
  }>(response);
}

export async function fetchInventoryAlerts(thresholdDays: number = 30) {
  const response = await fetch(`${API_BASE}/v1/products/inventory/alerts?threshold_days=${thresholdDays}`);
  return handleResponse<{
    alerts: Array<{
      sku: string;
      product_name: string;
      days_remaining: number;
      priority: string;
      source_table: string;
    }>;
    count: number;
    generated_at: string;
  }>(response);
}

export async function fetchExperimentPlans(metrics: string[] = ["revenue", "conversion_rate", "roas"]) {
  const response = await fetch(`${API_BASE}/v1/intelligence/experiments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ metrics, context: {} }),
  });
  return handleResponse<{
    experiments: Array<{
      name: string;
      hypothesis: string;
      primary_metric: string;
      status: string;
      eta: string;
    }>;
    generated_at: string;
  }>(response);
}

export async function uploadCsvDatasets(params: { files: File[]; datasetName?: string; business?: string }) {
  if (!params.files.length) {
    throw new Error("Please provide at least one CSV file.");
  }

  const formData = new FormData();
  if (params.datasetName) {
    formData.append("dataset_name", params.datasetName);
  }
  if (params.business) {
    formData.append("business", params.business);
  }
  for (const file of params.files) {
    formData.append("files", file);
  }

  const response = await fetch(`${API_BASE}/v1/ingestion/csv/upload`, {
    method: "POST",
    body: formData,
  });
  return handleResponse<CsvIngestionResponse>(response);
}
