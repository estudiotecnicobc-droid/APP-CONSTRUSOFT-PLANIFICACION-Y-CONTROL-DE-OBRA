
import React, { useMemo, useState } from 'react';
import { useERP } from '../context/ERPContext';
import { addWorkingDays, diffDays } from '../services/calculationService';
import { 
  Calendar, Clock, AlertCircle, ArrowDown, Calculator, 
  ChevronsRight, Users, Check, Layout, List, PenTool
} from 'lucide-react';
import { LinkType } from '../types';
import { APUBuilder } from './APUBuilder';

export const Planning: React.FC = () => {
  const { 
    project, tasks, updateBudgetItem,
  } = useERP();
  
  // --- UI STATE ---
  const [viewMode, setViewMode] = useState<'table' | 'gantt'>('table');
  const [editingApuId, setEditingApuId] = useState<string | null>(null);

  // Working Days Config
  const workingDays = project.workingDays || [1,2,3,4,5]; 
  const nonWorkingDates = project.nonWorkingDates || [];
  const workdayHours = project.workdayHours || 9;

  // --- 1. SCHEDULING ENGINE (CALCULATIONS) ---
  const scheduledItems = useMemo(() => {
    const items = project.items.map((item, index) => ({ ...item, index: index + 1 }));
    const results: any[] = [];
    const processedIds = new Set<string>();
    const getProcessedItem = (id: string) => results.find(r => r.id === id);

    let iterations = 0;
    while (processedIds.size < items.length && iterations < 100) {
      let somethingProcessed = false;
      items.forEach(item => {
        if (processedIds.has(item.id)) return;

        const task = tasks.find(t => t.id === item.taskId);
        if (!task) return;

        // --- FORMULA COSCARELLA / CHANDÍAS ---
        // Duración (días) = (Cómputo * Rendimiento_HH) / (Cant_Personal * Horas_Jornada)
        
        const quantity = item.quantity || 0;
        
        // Use the Task's Daily Yield which is now live-edited in the Master Editor
        // Note: dailyYield in Task is "Units per Day".
        // Duration = Quantity / DailyCapacity
        
        // Planning override: "Frentes de ataque" (crewsAssigned) multiplies the base task yield.
        // If task.dailyYield is based on 1 crew, then multiply by item.crewsAssigned.
        // If task.dailyYield is already based on a specific crew setup in Master, be careful.
        // Convention: Task Master defines Yield for "One Standard Crew". Planning defines "Number of Crews".
        
        const crewSize = item.crewsAssigned || 1; 
        const dailyCapacity = task.dailyYield * crewSize;
        
        // Calculated duration in days (rounded up)
        const calculatedDuration = dailyCapacity > 0 ? Math.ceil(quantity / dailyCapacity) : 1;
        const duration = item.manualDuration || calculatedDuration;
        
        // --- PREDECESSOR LOGIC ---
        let startDate = item.startDate || project.startDate;

        if (item.dependencies && item.dependencies.length > 0) {
          let maxStartDate = new Date(project.startDate).getTime();
          let allDepsReady = true;

          item.dependencies.forEach(dep => {
            const pred = getProcessedItem(dep.predecessorId);
            if (!pred) { allDepsReady = false; return; }
            
            const predEnd = new Date(pred.end).getTime();
            const calculatedStart = predEnd + 86400000; // Next Day
            maxStartDate = Math.max(maxStartDate, calculatedStart);
          });

          if (!allDepsReady) return;
          startDate = new Date(maxStartDate).toISOString().split('T')[0];
        }

        const endDate = addWorkingDays(startDate, duration, workingDays, nonWorkingDates);
        
        results.push({
          ...item,
          taskName: task.name,
          category: task.category || 'Sin Categoría',
          start: startDate, 
          end: endDate,     
          duration,
          yieldHH: task.yieldHH || 0,
          dailyCapacity,
          crewSize
        });
        processedIds.add(item.id);
        somethingProcessed = true;
      });
      if (!somethingProcessed) break;
      iterations++;
    }
    
    // Sort by Date then Index
    return results.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [project, tasks, workingDays, nonWorkingDates, workdayHours]);

  // --- CRITICAL PATH SUMMARY ---
  const criticalPathStats = useMemo(() => {
      if (scheduledItems.length === 0) return { finishDate: new Date(), totalDays: 0 };
      
      const maxEndDate = scheduledItems.reduce((max, item) => {
          const end = new Date(item.end).getTime();
          return end > max ? end : max;
      }, 0);

      const finishDate = new Date(maxEndDate);
      const startDate = new Date(project.startDate);
      const totalDays = diffDays(project.startDate, finishDate.toISOString().split('T')[0]);

      return { finishDate, totalDays };
  }, [scheduledItems, project.startDate]);

  // --- HANDLERS ---
  const handleUpdate = (id: string, field: string, value: any) => {
      updateBudgetItem(id, { [field]: value });
  };

  const handleSetPredecessor = (itemId: string, predId: string) => {
      const deps = predId ? [{ predecessorId: predId, type: LinkType.FS, lag: 0 }] : [];
      updateBudgetItem(itemId, { dependencies: deps });
  };

  return (
    <div className="flex flex-col h-full space-y-6 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
         <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="text-blue-600" /> Planificación de Obra
            </h2>
            <p className="text-sm text-slate-500 mt-1">Motor de cálculo basado en Rendimientos Maestros (APU).</p>
         </div>
         
         <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
             <div className="text-right border-r border-slate-200 pr-4">
                 <div className="text-[10px] font-bold text-slate-400 uppercase">Fin de Obra Estimado</div>
                 <div className="text-lg font-bold text-slate-800">{criticalPathStats.finishDate.toLocaleDateString()}</div>
             </div>
             <div className="text-right">
                 <div className="text-[10px] font-bold text-slate-400 uppercase">Duración Total</div>
                 <div className="text-lg font-bold text-blue-600">{criticalPathStats.totalDays} días</div>
             </div>
         </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          
          <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <div className="flex gap-2">
                  <button 
                    onClick={() => setViewMode('table')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${viewMode === 'table' ? 'bg-white text-blue-600 shadow' : 'text-slate-500 hover:bg-slate-200'}`}
                  >
                      <List size={16} /> Tabla de Cálculo
                  </button>
                  <button 
                    onClick={() => setViewMode('gantt')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${viewMode === 'gantt' ? 'bg-white text-blue-600 shadow' : 'text-slate-500 hover:bg-slate-200'}`}
                  >
                      <Layout size={16} /> Diagrama Gantt
                  </button>
              </div>
              <div className="text-xs text-slate-500 font-medium">
                  Jornada: <strong>{workdayHours}hs</strong>
              </div>
          </div>

          <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-500 uppercase text-[10px] font-bold sticky top-0 z-10">
                      <tr>
                          <th className="p-3 border-r border-slate-200 w-12 text-center">ID</th>
                          <th className="p-3 border-r border-slate-200 min-w-[200px]">Actividad</th>
                          <th className="p-3 border-r border-slate-200 w-24 text-center bg-blue-50/50">Cómputo</th>
                          <th className="p-3 border-r border-slate-200 w-24 text-center bg-orange-50/50">Frentes (Cuadrillas)</th>
                          <th className="p-3 border-r border-slate-200 w-24 text-center">Rend. Base (u/día)</th>
                          <th className="p-3 border-r border-slate-200 w-24 text-center">Prod. Total</th>
                          <th className="p-3 border-r border-slate-200 w-24 text-center font-black text-slate-700">Duración (Días)</th>
                          <th className="p-3 border-r border-slate-200 w-40 text-center">Precedencia</th>
                          <th className="p-3 border-r border-slate-200 w-28 text-center">Fecha Inicio</th>
                          <th className="p-3 w-28 text-center">Fecha Fin</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                      {scheduledItems.map((item, idx) => (
                          <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                              <td className="p-2 text-center text-slate-400 font-mono">{idx + 1}</td>
                              <td className="p-2 font-medium text-slate-700 flex items-center justify-between">
                                  <div>
                                      {item.taskName}
                                      <div className="text-[9px] text-slate-400 font-normal">{item.category}</div>
                                  </div>
                                  <button onClick={() => setEditingApuId(item.taskId)} className="text-purple-300 hover:text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" title="Ajustar Rendimiento Maestro">
                                      <PenTool size={14} />
                                  </button>
                              </td>
                              
                              {/* INPUT: Quantity */}
                              <td className="p-2 text-center bg-blue-50/30">
                                  <input 
                                    type="number" 
                                    className="w-16 p-1 text-center border border-slate-300 rounded font-bold text-slate-700 focus:border-blue-500 outline-none"
                                    value={item.quantity}
                                    onChange={(e) => handleUpdate(item.id, 'quantity', parseFloat(e.target.value))}
                                  />
                              </td>

                              {/* INPUT: Crew Size */}
                              <td className="p-2 text-center bg-orange-50/30">
                                  <div className="flex justify-center items-center gap-1">
                                      <Users size={12} className="text-orange-400" />
                                      <input 
                                        type="number" 
                                        min="1"
                                        className="w-12 p-1 text-center border border-slate-300 rounded font-bold text-slate-700 focus:border-orange-500 outline-none"
                                        value={item.crewSize}
                                        onChange={(e) => handleUpdate(item.id, 'crewsAssigned', parseInt(e.target.value))}
                                      />
                                  </div>
                              </td>

                              {/* READ ONLY: Yield (Base) */}
                              <td className="p-2 text-center text-slate-500">
                                  {(item.dailyCapacity / item.crewSize).toFixed(2)}
                              </td>

                              {/* CALC: Daily Capacity */}
                              <td className="p-2 text-center text-slate-500 font-mono">
                                  {item.dailyCapacity.toFixed(2)}
                              </td>

                              {/* CALC: Duration */}
                              <td className="p-2 text-center font-black text-blue-600 bg-slate-50 text-sm border-l border-r border-slate-100">
                                  {item.duration}
                              </td>

                              {/* INPUT: Predecessor */}
                              <td className="p-2 text-center">
                                  <select 
                                    className="w-full p-1 border border-slate-200 rounded text-[10px] text-slate-600 truncate"
                                    value={item.dependencies?.[0]?.predecessorId || ''}
                                    onChange={(e) => handleSetPredecessor(item.id, e.target.value)}
                                  >
                                      <option value="">-- Inicio --</option>
                                      {scheduledItems
                                        .filter(i => i.id !== item.id) // Avoid self-loop
                                        .map(i => (
                                          <option key={i.id} value={i.id}>{i.taskName.substring(0, 30)}...</option>
                                      ))}
                                  </select>
                              </td>

                              {/* CALC: Dates */}
                              <td className="p-2 text-center text-slate-600">
                                  {new Date(item.start).toLocaleDateString()}
                              </td>
                              <td className="p-2 text-center font-bold text-slate-700">
                                  {new Date(item.end).toLocaleDateString()}
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
          
          <div className="bg-slate-50 p-4 border-t border-slate-200 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-lg text-xs font-bold border border-blue-200">
                  <Calculator size={14} />
                  <span>Fórmula: Duración = Cómputo / (Rendimiento Base × Frentes de Ataque)</span>
              </div>
          </div>
      </div>

      {editingApuId && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                  <APUBuilder taskId={editingApuId} onClose={() => setEditingApuId(null)} />
              </div>
          </div>
      )}
    </div>
  );
};
