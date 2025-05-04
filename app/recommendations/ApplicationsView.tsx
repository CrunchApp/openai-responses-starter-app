import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { list_user_applications, get_application_state } from '@/config/functions';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

interface ApplicationListItem {
  id: string;
  recommendation_id: string;
  application?: any;
  tasks?: any[];
}

export function ApplicationsView() {
  const router = useRouter();
  const [apps, setApps] = useState<ApplicationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchApps = async () => {
      setLoading(true);
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
            }
          } catch {}
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
    return (
      <div className="text-center py-8">
        <Loader2 className="animate-spin h-6 w-6 mx-auto" />
        <p className="mt-2">Loading your applications...</p>
      </div>
    );
  }
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  if (apps.length === 0) {
    return (
      <div className="text-center py-8">
        <p>No applications started yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {apps.map((item) => {
        const tasksArray = Array.isArray(item.tasks) ? item.tasks : [];
        const completed = tasksArray.filter((t) => t.status === 'done').length;
        const total = tasksArray.length;
        const pct = total ? Math.round((completed / total) * 100) : 0;

        return (
          <Card key={item.id}>
            <CardHeader>
              <CardTitle>Application for Recommendation {item.recommendation_id}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-3">
                <h5 className="font-medium">Timeline</h5>
                {Array.isArray(item.application?.timeline) && item.application.timeline.length > 0 ? (
                  <ul className="list-disc pl-5 text-sm">
                    {item.application.timeline.map((ev: any, i: number) => (
                      <li key={i}>{ev.label}: {ev.target_date}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No timeline available.</p>
                )}
              </div>

              <div>
                <h5 className="font-medium">Checklist</h5>
                {total > 0 ? (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span>{completed}/{total} tasks completed</span>
                      <span>{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-2" />
                    {pct === 100 && (
                      <div className="flex items-center text-green-600 text-xs mt-1">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> All tasks done
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No tasks available.</p>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="default" onClick={() => router.push(`/applications/${item.id}`)}>
                View Details
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
} 