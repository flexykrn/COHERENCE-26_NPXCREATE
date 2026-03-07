'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';
import apiClient from '@/lib/api/client';
import type { WelfareScheme } from '@/lib/api/types';

export default function SchemesPage() {
  const [schemes, setSchemes] = useState<WelfareScheme[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchemes = async () => {
      setLoading(true);
      try {
        const data = await apiClient.getSchemes();
        setSchemes(data.schemes || []);
      } catch (err) {
        console.error('Failed to fetch schemes:', err);
        setSchemes([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSchemes();
  }, []);

  const filteredSchemes = (schemes || []).filter(scheme => {
    const matchesSearch = scheme.scheme_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         scheme.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'All' || scheme.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (rate: number) => {
    if (rate >= 80) return 'bg-green-500';
    if (rate >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      
      <div className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Government Schemes
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Track progress and budget allocation of public welfare programs
            </p>
          </div>

          {/* Search and Filter */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search schemes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              
              <div className="relative">
                <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option>All</option>
                  <option>Active</option>
                  <option>Completed</option>
                  <option>Paused</option>
                </select>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading schemes...</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredSchemes.length === 0 && (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                {searchTerm || filterStatus !== 'All' 
                  ? 'No schemes match your search criteria' 
                  : 'No schemes available'}
              </p>
            </div>
          )}

          {/* Schemes Grid */}
          {!loading && filteredSchemes.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredSchemes.map((scheme) => (
              <div 
                key={scheme.scheme_id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      {scheme.scheme_name}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      scheme.status === 'Active' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                      scheme.status === 'Completed' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
                      'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                    }`}>
                      {scheme.status}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Department: {scheme.department}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Budget Allocated</div>
                      <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                        ₹{(scheme.total_allocated_cr || 0).toFixed(2)} Cr
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Budget Utilized</div>
                      <div className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                        ₹{(scheme.total_utilized_cr || 0).toFixed(2)} Cr
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Target Beneficiaries</div>
                      <div className="text-lg font-semibold text-amber-600 dark:text-amber-400">
                        {(scheme.beneficiaries_target || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Reached</div>
                      <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                        {(scheme.beneficiaries_reached || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Budget Utilization</span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {(scheme.utilization_pct || 0).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${getStatusColor(scheme.utilization_pct || 0)}`}
                        style={{ width: `${Math.min(100, scheme.utilization_pct || 0)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Coverage</span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {(scheme.coverage_pct || 0).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${getStatusColor(scheme.coverage_pct || 0)}`}
                        style={{ width: `${Math.min(100, scheme.coverage_pct || 0)}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">
                        Unspent Amount
                      </span>
                      <span className={`font-semibold ${
                        (scheme.unspent_amount_cr || 0) > 10 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        ₹{(scheme.unspent_amount_cr || 0).toFixed(2)} Cr
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
