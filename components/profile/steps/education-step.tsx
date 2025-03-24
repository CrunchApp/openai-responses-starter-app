"use client";
import React from "react";
import { UserProfile } from "@/app/types/profile-schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";

interface EducationStepProps {
  profileData: UserProfile;
  setProfileData: React.Dispatch<React.SetStateAction<UserProfile>>;
}

export default function EducationStep({
  profileData,
  setProfileData,
}: EducationStepProps) {
  // Handle adding a new education entry
  const addEducation = () => {
    setProfileData((prevData) => ({
      ...prevData,
      education: [
        ...prevData.education,
        { degreeLevel: "", institution: "", fieldOfStudy: "", graduationYear: "" },
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

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4">Education History</h2>
      <p className="text-sm text-zinc-500 mb-6">
        Tell us about your educational background to help tailor recommendations.
      </p>

      {profileData.education.map((edu, index) => (
        <div key={index} className="p-4 border rounded-md bg-zinc-50 mb-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-md font-medium">Education #{index + 1}</h3>
            {profileData.education.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeEducation(index)}
              >
                <X size={16} className="mr-1" /> Remove
              </Button>
            )}
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`degreeLevel-${index}`}>Degree Level</Label>
              <Select
                onValueChange={(value) => handleDegreeLevelChange(index, value)}
                value={edu.degreeLevel}
              >
                <SelectTrigger className="w-full">
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
              <Label htmlFor={`institution-${index}`}>Institution</Label>
              <Input
                id={`institution-${index}`}
                value={edu.institution}
                onChange={(e) => handleEducationChange(index, "institution", e.target.value)}
                placeholder="School or university name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`fieldOfStudy-${index}`}>Field of Study</Label>
              <Input
                id={`fieldOfStudy-${index}`}
                value={edu.fieldOfStudy}
                onChange={(e) => handleEducationChange(index, "fieldOfStudy", e.target.value)}
                placeholder="Major or concentration"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor={`graduationYear-${index}`}>Graduation Year</Label>
                <Input
                  id={`graduationYear-${index}`}
                  value={edu.graduationYear}
                  onChange={(e) => handleEducationChange(index, "graduationYear", e.target.value)}
                  placeholder="Year of graduation"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor={`gpa-${index}`}>GPA (optional)</Label>
                <Input
                  id={`gpa-${index}`}
                  value={edu.gpa || ""}
                  onChange={(e) => handleEducationChange(index, "gpa", e.target.value)}
                  placeholder="e.g., 3.8/4.0"
                />
              </div>
            </div>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={addEducation}
      >
        <Plus size={16} className="mr-2" /> Add Another Education
      </Button>
    </div>
  );
} 