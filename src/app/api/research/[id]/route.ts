import { NextRequest, NextResponse } from 'next/server';
import { researchAgent } from '@/lib/agent';
import { ResearchResults } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: missionId } = await params;

    if (!missionId) {
      return NextResponse.json(
        { error: 'Mission ID is required' },
        { status: 400 }
      );
    }

    // Get mission
    const mission = researchAgent.getMission(missionId);

    if (!mission) {
      console.log('Mission not found:', missionId);
      return NextResponse.json(
        { error: 'Mission not found' },
        { status: 404 }
      );
    }

    console.log('Retrieved mission:', {
      id: mission.id,
      status: mission.status,
      hasResults: !!mission.results,
      isGeneratingAnalysis: mission.results ? (mission.results as ResearchResults)?.isGeneratingComprehensiveAnalysis : undefined,
      lastUpdated: mission.updatedAt
    });

    // Get current agent state for progress
    const agentState = researchAgent.getState();
    const isCurrentMission = agentState.currentMission?.id === missionId;

    return NextResponse.json({
      success: true,
      mission,
      progress: isCurrentMission ? agentState.progress : 
        mission.status === 'completed' ? 100 : 0,
      isProcessing: isCurrentMission && agentState.isProcessing,
      error: isCurrentMission ? agentState.error : undefined
    });

  } catch (error) {
    console.error('Mission GET API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch mission',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: missionId } = await params;

    if (!missionId) {
      return NextResponse.json(
        { error: 'Mission ID is required' },
        { status: 400 }
      );
    }

    // Get mission to check if it exists
    const mission = researchAgent.getMission(missionId);

    if (!mission) {
      return NextResponse.json(
        { error: 'Mission not found' },
        { status: 404 }
      );
    }

    // Check if this is the current processing mission
    const agentState = researchAgent.getState();
    if (agentState.currentMission?.id === missionId && agentState.isProcessing) {
      // Cancel the current research
      researchAgent.cancelResearch();
    }

    return NextResponse.json({
      success: true,
      message: 'Mission cancelled successfully'
    });

  } catch (error) {
    console.error('Mission DELETE API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to cancel mission',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: missionId } = await params;
    const { researchPlan } = await request.json();

    if (!missionId) {
      return NextResponse.json(
        { success: false, error: 'Mission ID is required' },
        { status: 400 }
      );
    }
    
    if (!researchPlan || !Array.isArray(researchPlan)) {
      return NextResponse.json(
        { success: false, error: 'Valid research plan is required' },
        { status: 400 }
      );
    }

    const mission = researchAgent.getMission(missionId);
    if (!mission) {
      return NextResponse.json(
        { success: false, error: 'Mission not found' },
        { status: 404 }
      );
    }

    // This is the critical step: update the mission with the user's edited plan
    console.log(`Updating mission ${missionId} with new research plan:`, researchPlan);
    mission.steps = researchPlan;
    mission.status = 'researching';
    mission.updatedAt = new Date();
    
    // Start the research with the updated plan
    researchAgent.startResearch(mission.id);

    return NextResponse.json({
      success: true,
      message: 'Research started successfully with the updated plan',
      mission,
    });

  } catch (error) {
    console.error('Mission POST API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to start research with the updated plan',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
