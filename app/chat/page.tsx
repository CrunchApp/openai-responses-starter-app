"use client";
import Assistant from "@/components/assistant";
import ToolsPanel from "@/components/tools-panel";
import { Menu, X, User } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

export default function Main() {
  const [isToolsPanelOpen, setIsToolsPanelOpen] = useState(false);
  
  return (
    <div className="flex justify-center h-screen">
      <div className="w-full md:w-[70%] relative">
        {/* Profile Button */}
        <div className="absolute top-4 left-4 z-10">
          <Link href="/dashboard">
            <button className="flex items-center justify-center p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-full transition-colors duration-200">
              <User size={20} />
            </button>
          </Link>
        </div>
        
        <Assistant />
      </div>
      <div className=" hidden md:block w-[30%]">
        <ToolsPanel />
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
            <ToolsPanel />
          </div>
        </div>
      )}
    </div>
  );
}
