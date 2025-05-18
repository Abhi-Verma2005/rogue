import { create } from "zustand";
import { v4 as uuidv4 } from 'uuid'; 
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface Message {
  id: string;
  text: string;
  sender: 'ai' | 'user';
  parentId?: string | null;
  timestamp: Date;
  isCode?: boolean;
}

export interface MessageNode {
  message: Message;
  replies: MessageNode[];
}

interface MessageState {
  messages: Message[];
  addMessage: (message: Partial<Message>) => Message;
  input: string;
  setInput: (text: string) => void;
  showModal: boolean;
  buildmessageTree: (messages: Message[]) => MessageNode[];
  setShowModal: (value: boolean) => void;
  isFocused: boolean;
  setIsFocused: (value: boolean) => void;
  isLoading: boolean;
  setIsLoading: (value: boolean) => void;
  currentStreamingMessage: string | null;
  sendMessage: () => Promise<void>;
  handleAIResponse: (userMessage: string) => Promise<void>;
  latestAIMessageId: string | null;
  sendToGeminiStream: (userMessage: string) => Promise<void>;
  replyToMessage: (parentId: string, text: string) => Promise<void>;
}

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);

const useMessageStore = create<MessageState>((set, get) => ({
  
  sendToGeminiStream: async (userMessage: string) => {
    const aiMessageId = Date.now() + 1 + '';
    
    set((state) => ({
      messages: [...state.messages, {
        id: aiMessageId,
        text: '',
        sender: 'ai',
        timestamp: new Date(),
        parentId: state.latestAIMessageId // Connect to previous message
      }],
      currentStreamingMessage: aiMessageId,
      latestAIMessageId: aiMessageId // Update latest AI message
    }));
  
    try {
      function beautifyPlainText(text: string): string {
        let clean = text.replace(/\*\*(.*?)\*\*/g, '$1');
        clean = clean.replace(/\*(.*?)\*/g, '$1');
        return clean;
      }
      
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const instruction = `Your name is Juggernaut, in short Jugg"`;
      const responseStream = await model.generateContentStream(instruction + userMessage);
      
      for await (const chunk of responseStream.stream) {
        const textChunk = chunk.text();
        
        set((state) => {
          const updatedMessages = state.messages.map(msg => {
            if (msg.id === state.currentStreamingMessage) {
              return { ...msg, text: msg.text + beautifyPlainText(textChunk) };
            }
            return msg;
          });
          return { messages: updatedMessages };
        });
      }
    } catch (error) {
      console.error("Streaming error:", error);

      set((state) => {
        const updatedMessages = state.messages.map(msg => {
          if (msg.id === state.currentStreamingMessage) {
            return { ...msg, text: "Error: Could not process your request." };
          }
          return msg;
        });
        
        return { messages: updatedMessages };
      });
    } finally {
      set({ isLoading: false, currentStreamingMessage: null });
    }
  },
  
  buildmessageTree: (messages: Message[]): MessageNode[] => {
    // Create a map for quick message lookup
    const nodeMap = new Map<string, MessageNode>();
    
    // Initialize all nodes with empty replies arrays
    messages.forEach(message => {
      nodeMap.set(message.id, {
        message,
        replies: []
      });
    });
    
    // Build the tree structure by connecting parents and children
    const roots: MessageNode[] = [];
    
    messages.forEach(message => {
      const node = nodeMap.get(message.id)!;
      
      if (message.parentId && nodeMap.has(message.parentId)) {
        // Add this node as a child to its parent
        const parentNode = nodeMap.get(message.parentId)!;
        parentNode.replies.push(node);
      } else {
        // No parent or parent not found, this is a root node
        roots.push(node);
      }
    });
    
    return roots;
  },
  
  messages: [],
  showModal: false,
  setShowModal: (value: boolean) => set({ showModal: value }),
  currentStreamingMessage: null,
  
  addMessage: (messageData: Partial<Message>) => {
    const message: Message = {
      id: messageData.id || uuidv4(),
      text: messageData.text || '',
      sender: messageData.sender || 'user',
      timestamp: messageData.timestamp || new Date(),
      isCode: messageData.isCode || false,
      parentId: messageData.parentId || null
    };
    
    set((state) => ({
      messages: [...state.messages, message],
      latestAIMessageId: message.sender === 'user' ? message.id : state.latestAIMessageId
    }));
    
    return message;
  },
  
  input: '',
  setInput: (text) => set({ input: text }),
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
  isFocused: false,
  setIsFocused: (focused) => set({ isFocused: focused }),
  latestAIMessageId: null,

  // New function to reply to a specific message
  replyToMessage: async (parentId: string, text: string) => {
    const { addMessage, setIsLoading, sendToGeminiStream } = get();
    
    if (!text.trim()) return;
    
    // Add user message with specified parentId
    const userMessage = addMessage({
      sender: 'user',
      text,
      isCode: false,
      parentId
    });
    
    setIsLoading(true);
    
    try {
      // Pass context that this is a reply to a specific message
      await sendToGeminiStream(`Reply to message: ${text}`);
    } catch (error) {
      console.error('AI Response Error:', error);
      addMessage({
        sender: 'ai',
        text: "Sorry, I encountered an error processing your request.",
        isCode: false,
        parentId: userMessage.id
      });
      setIsLoading(false);
    }
  },

  sendMessage: async () => {
    const { input, setInput, handleAIResponse } = get();
    if (!input.trim()) return;

    const messageText = input;
    setInput('');
    await handleAIResponse(messageText);
  },

  handleAIResponse: async (userMessage: string) => {
    const { addMessage, setIsLoading, sendToGeminiStream } = get();

    if (!userMessage.trim()) return;

    // Add user message
    const message = addMessage({
      sender: 'user',
      text: userMessage,
      isCode: false
    });

    setIsLoading(true);

    try {
      await sendToGeminiStream(userMessage);
    } catch (error) {
      console.error('AI Response Error:', error);
      addMessage({
        sender: 'ai',
        text: "Sorry, I encountered an error processing your request.",
        isCode: false,
        parentId: message.id
      });
      setIsLoading(false);
    }
  }
}));

export default useMessageStore;