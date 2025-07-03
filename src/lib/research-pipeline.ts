import { ResearchMission, ResearchStep, SearchResult, ResearchResults } from './types';
import { createOpenAISearchClient, rateLimiter } from './openai-search';

export class ResearchPipeline {
  private searchClient;

  constructor() {
    this.searchClient = createOpenAISearchClient();
  }

  /**
   * Break down a research mission into logical steps using LLM
   */
  async planResearchSteps(mission: string): Promise<ResearchStep[]> {
    try {
      // Use LLM to generate dynamic research steps
      const aiSteps = await this.searchClient.generateResearchSteps(mission);
      
      // Convert AI-generated steps to ResearchStep objects
      const steps = aiSteps.map(aiStep => this.createStep(
        aiStep.title, 
        aiStep.description, 
        aiStep.priority, 
        aiStep.estimatedDuration
      ));
      
      return steps;
    } catch (error) {
      console.error('Error generating dynamic research steps:', error);
      console.error('Falling back to predefined steps for mission:', mission);
      
      // Fallback to basic steps if LLM fails
      return this.createFallbackSteps(mission);
    }
  }

  /**
   * Fallback method for creating basic steps when LLM fails
   */
  private createFallbackSteps(mission: string): ResearchStep[] {
    return [
      this.createStep('Foundation Research', `Research basic information and overview of ${mission}`, 'high', '1-2 hours'),
      this.createStep('Detailed Analysis', `Conduct detailed analysis of key aspects`, 'high', '2-3 hours'),
      this.createStep('Current Status', `Research current status and recent developments`, 'medium', '1 hour'),
      this.createStep('Expert Insights', `Gather expert opinions and insights`, 'medium', '1-2 hours'),
      this.createStep('Summary & Validation', `Validate findings and create summary`, 'high', '30 minutes')
    ];
  }

  private createStep(title: string, description: string, priority?: 'high' | 'medium' | 'low', estimatedDuration?: string): ResearchStep {
    return {
      id: this.generateId(),
      title,
      description,
      status: 'pending',
      priority,
      estimatedDuration,
    };
  }

  /**
   * Execute a single research step
   */
  async executeStep(step: ResearchStep, context?: string): Promise<ResearchStep> {
    try {
      step.status = 'executing';
      step.startedAt = new Date();

      // Rate limiting
      await rateLimiter.waitIfNeeded();

      // Optimize the search query
      const query = this.searchClient.optimizeQuery(step.description, context);
      step.query = query;

      // Perform the search
      const searchResponse = await this.searchClient.searchWithRetry(query, {
        searchContextSize: 'high',
        maxResults: 8,
      });

      // Process and store results
      step.results = this.searchClient.processResults(searchResponse);
      step.status = 'completed';
      step.completedAt = new Date();

      return step;
    } catch (error) {
      step.status = 'error';
      step.error = error instanceof Error ? error.message : 'Unknown error occurred';
      step.completedAt = new Date();
      
      throw error;
    }
  }

  /**
   * Execute all research steps in sequence
   */
  async executeResearchPlan(
    mission: ResearchMission,
    onStepComplete?: (step: ResearchStep, progress: number) => void
  ): Promise<ResearchMission> {
    let context = mission.description;

    for (let i = 0; i < mission.steps.length; i++) {
      const step = mission.steps[i];
      
      try {
        const completedStep = await this.executeStep(step, context);
        mission.steps[i] = completedStep;

        // Update context with findings from this step
        if (completedStep.results && completedStep.results.length > 0) {
          const stepSummary = this.summarizeStepResults(completedStep);
          context += ` ${stepSummary}`;
        }

        // Calculate progress
        const progress = ((i + 1) / mission.steps.length) * 100;
        
        // Notify about step completion
        if (onStepComplete) {
          onStepComplete(completedStep, progress);
        }

      } catch (error) {
        console.error(`Error executing step ${step.title}:`, error);
        // Continue with other steps even if one fails
      }
    }

    // Generate basic results immediately
    mission.results = await this.generateBasicResults(mission);
    mission.status = 'completed';
    mission.updatedAt = new Date();

    // Generate comprehensive summary in background
    this.generateComprehensiveSummaryAsync(mission);

    return mission;
  }

