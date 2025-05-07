"use client";
import React from "react";
import FileSearchSetup from "./file-search-setup";
import WebSearchConfig from "./websearch-config";
import FunctionsView from "./functions-view";

export default function ContextPanel() {
  return (
    <div className="h-full p-8 w-full bg-[#f9f9f9] rounded-t-xl md:rounded-none border-l-1 border-stone-100">
      <div className="flex flex-col overflow-y-scroll h-full space-y-6">
        <section>
          <h2 className="text-lg font-medium mb-2">File Search</h2>
          <FileSearchSetup />
        </section>
        <section>
          <h2 className="text-lg font-medium mb-2">Web Search</h2>
          <WebSearchConfig />
        </section>
        <section>
          <h2 className="text-lg font-medium mb-2">Functions</h2>
          <FunctionsView />
        </section>
      </div>
    </div>
  );
}
