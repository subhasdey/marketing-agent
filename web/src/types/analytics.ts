export type MetricTrend = {
  label: string;
  value: number;
  delta: number;
  trend: "up" | "down" | "flat";
};

export type CohortInsight = {
  cohort: string;
  conversionRate: number;
  lift: number;
  size: number;
};

export type ExperimentPlan = {
  id: string;
  name: string;
  hypothesis: string;
  primaryMetric: string;
  status: "draft" | "testing" | "complete";
  eta: string;
};

export type CampaignRecommendation = {
  id: string;
  channel: string;
  objective: string;
  expectedUplift: string;
  summary: string;
  status: "planned" | "in-flight" | "blocked";
};

export type InventoryAlert = {
  sku: string;
  productName: string;
  daysRemaining: number;
  priority: "high" | "medium" | "low";
};

export type ForecastPoint = {
  date: string;
  value: number;
};

export type ConfidenceInterval = {
  date: string;
  lower: number;
  upper: number;
};

export type ForecastResponse = {
  metric: string;
  forecast: ForecastPoint[];
  confidence_intervals: ConfidenceInterval[];
  method: string;
  historical_points?: number;
  message?: string;
};

export type AnomalyPoint = {
  date: string;
  value: number;
  anomaly_score: number;
};

export type AnomalyResponse = {
  metric: string;
  anomalies: AnomalyPoint[];
  total_points?: number;
  anomaly_count?: number;
  method: string;
  message?: string;
};

export type MetricInsight = {
  metric: string;
  current_value: number;
  previous_value: number;
  change_percent: number;
  change_absolute: number;
  insight: string;
  recommendations: string[];
  severity: "low" | "medium" | "high";
};

export type InsightsResponse = {
  insights: MetricInsight[];
  generated_at: string;
  metrics_analyzed: number;
};

export type IngestedDatasetSummary = {
  table_name: string;
  business: string;
  category: string;
  dataset_name: string;
  source_file: string;
  row_count: number;
  columns: string[];
};

export type CsvIngestionResponse = {
  job_id: string;
  status: string;
  submitted_at: string;
  warnings?: string[];
  ingested_count: number;
  datasets: IngestedDatasetSummary[];
};
