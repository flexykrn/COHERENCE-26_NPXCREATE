'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import {
  ExclamationTriangleIcon,
  ChartBarIcon,
  CalendarIcon,
  CurrencyRupeeIcon,
  ShieldExclamationIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowsPointingOutIcon,
} from '@heroicons/react/24/outline';

interface Project {
  id: string;
  name: string;
  allocated: number;
  spent: number;
  startMonth: number; // 0-11 (April = 0)
  duration: number; // in months
  status: 'completed' | 'ongoing' | 'planned';
  contractor: string;
  anomalyScore: number;
}

interface MonthData {
  month: string;
  allocated: number;
  spent: number;
  projects: number;
}

const MONTHS = [
  'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
  'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'
];

const INITIAL_PROJECTS: Project[] = [
  {
    id: 'p1',
    name: 'Road Construction - NH-44',
    allocated: 45,
    spent: 38.5,
    startMonth: 0,
    duration: 4,
    status: 'completed',
    contractor: 'Reliable Builders',
    anomalyScore: 0.15,
  },
  {
    id: 'p2',
    name: 'School Building Renovation',
    allocated: 25,
    spent: 22.3,
    startMonth: 2,
    duration: 5,
    status: 'ongoing',
    contractor: 'Excel Infrastructure',
    anomalyScore: 0.25,
  },
  {
    id: 'p3',
    name: 'Water Supply Pipeline',
    allocated: 35,
    spent: 12.5,
    startMonth: 5,
    duration: 4,
    status: 'ongoing',
    contractor: 'Modern Constructions',
    anomalyScore: 0.42,
  },
  {
    id: 'p4',
    name: 'Bridge Repair Project',
    allocated: 55,
    spent: 8.2,
    startMonth: 9,
    duration: 2,
    status: 'planned',
    contractor: 'QuickBuild Services',
    anomalyScore: 0.78,
  },
  {
    id: 'p5',
    name: 'Community Center Construction',
    allocated: 30,
    spent: 5.1,
    startMonth: 10,
    duration: 2,
    status: 'planned',
    contractor: 'Budget Contractors Co',
    anomalyScore: 0.82,
  },
  {
    id: 'p6',
    name: 'Street Lighting Installation',
    allocated: 18,
    spent: 2.3,
    startMonth: 10,
    duration: 2,
    status: 'planned',
    contractor: 'Shady Contractors Inc',
    anomalyScore: 0.91,
  },
];

