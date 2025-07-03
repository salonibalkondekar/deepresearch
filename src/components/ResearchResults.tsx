'use client';

import { ResearchMission, SearchResult } from '@/lib/types';
import { useState, useEffect } from 'react';

interface ResearchResultsProps {
  mission: ResearchMission;
  onStartNew: () => void;
}

export default function ResearchResults({ mission, onStartNew }: ResearchResultsProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'findings' | 'sources'>('summary');
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Poll for comprehensive analysis completion
  useEffect(() => {
    const isGeneratingAnalysis = (mission.results as any)?.isGeneratingComprehensiveAnalysis;
    
    if (isGeneratingAnalysis) {
      const pollInterval = setInterval(async () => {
        try {
          setIsRefreshing(true);
          const response = await fetch(`/api/research/${mission.id}`);
          const data = await response.json();
          
          if (data.success && data.mission.results) {
            const stillGenerating = (data.mission.results as any)?.isGeneratingComprehensiveAnalysis;
            if (!stillGenerating) {
              // Comprehensive analysis is ready, trigger a refresh
              window.location.reload();
            }
          }
        } catch (error) {
          console.error('Error polling for analysis completion:', error);
        } finally {
          setIsRefreshing(false);
        }
      }, 3000); // Poll every 3 seconds

      return () => clearInterval(pollInterval);
    }
  }, [mission.id, mission.results]);

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

  const formatMarkdownToHtml = (text: string) => {
    return text
      // Headers
      .replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold text-gray-900 mt-6 mb-3">$1</h2>')
      .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold text-gray-800 mt-4 mb-2">$1</h3>')
      // Bold text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      // Lists
      .replace(/^- (.*$)/gm, '<li class="ml-4 mb-1">• $1</li>')
      // Paragraphs
      .replace(/\n\n/g, '</p><p class="mb-4">')
      .replace(/^/, '<p class="mb-4">')
      .replace(/$/, '</p>')
      // Clean up empty paragraphs
      .replace(/<p class="mb-4"><\/p>/g, '');
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
                onClick={() => setActiveTab(tab.id as any)}
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
                  {((results as any)?.isGeneratingComprehensiveAnalysis || isRefreshing) && (
                    <div className="flex items-center text-sm text-blue-600">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {isRefreshing ? 'Checking for updates...' : 'Generating analysis...'}
                    </div>
                  )}
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div 
                    className="prose prose-gray max-w-none text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: formatMarkdownToHtml(results.summary)
                    }}
                  />
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
