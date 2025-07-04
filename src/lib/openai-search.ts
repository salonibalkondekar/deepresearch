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
        .map((annotation: {
          type: string;
          url_citation?: {
            title?: string;
            url?: string;
            start_index?: number;
            end_index?: number;
          };
        }, index) => ({
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

  async generateResearchSteps(researchTopic: string): Promise<Array<{title: string, description: string, priority: 'high' | 'medium' | 'low', estimatedDuration: string}>> {
    try {
      const prompt = `You are a research planning expert. Given a research topic, you need to create a dynamic, intelligent research plan with 3-10 steps based on the complexity and nature of the topic.

RESEARCH TOPIC: ${researchTopic}

Please analyze this research topic and create a comprehensive research plan. Consider:
- The complexity and scope of the topic
- The type of research needed (market research, technical analysis, comparative study, etc.)
- The logical flow of information gathering
- What specific aspects need to be investigated

Return a JSON array of research steps with the following structure:
[
  {
    "title": "Step title (concise, actionable)",
    "description": "Detailed description of what to research in this step",
    "priority": "high|medium|low",
    "estimatedDuration": "estimated time like '1-2 hours', '30 minutes', etc."
  }
]

Guidelines:
- Create 3-10 steps based on topic complexity
- Each step should build logically on previous steps
- Steps should be specific and actionable
- Avoid generic steps like "Research background" - be specific about what aspect to research
- Consider the audience and purpose of the research
- Include steps for validation, expert opinions, and current trends when relevant
- For technical topics, include implementation and adoption aspects
- For market research, include competitor analysis and market sizing
- For comparative research, include pros/cons and use cases

Return ONLY the JSON array, no additional text.`;

      const completion = await this.client.chat.completions.create({
        model: "gpt-4o",
        messages: [{
          role: "user",
          content: prompt
        }],
        temperature: 0.3,
        max_tokens: 2000
      });

      const response = completion.choices[0]?.message?.content || '';
      console.log('Raw OpenAI response:', response);
      
      // Clean the response by removing markdown code blocks and other formatting
      let cleanedResponse = response.trim();
      
      // Remove markdown code blocks (```json...``` or ```...```)
      if (cleanedResponse.includes('```')) {
        // More robust markdown removal
        const codeBlockRegex = /```(?:json)?\s*\n?([\s\S]*?)\n?```/;
        const match = cleanedResponse.match(codeBlockRegex);
        if (match && match[1]) {
          cleanedResponse = match[1].trim();
        } else {
          // Fallback: remove all ``` occurrences
          cleanedResponse = cleanedResponse.replace(/```[a-z]*\n?/g, '').replace(/```/g, '').trim();
        }
      }
      
      // Remove any leading/trailing text that's not JSON
      // Look for the first [ or { and last ] or }
      const firstBracket = Math.min(
        cleanedResponse.indexOf('[') !== -1 ? cleanedResponse.indexOf('[') : Infinity,
        cleanedResponse.indexOf('{') !== -1 ? cleanedResponse.indexOf('{') : Infinity
      );
      const lastBracket = Math.max(
        cleanedResponse.lastIndexOf(']'),
        cleanedResponse.lastIndexOf('}')
      );
      
      if (firstBracket !== Infinity && lastBracket !== -1 && firstBracket <= lastBracket) {
        cleanedResponse = cleanedResponse.substring(firstBracket, lastBracket + 1);
      }
      
      console.log('Cleaned response:', cleanedResponse);
      
      try {
        // Parse the cleaned JSON response
        const steps = JSON.parse(cleanedResponse);
        
        // Validate the structure
        if (!Array.isArray(steps)) {
          throw new Error('Response is not an array');
        }
        
        // Validate each step has required fields
        for (const step of steps) {
          if (!step.title || !step.description || !step.priority || !step.estimatedDuration) {
            throw new Error('Step missing required fields');
          }
        }
        
        return steps;
      } catch (parseError) {
        console.error('Error parsing research steps JSON:', parseError);
        console.error('Raw response:', response);
        console.error('Cleaned response:', cleanedResponse);
        throw new Error(`Failed to parse research steps from AI response: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`);
      }
    } catch (error) {
      console.error('Error generating research steps:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to generate research steps: ${error.message}`);
      } else {
        throw new Error('Failed to generate research steps: Unknown error occurred');
      }
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
  
  // Validate API key format
  if (!apiKey.startsWith('sk-')) {
    throw new Error('Invalid OpenAI API key format. API key should start with "sk-"');
  }
  
  console.log('Creating OpenAI client with API key:', apiKey.substring(0, 20) + '...');
  return new OpenAISearchClient(apiKey);
}

// Test function to validate OpenAI connectivity
export async function testOpenAIConnectivity(): Promise<boolean> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return false;
    }
    
    const client = new OpenAI({ apiKey });
    // Try a simple API call to test connectivity
    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: "Hello" }],
      max_tokens: 5
    });
    
    return completion.choices?.[0]?.message?.content != null;
  } catch (error) {
    console.error('OpenAI connectivity test failed:', error);
    return false;
  }
}

export default OpenAISearchClient;
