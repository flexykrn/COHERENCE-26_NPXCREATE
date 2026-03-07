'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import IndiaMap from '@/components/IndiaMap';
import StatePanel from '@/components/StatePanel';
import { 
  BuildingOfficeIcon,
  CurrencyRupeeIcon,
  ChartBarIcon,
  ArrowRightIcon,
  MapPinIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import apiClient from '@/lib/api/client';
import type { StateData } from '@/data/budgetData';

const departments = [
  {
    id: 'pwd',
    name: 'Public Works Department',
    allocated: 245.5,
    spent: 198.3,
    projects: 12,
    icon: '🏗️'
  },
  {
    id: 'health',
    name: 'Health & Family Welfare',
    allocated: 180.2,
    spent: 156.8,
    projects: 8,
    icon: '🏥'
  },
  {
    id: 'education',
    name: 'Education Department',
    allocated: 320.8,
    spent: 287.5,
    projects: 15,
    icon: '🎓'
  },
  {
    id: 'agriculture',
    name: 'Agriculture & Rural Development',
    allocated: 150.3,
    spent: 142.1,
    projects: 9,
    icon: '🌾'
  },
];

export default function SelectDepartmentPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [states, setStates] = useState<StateData[]>([]);
  const [selectedState, setSelectedState] = useState<StateData | null>(null);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    
    // Fetch states from API
    async function fetchStates() {
      try {
        const statesRes = await apiClient.getBudgetStates();
        const convertedStates: StateData[] = statesRes.states.map(state => ({
          id: state.id,
          name: state.name,
          allocated: state.allocated,
          spent: state.spent,
          districts: []
        }));
        setStates(convertedStates);
      } catch (error) {
        console.error('Failed to fetch states:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchStates();
  }, [router]);

  const handleStateSelect = async (state: StateData) => {
    try {
      // Fetch state details with districts
      const stateDetail = await apiClient.getBudgetStateDetail(state.id);
      
      const fullState: StateData = {
        id: stateDetail.id,
        name: stateDetail.name,
        allocated: stateDetail.allocated,
        spent: stateDetail.spent,
        districts: stateDetail.districts.map(d => ({
          id: d.id,
          name: d.name,
          allocated: d.allocated,
          spent: d.spent
        }))
      };
      
      setSelectedState(fullState);
      setSelectedDistrictId(null);
      setSelectedDepartment('');
    } catch (error) {
      console.error('Failed to fetch state details:', error);
    }
  };

  const handleDistrictSelect = (districtId: string) => {
    setSelectedDistrictId(districtId);
    setSelectedDepartment('');
  };

  const handleProceed = () => {
    if (!selectedState || !selectedDistrictId || !selectedDepartment) {
      alert('Please select state, district, and department from the map');
      return;
    }

    const dept = departments.find(d => d.id === selectedDepartment);
    const district = selectedState.districts.find(d => d.id === selectedDistrictId);
    
    // Store selection in localStorage
    localStorage.setItem('selectedDepartment', JSON.stringify({
      state: selectedState.name,
      stateId: selectedState.id,
      district: district?.name,
      districtId: selectedDistrictId,
      department: dept
    }));

    router.push('/select-contractor');
  };

  if (!user || loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const selectedDept = departments.find(d => d.id === selectedDepartment);
  const selectedDistrict = selectedState?.districts.find(d => d.id === selectedDistrictId);

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
            Select Location & Department
          </h1>
          <p className="text-gray-400">
            Welcome, <span className="text-amber-400 font-semibold">{user.role}</span> • Click on a state on the map below
          </p>
        </motion.div>

        {/* Selection Progress Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 ${selectedState ? 'text-green-400' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  selectedState ? 'bg-green-500/20' : 'bg-gray-500/20'
                }`}>
                  {selectedState ? '✓' : '1'}
                </div>
                <span className="font-bold">State: {selectedState?.name || 'Not selected'}</span>
              </div>
              <ArrowRightIcon className="w-5 h-5 text-gray-500" />
              <div className={`flex items-center gap-2 ${selectedDistrictId ? 'text-green-400' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  selectedDistrictId ? 'bg-green-500/20' : 'bg-gray-500/20'
                }`}>
                  {selectedDistrictId ? '✓' : '2'}
                </div>
                <span className="font-bold">District: {selectedDistrict?.name || 'Not selected'}</span>
              </div>
              <ArrowRightIcon className="w-5 h-5 text-gray-500" />
              <div className={`flex items-center gap-2 ${selectedDepartment ? 'text-green-400' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  selectedDepartment ? 'bg-green-500/20' : 'bg-gray-500/20'
                }`}>
                  {selectedDepartment ? '✓' : '3'}
                </div>
                <span className="font-bold">Department: {selectedDept?.name || 'Not selected'}</span>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* India Map */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <MapPinIcon className="w-7 h-7 text-amber-400" />
                    India Budget Map
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Click on a state to see districts
                  </p>
                </div>
                <div className="glass-card px-3 py-2 text-xs text-amber-300 font-bold bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl">
                  {states.length} States/UTs
                </div>
              </div>
              <IndiaMap
                states={states}
                onStateSelect={handleStateSelect}
                selectedStateId={selectedState?.id}
              />
            </motion.div>
          </div>

          {/* State/District Panel or Department Selection */}
          <div className="lg:col-span-1">
            {selectedState ? (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white">{selectedState.name}</h3>
                  <button
                    onClick={() => {
                      setSelectedState(null);
                      setSelectedDistrictId(null);
                      setSelectedDepartment('');
                    }}
                    className="text-sm text-gray-400 hover:text-white"
                  >
                    ✕ Clear
                  </button>
                </div>

                {/* Districts */}
                <div className="mb-6">
                  <h4 className="text-sm font-bold text-gray-400 uppercase mb-3">Select District</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedState.districts.map((district) => (
                      <button
                        key={district.id}
                        onClick={() => handleDistrictSelect(district.id)}
                        className={`w-full p-4 rounded-xl text-left transition-all ${
                          selectedDistrictId === district.id
                            ? 'bg-amber-500/20 border-2 border-amber-400'
                            : 'bg-white/5 border border-white/10 hover:border-white/30'
                        }`}
                      >
                        <div className="font-bold text-white mb-1">{district.name}</div>
                        <div className="text-xs text-gray-400">
                          ₹{district.allocated.toFixed(1)} Cr allocated
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Departments */}
                {selectedDistrictId && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <h4 className="text-sm font-bold text-gray-400 uppercase mb-3">Select Department</h4>
                    <div className="space-y-2">
                      {departments.map((dept) => (
                        <button
                          key={dept.id}
                          onClick={() => setSelectedDepartment(dept.id)}
                          className={`w-full p-4 rounded-xl text-left transition-all ${
                            selectedDepartment === dept.id
                              ? 'bg-green-500/20 border-2 border-green-400'
                              : 'bg-white/5 border border-white/10 hover:border-white/30'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-2xl">{dept.icon}</span>
                            <span className="font-bold text-white text-sm">{dept.name}</span>
                          </div>
                          <div className="text-xs text-gray-400">
                            {dept.projects} active projects
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 h-full flex items-center justify-center"
              >
                <div className="text-center text-gray-400">
                  <MapPinIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="font-bold mb-2">No State Selected</p>
                  <p className="text-sm">Click on a state on the map to begin</p>
                </div>
              </motion.div>
            )}
          </div>
        </div>


        {/* Department Details & Proceed Button */}
        {selectedDept && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-400/30 rounded-2xl p-6"
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-black text-white mb-2">
                  <span className="text-3xl mr-2">{selectedDept.icon}</span>
                  {selectedDept.name}
                </h2>
                <p className="text-gray-400">
                  {selectedState?.name} → {selectedDistrict?.name}
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-gray-400 text-sm mb-1">Allocated</p>
                <p className="text-2xl font-black text-amber-400">
                  ₹{selectedDept.allocated} Cr
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-gray-400 text-sm mb-1">Spent</p>
                <p className="text-2xl font-black text-green-400">
                  ₹{selectedDept.spent} Cr
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-gray-400 text-sm mb-1">Utilization</p>
                <p className="text-2xl font-black text-blue-400">
                  {((selectedDept.spent / selectedDept.allocated) * 100).toFixed(1)}%
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-gray-400 text-sm mb-1">Active Projects</p>
                <p className="text-2xl font-black text-purple-400">
                  {selectedDept.projects}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => router.push('/financial-timeline')}
                className="py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
              >
                <CalendarIcon className="w-5 h-5" />
                View Financial Timeline
              </button>
              
              <button
                onClick={handleProceed}
                className="py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all duration-300 shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
              >
                Proceed to Contractor Selection
                <ArrowRightIcon className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
