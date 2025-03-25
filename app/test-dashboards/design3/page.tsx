"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  GraduationCap, BookOpen, Award, Star, 
  Briefcase, ArrowRight, Calendar, MapPin,
  FileText, Zap, Check, Clock, ChevronLeft, 
  ChevronRight, Search, Info, ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// Sample milestones data
const timelineMilestones = [
  {
    id: 1,
    type: "education",
    title: "High School Diploma",
    institution: "Lincoln High School",
    date: "June 2017",
    description: "Graduated with honors, focused on STEM subjects",
    skills: ["Mathematics", "Computer Science", "Physics"],
    status: "completed",
    icon: GraduationCap,
  },
  {
    id: 2,
    type: "education",
    title: "Bachelor's in Computer Science",
    institution: "State University",
    date: "2017 - 2021",
    description: "Specialized in software development with minor in data science",
    skills: ["Programming", "Algorithms", "Data Structures", "Web Development"],
    status: "completed",
    icon: GraduationCap,
  },
  {
    id: 3,
    type: "work",
    title: "Software Engineering Internship",
    institution: "Tech Innovations Inc.",
    date: "Summer 2020",
    description: "Developed frontend components and assisted with API integration",
    skills: ["React", "TypeScript", "REST API", "Git"],
    status: "completed",
    icon: Briefcase,
  },
  {
    id: 4,
    type: "certification",
    title: "AWS Cloud Practitioner",
    institution: "Amazon Web Services",
    date: "January 2021",
    description: "Foundational knowledge of AWS cloud services and architecture",
    skills: ["Cloud Computing", "AWS Services", "Security Fundamentals"],
    status: "completed",
    icon: Award,
  },
  {
    id: 5,
    type: "education",
    title: "Master's in Data Science",
    institution: "Tech Institute",
    date: "2022 - Present",
    description: "Advanced study in machine learning and big data analytics",
    skills: ["Machine Learning", "Statistical Analysis", "Big Data", "Python"],
    status: "in-progress",
    icon: GraduationCap,
    progress: 65,
  },
  {
    id: 6,
    type: "certification",
    title: "Machine Learning Specialization",
    institution: "Coursera",
    date: "In Progress",
    description: "Comprehensive course on machine learning algorithms and applications",
    skills: ["Supervised Learning", "Neural Networks", "Model Deployment"],
    status: "in-progress",
    icon: Award,
    progress: 40,
  },
  {
    id: 7,
    type: "future",
    title: "AI Engineer Certification",
    institution: "Microsoft",
    date: "Recommended",
    description: "Professional certification for AI solution development",
    skills: ["AI Services", "Machine Learning Operations", "Responsible AI"],
    status: "recommended",
    icon: Star,
  },
  {
    id: 8,
    type: "future",
    title: "PhD in Artificial Intelligence",
    institution: "Top Research University",
    date: "2024 - 2028 (Projected)",
    description: "Advanced research in artificial intelligence and machine learning",
    skills: ["Research Methods", "Deep Learning", "Natural Language Processing"],
    status: "planned",
    icon: GraduationCap,
  },
];

// Sample recommended courses
const recommendedCourses = [
  {
    id: 1,
    title: "Deep Learning Specialization",
    provider: "DeepLearning.AI",
    duration: "3 months",
    level: "Advanced",
    matchScore: 94,
  },
  {
    id: 2,
    title: "Natural Language Processing",
    provider: "Stanford Online",
    duration: "10 weeks",
    level: "Intermediate",
    matchScore: 87,
  },
  {
    id: 3,
    title: "MLOps Engineering",
    provider: "Google Cloud",
    duration: "6 weeks",
    level: "Advanced",
    matchScore: 91,
  },
];

