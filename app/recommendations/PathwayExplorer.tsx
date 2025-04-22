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
  GraduationCap,
  CheckCircle2,
  BanknoteIcon,
  Globe
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
    // Navigate to the dedicated pathway details page
    router.push(`/recommendations/pathway/${pathway.id}`);
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
            {/* Sort Dropdown - Enhanced */} 
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex items-center gap-1.5 min-w-[140px] group transition-colors"
                >
                  <span className="text-muted-foreground text-xs mr-1">Sort:</span>
                  <span className="font-medium">{sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}</span>
                  <ChevronDown className="h-4 w-4 ml-auto text-muted-foreground group-data-[state=open]:rotate-180 transition-transform duration-200" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px] animate-in fade-in-40 zoom-in-95 duration-200">
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Sort Pathways By</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => setSortBy('default')}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <span className={sortBy === 'default' ? "font-medium" : ""}>
                    Default Order
                  </span>
                  {sortBy === 'default' && <CheckCircle2 className="h-4 w-4 ml-auto text-green-500" />}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setSortBy('duration')}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <span className={sortBy === 'duration' ? "font-medium" : ""}>
                    Duration (Shortest First)
                  </span>
                  {sortBy === 'duration' && <CheckCircle2 className="h-4 w-4 ml-auto text-green-500" />}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setSortBy('budget')}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <span className={sortBy === 'budget' ? "font-medium" : ""}>
                    Budget (Lowest First)
                  </span>
                  {sortBy === 'budget' && <CheckCircle2 className="h-4 w-4 ml-auto text-green-500" />}
                </DropdownMenuItem>
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
                 <>Generate More Pathways <Sparkles className="ml-2 h-4 w-4" /></>
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
    <Card className={`flex flex-col hover:shadow-md transition-all duration-200 group relative ${
      isNew ? 'ring-2 ring-green-400 bg-green-50/60 animate-pulse' : ''
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

      <CardHeader className="pb-3 pr-10">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-lg font-bold text-blue-900">{pathway.title}</CardTitle>
          <Badge 
            variant={getQualificationBadgeVariant(pathway.qualification_type)}
            className="transition-all duration-200 group-hover:bg-blue-100"
          >
            {pathway.qualification_type}
          </Badge>
        </div>
        <CardDescription className="line-clamp-2 mt-1 text-sm">
          <span className="text-zinc-700 font-medium">{pathway.field_of_study}</span>
          {pathway.subfields && pathway.subfields.length > 0 && (
            <span className="text-muted-foreground text-xs"> ({pathway.subfields.join(", ")})</span>
          )}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-grow pb-3">
        <div className="bg-slate-50 p-3 rounded-md space-y-2.5 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground flex items-center">
              <Calendar className="h-3.5 w-3.5 mr-1.5 text-blue-500" />
              <span>Duration:</span>
            </span>
            <span className="font-medium">{formatDurationRange(pathway.duration_months)}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground flex items-center">
              <BanknoteIcon className="h-3.5 w-3.5 mr-1.5 text-green-500" />
              <span>Budget:</span>
            </span>
            <span className="font-medium">{formatBudgetRange(pathway.budget_range_usd)}</span>
          </div>
          
          {pathway.target_regions && pathway.target_regions.length > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center">
                <Globe className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
                <span>Regions:</span>
              </span>
              <span className="font-medium text-right max-w-[60%] truncate" title={pathway.target_regions.join(", ")}>
                {pathway.target_regions.join(", ")}
              </span>
            </div>
          )}
        </div>
        
        <div className="relative pt-1">
          <h4 className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center">
            <Info className="h-3.5 w-3.5 mr-1 text-blue-500" /> 
            Alignment Rationale
          </h4>
          <div className="text-sm relative">
            <p className="line-clamp-3 group-hover:line-clamp-none transition-all duration-300">
              {pathway.alignment_rationale}
            </p>
            <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-white to-transparent group-hover:opacity-0 transition-opacity duration-300"></div>
          </div>
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
            className="w-full transition-all duration-200 hover:bg-blue-50 hover:text-blue-600 group"
          >
            View Programs
            <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

function PathwayCardSkeleton() {
  return (
    <Card className="h-full flex flex-col overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-100/70 to-transparent skeleton-pulse transform translate-x-[-100%]" />
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <Skeleton className="h-6 w-3/4 rounded-md" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-4 w-full mt-2 rounded-md" />
      </CardHeader>
      
      <CardContent className="flex-grow">
        <div className="space-y-4">
          <div className="bg-muted/40 p-3 rounded-md space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-1/4 rounded-md" />
              <Skeleton className="h-4 w-1/4 rounded-md" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-4 w-1/4 rounded-md" />
              <Skeleton className="h-4 w-1/3 rounded-md" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-4 w-1/4 rounded-md" />
              <Skeleton className="h-4 w-1/2 rounded-md" />
            </div>
          </div>
          <Skeleton className="h-20 w-full mt-2 rounded-md" />
        </div>
      </CardContent>
      
      <CardFooter className="pt-2 pb-4">
        <Skeleton className="h-10 w-full rounded-md" />
      </CardFooter>
    </Card>
  );
}

function PathwaysLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 rounded-md" />
          <Skeleton className="h-4 w-40 rounded-md" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-36 rounded-md" />
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {Array.from({ length: 3 }).map((_, i) => (
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