'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import type { BudgetFlowResponse } from '@/lib/api/types';
import {
  ArrowRightIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  BuildingStorefrontIcon,
  CurrencyRupeeIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';

export default function BudgetFlowPage() {
  const [data, setData] = useState<BudgetFlowResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMinistry, setSelectedMinistry] = useState<string>('ALL');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getBudgetFlow();
      setData(response);
    } catch (error) {
      console.error('Failed to fetch budget flow data:', error);
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
          <p className="text-gray-600 font-semibold">Mapping budget flow...</p>
        </div>
      </div>
    );
  }

  // Extract ministries from nodes
  const ministries = ['ALL', ...new Set(
    data?.nodes
      .filter(n => n.type === 'ministry')
      .map(n => n.name) || []
  )];

  // Filter links by ministry
  const filteredLinks = selectedMinistry === 'ALL'
    ? data?.links || []
    : data?.links.filter(link => {
        const sourceNode = data?.nodes.find(n => n.id === link.source);
        return sourceNode?.name === selectedMinistry || sourceNode?.type !== 'ministry';
      }) || [];

  // Calculate totals
  const totalFlow = data?.links.reduce((sum, link) => sum + link.value, 0) || 0;
  const ministryCount = data?.nodes.filter(n => n.type === 'ministry').length || 0;
  const departmentCount = data?.nodes.filter(n => n.type === 'department').length || 0;
  const ddoCount = data?.nodes.filter(n => n.type === 'ddo').length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 bg-clip-text text-transparent mb-2">
            National Budget Flow Analysis
          </h1>
          <p className="text-gray-600 text-lg">
            Track fund movement across administrative levels: Ministry → Department → DDO → Vendor
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-amber-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center">
                <CurrencyRupeeIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Flow</p>
                <p className="text-2xl font-black text-gray-900">
                  {formatCurrency(totalFlow)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-blue-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center">
                <BuildingOfficeIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Ministries</p>
                <p className="text-2xl font-black text-gray-900">{ministryCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-green-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center">
                <UserGroupIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Departments</p>
                <p className="text-2xl font-black text-gray-900">{departmentCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-orange-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center">
                <BuildingStorefrontIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">DDOs</p>
                <p className="text-2xl font-black text-gray-900">{ddoCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-amber-100 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <FunnelIcon className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-semibold text-gray-900">Filter by Ministry</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {ministries.map((ministry) => (
              <button
                key={ministry}
                onClick={() => setSelectedMinistry(ministry)}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  selectedMinistry === ministry
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {ministry}
              </button>
            ))}
          </div>
        </div>

        {/* Flow Visualization - List View */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Budget Flow Streams ({filteredLinks.length} flows)
          </h2>

          {filteredLinks.slice(0, 50).map((link, index) => {
            const sourceNode = data?.nodes.find(n => n.id === link.source);
            const targetNode = data?.nodes.find(n => n.id === link.target);
            
            if (!sourceNode || !targetNode) return null;

            const getNodeColor = (type: string) => {
              switch (type) {
                case 'ministry': return 'from-purple-50 to-purple-100 border-purple-200';
                case 'department': return 'from-blue-50 to-blue-100 border-blue-200';
                case 'ddo': return 'from-green-50 to-green-100 border-green-200';
                case 'vendor': return 'from-orange-50 to-orange-100 border-orange-200';
                default: return 'from-gray-50 to-gray-100 border-gray-200';
              }
            };

            const getNodeIcon = (type: string) => {
              switch (type) {
                case 'ministry': return <BuildingOfficeIcon className="h-5 w-5" />;
                case 'department': return <UserGroupIcon className="h-5 w-5" />;
                case 'ddo': return <UserGroupIcon className="h-4 w-4" />;
                case 'vendor': return <BuildingStorefrontIcon className="h-5 w-5" />;
                default: return null;
              }
            };

            return (
              <div
                key={`${link.source}-${link.target}-${index}`}
                className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-amber-100 hover:shadow-xl transition-all"
              >
                <div className="flex items-center justify-between gap-6">
                  {/* Source Node */}
                  <div className={`flex-1 bg-gradient-to-br ${getNodeColor(sourceNode.type)} rounded-lg p-4 border`}>
                    <div className="flex items-center gap-2 mb-2">
                      {getNodeIcon(sourceNode.type)}
                      <span className="text-xs font-bold text-gray-500 uppercase">{sourceNode.type}</span>
                    </div>
                    <p className="font-bold text-gray-900 text-sm">{sourceNode.name}</p>
                  </div>

                  {/* Arrow with Amount */}
                  <div className="flex flex-col items-center gap-2">
                    <ArrowRightIcon className="h-6 w-6 text-amber-600" />
                    <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-full shadow-lg">
                      <p className="text-sm font-black">{formatCurrency(link.value)}</p>
                    </div>
                  </div>

                  {/* Target Node */}
                  <div className={`flex-1 bg-gradient-to-br ${getNodeColor(targetNode.type)} rounded-lg p-4 border`}>
                    <div className="flex items-center gap-2 mb-2">
                      {getNodeIcon(targetNode.type)}
                      <span className="text-xs font-bold text-gray-500 uppercase">{targetNode.type}</span>
                    </div>
                    <p className="font-bold text-gray-900 text-sm">{targetNode.name}</p>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredLinks.length > 50 && (
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 text-center border border-amber-100">
              <p className="text-gray-600 font-semibold">
                Showing top 50 flows out of {filteredLinks.length} total
              </p>
              <p className="text-gray-400 text-sm mt-2">
                Filter by ministry to see more specific flows
              </p>
            </div>
          )}

          {filteredLinks.length === 0 && (
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-12 text-center border border-amber-100">
              <p className="text-gray-500 text-lg">No budget flows found</p>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-8 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-amber-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Flow Legend</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg"></div>
              <span className="text-sm font-medium text-gray-700">Ministry Level</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg"></div>
              <span className="text-sm font-medium text-gray-700">Department Level</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-lg"></div>
              <span className="text-sm font-medium text-gray-700">DDO Level</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg"></div>
              <span className="text-sm font-medium text-gray-700">Vendor Level</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
