"use client";
import React, { useMemo, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import usePathwayStore from "@/stores/usePathwayStore";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft, BookOpen, Award, Calendar, MapPin, Wallet, Loader2, RefreshCw, BadgeDollarSign, Percent, FilterX, Search as SearchIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProgramCard } from "./_components/ProgramCard";
import { useAuth } from "@/app/components/auth/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import useProfileStore from "@/stores/useProfileStore";
import { list_user_applications } from "@/config/functions";
import { RecommendationProgram } from "@/app/recommendations/types";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

// --- Helpers (to be moved/refactored from PathwayExplorer) ---
function formatCurrency(amount?: number | null) {
  if (amount === undefined || amount === null) return "Not specified";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
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

  if (typeof duration === 'number') {
    return `${duration} months`;
  }

  if (typeof duration === 'object') {
    const min = duration.min;
    const max = duration.max;

    if (min !== undefined && max !== undefined) {
      if (min === max) {
        return `${min} months`;
      }
      return `${min} - ${max} months`;
    }
    if (min !== undefined) return `From ${min} months`;
    if (max !== undefined) return `Up to ${max} months`;
  }

  return "Invalid duration format";
}

// Loading skeleton component for programs
function ProgramLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="w-full overflow-hidden">
          <div className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <Skeleton className="h-5 w-48 mb-2" />
                <Skeleton className="h-4 w-36 mb-2" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
            
            <div className="mt-4 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            
            <div className="flex justify-between mt-4 pt-3">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export default function PathwayDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const pathwayId = params?.id as string;
  const { 
    pathways, 
    programsByPathway, 
    programGenerationLoading, 
    programGenerationError,
    moreProgramsLoading,
    moreProgramsError,
    getMorePrograms,
    syncProgramsForPathway,
    syncWithSupabase,
  } = usePathwayStore();
  const { user } = useAuth();

  // Ensure pathways are refreshed to include latest program response ID
  useEffect(() => {
    if (user && user.id) {
      console.log('[PathwayDetailsPage] Refreshing pathways for updated response ID');
      syncWithSupabase(user.id);
    }
  }, [user, syncWithSupabase]);

  const [appMap, setAppMap] = useState<Record<string, string>>({});
  // Program search & filter state
  const [progSearchTerm, setProgSearchTerm] = useState("");
  const [institutionFilter, setInstitutionFilter] = useState<string | undefined>(undefined);
  const [locationFilter, setLocationFilter] = useState<string | undefined>(undefined);
  const [scholarshipFilter, setScholarshipFilter] = useState<string | undefined>(undefined);
  const [allProgramsForDefaults, setAllProgramsForDefaults] = useState<RecommendationProgram[]>([]);

  const programs = useMemo(() => programsByPathway[pathwayId] || [], [programsByPathway, pathwayId]);

  useEffect(() => {
    if (programs.length > 0) {
      setAllProgramsForDefaults(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const newPrograms = programs.filter(p => p.id && !existingIds.has(p.id!));
        return [...prev, ...newPrograms];
      });
    }
  }, [programs]);

  const defaultCostRange = React.useMemo((): [number, number] => {
    if (allProgramsForDefaults.length === 0) return [0, 50000];
    const costs = allProgramsForDefaults.map(p => p.costPerYear).filter(c => typeof c === 'number') as number[];
    const minCost = costs.length > 0 ? Math.min(0, ...costs) : 0;
    const maxCost = costs.length > 0 ? Math.max(50000, ...costs) : 50000;
    return [minCost, maxCost];
  }, [allProgramsForDefaults]);

  const defaultMatchRange: [number, number] = [0, 100]; // Match score is always 0-100

  const [costRangeFilter, setCostRangeFilter] = useState<[number, number]>(defaultCostRange);
  const [matchRangeFilter, setMatchRangeFilter] = useState<[number, number]>(defaultMatchRange);

  useEffect(() => {
    setCostRangeFilter(defaultCostRange);
  }, [defaultCostRange]);

  useEffect(() => {
    if (!user) return;
    list_user_applications()
      .then(res => {
        if (res.success && Array.isArray(res.applications)) {
          const map: Record<string, string> = {};
          res.applications.forEach((app: any) => {
            map[app.recommendation_id] = app.id;
          });
          setAppMap(map);
        }
      })
      .catch(console.error);
  }, [user]);

  const { profileData, hydrated: profileStoreHydrated } = useProfileStore();

  // --- Logging Effect ---
  useEffect(() => {
    console.log("[PathwayDetailsPage] Render check:");
    console.log("  - Profile Data:", profileData);
    console.log("  - Profile Store Hydrated:", profileStoreHydrated);
    console.log("  - User (Auth Context):", user);
  }, [profileData, profileStoreHydrated, user]);
  // --- End Logging Effect ---

  const pathway = useMemo(() => pathways.find(p => p.id === pathwayId), [pathways, pathwayId]);
  const isLoading = programGenerationLoading[pathwayId];
  const [showHiddenPrograms, setShowHiddenPrograms] = useState(false);
  const archivedPrograms = useMemo(
    () => programs.filter(p => p.is_deleted && typeof p.id === 'string'),
    [programs]
  );
  const initialLoadError = programGenerationError[pathwayId];
  // Compute unique values for filter dropdowns
  const institutions = useMemo(() => Array.from(new Set(programs.map(p => p.institution))).sort(), [programs]);
  const locations = useMemo(() => Array.from(new Set(programs.map(p => p.location))).sort(), [programs]);
  // Filter programs based on search and filters
  const filteredPrograms = useMemo(() => {
    return programs.filter(p => !p.is_deleted && typeof p.id === 'string').filter(p => {
      // Text search
      if (progSearchTerm && !p.name.toLowerCase().includes(progSearchTerm.toLowerCase()) && !p.institution.toLowerCase().includes(progSearchTerm.toLowerCase())) return false;
      // Institution filter
      if (institutionFilter && p.institution !== institutionFilter) return false;
      // Location filter
      if (locationFilter && p.location !== locationFilter) return false;
      // Cost per year filter
      const cost = p.costPerYear ?? 0;
      if (cost < costRangeFilter[0] || cost > costRangeFilter[1]) return false;
      // Match score filter
      const score = p.matchScore ?? 0;
      if (score < matchRangeFilter[0] || score > matchRangeFilter[1]) return false;
      // Scholarships filter
      const scholarshipsArr = p.scholarships ?? [];
      const hasScholarship = scholarshipsArr.length > 0;
      if (scholarshipFilter === 'yes' && !hasScholarship) return false;
      if (scholarshipFilter === 'no' && hasScholarship) return false;
      return true;
    });
  }, [programs, progSearchTerm, institutionFilter, locationFilter, costRangeFilter, matchRangeFilter, scholarshipFilter]);

  const isLoadingMore = moreProgramsLoading[pathwayId];
  const loadMoreError = moreProgramsError[pathwayId];
  
  const canLoadMore = !!pathway?.last_recommended_programs_response_id;

  const handleLoadMore = () => {
    if (isLoadingMore || !pathwayId || !profileData) return;
    console.log(`Triggering load more for pathway: ${pathwayId}`);
    getMorePrograms(pathwayId, profileData);
  };
  
  // Fetch the latest program list from DB whenever this pathway page loads or changes
  useEffect(() => {
    if (pathwayId) {
      syncProgramsForPathway(pathwayId);
    }
  }, [pathwayId, syncProgramsForPathway]);

  if (!pathway && !isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Button 
          variant="outline" 
          onClick={() => router.push("/recommendations")}
          className="mb-6 flex items-center gap-2 group transition-all duration-200"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform duration-200" /> 
          <span>Back to Pathways</span>
        </Button>
        
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertCircle className="h-5 w-5" />
              <AlertTitle className="text-lg font-semibold">Pathway Not Found</AlertTitle>
              <AlertDescription className="mt-2">
                The requested pathway does not exist or could not be loaded. Please return to the pathways page and try again.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!pathway && isLoading) {
     return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
         <Skeleton className="h-10 w-48 mb-6" />
         <Card className="mb-8">
           <CardHeader><Skeleton className="h-8 w-3/4" /></CardHeader>
           <CardContent><Skeleton className="h-20 w-full" /></CardContent>
         </Card>
         <Skeleton className="h-8 w-1/2 mb-6" />
         <ProgramLoadingSkeleton />
      </div>
     );
  }
  
  if (!pathway) return null;

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Button 
        variant="outline" 
        onClick={() => router.push("/recommendations")}
        className="mb-6 flex items-center gap-2 group transition-all duration-200"
      >
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform duration-200" /> 
        <span>Back to Pathways</span>
      </Button>
      
      <Card className="mb-8 border-blue-100 bg-blue-50/30">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">{pathway.title}</h1>
              <p className="text-muted-foreground mt-1">{pathway.field_of_study}</p>
            </div>
            <Badge className="text-sm" variant="secondary">
              {pathway.qualification_type}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground mb-1 flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-blue-500" /> Duration
              </span>
              <span className="font-medium">{formatDurationRange(pathway.duration_months)}</span>
            </div>
            
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground mb-1 flex items-center">
                <Wallet className="h-4 w-4 mr-2 text-blue-500" /> Budget Range
              </span>
              <span className="font-medium">{formatBudgetRange(pathway.budget_range_usd)}</span>
            </div>
            
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground mb-1 flex items-center">
                <MapPin className="h-4 w-4 mr-2 text-blue-500" /> Target Regions
              </span>
              <span className="font-medium">
                {pathway.target_regions && pathway.target_regions.length > 0 
                  ? pathway.target_regions.join(", ") 
                  : "Not specified"
                }
              </span>
            </div>
          </div>
          
          <div className="mt-4 bg-white p-4 rounded-md border">
            <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center">
              <Award className="h-4 w-4 mr-2 text-amber-500" /> Alignment Rationale
            </h3>
            <p className="text-sm">{pathway.alignment_rationale}</p>
          </div>
        </CardContent>
      </Card>

      {/* Program search and filter controls */}
      <Card className="p-4 sm:p-6 mb-8 bg-slate-50/50 dark:bg-slate-800/30">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-4 items-end">
            {/* Col 1: Search, Institution, Location */}
            <div className="space-y-3 lg:col-span-1">
                <Label htmlFor="search-programs" className="flex items-center text-sm font-medium text-muted-foreground">
                    <SearchIcon className="h-4 w-4 mr-2 text-sky-600"/>
                    Search Programs
                </Label>
                <Input
                    id="search-programs"
                    placeholder="Program name or institution..."
                    value={progSearchTerm}
                    onChange={e => setProgSearchTerm(e.target.value)}
                    className="w-full"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <Label htmlFor="filter-institution" className="text-xs font-medium text-muted-foreground mb-1 block">Institution</Label>
                        <Select onValueChange={val => setInstitutionFilter(val === 'all' ? undefined : val)} value={institutionFilter ?? 'all'}>
                            <SelectTrigger id="filter-institution" className="w-full"><SelectValue placeholder="All Institutions" /></SelectTrigger>
                            <SelectContent>
                            <SelectItem value="all">All Institutions</SelectItem>
                            {institutions.map(inst => <SelectItem key={inst} value={inst}>{inst}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="filter-location" className="text-xs font-medium text-muted-foreground mb-1 block">Location</Label>
                        <Select onValueChange={val => setLocationFilter(val === 'all' ? undefined : val)} value={locationFilter ?? 'all'}>
                            <SelectTrigger id="filter-location" className="w-full"><SelectValue placeholder="All Locations" /></SelectTrigger>
                            <SelectContent>
                            <SelectItem value="all">All Locations</SelectItem>
                            {locations.map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Col 2: Cost, Match Score Sliders */}
            <div className="space-y-4 lg:col-span-1">
                 <div>
                    <Label htmlFor="filter-cost" className="flex items-center text-xs font-medium text-muted-foreground mb-2">
                        <BadgeDollarSign className="h-3.5 w-3.5 mr-1.5 text-sky-600"/>
                        Cost/Year (USD): <span className="font-semibold ml-1">{`$${costRangeFilter[0].toLocaleString()} - $${costRangeFilter[1].toLocaleString()}`}</span>
                    </Label>
                    <Slider
                        id="filter-cost"
                        min={defaultCostRange[0]}
                        max={defaultCostRange[1]}
                        step={1000}
                        value={costRangeFilter}
                        onValueChange={value => setCostRangeFilter(value as [number, number])}
                        className="w-full"
                    />
                </div>
                <div>
                    <Label htmlFor="filter-match" className="flex items-center text-xs font-medium text-muted-foreground mb-2">
                        <Percent className="h-3.5 w-3.5 mr-1.5 text-sky-600"/>
                        Match Score (%): <span className="font-semibold ml-1">{`${matchRangeFilter[0]} - ${matchRangeFilter[1]}`}</span>
                    </Label>
                    <Slider
                        id="filter-match"
                        min={defaultMatchRange[0]}
                        max={defaultMatchRange[1]}
                        step={5}
                        value={matchRangeFilter}
                        onValueChange={value => setMatchRangeFilter(value as [number, number])}
                        className="w-full"
                    />
                </div>
            </div>

            {/* Col 3: Scholarship Filter & Clear Button */}
            <div className="flex flex-col justify-between space-y-2 lg:col-span-1 h-full pt-1">
                <div>
                    <Label htmlFor="filter-scholarship" className="text-xs font-medium text-muted-foreground mb-1 block">Scholarships Available?</Label>
                    <Select onValueChange={val => setScholarshipFilter(val === 'all' ? undefined : val)} value={scholarshipFilter ?? 'all'}>
                        <SelectTrigger id="filter-scholarship" className="w-full"><SelectValue placeholder="Filter by Scholarships" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Any</SelectItem>
                            <SelectItem value="yes">Yes</SelectItem>
                            <SelectItem value="no">No</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Button variant="outline" size="sm" onClick={() => {
                    setProgSearchTerm(""); setInstitutionFilter(undefined); setLocationFilter(undefined);
                    setCostRangeFilter(defaultCostRange); setMatchRangeFilter(defaultMatchRange); setScholarshipFilter(undefined);
                }} className="w-full flex items-center mt-auto">
                    <FilterX className="h-4 w-4 mr-2"/> Clear Program Filters
                </Button>
            </div>
        </div>
      </Card>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold flex items-center">
          <BookOpen className="h-5 w-5 mr-2 text-blue-600" /> 
          Programs for this Pathway
          {filteredPrograms.length > 0 && (
            <Badge variant="secondary" className="ml-3 text-sm px-2">
              {filteredPrograms.length} Found
            </Badge>
          )}
        </h2>
      </div>

      {archivedPrograms.length > 0 && (
        <div className="mt-8">
          <Button variant="link" onClick={() => setShowHiddenPrograms(!showHiddenPrograms)}>
            {showHiddenPrograms ? "Hide hidden programs" : `Show hidden programs (${archivedPrograms.length})`}
          </Button>
          {showHiddenPrograms && (
            <div className="space-y-4 mt-4">
              {archivedPrograms.map(program => (
                <div key={program.id} className="flex items-center justify-between p-4 bg-gray-50 rounded">
                  <span className="text-sm text-muted-foreground">{program.name}, {program.institution}</span>
                  <Button size="sm" onClick={() => usePathwayStore.getState().restoreProgram(pathwayId, program.id as string)}>
                    Restore
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {isLoading && filteredPrograms.length === 0 ? (
        <ProgramLoadingSkeleton />
      ) : 
      initialLoadError && filteredPrograms.length === 0 ? (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle>Error Loading Programs</AlertTitle>
          <AlertDescription className="mt-1">{initialLoadError}</AlertDescription>
        </Alert>
      ) : 
      !isLoading && filteredPrograms.length === 0 ? (
         <Card className="border-amber-200 bg-amber-50/50">
           <CardContent className="flex flex-col items-center justify-center py-12 text-center">
             <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
             <h3 className="text-xl font-semibold mb-2">No Programs Found Yet</h3>
             <p className="text-muted-foreground mb-6 max-w-md">
               We couldn't find specific programs for this pathway during the initial search. 
               You might need to refine the pathway or explore alternatives.
             </p>
             <Button onClick={() => router.push("/recommendations")}>
               Return to Pathways
             </Button>
           </CardContent>
         </Card>
      ) : 
      (
        <div className="space-y-6 animate-in fade-in-50 duration-300">
          {filteredPrograms.map(program => (
            <ProgramCard
              key={program.id}
              program={program}
              pathwayTitle={pathway.title}
              pathwayId={pathwayId}
              applicationId={appMap[program.id as string]}
              onToggleFavorite={() => usePathwayStore.getState().toggleFavorite(pathwayId, program.id as string)}
              onSubmitFeedback={(reason, details) => usePathwayStore.getState().submitFeedback(pathwayId, program.id as string, reason, details)}
              onDeleteProgram={() => usePathwayStore.getState().deleteProgram(pathwayId, program.id as string)}
              isGuest={!user}
              onRestoreFeedback={program.feedbackNegative && !program.is_deleted ? () => usePathwayStore.getState().restoreProgram(pathwayId, program.id as string) : undefined}
            />
          ))}
        </div>
      )}

      {filteredPrograms.length > 0 && (
        <div className="mt-8 text-center">
           {loadMoreError && (
             <Alert variant="destructive" className="mb-4 text-left">
               <AlertCircle className="h-4 w-4" />
               <AlertTitle>Error Loading More</AlertTitle>
               <AlertDescription>{loadMoreError}</AlertDescription>
             </Alert>
           )}
          <Button
            onClick={handleLoadMore}
            disabled={isLoadingMore || !canLoadMore || !profileData}
            variant="outline"
            className="transition-all duration-200 group"
            title={!canLoadMore ? "Cannot load more without previous context" : (!profileData ? "User profile needed" : "Load more programs")}
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4 group-hover:rotate-180 transition-transform duration-300" />
                Load More Programs
              </>
            )}
          </Button>
          {!canLoadMore && (
             <p className="text-xs text-muted-foreground mt-2">
               Load more requires previous context. Try refreshing the page or exploring the pathway again if needed.
             </p>
           )}
        </div>
      )}
    </div>
  );
} 