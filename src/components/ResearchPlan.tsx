'use client';

import { ResearchMission } from '@/lib/types';

interface ResearchPlanProps {
  mission: ResearchMission;
  onExecute: () => void;
  onStartNew: () => void;
  isExecuting: boolean;
}

export default function ResearchPlan({ mission, onExecute, onStartNew, isExecuting }: ResearchPlanProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority?.toUpperCase()) {
      case 'HIGH':
        return 'bg-red-100 text-red-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      case 'LOW':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date: Date | string) => {
    try {
      // Convert string to Date if needed
      const dateObj = date instanceof Date ? date : new Date(date);
      
      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
        return 'Invalid date';
      }
      
      return new Intl.DateTimeFormat('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).format(dateObj);
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Date formatting error';
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{mission.title}</h1>
            <p className="text-gray-600">{mission.description}</p>
          </div>
          <button
            onClick={onStartNew}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            New Research Mission
          </button>
        </div>

        {/* Research Steps */}
        <div className="space-y-4 mb-8">
          {mission.steps.map((step, index) => (
            <div key={step.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center">
                  <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                    {index + 1}
                  </span>
                  <h3 className="text-lg font-semibold text-gray-900">{step.title}</h3>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(step.priority || 'medium')}`}>
                    {(step.priority || 'medium').toUpperCase()}
                  </span>
                  <span className="text-sm text-gray-500">{step.estimatedDuration || 'Variable'}</span>
                </div>
              </div>
              
              <div className="ml-11">
                <div className="mb-3">
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Description</h4>
                  <p className="text-sm text-gray-600">{step.description}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Expected Outcome</h4>
                  <p className="text-sm text-gray-600">
                    Comprehensive information and analysis related to this research step.
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Plan Generation Info */}
        <div className="border-t pt-4 mb-8">
          <p className="text-sm text-gray-500">
            Plan generated on {formatDate(mission.createdAt)}
          </p>
        </div>

        {/* Execute Button */}
        <div className="text-center">
          <button
            onClick={onExecute}
            disabled={isExecuting}
            className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExecuting ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Executing Research Plan...
              </div>
            ) : (
              <>
                🚀 Execute Research Plan with AI
              </>
            )}
          </button>
          <p className="text-sm text-gray-500 mt-2">
            This will automatically execute each step using web search
          </p>
        </div>
      </div>
    </div>
  );
}