
import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Task, EngineeringSpecs, ResourceYield, LaborYield } from '../types';

export const useDataSync = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Obtiene una Tarea Maestra con toda su ingeniería (Standard y Real)
   * Realiza un JOIN manual en el cliente para estructurar los datos según `EngineeringSpecs`.
   */
  const fetchTaskWithEngineering = async (taskId: string): Promise<Task | null> => {
    setLoading(true);
    try {
      // 1. Fetch Task Basic Info
      const { data: taskData, error: taskError } = await supabase
        .from('tasks_master')
        .select('*')
        .eq('id', taskId)
        .single();

      if (taskError) throw taskError;

      // 2. Fetch Engineering Details (Resources and Labor)
      const { data: engData, error: engError } = await supabase
        .from('task_engineering')
        .select(`
          *,
          resources ( id, name, unit, base_price, category ),
          labor_profiles ( id, role, hourly_rate )
        `)
        .eq('task_id', taskId);

      if (engError) throw engError;

      // 3. Transform Flat DB Rows into Nested Types (Standard vs Real)
      const standardSpecs: EngineeringSpecs = { resources: [], labor: [] };
      const realSpecs: EngineeringSpecs = { resources: [], labor: [] };

      engData.forEach((row: any) => {
        const target = row.is_standard ? standardSpecs : realSpecs;

        if (row.resource_id && row.resources) {
          target.resources.push({
            resourceId: row.resource_id,
            quantity: row.quantity,
            wastePercentage: row.waste_percent,
            // Hydrate extra fields if needed for UI context
            _resourceName: row.resources.name, 
            _unit: row.resources.unit
          } as any); // Casting for internal helper props
        } else if (row.labor_profile_id && row.labor_profiles) {
          target.labor.push({
            laborProfileId: row.labor_profile_id,
            hoursPerUnit: row.quantity, // In DB quantity column stores HH for labor
            crewCount: 1 // Default, DB could store this if schema expanded
          });
        }
      });

      // 4. Construct Final Object
      return {
        ...taskData,
        engineering: {
          standard: standardSpecs,
          real: realSpecs
        }
      };

    } catch (err: any) {
      console.error('Error fetching task engineering:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Guarda los cambios del Editor Maestro (Pestaña "Real" o "Standard").
   * Estrategia: Borrar los registros existentes del tipo (is_standard) para esa tarea e insertar los nuevos.
   * Esto evita lógica compleja de diffing en el frontend.
   */
  const updateYields = async (
    taskId: string, 
    specs: EngineeringSpecs, 
    isStandard: boolean = false
  ) => {
    setLoading(true);
    try {
      // 1. Delete existing rows for this task AND type (standard/real)
      const { error: deleteError } = await supabase
        .from('task_engineering')
        .delete()
        .eq('task_id', taskId)
        .eq('is_standard', isStandard);

      if (deleteError) throw deleteError;

      // 2. Prepare payload for insertion
      const rowsToInsert = [];

      // Resources
      specs.resources.forEach(r => {
        rowsToInsert.push({
          task_id: taskId,
          resource_id: r.resourceId,
          labor_profile_id: null,
          quantity: r.quantity,
          waste_percent: r.wastePercentage,
          is_standard: isStandard
        });
      });

      // Labor
      specs.labor.forEach(l => {
        rowsToInsert.push({
          task_id: taskId,
          resource_id: null,
          labor_profile_id: l.laborProfileId,
          quantity: l.hoursPerUnit, // Mapping HH to quantity column
          waste_percent: 0,
          is_standard: isStandard
        });
      });

      if (rowsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('task_engineering')
          .insert(rowsToInsert);
        
        if (insertError) throw insertError;
      }

      return true;
    } catch (err: any) {
      console.error('Error updating yields:', err);
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    fetchTaskWithEngineering,
    updateRealYield: (taskId: string, specs: EngineeringSpecs) => updateYields(taskId, specs, false),
    updateStandardYield: (taskId: string, specs: EngineeringSpecs) => updateYields(taskId, specs, true),
  };
};
