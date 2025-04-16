"use client";
import React, { useState } from "react";
import { UserProfile } from "@/app/types/profile-schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { X, Plus, HelpCircle, MapPin, Calendar, DollarSign, Clock, Globe, Home } from "lucide-react";

interface PreferencesStepProps {
  profileData: UserProfile;
  setProfileData: React.Dispatch<React.SetStateAction<UserProfile>>;
}

export default function PreferencesStep({
  profileData,
  setProfileData,
}: PreferencesStepProps) {
  const [newLocation, setNewLocation] = useState("");
  const [activeTab, setActiveTab] = useState("location");
  
  // Popular study destinations for quick selection
  const popularDestinations = [
    "United States", "United Kingdom", "Canada", "Australia", 
    "Germany", "France", "Japan", "Singapore"
  ];

  // Handle adding a location preference
  const handleAddLocation = (location: string) => {
    if (location.trim() === "") return;

    setProfileData((prevData) => ({
      ...prevData,
      preferences: {
        ...prevData.preferences,
        preferredLocations: [...prevData.preferences.preferredLocations, location.trim()],
      },
    }));
  };

  // Handle quick-add for popular destinations
  const handleQuickAddLocation = (location: string) => {
    if (profileData.preferences.preferredLocations.includes(location)) return;
    
    setProfileData((prevData) => ({
      ...prevData,
      preferences: {
        ...prevData.preferences,
        preferredLocations: [...prevData.preferences.preferredLocations, location],
      },
    }));
  };

  // Handle removing a location preference
  const handleRemoveLocation = (index: number) => {
    setProfileData((prevData) => ({
      ...prevData,
      preferences: {
        ...prevData.preferences,
        preferredLocations: prevData.preferences.preferredLocations.filter(
          (_, i) => i !== index
        ),
      },
    }));
  };

  // Handle study mode selection
  const handleStudyModeChange = (mode: string) => {
    setProfileData((prevData) => ({
      ...prevData,
      preferences: {
        ...prevData.preferences,
        studyMode: mode,
      },
    }));
  };

  // Handle start date change
  const handleStartDateChange = (date: string) => {
    setProfileData((prevData) => ({
      ...prevData,
      preferences: {
        ...prevData.preferences,
        startDate: date,
      },
    }));
  };

  // Handle budget range change
  const handleBudgetRangeChange = (values: number[]) => {
    if (values.length === 2) {
      setProfileData((prevData) => ({
        ...prevData,
        preferences: {
          ...prevData.preferences,
          budgetRange: {
            min: values[0],
            max: values[1],
          },
        },
      }));
    }
  };

  // Handle preferred duration change
  const handleDurationChange = (
    field: 'min' | 'max' | 'unit',
    value: string | number
  ) => {
    setProfileData((prevData) => ({
      ...prevData,
      preferences: {
        ...prevData.preferences,
        preferredDuration: {
          ...(prevData.preferences.preferredDuration || {}),
          [field]: value,
        },
      },
    }));
  };

  // Handle preferred study language change
  const handleStudyLanguageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setProfileData((prevData) => ({
      ...prevData,
      preferences: {
        ...prevData.preferences,
        preferredStudyLanguage: value,
      },
    }));
  };
  
  // Handle living expenses budget change
  const handleLivingBudgetChange = (
    field: 'min' | 'max' | 'currency',
    value: string | number
  ) => {
     setProfileData((prevData) => ({
      ...prevData,
      preferences: {
        ...prevData.preferences,
        livingExpensesBudget: {
          ...(prevData.preferences.livingExpensesBudget || { currency: 'USD' }),
          [field]: field === 'currency' ? value : Number(value) || 0,
        },
      },
    }));
  };

  // Handle residency interest change
  const handleResidencyInterestChange = (checked: boolean) => {
    setProfileData((prevData) => ({
      ...prevData,
      preferences: {
        ...prevData.preferences,
        residencyInterest: checked,
      },
    }));
  };

  // Currency options for select dropdown
  const currencyOptions = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF", "CNY", "INR"];

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
        <h2 className="text-xl font-semibold">Your Educational Preferences</h2>
        <p className="text-sm text-zinc-500">
          Tell us what matters to you to help find the perfect educational match.
        </p>
      </div>

      <Tabs defaultValue="location" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 mb-6">
          <TabsTrigger value="location" className="flex items-center gap-2">
            <MapPin size={16} />
            <span>Location & Timing</span>
          </TabsTrigger>
          <TabsTrigger value="budget" className="flex items-center gap-2">
            <DollarSign size={16} />
            <span>Budget & Finance</span>
          </TabsTrigger>
          <TabsTrigger value="program" className="flex items-center gap-2">
            <Clock size={16} />
            <span>Program Details</span>
          </TabsTrigger>
        </TabsList>

        {/* ===== LOCATION & TIMING TAB ===== */}
        <TabsContent value="location" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin size={18} className="text-blue-600" />
                Preferred Locations
                <InfoTooltip content="Select where you'd like to study. Add multiple locations to broaden your options." />
              </CardTitle>
              <CardDescription>
                Where would you prefer to study? Add multiple if you're flexible.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {profileData.preferences.preferredLocations.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {profileData.preferences.preferredLocations.map((location, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1 px-3 py-1.5">
                        <MapPin size={12} />
                        {location}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 ml-1"
                          onClick={() => handleRemoveLocation(index)}
                          aria-label={`Remove ${location}`}
                        >
                          <X size={12} />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Input
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="Type a location..."
                    aria-label="Add a location"
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleAddLocation(newLocation);
                        setNewLocation("");
                        e.preventDefault();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      handleAddLocation(newLocation);
                      setNewLocation("");
                    }}
                    aria-label="Add location"
                  >
                    <Plus size={16} className="mr-1" /> Add
                  </Button>
                </div>

                <div className="mt-4">
                  <p className="text-sm text-zinc-500 mb-2">Popular destinations:</p>
                  <div className="flex flex-wrap gap-2">
                    {popularDestinations.map((destination) => (
                      <Button
                        key={destination}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickAddLocation(destination)}
                        disabled={profileData.preferences.preferredLocations.includes(destination)}
                        className="text-xs"
                      >
                        {destination}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar size={18} className="text-blue-600" />
                Timing & Mode
                <InfoTooltip content="Select your preferred study mode and starting timeline." />
              </CardTitle>
              <CardDescription>
                When do you want to start and how do you want to study?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="studyMode" className="text-sm font-medium">Study Mode</Label>
                  <Select
                    value={profileData.preferences.studyMode}
                    onValueChange={handleStudyModeChange}
                    aria-label="Study mode"
                  >
                    <SelectTrigger id="studyMode">
                      <SelectValue placeholder="Select a study mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Full-time">Full-time</SelectItem>
                      <SelectItem value="Part-time">Part-time</SelectItem>
                      <SelectItem value="Online">Online only</SelectItem>
                      <SelectItem value="Hybrid">Hybrid/Blended</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-zinc-500">
                    {profileData.preferences.studyMode === "Full-time" && "Traditional full-time study with regular campus attendance"}
                    {profileData.preferences.studyMode === "Part-time" && "Flexible schedule with reduced course load"}
                    {profileData.preferences.studyMode === "Online" && "100% online learning with no campus requirements"}
                    {profileData.preferences.studyMode === "Hybrid" && "Mix of online and in-person learning"}
                  </p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="startDate" className="text-sm font-medium">
                    Preferred Start Date 
                    <span className="text-zinc-400 ml-1">(Month/Year)</span>
                  </Label>
                  <Input
                    type="month"
                    id="startDate"
                    value={profileData.preferences.startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    min={new Date().toISOString().slice(0, 7)}
                    aria-label="Select start date"
                  />
                  <p className="text-xs text-zinc-500">
                    Most programs have specific intake periods (Fall, Spring, etc.)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== BUDGET & FINANCE TAB ===== */}
        <TabsContent value="budget" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign size={18} className="text-blue-600" />
                Financial Considerations
                <InfoTooltip content="Set your budget range for tuition and living expenses." />
              </CardTitle>
              <CardDescription>
                Define your financial boundaries for education costs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible defaultValue="tuition">
                <AccordionItem value="tuition">
                  <AccordionTrigger>
                    <span className="flex items-center gap-2">
                      <DollarSign size={16} className="text-emerald-600" />
                      Tuition Budget
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-6 pt-2">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-medium">Annual Tuition Range</p>
                        <div className="flex items-center gap-1 text-sm font-semibold">
                          <DollarSign size={16} className="text-emerald-600" />
                          <span>${profileData.preferences.budgetRange.min.toLocaleString()} - ${profileData.preferences.budgetRange.max.toLocaleString()}</span>
                        </div>
                      </div>
                      
                      <div className="py-6 px-2">
                        <Slider
                          defaultValue={[
                            profileData.preferences.budgetRange.min,
                            profileData.preferences.budgetRange.max,
                          ]}
                          max={100000}
                          step={1000}
                          onValueChange={handleBudgetRangeChange}
                          aria-label="Tuition budget range"
                        />
                      </div>
                      
                      <div className="bg-zinc-50 p-3 rounded-md">
                        <p className="text-xs text-zinc-600">
                          <strong>Budget guidance:</strong> Typical annual tuition ranges from 
                          $5,000 (public universities in some countries) to $60,000+ (private universities in the US). 
                          International student tuition is often higher than domestic rates.
                        </p>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="living">
                  <AccordionTrigger>
                    <span className="flex items-center gap-2">
                      <Home size={16} className="text-emerald-600" />
                      Living Expenses Budget
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div className="space-y-2">
                          <Label htmlFor="livingBudgetMin" className="text-xs">
                            Minimum Annual
                          </Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                              {profileData.preferences.livingExpensesBudget?.currency || 'USD'}
                            </span>
                            <Input 
                              id="livingBudgetMin" 
                              type="number" 
                              className="pl-14"
                              placeholder="e.g., 5000" 
                              value={profileData.preferences.livingExpensesBudget?.min || ''}
                              onChange={(e) => handleLivingBudgetChange('min', e.target.value)}
                              aria-label="Minimum living expenses budget"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="livingBudgetMax" className="text-xs">
                            Maximum Annual
                          </Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                              {profileData.preferences.livingExpensesBudget?.currency || 'USD'}
                            </span>
                            <Input 
                              id="livingBudgetMax" 
                              type="number" 
                              className="pl-14"
                              placeholder="e.g., 15000" 
                              value={profileData.preferences.livingExpensesBudget?.max || ''}
                              onChange={(e) => handleLivingBudgetChange('max', e.target.value)}
                              aria-label="Maximum living expenses budget"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="livingBudgetCurrency" className="text-xs">
                            Currency
                          </Label>
                          <Select 
                            value={profileData.preferences.livingExpensesBudget?.currency || 'USD'}
                            onValueChange={(value) => handleLivingBudgetChange('currency', value)}
                          >
                            <SelectTrigger id="livingBudgetCurrency">
                              <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                            <SelectContent>
                              {currencyOptions.map(curr => (
                                <SelectItem key={curr} value={curr}>{curr}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="bg-zinc-50 p-3 rounded-md mt-4">
                        <p className="text-xs text-zinc-600">
                          <strong>Cost of living guidance:</strong> Living expenses vary greatly by location. 
                          Major cities (New York, London, Tokyo) typically require $15,000-30,000+ annually, 
                          while smaller towns or some countries may be manageable with $5,000-10,000.
                        </p>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home size={18} className="text-blue-600" />
                Post-Study Considerations
                <InfoTooltip content="Tell us if you're interested in staying in your study destination after completing your program." />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="residencyInterest"
                  checked={profileData.preferences.residencyInterest || false}
                  onCheckedChange={(checked) => handleResidencyInterestChange(checked as boolean)}
                />
                <Label htmlFor="residencyInterest" className="text-sm">
                  I'm interested in long-term residency or migration options after completing my studies
                </Label>
              </div>
              {profileData.preferences.residencyInterest && (
                <p className="text-xs text-zinc-500 mt-2 ml-7">
                  We'll highlight programs in countries with favorable post-study work permits and immigration pathways.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== PROGRAM DETAILS TAB ===== */}
        <TabsContent value="program" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock size={18} className="text-blue-600" />
                Program Duration
                <InfoTooltip content="Specify your preferred program length." />
              </CardTitle>
              <CardDescription>
                How long do you want your program to be?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 items-end">
                <div className="space-y-2">
                  <Label htmlFor="durationMin" className="text-sm">Minimum</Label>
                  <Input 
                    id="durationMin" 
                    type="number" 
                    placeholder="e.g., 1" 
                    value={profileData.preferences.preferredDuration?.min || ''}
                    onChange={(e) => handleDurationChange('min', Number(e.target.value))}
                    min={0}
                    aria-label="Minimum duration"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="durationMax" className="text-sm">Maximum</Label>
                  <Input 
                    id="durationMax" 
                    type="number" 
                    placeholder="e.g., 4" 
                    value={profileData.preferences.preferredDuration?.max || ''}
                    onChange={(e) => handleDurationChange('max', Number(e.target.value))}
                    min={profileData.preferences.preferredDuration?.min || 0}
                    aria-label="Maximum duration"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="durationUnit" className="text-sm">Unit</Label>
                  <Select
                    value={profileData.preferences.preferredDuration?.unit || ''}
                    onValueChange={(value) => handleDurationChange('unit', value)}
                  >
                    <SelectTrigger id="durationUnit">
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="years">Years</SelectItem>
                      <SelectItem value="months">Months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="mt-4 bg-zinc-50 p-3 rounded-md">
                <p className="text-xs text-zinc-600">
                  <strong>Duration guide:</strong> Bachelor's programs typically take 3-4 years, 
                  Master's programs 1-2 years, and PhDs 3-5+ years. Certificate/diploma 
                  programs can range from a few months to 1-2 years.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe size={18} className="text-blue-600" />
                Language of Instruction
                <InfoTooltip content="Specify which language(s) you're comfortable studying in." />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="preferredStudyLanguage" className="text-sm">
                    Preferred Language(s)
                  </Label>
                  <Input
                    id="preferredStudyLanguage"
                    value={profileData.preferences.preferredStudyLanguage || ''}
                    onChange={handleStudyLanguageChange}
                    placeholder="e.g., English, German, French"
                    aria-label="Study languages"
                  />
                  <p className="text-xs text-zinc-500">
                    List languages separated by commas. English is the most common language of instruction globally.
                  </p>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-2">
                  {['English', 'French', 'German', 'Spanish', 'Chinese', 'Japanese'].map(lang => (
                    <Button
                      key={lang}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        const current = profileData.preferences.preferredStudyLanguage || '';
                        if (current.includes(lang)) return;
                        
                        const newValue = current ? `${current}, ${lang}` : lang;
                        setProfileData(prev => ({
                          ...prev,
                          preferences: {
                            ...prev.preferences,
                            preferredStudyLanguage: newValue
                          }
                        }));
                      }}
                    >
                      {lang}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 