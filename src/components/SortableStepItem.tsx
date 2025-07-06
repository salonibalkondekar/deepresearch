'use client';

import { ResearchStep } from '@/lib/types';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface SortableStepItemProps {
  step: ResearchStep;
  index: number;
  isEditing: boolean;
  tempData: {
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  } | null;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onTempDataChange: (data: {
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  }) => void;
  getPriorityColor: (priority: string) => string;
}

export default function SortableStepItem({
  step,
  index,
  isEditing,
  tempData,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onTempDataChange,
  getPriorityColor,
}: SortableStepItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleSave = () => {
    if (tempData && tempData.title.trim() && tempData.description.trim()) {
      onSave();
    }
  };

  const canSave = tempData && tempData.title.trim() !== '' && tempData.description.trim() !== '';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border border-gray-200 rounded-lg p-3 md:p-4 bg-white ${
        isDragging ? 'shadow-xl ring-2 ring-blue-500 ring-opacity-50' : ''
      } hover:shadow-md transition-shadow`}
      role="listitem"
      aria-label={`Research step ${index + 1}: ${step.title}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center flex-1">
          {/* Drag Handle */}
          <button
            {...attributes}
            {...listeners}
            className="flex-shrink-0 p-1 mr-3 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
            aria-label="Drag to reorder"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
          </button>
          
          {/* Step Number */}
          <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mr-3">
            {index + 1}
          </span>
          
          {/* Title */}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div>
                <label htmlFor={`title-${step.id}`} className="sr-only">Step title</label>
                <input
                  id={`title-${step.id}`}
                  type="text"
                  value={tempData?.title || ''}
                  onChange={(e) => onTempDataChange({
                    ...tempData!,
                    title: e.target.value
                  })}
                  className="w-full text-lg font-semibold text-gray-900 bg-transparent border-b-2 border-gray-300 focus:border-blue-500 focus:outline-none px-1 py-1"
                  placeholder="Enter step title"
                  autoFocus
                  aria-required="true"
                  aria-invalid={!tempData?.title.trim()}
                />
              </div>
            ) : (
              <h3 
                className="text-base md:text-lg font-semibold text-gray-900 break-words cursor-pointer hover:text-blue-600 transition-colors"
                onClick={onEdit}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onEdit()}
                role="button"
                aria-label={`Edit ${step.title}`}
              >
                {step.title}
              </h3>
            )}
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center space-x-1 md:space-x-2 ml-2 md:ml-4">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                disabled={!canSave}
                className="p-1.5 md:p-2 text-green-600 hover:text-green-700 disabled:text-gray-400 disabled:cursor-not-allowed touch-target"
                title="Save changes"
                aria-label="Save changes"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </button>
              <button
                onClick={onCancel}
                className="p-1.5 md:p-2 text-gray-600 hover:text-gray-700 touch-target"
                title="Cancel editing"
                aria-label="Cancel editing"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onEdit}
                className="p-1.5 md:p-2 text-blue-600 hover:text-blue-700 touch-target"
                title="Edit step"
                aria-label="Edit step"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={onDelete}
                className="p-1.5 md:p-2 text-red-600 hover:text-red-700 touch-target"
                title="Delete step"
                aria-label="Delete step"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              
              {/* Priority Badge */}
              <span className={`px-1.5 md:px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(step.priority || 'medium')}`}>
                <span className="hidden sm:inline">{(step.priority || 'medium').toUpperCase()}</span>
                <span className="sm:hidden">{(step.priority || 'medium').charAt(0).toUpperCase()}</span>
              </span>
            </>
          )}
        </div>
      </div>
      
      {/* Step Content */}
      <div className="ml-11">
        {/* Priority in Edit Mode */}
        {isEditing && (
          <div className="mb-3">
            <div className="max-w-xs">
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor={`priority-${step.id}`}>
                Priority
              </label>
              <select
                id={`priority-${step.id}`}
                value={tempData?.priority || 'medium'}
                onChange={(e) => onTempDataChange({
                  ...tempData!,
                  priority: e.target.value as 'high' | 'medium' | 'low'
                })}
                className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                aria-describedby={`priority-help-${step.id}`}
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <p id={`priority-help-${step.id}`} className="sr-only">Select the priority level for this research step</p>
            </div>
          </div>
        )}
        
        {/* Description */}
        <div className="mb-3">
          <h4 className="text-sm font-medium text-gray-700 mb-1" id={`desc-label-${step.id}`}>
            Description
          </h4>
          {isEditing ? (
            <textarea
              id={`description-${step.id}`}
              value={tempData?.description || ''}
              onChange={(e) => onTempDataChange({
                ...tempData!,
                description: e.target.value
              })}
              className="w-full text-sm text-gray-600 bg-transparent border border-gray-300 rounded-md px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[80px] resize-y"
              placeholder="Describe what needs to be researched in this step"
              rows={3}
              aria-labelledby={`desc-label-${step.id}`}
              aria-required="true"
              aria-invalid={!tempData?.description.trim()}
              aria-describedby={`desc-help-${step.id}`}
            />
          ) : (
            <div 
              className="text-sm text-gray-600 prose prose-sm max-w-none break-words cursor-pointer hover:text-blue-600 transition-colors rounded-md p-1 hover:bg-blue-50"
              onClick={onEdit}
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onEdit()}
              role="button"
              aria-label="Edit description"
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {step.description}
              </ReactMarkdown>
            </div>
          )}
          {isEditing && (
            <p id={`desc-help-${step.id}`} className="text-xs text-gray-500 mt-1">
              You can use markdown formatting (bold, lists, etc.)
            </p>
          )}
        </div>
        
        {/* Expected Outcome (only in view mode) */}
        {!isEditing && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-1">Expected Outcome</h4>
            <p className="text-sm text-gray-600">
              Comprehensive information and analysis related to this research step.
            </p>
          </div>
        )}
        
        {/* Validation Error */}
        {isEditing && (!tempData?.title.trim() || !tempData?.description.trim()) && (
          <div className="mt-2 text-sm text-red-600">
            Both title and description are required
          </div>
        )}
      </div>
    </div>
  );
}