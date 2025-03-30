"use client";
import React, { useEffect } from "react";
import FileSearchSetup from "./file-search-setup";
import WebSearchConfig from "./websearch-config";
import FunctionsView from "./functions-view";
import PanelConfig from "./panel-config";
import useToolsStore from "@/stores/useToolsStore";
import useProfileStore from "@/stores/useProfileStore";
import { useAuth } from "@/app/components/auth/AuthContext";

export default function ContextPanel() {
  const {
    fileSearchEnabled,
    setFileSearchEnabled,
    webSearchEnabled,
    setWebSearchEnabled,
    functionsEnabled,
    setFunctionsEnabled,
    vectorStore,
    setVectorStore
  } = useToolsStore();
  
  // Get vectorStoreId from the authoritative sources
  const { vectorStoreId: authVectorStoreId } = useAuth();
  const { vectorStoreId: profileVectorStoreId } = useProfileStore();
  
  // Sync tools store with the most current vectorStoreId
  useEffect(() => {
    const currentVectorStoreId = authVectorStoreId || profileVectorStoreId;
    
    // If there's an authoritative vectorStoreId and it differs from the tools store
    if (currentVectorStoreId && (!vectorStore || vectorStore.id !== currentVectorStoreId)) {
      // Fetch vector store details and update tools store
      const fetchAndUpdateVectorStore = async () => {
        try {
          const response = await fetch(
            `/api/vector_stores/retrieve_store?vector_store_id=${currentVectorStoreId}`
          );
          
          if (response.ok) {
            const storeData = await response.json();
            if (storeData.id) {
              setVectorStore(storeData);
            }
          }
        } catch (error) {
          console.error("Error fetching vector store:", error);
        }
      };
      
      fetchAndUpdateVectorStore();
    }
  }, [authVectorStoreId, profileVectorStoreId, vectorStore, setVectorStore]);
  
  return (
    <div className="h-full p-8 w-full bg-[#f9f9f9] rounded-t-xl md:rounded-none border-l-1 border-stone-100">
      <div className="flex flex-col overflow-y-scroll h-full">
        <PanelConfig
          title="File Search"
          tooltip="Allows to search a knowledge base (vector store)"
          enabled={fileSearchEnabled}
          setEnabled={setFileSearchEnabled}
        >
          <FileSearchSetup />
        </PanelConfig>
        <PanelConfig
          title="Web Search"
          tooltip="Allows to search the web"
          enabled={webSearchEnabled}
          setEnabled={setWebSearchEnabled}
        >
          <WebSearchConfig />
        </PanelConfig>
        <PanelConfig
          title="Functions"
          tooltip="Allows to use locally defined functions"
          enabled={functionsEnabled}
          setEnabled={setFunctionsEnabled}
        >
          <FunctionsView />
        </PanelConfig>
      </div>
    </div>
  );
}
