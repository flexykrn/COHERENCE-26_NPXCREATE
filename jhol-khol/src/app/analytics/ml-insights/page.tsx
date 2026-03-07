// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import type { MLModelStatsResponse } from '@/lib/api/types';
import {
  CpuChipIcon,
  ChartBarIcon,
  BeakerIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

export default function MLInsightsPage() {
  const [data, setData] = useState<MLModelStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getMLModelStats();
      setData(response);
    } catch (error) {
      console.error('Failed to fetch ML insights:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Loading ML model insights...</p>
        </div>
      </div>
    );
  }

  const featureData = data?.feature_importance.map(f => ({
    name: f.feature.replace(/_/g, ' '),
    importance: f.importance,
    direction: f.direction,
  })) || [];

  const confusionMatrix = data?.validation_metrics.confusion_matrix;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 bg-clip-text text-transparent mb-2">
            Machine Learning Insights
          </h1>
          <p className="text-gray-600 text-lg">
            Pure Python Logistic Regression - Lapse Risk Prediction Model
          </p>
        </div>

        {/* Model Info Banner */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-start gap-4">
            <CpuChipIcon className="h-12 w-12 flex-shrink-0" />
            <div className="flex-1">
              <h2 className="text-2xl font-black mb-2">{data?.model_info.type}</h2>
              <p className="text-purple-100 mb-3">{data?.model_info.implementation}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-purple-200">Training Years</p>
                  <p className="font-bold">{data?.model_info.training_years.join(', ')}</p>
                </div>
                <div>
                  <p className="text-purple-200">Prediction Year</p>
                  <p className="font-bold">{data?.model_info.prediction_year}</p>
                </div>
                <div>
                  <p className="text-purple-200">Epochs</p>
                  <p className="font-bold">{data?.model_info.epochs}</p>
                </div>
                <div>
                  <p className="text-purple-200">Learning Rate</p>
                  <p className="font-bold">{data?.model_info.learning_rate}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-green-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center">
                <CheckCircleIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Validation Accuracy</p>
                <p className="text-3xl font-black text-green-600">
                  {data?.validation_metrics.accuracy_pct}%
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500">Model performance on unseen data</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-blue-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center">
                <ChartBarIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Precision</p>
                <p className="text-3xl font-black text-blue-600">
                  {data?.validation_metrics.precision_pct}%
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500">Correct positive predictions</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-purple-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center">
                <BeakerIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Recall</p>
                <p className="text-3xl font-black text-purple-600">
                  {data?.validation_metrics.recall_pct}%
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500">Detected actual lapses</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-orange-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center">
                <ChartBarIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">F1 Score</p>
                <p className="text-3xl font-black text-orange-600">
                  {(data?.validation_metrics.f1_score || 0).toFixed(2)}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500">Harmonic mean of P & R</p>
          </div>
        </div>

        {/* Dataset Info */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-amber-100 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <InformationCircleIcon className="h-6 w-6 text-amber-600" />
            Dataset Information
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <p className="text-xs text-blue-700 font-semibold mb-1">Total Samples</p>
              <p className="text-2xl font-black text-blue-900">{data?.dataset_info.total_labelled_samples}</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
              <p className="text-xs text-green-700 font-semibold mb-1">Training Set</p>
              <p className="text-2xl font-black text-green-900">{data?.dataset_info.train_samples}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
              <p className="text-xs text-purple-700 font-semibold mb-1">Validation Set</p>
              <p className="text-2xl font-black text-purple-900">{data?.dataset_info.validation_samples}</p>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
              <p className="text-xs text-orange-700 font-semibold mb-1">Split Method</p>
              <p className="text-sm font-bold text-orange-900">80/20</p>
            </div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5" />
              <p className="text-sm text-yellow-800">{data?.dataset_info.warning}</p>
            </div>
          </div>
        </div>

        {/* Confusion Matrix */}
        {confusionMatrix && (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-amber-100 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Confusion Matrix (Validation Set)</h2>
            <p className="text-sm text-gray-600 mb-6">{confusionMatrix.interpretation}</p>
            
            <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
              {/* True Positives */}
              <div className="bg-gradient-to-br from-green-100 to-green-200 rounded-xl p-6 border-2 border-green-300 shadow-lg">
                <div className="text-center">
                  <p className="text-sm font-semibold text-green-700 mb-2">True Positives (TP)</p>
                  <p className="text-5xl font-black text-green-900">{confusionMatrix.TP}</p>
                  <p className="text-xs text-green-600 mt-2">Correctly flagged lapse</p>
                </div>
              </div>

              {/* False Positives */}
              <div className="bg-gradient-to-br from-red-100 to-red-200 rounded-xl p-6 border-2 border-red-300 shadow-lg">
                <div className="text-center">
                  <p className="text-sm font-semibold text-red-700 mb-2">False Positives (FP)</p>
                  <p className="text-5xl font-black text-red-900">{confusionMatrix.FP}</p>
                  <p className="text-xs text-red-600 mt-2">False alarm</p>
                </div>
              </div>

              {/* False Negatives */}
              <div className="bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl p-6 border-2 border-orange-300 shadow-lg">
                <div className="text-center">
                  <p className="text-sm font-semibold text-orange-700 mb-2">False Negatives (FN)</p>
                  <p className="text-5xl font-black text-orange-900">{confusionMatrix.FN}</p>
                  <p className="text-xs text-orange-600 mt-2">Missed lapse</p>
                </div>
              </div>

              {/* True Negatives */}
              <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl p-6 border-2 border-blue-300 shadow-lg">
                <div className="text-center">
                  <p className="text-sm font-semibold text-blue-700 mb-2">True Negatives (TN)</p>
                  <p className="text-5xl font-black text-blue-900">{confusionMatrix.TN}</p>
                  <p className="text-xs text-blue-600 mt-2">Correctly identified safe</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Feature Importance Chart */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-amber-100 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Feature Importance</h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={featureData} layout="vertical" margin={{ left: 120, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" stroke="#666" />
              <YAxis dataKey="name" type="category" stroke="#666" width={110} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #e0e0e0', borderRadius: '8px' }}
              />
              <Bar dataKey="importance" radius={[0, 8, 8, 0]}>
                {featureData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.direction === 'reduces risk' ? '#10b981' : '#f59e0b'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {data?.feature_importance.map((feature, index) => (
              <div key={index} className={`p-4 rounded-lg border ${
                feature.direction === 'reduces risk' 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-orange-50 border-orange-200'
              }`}>
                <div className="flex justify-between items-center">
                  <p className="font-semibold text-gray-900">{feature.feature.replace(/_/g, ' ')}</p>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    feature.direction === 'reduces risk'
                      ? 'bg-green-200 text-green-800'
                      : 'bg-orange-200 text-orange-800'
                  }`}>
                    {feature.direction}
                  </span>
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  <span className="font-semibold">Weight:</span> {feature.weight.toFixed(4)} | 
                  <span className="font-semibold"> Importance:</span> {feature.importance.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Prediction Summary */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-amber-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Prediction Summary (FY{data?.model_info.prediction_year})</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
              <p className="text-sm text-blue-700 font-semibold mb-1">Total Departments</p>
              <p className="text-4xl font-black text-blue-900">{data?.prediction_summary.total_depts}</p>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-6 border border-red-200">
              <p className="text-sm text-red-700 font-semibold mb-1">High Lapse Risk</p>
              <p className="text-4xl font-black text-red-900">{data?.prediction_summary.high_lapse_risk}</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
              <p className="text-sm text-green-700 font-semibold mb-1">Safe Departments</p>
              <p className="text-4xl font-black text-green-900">{data?.prediction_summary.safe}</p>
            </div>
          </div>
          <div className="mt-6 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-4 border border-amber-200">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Average Lapse Probability:</span>{' '}
              <span className="text-xl font-black text-orange-600">
                {data?.prediction_summary.avg_lapse_prob_pct}%
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

