
import { Resource, LaborProfile, Task } from '../types';

// --- SEED: RESOURCES (Materiales) ---
export const INITIAL_RESOURCES: Resource[] = [
  {
    id: 'RES-LAD-COM',
    name: 'Ladrillo Común',
    unit: 'un',
    type: 'MATERIAL',
    basePrice: 50.00,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'RES-CAL-HID',
    name: 'Cal Hidráulica',
    unit: 'kg',
    type: 'MATERIAL',
    basePrice: 120.00, // Precio por kg (aprox)
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'RES-CEM-POR',
    name: 'Cemento Portland',
    unit: 'kg',
    type: 'MATERIAL',
    basePrice: 180.00,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'RES-ARE-RUL',
    name: 'Arena',
    unit: 'm3',
    type: 'MATERIAL',
    basePrice: 15000.00,
    updatedAt: new Date().toISOString(),
  }
];

// --- SEED: LABOR (Mano de Obra) ---
export const INITIAL_LABOR_PROFILES: LaborProfile[] = [
  {
    id: 'LAB-OFICIAL',
    role: 'Oficial Albañil',
    hourlyCost: 4500.00,
  },
  {
    id: 'LAB-AYUDANTE',
    role: 'Ayudante',
    hourlyCost: 3200.00,
  }
];

// --- SEED: TASKS (Análisis de Precios Unitarios) ---
// Ejemplo: Mampostería de ladrillo común en elevación, espesor 0.15m (15cm)
// Fuente: Cómputo y Presupuesto (Chandías)
export const INITIAL_TASKS: Task[] = [
  {
    id: 'TSK-MAM-015',
    code: 'M06-01',
    name: 'Mampostería Ladrillo Común e=0.15m',
    category: 'Mampostería',
    unit: 'm2',
    engineering: {
      standard: {
        // RENDIMIENTOS TEÓRICOS (CHANDÍAS)
        labor: [
          {
            laborProfileId: 'LAB-OFICIAL',
            hoursPerUnit: 0.80, // 0.80 h/m2 según tabla estándar
            crewCount: 1
          },
          {
            laborProfileId: 'LAB-AYUDANTE',
            hoursPerUnit: 0.80, // El ayudante acompaña al oficial
            crewCount: 1
          }
        ],
        resources: [
          {
            resourceId: 'RES-LAD-COM',
            quantity: 60, // 60 ladrillos por m2 (aprox)
            wastePercentage: 5 // Desperdicio estándar por roturas
          },
          // Mezcla (aprox 0.030 m3 por m2 de muro de 15)
          // Desglose de mezcla 1:3:1/8 (Cemento:Arena:Cal no, suele ser Cal:Arena:Cemento)
          // Usaremos un consumo directo de materiales para la mezcla por m2
          {
            resourceId: 'RES-CAL-HID',
            quantity: 4.5, // kg
            wastePercentage: 10
          },
          {
            resourceId: 'RES-CEM-POR',
            quantity: 1.8, // kg
            wastePercentage: 10
          },
          {
            resourceId: 'RES-ARE-RUL',
            quantity: 0.03, // m3
            wastePercentage: 10
          }
        ]
      },
      real: {
        // RENDIMIENTOS REALES (Ejemplo de ajuste en obra)
        // Quizás la cuadrilla es más lenta o hay más rotura de ladrillos
        labor: [
          {
            laborProfileId: 'LAB-OFICIAL',
            hoursPerUnit: 0.95, // Más lento que el manual
            crewCount: 1
          },
          {
            laborProfileId: 'LAB-AYUDANTE',
            hoursPerUnit: 0.95,
            crewCount: 1
          }
        ],
        resources: [
          {
            resourceId: 'RES-LAD-COM',
            quantity: 60,
            wastePercentage: 8 // Mayor desperdicio real
          },
          {
            resourceId: 'RES-CAL-HID',
            quantity: 5.0,
            wastePercentage: 5
          },
          {
            resourceId: 'RES-CEM-POR',
            quantity: 2.0,
            wastePercentage: 5
          },
          {
            resourceId: 'RES-ARE-RUL',
            quantity: 0.035,
            wastePercentage: 5
          }
        ]
      }
    }
  }
];
