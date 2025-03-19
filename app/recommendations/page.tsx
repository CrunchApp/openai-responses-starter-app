"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  BookOpen, 
  Calendar, 
  Clock, 
  DollarSign, 
  Edit, 
  FileText, 
  Globe, 
  Heart, 
  Info, 
  MessageSquare, 
  Scroll, 
  Star, 
  ThumbsDown, 
  ThumbsUp, 
  User 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import useToolsStore from "@/stores/useToolsStore";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

// Placeholder data types
interface RecommendationProgram {
  id: string;
  name: string;
  institution: string;
  degreeType: string;
  fieldOfStudy: string;
  description: string;
  matchScore: number;
  costPerYear: number;
  duration: number;
  location: string;
  startDate: string;
  isFavorite: boolean;
  matchRationale: {
    careerAlignment: number;
    budgetFit: number;
    locationMatch: number;
    academicFit: number;
  };
  applicationDeadline: string;
  requirements: string[];
  highlights: string[];
}

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  goal: string;
  desiredField: string;
}

export default function RecommendationsPage() {
  const { vectorStore, fileSearchEnabled, setFileSearchEnabled } = useToolsStore();
  const router = useRouter();
  
  // State for user profile and recommendations
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationProgram[]>([]);
  const [favoriteRecommendations, setFavoriteRecommendations] = useState<RecommendationProgram[]>([]);
  const [activeTab, setActiveTab] = useState("recommendations");
  const [isLoading, setIsLoading] = useState(true);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [feedbackProgram, setFeedbackProgram] = useState<string | null>(null);

  // Ensure file search is enabled if we have a vector store
  useEffect(() => {
    if (vectorStore && vectorStore.id && !fileSearchEnabled) {
      setFileSearchEnabled(true);
    }
    
    // Simulate loading profile data and recommendations
    setTimeout(() => {
      // Placeholder user profile data
      setUserProfile({
        firstName: "Sarah",
        lastName: "Johnson",
        email: "sarah.j@example.com",
        goal: "Master's Degree",
        desiredField: "Data Science"
      });
      
      // Placeholder recommendations data
      const mockRecommendations = [
        {
          id: "rec1",
          name: "Master of Science in Data Science",
          institution: "Stanford University",
          degreeType: "Master's",
          fieldOfStudy: "Data Science",
          description: "A comprehensive program that combines computer science, statistics, and domain knowledge to prepare students for careers in data science and analytics.",
          matchScore: 92,
          costPerYear: 58000,
          duration: 24,
          location: "Stanford, CA, USA",
          startDate: "September 2024",
          isFavorite: false,
          matchRationale: {
            careerAlignment: 95,
            budgetFit: 85,
            locationMatch: 90,
            academicFit: 98
          },
          applicationDeadline: "January 15, 2024",
          requirements: [
            "Bachelor's degree in related field",
            "GRE scores",
            "3 Letters of recommendation",
            "Statement of purpose"
          ],
          highlights: [
            "Industry connections with Silicon Valley tech companies",
            "Research opportunities with renowned faculty",
            "Flexible curriculum with specialization options"
          ]
        },
        {
          id: "rec2",
          name: "Master of Data Science",
          institution: "University of California, Berkeley",
          degreeType: "Master's",
          fieldOfStudy: "Data Science",
          description: "A program designed to develop proficiency in the key technical foundations of data science: computing, statistics, optimization, and applications.",
          matchScore: 88,
          costPerYear: 54000,
          duration: 12,
          location: "Berkeley, CA, USA",
          startDate: "August 2024",
          isFavorite: false,
          matchRationale: {
            careerAlignment: 90,
            budgetFit: 87,
            locationMatch: 88,
            academicFit: 86
          },
          applicationDeadline: "December 15, 2023",
          requirements: [
            "Bachelor's degree with strong quantitative background",
            "GRE scores (optional)",
            "2 Letters of recommendation",
            "Personal statement"
          ],
          highlights: [
            "Accelerated 1-year program",
            "Capstone project with industry partners",
            "Strong alumni network in tech"
          ]
        },
        {
          id: "rec3",
          name: "MSc in Applied Data Science",
          institution: "Columbia University",
          degreeType: "Master's",
          fieldOfStudy: "Data Science",
          description: "This program provides a solid foundation in computational and statistical aspects of data science, with a focus on applications in various domains.",
          matchScore: 85,
          costPerYear: 62000,
          duration: 18,
          location: "New York, NY, USA",
          startDate: "August 2024",
          isFavorite: false,
          matchRationale: {
            careerAlignment: 88,
            budgetFit: 75,
            locationMatch: 92,
            academicFit: 86
          },
          applicationDeadline: "February 1, 2024",
          requirements: [
            "Bachelor's degree in any field",
            "Programming experience",
            "Basic knowledge of statistics",
            "3 Letters of recommendation"
          ],
          highlights: [
            "Located in NYC with access to major financial and tech companies",
            "Interdisciplinary curriculum",
            "Thesis and non-thesis options available"
          ]
        }
      ];
      
      setRecommendations(mockRecommendations);
      setIsLoading(false);
    }, 1500);
  }, [vectorStore, fileSearchEnabled, setFileSearchEnabled]);

  const handleGoToAssistant = () => {
    if (vectorStore && vectorStore.id && !fileSearchEnabled) {
      setFileSearchEnabled(true);
    }
    router.push("/");
  };

  const toggleFavorite = (recommendationId: string) => {
    setRecommendations(prevRecs => 
      prevRecs.map(rec => 
        rec.id === recommendationId ? { ...rec, isFavorite: !rec.isFavorite } : rec
      )
    );
    
    // Update favorites list
    const updatedRecs = recommendations.map(rec => 
      rec.id === recommendationId ? { ...rec, isFavorite: !rec.isFavorite } : rec
    );
    
    setFavoriteRecommendations(updatedRecs.filter(rec => rec.isFavorite));
  };

  const handleFeedbackSubmit = (id: string, isPositive: boolean, reason?: string) => {
    // Here we would send the feedback to the backend
    console.log(`Feedback for ${id}: ${isPositive ? 'Positive' : 'Negative'}${reason ? `, Reason: ${reason}` : ''}`);
    setFeedbackProgram(null);
  };
  
  // Variants for animations
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1
      }
    }
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: "spring", stiffness: 100 }
    }
  };

  return (
    <div className="container mx-auto py-4 md:py-8 px-4 max-w-6xl">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
          <p className="text-zinc-600">Loading your personalized recommendations...</p>
        </div>
      ) : userProfile ? (
        <>
          <div className="mb-6">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-2xl md:text-3xl font-bold mb-2">
                Hi {userProfile.firstName}, welcome to your education dashboard
              </h1>
              <p className="text-zinc-600">
                Exploring {userProfile.goal} programs in {userProfile.desiredField} based on your profile
              </p>
            </motion.div>
          </div>
          
          <Tabs defaultValue="recommendations" className="w-full" onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="recommendations" className="text-sm md:text-base">
                <BookOpen className="w-4 h-4 mr-2 hidden md:inline" />
                Recommendations
              </TabsTrigger>
              <TabsTrigger value="saved" className="text-sm md:text-base">
                <Heart className="w-4 h-4 mr-2 hidden md:inline" />
                Saved Programs
              </TabsTrigger>
              <TabsTrigger value="applications" className="text-sm md:text-base">
                <FileText className="w-4 h-4 mr-2 hidden md:inline" />
                Applications
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="recommendations">
              {recommendations.length > 0 ? (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="space-y-6"
                >
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h2 className="text-xl font-semibold">Programs matched to your profile</h2>
                      <p className="text-sm text-zinc-500">{recommendations.length} recommendations found</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => router.push("/profile")}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Profile
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">Sort By</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem>Match Score (High to Low)</DropdownMenuItem>
                          <DropdownMenuItem>Cost (Low to High)</DropdownMenuItem>
                          <DropdownMenuItem>Duration (Short to Long)</DropdownMenuItem>
                          <DropdownMenuItem>Application Deadline</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  {recommendations.map((program) => (
                    <motion.div 
                      key={program.id}
                      variants={itemVariants}
                      layout
                    >
                      <Card className={`overflow-hidden transition-all duration-300 hover:shadow-md ${program.id === expandedCardId ? 'ring-2 ring-blue-200' : ''}`}>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg md:text-xl font-bold mb-1">
                                {program.name}
                              </CardTitle>
                              <CardDescription className="text-base">
                                {program.institution}
                              </CardDescription>
                            </div>
                            <div className="flex flex-col items-end">
                              <div className="bg-blue-50 text-blue-700 rounded-full px-3 py-1 text-sm font-semibold flex items-center">
                                <Star className="w-4 h-4 mr-1 text-yellow-500 fill-yellow-500" />
                                {program.matchScore}% Match
                              </div>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="mt-2" 
                                onClick={() => toggleFavorite(program.id)}
                              >
                                <Heart 
                                  className={`h-5 w-5 ${program.isFavorite ? 'fill-red-500 text-red-500' : 'text-zinc-400'}`} 
                                />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pb-2">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                            <div className="flex items-center">
                              <DollarSign className="h-4 w-4 text-zinc-500 mr-2" />
                              <span className="text-sm">${program.costPerYear.toLocaleString()}/year</span>
                            </div>
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 text-zinc-500 mr-2" />
                              <span className="text-sm">{program.duration} months</span>
                            </div>
                            <div className="flex items-center">
                              <Globe className="h-4 w-4 text-zinc-500 mr-2" />
                              <span className="text-sm">{program.location}</span>
                            </div>
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 text-zinc-500 mr-2" />
                              <span className="text-sm">{program.startDate}</span>
                            </div>
                          </div>
                          
                          <div className="mt-3">
                            <p className="text-sm text-zinc-700 line-clamp-2">
                              {program.description}
                            </p>
                          </div>
                        </CardContent>
                        <CardFooter className="pt-0 flex flex-col items-stretch">
                          <Accordion 
                            type="single" 
                            collapsible 
                            onValueChange={(value) => {
                              if (value) {
                                setExpandedCardId(program.id);
                              } else {
                                setExpandedCardId(null);
                              }
                            }}
                          >
                            <AccordionItem value="details" className="border-none">
                              <AccordionTrigger className="py-2 text-sm font-medium text-blue-600">
                                Show program details
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="space-y-4 pt-2">
                                  <div>
                                    <h4 className="text-sm font-medium mb-2">Why This Matches Your Profile</h4>
                                    <div className="space-y-2">
                                      <div>
                                        <div className="flex justify-between text-xs mb-1">
                                          <span>Career Alignment</span>
                                          <span>{program.matchRationale.careerAlignment}%</span>
                                        </div>
                                        <Progress value={program.matchRationale.careerAlignment} className="h-2" />
                                      </div>
                                      <div>
                                        <div className="flex justify-between text-xs mb-1">
                                          <span>Budget Fit</span>
                                          <span>{program.matchRationale.budgetFit}%</span>
                                        </div>
                                        <Progress value={program.matchRationale.budgetFit} className="h-2" />
                                      </div>
                                      <div>
                                        <div className="flex justify-between text-xs mb-1">
                                          <span>Location Match</span>
                                          <span>{program.matchRationale.locationMatch}%</span>
                                        </div>
                                        <Progress value={program.matchRationale.locationMatch} className="h-2" />
                                      </div>
                                      <div>
                                        <div className="flex justify-between text-xs mb-1">
                                          <span>Academic Fit</span>
                                          <span>{program.matchRationale.academicFit}%</span>
                                        </div>
                                        <Progress value={program.matchRationale.academicFit} className="h-2" />
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <h4 className="text-sm font-medium mb-2">Program Highlights</h4>
                                      <ul className="list-disc pl-5 text-sm space-y-1">
                                        {program.highlights.map((highlight, index) => (
                                          <li key={index}>{highlight}</li>
                                        ))}
                                      </ul>
                                    </div>
                                    <div>
                                      <h4 className="text-sm font-medium mb-2">Application Requirements</h4>
                                      <ul className="list-disc pl-5 text-sm space-y-1">
                                        {program.requirements.map((req, index) => (
                                          <li key={index}>{req}</li>
                                        ))}
                                      </ul>
                                      <p className="text-xs text-zinc-500 mt-2">
                                        Application Deadline: <span className="font-medium">{program.applicationDeadline}</span>
                                      </p>
                                    </div>
                                  </div>
                                  
                                  <div className="pt-2 flex flex-col md:flex-row gap-3 justify-between">
                                    <div className="flex flex-col md:flex-row gap-2">
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={handleGoToAssistant}
                                      >
                                        <MessageSquare className="w-4 h-4 mr-2" />
                                        Ask AI About This Program
                                      </Button>
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button 
                                            variant="ghost" 
                                            size="sm"
                                            onClick={() => setFeedbackProgram(program.id)}
                                          >
                                            <Info className="w-4 h-4 mr-2" />
                                            Give Feedback
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Program Feedback</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Is this program relevant to your educational goals?
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <div className="flex flex-col gap-4 py-4">
                                            <div className="flex gap-4">
                                              <Button 
                                                variant="outline" 
                                                className="flex-1 flex gap-2"
                                                onClick={() => handleFeedbackSubmit(program.id, true)}
                                              >
                                                <ThumbsUp className="h-4 w-4" />
                                                Yes, this fits
                                              </Button>
                                              <Button 
                                                variant="outline" 
                                                className="flex-1 flex gap-2"
                                                onClick={() => handleFeedbackSubmit(program.id, false)}
                                              >
                                                <ThumbsDown className="h-4 w-4" />
                                                Not relevant
                                              </Button>
                                            </div>
                                            <div className="border-t pt-4">
                                              <h4 className="text-sm font-medium mb-3">If not relevant, why?</h4>
                                              <RadioGroup defaultValue="default">
                                                <div className="flex items-center space-x-2 mb-2">
                                                  <RadioGroupItem value="interest" id="interest" />
                                                  <Label htmlFor="interest">Changed interest area</Label>
                                                </div>
                                                <div className="flex items-center space-x-2 mb-2">
                                                  <RadioGroupItem value="cost" id="cost" />
                                                  <Label htmlFor="cost">Too expensive</Label>
                                                </div>
                                                <div className="flex items-center space-x-2 mb-2">
                                                  <RadioGroupItem value="location" id="location" />
                                                  <Label htmlFor="location">Location not suitable</Label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                  <RadioGroupItem value="requirements" id="requirements" />
                                                  <Label htmlFor="requirements">Requirements too demanding</Label>
                                                </div>
                                              </RadioGroup>
                                            </div>
                                          </div>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleFeedbackSubmit(program.id, false, "Changed interest area")}>
                                              Submit Feedback
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </div>
                                    <Button>
                                      Explore Program
                                    </Button>
                                  </div>
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        </CardFooter>
                      </Card>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <div className="bg-white p-8 rounded-lg shadow-md text-center">
                  <div className="mb-4 bg-amber-100 p-4 inline-block rounded-full">
                    <Info className="h-8 w-8 text-amber-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">No recommendations found</h3>
                  <p className="text-zinc-600 mb-6 max-w-md mx-auto">
                    We couldn't find programs matching your current profile. Try adjusting your preferences to see more recommendations.
                  </p>
                  <Button onClick={() => router.push("/profile")}>
                    <Edit className="w-4 h-4 mr-2" />
                    Update Your Profile
                  </Button>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="saved">
              <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <h2 className="text-xl font-semibold mb-4">Your Saved Programs</h2>
                
                {recommendations.filter(rec => rec.isFavorite).length > 0 ? (
                  <div className="space-y-4">
                    {recommendations.filter(rec => rec.isFavorite).map(program => (
                      <Card key={program.id} className="flex flex-col md:flex-row overflow-hidden hover:shadow-md transition-all duration-300">
                        <div className="md:w-3/4 p-4">
                          <h3 className="font-semibold text-lg">{program.name}</h3>
                          <p className="text-sm text-zinc-600">{program.institution}</p>
                          <div className="flex gap-3 mt-2 text-sm text-zinc-700">
                            <span className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {program.duration} months
                            </span>
                            <span className="flex items-center">
                              <DollarSign className="h-3 w-3 mr-1" />
                              ${program.costPerYear.toLocaleString()}/year
                            </span>
                          </div>
                          <p className="text-xs mt-2 text-zinc-500">Saved on {new Date().toLocaleDateString()}</p>
                        </div>
                        <div className="md:w-1/4 bg-gray-50 p-4 flex flex-col justify-center items-center">
                          <Badge variant="outline" className="mb-2 bg-blue-50 text-blue-700 hover:bg-blue-50">
                            <Star className="w-3 h-3 mr-1 fill-yellow-500 text-yellow-500" />
                            {program.matchScore}% Match
                          </Badge>
                          <div className="flex gap-2 mt-2">
                            <Button size="sm" variant="ghost" onClick={() => toggleFavorite(program.id)}>
                              <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                            </Button>
                            <Button size="sm">View Details</Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Heart className="h-10 w-10 mx-auto text-zinc-300 mb-4" />
                    <h3 className="text-lg font-medium text-zinc-700 mb-2">No saved programs yet</h3>
                    <p className="text-zinc-500 mb-4">
                      When you find programs you like, click the heart icon to save them for later.
                    </p>
                    <Button variant="outline" onClick={() => setActiveTab("recommendations")}>
                      Browse Recommendations
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="applications">
              <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <h2 className="text-xl font-semibold mb-4">Your Applications</h2>
                
                <div className="text-center py-8">
                  <Scroll className="h-10 w-10 mx-auto text-zinc-300 mb-4" />
                  <h3 className="text-lg font-medium text-zinc-700 mb-2">No applications in progress</h3>
                  <p className="text-zinc-500 mb-4">
                    When you're ready to apply to programs, you can track your applications here.
                  </p>
                  <Button variant="outline" onClick={() => setActiveTab("recommendations")}>
                    Explore Programs
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-2xl mx-auto">
          <div className="mb-4 bg-amber-100 p-4 inline-block rounded-full">
            <User className="h-8 w-8 text-amber-600" />
          </div>
          <h3 className="text-xl font-bold mb-2">Profile not complete</h3>
          <p className="text-zinc-600 mb-6">
            To see personalized education recommendations, you need to complete your profile first.
          </p>
          <Button onClick={() => router.push("/profile")}>
            Complete Your Profile
          </Button>
        </div>
      )}
      
      <div className="mt-12 text-center">
        <p className="text-sm text-zinc-500 mb-2">Need help exploring your options?</p>
        <Button variant="outline" onClick={handleGoToAssistant}>
          <MessageSquare className="w-4 h-4 mr-2" />
          Chat with your AI Education Adviser
        </Button>
      </div>
    </div>
  );
}