"use client";
import React, { useState } from "react";
import { WelcomeStepProps } from "../profile-wizard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ArrowRight, Sparkles, Brain, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import useProfileStore from "@/stores/useProfileStore";

export default function WelcomeStep({
  profileData,
  setProfileData,
  onComplete,
}: WelcomeStepProps) {
  const [nameError, setNameError] = useState<string | null>(null);
  const [isCreatingStore, setIsCreatingStore] = useState(false);
  const [storeError, setStoreError] = useState<string | null>(null);

  const createVectorStore = async (name: string) => {
    try {
      setIsCreatingStore(true);
      setStoreError(null);
      
      // Create a unique vector store for this user
      const response = await fetch('/api/vector_stores/create_store', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: `${name}_VectorStore` }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create vector store: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Store the vector store ID in profile data
      setProfileData(prev => ({
        ...prev,
        vectorStoreId: data.id
      }));
      
      // Store vectorStoreId in localStorage for persistence
      // This allows the ID to be accessed across components
      localStorage.setItem('userVectorStoreId', data.id);

      // Update the profile store with the new vector store ID
      useProfileStore.setState({
        vectorStoreId: data.id
      });
      
      return data.id;
    } catch (error) {
      console.error('Error creating vector store:', error);
      setStoreError(error instanceof Error ? error.message : 'Failed to create vector store');
      return null;
    } finally {
      setIsCreatingStore(false);
    }
  };

  const handleContinue = async () => {
    if (!profileData.preferredName.trim()) {
      setNameError("Please let us know what to call you");
      return;
    }
    
    // Create a vector store for this user
    const storeId = await createVectorStore(profileData.preferredName);
    
    if (storeId) {
      console.log(`Created memory store with ID: ${storeId}`);
      onComplete();
    }
  };

  return (
    <div className="space-y-8">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-center space-y-3"
      >
        <div className="flex justify-center">
          <div className="p-4 bg-purple-100 rounded-full inline-block">
            <Sparkles className="h-10 w-10 text-purple-600" />
          </div>
        </div>
        <h2 className="text-3xl font-bold text-gray-900">Welcome to Vista</h2>
        <p className="text-zinc-500 max-w-md mx-auto">
          Your personal education adviser, powered by AI. Let's start by getting to know you.
        </p>
      </motion.div>

      <Card className="p-6 border border-purple-200 bg-purple-50/50">
        <div className="space-y-6">
          <div className="flex items-start space-x-4">
            <div className="bg-purple-100 p-3 rounded-full mt-1">
              <Brain className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Create Your Personal AI Adviser</h3>
              <p className="text-sm text-zinc-600 mt-1">
                Your profile will be used to create a personalized AI assistant that understands your 
                educational background, career goals, and preferences.
              </p>
            </div>
          </div>
          
          <div className="pt-4">
            <Label htmlFor="preferredName" className="block mb-2 font-medium">
              What would you like Vista to call you?
            </Label>
            <Input
              id="preferredName"
              value={profileData.preferredName}
              onChange={(e) => {
                setProfileData({
                  ...profileData,
                  preferredName: e.target.value
                });
                setNameError(null);
              }}
              placeholder="Enter your preferred name"
              className={`bg-white ${nameError ? 'border-red-300' : ''}`}
            />
            {nameError && <p className="text-sm text-red-500 mt-1">{nameError}</p>}
          </div>
        </div>
      </Card>

      {storeError && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md text-sm">
          <p>There was an error setting up your profile: {storeError}</p>
          <p className="mt-1">Please try again or contact support if the problem persists.</p>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="flex justify-center pt-4"
      >
        <Button 
          onClick={handleContinue}
          size="lg"
          className="bg-purple-600 hover:bg-purple-700"
          disabled={isCreatingStore}
        >
          {isCreatingStore ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Setting Up Your Profile...
            </>
          ) : (
            <>
              Let's Get Started <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </motion.div>
    </div>
  );
} 