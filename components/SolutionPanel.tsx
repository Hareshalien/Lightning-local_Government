
import React, { useState, useRef, useEffect } from 'react';
import { Report, AnalysisResult, ChatMessage } from '../types';
import { analyzeReports, createAnalysisChat, sendChatMessage } from '../services/geminiService';
import { Chat } from "@google/genai";

interface SolutionPanelProps {
  reports: Report[];
}

const SolutionPanel: React.FC<SolutionPanelProps> = ({ reports }) => {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Chat state
  const chatRef = useRef<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Only scroll to bottom if the conversation has actually started (more than the initial AI greeting).
    // This prevents the view from jumping to the bottom when the analysis is first generated,
    // allowing the user to read the Executive Summary at the top first.
    if (messages.length > 1) {
      scrollToBottom();
    }
  }, [messages]);

  const handleGenerateSolution = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await analyzeReports(reports);
      if (result) {
        setAnalysis(result);
        // Initialize chat immediately after successful analysis
        chatRef.current = createAnalysisChat(reports, result);
        setMessages([{
          role: 'model',
          text: "I've analyzed the reports. I can help you with specific details, resource contacts, or drafting public announcements. What do you need?",
          timestamp: new Date()
        }]);
      } else {
         setError("AI returned empty results.");
      }
    } catch (error) {
      setError("Unable to generate strategic plan. Please check connectivity and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendChat = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || !chatRef.current) return;

    const userMsg: ChatMessage = { role: 'user', text: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setChatLoading(true);

    try {
      const responseText = await sendChatMessage(chatRef.current, userMsg.text);
      setMessages(prev => [...prev, { role: 'model', text: responseText, timestamp: new Date() }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error responding to that.", timestamp: new Date() }]);
    } finally {
      setChatLoading(false);
    }
  };

  const getSeverityColor = (severity: string, isRelevant: boolean) => {
    if (!isRelevant) return 'bg-gray-100 text-gray-600 border-gray-300';
    switch (severity.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low': return 'bg-slate-100 text-slate-800 border-slate-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-lg border border-blue-100 overflow-hidden relative">
      <div className="flex-1 overflow-y-auto bg-blue-50/50 scroll-smooth">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full space-y-6 p-10">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-cyan-500 rounded-full animate-spin"></div>
              <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-b-blue-600 rounded-full animate-spin" style={{ animationDuration: '2s' }}></div>
            </div>
            <p className="text-blue-800 font-semibold text-lg animate-pulse">Consulting Gemini 3 AI...</p>
            <p className="text-blue-500 text-sm">Analyzing severity, assigning resources, and prioritizing tasks.</p>
          </div>
        ) : error ? (
           <div className="text-center p-10 flex flex-col items-center justify-center h-full">
             <div className="text-red-500 text-xl mb-4">⚠️ {error}</div>
             <button onClick={handleGenerateSolution} className="text-blue-600 underline">Try Again</button>
           </div>
        ) : analysis ? (
          <div className="flex flex-col min-h-full">
            {/* Analysis Content */}
            <div className="p-6 max-w-7xl mx-auto space-y-8 w-full">
               {/* Strategic Overview Card */}
               <div className="bg-white p-6 rounded-xl border border-blue-100 shadow-sm">
                  <h3 className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-2">Executive Summary</h3>
                  <p className="text-blue-900 text-lg leading-relaxed font-medium">
                    {analysis.strategicOverview}
                  </p>
               </div>

               {/* Priority List */}
               <div>
                 <h3 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
                   <span>📋</span> Prioritized Action Items
                 </h3>
                 
                 <div className="space-y-4">
                   {analysis.prioritizedReports.map((item, idx) => {
                     const originalReport = reports.find(r => r.id === item.reportId);
                     const imageSrc = originalReport?.imageBase64.startsWith('data:image') 
                        ? originalReport.imageBase64 
                        : `data:image/jpeg;base64,${originalReport?.imageBase64}`;

                     // Use conditional styling for irrelevant items
                     const isRelevant = item.isRelevant !== false;
                     const containerOpacity = isRelevant ? 'opacity-100' : 'opacity-70 bg-gray-50';
                     const titleColor = isRelevant ? 'text-slate-800' : 'text-gray-500 line-through decoration-gray-400';
                     
                     // Calculate days elapsed
                     let daysElapsed = 0;
                     if (originalReport?.dateTime) {
                        const reportedDate = new Date(originalReport.dateTime);
                        const now = new Date();
                        const diffTime = Math.abs(now.getTime() - reportedDate.getTime());
                        daysElapsed = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 
                     }

                     return (
                       <div key={idx} className={`relative rounded-xl shadow-sm border border-blue-100 hover:shadow-md transition-shadow overflow-hidden flex flex-col md:flex-row ${containerOpacity} ${!isRelevant ? 'border-gray-200' : 'bg-white'}`}>
                          
                          {/* Badge for Irrelevant Items */}
                          {!isRelevant && (
                             <div className="absolute top-0 right-0 bg-gray-200 text-gray-500 px-3 py-1 text-xs font-bold rounded-bl-lg z-10 border-l border-b border-gray-300">
                               NON-GOV ISSUE
                             </div>
                          )}

                          <div className={`w-full md:w-2 ${!isRelevant ? 'bg-gray-300' : item.severity === 'Critical' ? 'bg-red-500' : item.severity === 'High' ? 'bg-orange-500' : item.severity === 'Medium' ? 'bg-blue-500' : 'bg-slate-400'}`}></div>
                          
                          <div className="p-5 flex-1 flex gap-4">
                             {/* Image and Days Elapsed Column */}
                             {imageSrc && (
                               <div className="hidden sm:flex flex-col items-center space-y-2 flex-shrink-0 w-24">
                                  <div className={`w-24 h-24 rounded-lg bg-gray-100 overflow-hidden ${!isRelevant ? 'grayscale opacity-75' : ''}`}>
                                    <img src={imageSrc} alt="issue" className="w-full h-full object-cover" />
                                  </div>
                                  <div className="text-xs font-bold text-slate-400 text-center whitespace-nowrap bg-slate-50 px-2 py-1 rounded-full border border-slate-100">
                                     {daysElapsed === 0 ? 'Today' : `${daysElapsed} day${daysElapsed !== 1 ? 's' : ''} ago`}
                                  </div>
                               </div>
                             )}
                             
                             <div className="flex-1">
                                <div className="flex justify-between items-start mb-2">
                                   <div>
                                      <div className={`inline-block px-2 py-0.5 rounded text-xs font-bold border mb-2 ${getSeverityColor(item.severity, isRelevant)}`}>
                                        {isRelevant ? `${item.severity.toUpperCase()} PRIORITY` : 'IRRELEVANT'}
                                      </div>
                                      <h4 className={`text-lg font-bold ${titleColor}`}>{item.displayTitle}</h4>
                                   </div>
                                   {isRelevant && (
                                     <div className="text-right">
                                        <span className="text-xs font-bold text-blue-400 uppercase tracking-wide">Assign To</span>
                                        <div className="bg-blue-900 text-white px-3 py-1 rounded-md text-sm font-bold shadow-sm mt-1">
                                          {item.recommendedResource}
                                        </div>
                                     </div>
                                   )}
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                                   <div className={`${isRelevant ? 'bg-blue-50/50' : 'bg-gray-100'} p-3 rounded-lg`}>
                                      <span className={`text-xs font-semibold uppercase ${isRelevant ? 'text-blue-500' : 'text-gray-500'}`}>
                                        {isRelevant ? 'Action Plan' : 'Reasoning'}
                                      </span>
                                      <p className={`text-sm font-medium mt-1 ${isRelevant ? 'text-blue-900' : 'text-gray-600'}`}>{item.actionPlan}</p>
                                   </div>
                                   <div className={`${isRelevant ? 'bg-slate-50' : 'bg-gray-50'} p-3 rounded-lg`}>
                                      <span className="text-xs font-semibold text-slate-500 uppercase">Justification</span>
                                      <p className="text-sm text-slate-600 mt-1">{item.justification}</p>
                                   </div>
                                </div>
                             </div>
                          </div>
                       </div>
                     );
                   })}
                 </div>
               </div>
               
               {/* Divider */}
               <div className="border-t-2 border-dashed border-blue-200 my-8"></div>

               {/* Chat Section */}
               <div className="pb-24">
                 <h3 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
                   <span>💬</span> AI Consultant
                 </h3>
                 <div className="space-y-4">
                   {messages.map((msg, idx) => (
                     <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`
                          max-w-[80%] rounded-2xl px-5 py-3 shadow-sm text-sm leading-relaxed
                          ${msg.role === 'user' 
                            ? 'bg-blue-600 text-white rounded-br-none' 
                            : 'bg-white border border-blue-100 text-slate-700 rounded-bl-none'}
                        `}>
                           {msg.text}
                        </div>
                     </div>
                   ))}
                   {chatLoading && (
                     <div className="flex justify-start">
                       <div className="bg-white border border-blue-100 rounded-2xl rounded-bl-none px-5 py-4 shadow-sm">
                         <div className="flex space-x-1">
                           <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                           <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                           <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                         </div>
                       </div>
                     </div>
                   )}
                   <div ref={messagesEndRef} />
                 </div>
               </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-lg mx-auto p-6">
            <div className="bg-blue-100 p-4 rounded-full mb-6">
               <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
            </div>
            <h2 className="text-2xl font-bold text-blue-900 mb-2">AI-Powered Solutions</h2>
            <p className="text-slate-600 mb-8">
              Let Gemini 3 analyze all current reports, categorize severity, and generate a strategic action plan for your team.
            </p>
            <button
               onClick={handleGenerateSolution}
               className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2"
            >
              <span>⚡</span> Generate Analysis
            </button>
          </div>
        )}
      </div>
      
      {/* Sticky Input Bar */}
      {analysis && (
        <div className="bg-white border-t border-blue-100 p-4 shadow-lg z-10">
           <form onSubmit={handleSendChat} className="max-w-7xl mx-auto flex gap-2">
             <input
               type="text"
               value={input}
               onChange={(e) => setInput(e.target.value)}
               placeholder="Ask follow-up questions about the plan..."
               className="flex-1 border border-blue-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-blue-50/50 text-slate-800 placeholder-blue-300"
               disabled={chatLoading}
             />
             <button
               type="submit"
               disabled={chatLoading || !input.trim()}
               className={`
                 px-6 rounded-xl font-bold transition-all flex items-center gap-2
                 ${chatLoading || !input.trim() 
                   ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                   : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'}
               `}
             >
               Send
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
             </button>
           </form>
        </div>
      )}
    </div>
  );
};

export default SolutionPanel;
