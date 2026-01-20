import { useState, useMemo, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ChevronDown, 
  ChevronRight, 
  Users, 
  User, 
  Award, 
  TrendingUp, 
  Search, 
  ZoomIn, 
  ZoomOut, 
  Maximize2,
  LayoutGrid,
  List,
  CheckCircle2,
  XCircle
} from "lucide-react";

// WFG Rank configuration with colors
const RANK_CONFIG: Record<string, { label: string; icon: string; color: string; bgColor: string; borderColor: string }> = {
  TRAINING_ASSOCIATE: { label: "TA", icon: "🎓", color: "text-gray-700", bgColor: "bg-gray-100", borderColor: "border-gray-300" },
  ASSOCIATE: { label: "A", icon: "📋", color: "text-blue-700", bgColor: "bg-blue-100", borderColor: "border-blue-300" },
  SENIOR_ASSOCIATE: { label: "SA", icon: "📊", color: "text-indigo-700", bgColor: "bg-indigo-100", borderColor: "border-indigo-300" },
  MARKETING_DIRECTOR: { label: "MD", icon: "🎯", color: "text-green-700", bgColor: "bg-green-100", borderColor: "border-green-300" },
  SENIOR_MARKETING_DIRECTOR: { label: "SMD", icon: "⭐", color: "text-emerald-700", bgColor: "bg-emerald-100", borderColor: "border-emerald-400" },
  EXECUTIVE_MARKETING_DIRECTOR: { label: "EMD", icon: "💎", color: "text-purple-700", bgColor: "bg-purple-100", borderColor: "border-purple-400" },
  CEO_MARKETING_DIRECTOR: { label: "CEO", icon: "👑", color: "text-pink-700", bgColor: "bg-pink-100", borderColor: "border-pink-400" },
  EXECUTIVE_VICE_CHAIRMAN: { label: "EVC", icon: "🏆", color: "text-amber-700", bgColor: "bg-amber-100", borderColor: "border-amber-400" },
  SENIOR_EXECUTIVE_VICE_CHAIRMAN: { label: "SEVC", icon: "🌟", color: "text-orange-700", bgColor: "bg-orange-100", borderColor: "border-orange-400" },
  FIELD_CHAIRMAN: { label: "FC", icon: "🔥", color: "text-red-700", bgColor: "bg-red-100", borderColor: "border-red-400" },
  EXECUTIVE_CHAIRMAN: { label: "EC", icon: "👔", color: "text-yellow-800", bgColor: "bg-yellow-100", borderColor: "border-yellow-500" },
};

interface Agent {
  id: number;
  firstName: string;
  lastName: string;
  agentCode?: string | null;
  currentRank?: string;
  uplineAgentId?: number | null;
  totalBaseShopPoints?: string;
  directRecruits?: number;
  isActive?: boolean;
  isLifeLicensed?: boolean;
  email?: string | null;
  phone?: string | null;
}

interface TreeNode extends Agent {
  children: TreeNode[];
  depth: number;
}

interface TeamHierarchyProps {
  agents: Agent[];
  currentUserId?: number;
  onAgentClick?: (agentId: number) => void;
}

function buildTree(agents: Agent[]): { mainTree: TreeNode[], orphans: TreeNode[] } {
  const agentMap = new Map<number, TreeNode>();
  const roots: TreeNode[] = [];

  // Create nodes for all agents
  agents.forEach(agent => {
    agentMap.set(agent.id, { ...agent, children: [], depth: 0 });
  });

  // Build parent-child relationships
  agents.forEach(agent => {
    const node = agentMap.get(agent.id)!;
    if (agent.uplineAgentId && agentMap.has(agent.uplineAgentId)) {
      const parent = agentMap.get(agent.uplineAgentId)!;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  // Sort children by rank (higher ranks first) then by name
  const rankOrder = Object.keys(RANK_CONFIG).reverse();
  const sortChildren = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      const rankA = rankOrder.indexOf(a.currentRank || "TRAINING_ASSOCIATE");
      const rankB = rankOrder.indexOf(b.currentRank || "TRAINING_ASSOCIATE");
      if (rankA !== rankB) return rankA - rankB;
      return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
    });
    nodes.forEach(node => sortChildren(node.children));
  };
  sortChildren(roots);

  // Calculate depths
  function setDepth(node: TreeNode, depth: number) {
    node.depth = depth;
    node.children.forEach(child => setDepth(child, depth + 1));
  }
  roots.forEach(root => setDepth(root, 0));

  // Separate main tree (roots with children) from orphans (roots without children)
  // Sort by total descendants to find the main hierarchy
  function countDescendants(node: TreeNode): number {
    return node.children.reduce((sum, child) => sum + 1 + countDescendants(child), 0);
  }
  
  const rootsWithDescendants = roots.map(root => ({
    root,
    descendants: countDescendants(root)
  })).sort((a, b) => b.descendants - a.descendants);
  
  // Main tree: roots with children (sorted by descendant count)
  const mainTree = rootsWithDescendants
    .filter(r => r.descendants > 0)
    .map(r => r.root);
  
  // Orphans: roots without children
  const orphans = rootsWithDescendants
    .filter(r => r.descendants === 0)
    .map(r => r.root);

  return { mainTree, orphans };
}