export default function FinancialTimelinePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [department, setDepartment] = useState<any>(null);
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [draggedProject, setDraggedProject] = useState<string | null>(null);
  const [anomalyAlert, setAnomalyAlert] = useState<boolean>(false);
  const [anomalyDetails, setAnomalyDetails] = useState<string[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const deptData = localStorage.getItem('selectedDepartment');
    
    if (!userData || !deptData) {
      router.push('/login');
      return;
    }
    
    setUser(JSON.parse(userData));
    setDepartment(JSON.parse(deptData));

    // Run anomaly detection
    detectAnomalies();
  }, [router]);

  useEffect(() => {
    detectAnomalies();
  }, [projects]);

  const detectAnomalies = () => {
    if (projects.length === 0) {
      setAnomalyAlert(false);
      setAnomalyDetails([]);
      return;
    }

    const details: string[] = [];
    
    // Multiple anomaly detection techniques
    const totalAllocated = projects.reduce((sum, p) => sum + p.allocated, 0);
    const totalSpent = projects.reduce((sum, p) => sum + p.spent, 0);
    
    // 1. Year-end bunching detection (last 3 months)
    const lastThreeMonths = projects.filter(p => p.startMonth >= 9);
    const lastThreeAllocated = lastThreeMonths.reduce((sum, p) => sum + p.allocated, 0);
    const yearEndRatio = lastThreeAllocated / totalAllocated;
    
    // 2. Rushed project detection (high budget + short duration in last quarter)
    const rushedProjects = projects.filter(p => 
      p.startMonth >= 9 && 
      p.duration <= 2 && 
      p.allocated > 20 &&
      p.status !== 'completed'
    );
    
    // 3. Spending velocity anomaly (low spend rate for most of year, then spike)
    const firstNineMonths = projects.filter(p => p.startMonth < 9);
    const firstNineSpent = firstNineMonths.reduce((sum, p) => sum + p.spent, 0);
    const lastThreeSpent = lastThreeMonths.reduce((sum, p) => sum + p.spent, 0);
    const spendingRatio = totalSpent > 0 ? lastThreeSpent / totalSpent : 0;
    
    // 4. Incomplete project bunching (multiple unfinished projects at year end)
    const incompleteLastQuarter = projects.filter(p => 
      p.startMonth >= 9 && 
      p.status !== 'completed' &&
      p.spent < p.allocated * 0.5  // Less than 50% spent
    );
    
    // Check each anomaly and add details
    const hasYearEndBunching = yearEndRatio > 0.45;
    if (hasYearEndBunching) {
      details.push(`${(yearEndRatio * 100).toFixed(1)}% of annual budget concentrated in final 3 months`);
    }
    
    const hasRushedProjects = rushedProjects.length >= 2;
    if (hasRushedProjects) {
      details.push(`${rushedProjects.length} high-value projects with unrealistic 2-month timelines in last quarter`);
    }
    
    const hasSpendingSpike = spendingRatio > 0.5 && totalSpent > 0;
    if (hasSpendingSpike) {
      details.push(`${(spendingRatio * 100).toFixed(1)}% of total spending rushed in final quarter`);
    }
    
    const hasIncompleteProjects = incompleteLastQuarter.length >= 3;
    if (hasIncompleteProjects) {
      details.push(`${incompleteLastQuarter.length} incomplete projects (< 50% spent) bunched at year-end`);
    }
    
    // Add general risk indicators
    if (details.length > 0) {
      details.push('Pattern matches known fund leakage strategies');
      details.push('Risk of unspent funds being rushed without proper oversight');
    }
    
    const anomalyDetected = hasYearEndBunching || hasRushedProjects || hasSpendingSpike || hasIncompleteProjects;
    
    setAnomalyAlert(anomalyDetected);
    setAnomalyDetails(details);
  };

  const handleDragStart = (projectId: string) => {
    setDraggedProject(projectId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (monthIndex: number) => {
    if (draggedProject) {
      setProjects(prev => prev.map(p => 
        p.id === draggedProject 
          ? { ...p, startMonth: monthIndex }
          : p
      ));
      setDraggedProject(null);
    }
  };

  const handleExtendProject = (projectId: string, newDuration: number) => {
    setProjects(prev => prev.map(p =>
      p.id === projectId
        ? { ...p, duration: Math.max(1, Math.min(12, newDuration)) }
        : p
    ));
  };

  const getMonthData = (): MonthData[] => {
    return MONTHS.map((month, idx) => {
      const monthProjects = projects.filter(p => 
        p.startMonth <= idx && idx < p.startMonth + p.duration
      );
      
      return {
        month,
        allocated: monthProjects.reduce((sum, p) => sum + p.allocated / p.duration, 0),
        spent: monthProjects.reduce((sum, p) => sum + p.spent / p.duration, 0),
        projects: monthProjects.length,
      };
    });
  };

  const monthData = getMonthData();
  const totalAllocated = projects.reduce((sum, p) => sum + p.allocated, 0);
  const totalSpent = projects.reduce((sum, p) => sum + p.spent, 0);
  const highRiskProjects = projects.filter(p => p.anomalyScore > 0.7);

  if (!user || !department) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Navbar />
      
      <div className="max-w-[1800px] mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-black text-white mb-2 flex items-center gap-3">
            <CalendarIcon className="w-10 h-10 text-amber-400" />
            Financial Year Timeline
          </h1>
          <p className="text-gray-400">
            {department.department.icon} {department.department.name} • {department.district}, {department.state}
          </p>
        </motion.div>

        {/* Anomaly Alert */}
        {anomalyAlert && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 bg-red-500/20 border-2 border-red-500 rounded-2xl p-6"
          >
            <div className="flex items-start gap-4">
              <ShieldExclamationIcon className="w-12 h-12 text-red-400 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-2xl font-black text-red-400 mb-2">
                  ⚠️ Year-End Bunching Detected
                </h3>
                <p className="text-white mb-3">
                  AI Anomaly Detection Model has flagged suspicious project allocation pattern:
                </p>
                <ul className="text-red-300 space-y-1 mb-4">
                  {anomalyDetails.map((detail, idx) => (
                    <li key={idx}>• {detail}</li>
                  ))}
                </ul>
                <div className="flex gap-3">
                  <span className="px-4 py-2 bg-red-500 text-white rounded-lg font-bold text-sm">
                    CRITICAL ALERT
                  </span>
                  <button
                    onClick={() => router.push('/reallocation-map')}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-sm transition-colors"
                  >
                    Open Reallocation Map
                  </button>
                  <span className="px-4 py-2 bg-white/10 text-white rounded-lg font-bold text-sm">
                    Recommend: Redistribute projects across quarters
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-2">
              <CurrencyRupeeIcon className="w-5 h-5 text-amber-400" />
              <span className="text-gray-400 text-sm">Total Allocated</span>
            </div>
            <p className="text-3xl font-black text-white">₹{totalAllocated.toFixed(1)} Cr</p>
          </div>

          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-2">
              <ChartBarIcon className="w-5 h-5 text-green-400" />
              <span className="text-gray-400 text-sm">Total Spent</span>
            </div>
            <p className="text-3xl font-black text-green-400">₹{totalSpent.toFixed(1)} Cr</p>
          </div>

          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-2">
              <ClockIcon className="w-5 h-5 text-blue-400" />
              <span className="text-gray-400 text-sm">Active Projects</span>
            </div>
            <p className="text-3xl font-black text-blue-400">{projects.filter(p => p.status !== 'completed').length}</p>
          </div>

          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-2">
              <ShieldExclamationIcon className="w-5 h-5 text-red-400" />
              <span className="text-gray-400 text-sm">High Risk</span>
            </div>
            <p className="text-3xl font-black text-red-400">{highRiskProjects.length}</p>
          </div>
        </div>

        {/* Timeline Gantt Chart */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 mb-6">
          <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-amber-400" />
            Project Timeline (Drag to reschedule)
          </h2>

          <div className="overflow-x-auto">
            <div className="min-w-[1400px]">
              {/* Month Headers */}
              <div className="grid grid-cols-[200px_repeat(12,1fr)] gap-2 mb-4">
                <div className="font-bold text-white text-sm">Project</div>
                {MONTHS.map((month, idx) => (
                  <div
                    key={month}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(idx)}
                    className={`text-center font-bold text-sm py-2 rounded-lg ${
                      idx >= 9 ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                    }`}
                  >
                    {month}
                  </div>
                ))}
              </div>

              {/* Project Rows */}
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="grid grid-cols-[200px_repeat(12,1fr)] gap-2 mb-3 items-center"
                >
                  {/* Project Name */}
                  <div
                    onClick={() => setSelectedProject(project)}
                    className="text-white text-sm font-semibold cursor-pointer hover:text-amber-400 transition-colors truncate"
                  >
                    {project.name}
                  </div>

                  {/* Timeline Cells */}
                  {MONTHS.map((_, monthIdx) => {
                    const isInProject = monthIdx >= project.startMonth && monthIdx < project.startMonth + project.duration;
                    const isStart = monthIdx === project.startMonth;
                    const isEnd = monthIdx === project.startMonth + project.duration - 1;

                    return (
                      <div
                        key={monthIdx}
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop(monthIdx)}
                        className="relative h-12 bg-white/5 rounded"
                      >
                        {isInProject && (
                          <motion.div
                            draggable
                            onDragStart={() => handleDragStart(project.id)}
                            layout
                            className={`absolute inset-0 rounded-lg cursor-move flex items-center justify-center text-xs font-bold ${
                              project.anomalyScore > 0.7
                                ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white'
                                : project.anomalyScore > 0.4
                                ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white'
                                : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                            } ${isStart ? 'rounded-l-lg' : ''} ${isEnd ? 'rounded-r-lg' : ''}`}
                          >
                            {isStart && (
                              <span className="truncate px-2">
                                ₹{project.allocated} Cr
                              </span>
                            )}
                            {isEnd && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleExtendProject(project.id, project.duration + 1);
                                }}
                                className="absolute right-0 top-0 bottom-0 w-6 bg-black/30 rounded-r-lg flex items-center justify-center hover:bg-black/50"
                              >
                                <ArrowsPointingOutIcon className="w-4 h-4" />
                              </button>
                            )}
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* Spending Pattern Graph */}
              <div className="grid grid-cols-[200px_repeat(12,1fr)] gap-2 mt-8 pt-6 border-t border-white/20">
                <div className="font-bold text-white text-sm">Monthly Spending</div>
                {monthData.map((data, idx) => (
                  <div key={idx} className="relative h-32 bg-white/5 rounded-lg p-2">
                    <div className="absolute bottom-0 left-0 right-0 flex flex-col gap-1 p-2">
                      <div
                        style={{ height: `${Math.min(100, (data.spent / 30) * 100)}%` }}
                        className="bg-green-500/60 rounded-t transition-all duration-300"
                      />
                      <div
                        style={{ height: `${Math.min(100, (data.allocated / 30) * 100)}%` }}
                        className="bg-amber-500/40 rounded-t transition-all duration-300"
                      />
                    </div>
                    <div className="absolute top-1 left-1 right-1 text-xs text-white font-bold">
                      ₹{data.spent.toFixed(1)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded" />
              <span className="text-gray-400">Low Risk (&lt;40%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-r from-yellow-500 to-orange-500 rounded" />
              <span className="text-gray-400">Medium Risk (40-70%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-r from-red-500 to-rose-500 rounded" />
              <span className="text-gray-400">High Risk (&gt;70%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500/60 rounded" />
              <span className="text-gray-400">Spent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-amber-500/40 rounded" />
              <span className="text-gray-400">Allocated</span>
            </div>
          </div>
        </div>

        {/* Project Details Modal */}
        {selectedProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedProject(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-900 border-2 border-amber-400 rounded-2xl p-8 max-w-2xl w-full"
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black text-white mb-2">
                    {selectedProject.name}
                  </h2>
                  <p className="text-gray-400">Contractor: {selectedProject.contractor}</p>
                </div>
                <span className={`px-4 py-2 rounded-full font-bold text-sm ${
                  selectedProject.status === 'completed' 
                    ? 'bg-green-500/20 text-green-400'
                    : selectedProject.status === 'ongoing'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-gray-500/20 text-gray-400'
                }`}>
                  {selectedProject.status.toUpperCase()}
                </span>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-gray-400 text-sm mb-1">Allocated Budget</p>
                  <p className="text-2xl font-black text-amber-400">₹{selectedProject.allocated} Cr</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-gray-400 text-sm mb-1">Spent</p>
                  <p className="text-2xl font-black text-green-400">₹{selectedProject.spent} Cr</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-gray-400 text-sm mb-1">Timeline</p>
                  <p className="text-lg font-bold text-white">
                    {MONTHS[selectedProject.startMonth]} - {MONTHS[(selectedProject.startMonth + selectedProject.duration - 1) % 12]}
                  </p>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-gray-400 text-sm mb-1">Anomaly Score</p>
                  <p className={`text-2xl font-black ${
                    selectedProject.anomalyScore > 0.7 ? 'text-red-400' :
                    selectedProject.anomalyScore > 0.4 ? 'text-yellow-400' : 'text-green-400'
                  }`}>
                    {(selectedProject.anomalyScore * 100).toFixed(0)}%
                  </p>
                </div>
              </div>

              {selectedProject.anomalyScore > 0.7 && (
                <div className="bg-red-500/20 border border-red-500 rounded-xl p-4 mb-6">
                  <p className="text-red-400 font-bold mb-2">⚠️ High Risk Factors:</p>
                  <ul className="text-red-300 text-sm space-y-1">
                    <li>• Project scheduled in final quarter of fiscal year</li>
                    <li>• Short completion timeline ({selectedProject.duration} months)</li>
                    <li>• High budget allocation (₹{selectedProject.allocated} Cr)</li>
                    <li>• Pattern matches fund leakage strategies</li>
                  </ul>
                </div>
              )}

              <button
                onClick={() => setSelectedProject(null)}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all duration-300"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
