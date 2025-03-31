"use client";
import Assistant from "@/components/assistant";
import ToolsPanel from "@/components/tools-panel";
import ConversationSelector from "@/components/conversation-selector";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { PageWrapper } from "@/components/layouts/PageWrapper";

export default function ChatPage() {
  const [isToolsPanelOpen, setIsToolsPanelOpen] = useState(false);
  
  return (
    <PageWrapper allowGuest>
      <div className="flex justify-center h-screen">
        <div className="w-full md:w-[70%] relative">
          <Assistant />
        </div>
        <div className="hidden md:flex md:flex-col md:w-[30%]">
          <div className="p-4 border-b border-gray-200">
            <ConversationSelector />
          </div>
          {/* <div className="flex-grow overflow-auto">
            <ToolsPanel />
          </div> */}
        </div>
        {/* Hamburger menu for small screens */}
        <div className="absolute top-4 right-4 md:hidden">
          <button onClick={() => setIsToolsPanelOpen(true)}>
            <Menu size={24} />
          </button>
        </div>
        {/* Overlay panel for ToolsPanel on small screens */}
        {isToolsPanelOpen && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black bg-opacity-30">
            <div className="w-full bg-white h-full p-4">
              <button className="mb-4" onClick={() => setIsToolsPanelOpen(false)}>
                <X size={24} />
              </button>
              <div className="mb-4">
                <ConversationSelector />
              </div>
              {/* <ToolsPanel /> */}
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
