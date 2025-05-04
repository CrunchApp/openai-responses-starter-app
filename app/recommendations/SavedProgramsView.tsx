import React, { useMemo, useState, useEffect } from 'react';
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
  BookOpen,
  Loader2
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import usePathwayStore from '@/stores/usePathwayStore';
import { RecommendationProgram } from './types';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/components/auth/AuthContext';
import { list_user_applications, create_application_plan } from '@/config/functions';
import { Textarea } from '@/components/ui/textarea';

// Helper function to format currency
function formatCurrency(amount?: number | null) {
  if (amount === undefined || amount === null) return "Not specified";
  
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
  applicationId,
  onUnfavorite,
  onStart
}: { 
  program: RecommendationProgram;
  pathwayId: string;
  pathwayTitle: string;
  applicationId?: string;
  onUnfavorite: () => void;
  onStart: () => void;
}) {
  const { user } = useAuth();
  const isGuest = !user;
  const [showFeedbackOptions, setShowFeedbackOptions] = React.useState(false);
  const [feedbackReason, setFeedbackReason] = React.useState(program.feedbackReason || "not_relevant");
  const router = useRouter();
  const [appId, setAppId] = useState<string | undefined>(applicationId);
  const [isStarting, setIsStarting] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);
  
  // Update appId state when prop changes
  useEffect(() => {
    setAppId(applicationId);
  }, [applicationId]);
  
  const startApp = async () => {
    if (isGuest) {
      alert('Please sign up to start application.');
      return;
    }
    setIsStarting(true);
    setAppError(null);
    try {
      if (appId) {
        router.push(`/applications/${appId}`);
      } else if (program.id) {
        const res = await create_application_plan({ recommendation_id: program.id });
        if (res.success && res.application_id) {
          setAppId(res.application_id);
          router.push(`/applications/${res.application_id}`);
        } else {
          setAppError(res.error || 'Failed to start application.');
        }
      } else {
        setAppError('Invalid program ID');
      }
    } catch (err: any) {
      setAppError(err.message || 'Unknown error');
    } finally {
      setIsStarting(false);
    }
  };
  
  return (
    // Card region with accessible label and focus styles
    <Card
      role="region"
      aria-labelledby={`saved-program-${program.id}-title`}
      tabIndex={0}
      className="w-full max-w-sm bg-white dark:bg-slate-800 overflow-hidden transition-all duration-200 hover:shadow-lg focus:outline-none focus:ring focus:ring-blue-500"
    >
      <div className="p-3">
        <div className="flex justify-between items-start">
          <div>
            <h3 id={`saved-program-${program.id}-title`} className="font-semibold text-base text-gray-900 dark:text-gray-100">{program.name}</h3>
            <p className="text-xs text-muted-foreground">{program.institution}</p>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="flex items-center">
                <BookOpen aria-hidden="true" className="h-3 w-3 mr-1 text-muted-foreground" />
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
            variant="default"
            size="sm"
            onClick={startApp}
            disabled={isStarting}
            className="h-7 px-2 text-xs"
          >
            {isStarting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : appId ? <><FileText className="h-3 w-3 mr-1" />View Application</> : <><FileText className="h-3 w-3 mr-1" />Start Application</>}
          </Button>
          {appError && <p className="text-red-500 text-xs mt-1">{appError}</p>}
        </div>
      </div>
    </Card>
  );
}

export function SavedProgramsView({ userProfile }: { userProfile: any }) {
  const router = useRouter();
  const [appMap, setAppMap] = useState<Record<string, string>>({});
  const { user } = useAuth();
  const { 
    pathways, 
    programsByPathway,
    toggleFavorite,
    isLoading, 
    error,
  } = usePathwayStore();
  
  // Fetch user's applications to build map of recommendation_id to application_id
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
  
  // Get all favorite programs from all pathways
  const favoritePrograms = useMemo(() => {
    const favorites: {
      program: RecommendationProgram;
      pathwayId: string;
      pathwayTitle: string;
      applicationId?: string;
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
            pathwayTitle: pathway.title,
            applicationId: program.id ? appMap[program.id!] : undefined
          });
        });
    });
    
    return favorites;
  }, [pathways, programsByPathway, appMap]);
  
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
        <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">No saved programs yet</h3>
        <p className="text-zinc-600 dark:text-gray-400 mb-6">
          When you find programs you're interested in, mark them as favorites to see them here.
        </p>
      </div>
    );
  }
  
  return (
    // Section region for saved programs
    <section role="region" aria-labelledby="saved-programs-heading" className="space-y-6">
      <h2 id="saved-programs-heading" className="text-2xl font-bold text-gray-900 dark:text-gray-100">Your Saved Programs</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {favoritePrograms.map(({ program, pathwayId, pathwayTitle, applicationId }) => (
          <SavedProgramCard
            key={`${pathwayId}-${program.id}`}
            program={program}
            pathwayId={pathwayId}
            pathwayTitle={pathwayTitle}
            applicationId={applicationId}
            onUnfavorite={() => program.id && handleUnfavorite(pathwayId, program.id)}
            onStart={() => applicationId ? router.push(`/applications/${applicationId}`) : router.push(`/recommendations/pathway/${pathwayId}`)}
          />
        ))}
      </div>
    </section>
  );
} 