  /**
   * Summarize results from a single step
   */
  private summarizeStepResults(step: ResearchStep): string {
    if (!step.results || step.results.length === 0) {
      return '';
    }

    // Extract key information from the top results
    const topResults = step.results.slice(0, 3);
    const summary = topResults
      .map(result => result.content.substring(0, 200))
      .join(' ');

    return summary;
  }

  /**
   * Generate basic results immediately (fast)
   */
  private async generateBasicResults(mission: ResearchMission): Promise<ResearchResults> {
    const allResults: SearchResult[] = [];
    const completedSteps = mission.steps.filter(step => step.status === 'completed').length;

    // Collect all search results
    mission.steps.forEach(step => {
      if (step.results) {
        allResults.push(...step.results);
      }
    });

    // Remove duplicates based on URL
    const uniqueResults = this.removeDuplicateResults(allResults);

    // Generate key findings quickly
    const keyFindings = this.extractKeyFindings(mission.steps);

    // Generate basic summary (fast)
    const summary = this.generateBasicSummary(mission, keyFindings);

    // Generate recommendations
    const recommendations = this.generateRecommendations(mission.steps);

    return {
      summary,
      keyFindings,
      sources: uniqueResults.slice(0, 20), // Limit sources
      recommendations,
      completedSteps,
      totalSteps: mission.steps.length,
      isGeneratingComprehensiveAnalysis: true, // Flag to show loading state
    };
  }


  /**
   * Remove duplicate search results
   */
  private removeDuplicateResults(results: SearchResult[]): SearchResult[] {
    const seen = new Set<string>();
    return results.filter(result => {
      if (seen.has(result.url)) {
        return false;
      }
      seen.add(result.url);
      return true;
    });
  }

  /**
   * Extract key findings from completed steps
   */
  private extractKeyFindings(steps: ResearchStep[]): string[] {
    const findings: string[] = [];

    steps.forEach(step => {
      if (step.status === 'completed' && step.results && step.results.length > 0) {
        // Extract the most relevant finding from each step
        const topResult = step.results[0];
        if (topResult && topResult.content) {
          // Extract first meaningful sentence
          const sentences = topResult.content.split('. ');
          const meaningfulSentence = sentences.find(s => s.length > 50 && s.length < 200);
          if (meaningfulSentence) {
            findings.push(`${step.title}: ${meaningfulSentence}`);
          }
        }
      }
    });

    return findings;
  }

  /**
   * Generate basic summary (fast, no AI)
   */
  private generateBasicSummary(mission: ResearchMission, keyFindings: string[]): string {
    const completedSteps = mission.steps.filter(step => step.status === 'completed');
    
    let summary = `Research completed on: ${mission.title}\n\n`;
    summary += `Successfully completed ${completedSteps.length} of ${mission.steps.length} research steps.\n\n`;
    
    if (keyFindings.length > 0) {
      summary += `Key findings include:\n`;
      keyFindings.forEach((finding, index) => {
        summary += `${index + 1}. ${finding}\n`;
      });
    }

    summary += `\n🔄 Generating comprehensive analysis...`;

    return summary;
  }

  /**
   * Generate a comprehensive summary using OpenAI
   */
  private async generateSummary(mission: ResearchMission, keyFindings: string[]): Promise<string> {
    const completedSteps = mission.steps.filter(step => step.status === 'completed');
    
    // Collect all content from all sources
    const allContent = this.collectAllContent(mission.steps);
    
    if (allContent.length === 0) {
      return `Research completed on: ${mission.title}\n\nNo significant findings were gathered from the research steps.`;
    }

    try {
      // Create comprehensive analysis prompt
      const prompt = this.createAnalysisPrompt(mission, allContent);
      
      // Get comprehensive analysis from OpenAI
      const response = await this.searchClient.generateComprehensiveAnalysis(prompt);
      
      return response;
    } catch (error) {
      console.error('Error generating comprehensive summary:', error);
      
      // Fallback to basic summary if OpenAI fails
      let summary = `Research completed on: ${mission.title}\n\n`;
      summary += `Successfully completed ${completedSteps.length} of ${mission.steps.length} research steps.\n\n`;
      
      if (keyFindings.length > 0) {
        summary += `Key findings include:\n`;
        keyFindings.forEach((finding, index) => {
          summary += `${index + 1}. ${finding}\n`;
        });
      }
      
      return summary;
    }
  }

