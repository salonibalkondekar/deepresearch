import { NextRequest, NextResponse } from 'next/server';
import { researchAgent } from '@/lib/agent';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description } = body;

    // Validate input
    if (!title || !description) {
      return NextResponse.json(
        { error: 'Title and description are required' },
        { status: 400 }
      );
    }

    // Validate using agent
    const validationErrors = researchAgent.validateMissionInput(title, description);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationErrors },
        { status: 400 }
      );
    }

    // Create research mission
    const mission = researchAgent.createMission(title, description);

    // Start research in background
    researchAgent.startResearch(mission.id).catch(error => {
      console.error('Background research error:', error);
    });

    return NextResponse.json({
      success: true,
      missionId: mission.id,
      mission: {
        id: mission.id,
        title: mission.title,
        description: mission.description,
        status: mission.status,
        steps: mission.steps,
        createdAt: mission.createdAt,
      }
    });

  } catch (error) {
    console.error('Research API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to start research mission',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    if (search) {
      // Search missions
      const missions = researchAgent.searchMissions(search);
      return NextResponse.json({
        success: true,
        missions: missions.map(mission => ({
          id: mission.id,
          title: mission.title,
          description: mission.description,
          status: mission.status,
          createdAt: mission.createdAt,
          updatedAt: mission.updatedAt,
          completedSteps: mission.results?.completedSteps || 0,
          totalSteps: mission.results?.totalSteps || mission.steps.length,
        }))
      });
    }

    // Get all missions
    const missions = researchAgent.getAllMissions();
    const stats = researchAgent.getStatistics();

    return NextResponse.json({
      success: true,
      missions: missions.map(mission => ({
        id: mission.id,
        title: mission.title,
        description: mission.description,
        status: mission.status,
        createdAt: mission.createdAt,
        updatedAt: mission.updatedAt,
        completedSteps: mission.results?.completedSteps || 0,
        totalSteps: mission.results?.totalSteps || mission.steps.length,
      })),
      statistics: stats
    });

  } catch (error) {
    console.error('Research GET API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch research missions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
