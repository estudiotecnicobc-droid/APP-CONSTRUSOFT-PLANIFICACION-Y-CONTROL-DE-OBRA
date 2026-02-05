
/**
 * Construsoft ERP v2 - Core Type Definitions
 * Designed for Referential Integrity and Engineering Precision.
 */

export type Role = 'admin' | 'engineering' | 'foreman' | 'client';

export type ResourceType = 'MATERIAL' | 'EQUIPMENT';

/**
 * Recurso: Elemento atómico de costo (Insumo o Maquinaria).
 * Fuente de verdad para precios.
 */
export interface Resource {
  id: string;
  name: string;
  unit: string; // e.g., "un", "m3", "kg", "bolsa"
  type: ResourceType;
  basePrice: number; // Precio de lista / Referencia
  lastPurchasePrice?: number; // Último precio pagado (para análisis de variaciones)
  supplierCode?: string;
  updatedAt: string; // ISO Date
}

/**
 * Perfil de Mano de Obra.
 * Define el costo empresa por hora de una categoría gremial.
 */
export interface LaborProfile {
  id: string;
  role: string; // e.g., "Oficial Especializado", "Ayudante"
  hourlyCost: number; // Costo Hora Total (Básico + Cargas Sociales + Seguros)
  efficiencyFactor?: number; // Factor de productividad opcional (default 1.0)
}

/**
 * Consumo de Recurso (Yield).
 * Relaciona un recurso con una tarea específica.
 */
export interface ResourceYield {
  resourceId: string; // FK a Resource
  quantity: number; // Cantidad técnica neta
  wastePercentage: number; // % Desperdicio (e.g., 5 para 5%)
}

/**
 * Consumo de Mano de Obra (Yield).
 * Define el rendimiento humano.
 */
export interface LaborYield {
  laborProfileId: string; // FK a LaborProfile
  hoursPerUnit: number; // Horas Hombre por unidad de tarea (hh/u)
  crewCount: number; // Cantidad de personas de este perfil en la cuadrilla típica
}

/**
 * Especificaciones de Ingeniería.
 * Agrupa todos los consumos necesarios para ejecutar una unidad de tarea.
 */
export interface EngineeringSpecs {
  resources: ResourceYield[]; // Materiales y Equipos
  labor: LaborYield[]; // Mano de Obra
}

/**
 * Tarea (Item de Obra / APU).
 * La unidad fundamental de presupuesto y planificación.
 */
export interface Task {
  id: string;
  code: string; // Código de identificación (e.g., "MAM-015")
  name: string;
  category: string; // Rubro (e.g., "Mampostería")
  unit: string; // Unidad de medida de la tarea (e.g., "m2")
  
  engineering: {
    standard: EngineeringSpecs; // Rendimientos Teóricos (Chandías)
    real: EngineeringSpecs; // Rendimientos Reales (Ajuste de Obra)
  };

  // Metadatos para planificación
  fixedCost?: number; // Costos fijos no desglosados (e.g., subcontrato global)
}

/**
 * Proyecto (Obra).
 * Contenedor de la gestión.
 */
export interface ProjectConfig {
  workdayHours: number; // e.g., 9 horas
  currency: string; // "ARS", "USD"
  indirectCostPercentage: number; // Gastos generales
}

export interface Project {
  id: string;
  name: string;
  location: string;
  startDate: string;
  config: ProjectConfig;
  taskIds: string[]; // Lista de IDs de tareas activas en este proyecto
}