// Org Chart Node Component (Horizontal Layout)
function OrgChartNode({ 
  node, 
  expanded, 
  onToggle, 
  onAgentClick,
  isHighlighted,
  isSearchMatch
}: { 
  node: TreeNode; 
  expanded: boolean; 
  onToggle: () => void;
  onAgentClick?: (id: number) => void;
  isHighlighted?: boolean;
  isSearchMatch?: boolean;
}) {
  const rankConfig = RANK_CONFIG[node.currentRank || "TRAINING_ASSOCIATE"] || RANK_CONFIG.TRAINING_ASSOCIATE;
  const hasChildren = node.children.length > 0;
  const points = parseFloat(node.totalBaseShopPoints || "0");

  return (
    <div 
      className={`
        relative p-3 rounded-xl border-2 transition-all cursor-pointer min-w-[180px] max-w-[220px]
        ${isHighlighted ? "ring-2 ring-primary ring-offset-2" : ""}
        ${isSearchMatch ? "ring-2 ring-yellow-400 ring-offset-2" : ""}
        ${rankConfig.bgColor} ${rankConfig.borderColor}
        hover:shadow-lg hover:scale-[1.02]
      `}
      onClick={() => onAgentClick?.(node.id)}
    >
      {/* Rank Badge */}
      <div className="absolute -top-2 -right-2">
        <Badge className={`${rankConfig.bgColor} ${rankConfig.color} border ${rankConfig.borderColor} text-xs font-bold shadow-sm`}>
          {rankConfig.icon} {rankConfig.label}
        </Badge>
      </div>

      {/* Agent Info */}
      <div className="flex flex-col items-center text-center pt-2">
        {/* Avatar */}
        <div className={`h-12 w-12 rounded-full flex items-center justify-center text-xl mb-2 bg-white shadow-inner border ${rankConfig.borderColor}`}>
          {rankConfig.icon}
        </div>

        {/* Name */}
        <div className="font-semibold text-sm truncate w-full">
          {node.firstName} {node.lastName}
        </div>

        {/* Agent Code */}
        {node.agentCode && (
          <div className="text-xs text-muted-foreground mt-0.5">
            #{node.agentCode}
          </div>
        )}

        {/* Status Indicators */}
        <div className="flex items-center gap-2 mt-2">
          {node.isLifeLicensed ? (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-[10px] px-1.5">
              <CheckCircle2 className="h-3 w-3 mr-0.5" />
              Licensed
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-300 text-[10px] px-1.5">
              <XCircle className="h-3 w-3 mr-0.5" />
              Unlicensed
            </Badge>
          )}
          {!node.isActive && (
            <Badge variant="outline" className="bg-red-50 text-red-600 border-red-300 text-[10px] px-1.5">
              Inactive
            </Badge>
          )}
        </div>

        {/* Metrics */}
        <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
          {node.directRecruits !== undefined && node.directRecruits > 0 && (
            <span className="flex items-center gap-0.5">
              <Users className="h-3 w-3" />
              {node.directRecruits}
            </span>
          )}
          {points > 0 && (
            <span className="flex items-center gap-0.5">
              <TrendingUp className="h-3 w-3" />
              {(points / 1000).toFixed(0)}K
            </span>
          )}
        </div>
      </div>

      {/* Expand/Collapse for children */}
      {hasChildren && (
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 h-6 w-6 rounded-full bg-white border shadow-sm hover:bg-gray-50"
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
        >
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </Button>
      )}
    </div>
  );
}

