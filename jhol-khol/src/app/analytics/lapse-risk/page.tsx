// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import type { LapseRiskResponse, LapseRiskDepartment } from '@/lib/api/types';
import {
  ExclamationTriangleIcon,
  ChartBarIcon,
  ClockIcon,
  CurrencyRupeeIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';

export default function LapseRiskPage() {
  const [data, setData] = useState<LapseRiskResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getLapseRisk({ limit: 50 });
      setData(response);
    } catch (error) {
      console.error('Failed to fetch lapse risk data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDepartments = data?.departments.filter(dept => 
    filter === 'ALL' || dept.risk_level === filter
  ) || [];

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'HIGH': return 'bg-red-100 text-red-800 border-red-300';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'LOW': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getRiskBgGlow = (level: string) => {
    switch (level) {
      case 'HIGH': return 'shadow-red-200 hover:shadow-red-300';
      case 'MEDIUM': return 'shadow-yellow-200 hover:shadow-yellow-300';
      case 'LOW': return 'shadow-green-200 hover:shadow-green-300';
      default: return 'shadow-gray-200';
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 100) return `â‚¹${value.toFixed(1)} Cr`;
    return `â‚¹${(value * 10).toFixed(1)} L`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Loading lapse risk analysis...</p>
        </div>
      </div>
    );
  }

  const summary = data?.summary;
  const highRiskCount = summary?.risk_breakdown.HIGH || 0;
  const mediumRiskCount = summary?.risk_breakdown.MEDIUM || 0;
  const lowRiskCount = summary?.risk_breakdown.LOW || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 bg-clip-text text-transparent mb-2">
            Budget Lapse Risk Prediction
          </h1>
          <p className="text-gray-600 text-lg">
            ML-powered forecasting of fund underutilization and lapse risks
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-amber-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
                <CurrencyRupeeIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Total at Risk</p>
                <p className="text-2xl font-black text-gray-900">
                  {formatCurrency(summary?.total_lapse_amount || 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-red-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-red-600 rounded-xl flex items-center justify-center animate-pulse">
                <ExclamationTriangleIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">HIGH Risk</p>
                <p className="text-2xl font-black text-red-600">{highRiskCount}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Departments likely to lapse funds
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-yellow-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
                <ChartBarIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">MEDIUM Risk</p>
                <p className="text-2xl font-black text-yellow-600">{mediumRiskCount}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Needs monitoring
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-green-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center">
                <ClockIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">LOW Risk</p>
                <p className="text-2xl font-black text-green-600">{lowRiskCount}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              On track to utilize
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-amber-100 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FunnelIcon className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-semibold text-gray-900">Filter by Risk Level</h2>
          </div>
          <div className="flex gap-3">
            {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((level) => (
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

        {/* Department Cards */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Departments at Risk ({filteredDepartments.length})
          </h2>
          
          {filteredDepartments.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-12 text-center border border-amber-100">
              <p className="text-gray-500 text-lg">No departments found for this risk level</p>
            </div>
          ) : (
            filteredDepartments.map((dept) => (
              <div
                key={dept.dept_id}
                className={`bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6 border hover:shadow-2xl transition-all ${getRiskBgGlow(dept.risk_level)}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{dept.dept_name}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getRiskColor(dept.risk_level)}`}>
                        {dept.risk_level} RISK
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">Department ID: {dept.dept_id}</p>
                  </div>
                  {dept.risk_level === 'HIGH' && (
                    <ExclamationTriangleIcon className="h-8 w-8 text-red-500 animate-pulse" />
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                    <p className="text-xs text-blue-700 font-semibold mb-1">Allocated</p>
                    <p className="text-xl font-black text-blue-900">{formatCurrency(dept.allocated)}</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                    <p className="text-xs text-green-700 font-semibold mb-1">Spent</p>
                    <p className="text-xl font-black text-green-900">{formatCurrency(dept.spent)}</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                    <p className="text-xs text-purple-700 font-semibold mb-1">Projected End</p>
                    <p className="text-xl font-black text-purple-900">{formatCurrency(dept.projected_end)}</p>
                  </div>
                  <div className={`bg-gradient-to-br rounded-lg p-4 border ${
                    dept.lapse_amount > 0 
                      ? 'from-red-50 to-red-100 border-red-200' 
                      : 'from-green-50 to-green-100 border-green-200'
                  }`}>
                    <p className={`text-xs font-semibold mb-1 ${
                      dept.lapse_amount > 0 ? 'text-red-700' : 'text-green-700'
                    }`}>
                      Lapse Amount
                    </p>
                    <p className={`text-xl font-black ${
                      dept.lapse_amount > 0 ? 'text-red-900' : 'text-green-900'
                    }`}>
                      {dept.lapse_amount > 0 ? formatCurrency(dept.lapse_amount) : 'â‚¹0'}
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">Utilization Progress</span>
                    <span className="text-sm font-bold text-gray-900">
                      {((dept.spent / dept.allocated) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        dept.risk_level === 'HIGH' 
                          ? 'bg-gradient-to-r from-red-400 to-red-600' 
                          : dept.risk_level === 'MEDIUM'
                          ? 'bg-gradient-to-r from-yellow-400 to-orange-500'
                          : 'bg-gradient-to-r from-green-400 to-green-600'
                      }`}
                      style={{ width: `${Math.min((dept.spent / dept.allocated) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Additional Details */}
                <div className="flex items-center gap-6 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <ClockIcon className="h-4 w-4" />
                    <span>Days Remaining: <strong className="text-gray-900">{dept.days_remaining || 'N/A'}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ChartBarIcon className="h-4 w-4" />
                    <span>Spending Pace: <strong className={`${
                      dept.risk_level === 'HIGH' ? 'text-red-600' : 
                      dept.risk_level === 'MEDIUM' ? 'text-yellow-600' : 
                      'text-green-600'
                    }`}>
                      {dept.risk_level === 'HIGH' ? 'Too Slow' : 
                       dept.risk_level === 'MEDIUM' ? 'Needs Acceleration' : 
                       'On Track'}
                    </strong></span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

