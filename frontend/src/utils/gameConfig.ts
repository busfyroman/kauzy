export interface MinisterDef {
  id: string;
  abilityName: string;
  abilitySk: string;
  baseCost: number;
  baseIncome: number;
  costMultiplier: number;
  citizenQuote: string;
  effect?: "investigation_slow" | "global_multiplier" | "click_boost" | "event_delay";
  effectValue?: number;
}

export const MINISTER_DEFS: MinisterDef[] = [
  {
    id: "robert-fico",
    abilityName: "Nic sa nestalo",
    abilitySk: "2x globálny multiplikátor",
    baseCost: 5000,
    baseIncome: 100,
    costMultiplier: 2.5,
    citizenQuote: "Pán premiér povedal, že sa nič nestalo. Tak asi OK.",
    effect: "global_multiplier",
    effectValue: 2,
  },
  {
    id: "robert-kalinak",
    abilityName: "Obrana rozpočtu",
    abilitySk: "Automaticky kradne z rozpočtu obrany",
    baseCost: 3000,
    baseIncome: 80,
    costMultiplier: 2.2,
    citizenQuote: "Vojaci trénujú s drevenými puškami, ale hlavné je že minister má nové auto.",
  },
  {
    id: "ladislav-kamenicky",
    abilityName: "Kreatívne účtovníctvo",
    abilitySk: "3x pasívny príjem",
    baseCost: 8000,
    baseIncome: 200,
    costMultiplier: 2.8,
    citizenQuote: "Učiteľka zarábala 700€. Teraz 650€. Ďakujeme, pán minister.",
  },
  {
    id: "boris-susko",
    abilityName: "Reforma justície",
    abilitySk: "Spomalí vyšetrovanie o 50%",
    baseCost: 6000,
    baseIncome: 50,
    costMultiplier: 2.5,
    citizenQuote: "Spravodlivosť je slepá. A teraz aj hluchá a nemá.",
    effect: "investigation_slow",
    effectValue: 0.5,
  },
  {
    id: "tomas-taraba",
    abilityName: "Predaj lesy",
    abilitySk: "Jednorazový masívny výnos",
    baseCost: 4000,
    baseIncome: 120,
    costMultiplier: 2.3,
    citizenQuote: "Už nemáme kde chodiť na huby. Ale hlavne že niekto zarába.",
  },
  {
    id: "denisa-sakova",
    abilityName: "Hospodársky zázrak",
    abilitySk: "Kradne z hospodárskeho rozvoja",
    baseCost: 3500,
    baseIncome: 90,
    costMultiplier: 2.2,
    citizenQuote: "Hospodársky rast? Asi mysleli rast účtov v zahraničí.",
  },
  {
    id: "tomas-drucker",
    abilityName: "Plán obnovy",
    abilitySk: "Plán obnovy peňaženky",
    baseCost: 4500,
    baseIncome: 100,
    costMultiplier: 2.4,
    citizenQuote: "Plán obnovy sa obnovuje... hlavne na účtoch politikov.",
  },
  {
    id: "jozef-raz",
    abilityName: "Diaľnica nikam",
    abilitySk: "Kradne z dopravného rozpočtu",
    baseCost: 5000,
    baseIncome: 130,
    costMultiplier: 2.3,
    citizenQuote: "Na diaľnicu z BA do KE pôjdeme v roku 2187.",
  },
  {
    id: "richard-takac",
    abilityName: "Agrodotácie",
    abilitySk: "Dotácie pre kamarátov",
    baseCost: 2500,
    baseIncome: 60,
    costMultiplier: 2.0,
    citizenQuote: "Krava dostáva viac dotácií ako slovenský učiteľ.",
  },
  {
    id: "matus-sutaj-estok",
    abilityName: "Odpočúvanie novinárov",
    abilitySk: "Oddiaľuje odhalenia novinárov",
    baseCost: 7000,
    baseIncome: 40,
    costMultiplier: 2.6,
    citizenQuote: "Sloboda tlače je zaručená. Ak nepíšete o vláde.",
    effect: "event_delay",
    effectValue: 1.5,
  },
  {
    id: "erik-tomas",
    abilityName: "Minimálna mzda je luxus",
    abilitySk: "Zrýchľuje utrpenie občanov",
    baseCost: 2000,
    baseIncome: 70,
    costMultiplier: 2.1,
    citizenQuote: "Minister práce povedal, že práca šľachtí. Zabudol dodať koho.",
  },
  {
    id: "martina-simkovicova",
    abilityName: "Zruš všetky fondy",
    abilitySk: "Pasívne kradne z kultúry",
    baseCost: 1500,
    baseIncome: 50,
    costMultiplier: 1.9,
    citizenQuote: "Divadlo zatvorili. Ale vláda nám predvádza komédie zadarmo.",
  },
  {
    id: "kamil-sasko",
    abilityName: "Predražené zákazky",
    abilitySk: "3x hodnota štátnych zákaziek",
    baseCost: 6000,
    baseIncome: 150,
    costMultiplier: 2.5,
    citizenQuote: "Doktor mi povedal, že na operáciu si mám počkať 3 roky. Alebo zaplatiť.",
  },
  {
    id: "juraj-blanar",
    abilityName: "Zahraničná diplomacia",
    abilitySk: "Služobné cesty za milióny",
    baseCost: 3000,
    baseIncome: 80,
    costMultiplier: 2.2,
    citizenQuote: "Minister letí na Maldivy. Že vraj diplomatická misia.",
  },
  {
    id: "rudolf-huliak",
    abilityName: "Turistický raj",
    abilitySk: "Kradne z cestovného ruchu",
    baseCost: 2000,
    baseIncome: 55,
    costMultiplier: 2.0,
    citizenQuote: "Na Slovensku je krásne. Hlavne keď tu nebývate.",
  },
  {
    id: "zuzana-dolinkova",
    abilityName: "Zdravotná reforma",
    abilitySk: "Reforma = predražené CT",
    baseCost: 4000,
    baseIncome: 100,
    costMultiplier: 2.3,
    citizenQuote: "Čakáreň plná ľudí. Aspoň sa zoznámite.",
  },
];

