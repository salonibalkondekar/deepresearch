export interface ResearchMission {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'planning' | 'researching' | 'completed' | 'error';
  steps: ResearchStep[];
  results?: ResearchResults;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResearchStep {
  id: string;
  title: string;
  description: string;
  query?: string;
  status: 'pending' | 'executing' | 'completed' | 'error';
  priority?: 'high' | 'medium' | 'low';
  estimatedDuration?: string;
  results?: SearchResult[];
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  publishedDate?: string;
}

export interface TavilySearchResponse {
  query: string;
  follow_up_questions?: string[];
  answer: string;
  images: string[];
  results: {
    title: string;
    url: string;
    content: string;
    score: number;
    published_date?: string;
  }[];
  response_time: number;
}

export interface OpenAISearchResponse {
  query: string;
  answer: string;
  sources: SearchResult[];
  response_time: number;
}

export interface ResearchResults {
  summary: string;
  keyFindings: string[];
  sources: SearchResult[];
  recommendations?: string[];
  completedSteps: number;
  totalSteps: number;
  isGeneratingComprehensiveAnalysis?: boolean;
}

export interface AgentState {
  currentMission?: ResearchMission;
  isProcessing: boolean;
  error?: string;
  progress: number;
}
