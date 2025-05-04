"use client";
import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ThumbsUp, ThumbsDown, Trash2, Lock, FileText, BookOpen, MessageSquare, Star, ListChecks, Calendar, ExternalLink, TrendingUp, Wallet, MapPin, GraduationCap, Award } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useRouter } from "next/navigation";
import { RecommendationProgram } from "@/app/recommendations/types";
import { cn } from "@/lib/utils";
import { GradCapAssistant } from "@/components/assistant/GradCapAssistant";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { create_application_plan } from "@/config/functions";

// --- Helpers ---
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

export function ProgramCard({ 
  program, 
  pathwayId,
  onToggleFavorite, 
  onSubmitFeedback,
  onDeleteProgram,
  isGuest,
  onRestoreFeedback,
  applicationId: initialAppId,
}: { 
  program: RecommendationProgram;
  pathwayId: string;
  onToggleFavorite: () => void;
  onSubmitFeedback: (reason: string, details?: string) => void;
  onDeleteProgram: () => void;
  isGuest: boolean;
  onRestoreFeedback?: () => void;
  applicationId?: string;
}) {
  const router = useRouter();
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [feedbackReason, setFeedbackReason] = useState(program.feedbackReason || "not_relevant");
  const [feedbackDetails, setFeedbackDetails] = useState("");
  const [showScholarships, setShowScholarships] = useState(false);
  const hasScholarships = program.scholarships && program.scholarships.length > 0;
  const hasFeedback = program.feedbackNegative === true;
  const [assistantOpen, setAssistantOpen] = useState(false);
  // Track new application ID if created in this session
  const [newAppId, setNewAppId] = useState<string | null>(null);
  // Use existing applicationId prop or newly created ID
  const applicationId = initialAppId || newAppId;
  const [isStarting, setIsStarting] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);

  const handleToggleFavorite = () => {
    if (isGuest) {
      alert("Please sign up to save favorites.");
      return;
    }
    onToggleFavorite();
  };

  const handleSubmitFeedback = (reason: string, details?: string) => {
    if (isGuest) {
      alert("Please sign up to submit feedback.");
      return;
    }
    onSubmitFeedback(reason, details);
  };

  const handleDeleteProgram = () => {
    if (isGuest) {
      alert("Please sign up to manage programs.");
      return;
    }
    onDeleteProgram();
  };

  const handleAskAI = () => {
    router.push("/chat");
  };

  const handleStartApplication = async () => {
    if (isGuest) {
      alert("Please sign up to start application process.");
      return;
    }
    if (applicationId) {
      router.push(`/applications/${applicationId}`);
      return;
    }
    if (!program.id) {
      setAppError("Invalid program ID");
      return;
    }

    setIsStarting(true);
    setAppError(null);
    try {
      const result = await create_application_plan({ recommendation_id: program.id });
      if (!result.success) {
        setAppError(result.error || "Failed to start application.");
      } else if (!result.application_id) {
        setAppError("No application ID returned.");
      } else {
        setNewAppId(result.application_id);
        router.push(`/applications/${result.application_id}`);
      }
    } catch (err: any) {
      const errorMsg = err instanceof Error ? err.message : String(err) || "Unknown error";
      console.error("Error creating application:", errorMsg);
      setAppError(errorMsg);
    } finally {
      setIsStarting(false);
    }
  };

  // DEBUGGING: Log program feedback state just before rendering
  console.log(`[ProgramCard] Rendering program '${program.name}' (ID: ${program.id}). feedbackNegative:`, program.feedbackNegative, 'is_deleted:', program.is_deleted);

  return (
    <Card
      role="region"
      aria-labelledby={`program-card-${program.id}-title`}
      tabIndex={0}
      className={cn(
        "w-full max-w-sm bg-white dark:bg-slate-800 overflow-hidden transition-all duration-200 hover:shadow-md focus:outline-none focus:ring focus:ring-blue-500",
        assistantOpen ? 'min-h-[340px] pb-6' : ''
      )}
    >
      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 id={`program-card-${program.id}-title`} className="font-semibold text-base text-gray-900 dark:text-gray-100">{program.name}</h3>
            <p className="text-sm text-muted-foreground">{program.institution}</p>
            <div className="flex items-center text-xs text-muted-foreground mt-1.5">
              <BookOpen aria-hidden="true" className="h-3.5 w-3.5 mr-1.5 text-blue-500" />
              <span>Part of pathway</span>
            </div>
          </div>
          <Badge variant="outline" className="text-xs font-medium">
            {program.degreeType}
          </Badge>
        </div>
        
        <div className="mt-3 space-y-2 bg-muted/20 dark:bg-muted/30 p-2.5 rounded-md">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground font-medium">Duration:</span>
            <span className="font-medium">{program.duration} months</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground font-medium">Cost:</span>
            <span className="font-medium">{formatCurrency(program.costPerYear)}/year</span>
          </div>
          {program.location && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground font-medium">Location:</span>
              <span className="font-medium">{program.location}</span>
            </div>
          )}
        </div>
          
        {/* Scholarship info - only show if scholarships are available */}
        {hasScholarships && (
          <div className="mt-3 border-t pt-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <span className="text-sm font-medium">Scholarships</span>
                <Badge variant="secondary" className="ml-2 text-xs py-0 px-2">{program.scholarships?.length || 0}</Badge>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 px-2.5 text-xs" 
                onClick={() => setShowScholarships(!showScholarships)}
              >
                {showScholarships ? 'Hide' : 'View'}
              </Button>
            </div>
            
            {/* Scholarship details section */}
            {showScholarships && (
              <div className="mt-2 space-y-2 animate-in fade-in-50 duration-200">
                {program.scholarships?.map((scholarship, idx) => (
                  <div key={idx} className="bg-muted/30 p-2.5 rounded-md text-xs">
                    <div className="font-semibold text-sm mb-1">{scholarship.name}</div>
                    {scholarship.amount && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Amount:</span>
                        <span className="font-medium">{scholarship.amount}</span>
                      </div>
                    )}
                    {scholarship.eligibility && (
                      <div className="mt-1 text-xs">
                        <span className="text-muted-foreground font-medium">Eligibility: </span>
                        <span>{scholarship.eligibility}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
          
        {/* Match Score Indicator */}
        {program.matchScore && (
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs font-medium text-muted-foreground">Match:</span>
            <div className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <Award key={i} 
                  className={cn(
                    "h-3.5 w-3.5",
                    i < Math.round(program.matchScore / 20) 
                      ? "text-yellow-500 fill-yellow-400" 
                      : "text-muted-foreground/20"
                  )} 
                />
              ))}
            </div>
            <span className="text-xs font-semibold">{program.matchScore}%</span>
          </div>
        )}
          
        {/* Accordion for More Details */}
        <Accordion type="single" collapsible className="w-full mt-3 border-t pt-3">
          <AccordionItem value="details" className="border-b-0">
            <AccordionTrigger className="py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:no-underline">
              Program Details
            </AccordionTrigger>
            <AccordionContent className="animate-in slide-in-from-top-5 duration-200">
              <div className="space-y-4 py-2 text-sm">
                {/* Match Rationale */}
                {program.matchRationale && (
                  <div className="bg-blue-50/50 p-2.5 rounded-md">
                    <h5 className="font-semibold mb-2 flex items-center text-blue-700"><TrendingUp aria-hidden="true" className="h-4 w-4 mr-1.5 text-blue-700" /> Match Rationale</h5>
                    <div className="space-y-1.5 pl-2">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center"><GraduationCap className="h-3.5 w-3.5 mr-1.5 text-blue-500" /> Academic Fit:</span>
                        <span className="font-semibold">{program.matchRationale.academicFit || 0}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center"><TrendingUp aria-hidden="true" className="h-3.5 w-3.5 mr-1.5 text-blue-700" /> Career Alignment:</span>
                        <span className="font-semibold">{program.matchRationale.careerAlignment || 0}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center"><Wallet className="h-3.5 w-3.5 mr-1.5 text-blue-500" /> Budget Fit:</span>
                        <span className="font-semibold">{program.matchRationale.budgetFit || 0}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center"><MapPin className="h-3.5 w-3.5 mr-1.5 text-blue-500" /> Location Match:</span>
                        <span className="font-semibold">{program.matchRationale.locationMatch || 0}%</span>
                      </div>
                    </div>
                  </div>
                )}
                  
                {/* Highlights */}
                {program.highlights && program.highlights.length > 0 && (
                  <div>
                    <h5 className="font-semibold mb-2 flex items-center"><Star className="h-4 w-4 mr-1.5 text-amber-500" /> Highlights</h5>
                    <ul className="list-disc pl-5 space-y-1">
                      {program.highlights.map((h, i) => <li key={i}>{h}</li>)}
                    </ul>
                  </div>
                )}
                  
                {/* Requirements */}
                {program.requirements && program.requirements.length > 0 && (
                  <div>
                    <h5 className="font-semibold mb-2 flex items-center"><ListChecks className="h-4 w-4 mr-1.5 text-green-600" /> Requirements</h5>
                    <ul className="list-disc pl-5 space-y-1">
                      {program.requirements.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                )}
                  
                {/* Application Deadline */}
                {program.applicationDeadline && (
                  <div className="flex items-center justify-between pt-2 border-t mt-2">
                    <span className="flex items-center font-medium"><Calendar className="h-4 w-4 mr-1.5 text-red-500" /> Application Deadline:</span>
                    <span className="font-semibold">{program.applicationDeadline}</span>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
          
        {/* Action Buttons */}
        <div className="flex justify-between mt-4 pt-3 border-t">
          <Button 
            variant={program.isFavorite ? "secondary" : "outline"}
            size="sm"
            className={cn(
              "h-8 px-2.5 transition-colors",
              program.isFavorite ? "text-red-500 bg-red-50 hover:bg-red-100" : ""
            )}
            title={isGuest ? "Sign up to save favorites" : (program.isFavorite ? "Remove from favorites" : "Add to favorites")}
            onClick={handleToggleFavorite}
            aria-pressed={program.isFavorite}
          >
            {isGuest ? (
              <><Lock className="h-3.5 w-3.5 mr-1.5" /> Save</>
            ) : (
              <><ThumbsUp className="h-3.5 w-3.5 mr-1.5" /> {program.isFavorite ? "Saved" : "Save"}</>
            )}
          </Button>
            
          {!program.feedbackNegative && !hasFeedback ? (
            <>
              <Button 
                variant="outline"
                size="sm"
                className="h-8 px-2.5"
                title={isGuest ? "Sign up to provide feedback" : "Not interested"}
                onClick={() => {
                  if (isGuest) {
                    alert("Please sign up to submit feedback.");
                    return;
                  }
                  setShowFeedbackDialog(true);
                }}
              >
                {isGuest ? (
                  <><Lock className="h-3.5 w-3.5 mr-1.5" /> Feedback</>
                ) : (
                  <><ThumbsDown className="h-3.5 w-3.5 mr-1.5" /> Not interested</>
                )}
              </Button>
              <AlertDialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Not Interested in this Program?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Please tell us why. Your feedback helps improve future recommendations.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="py-4 space-y-4">
                    <Label htmlFor={`feedback-reason-${program.id}`}>Reason</Label>
                    <RadioGroup 
                      id={`feedback-reason-${program.id}`}
                      value={feedbackReason}
                      onValueChange={setFeedbackReason}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="not_relevant" id={`r1-${program.id}`} />
                        <Label htmlFor={`r1-${program.id}`}>Not Relevant</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="too_expensive" id={`r2-${program.id}`} />
                        <Label htmlFor={`r2-${program.id}`}>Too Expensive</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="wrong_location" id={`r3-${program.id}`} />
                        <Label htmlFor={`r3-${program.id}`}>Wrong Location</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="other" id={`r4-${program.id}`} />
                        <Label htmlFor={`r4-${program.id}`}>Other</Label>
                      </div>
                    </RadioGroup>
                    <Label htmlFor={`feedback-details-${program.id}`}>Additional Details (Optional)</Label>
                    <Textarea 
                      id={`feedback-details-${program.id}`}
                      placeholder="Any other comments?"
                      value={feedbackDetails}
                      onChange={(e) => setFeedbackDetails(e.target.value)}
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => {
                      handleSubmitFeedback(feedbackReason, feedbackDetails);
                      setShowFeedbackDialog(false);
                    }} className="bg-red-600 hover:bg-red-700">
                      Submit Feedback
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : program.feedbackNegative && !program.is_deleted ? (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs flex items-center">
                <ThumbsDown className="h-3 w-3 mr-1.5 text-red-500" />
                {program.feedbackReason || "Not interested"}
              </Badge>
              {onRestoreFeedback && (
                <Button size="sm" variant="ghost" className="h-8 px-2.5 text-xs text-blue-600 hover:underline" onClick={onRestoreFeedback}>
                  Restore
                </Button>
              )}
            </div>
          ) : null}
            
          {/* Archive button only after feedback */}
          {!isGuest && hasFeedback && (
            <Button 
              variant="ghost"
              size="sm"
              className="h-8 px-2.5 text-muted-foreground hover:text-red-500 hover:bg-red-50"
              title="Archive this program"
              onClick={handleDeleteProgram}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              <span className="text-xs">Archive</span>
            </Button>
          )}
        </div>
          
        {/* Secondary Actions: Vista Assistant widget & Explore Program */}
        <div className="flex justify-between items-center mt-4 pt-3 border-t">
          {/* Inline GradCapAssistant for program-specific Q&A */}
          <GradCapAssistant
            className="relative"
            size="small"
            contextMessage={`The user is asking about the following program: ${program.name} offered by ${program.institution}. Make sure you review user's profile and the program details, both of which you have access to within the vector store files, before responding.`}
            placeholder="What else do you want to know about this program?"
            onOpen={() => setAssistantOpen(true)}
            onClose={() => setAssistantOpen(false)}
          />
            
          {program.pageLink ? (
            <Button 
              variant="default" 
              size="sm"
              className="text-xs h-8 px-3"
              onClick={() => window.open(program.pageLink, "_blank")}
              title={`Visit program page at ${program.institution}`}
            >
              Explore Program <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          ) : (
            <Button 
              variant="outline" 
              size="sm"
              className="text-xs h-8 px-3"
              disabled
              title="No program link available"
            >
              Explore Program <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          )}
        </div>
        <div className="mt-4">
          <Button
            variant={applicationId ? "secondary" : "default"}
            onClick={handleStartApplication}
            disabled={isStarting}
          >
            {isStarting
              ? <>Starting...</>
              : applicationId
                ? <>View Application</>
                : <>Start Application process</>
            }
          </Button>
          {appError && (
            <p className="text-red-500 text-sm mt-2">{appError}</p>
          )}
        </div>
      </div>
    </Card>
  );
} 