'use client';

import { useState, useEffect } from 'react';
import ResearchForm from '@/components/ResearchForm';
import ResearchPlan from '@/components/ResearchPlan';
import ProgressTracker from '@/components/ProgressTracker';
import ResearchResults from '@/components/ResearchResults';
import { ResearchMission } from '@/lib/types';

export default function Home() {
  const [currentMission, setCurrentMission] = useState<ResearchMission | null>(null);
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Poll for mission updates when processing
  useEffect(() => {
    if (!currentMission || !isProcessing) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/research/${currentMission.id}`);
        const data = await response.json();

        if (data.success) {
          setCurrentMission(data.mission);
          setProgress(data.progress || 0);
          setIsProcessing(data.isProcessing || false);
          setError(data.error || null);

          // If research is completed or failed, stop polling
          if (data.mission.status === 'completed' || data.mission.status === 'error') {
            setIsProcessing(false);
          }
        }
      } catch (error) {
        console.error('Failed to poll mission status:', error);
        setError('Failed to get mission status');
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [currentMission?.id, isProcessing, currentMission]);

  const handleStartResearch = async (title: string, description: string) => {
    try {
      setError(null);
      setIsProcessing(true);
      
      // Create mission and generate dynamic steps via API
      const response = await fetch('/api/research/plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          title, 
          description 
        }),
      });

      const data = await response.json();

      if (data.success) {
        setCurrentMission(data.mission);
      } else {
        throw new Error(data.error || 'Failed to create research plan');
      }
    } catch (error) {
      console.error('Failed to create research plan:', error);
      setError(error instanceof Error ? error.message : 'Failed to create research plan');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecuteResearch = async () => {
    if (!currentMission) return;
    
    try {
      setIsProcessing(true);
      setError(null);
      setProgress(0);

      const response = await fetch('/api/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          title: currentMission.title, 
          description: currentMission.description 
        }),
      });

      const data = await response.json();

      if (data.success) {
        setCurrentMission(data.mission);
      } else {
        throw new Error(data.error || 'Failed to execute research');
      }
    } catch (error) {
      console.error('Failed to execute research:', error);
      setError(error instanceof Error ? error.message : 'Failed to execute research');
      setIsProcessing(false);
    }
  };

  const handleStartNew = () => {
    setCurrentMission(null);
    setProgress(0);
    setIsProcessing(false);
    setError(null);
  };

  const handleCancelResearch = async () => {
    if (!currentMission) return;

    try {
      await fetch(`/api/research/${currentMission.id}`, {
        method: 'DELETE',
      });
      
      setIsProcessing(false);
      setError('Research cancelled');
    } catch (error) {
      console.error('Failed to cancel research:', error);
    }
  };

  return (
    <div className="min-h-screen bg-white py-16 px-4">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-12">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Research AI Agent
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
            Your intelligent research companion for comprehensive analysis and insights
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Research Error</h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-600"
                >
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Research Form - Show when no mission or mission completed */}
        {(!currentMission || currentMission.status === 'completed') && (
          <ResearchForm 
            onSubmit={handleStartResearch}
            isProcessing={isProcessing}
          />
        )}

        {/* Research Plan - Show when mission is in planning status */}
        {currentMission && currentMission.status === 'planning' && (
          <ResearchPlan 
            mission={currentMission}
            onExecute={handleExecuteResearch}
            onStartNew={handleStartNew}
            isExecuting={isProcessing}
          />
        )}

        {/* Progress Tracker - Show when mission is active (researching) */}
        {currentMission && (currentMission.status === 'researching' || isProcessing) && currentMission.status !== 'completed' && (
          <div className="space-y-4">
            <ProgressTracker 
              mission={currentMission}
              progress={progress}
            />
            
            {/* Cancel Button */}
            {isProcessing && (
              <div className="text-center">
                <button
                  onClick={handleCancelResearch}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Cancel Research
                </button>
              </div>
            )}
          </div>
        )}

        {/* Research Results - Show when mission is completed */}
        {currentMission && currentMission.status === 'completed' && (
          <ResearchResults 
            mission={currentMission}
            onStartNew={handleStartNew}
          />
        )}
      </div>

      {/* Footer */}
      <footer className="mt-16 text-center text-gray-500 text-sm">
        <p>
          Powered by OpenAI Web Search • Built with Next.js and TypeScript
        </p>
      </footer>
    </div>
  );
}
