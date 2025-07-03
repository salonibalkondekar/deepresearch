import { NextRequest, NextResponse } from 'next/server';
import { researchAgent } from '@/lib/agent';

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
      return NextResponse.json(
        { error: 'Mission not found' },
        { status: 404 }
      );
    }

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
