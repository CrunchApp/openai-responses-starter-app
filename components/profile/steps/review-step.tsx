"use client";
import React from "react";
import { ProfileData } from "../profile-wizard";
import { Button } from "@/components/ui/button";
import { Check, ChevronRight, Edit2, FileText } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface ReviewStepProps {
  profileData: ProfileData;
  setProfileData: React.Dispatch<React.SetStateAction<ProfileData>>;
}

export default function ReviewStep({
  profileData,
  setProfileData,
}: ReviewStepProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold mb-4">Review Your Profile</h2>
      <p className="text-sm text-zinc-500 mb-6">
        Please review all your information before finalizing your profile.
      </p>

      <Accordion type="single" collapsible className="w-full" defaultValue="personal">
        {/* Personal Information */}
        <AccordionItem value="personal">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100">
                <Check className="h-4 w-4 text-blue-600" />
              </div>
              <span className="font-medium">Personal Information</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="pl-10 space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-zinc-500">First Name</p>
                  <p className="font-medium">{profileData.firstName || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500">Last Name</p>
                  <p className="font-medium">{profileData.lastName || "Not provided"}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-zinc-500">Email</p>
                <p className="font-medium">{profileData.email || "Not provided"}</p>
              </div>
              <div>
                <p className="text-sm text-zinc-500">Phone</p>
                <p className="font-medium">{profileData.phone || "Not provided"}</p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Education */}
        <AccordionItem value="education">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100">
                <Check className="h-4 w-4 text-blue-600" />
              </div>
              <span className="font-medium">Education History</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="pl-10 space-y-4 py-2">
              {profileData.education.map((edu, index) => (
                <div
                  key={index}
                  className="p-3 border rounded-md bg-zinc-50 mb-2"
                >
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium">Education #{index + 1}</h4>
                  </div>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-zinc-500">Degree Level</p>
                        <p className="font-medium">
                          {edu.degreeLevel || "Not provided"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-zinc-500">Field of Study</p>
                        <p className="font-medium">
                          {edu.fieldOfStudy || "Not provided"}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500">Institution</p>
                      <p className="font-medium">
                        {edu.institution || "Not provided"}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-zinc-500">Graduation Year</p>
                        <p className="font-medium">
                          {edu.graduationYear || "Not provided"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-zinc-500">GPA</p>
                        <p className="font-medium">{edu.gpa || "Not provided"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Career Goals */}
        <AccordionItem value="career">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100">
                <Check className="h-4 w-4 text-blue-600" />
              </div>
              <span className="font-medium">Career Goals</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="pl-10 space-y-4 py-2">
              <div>
                <p className="text-sm text-zinc-500">Short-term Goals</p>
                <p className="font-medium">
                  {profileData.careerGoals.shortTerm || "Not provided"}
                </p>
              </div>
              <div>
                <p className="text-sm text-zinc-500">Long-term Goals</p>
                <p className="font-medium">
                  {profileData.careerGoals.longTerm || "Not provided"}
                </p>
              </div>
              <div>
                <p className="text-sm text-zinc-500">Skills</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {profileData.skills.length > 0 ? (
                    profileData.skills.map((skill, index) => (
                      <span
                        key={index}
                        className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-zinc-500">No skills provided</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm text-zinc-500">Desired Industries</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {profileData.careerGoals.desiredIndustry.length > 0 ? (
                    profileData.careerGoals.desiredIndustry.map(
                      (industry, index) => (
                        <span
                          key={index}
                          className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs"
                        >
                          {industry}
                        </span>
                      )
                    )
                  ) : (
                    <span className="text-zinc-500">
                      No desired industries provided
                    </span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm text-zinc-500">Desired Roles</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {profileData.careerGoals.desiredRoles.length > 0 ? (
                    profileData.careerGoals.desiredRoles.map((role, index) => (
                      <span
                        key={index}
                        className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs"
                      >
                        {role}
                      </span>
                    ))
                  ) : (
                    <span className="text-zinc-500">
                      No desired roles provided
                    </span>
                  )}
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Preferences */}
        <AccordionItem value="preferences">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100">
                <Check className="h-4 w-4 text-blue-600" />
              </div>
              <span className="font-medium">Preferences</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="pl-10 space-y-4 py-2">
              <div>
                <p className="text-sm text-zinc-500">Preferred Locations</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {profileData.preferences.preferredLocations.length > 0 ? (
                    profileData.preferences.preferredLocations.map(
                      (location, index) => (
                        <span
                          key={index}
                          className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs"
                        >
                          {location}
                        </span>
                      )
                    )
                  ) : (
                    <span className="text-zinc-500">
                      No preferred locations provided
                    </span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm text-zinc-500">Study Mode</p>
                <p className="font-medium">
                  {profileData.preferences.studyMode || "Not provided"}
                </p>
              </div>
              <div>
                <p className="text-sm text-zinc-500">Preferred Start Date</p>
                <p className="font-medium">
                  {profileData.preferences.startDate
                    ? new Date(profileData.preferences.startDate).toLocaleDateString(
                        "en-US",
                        { year: "numeric", month: "long" }
                      )
                    : "Not provided"}
                </p>
              </div>
              <div>
                <p className="text-sm text-zinc-500">Budget Range</p>
                <p className="font-medium">
                  ${profileData.preferences.budgetRange.min.toLocaleString()} - $
                  {profileData.preferences.budgetRange.max.toLocaleString()}
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Documents */}
        <AccordionItem value="documents">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100">
                <Check className="h-4 w-4 text-blue-600" />
              </div>
              <span className="font-medium">Documents</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="pl-10 space-y-4 py-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileText size={16} />
                  <span>Resume/CV:</span>
                  {profileData.documents.resume ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <Check size={14} />
                      Uploaded
                    </span>
                  ) : (
                    <span className="text-zinc-500">Not uploaded</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <FileText size={16} />
                  <span>Transcripts:</span>
                  {profileData.documents.transcripts ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <Check size={14} />
                      Uploaded
                    </span>
                  ) : (
                    <span className="text-zinc-500">Not uploaded</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <FileText size={16} />
                  <span>Statement of Purpose:</span>
                  {profileData.documents.statementOfPurpose ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <Check size={14} />
                      Uploaded
                    </span>
                  ) : (
                    <span className="text-zinc-500">Not uploaded</span>
                  )}
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="bg-blue-50 p-4 rounded-md mt-6 border border-blue-200">
        <div className="flex items-start">
          <div className="mr-4 flex items-center h-5 mt-1">
            <Check className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-blue-800 font-medium mb-1">Ready to Complete</h3>
            <p className="text-sm text-blue-600">
              Your profile is ready for submission. Click the "Complete Profile" button below to
              create your personalized education adviser.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 