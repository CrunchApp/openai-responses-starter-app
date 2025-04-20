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
  isGuest
}: { 
  program: RecommendationProgram;
  pathwayId: string;
  onToggleFavorite: () => void;
  onSubmitFeedback: (reason: string) => void;
  onDeleteProgram: () => void;
  isGuest: boolean;
}) {
  const [showFeedbackOptions, setShowFeedbackOptions] = useState(false);
  const [feedbackReason, setFeedbackReason] = useState(program.feedbackReason || "not_relevant");
  const [showScholarships, setShowScholarships] = useState(false);
  const router = useRouter();
  const hasScholarships = program.scholarships && program.scholarships.length > 0;
  const hasFeedback = program.feedbackNegative === true;

  const handleToggleFavorite = () => {
    if (isGuest) {
      alert("Please sign up to save favorites.");
      return;
    }
    onToggleFavorite();
  };

  const handleSubmitFeedback = (reason: string) => {
    if (isGuest) {
      alert("Please sign up to submit feedback.");
      return;
    }
    onSubmitFeedback(reason);
  };

  const handleDeleteProgram = () => {
    if (isGuest) {
      alert("Please sign up to manage programs.");
      return;
    }
    onDeleteProgram();
  };

  const handleAskAI = () => {
    if (!program) return;
    router.push("/chat");
  };

  return (
    <Card className="w-full overflow-hidden transition-all duration-200 hover:shadow-md">
      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h4 className="font-semibold text-base">{program.name}</h4>
            <p className="text-sm text-muted-foreground">{program.institution}</p>
            <div className="flex items-center text-xs text-muted-foreground mt-1.5">
              <BookOpen className="h-3.5 w-3.5 mr-1.5 text-blue-500" />
              <span>Part of pathway</span>
            </div>
          </div>
          <Badge variant="outline" className="text-xs font-medium">
            {program.degreeType}
          </Badge>
        </div>
        
        <div className="mt-3 space-y-2 bg-muted/20 p-2.5 rounded-md">
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
                    <h5 className="font-semibold mb-2 flex items-center text-blue-700"><TrendingUp className="h-4 w-4 mr-1.5" /> Match Rationale</h5>
                    <div className="space-y-1.5 pl-2">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center"><GraduationCap className="h-3.5 w-3.5 mr-1.5 text-blue-500" /> Academic Fit:</span>
                        <span className="font-semibold">{program.matchRationale.academicFit || 0}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center"><TrendingUp className="h-3.5 w-3.5 mr-1.5 text-blue-500" /> Career Alignment:</span>
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
          >
            {isGuest ? (
              <><Lock className="h-3.5 w-3.5 mr-1.5" /> Save</>
            ) : (
              <><ThumbsUp className="h-3.5 w-3.5 mr-1.5" /> {program.isFavorite ? "Saved" : "Save"}</>
            )}
          </Button>
            
          {!showFeedbackOptions && !hasFeedback ? (
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
                setShowFeedbackOptions(true);
              }}
            >
              {isGuest ? (
                <><Lock className="h-3.5 w-3.5 mr-1.5" /> Feedback</>
              ) : (
                <><ThumbsDown className="h-3.5 w-3.5 mr-1.5" /> Not interested</>
              )}
            </Button>
          ) : hasFeedback ? (
            <div className="flex items-center">
              <Badge variant="outline" className="text-xs">
                <ThumbsDown className="h-3 w-3 mr-1.5 text-red-500" />
                {program.feedbackReason || "Not interested"}
              </Badge>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <select 
                className="text-xs h-8 px-2 rounded-md border"
                value={feedbackReason}
                onChange={(e) => setFeedbackReason(e.target.value)}
              >
                <option value="not_relevant">Not Relevant</option>
                <option value="too_expensive">Too Expensive</option>
                <option value="wrong_location">Wrong Location</option>
                <option value="other">Other</option>
              </select>
              <Button 
                variant="outline" 
                size="sm"
                className="h-8 px-2.5 text-xs"
                onClick={() => {
                  handleSubmitFeedback(feedbackReason);
                  setShowFeedbackOptions(false);
                }}
              >
                Submit
              </Button>
            </div>
          )}
            
          <Button 
            variant="ghost"
            size="sm"
            className="h-8 px-2.5 text-muted-foreground hover:text-red-500 hover:bg-red-50"
            title={isGuest ? "Sign up to remove programs" : "Remove this program suggestion"}
            onClick={handleDeleteProgram}
          >
            {isGuest ? <Lock className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
          </Button>
        </div>
          
        {/* Secondary Actions: Vista Assistant widget & Explore Program */}
        <div className="flex justify-between items-center mt-4 pt-3 border-t">
          {/* Inline GradCapAssistant for program-specific Q&A */}
          <GradCapAssistant
            className="relative" // ensure proper positioning inside the card
            contextMessage={`The user is asking about the following program: ${program.name} offered by ${program.institution}. Make sure you review user's profile and the program details, both of which you have access to within the vector store files, before responding.`}
            placeholder="What do you want to know about this program?"
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
      </div>
    </Card>
  );
} 