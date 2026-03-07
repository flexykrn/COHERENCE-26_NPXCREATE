'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import {
  UserGroupIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChartBarIcon,
  ClockIcon,
  CurrencyRupeeIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

// Sample contractors with AI risk scores
const contractors = [
  {
    id: 1,
    name: 'Reliable Builders Pvt Ltd',
    riskScore: 25,
    completionRate: 95,
    qualityScore: 92,
    activeProjects: 5,
    pastProjects: 48,
    avgDelay: 2,
    litigationCount: 0,
    financialStability: 0.95,
    costOverrunPct: 5,
  },
  {
    id: 2,
    name: 'Excel Infrastructure',
    riskScore: 32,
    completionRate: 91,
    qualityScore: 88,
    activeProjects: 7,
    pastProjects: 35,
    avgDelay: 5,
    litigationCount: 1,
    financialStability: 0.90,
    costOverrunPct: 8,
  },
  {
    id: 3,
    name: 'Modern Constructions Ltd',
    riskScore: 45,
    completionRate: 85,
    qualityScore: 82,
    activeProjects: 4,
    pastProjects: 28,
    avgDelay: 8,
    litigationCount: 2,
    financialStability: 0.85,
    costOverrunPct: 12,
  },
  {
    id: 4,
    name: 'Budget Contractors Co',
    riskScore: 58,
    completionRate: 78,
    qualityScore: 75,
    activeProjects: 6,
    pastProjects: 22,
    avgDelay: 12,
    litigationCount: 3,
    financialStability: 0.78,
    costOverrunPct: 18,
  },
  {
    id: 5,
    name: 'QuickBuild Services',
    riskScore: 68,
    completionRate: 72,
    qualityScore: 70,
    activeProjects: 8,
    pastProjects: 18,
    avgDelay: 18,
    litigationCount: 4,
    financialStability: 0.70,
    costOverrunPct: 25,
  },
  {
    id: 6,
    name: 'Shady Contractors Inc',
    riskScore: 85,
    completionRate: 60,
    qualityScore: 58,
    activeProjects: 3,
    pastProjects: 15,
    avgDelay: 25,
    litigationCount: 7,
    financialStability: 0.55,
    costOverrunPct: 40,
  },
];

