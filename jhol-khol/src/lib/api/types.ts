/**
 * TypeScript interfaces for Backend API responses
 */

// ============================================================================
// OVERVIEW & HEALTH
// ============================================================================

export interface HealthResponse {
  status: string;
  rows_loaded: {
    departments: number;
    ddos: number;
    vendors: number;
    allocations: number;
    transactions: number;
    alerts: number;
    welfare_schemes?: number;
    scheme_disbursements?: number;
  };
}

export interface OverviewResponse {
  total_allocated_cr: number;
  total_utilized_cr: number;
  utilization_pct: number;
  anomaly_count: number;
  high_severity_count: number;
  amount_at_risk_cr: number;
  total_departments: number;
  total_ddos: number;
}

// ============================================================================
// ANOMALIES & ALERTS
// ============================================================================

export type AnomalyType =
  | 'Phantom Utilization'
  | 'Duplicate Payment'
  | 'Year-End Rush'
  | 'Vendor Collusion Network'
  | 'Statistical Outlier'
  | 'Price Spike'
  | 'Unusual Timing';

export type SeverityLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface Anomaly {
  alert_id: string;
  txn_id?: string;
  ddo_code: string;
  alert_type: AnomalyType;
  confidence_score: number;
  severity: SeverityLevel;
  amount_cr?: number;
  description: string;
  detected_date: string;
  status?: string;
}

export interface AnomaliesResponse {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  data: Anomaly[];
}

export interface AnomalySummaryResponse {
  total_anomalies: number;
  by_severity: Record<SeverityLevel, number>;
  by_type: Record<string, number>;
  total_amount_at_risk_cr: number;
}

export interface AnomalyScanResponse {
  total_detected: number;
  flagged_amount_cr: number;
  severity_counts: Record<SeverityLevel, number>;
  type_counts: Record<string, number>;
  data: Anomaly[];
}

// ============================================================================
// BUDGET FLOW
// ============================================================================

export interface BudgetFlowNode {
  id: string;
  name: string;
  type: 'ministry' | 'department' | 'district' | 'ddo';
}

export interface BudgetFlowLink {
  source: string;
  target: string;
  value: number;
}

export interface BudgetFlowResponse {
  nodes: BudgetFlowNode[];
  links: BudgetFlowLink[];
}

export interface DepartmentUtilization {
  dept_id: number;
  name: string;
  ministry: string;
  allocated_cr: number;
  utilized_cr: number;
  utilization_pct: number;
}

export interface DepartmentsResponse {
  departments: DepartmentUtilization[];
}

// ============================================================================
// LAPSE RISK
// ============================================================================

export type RiskLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface LapseRisk {
  dept_id: number;
  name: string;
  ministry: string;
  allocated_cr: number;
  q1_q3_spent_cr: number;
  projected_utilization_pct: number;
  historical_avg_pct: number;
  lapse_amount_cr: number;
  risk_score: number;
  risk_level: RiskLevel;
}

export interface LapseRiskResponse {
  total: number;
  data: LapseRisk[];
}

export interface LapseRiskSummaryResponse {
  high_count: number;
  medium_count: number;
  low_count: number;
  total_at_risk_cr: number;
  highest_risk_dept: string;
}

// ============================================================================
// ML PREDICTIONS
// ============================================================================

export interface MLLapsePrediction {
  dept_id: number;
  dept_name: string;
  ministry: string;
  predicted_lapse_pct: number;
  prediction_confidence: number;
  risk_category: RiskLevel;
  recommended_action: string;
}

export interface MLLapsePredictResponse {
  predictions: MLLapsePrediction[];
  model_version: string;
  prediction_date: string;
}

export interface MLFeatureImportance {
  feature: string;
  weight: number;
  importance: number;
  direction: string;
}

export interface MLModelStatsResponse {
  model_info: {
    type: string;
    implementation: string;
    training_years: string[];
    prediction_year: string;
    epochs: number;
    learning_rate: number;
    l2_lambda: number;
    decision_threshold: number;
    lapse_definition: string;
  };
  dataset_info: {
    total_labelled_samples: number;
    train_samples: number;
    validation_samples: number;
    split_method: string;
    warning: string;
    label_distribution: {
      train_lapsed: number;
      train_not_lapsed: number;
      val_lapsed: number;
      val_not_lapsed: number;
    };
  };
  training_metrics: {
    note: string;
    samples: number;
    accuracy_pct: number;
    log_loss: number;
  };
  validation_metrics: {
    note: string;
    samples: number;
    accuracy_pct: number;
    log_loss: number;
    precision_pct: number;
    recall_pct: number;
    f1_score: number;
    confusion_matrix: {
      TP: number;
      TN: number;
      FP: number;
      FN: number;
      interpretation: string;
    };
  };
  feature_importance: MLFeatureImportance[];
  prediction_summary: {
    total_depts: number;
    high_lapse_risk: number;
    safe: number;
    avg_lapse_prob_pct: number;
  };
  predictions: MLLapsePrediction[];
}

export interface BudgetDNAEntry {
  dept_id: number;
  dept_name: string;
  ministry: string;
  dna_score: number;
  drift_status: 'HIGH' | 'MEDIUM' | 'LOW';
  behavioral_fingerprint: Record<string, number>;
}

export interface BudgetDNAResponse {
  departments: BudgetDNAEntry[];
  methodology: string;
}