export const CITIZEN_QUOTES = [
  "Ďakujeme pánovi premiérovi za nové Porsche. My si kúpime chlieb.",
  "Na diaľnicu z Bratislavy do Košíc pôjdeme až v roku 2187.",
  "Doktor mi povedal, že na operáciu si mám počkať 3 roky. Alebo zaplatiť.",
  "Učiteľka zarábala 700€. Teraz zarábia 650€. Ďakujeme, Kamenický.",
  "Syn chcel ísť na univerzitu. Teraz ide do Írska.",
  "Dôchodca dostal prídavok 1,50€. Minister dostal prídavok 15 000€.",
  "Kolaps nemocnice v Martine. Minister zdravotníctva na dovolenke.",
  "Cena elektriny stúpla. Vraj investícia do budúcnosti. Čia budúcnosť?",
  "Dedko predáva zeleninu pri ceste. Minister kupuje vilu pri mori.",
  "Školy nemajú učebnice. Vláda má nové autá.",
  "Obec nemá kanalizáciu. Starosta má bazén. Logika.",
  "Most sa zrútil. Ale asfalt pod ním bol čerstvo urobený. Za dvojnásobnú cenu.",
  "Autobus mešká 45 minút. Minister mešká do práce. Ale ten má šoféra.",
  "Sestričky štrajkujú za 800€. Poradca ministra zarába 5000€.",
  "Potraviny zdraželi o 30%. Platy o 2%. Asi sme zlí v matike.",
  "Dieťa sa pýta: Mami, prečo nemáme na lyžovačku? Lebo vláda má 3.",
  "Dôchodkyňa platí za lieky 80€ mesačne. Minister nemá doplatok žiadny.",
  "Obec dostala dotáciu 500€. Firma kamaráta ministra 5 miliónov.",
  "Mladý pár si nemôže dovoliť byt. Minister si dovolí tretí.",
  "Opravili cestu. Za 3 mesiace je zasa rozbitá. Ale firme zaplatili dvakrát.",
  "Práca šľachtí. Hlavne tých, čo rozhodujú o zákazkách.",
  "Splnili sme európske kritériá. Na korupciu.",
  "Slovensko - krajina plná potenciálu. Väčšinu ho ukradli.",
  "Vraj konsolidácia. Konsolidujú si účty v zahraničí.",
];

export const PRESTIGE_TITLES = [
  { level: 0, title: "Obecný zlodejíček", minEarned: 0 },
  { level: 1, title: "Okresný podvodník", minEarned: 100_000 },
  { level: 2, title: "Krajský barón", minEarned: 1_000_000 },
  { level: 3, title: "Národný oligarcha", minEarned: 10_000_000 },
  { level: 4, title: "Európsky mafiáno", minEarned: 100_000_000 },
  { level: 5, title: "Globálny kleptomat", minEarned: 1_000_000_000 },
];