  /**
   * Collect all content from research steps
   */
  private collectAllContent(steps: ResearchStep[]): Array<{step: string, content: string, url: string}> {
    const allContent: Array<{step: string, content: string, url: string}> = [];
    
    steps.forEach(step => {
      if (step.status === 'completed' && step.results) {
        step.results.forEach(result => {
          if (result.content && result.content.length > 100) {
            allContent.push({
              step: step.title,
              content: result.content,
              url: result.url
            });
          }
        });
      }
    });
    
    return allContent;
  }

  /**
   * Create analysis prompt for OpenAI
   */
  private createAnalysisPrompt(mission: ResearchMission, allContent: Array<{step: string, content: string, url: string}>): string {
    const contentSummary = allContent.map((item, index) => 
      `### Source ${index + 1} (${item.step}):\n${item.content}\n\n`
    ).join('');

    return `You are a research analyst tasked with creating a comprehensive analysis report based on extensive research data.

RESEARCH TOPIC: ${mission.title}
RESEARCH DESCRIPTION: ${mission.description}

RESEARCH DATA:
${contentSummary}

Please analyze all the above information and create a comprehensive research report with the following structure:

## Executive Summary
Provide a concise 2-3 paragraph overview of the key findings and insights.

## Detailed Analysis
Break down the research into 4-6 major themes or categories. For each theme:
- Summarize the key points
- Highlight important statistics or facts
- Note any conflicting information or different perspectives

## Key Findings
List 8-10 specific, actionable findings that emerged from the research.

## Trends and Patterns
Identify any recurring themes, trends, or patterns across the different sources.

## Implications and Significance
Discuss what these findings mean and why they matter.

## Recommendations
Provide 5-7 specific recommendations based on the research.

## Areas for Further Research
Suggest 3-5 areas where additional research would be valuable.

Please ensure the analysis is:
- Comprehensive and thorough
- Based solely on the provided research data
- Well-structured and easy to read
- Professional in tone
- Includes specific references to the data where appropriate

Do not include a sources section as this will be handled separately.`;
  }

  /**
   * Generate recommendations based on research
   */
  private generateRecommendations(steps: ResearchStep[]): string[] {
    const recommendations: string[] = [];

    // Analyze completed steps to generate recommendations
    const completedSteps = steps.filter(step => step.status === 'completed');

    if (completedSteps.length > 0) {
      recommendations.push('Review the comprehensive research findings above');
      recommendations.push('Cross-reference multiple sources for validation');
      
      if (completedSteps.length >= 3) {
        recommendations.push('Consider the expert opinions and case studies identified');
      }
      
      if (completedSteps.some(step => step.title.toLowerCase().includes('trend'))) {
        recommendations.push('Monitor ongoing trends and developments in this area');
      }
    }

    return recommendations;
  }

  /**
   * Generate comprehensive summary in background
   */
  private async generateComprehensiveSummaryAsync(mission: ResearchMission): Promise<void> {
    try {
      console.log('Starting comprehensive analysis generation...');
      
      // Generate key findings
      const keyFindings = this.extractKeyFindings(mission.steps);
      
      // Generate comprehensive summary
      const comprehensiveSummary = await this.generateSummary(mission, keyFindings);
      
      // Update the mission with the comprehensive summary
      if (mission.results) {
        mission.results.summary = comprehensiveSummary;
        (mission.results as ResearchResults).isGeneratingComprehensiveAnalysis = false;
        mission.updatedAt = new Date();
      }
      
      console.log('Comprehensive analysis completed');
      
      // Here you could also trigger a websocket update or similar to notify the frontend
      // that the comprehensive analysis is ready
      
    } catch (error) {
      console.error('Error generating comprehensive summary:', error);
      
      // Update with error state
      if (mission.results) {
        mission.results.summary = mission.results.summary.replace(
          '🔄 Generating comprehensive analysis...', 
          '⚠️ Comprehensive analysis failed to generate. Using basic summary.'
        );
        (mission.results as ResearchResults).isGeneratingComprehensiveAnalysis = false;
      }
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}

export const researchPipeline = new ResearchPipeline();
