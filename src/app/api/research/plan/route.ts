import { NextRequest, NextResponse } from 'next/server';
import { researchAgent } from '@/lib/agent';
import { researchPipeline } from '@/lib/research-pipeline';

export async function POST(request: NextRequest) {
  try {
    const { title, description } = await request.json();

    // Validate input
    const validationErrors = researchAgent.validateMissionInput(title, description);
    if (validationErrors.length > 0) {
      return NextResponse.json({
        success: false,
        error: validationErrors.join(', ')
      }, { status: 400 });
    }

    // Create mission
    const mission = researchAgent.createMission(title, description);

    // Generate dynamic research steps using LLM
    mission.steps = await researchPipeline.planResearchSteps(mission.description);
    mission.status = 'planning';
    mission.updatedAt = new Date();

    return NextResponse.json({
      success: true,
      mission,
      message: 'Research plan created successfully'
    });

  } catch (error) {
    console.error('Error creating research plan:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create research plan'
    }, { status: 500 });
  }
}