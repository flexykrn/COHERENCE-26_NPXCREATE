// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import type { SchemeAnomaliesResponse, SchemeAnomaly } from '@/lib/api/types';
import {
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  CurrencyRupeeIcon,
  FunnelIcon,
  ClockIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

export default function SchemeAnomaliesPage() {
  const [data, setData] = useState<SchemeAnomaliesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM'>('ALL');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getSchemeAnomalies({ limit: 50 });
      setData(response);
    } catch (error) {
      console.error('Failed to fetch scheme anomalies:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDetections = filter === 'ALL'
    ? data?.detections || []
    : data?.detections.filter(d => d.severity === filter) || [];

  const formatCurrency = (value: number) => {
    if (value >= 100) return `â‚¹${value.toFixed(1)} Cr`;
    return `â‚¹${(value * 10).toFixed(1)} L`;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-300';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'LOW': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'STRANDED_FUNDS': return 'Stranded Funds';
      case 'YEAR_END_CASH_DUMP': return 'Year-End Cash Dump';
      case 'GHOST_BENEFICIARY': return 'Ghost Beneficiary';
      case 'DUPLICATE_AADHAAR': return 'Duplicate Aadhaar';
      case 'DISTRICT_COST_SPIKE': return 'District Cost Spike';
      default: return type;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'STRANDED_FUNDS': return <CurrencyRupeeIcon className="h-6 w-6" />;
      case 'YEAR_END_CASH_DUMP': return <ClockIcon className="h-6 w-6" />;
      case 'GHOST_BENEFICIARY': return <ExclamationTriangleIcon className="h-6 w-6" />;
      default: return <ShieldExclamationIcon className="h-6 w-6" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Scanning welfare schemes for anomalies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 bg-clip-text text-transparent mb-2">
            Welfare Scheme Fraud Detection
          </h1>
          <p className="text-gray-600 text-lg">
            Detecting ghost beneficiaries, cash dumps, and implementation bottlenecks
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-red-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-red-600 rounded-xl flex items-center justify-center animate-pulse">
                <ExclamationTriangleIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Detections</p>
                <p className="text-3xl font-black text-gray-900">{data?.total_detections || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-orange-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center">
                <CurrencyRupeeIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Funds at Risk</p>
                <p className="text-2xl font-black text-gray-900">
                  {formatCurrency(data?.total_funds_at_risk_cr || 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-red-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-red-600 rounded-xl flex items-center justify-center">
                <ShieldExclamationIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">CRITICAL</p>
                <p className="text-3xl font-black text-red-600">{data?.by_severity.CRITICAL || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-orange-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center">
                <ExclamationTriangleIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">HIGH</p>
                <p className="text-3xl font-black text-orange-600">{data?.by_severity.HIGH || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Detection Type Breakdown */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-amber-100 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Anomaly Types</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(data?.by_type || {}).map(([type, count]) => (
              <div key={type} className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                <p className="text-sm text-blue-700 font-semibold mb-1">{getTypeLabel(type)}</p>
                <p className="text-3xl font-black text-blue-900">{count}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-amber-100 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FunnelIcon className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-semibold text-gray-900">Filter by Severity</h2>
          </div>
          <div className="flex gap-3">
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map((level) => (
              <button
                key={level}
                onClick={() => setFilter(level as any)}
                className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                  filter === level
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Anomaly Cards */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Detected Anomalies ({filteredDetections.length})
          </h2>

          {filteredDetections.map((detection, index) => (
            <div
              key={index}
              className={`bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6 border-2 hover:shadow-2xl transition-all ${
                detection.severity === 'CRITICAL' 
                  ? 'border-red-300 shadow-red-200' 
                  : detection.severity === 'HIGH'
                  ? 'border-orange-300 shadow-orange-200'
                  : 'border-yellow-300 shadow-yellow-200'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      detection.severity === 'CRITICAL' ? 'bg-red-500' :
                      detection.severity === 'HIGH' ? 'bg-orange-500' : 'bg-yellow-500'
                    }`}>
                      {getTypeIcon(detection.type)}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{detection.scheme_name}</h3>
                      <p className="text-sm text-gray-500">{detection.dept_name} â€¢ {detection.scheme_category}</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`px-4 py-1.5 rounded-full text-xs font-bold border ${getSeverityColor(detection.severity)}`}>
                    {detection.severity}
                  </span>
                  <span className="text-xs text-gray-500 font-semibold">{getTypeLabel(detection.type)}</span>
                </div>
              </div>

              {/* Description */}
              <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-lg p-4 mb-4 border-l-4 border-red-500">
                <p className="text-gray-900 font-semibold">{detection.description}</p>
              </div>

              {/* Evidence */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <DocumentTextIcon className="h-5 w-5 text-gray-600" />
                  <p className="text-sm font-bold text-gray-700">Evidence</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(detection.evidence).map(([key, value]) => (
                    <div key={key} className="bg-white rounded-lg p-3 border border-gray-200">
                      <p className="text-xs text-gray-500 font-medium mb-1">
                        {key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </p>
                      <p className="text-sm font-black text-gray-900">
                        {typeof value === 'number' && key.includes('cr') 
                          ? formatCurrency(value)
                          : typeof value === 'number' && key.includes('pct')
                          ? `${value.toFixed(1)}%`
                          : value
                        }
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendation */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                <p className="text-sm font-semibold text-blue-900 mb-1">Recommendation</p>
                <p className="text-sm text-blue-700">{detection.recommendation}</p>
              </div>

              {/* Risk Score */}
              <div className="mt-4 flex items-center gap-4">
                <span className="text-sm text-gray-600 font-medium">Risk Score:</span>
                <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      detection.risk_score >= 0.8 ? 'bg-gradient-to-r from-red-400 to-red-600' :
                      detection.risk_score >= 0.5 ? 'bg-gradient-to-r from-orange-400 to-orange-600' :
                      'bg-gradient-to-r from-yellow-400 to-yellow-600'
                    }`}
                    style={{ width: `${detection.risk_score * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-black text-gray-900">{(detection.risk_score * 100).toFixed(1)}%</span>
              </div>
            </div>
          ))}

          {filteredDetections.length === 0 && (
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-12 text-center border border-amber-100">
              <p className="text-gray-500 text-lg">No anomalies found for this severity level</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