// ============================================================================
// REALLOCATION
// ============================================================================

export interface ReallocationSuggestion {
  from_dept: string;
  from_dept_id: number;
  from_ministry: string;
  from_districts: string[];
  from_state_wide: boolean;
  to_dept: string;
  to_dept_id: number;
  to_ministry: string;
  to_districts: string[];
  to_state_wide: boolean;
  scheme_type: string;
  transfer_amount_cr: number;
  from_lapse_risk_pct: number;
  to_utilization_pct: number;
  geo_justification: string;
  estimated_risk_reduction_pts: number;
  reason: string;
}

export interface ReallocationResponse {
  total_suggestions: number;
  total_saveable_cr: number;
  suggestions: ReallocationSuggestion[];
  constraints_applied: string[];
}

export interface ReimbursementReallocationResponse {
  pool_amount_cr: number;
  reimbursement_plan: Array<{
    dept_id: number;
    dept_name: string;
    reimburse_amount_cr: number;
    priority: number;
  }>;
}

export interface GeographyFootprintResponse {
  departments: Array<{
    dept_id: number;
    dept_name: string;
    district_count: number;
    coverage_pct: number;
  }>;
}

// ============================================================================
// COLLUSION & DDO
// ============================================================================

export interface CollusionNode {
  id: string;
  label: string;
  type: 'shell_vendor' | 'colluding_ddo' | 'ddo' | 'vendor';
  risk: number;
  amount_cr: number;
}

export interface CollusionEdge {
  source: string;
  target: string;
  amount_cr: number;
  dept: string;
  district: string;
}

export interface CollusionResponse {
  year: number;
  nodes: CollusionNode[];
  edges: CollusionEdge[];
  summary: {
    shell_vendors: number;
    colluding_ddos: number;
    total_edges: number;
    total_at_risk_cr: number;
  };
}

export interface ContagionScenarioResponse {
  debarred_vendors: string[];
  impacted_ddos: number;
  alternative_vendors_available: number;
  reinstatement_cost_cr: number;
}

export interface DDOBenchmark {
  ddo_code: string;
  name: string;
  dept_name?: string;
  department: string;
  district: string;
  ministry: string;
  scheme_type: string;
  allocation_bucket: string;
  avg_alloc_cr: number;
  spent_cr: number;
  util_pct: number;
  cohort_mean_pct: number;
  cohort_std_pct: number;
  cohort_size: number;
  z_score: number;
  flagged: boolean;
  severity: string;
  description: string;
  performance_category?: 'Excellent' | 'Above Average' | 'Average' | 'Below Average' | 'Poor';
}

export interface DDOBenchmarksResponse {
  summary: {
    ddos_returned: number;
    flagged_underperformers: number;
    flag_threshold: string;
    high_severity?: number;
    min_cohort_size: number;
  };
  ddos: DDOBenchmark[];
  methodology?: string;
}

export interface DDOCohortsResponse {
  cohorts: Array<{
    cohort_name: string;
    member_count: number;
    avg_utilization_pct: number;
  }>;
}

// ============================================================================
// WELFARE SCHEMES
// ============================================================================

export interface WelfareScheme {
  scheme_id: number;
  scheme_name: string;
  department: string;
  total_allocated_cr: number;
  total_utilized_cr: number;
  utilization_pct: number;
  beneficiaries_target: number;
  beneficiaries_reached: number;
  coverage_pct: number;
  unspent_amount_cr: number;
  status: 'Active' | 'Paused' | 'Completed';
}

export interface SchemeSummaryResponse {
  total_schemes: number;
  total_allocated_cr: number;
  average_utilization_pct: number;
  total_beneficiaries: number;
  schemes_with_anomalies: number;
}

export interface SchemeAnomalyResponse {
  scheme_id: number;
  scheme_name: string;
  anomaly_type: string;
  severity: SeverityLevel;
  description: string;
  amount_affected_cr: number;
}

export interface SchemeAnomaly {
  type: string;
  severity: string;
  risk_score: number;
  scheme_id: number;
  scheme_name: string;
  scheme_category: string;
  dept_name: string;
  description: string;
  evidence: Record<string, number | string>;
  recommendation: string;
}

export interface SchemeAnomaliesResponse {
  total_detections: number;
  total_funds_at_risk_cr: number;
  by_type: Record<string, number>;
  by_severity: Record<string, number>;
  detections: SchemeAnomaly[];
}

export interface SchemeDetailResponse {
  scheme: WelfareScheme;
  district_breakdown: Array<{
    district: string;
    allocated_cr: number;
    utilized_cr: number;
    beneficiaries: number;
  }>;
  quarterly_phasing: Array<{
    quarter: number;
    allocated_cr: number;
    utilized_cr: number;
  }>;
}

// ============================================================================
// WEBSOCKET MESSAGES
// ============================================================================

export interface LiveFeedMessage {
  type: 'new_anomaly';
  data: Anomaly;
}

// ============================================================================
// GENERIC API RESPONSE
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============================================================================
// QUERY PARAMETERS
// ============================================================================

export interface AnomalyQueryParams {
  severity?: SeverityLevel;
  alert_type?: string;
  page?: number;
  page_size?: number;
}

export interface BudgetFlowQueryParams {
  year?: number;
}

export interface LapseRiskQueryParams {
  limit?: number;
  risk_level?: RiskLevel;
}

export interface CollusionQueryParams {
  year?: number;
}
