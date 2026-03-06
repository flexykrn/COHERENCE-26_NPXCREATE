'use client';

import { useState } from 'react';
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CurrencyRupeeIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';

interface ProjectStage {
  id: string;
  name: string;
  status: 'completed' | 'in-progress' | 'pending' | 'delayed';
  startDate: string;
  endDate?: string;
  expectedDate: string;
  daysOverdue?: number;
  amount?: number;
  vendor?: string;
  description?: string;
}

interface ProjectTimelineProps {
  ddo_code: string;
  project_name: string;
  total_allocated_cr: number;
  total_spent_cr: number;
  overall_status: 'on-track' | 'delayed' | 'completed';
  stages: ProjectStage[];
  vendor_details?: {
    name: string;
    vendor_id: string;
    total_contracts: number;
  };
}

export default function ProjectTimeline({
  ddo_code,
  project_name,
  total_allocated_cr,
  total_spent_cr,
  overall_status,
  stages,
  vendor_details,
}: ProjectTimelineProps) {
  const [expandedStage, setExpandedStage] = useState<string | null>(null);

  const formatCurrency = (value: number) => {
    if (value >= 1) return `₹${value.toFixed(2)} Cr`;
    return `₹${(value * 10).toFixed(2)} L`;
  };

  const getStatusIcon = (status: ProjectStage['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircleSolidIcon className="h-6 w-6 text-green-600" />;
      case 'in-progress':
        return <ClockIcon className="h-6 w-6 text-blue-600 animate-pulse" />;
      case 'delayed':
        return <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />;
      case 'pending':
        return (
          <div className="h-6 w-6 rounded-full border-2 border-gray-300 bg-white" />
        );
    }
  };

  const getStatusColor = (status: ProjectStage['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'delayed':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'pending':
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getOverallStatusColor = () => {
    switch (overall_status) {
      case 'completed':
        return 'from-green-500 to-emerald-600';
      case 'on-track':
        return 'from-blue-500 to-indigo-600';
      case 'delayed':
        return 'from-red-500 to-orange-600';
    }
  };

  const completedStages = stages.filter((s) => s.status === 'completed').length;
  const progressPct = (completedStages / stages.length) * 100;
  const utilizationPct = (total_spent_cr / total_allocated_cr) * 100;

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-6">
      {/* Header */}
      <div className={`bg-gradient-to-r ${getOverallStatusColor()} text-white rounded-lg p-6 mb-6`}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">{project_name}</h2>
            <p className="text-white/90 text-sm font-mono">{ddo_code}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/80 mb-1">Overall Status</p>
            <span className="px-4 py-2 bg-white/20 rounded-full text-sm font-bold uppercase">
              {overall_status.replace('-', ' ')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-white/80 mb-1">Total Allocated</p>
            <p className="text-2xl font-black">{formatCurrency(total_allocated_cr)}</p>
          </div>
          <div>
            <p className="text-xs text-white/80 mb-1">Total Spent</p>
            <p className="text-2xl font-black">{formatCurrency(total_spent_cr)}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-white/90 mb-2">
            <span>Project Progress: {completedStages}/{stages.length} stages</span>
            <span>{progressPct.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
            <div
              className="bg-white h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            ></div>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-xs text-white/90 mb-2">
            <span>Budget Utilization</span>
            <span>{utilizationPct.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                utilizationPct > 90 ? 'bg-red-300' : 'bg-white'
              }`}
              style={{ width: `${Math.min(utilizationPct, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Vendor Details */}
      {vendor_details && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 mb-6 border border-purple-200">
          <div className="flex items-center gap-3 mb-2">
            <UserGroupIcon className="h-5 w-5 text-purple-600" />
            <h3 className="font-bold text-gray-900">Primary Vendor</h3>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-600 text-xs mb-1">Name</p>
              <p className="font-semibold text-gray-900">{vendor_details.name}</p>
            </div>
            <div>
              <p className="text-gray-600 text-xs mb-1">Vendor ID</p>
              <p className="font-mono font-semibold text-gray-900">{vendor_details.vendor_id}</p>
            </div>
            <div>
              <p className="text-gray-600 text-xs mb-1">Total Contracts</p>
              <p className="font-bold text-purple-600">{vendor_details.total_contracts}</p>
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        {/* Vertical Line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-gray-200 via-gray-300 to-gray-200" />

        {/* Stages */}
        <div className="space-y-6">
          {stages.map((stage, index) => (
            <div key={stage.id} className="relative pl-20">
              {/* Icon */}
              <div className="absolute left-5 top-0 z-10 bg-white p-1 rounded-full">
                {getStatusIcon(stage.status)}
              </div>

              {/* Stage Card */}
              <div
                className={`bg-white rounded-lg border-2 ${
                  expandedStage === stage.id ? 'border-orange-300 shadow-lg' : 'border-gray-200'
                } hover:border-orange-200 hover:shadow-md transition-all cursor-pointer`}
                onClick={() =>
                  setExpandedStage(expandedStage === stage.id ? null : stage.id)
                }
              >
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-gray-900">{stage.name}</h4>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                            stage.status
                          )}`}
                        >
                          {stage.status.toUpperCase().replace('-', ' ')}
                        </span>
                      </div>
                      {stage.description && (
                        <p className="text-sm text-gray-600">{stage.description}</p>
                      )}
                    </div>
                    {stage.amount && (
                      <div className="text-right ml-4">
                        <p className="text-xs text-gray-500 mb-1">Amount</p>
                        <p className="text-lg font-bold text-gray-900">
                          {formatCurrency(stage.amount)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Timeline Info */}
                  <div className="flex items-center gap-6 text-xs text-gray-600">
                    <div>
                      <span className="font-semibold">Started:</span>{' '}
                      {new Date(stage.startDate).toLocaleDateString()}
                    </div>
                    {stage.endDate && stage.status === 'completed' && (
                      <div>
                        <span className="font-semibold">Completed:</span>{' '}
                        {new Date(stage.endDate).toLocaleDateString()}
                      </div>
                    )}
                    {!stage.endDate && (
                      <div>
                        <span className="font-semibold">Expected:</span>{' '}
                        {new Date(stage.expectedDate).toLocaleDateString()}
                      </div>
                    )}
                    {stage.daysOverdue && stage.daysOverdue > 0 && (
                      <div className="flex items-center gap-1 text-red-600 font-bold">
                        <ExclamationTriangleIcon className="h-3 w-3" />
                        <span>{stage.daysOverdue} days overdue</span>
                      </div>
                    )}
                  </div>

                  {/* Vendor Info (if expanded) */}
                  {expandedStage === stage.id && stage.vendor && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center gap-2 text-sm">
                        <BuildingOfficeIcon className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-600">Vendor:</span>
                        <span className="font-semibold text-gray-900">{stage.vendor}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Footer */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center text-sm">
          <div>
            <p className="text-gray-600 mb-1">Completed</p>
            <p className="text-2xl font-black text-green-600">
              {stages.filter((s) => s.status === 'completed').length}
            </p>
          </div>
          <div>
            <p className="text-gray-600 mb-1">In Progress</p>
            <p className="text-2xl font-black text-blue-600">
              {stages.filter((s) => s.status === 'in-progress').length}
            </p>
          </div>
          <div>
            <p className="text-gray-600 mb-1">Delayed</p>
            <p className="text-2xl font-black text-red-600">
              {stages.filter((s) => s.status === 'delayed').length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
