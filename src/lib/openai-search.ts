import OpenAI from 'openai';
import { OpenAISearchResponse, SearchResult } from './types';

class OpenAISearchClient {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
    });
  }

  async search(
    query: string,
    options: {
      searchContextSize?: 'low' | 'medium' | 'high';
      maxResults?: number;
      userLocation?: {
        country?: string;
        city?: string;
        region?: string;
        timezone?: string;
      };
    } = {}
  ): Promise<OpenAISearchResponse> {
    const {
      searchContextSize = 'medium',
      userLocation,
    } = options;

    try {
      const completion = await this.client.chat.completions.create({
        model: "gpt-4o-search-preview",
        web_search_options: {
          search_context_size: searchContextSize,
          ...(userLocation && {
            user_location: {
              type: "approximate",
              approximate: userLocation,
            },
          }),
        },
        messages: [{
          role: "user",
          content: `Please provide comprehensive research on: ${query}

Please include:
1. Key findings and insights
2. Recent developments
3. Important facts and statistics
4. Relevant examples or case studies
5. Expert opinions or analysis

Format your response in a structured way with clear sections.`,
        }],
      });

      const response = completion.choices[0];
      const content = response.message.content || '';
      const annotations = response.message.annotations || [];

      // Extract sources from annotations
      const sources: SearchResult[] = annotations
        .filter(annotation => annotation.type === 'url_citation')
        .map((annotation: any, index) => ({
          title: annotation.url_citation?.title || `Source ${index + 1}`,
          url: annotation.url_citation?.url || '',
          content: content.substring(
            annotation.url_citation?.start_index || 0,
            annotation.url_citation?.end_index || content.length
          ),
          score: 1.0 - (index * 0.1), // Assign decreasing scores
          publishedDate: undefined,
        }));

      return {
        query,
        answer: content,
        sources,
        response_time: 0, // OpenAI doesn't provide response time
      };
    } catch (error) {
      console.error('OpenAI search error:', error);
      throw new Error(`Failed to search: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async searchWithRetry(
    query: string,
    options: Parameters<typeof this.search>[1] = {},
    maxRetries = 3
  ): Promise<OpenAISearchResponse> {
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

  processResults(openaiResponse: OpenAISearchResponse): SearchResult[] {
    return openaiResponse.sources;
  }

  async generateComprehensiveAnalysis(prompt: string): Promise<string> {
    try {
      const completion = await this.client.chat.completions.create({
        model: "gpt-4o",
        messages: [{
          role: "user",
          content: prompt
        }],
        temperature: 0.7,
        max_tokens: 4000
      });

      return completion.choices[0]?.message?.content || 'No analysis generated';
    } catch (error) {
      console.error('Error generating comprehensive analysis:', error);
      throw new Error('Failed to generate comprehensive analysis');
    }
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

export function createOpenAISearchClient(): OpenAISearchClient {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }

  return new OpenAISearchClient(apiKey);
}

export default OpenAISearchClient;
