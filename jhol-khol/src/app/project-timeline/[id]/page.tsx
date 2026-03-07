'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import {
  CheckCircleIcon,
  ClockIcon,
  CurrencyRupeeIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  CalendarIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';

const projectStages = [
  {
    id: 1,
    name: 'Contract Signing',
    status: 'completed',
    progress: 100,
    startDate: '2026-01-05',
    endDate: '2026-01-10',
    allocated: 2.5,
    spent: 2.3,
    description: 'Legal documentation and contract finalization',
    icon: '📝',
  },
  {
    id: 2,
    name: 'Site Preparation',
    status: 'completed',
    progress: 100,
    startDate: '2026-01-11',
    endDate: '2026-01-25',
    allocated: 5.8,
    spent: 6.2,
    description: 'Land clearance, surveying, and initial setup',
    icon: '🏗️',
    issues: ['Budget exceeded by 7%'],
  },
  {
    id: 3,
    name: 'Foundation Work',
    status: 'in-progress',
    progress: 65,
    startDate: '2026-01-26',
    endDate: '2026-02-20',
    allocated: 12.5,
    spent: 10.8,
    description: 'Foundation laying and structural base',
    icon: '🔨',
    issues: ['Delayed by 23 days due to material shortage'],
    lastUpdate: '3 days ago',
  },
  {
    id: 4,
    name: 'Construction',
    status: 'pending',
    progress: 0,
    startDate: '2026-02-21',
    endDate: '2026-04-15',
    allocated: 18.2,
    spent: 0,
    description: 'Main building construction',
    icon: '🏢',
  },
  {
    id: 5,
    name: 'Finishing',
    status: 'pending',
    progress: 0,
    startDate: '2026-04-16',
    endDate: '2026-05-30',
    allocated: 6.2,
    spent: 0,
    description: 'Interior work, painting, and fixtures',
    icon: '🎨',
  },
  {
    id: 6,
    name: 'Handover',
    status: 'pending',
    progress: 0,
    startDate: '2026-05-31',
    endDate: '2026-06-10',
    allocated: 0.0,
    spent: 0,
    description: 'Final inspection and handover',
    icon: '✅',
  },
];