export interface GameEventDef {
  id: string;
  titleSk: string;
  descriptionSk: string;
  type: "protest" | "audit" | "journalist" | "contract";
  choices: {
    labelSk: string;
    costPercent?: number;
    investigationDelta?: number;
    moneyBonus?: number;
  }[];
}

export const GAME_EVENTS: GameEventDef[] = [
  {
    id: "protest",
    titleSk: "Protest na námestí!",
    descriptionSk: "Tisíce ľudí vyšli do ulíc. Vaše príjmy sú ohrozené na 30 sekúnd.",
    type: "protest",
    choices: [
      { labelSk: "Poslať políciu (-10% peňazí)", costPercent: 0.1, investigationDelta: 5 },
      { labelSk: "Ignorovať (príjmy -50% na 30s)", investigationDelta: -5 },
    ],
  },
  {
    id: "eu_audit",
    titleSk: "Európska kontrola!",
    descriptionSk: "Brusel posiela audítorov. Rýchlo schovajte fondy!",
    type: "audit",
    choices: [
      { labelSk: "Kreatívne účtovníctvo (-15% peňazí)", costPercent: 0.15 },
      { labelSk: "Obviniť predchodcov (vyšetrovanie +15%)", investigationDelta: 15 },
    ],
  },
  {
    id: "journalist",
    titleSk: "Novinári zistili...",
    descriptionSk: "Investigatívny novinár má dôkazy o vašich machináciah!",
    type: "journalist",
    choices: [
      { labelSk: "Odmietnuť komentovať (vyšetrovanie +20%)", investigationDelta: 20 },
      { labelSk: "Žalovať médiá (-20% peňazí, +5% vyšetrovanie)", costPercent: 0.2, investigationDelta: 5 },
    ],
  },
  {
    id: "contract",
    titleSk: "Štátna zákazka!",
    descriptionSk: "Nová zákazka za milióny! Rýchlo klikajte pre maximálny podiel!",
    type: "contract",
    choices: [
      { labelSk: "Zobrať podiel (+bonus)", moneyBonus: 50000 },
    ],
  },
];

export const INITIAL_CLICK_POWER = 100;
export const COMBO_DECAY_MS = 1500;
export const COMBO_TIERS = [1, 2, 5, 10, 25];
export const INVESTIGATION_FILL_RATE = 0.15;
export const INVESTIGATION_RAZZIA_PENALTY = 0.20;
export const CITIZEN_PER_EUR = 500;
export const BASE_CITIZEN_SALARY = 1200;
export const MIN_CITIZEN_SALARY = 12;
export const PRESTIGE_THRESHOLD = 10_000_000;
export const PRESTIGE_MULTIPLIER_BONUS = 0.5;
export const EVENT_INTERVAL_MS = 45_000;
export const MAX_MINISTER_LEVEL = 5;
export const SAVE_INTERVAL_MS = 30_000;
export const OFFLINE_CAP_SECONDS = 3600;
export const PRESS_CONFERENCE_COST_PERCENT = 0.05;
export const PRESS_CONFERENCE_INVESTIGATION_REDUCE = 40;

export const formatMoney = (amount: number): string => {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(2)} mld €`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)} mil €`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}k €`;
  return `${Math.floor(amount)} €`;
};

export const formatNumber = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return Math.floor(n).toLocaleString("sk-SK");
};

export const getComboTier = (clicks: number): number => {
  if (clicks >= 50) return 4;
  if (clicks >= 25) return 3;
  if (clicks >= 10) return 2;
  if (clicks >= 5) return 1;
  return 0;
};

export const getMinisterCost = (def: MinisterDef, currentLevel: number): number =>
  Math.floor(def.baseCost * Math.pow(def.costMultiplier, currentLevel));

export const getMinisterIncome = (def: MinisterDef, level: number): number =>
  level === 0 ? 0 : Math.floor(def.baseIncome * level * 1.5);

export const getCitizenSalary = (totalStolen: number): number => {
  const drop = totalStolen / 50_000;
  return Math.max(MIN_CITIZEN_SALARY, Math.floor(BASE_CITIZEN_SALARY - drop));
};

export const getCitizensRobbed = (totalStolen: number): number =>
  Math.floor(totalStolen / CITIZEN_PER_EUR);
