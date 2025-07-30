'use client';

import { ResearchMission, ResearchResults as ResearchResultsType } from '@/lib/types';
import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Components } from 'react-markdown';

interface ResearchResultsProps {
  mission: ResearchMission;
  onStartNew: () => void;
  onMissionUpdate?: (updatedMission: ResearchMission) => void;
}

export default function ResearchResults({ mission, onStartNew, onMissionUpdate }: ResearchResultsProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'findings' | 'sources'>('summary');
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<string>('Starting analysis...');

  // Poll for comprehensive analysis completion
  useEffect(() => {
    const isGeneratingAnalysis = (mission.results as ResearchResultsType)?.isGeneratingComprehensiveAnalysis;
    
    if (isGeneratingAnalysis) {
      let pollCount = 0;
      const progressMessages = [
        'Starting comprehensive analysis...',
        'Analyzing research findings...',
        'Processing key insights...',
        'Generating recommendations...',
        'Finalizing comprehensive report...'
      ];

      const pollInterval = setInterval(async () => {
        try {
          setIsRefreshing(true);
          
          // Update progress message
          setAnalysisProgress(progressMessages[Math.min(pollCount, progressMessages.length - 1)]);
          pollCount++;

          const response = await fetch(`/deepresearch/api/research/${mission.id}`);
          const data = await response.json();
          
          if (data.success && data.mission.results) {
            const stillGenerating = (data.mission.results as ResearchResultsType)?.isGeneratingComprehensiveAnalysis;
            if (!stillGenerating) {
              // Comprehensive analysis is ready, update the mission state
              setAnalysisProgress('Analysis complete!');
              if (onMissionUpdate) {
                onMissionUpdate(data.mission);
              }
              clearInterval(pollInterval);
            }
          }
        } catch (error) {
          console.error('Error polling for analysis completion:', error);
          setAnalysisProgress('Error during analysis. Retrying...');
        } finally {
          setIsRefreshing(false);
        }
      }, 4000); // Poll every 4 seconds

      return () => clearInterval(pollInterval);
    }
  }, [mission.id, mission.results, onMissionUpdate]);

  if (!mission.results) {
    return null;
  }

  const { results } = mission;

  const toggleSourceExpansion = (url: string) => {
    const newExpanded = new Set(expandedSources);
    if (newExpanded.has(url)) {
      newExpanded.delete(url);
    } else {
      newExpanded.add(url);
    }
    setExpandedSources(newExpanded);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Date unknown';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Date unknown';
    }
  };

  const getDomainFromUrl = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 bg-green-100';
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getCompletionRate = () => {
    return Math.round((results.completedSteps / results.totalSteps) * 100);
  };

  const markdownComponents: Components = {
    h2: ({ ...props }) => (
      <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3" {...props} />
    ),
    h3: ({ ...props }) => (
      <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2" {...props} />
    ),
    h4: ({ ...props }) => (
      <h4 className="text-base font-semibold text-gray-800 mt-3 mb-2" {...props} />
    ),
    p: ({ ...props }) => (
      <p className="mb-4 text-gray-700 leading-relaxed" {...props} />
    ),
    ul: ({ ...props }) => (
      <ul className="mb-4 space-y-1" {...props} />
    ),
    ol: ({ ...props }) => (
      <ol className="mb-4 space-y-1 list-decimal list-inside" {...props} />
    ),
    li: ({ ...props }) => (
      <li className="ml-4 text-gray-700" {...props} />
    ),
    strong: ({ ...props }) => (
      <strong className="font-semibold text-gray-900" {...props} />
    ),
    em: ({ ...props }) => (
      <em className="italic text-gray-700" {...props} />
    ),
    blockquote: ({ ...props }) => (
      <blockquote className="border-l-4 border-blue-500 pl-4 my-4 italic text-gray-600" {...props} />
    ),
    code: (props) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { inline, className, children, ...rest } = props as any;
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <SyntaxHighlighter
          style={tomorrow}
          language={match[1]}
          PreTag="div"
          className="rounded-md my-4"
          {...rest}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono text-gray-800" {...rest}>
          {children}
        </code>
      );
    },
    table: ({ ...props }) => (
      <div className="overflow-x-auto my-4">
        <table className="min-w-full divide-y divide-gray-200" {...props} />
      </div>
    ),
    thead: ({ ...props }) => (
      <thead className="bg-gray-50" {...props} />
    ),
    tbody: ({ ...props }) => (
      <tbody className="bg-white divide-y divide-gray-200" {...props} />
    ),
    th: ({ ...props }) => (
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" {...props} />
    ),
    td: ({ ...props }) => (
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" {...props} />
    ),
    a: ({ ...props }) => (
      <a className="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer" {...props} />
    ),
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">{mission.title}</h1>
              <p className="text-blue-100 mb-4">{mission.description}</p>
              
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {results.completedSteps}/{results.totalSteps} Steps Completed
                </div>
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  {results.sources.length} Sources Found
                </div>
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {getCompletionRate()}% Success Rate
                </div>
              </div>
            </div>
            
            <div className="mt-4 md:mt-0">
              <button
                onClick={onStartNew}
                className="bg-white text-blue-600 px-6 py-3 rounded-lg font-medium hover:bg-blue-50 transition-colors"
              >
                Start New Research
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6 md:px-8">
            {[
              { id: 'summary', label: 'Summary', icon: '📋' },
              { id: 'findings', label: 'Key Findings', icon: '🔍' },
              { id: 'sources', label: 'Sources', icon: '📚' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'summary' | 'findings' | 'sources')}
                className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6 md:p-8">
          {activeTab === 'summary' && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Comprehensive Research Analysis</h2>
                  {((results as ResearchResultsType)?.isGeneratingComprehensiveAnalysis || isRefreshing) && (
                    <div className="flex items-center text-sm text-blue-600">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {analysisProgress}
                    </div>
                  )}
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="prose prose-gray max-w-none">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={markdownComponents}
                    >
                      {results.summary}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>

              {results.recommendations && results.recommendations.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Recommendations</h3>
                  <div className="bg-blue-50 rounded-lg p-6">
                    <ul className="space-y-2">
                      {results.recommendations.map((recommendation, index) => (
                        <li key={index} className="flex items-start">
                          <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-0.5">
                            {index + 1}
                          </span>
                          <span className="text-gray-700">{recommendation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'findings' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Key Findings</h2>
              {results.keyFindings.length > 0 ? (
                <div className="space-y-4">
                  {results.keyFindings.map((finding, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <span className="flex-shrink-0 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-4">
                          {index + 1}
                        </span>
                        <p className="text-gray-700 leading-relaxed">{finding}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0118 12a8 8 0 01-8 8 8 8 0 01-8-8 8 8 0 018-8c2.027 0 3.915.755 5.336 2H15v1.291z" />
                  </svg>
                  <p>No key findings extracted from this research.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'sources' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Research Sources ({results.sources.length})
              </h2>
              
              {results.sources.length > 0 ? (
                <div className="space-y-4">
                  {results.sources.map((source, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-medium text-gray-900 flex-1 mr-4">
                            <a 
                              href={source.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="hover:text-blue-600 transition-colors"
                            >
                              {source.title}
                            </a>
                          </h3>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreColor(source.score)}`}>
                              {Math.round(source.score * 100)}%
                            </span>
                            <button
                              onClick={() => toggleSourceExpansion(source.url)}
                              className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              <svg 
                                className={`w-5 h-5 transition-transform ${expandedSources.has(source.url) ? 'rotate-180' : ''}`}
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        
                        <div className="flex items-center text-sm text-gray-500 mb-3">
                          <span className="mr-4">
                            🌐 {getDomainFromUrl(source.url)}
                          </span>
                          {source.publishedDate && (
                            <span>📅 {formatDate(source.publishedDate)}</span>
                          )}
                        </div>
                        
                        <p className="text-gray-700 text-sm leading-relaxed">
                          {expandedSources.has(source.url) 
                            ? source.content 
                            : `${source.content.substring(0, 200)}${source.content.length > 200 ? '...' : ''}`
                          }
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0118 12a8 8 0 01-8 8 8 8 0 01-8-8 8 8 0 018-8c2.027 0 3.915.755 5.336 2H15v1.291z" />
                  </svg>
                  <p>No sources found for this research.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
