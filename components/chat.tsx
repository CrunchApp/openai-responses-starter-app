"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import ToolCall from "./tool-call";
import Message from "./message";
import Annotations from "./annotations";
import { Item } from "@/lib/assistant";

interface ChatProps {
  items: Item[];
  onSendMessage: (message: string) => void;
}

const Chat: React.FC<ChatProps> = ({ items, onSendMessage }) => {
  const itemsEndRef = useRef<HTMLDivElement>(null);
  const [inputMessageText, setinputMessageText] = useState<string>("");
  // This state is used to provide better user experience for non-English IMEs such as Japanese
  const [isComposing, setIsComposing] = useState(false);

  const scrollToBottom = () => {
    itemsEndRef.current?.scrollIntoView({ behavior: "instant" });
  };

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !isComposing) {
      event.preventDefault();
      onSendMessage(inputMessageText);
      setinputMessageText("");
    }
  }, [onSendMessage, inputMessageText]);

  useEffect(() => {
    scrollToBottom();
  }, [items]);

  return (
    <div className="flex justify-center items-center size-full">
      <div className="flex grow flex-col h-full max-w-[750px] gap-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[80vh] px-6 text-center">
            <div className="mb-6 p-3 bg-blue-100 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h2 className="text-xl font-medium text-gray-800 mb-2">Welcome to Vista Education Adviser</h2>
            <p className="text-gray-600 max-w-md mb-8">
              I'm here to help you navigate your educational journey. Ask me about programs, career paths, application tips, and more.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-md w-full">
              {["What programs would suit my interests?", "How do I apply for scholarships?", "What career paths are available with my degree?", "How can I prepare for university interviews?"].map((suggestion, index) => (
                <button 
                  key={index}
                  onClick={() => onSendMessage(suggestion)}
                  className="p-3 text-sm text-left text-gray-700 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-[80vh] overflow-y-scroll px-4 md:px-6 flex flex-col">
            <div className="mt-auto space-y-6 pt-4 pb-2">
              {items.map((item, index) => (
                <React.Fragment key={index}>
                  {item.type === "tool_call" ? (
                    <ToolCall toolCall={item} />
                  ) : item.type === "message" ? (
                    <div className="flex flex-col gap-1">
                      <Message message={item} />
                      {item.content &&
                        item.content[0].annotations &&
                        item.content[0].annotations.length > 0 && (
                          <Annotations
                            annotations={item.content[0].annotations}
                          />
                        )}
                    </div>
                  ) : null}
                </React.Fragment>
              ))}
              <div ref={itemsEndRef} />
            </div>
          </div>
        )}
        <div className="px-4 md:px-6 py-3 bg-white border-t border-gray-100">
          <div className="flex items-center">
            <div className="flex w-full items-center">
              <div className="flex w-full flex-col gap-1.5 rounded-xl p-2 transition-colors bg-white border border-gray-200 shadow-sm hover:border-blue-300 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                <div className="flex items-end gap-2">
                  <div className="flex min-w-0 flex-1 flex-col">
                    <textarea
                      id="prompt-textarea"
                      tabIndex={0}
                      dir="auto"
                      rows={1}
                      placeholder="Ask about educational programs, career paths, or application tips..."
                      className="resize-none border-0 focus:outline-none text-sm bg-transparent px-2 py-2 text-gray-800"
                      value={inputMessageText}
                      onChange={(e) => setinputMessageText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onCompositionStart={() => setIsComposing(true)}
                      onCompositionEnd={() => setIsComposing(false)}
                    />
                  </div>
                  <button
                    disabled={!inputMessageText.trim()}
                    data-testid="send-button"
                    className="flex size-10 items-center justify-center rounded-lg bg-blue-600 text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:bg-gray-200 disabled:text-gray-400 disabled:hover:bg-gray-200 mr-1"
                    onClick={() => {
                      if (inputMessageText.trim()) {
                        onSendMessage(inputMessageText);
                        setinputMessageText("");
                      }
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-2 text-xs text-center text-gray-500">
            Vista Education Adviser helps you navigate your educational journey with personalized recommendations.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
