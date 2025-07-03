'use client';

import { ResearchMission, ResearchStep } from '@/lib/types';

interface ProgressTrackerProps {
  mission: ResearchMission;
  progress: number;
}

export default function ProgressTracker({ mission, progress }: ProgressTrackerProps) {
  const getStepIcon = (step: ResearchStep, index: number) => {
    if (step.status === 'completed') {
      return (
        <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      );
    } else if (step.status === 'executing') {
      return (
        <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
          <svg className="animate-spin w-5 h-5 text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      );
    } else if (step.status === 'error') {
      return (
        <div className="flex-shrink-0 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      );
    } else {
      return (
        <div className="flex-shrink-0 w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
          <span className="text-gray-600 text-sm font-medium">{index + 1}</span>
        </div>
      );
    }
  };

  const getStepStatus = (step: ResearchStep) => {
    switch (step.status) {
      case 'completed':
        return { text: 'Completed', color: 'text-green-600' };
      case 'executing':
        return { text: 'In Progress', color: 'text-blue-600' };
      case 'error':
        return { text: 'Failed', color: 'text-red-600' };
      default:
        return { text: 'Pending', color: 'text-gray-500' };
    }
  };

  const formatDuration = (startTime?: Date | string, endTime?: Date | string) => {
    if (!startTime) return '';
    const start = startTime instanceof Date ? startTime : new Date(startTime);
    const end = endTime ? (endTime instanceof Date ? endTime : new Date(endTime)) : new Date();
    const duration = Math.round((end.getTime() - start.getTime()) / 1000);
    
    if (duration < 60) {
      return `${duration}s`;
    } else {
      return `${Math.round(duration / 60)}m`;
    }
  };

  const getMissionStatusColor = () => {
    switch (mission.status) {
      case 'completed':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'researching':
        return 'bg-blue-500';
      case 'planning':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getMissionStatusText = () => {
    switch (mission.status) {
      case 'planning':
        return 'Planning Research Steps';
      case 'researching':
        return 'Conducting Research';
      case 'completed':
        return 'Research Completed';
      case 'error':
        return 'Research Failed';
      default:
        return 'Pending';
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
        {/* Mission Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-gray-900">{mission.title}</h2>
            <span className={`px-3 py-1 rounded-full text-white text-sm font-medium ${getMissionStatusColor()}`}>
              {getMissionStatusText()}
            </span>
          </div>
          <p className="text-gray-600 text-sm">{mission.description}</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Overall Progress</span>
            <span className="text-sm font-medium text-gray-700">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${Math.min(progress, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Steps List */}
        {mission.steps.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Research Steps</h3>
            
            <div className="space-y-3">
              {mission.steps.map((step, index) => {
                const status = getStepStatus(step);
                
                return (
                  <div 
                    key={step.id}
                    className={`flex items-start space-x-3 p-4 rounded-lg border transition-all duration-200 ${
                      step.status === 'executing' 
                        ? 'border-blue-200 bg-blue-50' 
                        : step.status === 'completed'
                        ? 'border-green-200 bg-green-50'
                        : step.status === 'error'
                        ? 'border-red-200 bg-red-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    {getStepIcon(step, index)}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900">{step.title}</h4>
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs font-medium ${status.color}`}>
                            {status.text}
                          </span>
                          {step.startedAt && (
                            <span className="text-xs text-gray-500">
                              {formatDuration(step.startedAt, step.completedAt)}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                      
                      {step.query && (
                        <div className="mt-2 text-xs text-gray-500">
                          <span className="font-medium">Search Query:</span> {step.query}
                        </div>
                      )}
                      
                      {step.error && (
                        <div className="mt-2 text-xs text-red-600 bg-red-100 p-2 rounded">
                          <span className="font-medium">Error:</span> {step.error}
                        </div>
                      )}
                      
                      {step.results && step.results.length > 0 && (
                        <div className="mt-2 text-xs text-gray-500">
                          Found {step.results.length} relevant sources
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Mission Stats */}
        {mission.steps.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {mission.steps.filter(s => s.status === 'completed').length}
                </div>
                <div className="text-sm text-gray-500">Completed</div>
              </div>
              
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {mission.steps.length}
                </div>
                <div className="text-sm text-gray-500">Total Steps</div>
              </div>
              
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {mission.results?.sources?.length || 0}
                </div>
                <div className="text-sm text-gray-500">Sources Found</div>
              </div>
              
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {mission.steps.filter(s => s.status === 'error').length}
                </div>
                <div className="text-sm text-gray-500">Failed</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