// Sample skills data
const skillsData = [
  { name: "Programming", level: "Expert", category: "Technical" },
  { name: "Data Analysis", level: "Advanced", category: "Technical" },
  { name: "Machine Learning", level: "Intermediate", category: "Technical" },
  { name: "Cloud Computing", level: "Intermediate", category: "Technical" },
  { name: "Project Management", level: "Beginner", category: "Soft" },
  { name: "Communication", level: "Advanced", category: "Soft" },
];

export default function TimelineDashboard() {
  const [focusedMilestone, setFocusedMilestone] = useState<number | null>(5); // Default to current milestone
  const [timelineView, setTimelineView] = useState<"all" | "education" | "work" | "certification">("all");
  const [zoomLevel, setZoomLevel] = useState(1);
  
  // Filter milestones based on timeline view
  const filteredMilestones = timelineMilestones.filter(milestone => 
    timelineView === "all" || milestone.type === timelineView
  );

  // Get the focused milestone details
  const focusedMilestoneData = focusedMilestone 
    ? timelineMilestones.find(m => m.id === focusedMilestone) 
    : null;

  // Get milestone status color
  const getMilestoneStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-500";
      case "in-progress": return "bg-blue-500";
      case "recommended": return "bg-purple-500";
      case "planned": return "bg-amber-500";
      default: return "bg-gray-400";
    }
  };

  // Get milestone type style
  const getMilestoneTypeStyle = (type: string) => {
    switch (type) {
      case "education": return "bg-blue-100 text-blue-800";
      case "work": return "bg-green-100 text-green-800";
      case "certification": return "bg-amber-100 text-amber-800";
      case "future": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // Navigate to previous milestone
  const goToPreviousMilestone = () => {
    if (focusedMilestone && focusedMilestone > 1) {
      setFocusedMilestone(focusedMilestone - 1);
    }
  };

  // Navigate to next milestone
  const goToNextMilestone = () => {
    if (focusedMilestone && focusedMilestone < timelineMilestones.length) {
      setFocusedMilestone(focusedMilestone + 1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 pb-10">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Education Journey Explorer</h1>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm">
                <Calendar className="w-4 h-4 mr-2" />
                Academic Planner
              </Button>
              <Button>
                <FileText className="w-4 h-4 mr-2" />
                Goal Setting
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Timeline Navigation */}
      <div className="container mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800 mb-2 md:mb-0">Your Learning Timeline</h2>
            <div className="flex items-center gap-2">
              <Tabs value={timelineView} onValueChange={(v) => setTimelineView(v as any)}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="education">Education</TabsTrigger>
                  <TabsTrigger value="work">Work</TabsTrigger>
                  <TabsTrigger value="certification">Certifications</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex border rounded-md">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}
                  disabled={zoomLevel <= 0.5}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="flex items-center justify-center px-2 text-sm">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.25))}
                  disabled={zoomLevel >= 2}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          {/* Timeline visualization */}
          <div className="relative overflow-x-auto py-4" style={{ minHeight: "120px" }}>
            <div 
              className="absolute h-1 bg-gray-200 top-14" 
              style={{ width: `${100 * zoomLevel}%`, minWidth: "100%" }}
            ></div>
            
            {filteredMilestones.map((milestone) => {
              // Calculate position on timeline (simple version)
              const position = (milestone.id / timelineMilestones.length) * 100;
              
              return (
                <motion.div
                  key={milestone.id}
                  className={`absolute top-8 -translate-x-1/2 flex flex-col items-center`}
                  style={{ left: `${position * zoomLevel}%` }}
                  whileHover={{ scale: 1.05 }}
                  animate={{ opacity: focusedMilestone === milestone.id ? 1 : 0.7 }}
                >
                  <div 
                    className={`w-6 h-6 rounded-full cursor-pointer flex items-center justify-center ${getMilestoneStatusColor(milestone.status)}`}
                    onClick={() => setFocusedMilestone(milestone.id)}
                  >
                    {milestone.status === "completed" && <Check className="w-3 h-3 text-white" />}
                    {milestone.status === "in-progress" && <Clock className="w-3 h-3 text-white" />}
                  </div>
                  <div className="w-px h-6 bg-gray-300"></div>
                  <div className={`text-xs font-medium max-w-[120px] text-center mt-1 ${focusedMilestone === milestone.id ? 'text-gray-900' : 'text-gray-600'}`}>
                    {milestone.title}
                  </div>
                  <div className="text-xs text-gray-500 max-w-[120px] text-center">
                    {milestone.date}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column - Milestone Details */}
          <div className="md:col-span-2">
            {focusedMilestoneData ? (
              <motion.div
                key={focusedMilestoneData.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="shadow-lg border-t-4" style={{ borderTopColor: getMilestoneStatusColorHex(focusedMilestoneData.status) }}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between">
                      <Badge variant="outline" className={getMilestoneTypeStyle(focusedMilestoneData.type)}>
                        {capitalizeFirstLetter(focusedMilestoneData.type)}
                      </Badge>
                      <div className="flex gap-2">
                        <Button variant="outline" size="icon" onClick={goToPreviousMilestone} disabled={focusedMilestoneData.id === 1}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={goToNextMilestone} disabled={focusedMilestoneData.id === timelineMilestones.length}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardTitle className="text-xl font-bold mt-2">{focusedMilestoneData.title}</CardTitle>
                    <CardDescription className="flex items-center">
                      <focusedMilestoneData.icon className="w-4 h-4 mr-2" />
                      {focusedMilestoneData.institution} • {focusedMilestoneData.date}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold mb-2">Overview</h3>
                      <p className="text-gray-700">{focusedMilestoneData.description}</p>
                    </div>
                    
                    {focusedMilestoneData.status === "in-progress" && (
                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">Progress</span>
                          <span>{focusedMilestoneData.progress}%</span>
                        </div>
                        <Progress value={focusedMilestoneData.progress} className="h-2" />
                      </div>
                    )}
                    
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold mb-2">Skills Acquired</h3>
                      <div className="flex flex-wrap gap-2">
                        {focusedMilestoneData.skills.map((skill, index) => (
                          <Badge key={index} variant="secondary" className="bg-gray-100">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    {(focusedMilestoneData.status === "recommended" || focusedMilestoneData.status === "planned") && (
                      <div className="bg-blue-50 p-3 rounded-md">
                        <div className="flex items-start">
                          <Info className="w-5 h-5 text-blue-500 mr-2 mt-0.5" />
                          <div>
                            <h3 className="text-sm font-semibold text-blue-700">Why This Is Recommended</h3>
                            <p className="text-sm text-blue-600">Based on your profile and career aspirations in AI/ML, this milestone will help you gain specialized expertise in cutting-edge technologies.</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button variant="outline">
                      <FileText className="w-4 h-4 mr-2" />
                      Resources
                    </Button>
                    
                    {focusedMilestoneData.status === "recommended" && (
                      <Button>
                        <Zap className="w-4 h-4 mr-2" />
                        Add to Plan
                      </Button>
                    )}
                    
                    {focusedMilestoneData.status === "in-progress" && (
                      <Button>
                        <ArrowRight className="w-4 h-4 mr-2" />
                        Continue Learning
                      </Button>
                    )}
                    
                    {focusedMilestoneData.status === "completed" && (
                      <Button variant="outline">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Certificate
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              </motion.div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-gray-500">Select a milestone from the timeline to view details</p>
                </CardContent>
              </Card>
            )}
            
            {/* Related Courses */}
            {focusedMilestoneData && (focusedMilestoneData.status === "in-progress" || focusedMilestoneData.status === "recommended" || focusedMilestoneData.status === "planned") && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">Recommended Next Steps</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recommendedCourses.map((course) => (
                    <Card key={course.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-base">{course.title}</CardTitle>
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            {course.matchScore}% Match
                          </Badge>
                        </div>
                        <CardDescription>{course.provider}</CardDescription>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="flex items-center text-sm text-gray-500 mb-2">
                          <Clock className="w-4 h-4 mr-1" /> {course.duration}
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <BookOpen className="w-4 h-4 mr-1" /> {course.level}
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button variant="outline" className="w-full">View Course</Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Right Column - Skills & Stats */}
          <div className="space-y-6">
            {/* Journey Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Journey Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">Overall Completion</span>
                      <span>60%</span>
                    </div>
                    <Progress value={60} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">Education</span>
                      <span>75%</span>
                    </div>
                    <Progress value={75} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">Work Experience</span>
                      <span>40%</span>
                    </div>
                    <Progress value={40} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">Certifications</span>
                      <span>50%</span>
                    </div>
                    <Progress value={50} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Skills Overview */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Skills Overview</CardTitle>
                <CardDescription>Your current skill proficiency</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {skillsData.map((skill, index) => (
                    <div key={index}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{skill.name}</span>
                        <Badge variant="outline" className={getSkillLevelStyle(skill.level)}>
                          {skill.level}
                        </Badge>
                      </div>
                      <Progress value={getSkillLevelPercentage(skill.level)} className="h-1.5" />
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full text-sm">
                  <Award className="w-4 h-4 mr-2" />
                  Take Skills Assessment
                </Button>
              </CardFooter>
            </Card>
            
            {/* Career Path Recommendation */}
            <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Suggested Career Path</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-white rounded-md p-3 mb-3 shadow-sm">
                  <h3 className="font-medium text-gray-900 mb-1">Machine Learning Engineer</h3>
                  <p className="text-sm text-gray-600 mb-1">
                    A specialized field that combines software engineering with data science
                  </p>
                  <div className="flex items-center">
                    <MapPin className="w-3 h-3 text-gray-500 mr-1" />
                    <span className="text-xs text-gray-500">Tech Industry</span>
                    <span className="mx-1 text-gray-300">•</span>
                    <Star className="w-3 h-3 text-amber-500 mr-1" />
                    <span className="text-xs text-gray-500">High Demand</span>
                  </div>
                </div>
                <div className="bg-white rounded-md p-3 shadow-sm">
                  <h3 className="font-medium text-gray-900 mb-1">AI Research Scientist</h3>
                  <p className="text-sm text-gray-600 mb-1">
                    Focus on developing new algorithms and advancing the field of AI
                  </p>
                  <div className="flex items-center">
                    <MapPin className="w-3 h-3 text-gray-500 mr-1" />
                    <span className="text-xs text-gray-500">Academia/Industry</span>
                    <span className="mx-1 text-gray-300">•</span>
                    <Star className="w-3 h-3 text-amber-500 mr-1" />
                    <span className="text-xs text-gray-500">Growing Field</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full">
                  Career Path Explorer
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper functions
function capitalizeFirstLetter(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function getMilestoneStatusColorHex(status: string) {
  switch (status) {
    case "completed": return "#22c55e"; // green-500
    case "in-progress": return "#3b82f6"; // blue-500
    case "recommended": return "#8b5cf6"; // purple-500
    case "planned": return "#f59e0b"; // amber-500
    default: return "#9ca3af"; // gray-400
  }
}

function getSkillLevelStyle(level: string) {
  switch (level) {
    case "Expert": return "bg-green-50 text-green-700";
    case "Advanced": return "bg-blue-50 text-blue-700";
    case "Intermediate": return "bg-amber-50 text-amber-700";
    case "Beginner": return "bg-gray-50 text-gray-700";
    default: return "bg-gray-50 text-gray-700";
  }
}

function getSkillLevelPercentage(level: string) {
  switch (level) {
    case "Expert": return 95;
    case "Advanced": return 80;
    case "Intermediate": return 60;
    case "Beginner": return 30;
    default: return 0;
  }
} 