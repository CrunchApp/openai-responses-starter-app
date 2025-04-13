import React, { useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  AlertCircle, 
  ThumbsUp,
  ThumbsDown,
  Trash2,
  Lock,
  FileText,
  BookOpen
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import usePathwayStore from '@/stores/usePathwayStore';
import { RecommendationProgram } from './types';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/components/auth/AuthContext';

// Helper function to format currency
function formatCurrency(amount?: number) {
  if (amount === undefined) return "Not specified";
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

// Program Card Component for Saved Programs
function SavedProgramCard({ 
  program, 
  pathwayId,
  pathwayTitle,
  onUnfavorite
}: { 
  program: RecommendationProgram;
  pathwayId: string;
  pathwayTitle: string;
  onUnfavorite: () => void;
}) {
  const { user } = useAuth();
  const isGuest = !user;
  const [showFeedbackOptions, setShowFeedbackOptions] = React.useState(false);
  const [feedbackReason, setFeedbackReason] = React.useState(program.feedbackReason || "not_relevant");
  
  return (
    <Card className="w-full">
      <div className="p-3">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-medium text-sm">{program.name}</h4>
            <p className="text-xs text-muted-foreground">{program.institution}</p>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="flex items-center">
                <BookOpen className="h-3 w-3 mr-1" />
                Part of: {pathwayTitle}
              </span>
            </p>
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
          
          {program.matchScore && (
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs text-muted-foreground">Match:</span>
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg
                    key={i}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    className={`h-3 w-3 ${
                      i < Math.round(program.matchScore / 20)
                        ? 'text-yellow-500 fill-yellow-500'
                        : 'text-muted-foreground/20'
                    }`}
                  >
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                  </svg>
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
            className="text-red-500"
            title={isGuest ? "Sign up to save favorites" : "Remove from favorites"}
            onClick={onUnfavorite}
          >
            <ThumbsUp className="h-4 w-4" />
          </Button>
          
          <Button 
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
            title="Start application process"
          >
            <FileText className="h-3 w-3 mr-1" /> Start Application
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function SavedProgramsView({ userProfile }: { userProfile: any }) {
  const router = useRouter();
  const { user } = useAuth();
  const { 
    pathways, 
    programsByPathway,
    toggleFavorite,
    isLoading, 
    error,
  } = usePathwayStore();
  
  // Get all favorite programs from all pathways
  const favoritePrograms = useMemo(() => {
    const favorites: {
      program: RecommendationProgram;
      pathwayId: string;
      pathwayTitle: string;
    }[] = [];
    
    // Only include active (non-deleted) pathways
    pathways.filter(p => !p.is_deleted).forEach(pathway => {
      const programs = programsByPathway[pathway.id] || [];
      
      // Filter for favorite and non-deleted programs
      programs
        .filter(program => program.isFavorite && !program.is_deleted)
        .forEach(program => {
          favorites.push({
            program,
            pathwayId: pathway.id,
            pathwayTitle: pathway.title
          });
        });
    });
    
    return favorites;
  }, [pathways, programsByPathway]);
  
  // Handle removing a program from favorites
  const handleUnfavorite = (pathwayId: string, programId: string) => {
    toggleFavorite(pathwayId, programId);
  };
  
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p>Loading your saved programs...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  
  if (favoritePrograms.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold mb-2">No saved programs yet</h3>
        <p className="text-zinc-600 mb-6">
          When you find programs you're interested in, mark them as favorites to see them here.
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Your Saved Programs</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {favoritePrograms.map(({ program, pathwayId, pathwayTitle }) => (
          <SavedProgramCard
            key={`${pathwayId}-${program.id}`}
            program={program}
            pathwayId={pathwayId}
            pathwayTitle={pathwayTitle}
            onUnfavorite={() => handleUnfavorite(pathwayId, program.id)}
          />
        ))}
      </div>
    </div>
  );
} 