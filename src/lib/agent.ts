import { ResearchMission, ResearchStep, AgentState } from './types';
import { researchPipeline } from './research-pipeline';

export class ResearchAgent {
  private state: AgentState;
  private missions: Map<string, ResearchMission> = new Map();

  constructor() {
    this.state = {
      isProcessing: false,
      progress: 0,
    };
  }

  /**
   * Create a new research mission
   */
  createMission(title: string, description: string): ResearchMission {
    const mission: ResearchMission = {
      id: this.generateId(),
      title,
      description,
      status: 'pending',
      steps: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.missions.set(mission.id, mission);
    return mission;
  }

  /**
   * Start research mission execution
   */
  async startResearch(
    missionId: string,
    onProgress?: (mission: ResearchMission, progress: number) => void
  ): Promise<ResearchMission> {
    const mission = this.missions.get(missionId);
    if (!mission) {
      throw new Error(`Mission with ID ${missionId} not found`);
    }

    if (this.state.isProcessing) {
      throw new Error('Another research mission is already in progress');
    }

    try {
      // Set state to processing
      this.state.isProcessing = true;
      this.state.currentMission = mission;
      this.state.progress = 0;
      this.state.error = undefined;

      // Update mission status
      mission.status = 'planning';
      mission.updatedAt = new Date();

      // Plan the research steps
      mission.steps = await researchPipeline.planResearchSteps(mission.description);
      
      // Notify planning complete
      if (onProgress) {
        onProgress(mission, 5); // 5% for planning
      }

      // Update mission status to researching
      mission.status = 'researching';
      mission.updatedAt = new Date();

      // Execute the research plan
      const completedMission = await researchPipeline.executeResearchPlan(
        mission,
        (step: ResearchStep, progress: number) => {
          // Update state progress (5% for planning + 95% for execution)
          this.state.progress = 5 + (progress * 0.95);
          
          if (onProgress) {
            onProgress(mission, this.state.progress);
          }
        }
      );

      // Update final state
      this.state.progress = 100;
      this.missions.set(missionId, completedMission);

      return completedMission;

    } catch (error) {
      // Handle errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      mission.status = 'error';
      mission.updatedAt = new Date();
      
      this.state.error = errorMessage;
      this.missions.set(missionId, mission);
      
      throw error;
    } finally {
      // Reset processing state
      this.state.isProcessing = false;
      this.state.currentMission = undefined;
    }
  }

  /**
   * Get mission by ID
   */
  getMission(id: string): ResearchMission | undefined {
    return this.missions.get(id);
  }

  /**
   * Get all missions
   */
  getAllMissions(): ResearchMission[] {
    return Array.from(this.missions.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  /**
   * Get current agent state
   */
  getState(): AgentState {
    return { ...this.state };
  }

  /**
   * Cancel current research mission
   */
  cancelResearch(): void {
    if (this.state.currentMission) {
      this.state.currentMission.status = 'error';
      this.state.currentMission.updatedAt = new Date();
      this.missions.set(this.state.currentMission.id, this.state.currentMission);
    }

    this.state.isProcessing = false;
    this.state.currentMission = undefined;
    this.state.progress = 0;
    this.state.error = 'Research cancelled by user';
  }

  /**
   * Validate mission input
   */
  validateMissionInput(title: string, description: string): string[] {
    const errors: string[] = [];

    if (!title || title.trim().length === 0) {
      errors.push('Mission title is required');
    } else if (title.trim().length < 3) {
      errors.push('Mission title must be at least 3 characters long');
    } else if (title.trim().length > 200) {
      errors.push('Mission title must be less than 200 characters');
    }

    if (!description || description.trim().length === 0) {
      errors.push('Mission description is required');
    } else if (description.trim().length < 10) {
      errors.push('Mission description must be at least 10 characters long');
    } else if (description.trim().length > 2000) {
      errors.push('Mission description must be less than 2000 characters');
    }

    return errors;
  }

  /**
   * Get research statistics
   */
  getStatistics(): {
    totalMissions: number;
    completedMissions: number;
    averageSteps: number;
    successRate: number;
  } {
    const missions = this.getAllMissions();
    const completedMissions = missions.filter(m => m.status === 'completed');
    
    const totalSteps = missions.reduce((sum, m) => sum + m.steps.length, 0);
    const averageSteps = missions.length > 0 ? totalSteps / missions.length : 0;
    
    const successRate = missions.length > 0 ? (completedMissions.length / missions.length) * 100 : 0;

    return {
      totalMissions: missions.length,
      completedMissions: completedMissions.length,
      averageSteps,
      successRate,
    };
  }

  /**
   * Search missions by keyword
   */
  searchMissions(keyword: string): ResearchMission[] {
    const lowerKeyword = keyword.toLowerCase();
    return this.getAllMissions().filter(mission => 
      mission.title.toLowerCase().includes(lowerKeyword) ||
      mission.description.toLowerCase().includes(lowerKeyword)
    );
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}

// Singleton instance
export const researchAgent = new ResearchAgent();
