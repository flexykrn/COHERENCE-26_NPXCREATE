'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import type { DDOBenchmarksResponse } from '@/lib/api/types';
import {
  ExclamationTriangleIcon,
  ChartBarIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  CurrencyRupeeIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';

export default function DDOBenchmarksPage() {
  const [data, setData] = useState<DDOBenchmarksResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM'>('ALL');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getDDOBenchmarks({ limit: 50 });
      setData(response);
    } catch (error) {
      console.error('Failed to fetch DDO benchmarks:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDDOs = filter === 'ALL'
    ? data?.ddos || []
    : data?.ddos.filter(d => d.severity === filter) || [];

  const formatCurrency = (value: number) => {
    if (value >= 100) return `₹${value.toFixed(1)} Cr`;
    return `₹${(value * 10).toFixed(1)} L`;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'HIGH': return 'bg-red-100 text-red-800 border-red-300';
      case 'MEDIUM': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'LOW': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Loading DDO performance benchmarks...</p>
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
            DDO Performance Benchmarks
          </h1>
          <p className="text-gray-600 text-lg">
            Peer cohort comparison: Identifying underperformers through statistical Z-score analysis
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-blue-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center">
                <ChartBarIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">DDOs Analyzed</p>
                <p className="text-3xl font-black text-gray-900">{data?.summary.ddos_returned || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-orange-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center">
                <ExclamationTriangleIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Underperformers</p>
                <p className="text-3xl font-black text-orange-600">{data?.summary.flagged_underperformers || 0}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500">{data?.summary.flag_threshold || 'z < -1.5'}</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-red-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-red-600 rounded-xl flex items-center justify-center animate-pulse">
                <ExclamationTriangleIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">High Severity</p>
                <p className="text-3xl font-black text-red-600">{data?.summary.high_severity || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-2">Cohort Comparison Methodology</h2>
          <p className="text-blue-100 mb-3">
            DDOs are grouped into peer cohorts based on: District + Allocation Size + Scheme Type (Capital/Revenue)
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-blue-200 mb-1">Flag Threshold</p>
              <p className="font-bold">{data?.summary.flag_threshold}</p>
            </div>
            <div>
              <p className="text-blue-200 mb-1">Minimum Cohort Size</p>
              <p className="font-bold">{data?.summary.min_cohort_size} DDOs</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-amber-100 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FunnelIcon className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-semibold text-gray-900">Filter by Severity</h2>
          </div>
          <div className="flex gap-3">
            {['ALL', 'HIGH', 'MEDIUM'].map((level) => (
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

        {/* DDO Cards */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Underperforming DDOs ({filteredDDOs.length})
          </h2>

          {filteredDDOs.map((ddo, index) => (
            <div
              key={ddo.ddo_code}
              className={`bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6 border-2 hover:shadow-2xl transition-all ${
                ddo.severity === 'HIGH' ? 'border-red-300' : 'border-orange-300'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-black ${
                    ddo.severity === 'HIGH' ? 'bg-red-600' : 'bg-orange-600'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-xl font-bold text-gray-900">{ddo.name}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getSeverityColor(ddo.severity)}`}>
                        {ddo.severity}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <MapPinIcon className="h-4 w-4" />
                        {ddo.district}
                      </span>
                      <span className="flex items-center gap-1">
                        <BuildingOfficeIcon className="h-4 w-4" />
                        {ddo.department}
                      </span>
                      <span>• {ddo.ministry}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 font-medium">Z-Score</p>
                  <p className={`text-3xl font-black ${
                    ddo.z_score < -2 ? 'text-red-600' : 'text-orange-600'
                  }`}>
                    {ddo.z_score.toFixed(2)}σ
                  </p>
                </div>
              </div>

              {/* Performance Comparison */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                  <p className="text-xs text-blue-700 font-semibold mb-1">Allocation</p>
                  <p className="text-lg font-black text-blue-900">{formatCurrency(ddo.avg_alloc_cr)}</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                  <p className="text-xs text-green-700 font-semibold mb-1">Spent</p>
                  <p className="text-lg font-black text-green-900">{formatCurrency(ddo.spent_cr)}</p>
                </div>
                <div className={`bg-gradient-to-br rounded-lg p-4 border ${
                  ddo.util_pct < 60 
                    ? 'from-red-50 to-red-100 border-red-200' 
                    : 'from-orange-50 to-orange-100 border-orange-200'
                }`}>
                  <p className={`text-xs font-semibold mb-1 ${
                    ddo.util_pct < 60 ? 'text-red-700' : 'text-orange-700'
                  }`}>
                    DDO Utilization
                  </p>
                  <p className={`text-2xl font-black ${
                    ddo.util_pct < 60 ? 'text-red-900' : 'text-orange-900'
                  }`}>
                    {ddo.util_pct.toFixed(1)}%
                  </p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                  <p className="text-xs text-purple-700 font-semibold mb-1">Cohort Average</p>
                  <p className="text-2xl font-black text-purple-900">{ddo.cohort_mean_pct.toFixed(1)}%</p>
                </div>
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
                  <p className="text-xs text-gray-700 font-semibold mb-1">Cohort Size</p>
                  <p className="text-2xl font-black text-gray-900">{ddo.cohort_size}</p>
                </div>
              </div>

              {/* Progress Bar Comparison */}
              <div className="mb-4">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">Performance Gap</span>
                  <span className="text-sm font-bold text-red-600">
                    {(ddo.cohort_mean_pct - ddo.util_pct).toFixed(1)}pp below cohort
                  </span>
                </div>
                <div className="relative w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                  {/* DDO Performance */}
                  <div
                    className="absolute h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full"
                    style={{ width: `${ddo.util_pct}%` }}
                  ></div>
                  {/* Cohort Average Line */}
                  <div
                    className="absolute h-full border-l-4 border-purple-600"
                    style={{ left: `${ddo.cohort_mean_pct}%` }}
                  ></div>
                </div>
                <div className="flex justify-between mt-1 text-xs text-gray-500">
                  <span>0%</span>
                  <span className="text-purple-600 font-bold">← Cohort Avg ({ddo.cohort_mean_pct.toFixed(1)}%)</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Cohort Info */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200 mb-4">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Cohort Definition:</span>{' '}
                  {ddo.district} / {ddo.allocation_bucket} / {ddo.scheme_type} (n={ddo.cohort_size})
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Std Dev: {ddo.cohort_std_pct.toFixed(2)}%
                </p>
              </div>

              {/* Description */}
              <div className={`rounded-lg p-4 border ${
                ddo.severity === 'HIGH' 
                  ? 'bg-red-50 border-red-200' 
                  : 'bg-orange-50 border-orange-200'
              }`}>
                <p className="text-sm text-gray-800 leading-relaxed">{ddo.description}</p>
              </div>
            </div>
          ))}

          {filteredDDOs.length === 0 && (
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-12 text-center border border-green-100">
              <p className="text-gray-500 text-lg">No underperforming DDOs found for this severity level</p>
              <p className="text-gray-400 text-sm mt-2">All DDOs are performing within normal range</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
