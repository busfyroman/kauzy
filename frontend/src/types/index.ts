export interface Politician {
  id: string;
  name: string;
  titles: string;
  photo: string | null;
  birthDate: string;
  position: string;
  institution: "vlada" | "nrsr";
  party: string;
  club?: string;
  region?: string;
  email?: string;
  education: string[];
  career: string[];
  companies: string[];
  spouse: Spouse | null;
  spouseCompanies: SpouseCompany[];
  kauzy: string[];
  procurement: string[];
  detailUrl?: string;
}

export interface Spouse {
  name: string;
  wikidataId: string;
  source: string;
  dob?: string;
  pob?: string;
}

export interface SpouseCompany {
  ico: string;
  companyName: string;
  confidence: "high" | "medium" | "low";
  signals: string[];
}

export interface Company {
  ico: string;
  name: string;
  linkedPoliticians: LinkedPolitician[];
  linkedSpouses: LinkedSpouse[];
  source: string;
  role: string;
  inactive?: boolean;
}

export interface LinkedPolitician {
  politicianId: string;
  politicianName: string;
  confidence: string;
  signals: string[];
}

export interface LinkedSpouse {
  politicianId: string;
  spouseName: string;
  confidence: string;
  signals: string[];
}

export interface Kauza {
  id: string;
  title: string;
  url: string;
  description: string;
  actors: KauzaActor[];
  relatedKauzy?: { title: string; slug: string }[];
}

export interface KauzaActor {
  name: string;
  slug: string;
  url?: string;
  matchedPoliticianId?: string;
}

export interface KauzyData {
  kauzy: Kauza[];
  actors: Actor[];
}

export interface Actor {
  id: string;
  name: string;
  url: string;
  description: string;
  kauzy: { title: string; slug: string }[];
  matchedPoliticianId?: string;
}

export interface ProcurementRecord {
  id: string;
  contractorIco: string;
  contractorName: string;
  buyerName: string;
  buyerIco: string;
  subject: string;
  amount: number;
  date: string;
  cpv: string;
  procedureType: string;
  source: string;
  flagged: boolean;
  linkedPoliticians: {
    id: string;
    name: string;
    relation: "direct" | "spouse";
    confidence?: string;
  }[];
  riskScore?: number;
  riskBreakdown?: Record<string, number>;
  detailUrl?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphNode {
  id: string;
  type: "politician" | "company" | "kauza" | "zakazka";
  label: string;
  institution?: string;
  party?: string;
  photo?: string | null;
  ico?: string;
  amount?: number;
  date?: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: "owner" | "spouse_company" | "involved" | "contractor";
  riskScore: number | null;
  confidence?: string;
}

export interface ChangelogEntry {
  date: string;
  type: string;
  politician: string;
  detail: string;
  severity: "high" | "medium" | "low";
}

export interface SearchEntry {
  id: string;
  type: "politician" | "company" | "kauza" | "zakazka";
  label: string;
  sublabel: string;
  photo?: string | null;
  keywords: string;
}

export interface Metadata {
  run_started: string;
  run_finished: string;
  last_updated: string;
  steps: Record<string, { status: string; duration_seconds: number; result?: unknown; error?: string }>;
  errors: string[];
}
