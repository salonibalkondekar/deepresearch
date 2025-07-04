import { NextRequest, NextResponse } from 'next/server';
import { researchAgent } from '@/lib/agent';
import { researchPipeline } from '@/lib/research-pipeline';

export async function POST(request: NextRequest) {
  try {
    console.log('Starting research plan creation...');
    
    const { title, description } = await request.json();
    console.log('Input received:', { title, description });

    // Validate input
    const validationErrors = researchAgent.validateMissionInput(title, description);
    if (validationErrors.length > 0) {
      console.log('Validation errors:', validationErrors);
      return NextResponse.json({
        success: false,
        error: validationErrors.join(', ')
      }, { status: 400 });
    }

    // Create mission
    console.log('Creating mission...');
    const mission = researchAgent.createMission(title, description);
    console.log('Mission created:', mission.id);

    // Generate dynamic research steps using LLM
    console.log('Generating research steps with LLM...');
    try {
      mission.steps = await researchPipeline.planResearchSteps(mission.description);
      console.log('Research steps generated successfully:', mission.steps.length);
    } catch (stepError) {
      console.error('Error generating research steps:', stepError);
      console.error('Step error details:', stepError instanceof Error ? stepError.stack : stepError);
      throw new Error(`Failed to generate research steps: ${stepError instanceof Error ? stepError.message : 'Unknown error'}`);
    }
    
    mission.status = 'planning';
    mission.updatedAt = new Date();

    console.log('Research plan created successfully');
    return NextResponse.json({
      success: true,
      mission,
      message: 'Research plan created successfully'
    });

  } catch (error) {
    console.error('Error creating research plan:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Provide more detailed error information
    let errorMessage = 'Failed to create research plan';
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Categorize common errors
      if (error.message.includes('OPENAI_API_KEY')) {
        errorMessage = 'OpenAI API key is not configured properly';
      } else if (error.message.includes('rate limit') || error.message.includes('quota')) {
        errorMessage = 'OpenAI API rate limit exceeded. Please try again later.';
      } else if (error.message.includes('model') || error.message.includes('gpt-4o')) {
        errorMessage = 'OpenAI model access issue. The gpt-4o model may not be available with your API key.';
      } else if (error.message.includes('parse') || error.message.includes('JSON')) {
        errorMessage = 'Failed to parse AI response. Using fallback research steps.';
      }
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : String(error)) : undefined
    }, { status: 500 });
  }
}