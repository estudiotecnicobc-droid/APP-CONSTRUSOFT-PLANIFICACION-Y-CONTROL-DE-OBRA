
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { addDays, diffDays } from '../services/calculationService';

export interface FinancialDataPoint {
  date: string;
  plannedValue: number; // PV (Base Line)
  earnedValue: number;  // EV (Avance Físico valorizado)
  actualCost: number;   // AC (Gasto Real)
  weekLabel: string;
}

export interface EVMMetrics {
  bac: number; // Budget at Completion
  pv: number;  // Planned Value (to date)
  ev: number;  // Earned Value (to date)
  ac: number;  // Actual Cost (to date)
  cv: number;  // Cost Variance
  sv: number;  // Schedule Variance
  cpi: number; // Cost Performance Index
  spi: number; // Schedule Performance Index
  eac: number; // Estimate at Completion
}

export const useFinancials = (projectId: string) => {
  const [loading, setLoading] = useState(true);
  const [sCurve, setSCurve] = useState<FinancialDataPoint[]>([]);
  const [metrics, setMetrics] = useState<EVMMetrics | null>(null);

  useEffect(() => {
    if (!projectId) return;
    fetchProjectFinancials(projectId);
  }, [projectId]);

  const fetchProjectFinancials = async (projId: string) => {
    setLoading(true);
    try {
      // 1. Fetch Deep Hierarchical Data
      // Obtenemos: Tareas de Proyecto -> Tarea Maestra -> Ingeniería -> Recursos/Perfiles
      const { data: projectTasks, error } = await supabase
        .from('project_tasks')
        .select(`
          id,
          quantity,
          start_date,
          end_date,
          progress,
          tasks_master (
            id,
            name,
            task_engineering (
              quantity, 
              is_standard,
              resources ( id, base_price ),
              labor_profiles ( id, hourly_rate )
            )
          )
        `)
        .eq('project_id', projId);

      if (error) throw error;

      // 2. Data Processing Structures
      const dailyPlanned: Record<string, number> = {};
      const dailyActual: Record<string, number> = {};
      const dailyEarned: Record<string, number> = {};
      let totalBAC = 0;
      let totalEV = 0;
      let totalAC = 0; // Simplified AC for this version

      // Helper to calculate unit price from raw DB engineering rows
      const calculateUnitCost = (engineeringRows: any[], isStandard: boolean) => {
        let cost = 0;
        const relevantRows = engineeringRows.filter((r: any) => r.is_standard === isStandard);
        
        relevantRows.forEach((row: any) => {
          if (row.resources) {
            // Material/Equipment: Price * Quantity * (1 + Waste?) - Waste ignored for simplicity here
            cost += row.resources.base_price * row.quantity;
          } else if (row.labor_profiles) {
            // Labor: HourlyRate * HoursPerUnit
            cost += row.labor_profiles.hourly_rate * row.quantity;
          }
        });
        return cost;
      };

      // 3. Iterate Tasks to build Timeline
      projectTasks?.forEach((pt: any) => {
        if (!pt.start_date || !pt.tasks_master) return;

        const engineering = pt.tasks_master.task_engineering || [];
        
        // A. Calculate Budgeted Cost (Standard)
        const unitPriceStandard = calculateUnitCost(engineering, true);
        const budgetTotal = unitPriceStandard * pt.quantity;
        totalBAC += budgetTotal;

        // B. Calculate Actual/Projected Cost (Real)
        // If Real engineering exists, use it. Else fall back to standard.
        const unitPriceReal = calculateUnitCost(engineering, false) || unitPriceStandard;
        // In a full system, AC comes from Invoices. Here we simulate AC based on Real Engineering * Progress.
        const acTotal = unitPriceReal * pt.quantity * ((pt.progress || 0) / 100); 
        totalAC += acTotal;

        // C. Calculate Earned Value
        const evTotal = budgetTotal * ((pt.progress || 0) / 100);
        totalEV += evTotal;

        // D. Distribute over Time (Linear Distribution)
        const duration = Math.max(1, diffDays(pt.start_date, pt.end_date || pt.start_date));
        const dailyPV = budgetTotal / duration;
        
        // Earned Value is tied to the date. Simple assumption: EV follows PV curve up to current date for finished %
        // Better assumption: EV is recognized on the date reported. 
        // For S-Curve visualization, we plot PV linearly.
        
        for (let i = 0; i < duration; i++) {
          const d = new Date(pt.start_date);
          d.setDate(d.getDate() + i);
          const dateStr = d.toISOString().split('T')[0];

          dailyPlanned[dateStr] = (dailyPlanned[dateStr] || 0) + dailyPV;
          
          // Only plot actuals/earned up to today (or project end)
          if (new Date(dateStr) <= new Date()) {
             // Simplify: Distributed Actuals
             dailyActual[dateStr] = (dailyActual[dateStr] || 0) + (acTotal / (duration * ((pt.progress||1)/100) || 1)); 
             dailyEarned[dateStr] = (dailyEarned[dateStr] || 0) + (evTotal / (duration * ((pt.progress||1)/100) || 1));
          }
        }
      });

      // 4. Generate S-Curve Array
      const dates = Object.keys(dailyPlanned).sort();
      if (dates.length === 0) {
          setSCurve([]);
          setLoading(false);
          return;
      }

      const curve: FinancialDataPoint[] = [];
      let accumPV = 0;
      let accumEV = 0;
      let accumAC = 0;
      const todayStr = new Date().toISOString().split('T')[0];

      // Fill gaps if needed, but for now iterate known dates
      dates.forEach(date => {
        accumPV += dailyPlanned[date] || 0;
        
        // Stop accumulating actuals in the future
        if (date <= todayStr) {
            accumAC += dailyActual[date] || 0; // Using simplified linear distrib for AC
            accumEV += dailyEarned[date] || 0; // Using simplified linear distrib for EV
        }

        curve.push({
          date,
          weekLabel: new Date(date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
          plannedValue: Math.round(accumPV),
          earnedValue: date <= todayStr ? Math.round(accumEV) : null as any,
          actualCost: date <= todayStr ? Math.round(accumAC) : null as any,
        });
      });

      setSCurve(curve);

      // 5. Calculate Final KPIs
      // PV to date is the PV of the last recorded date in curve <= today
      const currentPV = curve.filter(c => c.date <= todayStr).pop()?.plannedValue || 0;

      const cpi = totalAC > 0 ? totalEV / totalAC : 1;
      const spi = currentPV > 0 ? totalEV / currentPV : 1;
      const eac = cpi > 0 ? totalBAC / cpi : totalBAC;

      setMetrics({
        bac: totalBAC,
        pv: currentPV,
        ev: totalEV,
        ac: totalAC,
        cv: totalEV - totalAC,
        sv: totalEV - currentPV,
        cpi,
        spi,
        eac
      });

    } catch (err) {
      console.error("Error calculating financials:", err);
    } finally {
      setLoading(false);
    }
  };

  return { sCurve, metrics, loading, refreshFinancials: fetchProjectFinancials };
};
