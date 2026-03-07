/**
 * API Client for Budget Flow Intelligence Platform
 * Centralized service for all backend interactions
 */

import { API_CONFIG, getApiUrl } from './config';
import type {
  HealthResponse,
  OverviewResponse,
  AnomaliesResponse,
  AnomalySummaryResponse,
  AnomalyScanResponse,
  BudgetFlowResponse,
  DepartmentsResponse,
  LapseRiskResponse,
  LapseRiskSummaryResponse,
  MLLapsePredictResponse,
  MLModelStatsResponse,
  BudgetDNAResponse,
  ReallocationResponse,
  ReimbursementReallocationResponse,
  GeographyFootprintResponse,
  CollusionResponse,
  ContagionScenarioResponse,
  DDOBenchmarksResponse,
  DDOCohortsResponse,
  WelfareScheme,
  SchemeSummaryResponse,
  SchemeAnomalyResponse,
  SchemeDetailResponse,
  BudgetStatesResponse,
  BudgetStateDetailResponse,
  BudgetSchemesResponse,
  BudgetNationalStats,
  AnomalyQueryParams,
  BudgetFlowQueryParams,
  LapseRiskQueryParams,
  CollusionQueryParams,
} from './types';

// ============================================================================
// FETCH UTILITIES
// ============================================================================

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = getApiUrl(endpoint);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new ApiError(
        response.status,
        `API request failed: ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new Error(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function buildQueryString(params?: Record<string, any>): string {
  if (!params) return '';
  
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });
  
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

// ============================================================================
// API CLIENT SERVICE
// ============================================================================

export const apiClient = {
  // ── Health & Overview ─────────────────────────────────────────────────────
  
  async getHealth(): Promise<HealthResponse> {
    return fetchApi<HealthResponse>(API_CONFIG.ENDPOINTS.HEALTH);
  },

  async getOverview(): Promise<OverviewResponse> {
    return fetchApi<OverviewResponse>(API_CONFIG.ENDPOINTS.OVERVIEW);
  },

  // ── Anomalies & Alerts ────────────────────────────────────────────────────

  async getAnomalies(params?: AnomalyQueryParams): Promise<AnomaliesResponse> {
    const queryString = buildQueryString(params);
    return fetchApi<AnomaliesResponse>(`${API_CONFIG.ENDPOINTS.ANOMALIES}${queryString}`);
  },

  async getAnomaliesSummary(): Promise<AnomalySummaryResponse> {
    return fetchApi<AnomalySummaryResponse>(API_CONFIG.ENDPOINTS.ANOMALIES_SUMMARY);
  },

  async getAnomaliesScan(params?: { alert_type?: string; severity?: string }): Promise<AnomalyScanResponse> {
    const queryString = buildQueryString(params);
    return fetchApi<AnomalyScanResponse>(`${API_CONFIG.ENDPOINTS.ANOMALIES_SCAN}${queryString}`);
  },

  // ── Budget Flow ───────────────────────────────────────────────────────────

  async getBudgetFlow(params?: BudgetFlowQueryParams): Promise<BudgetFlowResponse> {
    const queryString = buildQueryString(params);
    return fetchApi<BudgetFlowResponse>(`${API_CONFIG.ENDPOINTS.BUDGET_FLOW}${queryString}`);
  },

  async getDepartments(): Promise<DepartmentsResponse> {
    return fetchApi<DepartmentsResponse>(API_CONFIG.ENDPOINTS.BUDGET_DEPARTMENTS);
  },

  // ── Lapse Risk ────────────────────────────────────────────────────────────

  async getLapseRisk(params?: LapseRiskQueryParams): Promise<LapseRiskResponse> {
    const queryString = buildQueryString(params);
    return fetchApi<LapseRiskResponse>(`${API_CONFIG.ENDPOINTS.LAPSE_RISK}${queryString}`);
  },

  async getLapseRiskSummary(): Promise<LapseRiskSummaryResponse> {
    return fetchApi<LapseRiskSummaryResponse>(API_CONFIG.ENDPOINTS.LAPSE_RISK_SUMMARY);
  },

  // ── ML & Predictions ──────────────────────────────────────────────────────

  async getMLLapsePredictions(): Promise<MLLapsePredictResponse> {
    return fetchApi<MLLapsePredictResponse>(API_CONFIG.ENDPOINTS.ML_LAPSE_PREDICT);
  },

  async getMLModelStats(): Promise<MLModelStatsResponse> {
    return fetchApi<MLModelStatsResponse>(API_CONFIG.ENDPOINTS.ML_MODEL_STATS);
  },

  async getBudgetDNA(): Promise<BudgetDNAResponse> {
    return fetchApi<BudgetDNAResponse>(API_CONFIG.ENDPOINTS.BUDGET_DNA);
  },

  // ── Reallocation ──────────────────────────────────────────────────────────

  async getReallocation(): Promise<ReallocationResponse> {
    return fetchApi<ReallocationResponse>(API_CONFIG.ENDPOINTS.REALLOCATION);
  },

  async getReallocationReimburse(): Promise<ReimbursementReallocationResponse> {
    return fetchApi<ReimbursementReallocationResponse>(API_CONFIG.ENDPOINTS.REALLOCATION_REIMBURSE);
  },

  async getReallocationGeography(): Promise<GeographyFootprintResponse> {
    return fetchApi<GeographyFootprintResponse>(API_CONFIG.ENDPOINTS.REALLOCATION_GEOGRAPHY);
  },

  // ── Collusion & DDO ───────────────────────────────────────────────────────

  async getCollusion(params?: CollusionQueryParams): Promise<CollusionResponse> {
    const queryString = buildQueryString(params);
    return fetchApi<CollusionResponse>(`${API_CONFIG.ENDPOINTS.COLLUSION}${queryString}`);
  },

  async getCollusionContagion(params?: { vendor_ids?: string }): Promise<ContagionScenarioResponse> {
    const queryString = buildQueryString(params);
    return fetchApi<ContagionScenarioResponse>(`${API_CONFIG.ENDPOINTS.COLLUSION_CONTAGION}${queryString}`);
  },

  async getDDOBenchmarks(params?: { limit?: number; severity?: string }): Promise<DDOBenchmarksResponse> {
    const queryString = buildQueryString(params);
    return fetchApi<DDOBenchmarksResponse>(`${API_CONFIG.ENDPOINTS.DDO_BENCHMARKS}${queryString}`);
  },

  async getDDOCohorts(): Promise<DDOCohortsResponse> {
    return fetchApi<DDOCohortsResponse>(API_CONFIG.ENDPOINTS.DDO_COHORTS);
  },

  // ── Welfare Schemes ───────────────────────────────────────────────────────

  async getSchemes(): Promise<{ schemes: WelfareScheme[] }> {
    return fetchApi<{ schemes: WelfareScheme[] }>(API_CONFIG.ENDPOINTS.SCHEMES);
  },

  async getSchemesSummary(): Promise<SchemeSummaryResponse> {
    return fetchApi<SchemeSummaryResponse>(API_CONFIG.ENDPOINTS.SCHEMES_SUMMARY);
  },

  async getSchemesAnomalies(): Promise<{ anomalies: SchemeAnomalyResponse[] }> {
    return fetchApi<{ anomalies: SchemeAnomalyResponse[] }>(API_CONFIG.ENDPOINTS.SCHEMES_ANOMALIES);
  },

  async getSchemeDetail(id: number): Promise<SchemeDetailResponse> {
    return fetchApi<SchemeDetailResponse>(API_CONFIG.ENDPOINTS.SCHEMES_DETAIL(id));
  },

  // ── Budget Map ────────────────────────────────────────────────────────────
  
  async getBudgetStates(): Promise<BudgetStatesResponse> {
    return fetchApi<BudgetStatesResponse>(API_CONFIG.ENDPOINTS.BUDGET_STATES);
  },

  async getBudgetStateDetail(stateId: string): Promise<BudgetStateDetailResponse> {
    return fetchApi<BudgetStateDetailResponse>(API_CONFIG.ENDPOINTS.BUDGET_STATE_DETAIL(stateId));
  },

  async getBudgetSchemesOverview(): Promise<BudgetSchemesResponse> {
    return fetchApi<BudgetSchemesResponse>(API_CONFIG.ENDPOINTS.BUDGET_SCHEMES_OVERVIEW);
  },

  async getBudgetNationalStats(): Promise<BudgetNationalStats> {
    return fetchApi<BudgetNationalStats>(API_CONFIG.ENDPOINTS.BUDGET_NATIONAL_STATS);
  },

  // ── Vendors ───────────────────────────────────────────────────────────────
  
  async getVendors(params?: { category?: string; limit?: number }): Promise<any> {
    const queryString = buildQueryString(params);
    return fetchApi<any>(`${API_CONFIG.ENDPOINTS.VENDORS}${queryString}`);
  },

  async getVendorCategories(): Promise<any> {
    return fetchApi<any>(API_CONFIG.ENDPOINTS.VENDORS_CATEGORIES);
  },
};

// ============================================================================
// WEBSOCKET SERVICE
// ============================================================================

export class LiveFeedService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;

  connect(onMessage: (data: any) => void, onError?: (error: Event) => void): void {
    const wsUrl = `${API_CONFIG.WS_URL}${API_CONFIG.ENDPOINTS.LIVE_FEED}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
          this.reconnectAttempts = 0; // Reset on successful message
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        if (onError) onError(error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket closed');
        this.attemptReconnect(onMessage, onError);
      };

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      if (onError) onError(error as Event);
    }
  }

  private attemptReconnect(onMessage: (data: any) => void, onError?: (error: Event) => void): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect(onMessage, onError);
      }, this.reconnectDelay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// ============================================================================
// EXPORT DEFAULT
// ============================================================================

export default apiClient;
