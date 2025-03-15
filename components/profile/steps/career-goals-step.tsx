"use client";
import React from "react";
import { ProfileData } from "../profile-wizard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CareerGoalsStepProps {
  profileData: ProfileData;
  setProfileData: React.Dispatch<React.SetStateAction<ProfileData>>;
}

export default function CareerGoalsStep({
  profileData,
  setProfileData,
}: CareerGoalsStepProps) {
  // Handle changes to text fields
  const handleTextChange = (
    field: "shortTerm" | "longTerm",
    value: string
  ) => {
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

  // States for new items
  const [newSkill, setNewSkill] = React.useState("");
  const [newIndustry, setNewIndustry] = React.useState("");
  const [newRole, setNewRole] = React.useState("");

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold mb-4">Career Goals</h2>
      <p className="text-sm text-zinc-500 mb-6">
        Tell us about your career aspirations so we can suggest the most relevant educational paths.
      </p>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="shortTerm">Short-term Career Goals</Label>
          <Textarea
            id="shortTerm"
            value={profileData.careerGoals.shortTerm}
            onChange={(e) => handleTextChange("shortTerm", e.target.value)}
            placeholder="What do you hope to achieve in the next 1-2 years?"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="longTerm">Long-term Career Goals</Label>
          <Textarea
            id="longTerm"
            value={profileData.careerGoals.longTerm}
            onChange={(e) => handleTextChange("longTerm", e.target.value)}
            placeholder="Where do you see yourself in 5+ years?"
            rows={3}
          />
        </div>

        {/* Skills Section */}
        <div className="mt-6">
          <Label>Key Skills</Label>
          <p className="text-sm text-zinc-500 mb-2">
            List skills you currently have or wish to develop
          </p>

          <div className="flex flex-wrap gap-2 mb-2">
            {profileData.skills.map((skill, index) => (
              <div
                key={index}
                className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full flex items-center text-sm"
              >
                {skill}
                <X
                  size={14}
                  className="ml-2 cursor-pointer"
                  onClick={() => handleRemoveSkill(index)}
                />
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              placeholder="Add a skill"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddSkill(newSkill);
                  setNewSkill("");
                  e.preventDefault();
                }
              }}
            />
            <Button
              type="button"
              size="sm"
              onClick={() => {
                handleAddSkill(newSkill);
                setNewSkill("");
              }}
            >
              <Plus size={16} /> Add
            </Button>
          </div>
        </div>

        {/* Industries Section */}
        <div className="mt-6">
          <Label>Desired Industries</Label>
          <p className="text-sm text-zinc-500 mb-2">
            Industries you're interested in working in
          </p>

          <div className="flex flex-wrap gap-2 mb-2">
            {profileData.careerGoals.desiredIndustry.map((industry, index) => (
              <div
                key={index}
                className="bg-green-100 text-green-800 px-3 py-1 rounded-full flex items-center text-sm"
              >
                {industry}
                <X
                  size={14}
                  className="ml-2 cursor-pointer"
                  onClick={() => handleRemoveIndustry(index)}
                />
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              value={newIndustry}
              onChange={(e) => setNewIndustry(e.target.value)}
              placeholder="Add an industry"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddIndustry(newIndustry);
                  setNewIndustry("");
                  e.preventDefault();
                }
              }}
            />
            <Button
              type="button"
              size="sm"
              onClick={() => {
                handleAddIndustry(newIndustry);
                setNewIndustry("");
              }}
            >
              <Plus size={16} /> Add
            </Button>
          </div>
        </div>

        {/* Roles Section */}
        <div className="mt-6">
          <Label>Desired Roles</Label>
          <p className="text-sm text-zinc-500 mb-2">
            Specific job titles or roles you're aiming for
          </p>

          <div className="flex flex-wrap gap-2 mb-2">
            {profileData.careerGoals.desiredRoles.map((role, index) => (
              <div
                key={index}
                className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full flex items-center text-sm"
              >
                {role}
                <X
                  size={14}
                  className="ml-2 cursor-pointer"
                  onClick={() => handleRemoveRole(index)}
                />
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              placeholder="Add a role"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddRole(newRole);
                  setNewRole("");
                  e.preventDefault();
                }
              }}
            />
            <Button
              type="button"
              size="sm"
              onClick={() => {
                handleAddRole(newRole);
                setNewRole("");
              }}
            >
              <Plus size={16} /> Add
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 