export default function ProjectTimelinePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [contractor, setContractor] = useState<any>(null);
  const [department, setDepartment] = useState<any>(null);
  const [expandedStage, setExpandedStage] = useState<number | null>(null);

  useEffect(() => {
    const contractorData = localStorage.getItem('selectedContractor');
    const deptData = localStorage.getItem('selectedDepartment');
    
    if (!contractorData) {
      router.push('/login');
      return;
    }
    
    setContractor(JSON.parse(contractorData));
    if (deptData) setDepartment(JSON.parse(deptData));
  }, [router]);

  if (!contractor) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalAllocated = projectStages.reduce((sum, stage) => sum + stage.allocated, 0);
  const totalSpent = projectStages.reduce((sum, stage) => sum + stage.spent, 0);
  const overallProgress = Math.round(
    projectStages.reduce((sum, stage) => sum + stage.progress, 0) / projectStages.length
  );
  const completedStages = projectStages.filter(s => s.status === 'completed').length;

  // Calculate if project is delayed
  const currentStage = projectStages.find(s => s.status === 'in-progress');
  const isDelayed = currentStage?.issues?.some(i => i.includes('Delayed'));
  const delayDays = isDelayed ? 23 : 0;

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
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            Back to Contractor Selection
          </button>
          
          <h1 className="text-4xl font-black text-white mb-2">
            Project Timeline & Progress
          </h1>
          <p className="text-gray-400">
            {contractor.name} • {department?.department.name}
          </p>
        </motion.div>

        {/* Overview Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                <ChartBarIcon className="w-6 h-6 text-amber-400" />
              </div>
              <span className="text-sm text-gray-400">Overall Progress</span>
            </div>
            <div className="text-3xl font-black text-white mb-1">{overallProgress}%</div>
            <div className="text-xs text-gray-400">
              {completedStages} of {projectStages.length} stages completed
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                <CurrencyRupeeIcon className="w-6 h-6 text-green-400" />
              </div>
              <span className="text-sm text-gray-400">Budget Utilization</span>
            </div>
            <div className="text-3xl font-black text-white mb-1">
              {((totalSpent / totalAllocated) * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-400">
              ₹{totalSpent.toFixed(1)} Cr of ₹{totalAllocated.toFixed(1)} Cr
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isDelayed ? 'bg-red-500/20' : 'bg-blue-500/20'
              }`}>
                <ClockIcon className={`w-6 h-6 ${isDelayed ? 'text-red-400' : 'text-blue-400'}`} />
              </div>
              <span className="text-sm text-gray-400">Timeline Status</span>
            </div>
            <div className={`text-2xl font-black mb-1 ${isDelayed ? 'text-red-400' : 'text-blue-400'}`}>
              {isDelayed ? 'Delayed' : 'On Track'}
            </div>
            <div className="text-xs text-gray-400">
              {isDelayed ? `${delayDays} days behind schedule` : 'Meeting deadlines'}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <CheckCircleIcon className="w-6 h-6 text-purple-400" />
              </div>
              <span className="text-sm text-gray-400">Contractor Rating</span>
            </div>
            <div className="text-3xl font-black text-white mb-1">
              {contractor.qualityScore}/100
            </div>
            <div className="text-xs text-gray-400">
              Based on current progress
            </div>
          </motion.div>
        </div>

        {/* Progress Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 mb-8"
        >
          <h2 className="text-2xl font-black text-white mb-6">Project Stages</h2>
          
          <div className="relative">
            {/* Progress Line */}
            <div className="absolute top-6 left-0 right-0 h-1 bg-gray-700 rounded-full">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-green-500 rounded-full transition-all duration-1000"
                style={{ width: `${overallProgress}%` }}
              />
            </div>

            {/* Stages */}
            <div className="grid grid-cols-6 gap-4 relative">
              {projectStages.map((stage, index) => (
                <div key={stage.id} className="flex flex-col items-center">
                  {/* Stage Icon */}
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl mb-3 border-4 transition-all duration-300 ${
                      stage.status === 'completed'
                        ? 'bg-green-500 border-green-400'
                        : stage.status === 'in-progress'
                        ? 'bg-amber-500 border-amber-400 animate-pulse'
                        : 'bg-gray-700 border-gray-600'
                    }`}
                  >
                    {stage.icon}
                  </div>
                  
                  {/* Stage Name */}
                  <div className="text-center">
                    <div className={`font-bold text-sm mb-1 ${
                      stage.status === 'completed' ? 'text-green-400' :
                      stage.status === 'in-progress' ? 'text-amber-400' : 'text-gray-500'
                    }`}>
                      {stage.name}
                    </div>
                    <div className="text-xs text-gray-400">
                      {stage.progress}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Stage Details */}
        <div className="space-y-4">
          {projectStages.map((stage, index) => (
            <motion.div
              key={stage.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.05 }}
              className={`bg-white/10 backdrop-blur-xl border rounded-2xl overflow-hidden transition-all duration-300 ${
                stage.status === 'in-progress'
                  ? 'border-amber-400 shadow-lg shadow-amber-500/20'
                  : 'border-white/20'
              }`}
            >
              <div
                className="p-6 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => setExpandedStage(expandedStage === stage.id ? null : stage.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="text-3xl">{stage.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-white">{stage.name}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          stage.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                          stage.status === 'in-progress' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {stage.status === 'in-progress' ? '⏳ In Progress' :
                           stage.status === 'completed' ? '✅ Completed' : '🕐 Pending'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400">{stage.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <div className="text-sm text-gray-400 mb-1">Budget</div>
                      <div className="font-bold text-white">
                        ₹{stage.spent.toFixed(1)} / ₹{stage.allocated.toFixed(1)} Cr
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-400 mb-1">Progress</div>
                      <div className={`text-2xl font-black ${
                        stage.progress === 100 ? 'text-green-400' :
                        stage.progress > 0 ? 'text-amber-400' : 'text-gray-500'
                      }`}>
                        {stage.progress}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-1000 ${
                      stage.progress === 100 ? 'bg-green-500' :
                      stage.progress > 0 ? 'bg-amber-500' : 'bg-gray-600'
                    }`}
                    style={{ width: `${stage.progress}%` }}
                  />
                </div>

                {/* Issues Badge */}
                {stage.issues && stage.issues.length > 0 && (
                  <div className="mt-3 flex items-center gap-2 text-sm">
                    <ExclamationTriangleIcon className="w-4 h-4 text-red-400" />
                    <span className="text-red-400 font-semibold">
                      {stage.issues.length} issue{stage.issues.length > 1 ? 's' : ''} detected
                    </span>
                  </div>
                )}
              </div>

              {/* Expanded Details */}
              {expandedStage === stage.id && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="border-t border-white/10 bg-white/5 p-6"
                >
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-bold text-gray-400 mb-3 uppercase">Timeline</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <CalendarIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-400">Start:</span>
                          <span className="text-white font-semibold">{stage.startDate}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <CalendarIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-400">End:</span>
                          <span className="text-white font-semibold">{stage.endDate}</span>
                        </div>
                        {stage.lastUpdate && (
                          <div className="flex items-center gap-2 text-sm">
                            <ClockIcon className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-400">Last Update:</span>
                            <span className="text-amber-400 font-semibold">{stage.lastUpdate}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-gray-400 mb-3 uppercase">Budget Details</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Allocated:</span>
                          <span className="text-white font-semibold">₹{stage.allocated.toFixed(1)} Cr</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Spent:</span>
                          <span className="text-amber-400 font-semibold">₹{stage.spent.toFixed(1)} Cr</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Remaining:</span>
                          <span className="text-green-400 font-semibold">
                            ₹{(stage.allocated - stage.spent).toFixed(1)} Cr
                          </span>
                        </div>
                        {stage.spent > stage.allocated && (
                          <div className="mt-2 p-2 bg-red-500/20 border border-red-500/50 rounded text-xs text-red-300">
                            💰 Budget exceeded by ₹{(stage.spent - stage.allocated).toFixed(1)} Cr (
                            {(((stage.spent - stage.allocated) / stage.allocated) * 100).toFixed(1)}%)
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {stage.issues && stage.issues.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-bold text-gray-400 mb-3 uppercase">Issues & Alerts</h4>
                      <div className="space-y-2">
                        {stage.issues.map((issue, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg"
                          >
                            <ExclamationTriangleIcon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-red-300">{issue}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Anomaly Detection Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="mt-8 bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-400/30 rounded-2xl p-6"
        >
          <h2 className="text-xl font-black text-white mb-4 flex items-center gap-2">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-400" />
            Anomaly Detection Summary
          </h2>
          
          <div className="grid md:grid-cols-3 gap-4">
            {isDelayed && (
              <div className="bg-white/5 rounded-xl p-4">
                <div className="text-sm text-gray-400 mb-1">Timeline Delay</div>
                <div className="text-2xl font-black text-red-400">{delayDays} days</div>
                <div className="text-xs text-gray-500 mt-1">Behind schedule</div>
              </div>
            )}
            
            {totalSpent > totalAllocated * 0.9 && (
              <div className="bg-white/5 rounded-xl p-4">
                <div className="text-sm text-gray-400 mb-1">Budget Alert</div>
                <div className="text-2xl font-black text-yellow-400">
                  {((totalSpent / totalAllocated) * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500 mt-1">Budget utilized</div>
              </div>
            )}
            
            {projectStages[1].spent > projectStages[1].allocated && (
              <div className="bg-white/5 rounded-xl p-4">
                <div className="text-sm text-gray-400 mb-1">Stage Budget Overrun</div>
                <div className="text-2xl font-black text-orange-400">
                  +{(((projectStages[1].spent - projectStages[1].allocated) / projectStages[1].allocated) * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500 mt-1">Site Preparation exceeded</div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
