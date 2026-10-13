/**
 * Make → model naming reference for the public "Get a free valuation" form.
 *
 * These are factual manufacturer and model names for vehicles sold in the
 * Indian market, used only to power searchable, dependent selectors. This file
 * asserts no variant, engine, price, specification or availability — those are
 * collected from the seller and verified by the team. It is not inventory, and
 * nothing here should be read as a verified listing.
 *
 * Keep names spelled as the manufacturer publishes them, and keep the list
 * conservative: it is better to let a seller free-type a model than to invent
 * one that does not exist.
 */
export interface VehicleMake {
  make: string;
  models: string[];
}

export const VEHICLE_CATALOG: VehicleMake[] = [
  {
    make: "Maruti Suzuki",
    models: [
      "Alto K10",
      "S-Presso",
      "Wagon R",
      "Celerio",
      "Swift",
      "Dzire",
      "Baleno",
      "Fronx",
      "Brezza",
      "Ertiga",
      "XL6",
      "Grand Vitara",
      "Jimny",
      "Invicto",
      "Ciaz",
      "Eeco",
    ],
  },
  {
    make: "Hyundai",
    models: [
      "Grand i10 Nios",
      "Exter",
      "i20",
      "Aura",
      "Venue",
      "Creta",
      "Alcazar",
      "Verna",
      "Tucson",
      "Ioniq 5",
    ],
  },
  {
    make: "Tata Motors",
    models: [
      "Tiago",
      "Tigor",
      "Altroz",
      "Punch",
      "Nexon",
      "Curvv",
      "Harrier",
      "Safari",
      "Tiago EV",
      "Punch EV",
      "Nexon EV",
      "Curvv EV",
    ],
  },
  {
    make: "Mahindra",
    models: [
      "Bolero",
      "Bolero Neo",
      "XUV 3XO",
      "XUV300",
      "Thar",
      "Thar Roxx",
      "Scorpio",
      "Scorpio N",
      "XUV700",
      "XUV400",
    ],
  },
  {
    make: "Kia",
    models: ["Sonet", "Syros", "Seltos", "Carens", "Carnival", "EV6"],
  },
  {
    make: "Toyota",
    models: [
      "Glanza",
      "Taisor",
      "Rumion",
      "Urban Cruiser Hyryder",
      "Innova Crysta",
      "Innova Hycross",
      "Fortuner",
      "Hilux",
      "Camry",
      "Vellfire",
    ],
  },
  { make: "Honda", models: ["Amaze", "City", "City e:HEV", "Elevate"] },
  { make: "Volkswagen", models: ["Virtus", "Taigun", "Tiguan"] },
  { make: "Skoda", models: ["Slavia", "Kushaq", "Kodiaq", "Superb"] },
  { make: "Renault", models: ["Kwid", "Triber", "Kiger"] },
  { make: "Nissan", models: ["Magnite", "X-Trail"] },
  {
    make: "MG",
    models: ["Astor", "Hector", "Hector Plus", "Gloster", "ZS EV", "Comet EV", "Windsor EV"],
  },
  { make: "Jeep", models: ["Compass", "Meridian", "Wrangler"] },
  { make: "Force Motors", models: ["Gurkha"] },
  { make: "Isuzu", models: ["D-Max V-Cross", "MU-X"] },
  { make: "BYD", models: ["Atto 3", "Seal", "e6"] },
  {
    make: "BMW",
    models: ["2 Series", "3 Series", "5 Series", "7 Series", "X1", "X3", "X5", "X7", "i4", "iX"],
  },
  {
    make: "Mercedes-Benz",
    models: ["A-Class", "C-Class", "E-Class", "S-Class", "GLA", "GLC", "GLE", "EQS", "EQE"],
  },
  { make: "Audi", models: ["A4", "A6", "Q3", "Q5", "Q7", "Q8", "e-tron"] },
  { make: "Jaguar", models: ["XE", "XF", "F-Pace", "F-Type", "I-Pace"] },
  { make: "Volvo", models: ["XC40", "XC60", "XC90", "S60", "S90", "C40"] },
  {
    make: "Land Rover",
    models: ["Range Rover", "Range Rover Sport", "Velar", "Evoque", "Defender", "Discovery"],
  },
  { make: "Lexus", models: ["ES", "NX", "RX", "LX"] },
  { make: "Porsche", models: ["Macan", "Cayenne", "Panamera", "911", "Taycan"] },
  { make: "Tesla", models: ["Model 3", "Model Y"] },
];

/** All manufacturer names, sorted for stable rendering. */
export const VEHICLE_MAKES: string[] = VEHICLE_CATALOG.map((entry) => entry.make);

/** Models for a given make (empty when the make is unknown/free-typed). */
export function modelsForMake(make: string): string[] {
  const entry = VEHICLE_CATALOG.find(
    (candidate) => candidate.make.toLowerCase() === make.trim().toLowerCase(),
  );
  return entry ? entry.models : [];
}

/** Can the seller ask for these make/model pairs? */
export const FUEL_TYPES = ["Petrol", "Diesel", "CNG", "Electric", "Hybrid", "LPG"] as const;
export const TRANSMISSION_TYPES = ["Manual", "Automatic", "AMT", "CVT", "DCT", "iMT"] as const;
export const OWNERSHIP_OPTIONS = [
  "First owner",
  "Second owner",
  "Third owner",
  "Fourth owner or more",
] as const;
export const CONDITION_OPTIONS = [
  "Excellent — showroom condition",
  "Good — minor wear",
  "Fair — visible wear",
  "Needs repair",
] as const;
