"use client";
import React, { useState, useEffect } from "react";
import { WelcomeStepProps } from "../profile-wizard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ArrowRight, Sparkles, Brain, Loader2, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import useProfileStore from "@/stores/useProfileStore";
import useToolsStore from "@/stores/useToolsStore";
import AnimatedLogo from "@/components/ui/AnimatedLogo";
import LanguageSelector from "@/components/ui/LanguageSelector";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n"; // Import i18n configuration

export default function WelcomeStep({
  profileData,
  setProfileData,
  onComplete,
}: WelcomeStepProps) {
  const [nameError, setNameError] = useState<string | null>(null);
  const [isCreatingStore, setIsCreatingStore] = useState(false);
  const [storeError, setStoreError] = useState<string | null>(null);
  const { t, i18n } = useTranslation();
  
  // Determine text direction based on language
  const isRtl = ['ar', 'fa'].includes(i18n.language);

  // Get state setters from stores
  const setVectorStoreId = useProfileStore(state => state.setVectorStoreId);
  const setVectorStoreInTools = useToolsStore(state => state.setVectorStore);

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
      
      // Check for non-JSON responses that might indicate a redirection or HTML error page
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`API returned non-JSON response (${response.status}: ${response.statusText}). This may indicate an authentication issue.`);
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.error || `Failed to create vector store: ${response.statusText}`;
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      
      // Store the vector store ID in profile data
      setProfileData(prev => ({
        ...prev,
        vectorStoreId: data.id
      }));
      
      // Store vectorStoreId in ProfileStore (single source of truth for guests)
      setVectorStoreId(data.id);
      
      // Also update tools store for immediate use
      setVectorStoreInTools({
        id: data.id,
        name: `${name}_VectorStore`
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
      setNameError(t("welcomeStep.nameError"));
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
    <div className="space-y-8" dir={isRtl ? "rtl" : "ltr"}>
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-center space-y-3"
      >
        <div className="flex justify-center">
          <div className="p-4 bg-purple-100 rounded-full inline-block">
            <div style={{ position: 'relative', left: '-15px' }}>
              <AnimatedLogo className="h-10 w-10 text-purple-600" />
            </div>
          </div>
        </div>
        <h2 className="text-3xl font-bold text-gray-900">{t("welcomeStep.title")}</h2>
        <p className="text-zinc-500 max-w-md mx-auto">
          {t("welcomeStep.subtitle")}
        </p>
        
      {/* Language feature information card */}
      <Card className="p-4 border border-blue-200 bg-blue-50/50">
        <p className="text-sm text-blue-800">
          {t("welcomeStep.languageInfo")}
        </p>
      </Card>

        {/* Language Selector */}
        <div className="flex justify-center pt-4">
          <LanguageSelector />
        </div>
      </motion.div>

      <Card className="p-6 border border-purple-200 bg-purple-50/50">
        <div className="space-y-6">
          <div className="flex items-start space-x-4">
            <div className="bg-purple-100 p-3 rounded-full mt-1">
              <Brain className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">{t("welcomeStep.createAdvisor.title")}</h3>
              <p className="text-sm text-zinc-600 mt-1">
                {t("welcomeStep.createAdvisor.description")}
              </p>
            </div>
          </div>
          
          <div className="pt-4">
            <Label htmlFor="preferredName" className="block mb-2 font-medium">
              {t("welcomeStep.nameLabel")}
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
              placeholder={t("welcomeStep.namePlaceholder")}
              className={`bg-white ${nameError ? 'border-red-300' : ''}`}
            />
            {nameError && <p className="text-sm text-red-500 mt-1">{nameError}</p>}
          </div>
        </div>
      </Card>

 

      {storeError && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md text-sm">
          <p>{t("welcomeStep.storeError", { error: storeError })}</p>
          <p className="mt-1">{t("welcomeStep.storeErrorHelp")}</p>
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
              {t("welcomeStep.settingUp")}
            </>
          ) : (
            <>
              {t("welcomeStep.continueButton")} {isRtl ? <ArrowLeft className="mr-2 ml-0 h-4 w-4" /> : <ArrowRight className="ml-2 mr-0 h-4 w-4" />}
            </>
          )}
        </Button>
      </motion.div>
    </div>
  );
} 