export default function SelectContractorPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [department, setDepartment] = useState<any>(null);
  const [selectedContractor, setSelectedContractor] = useState<number | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [justification, setJustification] = useState('');

  useEffect(() => {
    // Check authentication
    const userData = localStorage.getItem('user');
    const deptData = localStorage.getItem('selectedDepartment');
    
    if (!userData || !deptData) {
      router.push('/login');
      return;
    }
    
    setUser(JSON.parse(userData));
    setDepartment(JSON.parse(deptData));
  }, [router]);

  const getRiskBadge = (score: number) => {
    if (score < 40) {
      return {
        label: 'LOW RISK',
        color: 'bg-green-500/20 text-green-400 border-green-500/50',
        icon: <CheckCircleIcon className="w-4 h-4" />,
      };
    } else if (score < 70) {
      return {
        label: 'MEDIUM RISK',
        color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
        icon: <ExclamationTriangleIcon className="w-4 h-4" />,
      };
    } else {
      return {
        label: 'HIGH RISK',
        color: 'bg-red-500/20 text-red-400 border-red-500/50',
        icon: <XCircleIcon className="w-4 h-4" />,
      };
    }
  };

  const handleSelectContractor = (contractorId: number) => {
    const contractor = contractors.find(c => c.id === contractorId);
    if (!contractor) return;

    setSelectedContractor(contractorId);

    if (contractor.riskScore >= 70) {
      setShowWarning(true);
    } else {
      proceedWithSelection(contractor);
    }
  };

  const proceedWithSelection = (contractor: any) => {
    // Store selection
    localStorage.setItem('selectedContractor', JSON.stringify(contractor));
    
    // If high risk, log anomaly (in real system, would call API)
    if (contractor.riskScore >= 70) {
      console.log('HIGH RISK CONTRACTOR ALERT:', {
        contractor: contractor.name,
        riskScore: contractor.riskScore,
        user: user?.email,
        justification,
        timestamp: new Date().toISOString(),
      });
    }

    // Redirect to project timeline
    router.push(`/project-timeline/${contractor.id}`);
  };

  const topRecommendations = contractors
    .filter(c => c.riskScore < 40)
    .sort((a, b) => a.riskScore - b.riskScore)
    .slice(0, 3);

  if (!user || !department) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const selectedC = selectedContractor ? contractors.find(c => c.id === selectedContractor) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-black text-white mb-2">
            Select Contractor
          </h1>
          <p className="text-gray-400">
            {department.department.icon} {department.department.name} • {department.district}, {department.state}
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* AI Recommendations Panel */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-400/30 rounded-2xl p-6 sticky top-4"
            >
              <div className="flex items-center gap-2 mb-4">
                <SparklesIcon className="w-6 h-6 text-amber-400" />
                <h2 className="text-xl font-black text-white">AI Recommendations</h2>
              </div>
              
              <p className="text-sm text-gray-400 mb-4">
                Based on historical performance, financial stability, and risk analysis
              </p>

              <div className="space-y-3">
                {topRecommendations.map((contractor, index) => (
                  <div
                    key={contractor.id}
                    className="bg-white/5 rounded-xl p-4 border border-white/10"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs font-bold rounded">
                        #{index + 1} Recommended
                      </span>
                      <span className="text-green-400 font-bold text-sm">
                        {contractor.riskScore}/100
                      </span>
                    </div>
                    <h3 className="text-white font-bold text-sm mb-2">
                      {contractor.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <CheckCircleIcon className="w-4 h-4 text-green-400" />
                      {contractor.completionRate}% completion rate
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-4 bg-blue-500/20 border border-blue-500/50 rounded-xl">
                <p className="text-xs text-blue-300">
                  <strong>💡 Tip:</strong> Contractors with risk scores below 40 are recommended for selection
                </p>
              </div>
            </motion.div>
          </div>

          {/* Contractors List */}
          <div className="lg:col-span-2">
            <div className="space-y-4">
              {contractors.map((contractor, index) => {
                const badge = getRiskBadge(contractor.riskScore);
                
                return (
                  <motion.div
                    key={contractor.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`bg-white/10 backdrop-blur-xl border rounded-2xl p-6 transition-all duration-300 ${
                      selectedContractor === contractor.id
                        ? 'border-amber-400 shadow-lg shadow-amber-500/20'
                        : 'border-white/20 hover:border-white/40'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-white">
                            {contractor.name}
                          </h3>
                          <div className={`px-3 py-1 border rounded-full flex items-center gap-1 text-xs font-bold ${badge.color}`}>
                            {badge.icon}
                            {badge.label}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <span>{contractor.pastProjects} projects completed</span>
                          <span>•</span>
                          <span>{contractor.activeProjects} active</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm text-gray-400 mb-1">Risk Score</div>
                        <div className={`text-3xl font-black ${
                          contractor.riskScore < 40 ? 'text-green-400' :
                          contractor.riskScore < 70 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {contractor.riskScore}
                        </div>
                      </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      <div className="bg-white/5 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircleIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-xs text-gray-400">Completion</span>
                        </div>
                        <div className="text-lg font-bold text-white">
                          {contractor.completionRate}%
                        </div>
                      </div>

                      <div className="bg-white/5 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <ChartBarIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-xs text-gray-400">Quality</span>
                        </div>
                        <div className="text-lg font-bold text-white">
                          {contractor.qualityScore}/100
                        </div>
                      </div>

                      <div className="bg-white/5 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <ClockIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-xs text-gray-400">Avg Delay</span>
                        </div>
                        <div className="text-lg font-bold text-white">
                          {contractor.avgDelay}d
                        </div>
                      </div>

                      <div className="bg-white/5 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <CurrencyRupeeIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-xs text-gray-400">Overrun</span>
                        </div>
                        <div className="text-lg font-bold text-white">
                          {contractor.costOverrunPct}%
                        </div>
                      </div>
                    </div>

                    {/* Risk Factors */}
                    {contractor.riskScore >= 40 && (
                      <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                        <div className="text-sm font-bold text-red-400 mb-2">⚠️ Risk Factors:</div>
                        <ul className="text-xs text-gray-300 space-y-1">
                          {contractor.litigationCount > 2 && (
                            <li>• {contractor.litigationCount} active litigations</li>
                          )}
                          {contractor.costOverrunPct > 15 && (
                            <li>• {contractor.costOverrunPct}% cost overruns in past projects</li>
                          )}
                          {contractor.completionRate < 80 && (
                            <li>• Only {contractor.completionRate}% on-time completion rate</li>
                          )}
                          {contractor.avgDelay > 15 && (
                            <li>• Average delay of {contractor.avgDelay} days</li>
                          )}
                        </ul>
                      </div>
                    )}

                    <button
                      onClick={() => handleSelectContractor(contractor.id)}
                      className={`w-full py-3 rounded-xl font-bold transition-all duration-300 ${
                        contractor.riskScore < 40
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600'
                          : contractor.riskScore < 70
                          ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-600 hover:to-orange-600'
                          : 'bg-gradient-to-r from-red-500 to-rose-500 text-white hover:from-red-600 hover:to-rose-600'
                      }`}
                    >
                      Select Contractor
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* High Risk Warning Modal */}
      {showWarning && selectedC && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 border-2 border-red-500 rounded-2xl p-8 max-w-2xl w-full"
          >
            <div className="flex items-start gap-4 mb-6">
              <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                <ExclamationTriangleIcon className="w-10 h-10 text-red-400" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white mb-2">
                  ⚠️ High Risk Contractor Warning
                </h2>
                <p className="text-gray-400">
                  You have selected a contractor with a high risk score
                </p>
              </div>
            </div>

            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
              <h3 className="text-lg font-bold text-white mb-3">{selectedC.name}</h3>
              <div className="space-y-2 text-sm text-gray-300">
                <div className="flex justify-between">
                  <span>Risk Score:</span>
                  <span className="text-red-400 font-bold">{selectedC.riskScore}/100</span>
                </div>
                <div className="flex justify-between">
                  <span>Completion Rate:</span>
                  <span className="text-yellow-400">{selectedC.completionRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Active Litigations:</span>
                  <span className="text-red-400">{selectedC.litigationCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cost Overruns:</span>
                  <span className="text-red-400">{selectedC.costOverrunPct}%</span>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-300 mb-2">
                Justification (Required for high-risk selection)
              </label>
              <textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-red-400 focus:outline-none"
                rows={4}
                placeholder="Enter your justification for selecting this high-risk contractor..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowWarning(false);
                  setSelectedContractor(null);
                  setJustification('');
                }}
                className="flex-1 py-3 bg-white/10 border border-white/20 text-white font-bold rounded-xl hover:bg-white/20 transition-all"
              >
                Cancel & Choose Another
              </button>
              <button
                onClick={() => {
                  if (!justification.trim()) {
                    alert('Please provide justification');
                    return;
                  }
                  setShowWarning(false);
                  proceedWithSelection(selectedC);
                }}
                className="flex-1 py-3 bg-gradient-to-r from-red-500 to-rose-500 text-white font-bold rounded-xl hover:from-red-600 hover:to-rose-600 transition-all"
              >
                Proceed Anyway
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
