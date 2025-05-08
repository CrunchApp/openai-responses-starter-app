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
  Globe,
  FilterX,
  Search
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
import SignupModal from "@/app/auth/SignupModal";
import useProfileStore from "@/stores/useProfileStore";
import { UserProfile } from "@/app/types/profile-schema";
import { useToast } from "@/hooks/use-toast";
import { RECOMMENDATION_STAGES_ENHANCED } from '@/components/recommendations/RecommendationProgressModal';
import { list_user_applications } from '@/config/functions';
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

// Define ProgressStage type from modal stages
type ProgressStage = typeof RECOMMENDATION_STAGES_ENHANCED[number];

export function PathwayExplorer({ 
  userProfile, 
  applicationMap,
  onSelectPathway,
  onStartGeneration,
  onStopGeneration
}: { 
  userProfile: any;
  applicationMap?: Record<string, string>;
  onSelectPathway?: (pathway: EducationPathway) => void;
  onStartGeneration?: (stages: ProgressStage[], timings: number[]) => void;
  onStopGeneration?: (success: boolean) => void;
}) {
  const router = useRouter();
  const { user, loading: authLoading, refreshSession } = useAuth();
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
  const { profileData: guestProfileData } = useProfileStore();
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);
  const [isConvertingGuest, setIsConvertingGuest] = useState(false);
  
  const [generating, setGenerating] = useState(false);
  const [newPathwayIds, setNewPathwayIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('default');
  const isGuest = !user && !authLoading;
  const hasReachedLimit = isGuest && hasReachedGuestLimit();
  
  // Toast for user feedback
  const { toast } = useToast();
  
  // Note: Pathway synchronization is now handled by AuthSynchronizer component
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [filterQualification, setFilterQualification] = useState<string | undefined>(undefined);
  const [filterRegion, setFilterRegion] = useState<string | undefined>(undefined);
  
  const [allPathwaysForDefaults, setAllPathwaysForDefaults] = useState<EducationPathway[]>([]);

  useEffect(() => {
    // Keep a copy of all pathways to derive min/max for sliders
    if (pathways.length > 0) {
      setAllPathwaysForDefaults(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const newPathways = pathways.filter(p => !existingIds.has(p.id));
        return [...prev, ...newPathways];
      });
    }
  }, [pathways]);

  const defaultDurationRange = React.useMemo<[number, number]>(() => {
    if (allPathwaysForDefaults.length === 0) return [0, 60];
    const durations = allPathwaysForDefaults.map(p => p.duration_months).filter(d => typeof d === 'number');
    return [Math.min(0, ...durations), Math.max(60, ...durations)];
  }, [allPathwaysForDefaults]);

  const defaultBudgetRange = React.useMemo<[number, number]>(() => {
    if (allPathwaysForDefaults.length === 0) return [0, 100000];
    const budgets = allPathwaysForDefaults.map(p => (p.budget_range_usd as { min: number; max: number })?.min).filter(b => typeof b === 'number');
    const minB = budgets.length > 0 ? Math.min(0, ...budgets) : 0;
    const maxB = budgets.length > 0 ? Math.max(100000, ...budgets) : 100000;
    return [minB, maxB];
  }, [allPathwaysForDefaults]);

  // Initialize with defaultDurationRange (assert as tuple)
  const [durationRangeFilter, setDurationRangeFilter] = useState<[number, number]>(defaultDurationRange as [number, number]);
  // Initialize with defaultBudgetRange (assert as tuple)
  const [budgetRangeFilter, setBudgetRangeFilter] = useState<[number, number]>(defaultBudgetRange as [number, number]);

  useEffect(() => {
    // Update durationRangeFilter when defaultDurationRange changes
    setDurationRangeFilter(defaultDurationRange as [number, number]);
  }, [defaultDurationRange]);

  useEffect(() => {
    // Update budgetRangeFilter when defaultBudgetRange changes
    setBudgetRangeFilter(defaultBudgetRange as [number, number]);
  }, [defaultBudgetRange]);
  
  // Compute filtered lists for filtering UI
  const qualifications = React.useMemo(() => Array.from(new Set(pathways.map(p => p.qualification_type))).sort(), [pathways]);
  const regions = React.useMemo(() => Array.from(new Set(pathways.flatMap(p => p.target_regions || []))).sort(), [pathways]);
  
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
  
  // Normalize selected duration range (min <= max)
  const [durationMinSel, durationMaxSel] = React.useMemo<[number, number]>(
    () => [Math.min(...durationRangeFilter), Math.max(...durationRangeFilter)],
    [durationRangeFilter]
  );
  
  // Filter pathways based on search and filters
  const filteredPathways = React.useMemo(() => {
    return sortedPathways.filter(p => {
      // Text search
      if (searchTerm && !p.title.toLowerCase().includes(searchTerm.toLowerCase()) && !p.field_of_study.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      // Qualification filter
      if (filterQualification && p.qualification_type !== filterQualification) return false;
      // Region filter
      if (filterRegion && (!p.target_regions || !p.target_regions.includes(filterRegion))) return false;
      // Duration filter: derive min/max and apply range-overlap
      const rawDur = (p as any).duration_months;
      let pMinD: number;
      let pMaxD: number;
      if (typeof rawDur === 'number') {
        pMinD = rawDur;
        pMaxD = rawDur;
      } else if (rawDur && typeof rawDur === 'object') {
        const hasMin = typeof rawDur.min === 'number';
        const hasMax = typeof rawDur.max === 'number';
        pMinD = hasMin ? rawDur.min : (hasMax ? rawDur.max : 0);
        pMaxD = hasMax ? rawDur.max : (hasMin ? rawDur.min : 0);
      } else if (typeof rawDur === 'string') {
        try {
          const parsed = JSON.parse(rawDur);
          if (typeof parsed === 'number') {
            pMinD = parsed;
            pMaxD = parsed;
          } else if (parsed && typeof parsed === 'object') {
            pMinD = typeof parsed.min === 'number' ? parsed.min : 0;
            pMaxD = typeof parsed.max === 'number' ? parsed.max : 0;
          } else {
            pMinD = 0;
            pMaxD = 0;
          }
        } catch {
          const num = parseFloat(rawDur);
          pMinD = isNaN(num) ? 0 : num;
          pMaxD = pMinD;
        }
      } else {
        pMinD = 0;
        pMaxD = 0;
      }
      // Exclude if there's no overlap between pathway duration [pMinD,pMaxD] and selected [durationMinSel,durationMaxSel]
      if (pMaxD < durationMinSel || pMinD > durationMaxSel) return false;
      // Budget range overlap filter: pathway budget range [minB,maxB] must overlap selected [minSel,maxSel]
      const pr = p.budget_range_usd as { min: number; max: number };
      const pMinB = pr.min;
      const pMaxB = pr.max;
      // Budget filter: normalize selected range
      const budgetMinSel = Math.min(...budgetRangeFilter);
      const budgetMaxSel = Math.max(...budgetRangeFilter);
      if (pMaxB < budgetMinSel || pMinB > budgetMaxSel) return false;
      return true;
    });
  }, [sortedPathways, searchTerm, filterQualification, filterRegion, durationMinSel, durationMaxSel, budgetRangeFilter]);
  
  // Show loading state when initial load or auth is loading
  if (isLoading || authLoading) {
    return <PathwaysLoadingSkeleton />;
  }
  
  const handleGeneratePathways = async () => {
    if (!userProfile) {
      const msg = "User profile is required to generate pathways. Please complete your profile first.";
      setError(msg);
      toast({ title: "Incomplete Profile", description: msg, variant: "destructive" });
      return;
    }
    
    // Start progress modal if callback provided
    if (onStartGeneration) {
      // Show pathway generation stages
      const pathwayStages = RECOMMENDATION_STAGES_ENHANCED.slice(0, 3);
      const pathwayTimings = [1000, 3500, 500];
      onStartGeneration(pathwayStages, pathwayTimings);
    }
    
    // Check if guest has reached limit
    if (isGuest && hasReachedLimit) {
      const msg = "You've reached the limit for generating pathways as a guest. Please sign up to generate more.";
      setError(msg);
      toast({ title: "Guest Limit Reached", description: msg, variant: "destructive" });
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
          toast({ title: "Generation Error", description: morePathwaysResult.error, variant: "destructive" });
          if (onStopGeneration) onStopGeneration(false);
          return;
        }
        
        if (morePathwaysResult.pathways && morePathwaysResult.pathways.length > 0) {
          setNewPathwayIds(morePathwaysResult.pathways.map(p => p.id));
          toast({ title: "Recommendations Updated", description: `Added ${morePathwaysResult.pathways.length} more pathways.`, variant: "default" });
        } else {
          const msg = "No new pathways were generated. Please try again.";
          setError(msg);
          toast({ title: "No New Pathways", description: msg, variant: "destructive" });
        }
      } else {
        // First-time generation or guest user - use the original method
        const result = await generateEducationPathways(userProfile.vector_store_id || '', userProfile);
        
        if (result.error) {
          setError(result.error);
          toast({ title: "Generation Error", description: result.error, variant: "destructive" });
          if (onStopGeneration) onStopGeneration(false);
          return;
        }
        
        if (result.pathways && result.pathways.length > 0) {
          setPathways(result.pathways);
          setNewPathwayIds(result.pathways.map(p => p.id));
          toast({ title: "Recommendations Ready", description: `Generated ${result.pathways.length} pathways for you.`, variant: "default" });
        } else {
          const msg = "No pathways were generated. Please try again.";
          setError(msg);
          toast({ title: "No Pathways", description: msg, variant: "destructive" });
        }
      }
    } catch (err) {
      console.error("Error generating pathways:", err);
      const msg = "Failed to generate pathways. Please try again later.";
      setError(msg);
      toast({ title: "Generation Failed", description: msg, variant: "destructive" });
    } finally {
      setGenerating(false);
      // Stop progress modal with success state
      if (onStopGeneration) onStopGeneration(!error);
      // Clear new pathway IDs after a short delay
      setTimeout(() => setNewPathwayIds([]), 5000); 
    }
  };
  
  const handleExplorePrograms = async (pathway: EducationPathway) => {
    // Only proceed if not already loading programs for this pathway
    if (programGenerationLoading[pathway.id]) {
      return;
    }
    
    // Start progress modal for program exploration
    let programSuccess = true;
    if (onStartGeneration) {
      const programStages = RECOMMENDATION_STAGES_ENHANCED.slice(3, 6);
      const programTimings = [15000, 25000, 45000];
      onStartGeneration(programStages, programTimings);
    }
    
    // Set loading state for this specific pathway
    setProgramGenerationLoading(pathway.id, true);
    
    try {
      const result = await exploreProgramsAction(pathway.id);
      
      if (!result.success || result.error) {
        console.error(`Error exploring programs for pathway ${pathway.id}:`, result.error);
        programSuccess = false;
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
      programSuccess = false;
      setProgramGenerationError(
        pathway.id, 
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      // Clear loading and stop modal
      setProgramGenerationLoading(pathway.id, false);
      if (onStopGeneration) onStopGeneration(programSuccess);
    }
  };
  
  const handleSelectPathway = (pathway: EducationPathway) => {
    // Navigate to the dedicated pathway details page
    router.push(`/recommendations/pathway/${pathway.id}`);
  };
  
  const handleGuestSignupClick = () => {
    if (!userProfile) {
      // If guest profile is missing, route to wizard
      console.log("Guest profile missing, routing to wizard.");
      router.push('/profile-wizard');
    } else {
      // If guest profile exists, open signup modal for conversion
      console.log("Guest profile found, opening signup modal.");
      setIsSignupModalOpen(true);
    }
  };

  const handleGuestSignupComplete = async (userId?: string) => {
    setIsSignupModalOpen(false);
    if (!userId) {
      console.log("Signup skipped or failed.");
      return; 
    }

    setIsConvertingGuest(true);
    console.log("Starting guest conversion from PathwayExplorer for user:", userId);

    try {
      // Get guest data from stores
      const profileToConvert = guestProfileData || {} as UserProfile;
      const { pathways: guestPathways, programsByPathway: guestPrograms } = usePathwayStore.getState();

      const conversionResponse = await fetch('/api/auth/convert-guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          profileData: profileToConvert,
          pathways: guestPathways || [],
          programsByPathway: guestPrograms || {},
        }),
      });

      if (!conversionResponse.ok) {
        const errorData = await conversionResponse.json();
        throw new Error(errorData.error || 'Failed to convert guest data.');
      }

      console.log("Guest conversion successful from PathwayExplorer for user:", userId);

      // Clear guest data from local storage and stores
      localStorage.removeItem('userProfileData'); 
      localStorage.removeItem('vista-profile-storage'); // Assuming this is used by profile store
      localStorage.removeItem('pathway-store'); // Assuming this is used by pathway store
      
      // Clear Zustand stores
      useProfileStore.getState().clearStore();
      usePathwayStore.getState().clearStore();

      await refreshSession(); // Refresh auth state to log the user in

    } catch (error) {
      console.error("Error during guest conversion from PathwayExplorer:", error);
      alert(`Failed to save your data during signup: ${error instanceof Error ? error.message : String(error)}`);
      // Potentially add more robust error handling for the user
    } finally {
      setIsConvertingGuest(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <SignupModal
        isOpen={isSignupModalOpen}
        onClose={() => setIsSignupModalOpen(false)}
        onComplete={handleGuestSignupComplete}
        isLoading={isConvertingGuest}
        profileData={guestProfileData || {} as UserProfile}
      />

      <div className="flex flex-col space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Your Education Pathways</h2>
          
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search and filter controls */}
            <Card className="p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                {/* Col 1: Search & Main Filters */}
                <div className="space-y-3 lg:col-span-1">
                   <Label htmlFor="search-pathways" className="flex items-center text-sm font-medium text-muted-foreground">
                      <Search className="h-4 w-4 mr-2 text-sky-600"/>
                      Search Pathways
                  </Label>
                  <Input
                    id="search-pathways"
                    placeholder="Enter keywords (e.g., Fintech, Data Science)"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                          <Label htmlFor="filter-qualification" className="flex items-center text-xs font-medium text-muted-foreground mb-1">
                              <GraduationCap className="h-3.5 w-3.5 mr-1.5 text-sky-600"/>
                              Qualification
                          </Label>
                          <Select onValueChange={(val) => setFilterQualification(val === 'all' ? undefined : val)} value={filterQualification ?? 'all'}>
                              <SelectTrigger id="filter-qualification" className="w-full">
                              <SelectValue placeholder="All Qualifications" />
                              </SelectTrigger>
                              <SelectContent>
                              <SelectItem value="all">All Qualifications</SelectItem>
                              {qualifications.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
                              </SelectContent>
                          </Select>
                      </div>
                      <div>
                          <Label htmlFor="filter-region" className="flex items-center text-xs font-medium text-muted-foreground mb-1">
                              <Globe className="h-3.5 w-3.5 mr-1.5 text-sky-600"/>
                              Region
                          </Label>
                          <Select onValueChange={(val) => setFilterRegion(val === 'all' ? undefined : val)} value={filterRegion ?? 'all'}>
                              <SelectTrigger id="filter-region" className="w-full">
                              <SelectValue placeholder="All Regions" />
                              </SelectTrigger>
                              <SelectContent>
                              <SelectItem value="all">All Regions</SelectItem>
                              {regions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                              </SelectContent>
                          </Select>
                      </div>
                  </div>
                </div>

                {/* Col 2: Range Sliders */}
                <div className="space-y-4 lg:col-span-1">
                  <div>
                      <Label htmlFor="filter-duration" className="flex items-center text-xs font-medium text-muted-foreground mb-2">
                          <Calendar className="h-3.5 w-3.5 mr-1.5 text-sky-600"/>
                          Duration (Months): <span className="font-semibold ml-1">{`${durationRangeFilter[0]} - ${durationRangeFilter[1]}`}</span>
                      </Label>
                      <Slider
                          id="filter-duration"
                          min={defaultDurationRange[0]}
                          max={defaultDurationRange[1]}
                          step={1}
                          value={durationRangeFilter}
                          onValueChange={(value) => setDurationRangeFilter(value as [number, number])}
                          className="w-full"
                      />
                  </div>
                  <div>
                      <Label htmlFor="filter-budget" className="flex items-center text-xs font-medium text-muted-foreground mb-2">
                          <Wallet className="h-3.5 w-3.5 mr-1.5 text-sky-600"/>
                          Budget (USD): <span className="font-semibold ml-1">{`$${budgetRangeFilter[0].toLocaleString()} - $${budgetRangeFilter[1].toLocaleString()}`}</span>
                      </Label>
                      <Slider
                          id="filter-budget"
                          min={defaultBudgetRange[0]}
                          max={defaultBudgetRange[1]}
                          step={1000}
                          value={budgetRangeFilter}
                          onValueChange={(value) => setBudgetRangeFilter(value as [number, number])}
                          className="w-full"
                      />
                  </div>
                </div>

                {/* Col 3: Actions */}
                <div className="flex flex-col justify-end space-y-2 lg:col-span-1">
                  <Button variant="outline" size="sm" onClick={() => {
                    setSearchTerm("");
                    setFilterQualification(undefined);
                    setFilterRegion(undefined);
                    // Reset sliders to defaults (assert as tuple)
                    setDurationRangeFilter(defaultDurationRange as [number, number]);
                    setBudgetRangeFilter(defaultBudgetRange as [number, number]);
                  }} className="w-full flex items-center">
                    <FilterX className="h-4 w-4 mr-2"/> Clear Filters
                  </Button>
            {isGuest && (
                    <div className="text-amber-600 text-xs text-center p-1.5 bg-amber-50 border border-amber-200 rounded-md flex items-center justify-center">
                      <Shield className="h-3.5 w-3.5 mr-1" />
                      <span>Guest: {guestPathwayGenerationCount}/{maxGuestPathwayGenerations}</span>
              </div>
            )}
                  <Button onClick={handleGeneratePathways} disabled={generating || hasReachedLimit || isActionLoading} className="w-full flex items-center">
                    {generating ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Please wait...</>) 
                      : isActionLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Working...</>) 
                      : pathways.length === 0 ? (<>Generate Pathways <Sparkles className="ml-2 h-4 w-4" /></>) 
                      : (<>Generate More <Sparkles className="ml-2 h-4 w-4" /></>)} 
            </Button>
                </div>
              </div>
            </Card>
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
              <Button 
                size="sm" 
                onClick={handleGuestSignupClick} 
                className="ml-2"
                disabled={isConvertingGuest || isSignupModalOpen}
              >
                {isConvertingGuest ? 'Saving...' : 'Sign up for more'}
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
              <Button 
                variant="link" 
                size="sm" 
                className="px-1 h-auto" 
                onClick={handleGuestSignupClick}
                disabled={isConvertingGuest || isSignupModalOpen}
              >
                {isConvertingGuest ? 'Saving...' : 'Sign up to save your progress and generate unlimited pathways.'}
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
          {filteredPathways.map((pathway) => (
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
                Explore Relevant Programs
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