"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/components/auth/AuthContext';
import {
  fetchUserRecommendations,
  toggleRecommendationFavorite,
  submitRecommendationFeedback,
  archiveRecommendationProgram,
  restoreRecommendationFeedback,
} from './supabase-helpers';
import { RecommendationProgram } from './types';
import { ProgramCard } from './pathway/[id]/_components/ProgramCard';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardTitle } from "@/components/ui/card";

export function CustomRecommendationsView() {
  const { user } = useAuth();
  const isGuest = !user;
  const router = useRouter();
  const [recommendations, setRecommendations] = useState<RecommendationProgram[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetchUserRecommendations(user.id)
      .then((res) => {
        if (res.error) {
          setError(res.error);
        } else {
          // Filter recommendations without a pathway
          const directRecs = res.recommendations.filter((r) => !r.pathway_id);
          setRecommendations(directRecs);
        }
      })
      .catch((err) => setError(err.message || String(err)))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return (
    <div className="flex justify-center items-center h-40">
      <p className="ml-2">Loading recommendations...</p>
    </div>
  );

  if (error) return (
    <Alert variant="destructive">
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>Error: {error}</AlertDescription>
    </Alert>
  );

  if (!recommendations.length) return (
    <Card className="text-center p-6">
      <CardContent>
        <CardTitle className="text-lg font-semibold mb-2">No direct recommendations saved.</CardTitle>
        <p className="text-sm text-muted-foreground">These are recommendations you have specifically asked the assistant to save for you, and are not linked to a pathway.</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {recommendations.map((prog) => (
        <ProgramCard
          key={prog.id}
          program={prog}
          pathwayTitle={undefined}
          pathwayId={undefined}
          onToggleFavorite={() => user && toggleRecommendationFavorite(user.id, prog.id!)}
          onSubmitFeedback={(reason, details) => user && submitRecommendationFeedback(user.id, prog.id!, reason, details)}
          onDeleteProgram={() => user && archiveRecommendationProgram(user.id, prog.id!)}
          isGuest={isGuest}
          onRestoreFeedback={() => user && restoreRecommendationFeedback(user.id, prog.id!)}
          applicationId={undefined}
        />
      ))}
    </div>
  );
} 