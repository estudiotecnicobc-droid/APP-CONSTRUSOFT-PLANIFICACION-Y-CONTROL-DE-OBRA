
import React from 'react';
import { useERP } from '../context/ERPContext';
import { useFinancials } from '../hooks/useFinancials';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, Activity, Target, AlertTriangle, 
  CheckCircle2, Clock, CalendarDays 
} from 'lucide-react';

export const AnalyticsDashboard: React.FC = () => {
  const { project } = useERP();
  const { sCurve, metrics, loading } = useFinancials(project.id);

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Activity className="w-10 h-10 text-blue-600 animate-pulse" />
          <span className="text-slate-500 font-medium">Calculando flujo de fondos y métricas EVM...</span>
        </div>
      </div>
    );
  }

  if (!metrics || sCurve.length === 0) {
    return (
      <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
        <p className="text-slate-400">No hay datos suficientes para generar el análisis financiero.</p>
        <p className="text-xs text-slate-400 mt-1">Asegúrese de tener tareas con costos y fechas asignadas.</p>
      </div>
    );
  }

  // Helper for KPI styling
  const getKpiColor = (val: number, type: 'CPI' | 'SPI') => {
    if (val >= 1) return 'text-emerald-600';
    if (val >= 0.85) return 'text-amber-600';
    return 'text-red-600';
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: project.currency, maximumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* 1. KPI CARDS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Cost Variance (CV) */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <DollarSign size={20} />
            </div>
            <span className={`text-xs font-bold px-2 py-1 rounded ${metrics.cv >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
              {metrics.cv >= 0 ? 'Ahorro' : 'Sobrecosto'}
            </span>
          </div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Desvío de Costo (CV)</p>
          <h3 className={`text-2xl font-black mt-1 ${metrics.cv >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
            {metrics.cv >= 0 ? '+' : ''}{formatCurrency(metrics.cv)}
          </h3>
          <p className="text-xs text-slate-400 mt-2">Diferencia entre Valor Ganado y Costo Real</p>
        </div>

        {/* Cost Performance Index (CPI) */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <div className={`p-2 rounded-lg ${metrics.cpi >= 1 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
              <TrendingUp size={20} />
            </div>
            <span className="text-2xl font-black text-slate-800">{metrics.cpi.toFixed(2)}</span>
          </div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Índice Desempeño (CPI)</p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div 
              className={`h-full rounded-full ${metrics.cpi >= 1 ? 'bg-emerald-500' : 'bg-red-500'}`} 
              style={{ width: `${Math.min(100, metrics.cpi * 100)}%` }} 
            />
          </div>
          <p className={`text-xs mt-2 font-medium ${getKpiColor(metrics.cpi, 'CPI')}`}>
            {metrics.cpi >= 1 ? 'Eficiente (Gasta menos de lo previsto)' : 'Ineficiente (Gasta más de lo previsto)'}
          </p>
        </div>

        {/* Schedule Performance Index (SPI) */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <div className={`p-2 rounded-lg ${metrics.spi >= 1 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
              <Clock size={20} />
            </div>
            <span className="text-2xl font-black text-slate-800">{metrics.spi.toFixed(2)}</span>
          </div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Índice Cronograma (SPI)</p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div 
              className={`h-full rounded-full ${metrics.spi >= 1 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
              style={{ width: `${Math.min(100, metrics.spi * 100)}%` }} 
            />
          </div>
          <p className={`text-xs mt-2 font-medium ${getKpiColor(metrics.spi, 'SPI')}`}>
            {metrics.spi >= 1 ? 'Adelantado respecto al plan' : 'Atrasado respecto al plan'}
          </p>
        </div>

        {/* Estimate at Completion (EAC) */}
        <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-800 shadow-md relative overflow-hidden">
          <div className="absolute right-0 top-0 p-4 opacity-10">
            <Target size={80} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2 text-blue-300">
              <Activity size={18} />
              <span className="text-xs font-bold uppercase">Proyección Final</span>
            </div>
            <h3 className="text-2xl font-mono font-bold">{formatCurrency(metrics.eac)}</h3>
            <div className="mt-3 pt-3 border-t border-slate-700 flex justify-between text-xs">
              <span className="text-slate-400">Presupuesto Original:</span>
              <span className="font-mono">{formatCurrency(metrics.bac)}</span>
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-slate-400">Desvío Proyectado:</span>
              <span className={`font-mono font-bold ${metrics.bac - metrics.eac >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {metrics.bac - metrics.eac >= 0 ? '-' : '+'}{formatCurrency(Math.abs(metrics.bac - metrics.eac))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. S-CURVE CHART */}
      <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm h-[500px] flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp className="text-blue-600" size={20} /> Curva S: Análisis de Valor Ganado
            </h3>
            <p className="text-sm text-slate-500">Comparativa acumulada de Planificado (PV) vs. Real (AC) vs. Ganado (EV)</p>
          </div>
          <div className="flex gap-4 text-xs">
             <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full font-bold">
               <div className="w-2 h-2 bg-blue-500 rounded-full"></div> Línea Base (PV)
             </div>
             <div className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 rounded-full font-bold">
               <div className="w-2 h-2 bg-red-500 rounded-full"></div> Costo Real (AC)
             </div>
             <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full font-bold">
               <div className="w-2 h-2 bg-emerald-500 rounded-full"></div> Valor Ganado (EV)
             </div>
          </div>
        </div>

        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={sCurve} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPV" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="weekLabel" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                minTickGap={30}
              />
              <YAxis 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(val) => `$${val/1000}k`}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                labelStyle={{ color: '#64748b', fontWeight: 'bold', marginBottom: '0.5rem' }}
                formatter={(val: number) => formatCurrency(val)}
              />
              
              {/* PV: Area Chart (Background context) */}
              <Area 
                type="monotone" 
                dataKey="plannedValue" 
                name="Planificado (PV)" 
                stroke="#3b82f6" 
                fillOpacity={1} 
                fill="url(#colorPV)" 
                strokeWidth={2}
              />
              
              {/* AC: Line Chart (Solid Red) */}
              <Line 
                type="monotone" 
                dataKey="actualCost" 
                name="Costo Real (AC)" 
                stroke="#ef4444" 
                strokeWidth={3} 
                dot={{r: 4, strokeWidth: 2}}
              />

              {/* EV: Line Chart (Solid Green) */}
              <Line 
                type="monotone" 
                dataKey="earnedValue" 
                name="Valor Ganado (EV)" 
                stroke="#10b981" 
                strokeWidth={3} 
                strokeDasharray="5 5"
                dot={{r: 4, strokeWidth: 2}}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. ADDITIONAL INSIGHTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-start gap-4">
              <div className="bg-slate-100 p-3 rounded-full">
                  <CalendarDays className="text-slate-600" />
              </div>
              <div>
                  <h4 className="font-bold text-slate-800 text-sm">Estado del Cronograma</h4>
                  <p className="text-xs text-slate-500 mt-1">
                      {metrics.spi > 1 
                        ? "El proyecto avanza a un ritmo superior al planificado. Se recomienda mantener la asignación de recursos actual."
                        : "El proyecto presenta retrasos. Considere aumentar cuadrillas (Crashing) o re-secuenciar tareas críticas (Fast-tracking)."
                      }
                  </p>
              </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-start gap-4">
              <div className="bg-slate-100 p-3 rounded-full">
                  <DollarSign className="text-slate-600" />
              </div>
              <div>
                  <h4 className="font-bold text-slate-800 text-sm">Salud Financiera</h4>
                  <p className="text-xs text-slate-500 mt-1">
                      {metrics.cpi > 1 
                        ? `Está generando un ahorro del ${((metrics.cpi - 1) * 100).toFixed(1)}% por cada peso invertido.`
                        : `Está perdiendo ${((1 - metrics.cpi) * 100).toFixed(1)} centavos por cada peso gastado debido a ineficiencias o mayores costos.`
                      }
                  </p>
              </div>
          </div>
      </div>

    </div>
  );
};