// Tree View Node Component (List Layout)
function TreeViewNode({ 
  node, 
  expanded, 
  onToggle, 
  onAgentClick,
  isHighlighted,
  isSearchMatch
}: { 
  node: TreeNode; 
  expanded: boolean; 
  onToggle: () => void;
  onAgentClick?: (id: number) => void;
  isHighlighted?: boolean;
  isSearchMatch?: boolean;
}) {
  const rankConfig = RANK_CONFIG[node.currentRank || "TRAINING_ASSOCIATE"] || RANK_CONFIG.TRAINING_ASSOCIATE;
  const hasChildren = node.children.length > 0;
  const points = parseFloat(node.totalBaseShopPoints || "0");

  return (
    <div 
      className={`flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer hover:bg-slate-50 ${
        isHighlighted ? "bg-primary/10 border border-primary/30" : "bg-white border border-slate-200"
      } ${isSearchMatch ? "ring-2 ring-yellow-400" : ""}`}
      onClick={() => onAgentClick?.(node.id)}
    >
      {/* Expand/Collapse button */}
      <div className="w-6 flex-shrink-0">
        {hasChildren ? (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6"
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        ) : (
          <div className="w-6" />
        )}
      </div>

      {/* Avatar */}
      <div className={`h-10 w-10 rounded-full flex items-center justify-center text-lg ${rankConfig.bgColor}`}>
        {rankConfig.icon}
      </div>

      {/* Agent Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">
            {node.firstName} {node.lastName}
          </span>
          <Badge variant="outline" className={`${rankConfig.bgColor} ${rankConfig.color} border-0 text-xs`}>
            {rankConfig.label}
          </Badge>
          {node.isLifeLicensed && (
            <Badge variant="outline" className="bg-green-50 text-green-600 text-xs">Licensed</Badge>
          )}
          {!node.isActive && (
            <Badge variant="outline" className="bg-red-50 text-red-600 text-xs">Inactive</Badge>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-0.5">
          {node.agentCode && <span>Code: {node.agentCode}</span>}
          {node.directRecruits !== undefined && node.directRecruits > 0 && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {node.directRecruits} recruits
            </span>
          )}
          {points > 0 && (
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {(points / 1000).toFixed(0)}K pts
            </span>
          )}
        </div>
      </div>

      {/* Children count */}
      {hasChildren && (
        <Badge variant="secondary" className="text-xs">
          {node.children.length} downline
        </Badge>
      )}
    </div>
  );
}

