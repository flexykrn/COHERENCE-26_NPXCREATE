'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import {
  ChartBarIcon,
  BanknotesIcon,
  UserGroupIcon,
  DocumentCheckIcon,
  ExclamationCircleIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [schemes, setSchemes] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      fetch('/api/stats').then(res => res.json()),
      fetch('/api/schemes').then(res => res.json()),
      fetch('/api/complaints').then(res => res.json()),
    ])
      .then(([statsData, schemesData, complaintsData]) => {
        setStats(statsData.data);
        setSchemes(schemesData.data.slice(0, 5));
        setComplaints(complaintsData.data.slice(0, 5));
      })
      .catch(err => console.error(err));
  }, []);

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      icon: ChartBarIcon,
      title: 'Active Schemes',
      value: stats.activeSchemes,
      total: stats.totalSchemes,
      color: 'blue',
      trend: '+12%',
    },
    {
      icon: BanknotesIcon,
      title: 'Budget Allocated',
      value: stats.budgetAllocated,
      color: 'purple',
      trend: '+8%',
    },
    {
      icon: UserGroupIcon,
      title: 'Beneficiaries',
      value: stats.beneficiaries,
      color: 'green',
      trend: '+15%',
    },
    {
      icon: DocumentCheckIcon,
      title: 'Issues Resolved',
      value: stats.complaintsResolved,
      total: stats.complaintsResolved + stats.pendingComplaints,
      color: 'orange',
      trend: '+24%',
    },
  ];

  const getColorClasses = (color: string) => {
    const colors: any = {
      blue: 'from-blue-500 to-blue-600',
      purple: 'from-purple-500 to-purple-600',
      green: 'from-green-500 to-green-600',
      orange: 'from-orange-500 to-orange-600',
    };
    return colors[color];
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      
      <div className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Dashboard
            </h1>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <span>Last updated: {new Date(stats.lastUpdated).toLocaleString('en-IN')}</span>
              <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <ArrowTrendingUpIcon className="h-4 w-4" />
                Transparency Score: {stats.transparencyScore}%
              </span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {statCards.map((stat, index) => (
              <div 
                key={index}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${getColorClasses(stat.color)}`}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-semibold rounded">
                    {stat.trend}
                  </span>
                </div>
                <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">
                  {stat.title}
                </h3>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {stat.value}
                  </p>
                  {stat.total && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      / {stat.total}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Schemes */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Top Performing Schemes
              </h2>
              <div className="space-y-4">
                {schemes.map((scheme) => (
                  <div 
                    key={scheme.id}
                    className="border-l-4 border-blue-500 pl-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {scheme.title}
                      </h3>
                      <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                        {scheme.completionRate}%
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {scheme.department}
                    </p>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                        style={{ width: `${scheme.completionRate}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Complaints */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Recent Reports
              </h2>
              <div className="space-y-4">
                {complaints.map((complaint) => (
                  <div 
                    key={complaint.id}
                    className="border-l-4 border-orange-500 pl-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {complaint.title}
                      </h3>
                      <span className={`text-xs px-2 py-1 rounded ${
                        complaint.priority === 'Critical' 
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                      }`}>
                        {complaint.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {complaint.location} • {complaint.category}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>{complaint.submittedDate}</span>
                      <span className="flex items-center gap-1">
                        <ArrowTrendingUpIcon className="h-3 w-3" />
                        {complaint.upvotes} upvotes
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Transparency Meter */}
          <div className="mt-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-xl p-8 text-white">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="mb-6 md:mb-0">
                <h2 className="text-3xl font-bold mb-2">Transparency Score</h2>
                <p className="text-blue-100">
                  Based on data accuracy, scheme progress, and issue resolution
                </p>
              </div>
              <div className="text-center">
                <div className="relative inline-flex items-center justify-center">
                  <svg className="transform -rotate-90 w-32 h-32">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-blue-300 opacity-30"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 56}`}
                      strokeDashoffset={`${2 * Math.PI * 56 * (1 - stats.transparencyScore / 100)}`}
                      className="text-white"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute text-4xl font-bold">
                    {stats.transparencyScore}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
