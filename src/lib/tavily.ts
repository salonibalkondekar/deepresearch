import { TavilySearchResponse, SearchResult } from './types';

class TavilyClient {
  private apiKey: string;
  private baseUrl = 'https://api.tavily.com';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async search(
    query: string,
    options: {
      searchDepth?: 'basic' | 'advanced';
      includeAnswer?: boolean;
      includeImages?: boolean;
      includeDomains?: string[];
      excludeDomains?: string[];
      maxResults?: number;
    } = {}
  ): Promise<TavilySearchResponse> {
    const {
      searchDepth = 'basic',
      includeAnswer = true,
      includeImages = false,
      maxResults = 5,
      includeDomains,
      excludeDomains,
    } = options;

    try {
      const response = await fetch(`${this.baseUrl}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          query,
          search_depth: searchDepth,
          include_answer: includeAnswer,
          include_images: includeImages,
          include_domains: includeDomains,
          exclude_domains: excludeDomains,
          max_results: maxResults,
        }),
      });

      if (!response.ok) {
        throw new Error(`Tavily API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Tavily search error:', error);
      throw new Error(`Failed to search: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async searchWithRetry(
    query: string,
    options: Parameters<typeof this.search>[1] = {},
    maxRetries = 3
  ): Promise<TavilySearchResponse> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.search(query, options);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt === maxRetries) {
          break;
        }

        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  optimizeQuery(step: string, context?: string): string {
    // Basic query optimization based on the research step
    let query = step;

    // Add context if available
    if (context) {
      query = `${step} ${context}`;
    }

    // Remove common filler words and optimize for search
    query = query
      .replace(/\b(how to|what is|explain|research|find|about)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Ensure minimum query length
    if (query.length < 3) {
      query = step;
    }

    return query;
  }

  processResults(tavilyResponse: TavilySearchResponse): SearchResult[] {
    return tavilyResponse.results.map(result => ({
      title: result.title,
      url: result.url,
      content: result.content,
      score: result.score,
      publishedDate: result.published_date,
    }));
  }
}

// Rate limiting utility
class RateLimiter {
  private requests: number[] = [];
  private maxRequests: number;
  private timeWindow: number;

  constructor(maxRequests: number = 10, timeWindowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindowMs;
  }

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    
    // Remove old requests outside the time window
    this.requests = this.requests.filter(time => now - time < this.timeWindow);

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.timeWindow - (now - oldestRequest);
      
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    this.requests.push(now);
  }
}

export const rateLimiter = new RateLimiter();

export function createTavilyClient(): TavilyClient {
  const apiKey = process.env.TAVILY_API_KEY;
  
  if (!apiKey) {
    throw new Error('TAVILY_API_KEY environment variable is required');
  }

  return new TavilyClient(apiKey);
}

export default TavilyClient;