// Recursive Tree View (List Layout)
function TreeView({ 
  nodes, 
  expandedNodes, 
  toggleNode,
  onAgentClick,
  highlightedId,
  searchMatches,
  depth = 0 
}: { 
  nodes: TreeNode[]; 
  expandedNodes: Set<number>;
  toggleNode: (id: number) => void;
  onAgentClick?: (id: number) => void;
  highlightedId?: number;
  searchMatches?: Set<number>;
  depth?: number;
}) {
  return (
    <div className="space-y-2">
      {nodes.map(node => (
        <div key={node.id}>
          <div style={{ marginLeft: `${depth * 24}px` }} className="relative">
            {/* Connecting line */}
            {depth > 0 && (
              <div 
                className="absolute left-[-12px] top-1/2 w-3 h-0.5 bg-slate-300"
                style={{ transform: 'translateY(-50%)' }}
              />
            )}
            <TreeViewNode 
              node={node} 
              expanded={expandedNodes.has(node.id)}
              onToggle={() => toggleNode(node.id)}
              onAgentClick={onAgentClick}
              isHighlighted={node.id === highlightedId}
              isSearchMatch={searchMatches?.has(node.id)}
            />
          </div>
          {expandedNodes.has(node.id) && node.children.length > 0 && (
            <div className="relative">
              {/* Vertical connecting line */}
              <div 
                className="absolute left-[calc(24px*var(--depth)+12px)] top-0 bottom-4 w-0.5 bg-slate-300"
                style={{ '--depth': depth } as React.CSSProperties}
              />
              <TreeView 
                nodes={node.children} 
                expandedNodes={expandedNodes}
                toggleNode={toggleNode}
                onAgentClick={onAgentClick}
                highlightedId={highlightedId}
                searchMatches={searchMatches}
                depth={depth + 1}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Org Chart View (Horizontal Layout with connecting lines)
function OrgChartView({ 
  nodes, 
  expandedNodes, 
  toggleNode,
  onAgentClick,
  highlightedId,
  searchMatches,
  zoom
}: { 
  nodes: TreeNode[]; 
  expandedNodes: Set<number>;
  toggleNode: (id: number) => void;
  onAgentClick?: (id: number) => void;
  highlightedId?: number;
  searchMatches?: Set<number>;
  zoom: number;
}) {
  const renderNode = (node: TreeNode, isRoot: boolean = false) => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const visibleChildren = isExpanded ? node.children : [];

    return (
      <div key={node.id} className="flex flex-col items-center">
        {/* Node */}
        <OrgChartNode 
          node={node} 
          expanded={isExpanded}
          onToggle={() => toggleNode(node.id)}
          onAgentClick={onAgentClick}
          isHighlighted={node.id === highlightedId}
          isSearchMatch={searchMatches?.has(node.id)}
        />

        {/* Children */}
        {visibleChildren.length > 0 && (
          <>
            {/* Vertical line down from parent */}
            <div className="w-0.5 h-6 bg-slate-300" />
            
            {/* Horizontal connector line */}
            {visibleChildren.length > 1 && (
              <div className="relative w-full flex justify-center">
                <div 
                  className="absolute h-0.5 bg-slate-300" 
                  style={{
                    width: `calc(${(visibleChildren.length - 1) * 240}px)`,
                    top: 0
                  }}
                />
              </div>
            )}

            {/* Children row */}
            <div className="flex gap-6 pt-6">
              {visibleChildren.map((child, index) => (
                <div key={child.id} className="flex flex-col items-center">
                  {/* Vertical line up to child */}
                  <div className="w-0.5 h-6 bg-slate-300 -mt-6" />
                  {renderNode(child)}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div 
      className="flex flex-col items-center gap-4 p-8"
      style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
    >
      {nodes.map((node, index) => (
        <div key={node.id} className="mb-8">
          {renderNode(node, true)}
        </div>
      ))}
    </div>
  );
}

export default function TeamHierarchy({ agents, currentUserId, onAgentClick }: TeamHierarchyProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<"tree" | "org">("org");
  const [searchQuery, setSearchQuery] = useState("");
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const { mainTree, orphans } = useMemo(() => buildTree(agents), [agents]);
  
  // Combine mainTree and orphans for display, with mainTree first
  const allNodes = useMemo(() => [...mainTree, ...orphans], [mainTree, orphans]);

  // Search functionality
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return new Set<number>();
    const query = searchQuery.toLowerCase();
    const matches = new Set<number>();
    
    agents.forEach(agent => {
      const fullName = `${agent.firstName} ${agent.lastName}`.toLowerCase();
      const code = agent.agentCode?.toLowerCase() || "";
      if (fullName.includes(query) || code.includes(query)) {
        matches.add(agent.id);
      }
    });
    
    return matches;
  }, [agents, searchQuery]);

  // Auto-expand parents of search matches
  useMemo(() => {
    if (searchMatches.size === 0) return;
    
    const agentMap = new Map(agents.map(a => [a.id, a]));
    const toExpand = new Set<number>();
    
    searchMatches.forEach(matchId => {
      let current = agentMap.get(matchId);
      while (current?.uplineAgentId) {
        toExpand.add(current.uplineAgentId);
        current = agentMap.get(current.uplineAgentId);
      }
    });
    
    if (toExpand.size > 0) {
      setExpandedNodes(prev => new Set([...Array.from(prev), ...Array.from(toExpand)]));
    }
  }, [searchMatches, agents]);

  const toggleNode = useCallback((id: number) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    const allIds = new Set(agents.map(a => a.id));
    setExpandedNodes(allIds);
  }, [agents]);

  const collapseAll = useCallback(() => {
    setExpandedNodes(new Set());
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 0.1, 1.5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 0.1, 0.5));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
  }, []);

  // Calculate stats
  const stats = useMemo(() => {
    const rankCounts: Record<string, number> = {};
    let totalPoints = 0;
    let activeCount = 0;
    let licensedCount = 0;

    agents.forEach(agent => {
      const rank = agent.currentRank || "TRAINING_ASSOCIATE";
      rankCounts[rank] = (rankCounts[rank] || 0) + 1;
      totalPoints += parseFloat(agent.totalBaseShopPoints || "0");
      if (agent.isActive !== false) activeCount++;
      if (agent.isLifeLicensed) licensedCount++;
    });

    return { rankCounts, totalPoints, activeCount, licensedCount, totalAgents: agents.length };
  }, [agents]);

  if (agents.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg">No Team Members</h3>
          <p className="text-muted-foreground text-center mt-1">
            Your team hierarchy will appear here once you have agents in the system.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-800">{stats.totalAgents}</p>
                <p className="text-xs text-blue-600">Total Team</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <User className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-800">{stats.activeCount}</p>
                <p className="text-xs text-green-600">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-800">{stats.licensedCount}</p>
                <p className="text-xs text-emerald-600">Licensed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Award className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-800">
                  {(stats.rankCounts["SENIOR_MARKETING_DIRECTOR"] || 0) + 
                   (stats.rankCounts["EXECUTIVE_MARKETING_DIRECTOR"] || 0) +
                   (stats.rankCounts["CEO_MARKETING_DIRECTOR"] || 0)}
                </p>
                <p className="text-xs text-purple-600">SMD+</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-800">
                  {(stats.totalPoints / 1000000).toFixed(1)}M
                </p>
                <p className="text-xs text-amber-600">Total Points</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hierarchy View */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Team Hierarchy</CardTitle>
                <CardDescription>Organizational structure and downline relationships</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {/* View Mode Toggle */}
                <div className="flex items-center border rounded-lg p-1 bg-muted/50">
                  <Button 
                    variant={viewMode === "org" ? "default" : "ghost"} 
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => setViewMode("org")}
                  >
                    <LayoutGrid className="h-4 w-4 mr-1" />
                    Org Chart
                  </Button>
                  <Button 
                    variant={viewMode === "tree" ? "default" : "ghost"} 
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => setViewMode("tree")}
                  >
                    <List className="h-4 w-4 mr-1" />
                    Tree
                  </Button>
                </div>
              </div>
            </div>

            {/* Controls Row */}
            <div className="flex items-center justify-between gap-4">
              {/* Search */}
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by name or agent code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
                {searchMatches.size > 0 && (
                  <Badge className="absolute right-2 top-1/2 -translate-y-1/2" variant="secondary">
                    {searchMatches.size} found
                  </Badge>
                )}
              </div>

              {/* Zoom & Expand Controls */}
              <div className="flex items-center gap-2">
                {viewMode === "org" && (
                  <>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleZoomOut}>
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground w-12 text-center">
                      {Math.round(zoom * 100)}%
                    </span>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleZoomIn}>
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleResetZoom}>
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                    <div className="w-px h-6 bg-border mx-1" />
                  </>
                )}
                <Button variant="outline" size="sm" onClick={expandAll}>
                  Expand All
                </Button>
                <Button variant="outline" size="sm" onClick={collapseAll}>
                  Collapse All
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div 
            ref={containerRef}
            className={`overflow-auto ${viewMode === "org" ? "min-h-[400px]" : ""}`}
            style={{ maxHeight: viewMode === "org" ? "70vh" : "auto" }}
          >
            {viewMode === "org" ? (
              <OrgChartView 
                nodes={allNodes} 
                expandedNodes={expandedNodes}
                toggleNode={toggleNode}
                onAgentClick={onAgentClick}
                highlightedId={currentUserId}
                searchMatches={searchMatches}
                zoom={zoom}
              />
            ) : (
              <TreeView 
                nodes={allNodes} 
                expandedNodes={expandedNodes}
                toggleNode={toggleNode}
                onAgentClick={onAgentClick}
                highlightedId={currentUserId}
                searchMatches={searchMatches}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Rank Distribution */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Rank Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(RANK_CONFIG).map(([rank, config]) => {
              const count = stats.rankCounts[rank] || 0;
              if (count === 0) return null;
              return (
                <Badge 
                  key={rank} 
                  variant="outline" 
                  className={`${config.bgColor} ${config.color} border-0 px-3 py-1`}
                >
                  <span className="mr-1">{config.icon}</span>
                  {config.label}: {count}
                </Badge>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
