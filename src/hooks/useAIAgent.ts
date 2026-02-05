
import { useState, useCallback } from 'react';
import { useERP } from '../context/ERPContext';
import { useAuthRole } from './useAuthRole'; // Use the real auth hook
import { GoogleGenAI } from "@google/genai";
import { calculateUnitPrice } from '../services/calculationService';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

// OWASP LLM01: Guardrails - Blacklist Patterns
const FORBIDDEN_PATTERNS = [
  /ignore previous instructions/i,
  /system prompt/i,
  /sueldos? gerencia/i,
  /salarios? directivos?/i,
  /claves? de acceso/i,
  /admin password/i,
  /drop table/i,
  /select \* from users/i
];

export const useAIAgent = () => {
  const { project, tasks, yieldsIndex, materialsMap, toolYieldsIndex, toolsMap, laborCategoriesMap, crewsMap, taskCrewYieldsIndex } = useERP();
  const { role } = useAuthRole(); // Inject User Role
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // --- 1. SECURITY: INPUT VALIDATION (OWASP) ---
  const validateQuery = (text: string): { isValid: boolean; error?: string } => {
    if (text.length > 500) return { isValid: false, error: "Consulta demasiado larga (Máx 500 caracteres)." };
    
    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(text)) {
        console.warn(`Security Event: Blocked AI query matching pattern ${pattern}`);
        return { isValid: false, error: "🛡️ Su consulta ha sido bloqueada por los protocolos de seguridad de la empresa (Política de Privacidad)." };
      }
    }
    return { isValid: true };
  };

  const buildProjectContext = () => {
    // Determine data visibility based on Role (RBAC for RAG)
    const canSeeCosts = role === 'admin' || role === 'engineering';

    // 1. Análisis de Costos Top 15 Tareas
    const taskAnalysis = project.items.map(item => {
      const task = tasks.find(t => t.id === item.taskId);
      if (!task) return null;
      
      let unitPrice = 0;
      let totalCost = 0;

      // Only calculate costs if user has permission
      if (canSeeCosts) {
        const analysis = calculateUnitPrice(task, yieldsIndex, materialsMap, toolYieldsIndex, toolsMap, taskCrewYieldsIndex, crewsMap, laborCategoriesMap);
        unitPrice = analysis.totalUnitCost;
        totalCost = unitPrice * item.quantity;
      }

      // Standard deviations (Performance) are visible to Site Managers (Capataz)
      const standardLabor = task.standardYields?.labor?.[0]?.hhPerUnit || 0;
      const currentYieldHH = task.yieldHH || 0;
      
      return {
        name: task.name,
        category: task.category,
        quantity: item.quantity,
        totalCost: canSeeCosts ? totalCost : "RESTRINGIDO",
        unitPrice: canSeeCosts ? unitPrice : "RESTRINGIDO",
        yieldData: {
            standard: standardLabor,
            current: currentYieldHH,
            deviation: standardLabor > 0 ? ((currentYieldHH - standardLabor) / standardLabor) * 100 : 0
        }
      };
    }).filter(Boolean).sort((a,b) => (typeof b?.totalCost === 'number' ? b.totalCost : 0) - (typeof a?.totalCost === 'number' ? a.totalCost : 0)).slice(0, 15);

    const totalBudget = canSeeCosts ? taskAnalysis.reduce((acc, t) => acc + (typeof t?.totalCost === 'number' ? t.totalCost : 0), 0) : "CONFIDENCIAL";

    return JSON.stringify({
      userRole: role,
      projectName: project.name,
      client: project.client,
      totalEstimatedBudget: totalBudget,
      currency: project.currency,
      topCriticalTasks: taskAnalysis,
      workdayConfig: {
          hours: project.workdayHours,
          days: project.workingDays?.length
      }
    });
  };

  const sendMessage = useCallback(async (text: string) => {
    // 1. Validate Input before processing
    const validation = validateQuery(text);
    if (!validation.isValid) {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'user', text, timestamp: new Date() }]);
      setTimeout(() => {
        setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'model', text: validation.error!, timestamp: new Date() }]);
      }, 500);
      return;
    }

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const contextData = buildProjectContext();
      
      // 2. Security System Prompt (Contextual RBAC)
      const systemInstruction = `
        Actúa como un 'AI Project Manager' experto en Ingeniería de Costos.
        Estás integrado en el ERP 'Construsoft'.
        
        PERFIL DE SEGURIDAD DEL USUARIO ACTUAL:
        Rol: ${role?.toUpperCase() || 'DESCONOCIDO'}
        
        DATOS DEL PROYECTO ACTUAL (CONTEXTO):
        ${contextData}

        REGLAS DE SEGURIDAD (MANDATORIAS):
        1. **Privacidad de Datos:** Si el usuario tiene rol 'FOREMAN' (Capataz) o 'CLIENT' (Cliente), NO reveles costos unitarios, márgenes de beneficio o totales financieros aunque los deduzcas. Si preguntan, responde: "Sus permisos actuales no permiten visualizar información financiera detallada".
        2. **Scope:** Solo responde sobre este proyecto específico.
        3. **No Alucinaciones:** Si el dato dice "RESTRINGIDO" o "CONFIDENCIAL", no intentes adivinarlo.

        TU OBJETIVO:
        Analizar estos datos y responder preguntas estratégicas acorde al nivel de acceso del usuario.
        
        EJEMPLO DE RESPUESTA (Rol Admin):
        "El desvío en Hormigón es del 15%, generando una pérdida de $50,000."
        
        EJEMPLO DE RESPUESTA (Rol Foreman):
        "El rendimiento en Hormigón es menor al esperado (12hh/m3 vs 10hh/m3). Revisa la cuadrilla."
      `;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const model = ai.getGenerativeModel({ 
          model: "gemini-3-flash-preview",
          systemInstruction: systemInstruction
      });

      const chatHistory = messages.map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
      }));

      const chat = model.startChat({
          history: chatHistory
      });

      const result = await chat.sendMessageStream(text);
      
      const aiMsgId = crypto.randomUUID();
      let fullText = "";
      
      setMessages(prev => [...prev, { id: aiMsgId, role: 'model', text: '', timestamp: new Date() }]);

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullText += chunkText;
        setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: fullText } : m));
      }

    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { 
          id: crypto.randomUUID(), 
          role: 'model', 
          text: "⚠️ Error de conexión segura con el Agente. Intente nuevamente.", 
          timestamp: new Date() 
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [project, tasks, yieldsIndex, messages, role]);

  return { messages, sendMessage, isLoading };
};
