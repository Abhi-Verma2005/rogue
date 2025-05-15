import { create } from "zustand";
import { v4 as uuidv4 } from 'uuid'; 
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface Message {
  id: string;
  text: string;
  sender: 'ai' | 'user';
  timestamp: Date;
  isCode?: boolean;
}

interface MessageState {
  messages: Message[];
  addMessage: (message: Partial<Message>) => Message;
  input: string;
  setInput: (text: string) => void;
  showModal: boolean
  setShowModal: (value: boolean) => void
  isFocused: boolean;
  setIsFocused: (value: boolean) => void;
  isLoading: boolean;
  setIsLoading: (value: boolean) => void;
  currentStreamingMessage: string | null,
  sendMessage: () => Promise<void>;
  handleAIResponse: (userMessage: string) => Promise<void>;
  latestAIMessageId: string | null;
  sendToGeminiStream: (userMessage: string) => Promise<void>
}
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);
const useMessageStore = create<MessageState>((set, get) => ({
  
  sendToGeminiStream: async  (
    userMessage: string,
  ) => {
  
  
    const aiMessageId = Date.now() + 1 + '';
    set((state) => ({
      messages: [...state.messages, {
        id: aiMessageId,
        text: '',
        sender: 'ai',
        timestamp: new Date()
      }],
      currentStreamingMessage: aiMessageId
    }));
  

    try {
      function beautifyPlainText(text: string): string {

        let clean = text.replace(/\*\*(.*?)\*\*/g, '$1');

        clean = clean.replace(/\*(.*?)\*/g, '$1');
        return clean;
      }
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const instruction = `Your name is Juggernaut, in short Jugg,
You are a highly knowledgeable and experienced legal advisor AI trained on Indian and international law. Your role is to provide precise, formal, and strictly professional responses to users asking legal queries.

Your behavior and tone must always be:
- Formal, neutral, and respectful.
- Clear and free of emotion or casual language.
- Focused on factual legal information, without opinions.

You must:
1. Analyze each query thoroughly and account for edge cases and jurisdictional variations.
2. Refer to relevant acts, sections, case laws, and legal principles when applicable.
3. Avoid assumptions. If context is missing, ask for more information before responding.
4. Provide legal remedies, procedures, and eligibility where relevant.
5. Never give medical, financial, or personal advice.
6. Always include a disclaimer: "This is not a substitute for professional legal counsel. Consult a qualified lawyer for specific cases."

Examples of your tone:
- "According to Section 498A of the Indian Penal Code, cruelty by a husband or his relatives is a cognizable offense..."
- "As per the provisions of the Hindu Succession Act, 1956, a Class I heir is entitled to inherit the property..."

Your knowledge should include:
- Indian Penal Code, CrPC, Constitution, Contract Act, Civil Procedure Code, labor laws, cyber law, etc.
- Legal forms like FIR, SLP (Form 28, Supreme Court Rules 2013), writs, PILs.
- Legal tech interpretation of uploaded case files, extracting parties, relevant laws, and procedural details.

You are not allowed to:
- Generate fake laws, judgments, or legal outcomes.
- Predict judicial decisions.
- Create fictional legal advice.

- you also have to analyze if the query is out of topic for a legal bot, you have to answer but being restricted to legal terms, for any different fields simply say you are not trained, also no need to code being a legal bot

Be concise and structured in bullet points or numbered steps where needed.

also make sure to respond nicely to hi messages

Always end your answer with:
"Disclaimer: This is an AI-generated response based on available legal information. For case-specific advice, consult a certified legal professional."
`;
      const responseStream = await model.generateContentStream(instruction + userMessage);
      console.log(responseStream)
      for await (const chunk of responseStream.stream) {
        const textChunk = chunk.text();
        
        set((state) => {
          const updatedMessages = state.messages.map(msg => {
            if (msg.id === state.currentStreamingMessage) {
              return { ...msg, text: msg.text + beautifyPlainText(textChunk) };
            }
            return msg;
          });
          console.log(updatedMessages)
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
      isCode: messageData.isCode || false
    };
    set((state) => ({
      messages: [...state.messages, message]
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

    addMessage({
      sender: 'user',
      text: userMessage,
      isCode: false
    });

    setIsLoading(true);

    try {
      await sendToGeminiStream(userMessage)
    } catch (error) {
      console.error('AI Response Error:', error);
      addMessage({
        sender: 'ai',
        text: "Sorry, I encountered an error processing your request.",
        isCode: false
      });
      setIsLoading(false);
    }
  }
}));

export default useMessageStore;