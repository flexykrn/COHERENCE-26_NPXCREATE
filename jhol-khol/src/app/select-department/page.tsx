'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import { 
  MapPinIcon, 
  BuildingOfficeIcon,
  CurrencyRupeeIcon,
  ChartBarIcon,
  ArrowRightIcon 
} from '@heroicons/react/24/outline';

const states = [
  { id: 'mh', name: 'Maharashtra' },
  { id: 'ka', name: 'Karnataka' },
  { id: 'rj', name: 'Rajasthan' },
  { id: 'up', name: 'Uttar Pradesh' },
  { id: 'tn', name: 'Tamil Nadu' },
  { id: 'gj', name: 'Gujarat' },
];

const districtMap: Record<string, any[]> = {
  mh: [
    { id: 'mumbai', name: 'Mumbai' },
    { id: 'pune', name: 'Pune' },
    { id: 'nagpur', name: 'Nagpur' },
    { id: 'nashik', name: 'Nashik' }
  ],
  ka: [
    { id: 'bangalore', name: 'Bangalore' },
    { id: 'mysore', name: 'Mysore' }
  ],
  rj: [
    { id: 'jaipur', name: 'Jaipur' },
    { id: 'jodhpur', name: 'Jodhpur' }
  ],
};

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
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');

  useEffect(() => {
    // Check if user is logged in
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    
    // Pre-fill state if user has one
    if (parsedUser.state) {
      const stateId = states.find(s => s.name === parsedUser.state)?.id || '';
      setSelectedState(stateId);
    }
  }, [router]);

  const handleProceed = () => {
    if (!selectedState || !selectedDistrict || !selectedDepartment) {
      alert('Please select state, district, and department');
      return;
    }

    const dept = departments.find(d => d.id === selectedDepartment);
    
    // Store selection in localStorage
    localStorage.setItem('selectedDepartment', JSON.stringify({
      state: states.find(s => s.id === selectedState)?.name,
      district: districtMap[selectedState]?.find(d => d.id === selectedDistrict)?.name,
      department: dept
    }));

    router.push('/select-contractor');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const districts = selectedState ? (districtMap[selectedState] || []) : [];
  const selectedDept = departments.find(d => d.id === selectedDepartment);

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
            Select Department
          </h1>
          <p className="text-gray-400">
            Welcome, <span className="text-amber-400 font-semibold">{user.role}</span>
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Step 1: Select State */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                <MapPinIcon className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Step 1</h3>
                <p className="text-sm text-gray-400">Select State</p>
              </div>
            </div>

            <select
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setSelectedDistrict('');
              }}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-amber-400 focus:outline-none"
            >
              <option value="">Choose State</option>
              {states.map(state => (
                <option key={state.id} value={state.id} className="bg-gray-800">
                  {state.name}
                </option>
              ))}
            </select>
          </motion.div>

          {/* Step 2: Select District */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className={`bg-white/10 backdrop-blur-xl border rounded-2xl p-6 ${
              !selectedState ? 'opacity-50 border-white/10' : 'border-white/20'
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <BuildingOfficeIcon className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Step 2</h3>
                <p className="text-sm text-gray-400">Select District</p>
              </div>
            </div>

            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              disabled={!selectedState}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-blue-400 focus:outline-none disabled:opacity-50"
            >
              <option value="">Choose District</option>
              {districts.map(district => (
                <option key={district.id} value={district.id} className="bg-gray-800">
                  {district.name}
                </option>
              ))}
            </select>
          </motion.div>

          {/* Step 3: Select Department */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className={`bg-white/10 backdrop-blur-xl border rounded-2xl p-6 ${
              !selectedDistrict ? 'opacity-50 border-white/10' : 'border-white/20'
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                <CurrencyRupeeIcon className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Step 3</h3>
                <p className="text-sm text-gray-400">Select Department</p>
              </div>
            </div>

            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              disabled={!selectedDistrict}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-green-400 focus:outline-none disabled:opacity-50"
            >
              <option value="">Choose Department</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id} className="bg-gray-800">
                  {dept.icon} {dept.name}
                </option>
              ))}
            </select>
          </motion.div>
        </div>

        {/* Department Details */}
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
                  {states.find(s => s.id === selectedState)?.name} → {districts.find(d => d.id === selectedDistrict)?.name}
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

            <button
              onClick={handleProceed}
              className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all duration-300 shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
            >
              Proceed to Contractor Selection
              <ArrowRightIcon className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
