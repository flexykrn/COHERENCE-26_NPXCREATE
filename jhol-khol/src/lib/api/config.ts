/**
 * API Configuration
 */

export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000',
  ENDPOINTS: {
    // Health & Overview
    HEALTH: '/health',
    OVERVIEW: '/api/overview',
    
    // Anomalies
    ANOMALIES: '/api/anomalies',
    ANOMALIES_SUMMARY: '/api/anomalies/summary',
    ANOMALIES_SCAN: '/api/anomalies/scan',
    
    // Budget Flow
    BUDGET_FLOW: '/api/budget/flow',
    BUDGET_DEPARTMENTS: '/api/budget/departments',
    
    // Lapse Risk
    LAPSE_RISK: '/api/lapse-risk',
    LAPSE_RISK_SUMMARY: '/api/lapse-risk/summary',
    
    // ML & Predictions
    ML_LAPSE_PREDICT: '/api/ml/lapse-predict',
    ML_MODEL_STATS: '/api/ml/model-stats',
    BUDGET_DNA: '/api/ml/budget-dna',
    
    // Reallocation
    REALLOCATION: '/api/reallocation',
    REALLOCATION_REIMBURSE: '/api/reallocation/reimburse',
    REALLOCATION_GEOGRAPHY: '/api/reallocation/geography',
    
    // Collusion & DDO
    COLLUSION: '/api/collusion',
    COLLUSION_CONTAGION: '/api/collusion/contagion',
    DDO_BENCHMARKS: '/api/ddo/benchmarks',
    DDO_COHORTS: '/api/ddo/benchmarks/cohorts',
    
    // Welfare Schemes
    SCHEMES: '/api/schemes',
    SCHEMES_SUMMARY: '/api/schemes/summary',
    SCHEMES_ANOMALIES: '/api/schemes/anomalies',
    SCHEMES_DETAIL: (id: number) => `/api/schemes/${id}`,
    
    // WebSocket
    LIVE_FEED: '/ws/live-feed',
  },
} as const;

export const getApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

export const getWsUrl = (endpoint: string): string => {
  return `${API_CONFIG.WS_URL}${endpoint}`;
};
