'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import type { CollusionResponse } from '@/lib/api/types';
import {
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  BuildingStorefrontIcon,
  UserGroupIcon,
  CurrencyRupeeIcon,
  ArrowsRightLeftIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

export default function CollusionNetworkPage() {
  const [data, setData] = useState<CollusionResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getCollusionNetwork();
      setData(response);
    } catch (error) {
      console.error('Failed to fetch collusion network data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 100) return `₹${value.toFixed(1)} Cr`;
    return `₹${(value * 10).toFixed(1)} L`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Analyzing vendor-DDO collusion network...</p>
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
            Vendor Collusion Network Analysis
          </h1>
          <p className="text-gray-600 text-lg">
            Detecting shell vendors and procurement cartels through network graph analysis
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-red-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-red-600 rounded-xl flex items-center justify-center animate-pulse">
                <ShieldExclamationIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Shell Vendors</p>
                <p className="text-3xl font-black text-red-600">{data?.shell_vendors.length || 0}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500">High-risk entities flagged</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-orange-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center">
                <UserGroupIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Colluding DDOs</p>
                <p className="text-3xl font-black text-orange-600">{data?.colluding_ddos.length || 0}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500">Narrow vendor pools (≤3)</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-blue-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center">
                <ArrowsRightLeftIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Network Edges</p>
                <p className="text-3xl font-black text-blue-600">{data?.edges.length || 0}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500">Vendor-DDO connections</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-purple-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center">
                <CurrencyRupeeIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Network Value</p>
                <p className="text-xl font-black text-purple-600">
                  {formatCurrency(data?.edges.reduce((sum, e) => sum + e.transaction_value_cr, 0) || 0)}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500">Value flowing through network</p>
          </div>
        </div>

        {/* Shell Vendors List */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Shell Vendors (High Risk)
          </h2>
          <div className="space-y-4">
            {(data?.shell_vendors || []).map((vendor, index) => (
              <div
                key={vendor.vendor_id}
                className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6 border-2 border-red-300 hover:shadow-xl transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-700 rounded-xl flex items-center justify-center text-white font-black">
                      {index + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-bold text-gray-900">{vendor.vendor_name}</h3>
                        <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold border border-red-300">
                          SHELL VENDOR
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">Vendor ID: {vendor.vendor_id}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 font-medium">Risk Score</p>
                    <p className="text-3xl font-black text-red-600">{(vendor.risk_score * 100).toFixed(0)}%</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
                    <p className="text-xs text-orange-700 font-semibold mb-1">Connected DDOs</p>
                    <p className="text-2xl font-black text-orange-900">{vendor.ddo_count}</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                    <p className="text-xs text-purple-700 font-semibold mb-1">Transaction Value</p>
                    <p className="text-xl font-black text-purple-900">{formatCurrency(vendor.total_transaction_value_cr)}</p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                    <p className="text-xs text-blue-700 font-semibold mb-1">Average Deal Size</p>
                    <p className="text-lg font-black text-blue-900">
                      {formatCurrency(vendor.total_transaction_value_cr / vendor.ddo_count)}
                    </p>
                  </div>
                </div>

                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <p className="text-sm font-semibold text-red-900 mb-2">
                    Detection Criteria: {vendor.ddo_count}+ DDO connections with risk score &gt; 0.75
                  </p>
                  <p className="text-xs text-red-700">
                    Recommendation: Investigate for shell company operations, cross-verify delivery records
                  </p>
                </div>
              </div>
            ))}

            {data?.shell_vendors.length === 0 && (
              <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-12 text-center border border-green-100">
                <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No shell vendors detected</p>
                <p className="text-gray-400 text-sm mt-2">All vendors have normal risk profiles</p>
              </div>
            )}
          </div>
        </div>

        {/* Colluding DDOs */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Colluding DDOs (Narrow Vendor Pools)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(data?.colluding_ddos || []).slice(0, 10).map((ddo) => (
              <div
                key={ddo.ddo_id}
                className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-5 border border-orange-200 hover:shadow-xl transition-all"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center">
                    <UserGroupIcon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900">{ddo.ddo_name}</h3>
                    <p className="text-xs text-gray-500">DDO ID: {ddo.ddo_id} • {ddo.dept_name}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-orange-50 rounded-lg p-3 border border-orange-200">
                  <div>
                    <p className="text-xs text-orange-700 font-semibold">Vendor Pool Size</p>
                    <p className="text-2xl font-black text-orange-900">{ddo.vendor_count}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Total Value</p>
                    <p className="text-lg font-black text-gray-900">{formatCurrency(ddo.total_value_cr)}</p>
                  </div>
                </div>

                <p className="text-xs text-gray-600 mt-3">
                  ⚠️ Suspiciously narrow vendor pool - potential collusion or favoritism
                </p>
              </div>
            ))}

            {data?.colluding_ddos.length > 10 && (
              <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 text-center border border-amber-100 col-span-full">
                <p className="text-gray-600 font-semibold">
                  +{data.colluding_ddos.length - 10} more colluding DDOs
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Network Summary */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-amber-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Network Analysis Summary</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700 font-medium">Total Vendors</span>
              <span className="text-xl font-black text-gray-900">
                {new Set(data?.edges.map(e => e.vendor_id)).size || 0}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700 font-medium">Total DDOs</span>
              <span className="text-xl font-black text-gray-900">
                {new Set(data?.edges.map(e => e.ddo_id)).size || 0}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700 font-medium">Average Connections per Vendor</span>
              <span className="text-xl font-black text-gray-900">
                {(data?.edges.length / new Set(data?.edges.map(e => e.vendor_id)).size || 0).toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
