import { useMemo, useCallback, useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Search, User, Building2, AlertTriangle, FileText } from "lucide-react";
import { useData } from "@/hooks/useData";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import type { GraphData } from "@/types";

const typeColors: Record<string, string> = {
  politician: "#3b82f6",
  company: "#10b981",
  kauza: "#ef4444",
  zakazka: "#8b5cf6",
};

const typeIcons: Record<string, string> = {
  politician: "👤",
  company: "🏢",
  kauza: "⚠️",
  zakazka: "📄",
};

const riskEdgeColor = (score: number | null): string => {
  if (score == null) return "#4a5568";
  if (score <= 30) return "#22c55e";
  if (score <= 60) return "#eab308";
  return "#ef4444";
};

interface PoliticianOption {
  id: string;
  label: string;
  connectionCount: number;
}

export const GrafPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: graphData, loading } = useData<GraphData>("graph.json");

  const selectedId = searchParams.get("focus") || "";
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [showTypes, setShowTypes] = useState({
    company: true,
    kauza: true,
    zakazka: true,
  });

  const politicianOptions = useMemo<PoliticianOption[]>(() => {
    if (!graphData) return [];
    const edgeCount: Record<string, number> = {};
    for (const e of graphData.edges) {
      edgeCount[e.source] = (edgeCount[e.source] || 0) + 1;
      edgeCount[e.target] = (edgeCount[e.target] || 0) + 1;
    }
    return graphData.nodes
      .filter((n) => n.type === "politician" && (edgeCount[n.id] || 0) > 0)
      .map((n) => ({
        id: n.id,
        label: n.label,
        connectionCount: edgeCount[n.id] || 0,
      }))
      .sort((a, b) => b.connectionCount - a.connectionCount);
  }, [graphData]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return politicianOptions.slice(0, 20);
    const q = searchQuery.toLowerCase();
    return politicianOptions
      .filter((o) => o.label.toLowerCase().includes(q))
      .slice(0, 20);
  }, [politicianOptions, searchQuery]);

  const { egoNodes, egoEdges } = useMemo(() => {
    if (!graphData || !selectedId)
      return { egoNodes: [] as Node[], egoEdges: [] as Edge[] };

    const nodeMap = new Map(graphData.nodes.map((n) => [n.id, n]));
    const neighborIds = new Set<string>();
    neighborIds.add(selectedId);
    const edgeSet = new Set<string>();
    const relevantEdges: typeof graphData.edges = [];

    const addEdge = (e: typeof graphData.edges[0]) => {
      const key = `${e.source}|${e.target}|${e.type}`;
      if (edgeSet.has(key)) return;
      edgeSet.add(key);
      relevantEdges.push(e);
    };

    for (const e of graphData.edges) {
      if (e.source === selectedId || e.target === selectedId) {
        const otherId = e.source === selectedId ? e.target : e.source;
        const otherNode = nodeMap.get(otherId);
        if (otherNode && showTypes[otherNode.type as keyof typeof showTypes] !== false) {
          neighborIds.add(otherId);
          addEdge(e);
        }
      }
    }

    if (showTypes.zakazka) {
      const companyNeighbors = [...neighborIds].filter((id) => id.startsWith("c-"));
      for (const e of graphData.edges) {
        if (e.type !== "contractor") continue;
        const companyId = e.source.startsWith("c-") ? e.source : e.target;
        const zakazkaId = e.source.startsWith("z-") ? e.source : e.target;
        if (companyNeighbors.includes(companyId) && zakazkaId.startsWith("z-")) {
          neighborIds.add(zakazkaId);
          addEdge(e);
        }
      }
    }

    for (const e of graphData.edges) {
      if (
        e.source !== selectedId &&
        e.target !== selectedId &&
        neighborIds.has(e.source) &&
        neighborIds.has(e.target)
      ) {
        addEdge(e);
      }
    }

    const nodeArray = graphData.nodes.filter((n) => neighborIds.has(n.id));

    const grouped: Record<string, typeof nodeArray> = {};
    for (const n of nodeArray) {
      const t = n.type;
      if (!grouped[t]) grouped[t] = [];
      grouped[t].push(n);
    }

    const centerX = 500;
    const centerY = 400;

    const innerTypes = ["company", "kauza"];
    const sectorAngle = (2 * Math.PI) / Math.max(innerTypes.length, 1);

    const nodes: Node[] = [];
    nodes.push({
      id: selectedId,
      position: { x: centerX, y: centerY },
      data: {
        label: nodeMap.get(selectedId)?.label || "",
      },
      style: {
        background: typeColors.politician,
        color: "#fff",
        border: "3px solid #93c5fd",
        borderRadius: "50%",
        padding: "14px 18px",
        fontSize: "13px",
        fontWeight: 700,
        zIndex: 10,
      },
    });

    const companyPositions = new Map<string, { x: number; y: number }>();

    innerTypes.forEach((type, ti) => {
      const items = grouped[type] || [];
      const baseAngle = sectorAngle * ti - Math.PI / 2;
      const count = items.length;
      const radius = 250;
      const spread = Math.min(sectorAngle * 0.8, count * 0.15);

      items.forEach((n, i) => {
        const angle =
          count === 1
            ? baseAngle
            : baseAngle - spread / 2 + (spread / (count - 1)) * i;
        const r = radius + (i % 3) * 40;
        const x = centerX + r * Math.cos(angle);
        const y = centerY + r * Math.sin(angle);

        if (type === "company") companyPositions.set(n.id, { x, y });

        nodes.push({
          id: n.id,
          position: { x, y },
          data: {
            label: `${typeIcons[type] || ""} ${n.label.slice(0, 40)}${n.label.length > 40 ? "…" : ""}`,
          },
          style: {
            background: typeColors[type] || "#4a5568",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            padding: "6px 10px",
            fontSize: "10px",
            fontWeight: 500,
            maxWidth: "160px",
            textAlign: "center" as const,
            cursor: "pointer",
          },
        });
      });
    });

    const zakazkyByCompany = new Map<string, typeof nodeArray>();
    for (const e of relevantEdges) {
      if (e.type !== "contractor") continue;
      const cId = e.source.startsWith("c-") ? e.source : e.target;
      const zId = e.source.startsWith("z-") ? e.source : e.target;
      const zNode = nodeMap.get(zId);
      if (!zNode || !companyPositions.has(cId)) continue;
      if (!zakazkyByCompany.has(cId)) zakazkyByCompany.set(cId, []);
      zakazkyByCompany.get(cId)!.push(zNode);
    }

    for (const [companyId, zakazky] of zakazkyByCompany) {
      const parent = companyPositions.get(companyId)!;
      const dx = parent.x - centerX;
      const dy = parent.y - centerY;
      const parentAngle = Math.atan2(dy, dx);
      const count = zakazky.length;
      const fanSpread = Math.min(Math.PI * 0.4, count * 0.2);

      zakazky.forEach((n, i) => {
        const angle =
          count === 1
            ? parentAngle
            : parentAngle - fanSpread / 2 + (fanSpread / (count - 1)) * i;
        const r = 120 + (i % 3) * 30;
        nodes.push({
          id: n.id,
          position: {
            x: parent.x + r * Math.cos(angle),
            y: parent.y + r * Math.sin(angle),
          },
          data: {
            label: `${typeIcons.zakazka} ${n.label.slice(0, 35)}${n.label.length > 35 ? "…" : ""}`,
          },
          style: {
            background: typeColors.zakazka,
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            padding: "4px 8px",
            fontSize: "9px",
            fontWeight: 500,
            maxWidth: "140px",
            textAlign: "center" as const,
            cursor: "pointer",
          },
        });
      });
    }

    const edges: Edge[] = relevantEdges.map((e, i) => ({
      id: `e-${i}`,
      source: e.source,
      target: e.target,
      style: {
        stroke: riskEdgeColor(e.riskScore),
        strokeWidth: e.riskScore ? Math.max(1, e.riskScore / 30) : 1.5,
        strokeDasharray: e.type === "spouse_company" ? "5,5" : undefined,
      },
      animated: (e.riskScore ?? 0) > 60,
      label: e.riskScore ? `${Math.round(e.riskScore)}` : undefined,
      labelStyle: { fontSize: 9, fill: "#94a3b8" },
    }));

    return { egoNodes: nodes, egoEdges: edges };
  }, [graphData, selectedId, showTypes]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    setNodes(egoNodes);
    setEdges(egoEdges);
  }, [egoNodes, egoEdges, setNodes, setEdges]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const id = node.id;
      if (id.startsWith("p-")) {
        navigate(`/politik/${id.replace("p-", "")}`);
      }
    },
    [navigate],
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as HTMLElement)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectPolitician = (id: string) => {
    setSearchParams({ focus: id });
    setShowDropdown(false);
    setSearchQuery("");
  };

  if (loading) return <LoadingSkeleton count={1} />;

  const selectedLabel =
    graphData?.nodes.find((n) => n.id === selectedId)?.label || "";

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">{t("graf.title")}</h1>

        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ["company", Building2, t("graf.companies")],
              ["kauza", AlertTriangle, t("graf.scandals")],
              ["zakazka", FileText, t("graf.contracts")],
            ] as const
          ).map(([type, Icon, label]) => (
            <button
              key={type}
              onClick={() =>
                setShowTypes((prev) => ({ ...prev, [type]: !prev[type] }))
              }
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                showTypes[type]
                  ? "text-white"
                  : "bg-white/5 text-text-secondary"
              }`}
              style={{
                backgroundColor: showTypes[type]
                  ? typeColors[type]
                  : undefined,
              }}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative" ref={dropdownRef}>
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
        />
        <input
          value={showDropdown ? searchQuery : selectedLabel || searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => {
            setSearchQuery("");
            setShowDropdown(true);
          }}
          placeholder={t("graf.selectPolitician") || "Vybrať politika..."}
          className="w-full rounded-lg border border-border-custom bg-card py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary .light:border-border-light .light:bg-card-light"
        />
        {showDropdown && (
          <div className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-border-custom bg-card shadow-xl .light:border-border-light .light:bg-card-light">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-text-secondary">
                {t("search.noResults")}
              </div>
            ) : (
              filteredOptions.map((o) => (
                <button
                  key={o.id}
                  onClick={() => selectPolitician(o.id)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/10 transition-colors"
                >
                  <User size={14} className="text-politician shrink-0" />
                  <span className="font-medium">{o.label}</span>
                  <span className="ml-auto text-xs text-text-secondary">
                    {o.connectionCount} {t("graf.connections") || "prepojení"}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {!selectedId ? (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-border-custom bg-card/50 .light:border-border-light">
          <div className="text-center">
            <User size={48} className="mx-auto mb-4 text-text-secondary/50" />
            <p className="text-lg font-medium text-text-secondary">
              {t("graf.selectPrompt") || "Vyberte politika pre zobrazenie prepojení"}
            </p>
            <p className="mt-2 text-sm text-text-secondary/70">
              {politicianOptions.length}{" "}
              {t("graf.politiciansWithConnections") ||
                "politikov s prepojeniami"}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden rounded-xl border border-border-custom .light:border-border-light">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            minZoom={0.3}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
          >
            <Background />
            <Controls />
          </ReactFlow>
          <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-1 rounded-lg bg-card/90 p-3 text-xs backdrop-blur .light:bg-card-light/90">
            <span className="mb-1 font-semibold">{t("graf.legend") || "Legenda"}</span>
            {[
              ["politician", t("graf.politicians")],
              ["company", t("graf.companies")],
              ["kauza", t("graf.scandals")],
              ["zakazka", t("graf.contracts")],
            ].map(([type, label]) => (
              <span key={type} className="flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 rounded-sm"
                  style={{ background: typeColors[type] }}
                />
                {label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
