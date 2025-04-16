"use client";
import React, { useState } from "react";
import { UserProfile, ProfileSchema } from "@/app/types/profile-schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, X, HelpCircle, GraduationCap, Building, BookOpen, Calendar, Award, Globe, School } from "lucide-react";

// Define the structure for language proficiency
interface LanguageProficiency {
  language: string;
  proficiencyLevel: string;
  testType?: string | null;
  score?: string | null;
}

// Type definition and guard for TargetStudyLevel
type TargetStudyLevel = UserProfile['targetStudyLevel'];
const validLevels: TargetStudyLevel[] = [
  "Bachelor's", 
  "Master's", 
  "Doctorate", 
  "Postgraduate Diploma/Certificate", 
  "Vocational/Trade", 
  "Undecided", 
  "__NONE__"
];

function isTargetStudyLevel(value: any): value is TargetStudyLevel {
  return validLevels.includes(value);
}

interface EducationStepProps {
  profileData: UserProfile;
  setProfileData: React.Dispatch<React.SetStateAction<UserProfile>>;
}

export default function EducationStep({
  profileData,
  setProfileData,
}: EducationStepProps) {
  // State for active tab
  const [activeTab, setActiveTab] = useState("history");

  // Common languages for quick selection
  const commonLanguages = [
    "English", "Spanish", "French", "German", 
    "Mandarin", "Arabic", "Russian", "Japanese"
  ];
  
  // Common test types for language proficiency
  const commonTests = {
    "English": ["IELTS", "TOEFL", "Duolingo English Test", "Cambridge English", "PTE Academic"],
    "French": ["DELF", "DALF", "TCF"],
    "German": ["TestDaF", "Goethe-Zertifikat", "DSH"],
    "Spanish": ["DELE", "SIELE"],
  };

  // Handle adding a new education entry
  const addEducation = () => {
    setProfileData((prevData) => ({
      ...prevData,
      education: [
        ...prevData.education,
        { degreeLevel: "__NONE__", institution: "", fieldOfStudy: "", graduationYear: "" },
      ],
    }));
  };

  // Handle removing an education entry
  const removeEducation = (index: number) => {
    if (profileData.education.length > 1) {
      setProfileData((prevData) => ({
        ...prevData,
        education: prevData.education.filter((_, i) => i !== index),
      }));
    }
  };

  // Handle changes to education fields
  const handleEducationChange = (
    index: number,
    field: string,
    value: string
  ) => {
    setProfileData((prevData) => {
      const updatedEducation = [...prevData.education];
      updatedEducation[index] = {
        ...updatedEducation[index],
        [field]: value,
      };
      return {
        ...prevData,
        education: updatedEducation,
      };
    });
  };

  const handleDegreeLevelChange = (index: number, value: string) => {
    handleEducationChange(index, "degreeLevel", value);
  };

  // Target Study Level Handler
  const handleTargetLevelChange = (value: string) => {
    if (isTargetStudyLevel(value)) {
      setProfileData((prevData) => ({
        ...prevData,
        targetStudyLevel: value,
      }));
    } else {
      console.warn("Invalid target study level selected:", value);
    }
  };

  // Language Proficiency Handlers
  const addLanguage = () => {
    setProfileData((prevData) => ({
      ...prevData,
      languageProficiency: [
        ...(prevData.languageProficiency || []),
        { language: "", proficiencyLevel: "__NONE__", testType: "", score: "" },
      ],
    }));
  };

  const removeLanguage = (index: number) => {
    setProfileData((prevData) => ({
      ...prevData,
      languageProficiency: (prevData.languageProficiency || []).filter((_, i) => i !== index),
    }));
  };

  const handleLanguageChange = (
    index: number,
    field: keyof LanguageProficiency,
    value: string
  ) => {
    setProfileData((prevData) => {
      const updatedLanguages = [...(prevData.languageProficiency || [])];
      if (updatedLanguages[index]) {
        updatedLanguages[index] = {
          ...updatedLanguages[index],
          [field]: value,
        };
      }
      return {
        ...prevData,
        languageProficiency: updatedLanguages,
      };
    });
  };

  // Handle quick-add language
  const handleQuickAddLanguage = (language: string) => {
    const existingLanguages = profileData.languageProficiency || [];
    const alreadyExists = existingLanguages.some(lang => lang.language === language);
    
    if (!alreadyExists) {
      setProfileData((prevData) => ({
        ...prevData,
        languageProficiency: [
          ...(prevData.languageProficiency || []),
          { language: language, proficiencyLevel: "__NONE__", testType: "", score: "" },
        ],
      }));
    }
  };

  // Helper for tooltips
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

  // Get icon for degree level
  const getDegreeIcon = (level: string) => {
    switch(level) {
      case "High School": return <School className="h-4 w-4 text-blue-500" />;
      case "Associate's": return <Award className="h-4 w-4 text-green-500" />;
      case "Bachelor's": return <GraduationCap className="h-4 w-4 text-purple-500" />;
      case "Master's": return <Award className="h-4 w-4 text-orange-500" />;
      case "Doctorate": return <Award className="h-4 w-4 text-red-500" />;
      case "Certificate": return <BookOpen className="h-4 w-4 text-teal-500" />;
      default: return <BookOpen className="h-4 w-4 text-gray-500" />;
    }
  };

  // Get color for proficiency level
  const getProficiencyColor = (level: string) => {
    switch(level) {
      case "Beginner": return "bg-slate-100 text-slate-800";
      case "Elementary": return "bg-blue-100 text-blue-800";
      case "Intermediate": return "bg-green-100 text-green-800";
      case "Upper Intermediate": return "bg-yellow-100 text-yellow-800";
      case "Advanced": return "bg-orange-100 text-orange-800";
      case "Proficient": return "bg-purple-100 text-purple-800";
      case "Native": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // Get description for study level
  const getStudyLevelDescription = (level: string) => {
    switch(level) {
      case "Bachelor's": 
        return "Undergraduate degree typically taking 3-4 years to complete. Usually requires a high school diploma or equivalent.";
      case "Master's": 
        return "Graduate degree typically taking 1-2 years after a bachelor's degree. Often requires relevant undergraduate experience.";
      case "Doctorate": 
        return "Most advanced degree typically taking 3-7 years. Involves original research and a dissertation.";
      case "Postgraduate Diploma/Certificate": 
        return "Shorter qualification after a bachelor's degree, typically 6-12 months of specialized study.";
      case "Vocational/Trade": 
        return "Practical training for a specific career path, often involving hands-on skills development.";
      case "Undecided": 
        return "Not sure yet? We'll show you options across different levels to help you decide.";
      default: 
        return "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Your Educational Background</h2>
        <p className="text-sm text-zinc-500">
          Tell us about your education to help us find the right opportunities for you.
        </p>
      </div>

      <Tabs defaultValue="history" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 mb-6">
          <TabsTrigger value="history" className="flex items-center gap-2">
            <GraduationCap size={16} />
            <span>Education History</span>
          </TabsTrigger>
          <TabsTrigger value="goals" className="flex items-center gap-2">
            <Award size={16} />
            <span>Study Goals</span>
          </TabsTrigger>
          <TabsTrigger value="languages" className="flex items-center gap-2">
            <Globe size={16} />
            <span>Languages</span>
          </TabsTrigger>
        </TabsList>

        {/* ===== EDUCATION HISTORY TAB ===== */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap size={18} className="text-blue-600" />
                Your Educational Background
                <InfoTooltip content="List your education from most recent to oldest. This helps us match you with programs that fit your qualifications." />
              </CardTitle>
              <CardDescription>
                Tell us about your educational qualifications and achievements.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Accordion type="multiple" defaultValue={[`edu-0`]} className="space-y-4">
                {profileData.education.map((edu, index) => (
                  <AccordionItem key={`edu-${index}`} value={`edu-${index}`} className="border rounded-md">
                    <AccordionTrigger className="px-4 hover:no-underline hover:bg-slate-50 rounded-t-md">
                      <div className="flex items-center gap-2 text-left">
                        {getDegreeIcon(edu.degreeLevel)}
                        <span className="font-medium">
                          {edu.degreeLevel !== "__NONE__" ? edu.degreeLevel : "Education Entry"} 
                          {edu.institution && ` - ${edu.institution}`}
                        </span>
                        {edu.graduationYear && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            <Calendar className="h-3 w-3 mr-1" />
                            {edu.graduationYear}
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pt-2 pb-4 bg-zinc-50">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-medium text-zinc-500">Education #{index + 1}</h3>
                        {profileData.education.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeEducation(index)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <X size={16} className="mr-1" /> Remove
                          </Button>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor={`degreeLevel-${index}`} className="text-sm">
                            Degree Level <span className="text-red-500">*</span>
                          </Label>
                          <Select
                            onValueChange={(value) => handleDegreeLevelChange(index, value)}
                            value={edu.degreeLevel}
                          >
                            <SelectTrigger className="w-full" id={`degreeLevel-${index}`}>
                              <SelectValue placeholder="Select a degree level" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="High School">High School</SelectItem>
                              <SelectItem value="Associate's">Associate's Degree</SelectItem>
                              <SelectItem value="Bachelor's">Bachelor's Degree</SelectItem>
                              <SelectItem value="Master's">Master's Degree</SelectItem>
                              <SelectItem value="Doctorate">Doctorate/PhD</SelectItem>
                              <SelectItem value="Certificate">Certificate/Diploma</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`institution-${index}`} className="text-sm">
                            Institution <span className="text-red-500">*</span>
                          </Label>
                          <div className="relative">
                            <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
                            <Input
                              id={`institution-${index}`}
                              value={edu.institution}
                              onChange={(e) => handleEducationChange(index, "institution", e.target.value)}
                              placeholder="School or university name"
                              className="pl-10"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`fieldOfStudy-${index}`} className="text-sm">
                            Field of Study <span className="text-red-500">*</span>
                          </Label>
                          <div className="relative">
                            <BookOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
                            <Input
                              id={`fieldOfStudy-${index}`}
                              value={edu.fieldOfStudy}
                              onChange={(e) => handleEducationChange(index, "fieldOfStudy", e.target.value)}
                              placeholder="Major or concentration"
                              className="pl-10"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`graduationYear-${index}`} className="text-sm">
                              Graduation Year <span className="text-red-500">*</span>
                            </Label>
                            <div className="relative">
                              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
                              <Input
                                id={`graduationYear-${index}`}
                                value={edu.graduationYear}
                                onChange={(e) => handleEducationChange(index, "graduationYear", e.target.value)}
                                placeholder="Year of graduation"
                                className="pl-10"
                                type="number"
                                min="1950"
                                max="2030"
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center gap-1">
                              <Label htmlFor={`gpa-${index}`} className="text-sm">GPA (optional)</Label>
                              <InfoTooltip content="Include your GPA and the scale (e.g., 3.5/4.0). This helps when applying to programs with GPA requirements." />
                            </div>
                            <div className="relative">
                              <Award className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
                              <Input
                                id={`gpa-${index}`}
                                value={edu.gpa || ""}
                                onChange={(e) => handleEducationChange(index, "gpa", e.target.value)}
                                placeholder="e.g., 3.8/4.0"
                                className="pl-10"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

              <Button
                type="button"
                variant="outline"
                className="w-full mt-4"
                onClick={addEducation}
              >
                <Plus size={16} className="mr-2" /> Add Another Education
              </Button>
              
              <div className="bg-blue-50 p-4 rounded-md text-sm text-blue-700 mt-4">
                <p className="flex items-center">
                  <InfoTooltip content="Start with your highest or most recent qualification and work backward chronologically." />
                  <span className="font-medium">Pro tip:</span> List your education from most recent to oldest. Include all relevant qualifications.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== STUDY GOALS TAB ===== */}
        <TabsContent value="goals" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award size={18} className="text-blue-600" />
                Your Study Goals
                <InfoTooltip content="Select the academic level you're aiming for. This helps us narrow down suitable programs." />
              </CardTitle>
              <CardDescription>
                What level of education are you looking to pursue next?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="targetStudyLevel" className="text-sm font-medium">
                    Target Level of Study <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    onValueChange={handleTargetLevelChange}
                    value={profileData.targetStudyLevel || ""}
                  >
                    <SelectTrigger className="w-full" id="targetStudyLevel">
                      <SelectValue placeholder="Select your target study level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bachelor's">Bachelor's Degree</SelectItem>
                      <SelectItem value="Master's">Master's Degree</SelectItem>
                      <SelectItem value="Doctorate">Doctorate/PhD</SelectItem>
                      <SelectItem value="Postgraduate Diploma/Certificate">Postgraduate Diploma/Certificate</SelectItem>
                      <SelectItem value="Vocational/Trade">Vocational/Trade</SelectItem>
                      <SelectItem value="Undecided">Undecided</SelectItem>
                      <SelectItem value="__NONE__">N/A or Unspecified</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {profileData.targetStudyLevel && profileData.targetStudyLevel !== "__NONE__" && (
                  <div className="bg-blue-50 p-4 rounded-md">
                    <div className="flex items-center gap-2 mb-2 text-blue-900">
                      {getDegreeIcon(profileData.targetStudyLevel)}
                      <h3 className="font-medium">{profileData.targetStudyLevel}</h3>
                    </div>
                    <p className="text-sm text-blue-700">
                      {getStudyLevelDescription(profileData.targetStudyLevel)}
                    </p>
                  </div>
                )}

                <div className="border-t pt-4 mt-4">
                  <h3 className="text-sm font-medium mb-3">Not sure which level is right for you?</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {["Bachelor's", "Master's", "Doctorate"].map((level) => (
                      <Button 
                        key={level}
                        variant="outline"
                        className={`justify-start ${profileData.targetStudyLevel === level ? 'border-blue-500 bg-blue-50' : ''}`}
                        onClick={() => handleTargetLevelChange(level)}
                      >
                        {getDegreeIcon(level)}
                        <span className="ml-2">{level}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== LANGUAGES TAB ===== */}
        <TabsContent value="languages" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe size={18} className="text-blue-600" />
                Language Proficiency
                <InfoTooltip content="Add languages you speak and your proficiency level. This helps match you with programs in appropriate languages." />
              </CardTitle>
              <CardDescription>
                Add any languages you know, especially those relevant to your study plans.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Quick add section */}
                <div className="mb-6">
                  <Label className="text-sm mb-2 block">Quick add common languages:</Label>
                  <div className="flex flex-wrap gap-2">
                    {commonLanguages.map(lang => (
                      <Button
                        key={lang}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickAddLanguage(lang)}
                        disabled={(profileData.languageProficiency || []).some(l => l.language === lang)}
                        className="text-xs"
                      >
                        {lang}
                      </Button>
                    ))}
                  </div>
                </div>

                <Accordion 
                  type="multiple" 
                  defaultValue={(profileData.languageProficiency || []).map((_, i) => `lang-${i}`)}
                  className="space-y-4"
                >
                  {(profileData.languageProficiency || []).map((lang, index) => (
                    <AccordionItem key={`lang-${index}`} value={`lang-${index}`} className="border rounded-md">
                      <AccordionTrigger className="px-4 hover:no-underline hover:bg-slate-50 rounded-t-md">
                        <div className="flex items-center gap-2 text-left">
                          <Globe className="h-4 w-4 text-blue-500" />
                          <span className="font-medium">
                            {lang.language || "New Language"}
                          </span>
                          {lang.proficiencyLevel && lang.proficiencyLevel !== "__NONE__" && (
                            <Badge className={`ml-2 ${getProficiencyColor(lang.proficiencyLevel)}`}>
                              {lang.proficiencyLevel}
                            </Badge>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pt-2 pb-4 bg-zinc-50">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-sm font-medium text-zinc-500">Language #{index + 1}</h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLanguage(index)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <X size={16} className="mr-1" /> Remove
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="space-y-2">
                            <Label htmlFor={`language-${index}`} className="text-sm">
                              Language <span className="text-red-500">*</span>
                            </Label>
                            <div className="relative">
                              <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
                              <Input
                                id={`language-${index}`}
                                value={lang.language}
                                onChange={(e) => handleLanguageChange(index, "language", e.target.value)}
                                placeholder="e.g., English, French"
                                className="pl-10"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`proficiencyLevel-${index}`} className="text-sm">
                              Proficiency Level <span className="text-red-500">*</span>
                            </Label>
                            <Select
                              onValueChange={(value) => handleLanguageChange(index, "proficiencyLevel", value)}
                              value={lang.proficiencyLevel}
                            >
                              <SelectTrigger id={`proficiencyLevel-${index}`}>
                                <SelectValue placeholder="Select level" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Beginner">Beginner</SelectItem>
                                <SelectItem value="Elementary">Elementary</SelectItem>
                                <SelectItem value="Intermediate">Intermediate</SelectItem>
                                <SelectItem value="Upper Intermediate">Upper Intermediate</SelectItem>
                                <SelectItem value="Advanced">Advanced</SelectItem>
                                <SelectItem value="Proficient">Proficient</SelectItem>
                                <SelectItem value="Native">Native</SelectItem>
                                <SelectItem value="__NONE__">N/A</SelectItem>
                              </SelectContent>
                            </Select>
                            {lang.proficiencyLevel && lang.proficiencyLevel !== "__NONE__" && (
                              <div className="flex mt-2">
                                <div className={`h-2 rounded-full ${lang.proficiencyLevel === "Beginner" ? "bg-blue-500" : "bg-slate-200"} flex-1`}></div>
                                <div className={`h-2 rounded-full ml-0.5 ${["Elementary", "Intermediate", "Upper Intermediate", "Advanced", "Proficient", "Native"].includes(lang.proficiencyLevel) ? "bg-blue-500" : "bg-slate-200"} flex-1`}></div>
                                <div className={`h-2 rounded-full ml-0.5 ${["Intermediate", "Upper Intermediate", "Advanced", "Proficient", "Native"].includes(lang.proficiencyLevel) ? "bg-blue-500" : "bg-slate-200"} flex-1`}></div>
                                <div className={`h-2 rounded-full ml-0.5 ${["Upper Intermediate", "Advanced", "Proficient", "Native"].includes(lang.proficiencyLevel) ? "bg-blue-500" : "bg-slate-200"} flex-1`}></div>
                                <div className={`h-2 rounded-full ml-0.5 ${["Advanced", "Proficient", "Native"].includes(lang.proficiencyLevel) ? "bg-blue-500" : "bg-slate-200"} flex-1`}></div>
                                <div className={`h-2 rounded-full ml-0.5 ${["Proficient", "Native"].includes(lang.proficiencyLevel) ? "bg-blue-500" : "bg-slate-200"} flex-1`}></div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-1">
                              <Label htmlFor={`testType-${index}`} className="text-sm">Test Type (optional)</Label>
                              <InfoTooltip content="Add any language proficiency tests you've taken, like IELTS or TOEFL." />
                            </div>
                            <Select
                              value={lang.testType || ""}
                              onValueChange={(value) => handleLanguageChange(index, "testType", value)}
                            >
                              <SelectTrigger id={`testType-${index}`}>
                                <SelectValue placeholder="Select test type" />
                              </SelectTrigger>
                              <SelectContent>
                                {/* Show specific test types based on language */}
                                {lang.language && commonTests[lang.language as keyof typeof commonTests] ? (
                                  commonTests[lang.language as keyof typeof commonTests].map(test => (
                                    <SelectItem key={test} value={test}>{test}</SelectItem>
                                  ))
                                ) : (
                                  <>
                                    <SelectItem value="IELTS">IELTS</SelectItem>
                                    <SelectItem value="TOEFL">TOEFL</SelectItem>
                                    <SelectItem value="Duolingo English Test">Duolingo English Test</SelectItem>
                                    <SelectItem value="Cambridge English">Cambridge English</SelectItem>
                                    <SelectItem value="PTE Academic">PTE Academic</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                  </>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-1">
                              <Label htmlFor={`score-${index}`} className="text-sm">Score (optional)</Label>
                              <InfoTooltip content="Include your test score. Different tests have different scoring systems." />
                            </div>
                            <Input
                              id={`score-${index}`}
                              value={lang.score || ""}
                              onChange={(e) => handleLanguageChange(index, "score", e.target.value)}
                              placeholder="e.g., 7.5, 100"
                            />
                            {lang.testType === "IELTS" && (
                              <p className="text-xs text-zinc-500 mt-1">IELTS typically ranges from 1-9</p>
                            )}
                            {lang.testType === "TOEFL" && (
                              <p className="text-xs text-zinc-500 mt-1">TOEFL iBT typically ranges from 0-120</p>
                            )}
                            {lang.testType === "Duolingo English Test" && (
                              <p className="text-xs text-zinc-500 mt-1">Duolingo typically ranges from 10-160</p>
                            )}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>

                {(profileData.languageProficiency || []).length === 0 && (
                  <div className="text-center p-8 border border-dashed rounded-md">
                    <Globe size={24} className="mx-auto text-zinc-400 mb-2" />
                    <p className="text-zinc-500 mb-4">No languages added yet</p>
                    <Button
                      type="button"
                      onClick={addLanguage}
                      variant="secondary"
                      size="sm"
                    >
                      <Plus size={16} className="mr-2" /> Add Your First Language
                    </Button>
                  </div>
                )}

                {(profileData.languageProficiency || []).length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full mt-4"
                    onClick={addLanguage}
                  >
                    <Plus size={16} className="mr-2" /> Add Another Language
                  </Button>
                )}
                
                {/* Language guidance */}
                <div className="bg-blue-50 p-4 rounded-md text-sm text-blue-700 mt-4">
                  <p className="flex items-center mb-2">
                    <InfoTooltip content="Most international programs require proof of language proficiency, especially in English." />
                    <span className="font-medium">Why this matters:</span> Many programs have language requirements.
                  </p>
                  <p className="text-xs pl-6">
                    For example, English-taught programs often require IELTS (6.0-7.0), TOEFL (80-100), 
                    or equivalent. Some countries may require proficiency in their native language.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 