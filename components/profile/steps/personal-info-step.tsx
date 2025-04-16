"use client";
import React, { useEffect, useState } from "react";
import { UserProfile } from "@/app/types/profile-schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PersonalInfoStepProps {
  profileData: UserProfile;
  setProfileData: React.Dispatch<React.SetStateAction<UserProfile>>;
}

export default function PersonalInfoStep({
  profileData,
  setProfileData,
}: PersonalInfoStepProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
      <p className="text-sm text-zinc-500 mb-6">
        Let us know who you are so we can personalize your education journey.
      </p>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            name="firstName"
            value={profileData.firstName}
            onChange={handleChange}
            placeholder="Your first name"
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            name="lastName"
            value={profileData.lastName}
            onChange={handleChange}
            placeholder="Your last name"
            required
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          name="email"
          type="email"
          value={profileData.email}
          onChange={handleChange}
          placeholder="your.email@example.com"
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          value={profileData.phone}
          onChange={handleChange}
          placeholder="Your phone number"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="currentLocation">Current Location</Label>
          <Input
            id="currentLocation"
            name="currentLocation"
            value={profileData.currentLocation || ''}
            onChange={handleChange}
            placeholder="City, Country"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nationality">Nationality</Label>
          <Input
            id="nationality"
            name="nationality"
            value={profileData.nationality || ''}
            onChange={handleChange}
            placeholder="Your nationality"
          />
        </div>
      </div>
    </div>
  );
} 