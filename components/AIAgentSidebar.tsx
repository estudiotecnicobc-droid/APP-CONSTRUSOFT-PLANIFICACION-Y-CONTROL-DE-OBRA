
import React, { useState, useRef, useEffect } from 'react';
import { useAIAgent } from '../hooks/useAIAgent';
import { Bot, Send, X, Sparkles, TrendingUp, AlertTriangle, ChevronRight, MessageSquare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export const AIAgentSidebar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { messages, sendMessage, isLoading } = useAIAgent();
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    sendMessage(inputValue);
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const SUGGESTED_PROMPTS = [
    { text: "¿Cuál es el costo total estimado actual?", icon: <TrendingUp size={14}/> },
    { text: "Identifica las 3 tareas con mayor impacto en el presupuesto.", icon: <AlertTriangle size={14}/> },
    { text: "Analiza si hay desvíos en los rendimientos de mano de obra.", icon: <Sparkles size={14}/> },
  ];

  return (
    <>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform duration-200 group border-2 border-white/20"
          title="Consultar al AI Project Manager"
        >
          <Bot size={28} className="group-hover:animate-bounce" />
          <span className="absolute -top-2 -right-2 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-sky-500"></span>
          </span>
        </button>
      )}

      {/* Sidebar Container */}
      <div 
        className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[450px] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col border-l border-slate-200 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex justify-between items-center shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500 rounded-lg">
                <Bot size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm">AI Project Manager</h3>
              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                Conectado al contexto de obra
              </p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-10 opacity-60">
                <Bot size={48} className="mx-auto text-slate-300 mb-4" />
                <p className="text-sm text-slate-500 font-medium">¿En qué puedo ayudarte hoy, Ingeniero?</p>
                <p className="text-xs text-slate-400 mt-1">Tengo acceso a los cómputos, precios y rendimientos actuales.</p>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`max-w-[85%] rounded-2xl p-3 text-sm shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-none' 
                    : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                }`}
              >
                {msg.role === 'model' ? (
                    <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-headings:text-slate-800 prose-headings:font-bold prose-headings:text-xs prose-headings:uppercase prose-strong:text-indigo-700">
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                ) : (
                    msg.text
                )}
                <div className={`text-[9px] mt-1 text-right ${msg.role === 'user' ? 'text-blue-200' : 'text-slate-300'}`}>
                    {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none p-4 shadow-sm flex items-center gap-2">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions Area */}
        {messages.length === 0 && (
            <div className="px-4 pb-2">
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-2 ml-1">Sugerencias Rápidas</p>
                <div className="space-y-2">
                    {SUGGESTED_PROMPTS.map((prompt, idx) => (
                        <button 
                            key={idx}
                            onClick={() => sendMessage(prompt.text)}
                            className="w-full text-left p-3 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl text-xs text-slate-600 transition-all flex items-center gap-3 group"
                        >
                            <div className="p-1.5 bg-slate-100 group-hover:bg-white rounded text-indigo-500">
                                {prompt.icon}
                            </div>
                            {prompt.text}
                            <ChevronRight size={14} className="ml-auto text-slate-300 group-hover:text-indigo-400"/>
                        </button>
                    ))}
                </div>
            </div>
        )}

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-slate-200">
          <div className="relative flex items-center">
            <textarea
              className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm resize-none"
              placeholder="Escribe tu consulta..."
              rows={1}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />
            <button 
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              className="absolute right-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:bg-slate-300 transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
          <div className="text-[9px] text-center text-slate-400 mt-2">
            La IA puede cometer errores. Verifica los cálculos críticos.
          </div>
        </div>
      </div>
    </>
  );
};
