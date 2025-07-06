'use client';

import { ResearchMission, ResearchStep } from '@/lib/types';
import { useState, useEffect, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  restrictToVerticalAxis,
  restrictToWindowEdges,
} from '@dnd-kit/modifiers';
import SortableStepItem from './SortableStepItem';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ResearchPlanProps {
  mission: ResearchMission;
  onExecute: () => void;
  onStartNew: () => void;
  onStepsChange?: (steps: ResearchStep[]) => void;
  isExecuting: boolean;
}

export default function ResearchPlan({ 
  mission, 
  onExecute, 
  onStartNew, 
  onStepsChange,
  isExecuting 
}: ResearchPlanProps) {
  const [steps, setSteps] = useState<ResearchStep[]>(
    mission.steps.map((step, index) => ({
      ...step,
      order: step.order ?? index
    })).sort((a, b) => a.order - b.order)
  );
  const stepsRef = useRef<ResearchStep[]>(steps);
  const [editingStep, setEditingStep] = useState<string | null>(null);

  // Use effect to notify parent when steps change, avoiding setState during render
  useEffect(() => {
    stepsRef.current = steps;
    if (onStepsChange) {
      onStepsChange(steps);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps]); // Intentionally excluding onStepsChange to prevent infinite loop
  const [tempStepData, setTempStepData] = useState<{
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  }>({
    title: '',
    description: '',
    priority: 'medium'
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setSteps((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);
        
        const newItems = arrayMove(items, oldIndex, newIndex);
        // Update order values
        const updatedItems = newItems.map((item, index) => ({
          ...item,
          order: index
        }));
        
        return updatedItems;
      });
    }
  };

  const handleEditStep = (stepId: string) => {
    const step = steps.find(s => s.id === stepId);
    if (step) {
      setTempStepData({
        title: step.title,
        description: step.description,
        priority: step.priority || 'medium'
      });
      setEditingStep(stepId);
    }
  };

  const handleSaveStep = (stepId: string) => {
    const updatedSteps = steps.map(step => 
      step.id === stepId 
        ? {
            ...step,
            title: tempStepData.title,
            description: tempStepData.description,
            priority: tempStepData.priority
          }
        : step
    );
    setSteps(updatedSteps);
    setEditingStep(null);
  };

  const handleCancelEdit = () => {
    setEditingStep(null);
    setTempStepData({
      title: '',
      description: '',
      priority: 'medium'
    });
  };

  const handleDeleteStep = (stepId: string) => {
    const updatedSteps = steps
      .filter(step => step.id !== stepId)
      .map((step, index) => ({
        ...step,
        order: index
      }));
    setSteps(updatedSteps);
  };

  const handleAddStep = () => {
    const newStep: ResearchStep = {
      id: `step-${Date.now()}`,
      title: 'New Research Step',
      description: 'Describe what needs to be researched in this step',
      status: 'pending',
      priority: 'medium',
      order: steps.length
    };
    
    const updatedSteps = [...steps, newStep];
    setSteps(updatedSteps);
    
    // Automatically edit the new step
    setTimeout(() => {
      handleEditStep(newStep.id);
    }, 100);
  };


  const getPriorityColor = (priority: string) => {
    switch (priority?.toUpperCase()) {
      case 'HIGH':
        return 'bg-red-100 text-red-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      case 'LOW':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date: Date | string) => {
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      
      if (isNaN(dateObj.getTime())) {
        return 'Invalid date';
      }
      
      return new Intl.DateTimeFormat('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).format(dateObj);
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Date formatting error';
    }
  };

  const canExecute = steps.length > 0 && steps.every(step => 
    step.title.trim() !== '' && step.description.trim() !== ''
  );

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-start">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{mission.title}</h1>
            <button
              onClick={onStartNew}
              className="text-sm text-gray-600 hover:text-gray-800 transition-all duration-200 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-300"
            >
              Start New
            </button>
          </div>
          <div className="prose prose-sm max-w-none text-gray-600 mb-4">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {mission.description}
            </ReactMarkdown>
          </div>
        </div>


        {/* Research Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Research Steps</h2>
            <button
              onClick={handleAddStep}
              className="flex items-center bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Step
            </button>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
          >
            <SortableContext items={steps.map(step => step.id)} strategy={verticalListSortingStrategy}>
              <div 
                className="space-y-4"
                role="list"
                aria-label="Research steps"
                aria-describedby="edit-help"
              >
                {steps.map((step, index) => (
                  <SortableStepItem
                    key={step.id}
                    step={step}
                    index={index}
                    isEditing={editingStep === step.id}
                    tempData={editingStep === step.id ? tempStepData : null}
                    onEdit={() => handleEditStep(step.id)}
                    onSave={() => handleSaveStep(step.id)}
                    onCancel={handleCancelEdit}
                    onDelete={() => handleDeleteStep(step.id)}
                    onTempDataChange={setTempStepData}
                    getPriorityColor={getPriorityColor}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          
          {/* Hidden accessibility help text */}
          <div id="edit-help" className="sr-only">
            You can drag and drop to reorder steps, click to edit content, and use keyboard navigation.
          </div>
        </div>

        {/* Validation Warning */}
        {!canExecute && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-red-700 font-medium">Cannot Execute</span>
            </div>
            <p className="text-red-600 text-sm mt-1">
              Please ensure all steps have both a title and description before executing.
            </p>
          </div>
        )}

        {/* Plan Generation Info */}
        <div className="border-t pt-4 mb-8">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>Plan generated on {formatDate(mission.createdAt)}</span>
            <span>{steps.length} step{steps.length !== 1 ? 's' : ''} total</span>
          </div>
        </div>

        {/* Execute Button */}
        <div className="text-center">
          <button
            onClick={onExecute}
            disabled={isExecuting || !canExecute}
            className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExecuting ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Executing Research Plan...
              </div>
            ) : (
              <>
                🚀 Execute Research Plan with AI
              </>
            )}
          </button>
          <p className="text-sm text-gray-500 mt-2">
            This will automatically execute each step using web search
          </p>
        </div>
      </div>
    </div>
  );
}