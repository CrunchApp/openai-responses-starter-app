import React from 'react';
import { 
  Dialog, 
  DialogContent,
  DialogHeader,
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Check, 
  Loader2, 
  BookOpen, 
  Search, 
  Brain, 
  BarChart, 
  FileCheck,
  Globe,
  Database,
  Bot
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';

// --- OLD STAGES (kept for reference, but not used anymore) ---
// export const RECOMMENDATION_STAGES_OLD = [...];

// --- ENHANCED STAGES --- 
// Define more granular stages matching the actual API process including pathway iteration
export const RECOMMENDATION_STAGES_ENHANCED = [
  {
    id: 'analyzing',
    title: 'Analyzing your profile',
    description: 'Evaluating background, goals, and preferences.',
    icon: <Brain className="w-5 h-5" />
  },
  {
    id: 'pathways-start',
    title: 'Generating education pathways',
    description: 'Using AI to identify potential education routes.',
    icon: <Bot className="w-5 h-5" /> 
  },
  {
    id: 'pathways-complete',
    title: 'Education pathways identified',
    description: 'Personalized education routes created.',
    icon: <BookOpen className="w-5 h-5" />
  },
  // Research Loop (simulated for up to 3 pathways)
  {
    id: 'research-init-1',
    title: 'Researching Pathway',
    description: 'Preparing to search for programs matching this pathway.',
    icon: <Search className="w-5 h-5" />
  },
  {
    id: 'research-web-1',
    title: 'Querying Perplexity',
    description: 'Searching global databases for relevant programs.',
    icon: <Globe className="w-5 h-5" />
  },
  {
    id: 'research-parse-1',
    title: 'Processing Results',
    description: 'Using AI to structure program data from search.',
    icon: <Database className="w-5 h-5" />
  },
  {
    id: 'research-init-2',
    title: 'Researching Pathway 2',
    description: 'Preparing to search for programs matching the second pathway.',
    icon: <Search className="w-5 h-5" />
  },
  {
    id: 'research-web-2',
    title: 'Querying Perplexity (Pathway 2)',
    description: 'Searching global databases for relevant programs.',
    icon: <Globe className="w-5 h-5" />
  },
  {
    id: 'research-parse-2',
    title: 'Processing Results (Pathway 2)',
    description: 'Using AI to structure program data from search.',
    icon: <Database className="w-5 h-5" />
  },
  {
    id: 'research-init-3',
    title: 'Researching Pathway 3',
    description: 'Preparing to search for programs matching the third pathway.',
    icon: <Search className="w-5 h-5" />
  },
  {
    id: 'research-web-3',
    title: 'Querying Perplexity (Pathway 3)',
    description: 'Searching global databases for relevant programs.',
    icon: <Globe className="w-5 h-5" />
  },
  {
    id: 'research-parse-3',
    title: 'Processing Results (Pathway 3)',
    description: 'Using AI to structure program data from search.',
    icon: <Database className="w-5 h-5" />
  },
  // End Research Loop
  {
    id: 'matching',
    title: 'Calculating match scores',
    description: 'Determining how well each program aligns with your profile.',
    icon: <BarChart className="w-5 h-5" />
  },
  {
    id: 'finalizing',
    title: 'Preparing recommendations',
    description: 'Formatting and arranging your personalized suggestions.',
    icon: <FileCheck className="w-5 h-5" />
  }
];

// Define a type for dynamic progress stages
export type ProgressStage = typeof RECOMMENDATION_STAGES_ENHANCED[number];

interface RecommendationProgressModalProps {
  isOpen: boolean;
  // Dynamic array of progress stages to display
  progressStages: ProgressStage[];
  currentStageIndex: number;
  isComplete: boolean;
  currentPathwayTitle?: string; // Optional title of the pathway being processed
  estimatedTimeRemaining?: string; // Optional realistic time remaining estimate
}

export function RecommendationProgressModal({
  isOpen,
  progressStages, // This will now be dynamic ProgressStage[]
  currentStageIndex,
  isComplete
  , currentPathwayTitle
  , estimatedTimeRemaining
}: RecommendationProgressModalProps) {
  // Calculate progress percentage based on the dynamic list of stages
  const progressPercentage = isComplete 
    ? 100 
    : Math.min(100, Math.ceil(((currentStageIndex + 1) / progressStages.length) * 100)); // Use currentStageIndex + 1 for better progress feel

  // Determine dynamic header and footer texts
  const headerText = isComplete 
    ? 'All Done!'
    : progressStages[currentStageIndex]?.title || 'Processing...';
  const footerText = isComplete 
    ? 'Process completed successfully!' 
    : progressStages[currentStageIndex]?.description || 'Please wait...';

  // Compute realistic time remaining estimate if not explicitly provided
  const scenarioStartId = progressStages[0]?.id;
  const isPathwayGen = ['analyzing', 'pathways-start', 'pathways-complete'].includes(scenarioStartId);
  const defaultEstimatedTime = !isComplete
    ? (isPathwayGen ? '≈2 minute' : '≈3 minutes')
    : undefined;
  const displayEstimatedTime = estimatedTimeRemaining || defaultEstimatedTime;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}} modal={true}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center font-semibold text-lg">
            {headerText}
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          {/* Show pathway context and realistic time estimate if provided */}
          {currentPathwayTitle && !isComplete && (
            <p className="text-center text-sm text-gray-500 mb-2">
              Exploring pathway: {currentPathwayTitle}
            </p>
          )}
          {displayEstimatedTime && !isComplete && (
            <p className="text-center text-sm text-gray-500 mb-4">
              Estimated time: {displayEstimatedTime}
            </p>
          )}
          <Progress 
            value={progressPercentage} 
            className="h-2 mb-6 transition-all duration-500 ease-in-out" // Added transition
          />
          
          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2"> {/* Adjusted spacing and height */}
            <AnimatePresence initial={false}> {/* Set initial to false for smoother updates */}
              {progressStages.map((stage, index) => {
                const isActive = index === currentStageIndex;
                const isCompleted = isComplete || index < currentStageIndex;
                
                // Only render completed stages and the active stage for cleaner UI
                if (!isCompleted && !isActive) return null;

                return (
                  <motion.div
                    key={stage.id} // Use stage.id as key
                    layout // Add layout animation
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }} // Add exit animation
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className={`flex items-start space-x-3 p-2.5 rounded-md transition-colors duration-200 ${
                      isActive ? 'bg-blue-50' : isCompleted ? 'bg-white' : ''
                    }`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {isCompleted ? (
                        <div className="rounded-full bg-green-100 p-1">
                          <Check className="h-4 w-4 text-green-600" />
                        </div>
                      ) : isActive ? (
                        <div className="rounded-full bg-blue-100 p-1">
                          <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                        </div>
                      ) : (
                        // This case is now unlikely due to the filter above, but kept as fallback
                        <div className="rounded-full bg-gray-100 p-1">
                          {React.cloneElement(stage.icon, { className: "h-4 w-4 text-gray-400" })}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0"> {/* Added flex-1 and min-w-0 for text wrapping */}
                      <h4 className={`text-sm font-medium truncate ${
                        isActive ? 'text-blue-700' : isCompleted ? 'text-gray-700' : 'text-gray-500'
                      }`}>
                        {stage.title}
                      </h4>
                      {isActive && (
                        <p className="text-xs text-blue-600 mt-1">
                          {stage.description}
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            
            {isComplete && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                className="flex justify-center items-center pt-3"
              >
                <div className="rounded-full bg-green-100 p-2">
                  <Check className="h-6 w-6 text-green-600" />
                </div>
              </motion.div>
            )}
          </div>
          
          <div className="text-center text-sm text-gray-600 mt-4">
            {footerText}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 