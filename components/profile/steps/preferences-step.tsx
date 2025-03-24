"use client";
import React from "react";
import { UserProfile } from "@/app/types/profile-schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { X, Plus } from "lucide-react";

interface PreferencesStepProps {
  profileData: UserProfile;
  setProfileData: React.Dispatch<React.SetStateAction<UserProfile>>;
}

export default function PreferencesStep({
  profileData,
  setProfileData,
}: PreferencesStepProps) {
  const [newLocation, setNewLocation] = React.useState("");

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

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold mb-4">Preferences</h2>
      <p className="text-sm text-zinc-500 mb-6">
        Tell us your preferences to help find the right educational opportunities.
      </p>

      {/* Preferred Locations */}
      <div className="space-y-2">
        <Label>Preferred Locations</Label>
        <p className="text-sm text-zinc-500 mb-2">
          Where would you prefer to study? (Add multiple if applicable)
        </p>

        <div className="flex flex-wrap gap-2 mb-2">
          {profileData.preferences.preferredLocations.map((location, index) => (
            <div
              key={index}
              className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full flex items-center text-sm"
            >
              {location}
              <X
                size={14}
                className="ml-2 cursor-pointer"
                onClick={() => handleRemoveLocation(index)}
              />
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            value={newLocation}
            onChange={(e) => setNewLocation(e.target.value)}
            placeholder="Add a location (city, country, etc.)"
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
            size="sm"
            onClick={() => {
              handleAddLocation(newLocation);
              setNewLocation("");
            }}
          >
            <Plus size={16} /> Add
          </Button>
        </div>
      </div>

      {/* Study Mode */}
      <div className="space-y-2">
        <Label htmlFor="studyMode">Study Mode</Label>
        <Select
          value={profileData.preferences.studyMode}
          onValueChange={handleStudyModeChange}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a study mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Full-time">Full-time</SelectItem>
            <SelectItem value="Part-time">Part-time</SelectItem>
            <SelectItem value="Online">Online only</SelectItem>
            <SelectItem value="Hybrid">Hybrid/Blended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Preferred Start Date */}
      <div className="space-y-2">
        <Label htmlFor="startDate">Preferred Start Date</Label>
        <Input
          type="month"
          id="startDate"
          value={profileData.preferences.startDate}
          onChange={(e) => handleStartDateChange(e.target.value)}
          min={new Date().toISOString().slice(0, 7)}
        />
      </div>

      {/* Budget Range */}
      <div className="space-y-4">
        <div>
          <Label>Budget Range (USD)</Label>
          <p className="text-sm text-zinc-500">
            Set your minimum and maximum budget for education
          </p>
        </div>

        <div className="pt-6 px-2">
          <Slider
            defaultValue={[
              profileData.preferences.budgetRange.min,
              profileData.preferences.budgetRange.max,
            ]}
            max={200000}
            step={1000}
            onValueChange={handleBudgetRangeChange}
          />
        </div>

        <div className="flex justify-between text-sm">
          <div>
            Min: ${profileData.preferences.budgetRange.min.toLocaleString()}
          </div>
          <div>
            Max: ${profileData.preferences.budgetRange.max.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
} 