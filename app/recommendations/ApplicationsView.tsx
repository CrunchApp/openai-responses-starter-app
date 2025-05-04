import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { list_user_applications, get_application_state } from '@/config/functions';
import { Loader2, CheckCircle2, FileText, BookOpen, Calendar, ListChecks, ChevronRight, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface ApplicationListItem {
  id: string;
  recommendation_id: string;
  application?: {
    created_at: string;
    timeline?: Array<{ label: string; target_date: string }>;
    program_name?: string; 
    institution_name?: string;
    degree_type?: string; 
    [key: string]: any;
  };
  tasks?: Array<{ id: string; status: string; title: string }>;
}

function ApplicationLoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2].map((i) => (
        <Card key={i} className="overflow-hidden">
           <div className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <Skeleton className="h-5 w-48 mb-2" />
                <Skeleton className="h-4 w-36 mb-1" />
                 <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
            <div className="mt-4 space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
               <Skeleton className="h-4 w-full" />
               <Skeleton className="h-4 w-1/2" />
            </div>
             <div className="flex justify-end mt-4">
                <Skeleton className="h-9 w-28" />
             </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export function ApplicationsView() {
  const router = useRouter();
  const [apps, setApps] = useState<ApplicationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchApps = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await list_user_applications();
        if (!res.success || !Array.isArray(res.applications)) {
          throw new Error(res.error || 'Failed to list applications');
        }
        const list = res.applications as Array<{ id: string; recommendation_id: string }>;
        
        const detailed = await Promise.all(list.map(async (item) => {
          try {
            const state = await get_application_state({ application_id: item.id });
            if (state.success) {
              return { ...item, application: state.application, tasks: state.tasks };
            } else {
              console.warn(`Failed to get state for application ${item.id}: ${state.error}`);
            }
          } catch (stateErr: any) {
             console.error(`Error fetching state for application ${item.id}:`, stateErr);
          }
          return { ...item }; 
        }));
        setApps(detailed);
      } catch (err: any) {
        setError(err.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    fetchApps();
  }, []);

  if (loading) {
    return <ApplicationLoadingSkeleton />;
  }
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Applications</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  
  if (apps.length === 0) {
    return (
      <div className="text-center py-16 px-4 bg-slate-50 rounded-lg border border-slate-200">
        <div className="inline-flex items-center justify-center p-3 bg-white rounded-full border border-slate-200 shadow-sm mb-4">
           <FileText className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">No applications started yet</h3>
        <p className="text-zinc-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
          When you start an application for a saved program, you can track its progress and manage tasks here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {apps.map((item) => {
        const applicationData = item.application;
        const programName = applicationData?.program_name || `Program for Rec ID: ${item.recommendation_id}`;
        const institutionName = applicationData?.institution_name || 'Institution not specified';
        const degreeType = applicationData?.degree_type;
        
        const appliedDate = applicationData?.created_at ? new Date(applicationData.created_at).toLocaleDateString() : null;
        
        const tasksArray = Array.isArray(item.tasks) ? item.tasks : [];
        const completed = tasksArray.filter((t) => t.status === 'done').length;
        const total = tasksArray.length;
        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

        return (
          <Card key={item.id} className="transition-shadow hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <CardTitle className="text-lg font-semibold text-blue-900 dark:text-blue-200">{programName}</CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">{institutionName}</CardDescription>
                  {appliedDate && <p className="text-xs text-muted-foreground mt-1">Started on: {appliedDate}</p>}
                </div>
                {degreeType && (
                  <Badge variant="outline" className="text-xs whitespace-nowrap">
                    {degreeType}
                  </Badge>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="pt-2 pb-4">
              {Array.isArray(applicationData?.timeline) && applicationData.timeline.length > 0 && (
                <div className="mb-4">
                  <h5 className="text-sm font-medium mb-2 flex items-center text-muted-foreground">
                    <Calendar className="h-4 w-4 mr-2 text-blue-500" /> Timeline Highlights
                  </h5>
                  <div className="pl-5 text-sm space-y-1">
                    {applicationData.timeline.slice(0, 2).map((ev: any, i: number) => (
                      <div key={i} className="flex justify-between">
                         <span>{ev.label}:</span> 
                         <span className="text-muted-foreground">{ev.target_date}</span>
                      </div>
                    ))}
                     {applicationData.timeline.length > 2 && <p className="text-xs text-muted-foreground">...</p>}
                  </div>
                </div>
              )}

              <div>
                <h5 className="text-sm font-medium mb-2 flex items-center text-muted-foreground">
                  <ListChecks className="h-4 w-4 mr-2 text-green-600" /> Checklist Progress
                </h5>
                {total > 0 ? (
                  <div className="space-y-2">
                    <Progress value={pct} className="h-2" aria-label={`${pct}% tasks completed`} />
                    <div className="flex justify-between items-center text-xs font-medium text-muted-foreground">
                      <span>{completed} of {total} tasks completed</span>
                      <span>{pct}%</span>
                    </div>
                    {pct === 100 && (
                      <div className="flex items-center text-green-600 text-xs mt-1 font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> All tasks done!
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No checklist tasks available yet.</p>
                )}
              </div>
            </CardContent>
            
            <CardFooter className="pt-3 pb-3 flex justify-end">
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => router.push(`/applications/${item.id}`)}
                className="group transition-all duration-200"
              >
                View Details
                <ChevronRight className="ml-1 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
} 