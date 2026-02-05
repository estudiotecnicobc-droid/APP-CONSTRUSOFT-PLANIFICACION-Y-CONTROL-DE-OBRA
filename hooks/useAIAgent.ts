
import { useState, useCallback } from 'react';
import { useERP } from '../context/ERPContext';
import { GoogleGenAI } from "@google/genai";
import { calculateUnitPrice } from '../services/calculationService';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export const useAIAgent = () => {
  const { project, tasks, yieldsIndex, materialsMap, toolYieldsIndex, toolsMap, laborCategoriesMap, crewsMap, taskCrewYieldsIndex } = useERP();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // --- CONTEXT BUILDER (Dynamic RAG) ---
  const buildProjectContext = () => {
    // 1. Análisis de Costos Top 15 Tareas
    const taskAnalysis = project.items.map(item => {
      const task = tasks.find(t => t.id === item.taskId);
      if (!task) return null;
      const analysis = calculateUnitPrice(task, yieldsIndex, materialsMap, toolYieldsIndex, toolsMap, taskCrewYieldsIndex, crewsMap, laborCategoriesMap);
      const totalCost = analysis.totalUnitCost * item.quantity;
      
      const standardLabor = task.standardYields?.labor?.[0]?.hhPerUnit || 0;
      const currentYieldHH = task.yieldHH || 0;
      
      return {
        name: task.name,
        category: task.category,
        quantity: item.quantity,
        totalCost,
        unitPrice: analysis.totalUnitCost,
        yieldData: {
            standard: standardLabor,
            current: currentYieldHH,
            deviation: standardLabor > 0 ? ((currentYieldHH - standardLabor) / standardLabor) * 100 : 0
        }
      };
    }).filter(Boolean).sort((a,b) => (b?.totalCost || 0) - (a?.totalCost || 0)).slice(0, 15);

    const totalBudget = taskAnalysis.reduce((acc, t) => acc + (t?.totalCost || 0), 0);

    return JSON.stringify({
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
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const contextData = buildProjectContext();
      
      const systemInstruction = `
        Actúa como un 'AI Project Manager' experto en Ingeniería de Costos y Planificación de Obras (Metodología Chandías y Coscarella).
        Estás integrado en el ERP 'Construsoft'.
        
        DATOS DEL PROYECTO ACTUAL (CONTEXTO):
        ${contextData}

        TU OBJETIVO:
        Analizar estos datos y responder preguntas estratégicas.

        REGLAS DE COMPORTAMIENTO:
        1. **Fundamentación Técnica:** Usa fórmulas de ingeniería.
           - Duración = (Cantidad * Rendimiento HH) / (Tamaño Cuadrilla * Jornada).
           - Costo Directo = Materiales + Mano de Obra + Equipos.
        2. **Análisis de Desvíos:** Si preguntas por problemas, busca tareas donde 'yieldData.deviation' sea alto.
           - Si el rendimiento actual (current) > estándar, es una ineficiencia (pérdida).
           - Si el rendimiento actual < estándar, es un ahorro (o error de estimación).
        3. **Formato:** Usa Markdown. Usa negritas para KPIs (ej: **$50,000**). Usa listas para enumerar hallazgos.
        4. **Seguridad:** NO inventes datos. Si no está en el JSON de contexto, di que no tienes esa información. NO menciones otros proyectos.
        5. **Brevedad:** Sé conciso y ejecutivo. Ve al grano.

        EJEMPLO DE RESPUESTA:
        "Analizando el rubro **Estructuras**, detecto que el ítem 'Hormigón H21' tiene un sobrecosto del **15%**. Esto se debe a que estamos usando un rendimiento de **12hh/m3** cuando el estándar de Chandías sugiere **10hh/m3**. Recomiendo revisar la composición de la cuadrilla."
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
          text: "⚠️ Lo siento, hubo un error al procesar tu consulta técnica. Verifica tu conexión o la API Key.", 
          timestamp: new Date() 
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [project, tasks, yieldsIndex, messages]);

  return { messages, sendMessage, isLoading };
};
