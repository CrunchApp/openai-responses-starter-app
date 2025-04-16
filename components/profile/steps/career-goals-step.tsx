"use client";
import React, { useState } from "react";
import { UserProfile } from "@/app/types/profile-schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { X, Plus, HelpCircle, Briefcase, BookOpen, Target, Clock, TrendingUp, LucideIcon, Lightbulb, GraduationCap, Code, Award } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface CareerGoalsStepProps {
  profileData: UserProfile;
  setProfileData: React.Dispatch<React.SetStateAction<UserProfile>>;
}

export default function CareerGoalsStep({
  profileData,
  setProfileData,
}: CareerGoalsStepProps) {
  // State for active tab
  const [activeTab, setActiveTab] = useState("goals");
  
  // States for new items
  const [newSkill, setNewSkill] = useState("");
  const [newIndustry, setNewIndustry] = useState("");
  const [newRole, setNewRole] = useState("");
  
  // Character limits for textareas
  const SHORT_TERM_CHAR_LIMIT = 500;
  const LONG_TERM_CHAR_LIMIT = 500;
  const ACHIEVEMENTS_CHAR_LIMIT = 750;
  
  // Common suggestions
  const commonSkills = [
    { name: "Programming", icon: <Code size={14} /> },
    { name: "Data Analysis", icon: <TrendingUp size={14} /> },
    { name: "Project Management", icon: <Target size={14} /> },
    { name: "Leadership", icon: <Briefcase size={14} /> },
    { name: "Communication", icon: <BookOpen size={14} /> },
    { name: "Problem Solving", icon: <Lightbulb size={14} /> }
  ];
  
  const commonIndustries = [
    "Technology", "Healthcare", "Finance", "Education", 
    "Manufacturing", "Marketing", "Consulting", "Research"
  ];
  
  const commonRoles = [
    "Software Engineer", "Data Scientist", "Product Manager", 
    "UX Designer", "Marketing Specialist", "Financial Analyst"
  ];

  // Handle changes to text fields
  const handleTextChange = (
    field: "shortTerm" | "longTerm" | "achievements",
    value: string
  ) => {
    // Enforce character limit
    let limit = SHORT_TERM_CHAR_LIMIT;
    if (field === "longTerm") limit = LONG_TERM_CHAR_LIMIT;
    if (field === "achievements") limit = ACHIEVEMENTS_CHAR_LIMIT;
    
    if (value.length > limit) return;
    
    setProfileData((prevData) => ({
      ...prevData,
      careerGoals: {
        ...prevData.careerGoals,
        [field]: value,
      },
    }));
  };

  // Handle adding a skill
  const handleAddSkill = (skill: string) => {
    if (skill.trim() === "") return;
    if (profileData.skills.includes(skill.trim())) return;
    
    setProfileData((prevData) => ({
      ...prevData,
      skills: [...prevData.skills, skill.trim()],
    }));
  };

  // Handle removing a skill
  const handleRemoveSkill = (index: number) => {
    setProfileData((prevData) => ({
      ...prevData,
      skills: prevData.skills.filter((_, i) => i !== index),
    }));
  };

  // Handle adding industry
  const handleAddIndustry = (industry: string) => {
    if (industry.trim() === "") return;
    if (profileData.careerGoals.desiredIndustry.includes(industry.trim())) return;
    
    setProfileData((prevData) => ({
      ...prevData,
      careerGoals: {
        ...prevData.careerGoals,
        desiredIndustry: [...prevData.careerGoals.desiredIndustry, industry.trim()],
      },
    }));
  };

  // Handle removing industry
  const handleRemoveIndustry = (index: number) => {
    setProfileData((prevData) => ({
      ...prevData,
      careerGoals: {
        ...prevData.careerGoals,
        desiredIndustry: prevData.careerGoals.desiredIndustry.filter(
          (_, i) => i !== index
        ),
      },
    }));
  };

  // Handle adding role
  const handleAddRole = (role: string) => {
    if (role.trim() === "") return;
    if (profileData.careerGoals.desiredRoles.includes(role.trim())) return;
    
    setProfileData((prevData) => ({
      ...prevData,
      careerGoals: {
        ...prevData.careerGoals,
        desiredRoles: [...prevData.careerGoals.desiredRoles, role.trim()],
      },
    }));
  };

  // Handle removing role
  const handleRemoveRole = (index: number) => {
    setProfileData((prevData) => ({
      ...prevData,
      careerGoals: {
        ...prevData.careerGoals,
        desiredRoles: prevData.careerGoals.desiredRoles.filter(
          (_, i) => i !== index
        ),
      },
    }));
  };
  
  // Helper component for tooltips
  const InfoTooltip = ({ content }: { content: string }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full">
            <HelpCircle className="h-4 w-4 text-slate-500" />
            <span className="sr-only">Info</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-sm">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Achievements and Goals</h2>
        <p className="text-sm text-zinc-500">
          Help us understand your achievements and career goals to provide tailored educational recommendations.
        </p>
      </div>

      <Tabs defaultValue="goals" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 mb-6">
          <TabsTrigger value="goals" className="flex items-center gap-2">
            <Target size={16} />
            <span>Goals</span>
          </TabsTrigger>
          <TabsTrigger value="skills" className="flex items-center gap-2">
            <Briefcase size={16} />
            <span>Skills & Industries</span>
          </TabsTrigger>
        </TabsList>

        {/* ===== CAREER GOALS TAB ===== */}
        <TabsContent value="goals" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award size={18} className="text-blue-600" />
                Achievements & Background
                <InfoTooltip content="Your past achievements and experience help us identify your strengths and suggest programs that build on them." />
              </CardTitle>
              <CardDescription>
                Tell us about your standout achievements, awards, and extracurricular interests.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="achievements" className="text-sm font-medium flex items-center gap-1">
                    Achievements & Extracurricular Interests
                    <InfoTooltip content="Your unique achievements and interests help us recommend programs that value your specific background." />
                  </Label>
                  <span className="text-xs text-zinc-500">
                    {profileData.careerGoals.achievements?.length || 0}/{ACHIEVEMENTS_CHAR_LIMIT}
                  </span>
                </div>
                <Textarea
                  id="achievements"
                  value={profileData.careerGoals.achievements || ""}
                  onChange={(e) => handleTextChange("achievements", e.target.value)}
                  placeholder="What accomplishments are you most proud of? Include awards, leadership roles, volunteer work, or unique personal achievements. E.g., 'Led robotics team to regional championship' or 'Founded campus sustainability initiative'"
                  rows={4}
                  className="resize-none"
                  aria-describedby="achievementsHint"
                />
                <p id="achievementsHint" className="text-xs text-zinc-500">
                  Include academic honors, extracurricular activities, leadership positions, awards, or any standout experiences that showcase your potential.
                </p>
              </div>

              <div className="flex justify-center my-4">
                <div className="w-px h-8 bg-zinc-200 relative">
                  <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-blue-100 border border-blue-300 flex items-center justify-center">
                    <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="shortTerm" className="text-sm font-medium flex items-center gap-1">
                      Short-term Career Goals (1-2 years)
                      <InfoTooltip content="These immediate goals help us recommend programs that can help you reach your near-term objectives." />
                    </Label>
                    <span className="text-xs text-zinc-500">
                      {profileData.careerGoals.shortTerm.length}/{SHORT_TERM_CHAR_LIMIT}
                    </span>
                  </div>
                  <Textarea
                    id="shortTerm"
                    value={profileData.careerGoals.shortTerm}
                    onChange={(e) => handleTextChange("shortTerm", e.target.value)}
                    placeholder="What do you hope to achieve in the next 1-2 years? E.g., 'Find an entry-level position in digital marketing' or 'Gain specialized skills in data analysis'"
                    rows={3}
                    className="resize-none"
                    aria-describedby="shortTermHint"
                  />
                  <p id="shortTermHint" className="text-xs text-zinc-500">
                    Focus on specific positions, skills, or certifications you want to attain soon.
                  </p>
                </div>

                <div className="flex justify-center my-4">
                  <div className="w-px h-8 bg-zinc-200 relative">
                    <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-blue-100 border border-blue-300 flex items-center justify-center">
                      <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="longTerm" className="text-sm font-medium flex items-center gap-1">
                      Long-term Career Goals (5+ years)
                      <InfoTooltip content="Your long-term vision helps us recommend education paths that provide a foundation for your future aspirations." />
                    </Label>
                    <span className="text-xs text-zinc-500">
                      {profileData.careerGoals.longTerm.length}/{LONG_TERM_CHAR_LIMIT}
                    </span>
                  </div>
                  <Textarea
                    id="longTerm"
                    value={profileData.careerGoals.longTerm}
                    onChange={(e) => handleTextChange("longTerm", e.target.value)}
                    placeholder="Where do you see yourself in 5+ years? E.g., 'Lead a marketing team at a tech company' or 'Establish my own data consulting practice'"
                    rows={3}
                    className="resize-none"
                    aria-describedby="longTermHint"
                  />
                  <p id="longTermHint" className="text-xs text-zinc-500">
                    Consider your ideal role, industry position, or career achievements in the long run.
                  </p>
                </div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-md mt-4">
                <div className="flex items-start gap-3">
                  <GraduationCap className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-700">How this helps your education journey</h4>
                    <p className="text-xs text-blue-600 mt-1">
                      Your achievements and career goals help us identify education programs that value your background 
                      and provide the specific skills, knowledge, and credentials needed for your desired career path. 
                      The more specific your information, the more tailored our recommendations will be.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== SKILLS & INDUSTRIES TAB ===== */}
        <TabsContent value="skills" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code size={18} className="text-blue-600" />
                Skills & Expertise
                <InfoTooltip content="The skills you list help us match you with programs that can build on your existing strengths or develop new competencies." />
              </CardTitle>
              <CardDescription>
                Tell us about your current skills and those you'd like to develop.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2 mb-2">
                  {profileData.skills.map((skill, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary"
                      className="px-3 py-1.5 flex items-center gap-1"
                    >
                      <Code size={12} className="text-blue-500" />
                      {skill}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 ml-1"
                        onClick={() => handleRemoveSkill(index)}
                        aria-label={`Remove ${skill}`}
                      >
                        <X size={12} />
                      </Button>
                    </Badge>
                  ))}
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      placeholder="Add a skill (e.g., Python, Marketing, Design)"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleAddSkill(newSkill);
                          setNewSkill("");
                          e.preventDefault();
                        }
                      }}
                      aria-label="Enter a skill"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={() => {
                      handleAddSkill(newSkill);
                      setNewSkill("");
                    }}
                    aria-label="Add skill"
                  >
                    <Plus size={16} className="mr-1" /> Add
                  </Button>
                </div>
                
                <div className="mt-2">
                  <p className="text-sm font-medium mb-2">Quick add common skills:</p>
                  <div className="flex flex-wrap gap-2">
                    {commonSkills.map((skill) => (
                      <Button
                        key={skill.name}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddSkill(skill.name)}
                        disabled={profileData.skills.includes(skill.name)}
                        className="text-xs flex items-center gap-1"
                      >
                        {skill.icon}
                        {skill.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-zinc-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium flex items-center gap-1">
                    <Briefcase size={16} className="text-blue-600" />
                    Desired Industries
                    <InfoTooltip content="Specifying industries helps us recommend programs with relevant industry connections or specializations." />
                  </h3>
                </div>
                
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {profileData.careerGoals.desiredIndustry.map((industry, index) => (
                      <Badge 
                        key={index} 
                        variant="secondary"
                        className="bg-green-100 text-green-800 hover:bg-green-200 px-3 py-1.5 flex items-center gap-1"
                      >
                        <Briefcase size={12} />
                        {industry}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 ml-1 text-green-700 hover:text-green-900 hover:bg-green-200"
                          onClick={() => handleRemoveIndustry(index)}
                          aria-label={`Remove ${industry}`}
                        >
                          <X size={12} />
                        </Button>
                      </Badge>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Input
                      value={newIndustry}
                      onChange={(e) => setNewIndustry(e.target.value)}
                      placeholder="Add an industry (e.g., Healthcare, Finance)"
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleAddIndustry(newIndustry);
                          setNewIndustry("");
                          e.preventDefault();
                        }
                      }}
                      aria-label="Enter an industry"
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        handleAddIndustry(newIndustry);
                        setNewIndustry("");
                      }}
                      aria-label="Add industry"
                    >
                      <Plus size={16} className="mr-1" /> Add
                    </Button>
                  </div>
                  
                  <div className="mt-2">
                    <p className="text-sm font-medium mb-2">Popular industries:</p>
                    <div className="flex flex-wrap gap-2">
                      {commonIndustries.map((industry) => (
                        <Button
                          key={industry}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddIndustry(industry)}
                          disabled={profileData.careerGoals.desiredIndustry.includes(industry)}
                          className="text-xs"
                        >
                          {industry}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-zinc-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium flex items-center gap-1">
                    <Target size={16} className="text-blue-600" />
                    Desired Roles
                    <InfoTooltip content="Specific roles help us identify programs that develop the exact competencies needed for those positions." />
                  </h3>
                </div>
                
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {profileData.careerGoals.desiredRoles.map((role, index) => (
                      <Badge 
                        key={index} 
                        variant="secondary"
                        className="bg-purple-100 text-purple-800 hover:bg-purple-200 px-3 py-1.5 flex items-center gap-1"
                      >
                        <Target size={12} />
                        {role}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 ml-1 text-purple-700 hover:text-purple-900 hover:bg-purple-200"
                          onClick={() => handleRemoveRole(index)}
                          aria-label={`Remove ${role}`}
                        >
                          <X size={12} />
                        </Button>
                      </Badge>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Input
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                      placeholder="Add a role (e.g., Product Manager)"
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleAddRole(newRole);
                          setNewRole("");
                          e.preventDefault();
                        }
                      }}
                      aria-label="Enter a role"
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        handleAddRole(newRole);
                        setNewRole("");
                      }}
                      aria-label="Add role"
                    >
                      <Plus size={16} className="mr-1" /> Add
                    </Button>
                  </div>
                  
                  <div className="mt-2">
                    <p className="text-sm font-medium mb-2">Common roles:</p>
                    <div className="flex flex-wrap gap-2">
                      {commonRoles.map((role) => (
                        <Button
                          key={role}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddRole(role)}
                          disabled={profileData.careerGoals.desiredRoles.includes(role)}
                          className="text-xs"
                        >
                          {role}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-md mt-6">
                <div className="flex items-start gap-3">
                  <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-700">Skills, industries, and education</h4>
                    <p className="text-xs text-blue-600 mt-1">
                      Different educational programs focus on different skills and have varying levels of industry 
                      connections. By telling us your interests, we can suggest programs that have strong placement 
                      rates in your target industries and develop the specific skills you need.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 