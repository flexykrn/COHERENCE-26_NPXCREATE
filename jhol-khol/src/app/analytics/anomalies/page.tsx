'use client';

import { useEffect, useState } from 'react';
import { apiClient, type AnomaliesResponse, type Anomaly } from '@/lib/api';
import { ExclamationTriangleIcon, FunnelIcon } from '@heroicons/react/24/outline';

export default function AnomaliesPage() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<{
    severity?: 'HIGH' | 'MEDIUM' | 'LOW';
    alert_type?: string;
    page: number;
    page_size: number;
  }>({
    page: 1,
    page_size: 20,
  });

  useEffect(() => {
    async function fetchAnomalies() {
      try {
        setLoading(true);
        const data = await apiClient.getAnomalies(filters);
        setAnomalies(data.data);
        setTotalCount(data.total);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch anomalies');
        console.error('Anomalies error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchAnomalies();
  }, [filters]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'MEDIUM':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'LOW':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Anomaly Detection Dashboard
          </h1>
          <p className="text-gray-600 text-lg">
            AI-powered financial anomaly detection and analysis
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-amber-100 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FunnelIcon className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Severity Level
              </label>
              <select
                value={filters.severity || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setFilters({ 
                    ...filters, 
                    severity: value === '' ? undefined : value as 'HIGH' | 'MEDIUM' | 'LOW', 
                    page: 1 
                  });
                }}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="">All Severities</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Anomaly Type
              </label>
              <select
                value={filters.alert_type || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setFilters({ 
                    ...filters, 
                    alert_type: value === '' ? undefined : value, 
                    page: 1 
                  });
                }}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="">All Types</option>
                <option value="Phantom Utilization">Phantom Utilization</option>
                <option value="Duplicate Payment">Duplicate Payment</option>
                <option value="Year-End Rush">Year-End Rush</option>
                <option value="Vendor Collusion Network">Vendor Collusion</option>
                <option value="Statistical Outlier">Statistical Outlier</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Results Per Page
              </label>
              <select
                value={filters.page_size}
                onChange={(e) => setFilters({ ...filters, page_size: parseInt(e.target.value), page: 1 })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-gray-700 font-medium">
            Total: <span className="text-amber-600">{totalCount}</span> anomalies detected
          </p>
        </div>

        {/* Anomalies Table */}
        {loading ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-12 border border-amber-100 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading anomalies...</p>
          </div>
        ) : error ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-8 border border-red-100 text-center">
            <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600">{error}</p>
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-amber-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-amber-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Alert ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      DDO Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Severity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Confidence
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {anomalies.map((anomaly) => (
                    <tr key={anomaly.alert_id} className="hover:bg-amber-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {anomaly.alert_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {anomaly.alert_type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-mono">
                        {anomaly.ddo_code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getSeverityColor(anomaly.severity)}`}>
                          {anomaly.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 w-16">
                            <div
                              className="bg-amber-500 h-2 rounded-full"
                              style={{ width: `${anomaly.confidence_score * 100}%` }}
                            ></div>
                          </div>
                          <span>{(anomaly.confidence_score * 100).toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 max-w-md truncate">
                        {anomaly.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => setFilters({ ...filters, page: Math.max(1, filters.page - 1) })}
            disabled={filters.page === 1}
            className="px-4 py-2 bg-white border border-amber-300 rounded-lg text-gray-700 hover:bg-amber-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-gray-700 font-medium">
            Page {filters.page}
          </span>
          <button
            onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
            disabled={anomalies.length < filters.page_size}
            className="px-4 py-2 bg-white border border-amber-300 rounded-lg text-gray-700 hover:bg-amber-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
