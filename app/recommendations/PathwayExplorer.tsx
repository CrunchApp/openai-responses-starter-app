import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  AlertCircle, 
  ChevronRight, 
  Info, 
  Sparkles, 
  Award,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  ChevronDown,
  BookOpen,
  Shield,
  Lock,
  Trash2,
  X,
  Calendar,
  ListChecks,
  Star,
  MessageSquare,
  ExternalLink,
  TrendingUp,
  Wallet,
  MapPin,
  GraduationCap
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import usePathwayStore from '@/stores/usePathwayStore';
import { EducationPathway, RecommendationProgram } from './types';
import { generateEducationPathways } from './pathway-actions';
import { exploreProgramsAction } from './exploreProgramsAction';
import { useAuth } from '@/app/components/auth/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function PathwayExplorer({ 
  userProfile, 
  onSelectPathway,
  onStartGeneration,
  onStopGeneration
}: { 
  userProfile: any;
  onSelectPathway?: (pathway: EducationPathway) => void;
  onStartGeneration?: () => void;
  onStopGeneration?: (success: boolean) => void;
}) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { 
    pathways, 
    isLoading, 
    setLoading, 
    error, 
    setError,
    setPathways,
    syncWithSupabase,
    programsByPathway,
    programGenerationLoading,
    programGenerationError,
    setProgramsForPathway,
    setProgramGenerationLoading,
    setProgramGenerationError,
    toggleFavorite,
    submitFeedback,
    hasReachedGuestLimit,
    guestPathwayGenerationCount,
    maxGuestPathwayGenerations,
    deletePathway,
    isActionLoading,
    actionError,
    generateMorePathways,
    deleteProgram
  } = usePathwayStore();
  
  const [generating, setGenerating] = useState(false);
  const [newPathwayIds, setNewPathwayIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('default');
  const isGuest = !user && !authLoading;
  const hasReachedLimit = isGuest && hasReachedGuestLimit();
  
  // Note: Pathway synchronization is now handled by AuthSynchronizer component
  
  const handleGeneratePathways = async () => {
    if (!userProfile) {
      setError("User profile is required to generate pathways");
      return;
    }
    
    // Start progress modal if callback provided
    if (onStartGeneration) onStartGeneration();
    
    // Check if guest has reached limit
    if (isGuest && hasReachedLimit) {
      setError("You've reached the limit for generating pathways as a guest. Please sign up to generate more.");
      // Stop progress modal on failure
      if (onStopGeneration) onStopGeneration(false);
      return;
    }
    
    setGenerating(true);
    setError(null);
    
    try {
      // If we already have pathways, then this is a "regenerate" operation which should
      // append to existing pathways instead of replacing them
      if (pathways.length > 0 && !isGuest) {
        // For authenticated users, use the conversation history approach
        // Get user feedback from deleted pathways to use as context
        const feedbackContext = pathways
          .filter(p => p.is_deleted && p.user_feedback)
          .map(p => ({
            pathwaySummary: `${p.title} (${p.qualification_type} in ${p.field_of_study})`,
            feedback: p.user_feedback
          }));
        
        console.log(`Collected feedback context from ${feedbackContext.length} deleted pathways:`, 
          feedbackContext.length > 0 ? feedbackContext : 'No feedback found'
        );
        
        // Call the generateMorePathways action which will use conversation history
        const morePathwaysResult = await generateMorePathways(pathways, feedbackContext);
        
        if (!morePathwaysResult.success && morePathwaysResult.error) {
          setError(morePathwaysResult.error);
          if (onStopGeneration) onStopGeneration(false);
          return;
        }
        
        if (morePathwaysResult.pathways && morePathwaysResult.pathways.length > 0) {
          // Append the new pathways to the existing ones
          setPathways([...pathways, ...morePathwaysResult.pathways]);
          // Set new pathway IDs for highlighting
          setNewPathwayIds(morePathwaysResult.pathways.map(p => p.id)); 
        } else {
          setError("No new pathways were generated. Please try again.");
        }
      } else {
        // First-time generation or guest user - use the original method
        const result = await generateEducationPathways(userProfile.vector_store_id || '', userProfile);
        
        if (result.error) {
          setError(result.error);
          if (onStopGeneration) onStopGeneration(false);
          return;
        }
        
        if (result.pathways && result.pathways.length > 0) {
          setPathways(result.pathways);
          // Set new pathway IDs for highlighting
          setNewPathwayIds(result.pathways.map(p => p.id)); 
        } else {
          setError("No pathways were generated. Please try again.");
        }
      }
    } catch (err) {
      console.error("Error generating pathways:", err);
      setError("Failed to generate pathways. Please try again later.");
    } finally {
      setGenerating(false);
      // Stop progress modal (success is implied if no error was thrown)
      // The actual pathways might be empty, but the *generation attempt* completed
      if (onStopGeneration && !error) onStopGeneration(true);
      // Clear new pathway IDs after a short delay
      setTimeout(() => setNewPathwayIds([]), 5000); 
    }
  };
  
  const handleExplorePrograms = async (pathway: EducationPathway) => {
    // Only proceed if not already loading programs for this pathway
    if (programGenerationLoading[pathway.id]) {
      return;
    }
    
    // Set loading state for this specific pathway
    setProgramGenerationLoading(pathway.id, true);
    
    try {
      const result = await exploreProgramsAction(pathway.id);
      
      if (!result.success || result.error) {
        console.error(`Error exploring programs for pathway ${pathway.id}:`, result.error);
        setProgramGenerationError(pathway.id, result.error || "Failed to generate programs");
        return;
      }
      
      // Ensure programs is an array, defaulting to empty if undefined
      const programsToSet = result.programs ?? [];
      
      // Store programs in the Zustand store
      setProgramsForPathway(pathway.id, programsToSet);
      
      if (programsToSet.filter(p => !p.is_deleted).length > 0) {
        console.log(`Successfully loaded ${programsToSet.filter(p => !p.is_deleted).length} programs for pathway ${pathway.id}`);
      } else {
        console.warn(`No active programs returned or found for pathway ${pathway.id}, setting empty array.`);
        setProgramGenerationError(pathway.id, "No specific programs found for this pathway.");
      }
    } catch (err) {
      console.error("Error exploring programs:", err);
      setProgramGenerationError(
        pathway.id, 
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    }
  };
  
  const handleSelectPathway = (pathway: EducationPathway) => {
    if (onSelectPathway) {
      onSelectPathway(pathway);
    } else {
      // Only navigate if we're sure this route exists
      // Comment this out for now to prevent not-found compilation
      // router.push(`/recommendations/pathway/${pathway.id}`);
      
      // Instead, log a message and focus on program exploration
      console.log(`Selected pathway: ${pathway.title}`);
      // Automatically trigger program exploration if not already exploring
      if (!programGenerationLoading[pathway.id]) {
        handleExplorePrograms(pathway);
      }
    }
  };
  
  // Sort pathways based on the selected criteria
  const sortedPathways = React.useMemo(() => {
    let sorted = [...pathways];
    if (sortBy === 'duration') {
      // Sort by minimum duration, ascending
      sorted.sort((a, b) => {
        // According to EducationPathway interface, duration_months is a number
        // Let's handle it safely anyway
        const durationA = typeof a.duration_months === 'number' ? a.duration_months : Infinity;
        const durationB = typeof b.duration_months === 'number' ? b.duration_months : Infinity;
             
        return durationA - durationB;
      });
    } else if (sortBy === 'budget') {
      // Sort by minimum budget, ascending
      sorted.sort((a, b) => {
        // Extract budget min values with proper type safety
        const budgetA = (a.budget_range_usd && typeof a.budget_range_usd === 'object') ? (a.budget_range_usd.min || Infinity) : Infinity;
        const budgetB = (b.budget_range_usd && typeof b.budget_range_usd === 'object') ? (b.budget_range_usd.min || Infinity) : Infinity;
           
        return budgetA - budgetB;
      });
    }
    // 'default' sort is the order they come from the store/API
    return sorted;
  }, [pathways, sortBy]);
  
  // Show loading state when initial load or auth is loading
  if (isLoading || authLoading) {
    return <PathwaysLoadingSkeleton />;
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Your Education Pathways</h2>
          
          <div className="flex items-center gap-2 flex-wrap">
            {/* Sort Dropdown */} 
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">Sort By: {sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Sort Pathways</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSortBy('default')}>Default</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('duration')}>Duration (Shortest)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('budget')}>Budget (Lowest)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          
            {isGuest && (
              <div className="text-amber-600 text-sm mr-2 flex items-center">
                <Shield className="h-4 w-4 mr-1" />
                <span>Guest mode: {guestPathwayGenerationCount}/{maxGuestPathwayGenerations}</span>
              </div>
            )}
          
            <Button 
              onClick={handleGeneratePathways}
              disabled={generating || hasReachedLimit || isActionLoading}
              className="flex items-center gap-2"
            >
              {generating ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Please wait...</>
              ) : isActionLoading ? (
                 <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Working...</>
              ) : pathways.length === 0 ? (
                 <>Generate Pathways <Sparkles className="ml-2 h-4 w-4" /></>
              ) : (
                 <>Regenerate Pathways <Sparkles className="ml-2 h-4 w-4" /></>
              )}
            </Button>
          </div>
        </div>
        
        {actionError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Action Error</AlertTitle>
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        )}
        
        {isGuest && hasReachedLimit && pathways.length > 0 && (
          <Alert className="bg-amber-50 border-amber-200">
            <Shield className="h-4 w-4" />
            <AlertTitle>Guest limit reached</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>You've reached the limit for generating pathways as a guest.</span>
              <Button size="sm" onClick={() => router.push('/signup')} className="ml-2">
                Sign up for more
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        {isGuest && !hasReachedLimit && pathways.length === 0 && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Guest mode</AlertTitle>
            <AlertDescription>
              You're using Vista as a guest. You can generate pathways {maxGuestPathwayGenerations} time. 
              <Button variant="link" size="sm" className="px-1 h-auto" onClick={() => router.push('/signup')}>
                Sign up to save your progress and generate unlimited pathways.
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {!error && pathways.length === 0 && !isGuest && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>No pathways found</AlertTitle>
            <AlertDescription>
              Generate your first set of education pathways to get started.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {sortedPathways.map((pathway) => (
            <EnhancedPathwayCard 
              key={pathway.id} 
              pathway={pathway}
              isNew={newPathwayIds.includes(pathway.id)}
              programs={programsByPathway[pathway.id] || []}
              isLoadingPrograms={programGenerationLoading[pathway.id] || false}
              programsError={programGenerationError[pathway.id] || null}
              onExplorePrograms={() => handleExplorePrograms(pathway)}
              onToggleFavorite={(programId) => toggleFavorite(pathway.id, programId)}
              onSubmitFeedback={(programId, reason) => submitFeedback(pathway.id, programId, reason)}
              onSelect={() => handleSelectPathway(pathway)}
              onDelete={(feedback) => deletePathway(pathway.id, feedback)}
              isGuest={isGuest}
            />
          ))}
          
          {generating && (
            Array.from({ length: 2 }).map((_, i) => (
              <PathwayCardSkeleton key={`skeleton-${i}`} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function EnhancedPathwayCard({ 
  pathway, 
  programs, 
  isLoadingPrograms, 
  programsError,
  onExplorePrograms, 
  onToggleFavorite,
  onSubmitFeedback,
  onSelect,
  onDelete,
  isGuest,
  isNew
}: { 
  pathway: EducationPathway;
  programs: RecommendationProgram[];
  isLoadingPrograms: boolean;
  programsError: string | null;
  onExplorePrograms: () => void;
  onToggleFavorite: (programId: string) => void;
  onSubmitFeedback: (programId: string, reason: string) => void;
  onSelect: () => void;
  onDelete: (feedback: { reason: string; details?: string }) => void;
  isGuest: boolean;
  isNew: boolean;
}) {
  const filteredPrograms = programs.filter(p => !p.is_deleted);
  const hasPrograms = filteredPrograms.length > 0;
  // Only consider a pathway explored if it has is_explored=true OR it actually has programs
  const isExplored = pathway.is_explored || hasPrograms;
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [feedbackReason, setFeedbackReason] = useState("not_relevant");
  const [feedbackDetails, setFeedbackDetails] = useState("");

  const handleDeleteClick = () => {
    if (isGuest) {
      alert("Please sign up to manage pathways.");
      return;
    }
    setShowFeedbackDialog(true);
  };

  const handleFeedbackSubmit = () => {
    onDelete({ reason: feedbackReason, details: feedbackDetails });
    setShowFeedbackDialog(false);
    // Reset feedback state for next time
    setFeedbackReason("not_relevant");
    setFeedbackDetails("");
  };
  
  return (
    <Card className={`flex flex-col hover:shadow-md transition-shadow relative ${
      isNew ? 'ring-2 ring-green-300 bg-green-50' : ''
    }`}>
      {!isGuest && (
        <AlertDialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
          <AlertDialogTrigger asChild>
            <Button 
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 text-muted-foreground hover:text-red-500 h-7 w-7 z-10"
              title="Not Interested / Remove Pathway"
              onClick={handleDeleteClick} 
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Pathway?</AlertDialogTitle>
              <AlertDialogDescription>
                Why are you removing this pathway? Your feedback helps improve future recommendations.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4 space-y-4">
              <Label htmlFor={`feedback-reason-${pathway.id}`}>Reason</Label>
              <RadioGroup 
                id={`feedback-reason-${pathway.id}`}
                value={feedbackReason}
                onValueChange={setFeedbackReason}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="not_relevant" id={`r1-${pathway.id}`} />
                  <Label htmlFor={`r1-${pathway.id}`}>Not Relevant / Doesn't Fit</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="changed_mind" id={`r2-${pathway.id}`} />
                  <Label htmlFor={`r2-${pathway.id}`}>Changed Mind / Priorities Shifted</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="wrong_field" id={`r3-${pathway.id}`} />
                  <Label htmlFor={`r3-${pathway.id}`}>Wrong Field / Qualification</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="too_general" id={`r4-${pathway.id}`} />
                  <Label htmlFor={`r4-${pathway.id}`}>Too General / Need Specifics</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="other" id={`r5-${pathway.id}`} />
                  <Label htmlFor={`r5-${pathway.id}`}>Other</Label>
                </div>
              </RadioGroup>
              
              <Label htmlFor={`feedback-details-${pathway.id}`}>Additional Details (Optional)</Label>
              <Textarea 
                id={`feedback-details-${pathway.id}`}
                placeholder="Any other comments?"
                value={feedbackDetails}
                onChange={(e) => setFeedbackDetails(e.target.value)}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleFeedbackSubmit} className="bg-red-600 hover:bg-red-700">
                Remove Pathway
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <CardHeader className="pb-2 pr-10">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-lg">{pathway.title}</CardTitle>
          <Badge variant={getQualificationBadgeVariant(pathway.qualification_type)}>
            {pathway.qualification_type}
          </Badge>
        </div>
        <CardDescription className="line-clamp-2">
          {pathway.field_of_study}
          {pathway.subfields && pathway.subfields.length > 0 && (
            <span className="text-muted-foreground"> ({pathway.subfields.join(", ")})</span>
          )}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-grow">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Duration:</span>
            <span className="font-medium">{formatDurationRange(pathway.duration_months)}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Budget:</span>
            <span className="font-medium">{formatBudgetRange(pathway.budget_range_usd)}</span>
          </div>
          
          {pathway.target_regions && pathway.target_regions.length > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Regions:</span>
              <span className="font-medium text-right">{pathway.target_regions.join(", ")}</span>
            </div>
          )}
          
          <p className="mt-3 text-sm line-clamp-3">
            {pathway.alignment_rationale}
          </p>
        </div>
      </CardContent>
      
      <CardFooter className="pt-2 flex justify-between">
        {!isExplored ? (
          <Button 
            onClick={onExplorePrograms} 
            disabled={isLoadingPrograms}
            className="w-full"
          >
            {isLoadingPrograms ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Finding Programs...
              </>
            ) : (
              <>
                Explore Programs
                <ChevronRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        ) : (
          <Button 
            onClick={onSelect} 
            variant="outline" 
            className="w-full"
          >
            View Details
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </CardFooter>
      
      {isExplored && (
        <div className="px-6 pb-6">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="programs">
              <AccordionTrigger className="py-2">
                <span className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  {filteredPrograms.length} Programs
                </span>
              </AccordionTrigger>
              <AccordionContent>
                {isLoadingPrograms ? (
                  <div className="space-y-4 mt-2">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                ) : filteredPrograms.length > 0 ? (
                  <div className="space-y-4 mt-2">
                    {filteredPrograms.map((program) => (
                      <ProgramCard 
                        key={program.id} 
                        program={program} 
                        onToggleFavorite={() => program.id && onToggleFavorite(program.id)}
                        onSubmitFeedback={(reason) => program.id && onSubmitFeedback(program.id, reason)}
                        onDeleteProgram={() => {
                          const pathwayStore = usePathwayStore.getState();
                          program.id && pathwayStore.deleteProgram(pathway.id, program.id);
                        }}
                        isGuest={isGuest}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="py-4 text-center">
                    <p className="text-muted-foreground">No programs found for this pathway.</p>
                    <Button 
                      onClick={onExplorePrograms} 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                    >
                      Generate New Programs
                    </Button>
                  </div>
                )}

                {programsError && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{programsError}</AlertDescription>
                  </Alert>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      )}
    </Card>
  );
}

function ProgramCard({ 
  program, 
  onToggleFavorite, 
  onSubmitFeedback,
  onDeleteProgram,
  isGuest
}: { 
  program: RecommendationProgram;
  onToggleFavorite: () => void;
  onSubmitFeedback: (reason: string) => void;
  onDeleteProgram: () => void;
  isGuest: boolean;
}) {
  // Initialize showFeedbackOptions based on whether feedback is already submitted
  const [showFeedbackOptions, setShowFeedbackOptions] = useState(false);
  const [feedbackReason, setFeedbackReason] = useState(program.feedbackReason || "not_relevant");
  const [showScholarships, setShowScholarships] = useState(false);
  const router = useRouter();
  
  const hasScholarships = program.scholarships && program.scholarships.length > 0;
  const hasFeedback = program.feedbackNegative === true;
  
  const handleToggleFavorite = () => {
    if (isGuest) {
      alert("Please sign up to save favorites.");
      return;
    }
    onToggleFavorite();
  };
  
  const handleSubmitFeedback = (reason: string) => {
    if (isGuest) {
      alert("Please sign up to submit feedback.");
      return;
    }
    onSubmitFeedback(reason);
  };
  
  const handleDeleteProgram = () => {
    if (isGuest) {
      alert("Please sign up to manage programs.");
      return;
    }
    onDeleteProgram();
  };
  
  const handleAskAI = () => {
    if (!program) return;
    
    // Simple navigation to chat with a program query param
    // This can be enhanced later with more context passing
    router.push('/chat'); // Navigate to chat page
  };
  
  return (
    <Card className="w-full">
      <div className="p-3">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-medium text-sm">{program.name}</h4>
            <p className="text-xs text-muted-foreground">{program.institution}</p>
          </div>
          <Badge variant="outline" className="text-xs">
            {program.degreeType}
          </Badge>
        </div>
        
        <div className="mt-2 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Duration:</span>
            <span>{program.duration} months</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cost:</span>
            <span>{formatCurrency(program.costPerYear)}/year</span>
          </div>
          {program.location && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Location:</span>
              <span>{program.location}</span>
            </div>
          )}
          
          {/* Scholarship info button - only show if scholarships are available */}
          {hasScholarships && (
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-muted-foreground flex items-center">
                <span>Scholarships:</span>
                <Badge variant="secondary" className="text-xs ml-1 py-0 px-1">{program.scholarships?.length || 0}</Badge>
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-5 px-2 text-xs" 
                onClick={() => setShowScholarships(!showScholarships)}
              >
                {showScholarships ? 'Hide' : 'View'}
              </Button>
            </div>
          )}
          
          {/* Scholarship details section */}
          {showScholarships && hasScholarships && (
            <div className="mt-1 border-t pt-1">
              <p className="text-xs font-medium mb-1">Available Scholarships:</p>
              <div className="space-y-2">
                {program.scholarships?.map((scholarship, idx) => (
                  <div key={idx} className="bg-muted/30 p-1 rounded text-xs">
                    <div className="font-medium">{scholarship.name}</div>
                    {scholarship.amount && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Amount:</span>
                        <span>{scholarship.amount}</span>
                      </div>
                    )}
                    {scholarship.eligibility && (
                      <div className="text-muted-foreground text-xs mt-0.5">
                        <span>Eligibility: </span>
                        <span>{scholarship.eligibility}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Accordion for More Details */}
          <Accordion type="single" collapsible className="w-full mt-2">
            <AccordionItem value="details" className="border-b-0">
              <AccordionTrigger className="py-1 text-xs font-medium text-blue-600 hover:no-underline">
                Show Program Details
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2 text-xs">
                  {/* Match Rationale */}
                  {program.matchRationale && (
                    <div>
                      <h5 className="font-medium mb-1 flex items-center"><TrendingUp className="h-3 w-3 mr-1" /> Match Rationale</h5>
                      <div className="space-y-1 pl-2">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center"><GraduationCap className="h-3 w-3 mr-1" /> Academic Fit:</span>
                          <span className="font-semibold">{program.matchRationale.academicFit || 0}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center"><TrendingUp className="h-3 w-3 mr-1" /> Career Alignment:</span>
                          <span className="font-semibold">{program.matchRationale.careerAlignment || 0}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center"><Wallet className="h-3 w-3 mr-1" /> Budget Fit:</span>
                          <span className="font-semibold">{program.matchRationale.budgetFit || 0}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center"><MapPin className="h-3 w-3 mr-1" /> Location Match:</span>
                          <span className="font-semibold">{program.matchRationale.locationMatch || 0}%</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Highlights */}
                  {program.highlights && program.highlights.length > 0 && (
                    <div>
                      <h5 className="font-medium mb-1 flex items-center"><Star className="h-3 w-3 mr-1" /> Highlights</h5>
                      <ul className="list-disc pl-5 space-y-0.5">
                        {program.highlights.map((h, i) => <li key={i}>{h}</li>)}
                      </ul>
                    </div>
                  )}

                  {/* Requirements */}
                  {program.requirements && program.requirements.length > 0 && (
                    <div>
                      <h5 className="font-medium mb-1 flex items-center"><ListChecks className="h-3 w-3 mr-1" /> Requirements</h5>
                      <ul className="list-disc pl-5 space-y-0.5">
                        {program.requirements.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                  )}

                  {/* Application Deadline */}
                  {program.applicationDeadline && (
                    <div className="flex items-center justify-between pt-1 border-t mt-2">
                       <span className="flex items-center"><Calendar className="h-3 w-3 mr-1" /> Application Deadline:</span>
                       <span className="font-semibold">{program.applicationDeadline}</span>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Match Score Indicator - moved outside accordion */}
          {program.matchScore && (
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs text-muted-foreground">Match:</span>
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Award key={i} 
                    className={`h-3 w-3 ${i < Math.round(program.matchScore / 20) 
                      ? 'text-yellow-500 fill-current' // Use fill-current for solid stars
                      : 'text-muted-foreground/20'
                    }`} 
                  />
                ))}
              </div>
              <span className="text-xs font-medium">{program.matchScore}%</span>
            </div>
          )}
        </div>
        
        <div className="flex justify-between mt-3">
          <Button 
            variant="outline"
            size="icon"
            className={program.isFavorite ? "text-red-500" : ""}
            title={isGuest ? "Sign up to save favorites" : (program.isFavorite ? "Remove from favorites" : "Add to favorites")}
            onClick={handleToggleFavorite}
          >
            {isGuest ? <Lock className="h-4 w-4" /> : <ThumbsUp className="h-4 w-4" />}
          </Button>
          
          {!showFeedbackOptions && !hasFeedback ? (
            <Button 
              variant="outline"
              size="icon"
              title={isGuest ? "Sign up to provide feedback" : "Not interested"}
              onClick={() => {
                if (isGuest) {
                  alert("Please sign up to submit feedback.");
                  return;
                }
                setShowFeedbackOptions(true);
              }}
            >
              {isGuest ? <Lock className="h-4 w-4" /> : <ThumbsDown className="h-4 w-4" />}
            </Button>
          ) : hasFeedback ? (
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs">
                <ThumbsDown className="h-3 w-3 mr-1" />
                {program.feedbackReason || "Not interested"}
              </Badge>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <select 
                className="text-xs h-7 px-1 rounded border"
                value={feedbackReason}
                onChange={(e) => setFeedbackReason(e.target.value)}
              >
                <option value="not_relevant">Not Relevant</option>
                <option value="too_expensive">Too Expensive</option>
                <option value="wrong_location">Wrong Location</option>
                <option value="other">Other</option>
              </select>
              <Button 
                variant="outline" 
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  handleSubmitFeedback(feedbackReason);
                  setShowFeedbackOptions(false);
                }}
              >
                Submit
              </Button>
            </div>
          )}
          
          <Button 
            variant="outline"
            size="icon"
            className="text-muted-foreground hover:text-red-500"
            title={isGuest ? "Sign up to remove programs" : "Remove this program suggestion"}
            onClick={handleDeleteProgram}
          >
            {isGuest ? <Lock className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        </div>

        {/* Actions Row 2: Ask AI, Explore Program */}
        <div className="flex justify-between items-center mt-2 pt-2 border-t">
           <Button 
             variant="ghost" 
             size="sm"
             className="text-xs h-7 px-2"
             onClick={handleAskAI}
             title="Ask AI assistant about this program"
           >
             <MessageSquare className="h-3 w-3 mr-1" /> Ask AI
           </Button>

           {program.pageLink ? (
             <Button 
               variant="outline" 
               size="sm"
               className="text-xs h-7 px-2"
               onClick={() => window.open(program.pageLink, "_blank")}
               title={`Visit program page at ${program.institution}`}
             >
               Explore Program <ExternalLink className="h-3 w-3 ml-1" />
             </Button>
           ) : (
             <Button 
               variant="outline" 
               size="sm"
               className="text-xs h-7 px-2"
               disabled
               title="No program link available"
             >
               Explore Program <ExternalLink className="h-3 w-3 ml-1" />
             </Button>
           )}
        </div>

      </div>
    </Card>
  );
}

function PathwayCardSkeleton() {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-5 w-20" />
        </div>
        <Skeleton className="h-4 w-full mt-2" />
      </CardHeader>
      
      <CardContent className="flex-grow">
        <div className="space-y-3">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/4" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/3" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-16 w-full mt-2" />
          {/* Add skeleton for accordion trigger */}
          <Skeleton className="h-6 w-1/3 mt-2" /> 
        </div>
      </CardContent>
      
      <CardFooter className="pt-2">
        <Skeleton className="h-10 w-full" />
      </CardFooter>
    </Card>
  );
}

function PathwaysLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-40" />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <PathwayCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

// Helper functions
function getQualificationBadgeVariant(type: string) {
  const map: Record<string, "default" | "secondary" | "outline"> = {
    "Bachelor's Degree": "default",
    "Master's Degree": "secondary",
    "Certificate": "outline",
    "Diploma": "outline",
    "Associate Degree": "outline",
    "Doctoral Degree": "secondary",
    "Professional Certification": "default",
  };
  
  return map[type] || "default";
}

function formatBudgetRange(budget?: { min?: number, max?: number } | null) {
  if (!budget || budget.min === undefined || budget.max === undefined) return "Not specified";
  
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
  
  return `${formatter.format(budget.min)} - ${formatter.format(budget.max)}`;
}

function formatCurrency(amount?: number | null) {
  if (amount === undefined || amount === null) return "Not specified";
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDurationRange(duration?: number | { min?: number, max?: number } | null): string {
  if (!duration) return "Not specified";

  // Handle the case where it's directly a number (from old data?)
  if (typeof duration === 'number') {
    return `${duration} months`;
  }

  // Handle the object structure { min, max }
  if (typeof duration === 'object') {
    const min = duration.min;
    const max = duration.max;

    if (min !== undefined && max !== undefined) {
      if (min === max) {
        return `${min} months`;
      }
      return `${min} - ${max} months`;
    }
    // Handle cases where only min or max might be defined (less likely but possible)
    if (min !== undefined) return `From ${min} months`;
    if (max !== undefined) return `Up to ${max} months`;
  }

  return "Invalid duration format";
} 