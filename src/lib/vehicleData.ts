export const MAKES_AND_MODELS: Record<string, string[]> = {
  // ── Mainstream ──────────────────────────────────────────────────────────────
  Toyota: [
    "4Runner", "Camry", "Corolla", "Crown", "GR86", "GR Corolla", "GR Supra",
    "Highlander", "Land Cruiser", "Prius", "Prius Prime", "RAV4", "RAV4 Prime",
    "Sequoia", "Sienna", "Tacoma", "Tundra", "Venza",
  ],
  Honda: [
    "Accord", "Accord Hybrid", "Civic", "Civic Hybrid", "CR-V", "CR-V Hybrid",
    "HR-V", "Odyssey", "Passport", "Pilot", "Prologue", "Ridgeline",
  ],
  Ford: [
    "Bronco", "Bronco Sport", "Edge", "Escape", "Expedition", "Explorer",
    "F-150", "F-150 Lightning", "F-250 Super Duty", "F-350 Super Duty",
    "Maverick", "Mustang", "Mustang Mach-E", "Ranger", "Transit",
  ],
  Chevrolet: [
    "Blazer", "Blazer EV", "Camaro", "Colorado", "Corvette", "Equinox",
    "Equinox EV", "Malibu", "Silverado 1500", "Silverado 2500HD",
    "Silverado EV", "Suburban", "Tahoe", "Trailblazer", "Trax", "Traverse",
  ],
  GMC: [
    "Acadia", "Canyon", "Envoy", "Hummer EV Pickup", "Hummer EV SUV",
    "Sierra 1500", "Sierra 2500HD", "Terrain", "Yukon", "Yukon XL",
  ],
  Nissan: [
    "Altima", "Armada", "Ariya", "Frontier", "Kicks", "Maxima", "Murano",
    "Pathfinder", "Rogue", "Rogue Sport", "Sentra", "Titan", "Versa",
  ],
  Hyundai: [
    "Elantra", "Elantra Hybrid", "IONIQ 5", "IONIQ 6", "IONIQ 9",
    "Kona", "Kona Electric", "Palisade", "Santa Cruz", "Santa Fe",
    "Santa Fe Hybrid", "Sonata", "Sonata Hybrid", "Tucson", "Tucson Hybrid", "Venue",
  ],
  Kia: [
    "Carnival", "EV6", "EV9", "Forte", "K5", "Niro", "Niro EV",
    "Seltos", "Soul", "Sorento", "Sorento Hybrid", "Sportage",
    "Sportage Hybrid", "Stinger", "Telluride",
  ],
  Subaru: [
    "Ascent", "BRZ", "Crosstrek", "Forester", "Impreza", "Legacy",
    "Outback", "Solterra", "WRX",
  ],
  Mazda: [
    "CX-30", "CX-5", "CX-50", "CX-70", "CX-90", "Mazda3",
    "Mazda3 Sedan", "MX-5 Miata", "MX-30",
  ],
  Volkswagen: [
    "Atlas", "Golf GTI", "Golf R", "ID.4", "ID.Buzz", "Jetta",
    "Jetta GLI", "Taos", "Tiguan",
  ],
  Jeep: [
    "Cherokee", "Compass", "Gladiator", "Grand Cherokee",
    "Grand Cherokee 4xe", "Recon", "Renegade", "Wagoneer",
    "Grand Wagoneer", "Wrangler", "Wrangler 4xe",
  ],
  RAM: [
    "1500", "1500 Classic", "2500", "3500", "ProMaster",
    "ProMaster City", "Rampage",
  ],
  Dodge: ["Charger", "Challenger", "Durango", "Hornet"],
  Chrysler: ["Pacifica", "Pacifica Hybrid", "Voyager"],
  Buick: ["Enclave", "Encore GX", "Envision", "Envista"],
  Mitsubishi: ["Eclipse Cross", "Mirage", "Outlander", "Outlander PHEV", "Outlander Sport"],
  // ── Luxury ──────────────────────────────────────────────────────────────────
  BMW: [
    "2 Series", "3 Series", "4 Series", "5 Series", "7 Series", "8 Series",
    "i4", "i5", "i7", "iX", "M2", "M3", "M4", "M5", "X1", "X2", "X3",
    "X4", "X5", "X6", "X7", "XM", "Z4",
  ],
  "Mercedes-Benz": [
    "A-Class", "C-Class", "CLA", "E-Class", "EQB", "EQE", "EQE SUV",
    "EQS", "EQS SUV", "GLA", "GLB", "GLC", "GLE", "GLS", "G-Class",
    "S-Class", "SL",
  ],
  Audi: [
    "A3", "A4", "A5", "A6", "A7", "A8", "e-tron GT", "Q3", "Q4 e-tron",
    "Q5", "Q5 e-tron", "Q7", "Q8", "Q8 e-tron", "R8", "RS3", "RS5",
    "RS7", "S3", "S4", "S5", "TT",
  ],
  Lexus: [
    "ES", "GS", "GX", "IS", "LC", "LS", "LX", "NX", "RC", "RX",
    "RX 450h+", "RZ", "TX", "UX",
  ],
  Cadillac: [
    "CT4", "CT4-V", "CT4-V Blackwing", "CT5", "CT5-V", "CT5-V Blackwing",
    "Escalade", "Escalade ESV", "Lyriq", "Optiq", "XT4", "XT5", "XT6",
  ],
  Acura: [
    "Integra", "MDX", "MDX Type S", "RDX", "RDX Type S", "TLX", "TLX Type S",
    "ZDX",
  ],
  Infiniti: ["Q50", "Q60", "QX50", "QX55", "QX60", "QX80"],
  Volvo: [
    "C40 Recharge", "EX30", "EX40", "EX90", "S60", "S90",
    "V60 Cross Country", "XC40", "XC40 Recharge", "XC60", "XC90",
  ],
  Genesis: ["G70", "G80", "G90", "GV60", "GV70", "GV80", "GV90"],
  Lincoln: ["Aviator", "Corsair", "Nautilus", "Navigator", "Navigator L"],
  Porsche: [
    "718 Boxster", "718 Cayman", "911", "Cayenne", "Cayenne Coupe",
    "Macan", "Macan Electric", "Panamera", "Taycan", "Taycan Cross Turismo",
  ],
  "Land Rover": [
    "Defender", "Discovery", "Discovery Sport", "Range Rover",
    "Range Rover Evoque", "Range Rover Sport", "Range Rover Velar",
  ],
  Jaguar: ["E-Pace", "F-Pace", "F-Type", "I-Pace", "XE", "XF"],
  "Alfa Romeo": ["Giulia", "Stelvio", "Tonale"],
  Maserati: ["Ghibli", "Granturismo", "Grecale", "Levante", "Quattroporte"],
  // ── EV / Specialty ──────────────────────────────────────────────────────────
  Tesla: ["Cybertruck", "Model 3", "Model S", "Model X", "Model Y"],
  Rivian: ["R1S", "R1T", "R2"],
  Lucid: ["Air", "Gravity"],
  Polestar: ["Polestar 2", "Polestar 3", "Polestar 4"],
  Fisker: ["Ocean"],
  // ── Other ───────────────────────────────────────────────────────────────────
  Other: ["Other"],
};

export const MAKE_LIST = [...Object.keys(MAKES_AND_MODELS)];

export function getModels(make: string): string[] {
  if (!make || make === "Other") return ["Other"];
  return [...(MAKES_AND_MODELS[make] ?? []), "Other"];
}
