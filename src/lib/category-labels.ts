export const GLOBAL_CATEGORY_LABELS: Record<string, string> = {
  cleaning: "Limpieza",
  food: "Comida",
  candy: "Golosinas",
  school: "Escuela",
  hygiene: "Higiene",
  drinks: "Bebidas",
  automotive: "Automotriz",
  personal: "Personal",
  errand: "Encargo",
  work: "Trabajo",
  supermarket: "Supermercado",
  transport: "Transporte",
  health: "Salud",
  leisure: "Ocio",
  housing: "Vivienda",
  salary: "Salario",
  freelance: "Freelance",
  electronics: "Electrónica",
  furniture: "Muebles",
  "card-balance": "Saldo de tarjeta",
  subscriptions: "Suscripciones",
  bills: "Facturas",
  insurance: "Seguros",
  social: "Social",
  family: "Familiar",
  entertainment: "Entretenimiento",
  other: "Otro",
};

export function displayCategoryName(cat: { name: string; type: string }): string {
  if (cat.type === "global") {
    return GLOBAL_CATEGORY_LABELS[cat.name] ?? cat.name;
  }
  return cat.name;
}
