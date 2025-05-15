'use client'
import React, { useRef, useEffect, useState } from 'react';
import { Check, Clipboard, User, Send, GitGraphIcon, Paperclip, MessageSquarePlus, X, ChevronRight, Brain, Settings } from 'lucide-react';
import useMessageStore from '@/store/messages';
import toast from 'react-hot-toast';

const ChatComponent: React.FC = () => {
  const { 
    messages, 
    isLoading,
    input, 
    setInput, 
    sendMessage, 
    setShowModal
  } = useMessageStore();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [showPrompts, setShowPrompts] = useState(false);
  const [showToneChanger, setShowToneChanger] = useState(false);
  const [currentTone, setCurrentTone] = useState("juggernaut");
  
  const DEFAULT_HEIGHT = "40px";
  const MAX_HEIGHT = 150;


  const tones = [
    { id: "juggernaut", name: "Juggernaut", description: "Detailed, balanced and comprehensive analysis" },
    { id: "legal", name: "Legal Check", description: "Focuses only on legality and compliance issues" },
    { id: "concise", name: "Concise", description: "Brief, to-the-point responses" },
    { id: "creative", name: "Creative", description: "Imaginative and innovative perspectives" },
    { id: "technical", name: "Technical", description: "In-depth, specialized analysis" }
  ];
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  useEffect(() => {
    if (input.trim() === '') {
      resetTextAreaHeight();
    } else {
      adjustTextAreaHeight();
    }
  }, [input]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  };

  const resetTextAreaHeight = () => {
    const textArea = textAreaRef.current;
    if (textArea) {
      textArea.style.height = DEFAULT_HEIGHT;
    }
  };

  const adjustTextAreaHeight = () => {
    const textArea = textAreaRef.current;
    if (!textArea) return;
    
    textArea.style.height = "auto";
    
    const newHeight = Math.min(textArea.scrollHeight, MAX_HEIGHT);
    textArea.style.height = `${newHeight}px`;
  };

  const handleInput = () => {
    if (input.trim() === '') {
      resetTextAreaHeight();
    } else {
      adjustTextAreaHeight();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  
  const handlePaste = () => {
    setTimeout(() => {
      adjustTextAreaHeight();
    }, 0);
  };
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(id);
      toast.success("Copied to clipboard! 📋");
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error(err);
      toast.error("Failed to copy! ❌");
    }
  };
  
  const handleClearInput = () => {
    setInput('');
    resetTextAreaHeight();
    if (textAreaRef.current) {
      textAreaRef.current.focus();
    }
  };

  const toggleToneChanger = () => {
    setShowToneChanger(!showToneChanger);
    setShowPrompts(false);
  };

  const changeTone = (toneId: string) => {
    setCurrentTone(toneId);
    setShowToneChanger(false);
    
    // Show toast notification confirming tone change
    const toneName = tones.find(t => t.id === toneId)?.name || "Default";
    toast.success(`Tone changed to ${toneName}! 🎭`);
  };

  const isEmpty = input.trim() === '';

  const getToneIndicator = () => {
    const tone = tones.find(t => t.id === currentTone);
    return tone?.name || "Juggernaut";
  };

  return (
    <div className="flex flex-col w-full h-[90vh] max-w-[70%] mx-auto relative">
      <div className="flex-1 p-4 pb-40 mt-24 overflow-y-auto relative bg-white">
        {/* Tone indicator */}
        <div className="sticky top-0 flex justify-center mb-4 z-10">
          <div className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
            <span>Tone: {getToneIndicator()}</span>
          </div>
        </div>
        
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-blue-500">
            <p className="text-center">Chat with Juggernaut</p>
          </div>
        ) : (
          messages.map((message) => (
            <div 
              key={message.id} 
              className={`flex mb-4 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`relative max-w-3/4 rounded-lg p-3 ${
                  message.sender === 'user' 
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-br-none' 
                    : 'bg-white text-slate-800 border border-blue-100 rounded-bl-none shadow-md'
                }`}
                style={{ width: message.sender === 'ai' ? '75%' : 'auto' }}
              >
                <div className="flex flex-col w-full">
                  <div className="flex items-center mb-1">
                    {message.sender === 'ai' ? (
                      <Brain className="size-4"/>
                    ) : (
                      <User size={16} className="mr-1 text-white" />
                    )}
                    <span className="text-xs opacity-70 mx-1">
                      {message.sender === 'ai' ? 'Jugg' : 'You'} • {formatTime(message.timestamp)}
                    </span>
                  </div>
                  
                  <div className="w-full p-3">
                    <div className="whitespace-pre-wrap">{message.text}</div>
                  </div>
    
                  <button 
                    className={`absolute bottom-2 right-2 p-1 rounded-md transition-all ${
                      message.sender === 'user'
                        ? 'text-white hover:text-blue-200'
                        : 'text-blue-400 hover:text-blue-600'
                    }`}
                    onClick={() => copyToClipboard(message.text, message.id)}
                  >
                    {copiedMessageId === message.id ? (
                      <Check size={16} className="text-green-500" />
                    ) : (
                      <Clipboard size={16}/>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex mb-4 justify-start">
            <div className="flex max-w-[75%] rounded-lg p-4 bg-white text-slate-800 border border-blue-100 rounded-bl-none shadow-md">
              <div className="flex items-center space-x-2">
                <Brain/>
                <p className="text-xl font-semibold text-transparent bg-clip-text bg-[linear-gradient(to_right,#2563eb_0%,#60a5fa_50%,#2563eb_100%)] bg-[length:200%_100%] animate-[shimmer_1.5s_infinite_linear]">
                  Jugg is Thinking
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input Component - Fixed at bottom with increased bottom padding */}
      <div
        className="fixed left-1/2 transform -translate-x-1/2 bottom-10 w-full max-w-3xl p-[2px] rounded-xl"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Gradient border */}
        <div 
          className={`absolute inset-0 rounded-xl border-[2px] border-transparent
          bg-gradient-to-r from-blue-600 via-blue-500 to-teal-400 transition-all duration-300
          ${isHovered ? 'opacity-100' : 'opacity-75'}`}
        />

        <div className="relative w-full h-full rounded-xl bg-white p-3">
          {/* Quick Prompts Panel */}
          {showPrompts && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-lg border border-blue-100 p-2 z-10">
              <div className="flex items-center justify-between border-b border-blue-50 pb-2 mb-2">
                <h3 className="font-medium text-blue-600">Quick Prompts</h3>
                <button 
                  onClick={() => setShowPrompts(false)}
                  className="p-1 hover:bg-blue-50 rounded-full text-blue-500"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Tone Changer Panel */}
          {showToneChanger && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-lg border border-blue-100 p-2 z-10">
              <div className="flex items-center justify-between border-b border-blue-50 pb-2 mb-2">
                <div className="flex items-center text-blue-600">
                  <Settings size={16} className="mr-1" />
                  <h3 className="font-medium">Response Tone</h3>
                </div>
                <button 
                  onClick={() => setShowToneChanger(false)}
                  className="p-1 hover:bg-blue-50 rounded-full text-blue-500"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto p-2">
                <p className="text-sm text-slate-600 mb-3">
                  Choose how you want Juggernaut to respond:
                </p>
                <div className="space-y-2">
                  {tones.map((tone) => (
                    <button
                      key={tone.id}
                      onClick={() => changeTone(tone.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-md transition-all
                        ${currentTone === tone.id ? 
                          'bg-blue-50 text-blue-700 border border-blue-200' : 
                          'bg-slate-50 hover:bg-blue-50 text-slate-700'
                        }`}
                    >
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{tone.name}</span>
                        <span className="text-xs text-slate-500 mt-1">{tone.description}</span>
                      </div>
                      {currentTone === tone.id && (
                        <Check size={16} className="text-blue-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Text area container */}
          <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="w-full">
            <div className="relative">
              <textarea
                ref={textAreaRef}
                className="w-full px-3 py-2 text-base font-light text-slate-800 placeholder:text-slate-400
                  outline-none focus:ring-0 focus:border-transparent
                  rounded-lg resize-none font-sans bg-blue-50"
                placeholder="Message Jugg..."
                rows={1}
                value={input}
                onKeyDown={handleKeyDown}
                onChange={(e) => setInput(e.target.value)}
                onInput={handleInput}
                onPaste={handlePaste}
                style={{ height: DEFAULT_HEIGHT }} // Initial fixed height
              />
              
              {/* Send button */}
              <button 
                type="submit" 
                disabled={isEmpty}
                className={`absolute right-2 bottom-2 p-1.5 rounded-md transition-all duration-200
                  ${isEmpty 
                    ? "bg-slate-200 text-slate-400" 
                    : "bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600"}`}
              >
                <Send size={16} className={isEmpty ? "opacity-50" : "opacity-100"} />
              </button>
              
              {/* Clear button - only show when input has content */}
              {!isEmpty && (
                <button 
                  type="button"
                  onClick={handleClearInput}
                  className="absolute right-10 bottom-2 p-1.5 rounded-md transition-all duration-200 text-slate-400 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </form>

          {/* Toolbar */}
          <div className="flex items-center mt-2 px-1">
            <div className="flex items-center space-x-1">
              <button 
                onClick={toggleToneChanger}
                className={`p-1 rounded-md hover:bg-blue-50 transition-all ${showToneChanger ? 'bg-blue-50 text-blue-600' : 'text-blue-400 hover:text-blue-600'}`}
                title="Change response tone"
              >
                <Settings className="size-4" />
              </button>
            </div>
            
            <div className="ml-auto flex items-center">
              {/* Tone indicator badge */}
              <div className="mr-2 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs">
                {getToneIndicator()}
              </div>
              <div className="text-xs text-blue-500 font-medium">
                {input.length > 0 && `${input.length} characters`}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatComponent;