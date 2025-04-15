"use client";
import React, { useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import usePathwayStore from "@/stores/usePathwayStore";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft, BookOpen, Award, Calendar, MapPin, Wallet, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProgramCard } from "./_components/ProgramCard";
import { useAuth } from "@/app/components/auth/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

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
  const { pathways, programsByPathway, programGenerationLoading, programGenerationError } = usePathwayStore();
  const { user } = useAuth();

  const pathway = useMemo(() => pathways.find(p => p.id === pathwayId), [pathways, pathwayId]);
  const programs = useMemo(() => programsByPathway[pathwayId] || [], [programsByPathway, pathwayId]);
  const isLoading = programGenerationLoading[pathwayId];
  const error = programGenerationError[pathwayId];
  const filteredPrograms = useMemo(() => programs.filter(p => !p.is_deleted && typeof p.id === 'string'), [programs]);

  if (!pathway) {
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

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold flex items-center">
          <BookOpen className="h-5 w-5 mr-2 text-blue-600" /> 
          Programs for this Pathway
          {filteredPrograms.length > 0 && (
            <Badge variant="secondary" className="ml-3 text-sm px-2">
              {filteredPrograms.length}
            </Badge>
          )}
        </h2>
      </div>
      
      {/* Render loading, error, or the list of programs */}
      {isLoading ? (
        <ProgramLoadingSkeleton />
      ) : error ? (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle>Error Loading Programs</AlertTitle>
          <AlertDescription className="mt-1">{error}</AlertDescription>
          <Button variant="outline" size="sm" className="mt-3">
            Retry Loading Programs
          </Button>
        </Alert>
      ) : filteredPrograms.length === 0 ? (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Programs Found</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              We couldn't find any specific programs for this educational pathway. 
              Try exploring other pathways or reach out to an advisor for more options.
            </p>
            <Button onClick={() => router.push("/recommendations")}>
              Return to Pathways
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6 animate-in fade-in-50 duration-300">
          {filteredPrograms.map(program => (
            <ProgramCard
              key={program.id}
              program={program}
              pathwayId={pathwayId}
              onToggleFavorite={() => usePathwayStore.getState().toggleFavorite(pathwayId, program.id as string)}
              onSubmitFeedback={reason => usePathwayStore.getState().submitFeedback(pathwayId, program.id as string, reason)}
              onDeleteProgram={() => usePathwayStore.getState().deleteProgram(pathwayId, program.id as string)}
              isGuest={!user}
            />
          ))}
        </div>
      )}
    </div>
  );
} 