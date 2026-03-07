'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import type { ReallocationResponse, ReallocationSuggestion } from '@/lib/api/types';
import Link from 'next/link';
import {
  ArrowRightIcon,
  CheckCircleIcon,
  CurrencyRupeeIcon,
  MapPinIcon,
  ShieldCheckIcon,
  LightBulbIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

export default function ReallocationPage() {
  const [data, setData] = useState<ReallocationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSuggestion, setSelectedSuggestion] = useState<ReallocationSuggestion | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getReallocation();
      setData(response);
    } catch (error) {
      console.error('Failed to fetch reallocation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 100) return `₹${value.toFixed(2)} Cr`;
    return `₹${(value * 10).toFixed(1)} L`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Calculating optimal reallocation strategies...</p>
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
            Fund Reallocation Optimizer
          </h1>
          <p className="text-gray-600 text-lg">
            Constitutional compliance + Geographic constraints + Maximum efficiency
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/blockchain?tab=multisig"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow transition-colors"
            >
              ✍️ Propose Multi-Sig Reallocation On-Chain
            </Link>
            <Link
              href="/blockchain?tab=commitment"
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold rounded-xl shadow transition-colors"
            >
              🔐 Anchor Reallocation Report On-Chain
            </Link>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-amber-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center">
                <CurrencyRupeeIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Saveable</p>
                <p className="text-2xl font-black text-gray-900">
                  {formatCurrency(data?.total_saveable_cr || 0)}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Funds that can be rescued from lapsing
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-blue-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center">
                <LightBulbIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Suggestions</p>
                <p className="text-2xl font-black text-gray-900">
                  {data?.total_suggestions || 0}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Compliant reallocation opportunities
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-purple-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center">
                <ShieldCheckIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Constraints</p>
                <p className="text-2xl font-black text-gray-900">
                  {data?.constraints_applied.length || 6}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Constitutional compliance rules
            </p>
          </div>
        </div>

        {/* Constraints Panel */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-amber-100 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheckIcon className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-semibold text-gray-900">Constitutional Constraints Applied</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data?.constraints_applied.map((constraint, index) => (
              <div key={index} className="flex items-start gap-2 bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-lg border border-green-200">
                <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-700">{constraint}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Reallocation Suggestions */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Optimal Reallocation Suggestions ({data?.suggestions.length || 0})
          </h2>

          {(data?.suggestions || []).map((suggestion, index) => (
            <div
              key={index}
              className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg hover:shadow-2xl transition-all border border-amber-100 overflow-hidden"
            >
              <div className="p-6">
                {/* Transfer Flow Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center text-white font-black text-lg">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Transfer Amount</p>
                      <p className="text-2xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                        {formatCurrency(suggestion.transfer_amount_cr)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 font-medium">Risk Reduction</p>
                    <p className="text-xl font-black text-green-600">
                      {suggestion.estimated_risk_reduction_pts.toFixed(1)}%
                    </p>
                  </div>
                </div>

                {/* FROM → TO Flow */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {/* FROM Department */}
                  <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-lg p-4 border border-red-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <p className="text-xs font-bold text-red-700 uppercase">FROM (High Lapse Risk)</p>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{suggestion.from_dept}</h3>
                    <div className="space-y-1 text-sm">
                      <p className="text-gray-600">
                        <span className="font-semibold">Ministry:</span> {suggestion.from_ministry}
                      </p>
                      <p className="text-gray-600">
                        <span className="font-semibold">Lapse Risk:</span>{' '}
                        <span className="text-red-600 font-bold">{suggestion.from_lapse_risk_pct.toFixed(1)}%</span>
                      </p>
                      <p className="text-gray-600">
                        <span className="font-semibold">Scheme:</span> {suggestion.scheme_type}
                      </p>
                      {suggestion.from_state_wide && (
                        <div className="flex items-center gap-1 text-amber-600 font-semibold">
                          <MapPinIcon className="h-4 w-4" />
                          <span className="text-xs">State-wide jurisdiction</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2">
                      <ArrowRightIcon className="h-8 w-8 text-amber-600" />
                      <span className="text-xs font-semibold text-gray-500 text-center">
                        Transfer
                      </span>
                    </div>
                  </div>

                  {/* TO Department */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <p className="text-xs font-bold text-green-700 uppercase">TO (High Absorber)</p>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{suggestion.to_dept}</h3>
                    <div className="space-y-1 text-sm">
                      <p className="text-gray-600">
                        <span className="font-semibold">Ministry:</span> {suggestion.to_ministry}
                      </p>
                      <p className="text-gray-600">
                        <span className="font-semibold">Utilization:</span>{' '}
                        <span className="text-green-600 font-bold">{suggestion.to_utilization_pct.toFixed(1)}%</span>
                      </p>
                      <p className="text-gray-600">
                        <span className="font-semibold">Scheme:</span> {suggestion.scheme_type}
                      </p>
                      {suggestion.to_state_wide && (
                        <div className="flex items-center gap-1 text-amber-600 font-semibold">
                          <MapPinIcon className="h-4 w-4" />
                          <span className="text-xs">State-wide jurisdiction</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Geographic Justification */}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mb-4">
                  <div className="flex items-start gap-2">
                    <MapPinIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-blue-900 mb-1">Geographic Basis</p>
                      <p className="text-sm text-blue-700">{suggestion.geo_justification}</p>
                      {suggestion.from_districts.length > 0 && (
                        <p className="text-xs text-blue-600 mt-2">
                          FROM districts: {suggestion.from_districts.slice(0, 3).join(', ')}
                          {suggestion.from_districts.length > 3 && ` +${suggestion.from_districts.length - 3} more`}
                        </p>
                      )}
                      {suggestion.to_districts.length > 0 && (
                        <p className="text-xs text-blue-600 mt-1">
                          TO districts: {suggestion.to_districts.slice(0, 3).join(', ')}
                          {suggestion.to_districts.length > 3 && ` +${suggestion.to_districts.length - 3} more`}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Detailed Reasoning */}
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-4 border border-amber-200">
                  <div className="flex items-start gap-2">
                    <InformationCircleIcon className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900 mb-1">Rationale</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{suggestion.reason}</p>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setSelectedSuggestion(suggestion)}
                    className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-amber-500/50 transition-all duration-300 transform hover:scale-105"
                  >
                    View Full Details
                  </button>
                </div>
              </div>
            </div>
          ))}

          {(data?.suggestions.length === 0) && (
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-12 text-center border border-amber-100">
              <p className="text-gray-500 text-lg">No reallocation opportunities found</p>
              <p className="text-gray-400 text-sm mt-2">All departments are utilizing funds efficiently</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
