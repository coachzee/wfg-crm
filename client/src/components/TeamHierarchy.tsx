import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Users, User, Award, TrendingUp } from "lucide-react";

// WFG Rank configuration
const RANK_CONFIG: Record<string, { label: string; icon: string; color: string; bgColor: string }> = {
  TRAINING_ASSOCIATE: { label: "TA", icon: "🎓", color: "text-gray-700", bgColor: "bg-gray-100" },
  ASSOCIATE: { label: "A", icon: "📋", color: "text-blue-700", bgColor: "bg-blue-100" },
  SENIOR_ASSOCIATE: { label: "SA", icon: "📊", color: "text-indigo-700", bgColor: "bg-indigo-100" },
  MARKETING_DIRECTOR: { label: "MD", icon: "🎯", color: "text-green-700", bgColor: "bg-green-100" },
  SENIOR_MARKETING_DIRECTOR: { label: "SMD", icon: "⭐", color: "text-emerald-700", bgColor: "bg-emerald-100" },
  EXECUTIVE_MARKETING_DIRECTOR: { label: "EMD", icon: "💎", color: "text-purple-700", bgColor: "bg-purple-100" },
  CEO_MARKETING_DIRECTOR: { label: "CEO", icon: "👑", color: "text-pink-700", bgColor: "bg-pink-100" },
  EXECUTIVE_VICE_CHAIRMAN: { label: "EVC", icon: "🏆", color: "text-amber-700", bgColor: "bg-amber-100" },
  SENIOR_EXECUTIVE_VICE_CHAIRMAN: { label: "SEVC", icon: "🌟", color: "text-orange-700", bgColor: "bg-orange-100" },
  FIELD_CHAIRMAN: { label: "FC", icon: "🔥", color: "text-red-700", bgColor: "bg-red-100" },
  EXECUTIVE_CHAIRMAN: { label: "EC", icon: "👔", color: "text-yellow-800", bgColor: "bg-yellow-100" },
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

function buildTree(agents: Agent[]): TreeNode[] {
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

  // Calculate depths
  function setDepth(node: TreeNode, depth: number) {
    node.depth = depth;
    node.children.forEach(child => setDepth(child, depth + 1));
  }
  roots.forEach(root => setDepth(root, 0));

  return roots;
}

function AgentNode({ 
  node, 
  expanded, 
  onToggle, 
  onAgentClick,
  isHighlighted 
}: { 
  node: TreeNode; 
  expanded: boolean; 
  onToggle: () => void;
  onAgentClick?: (id: number) => void;
  isHighlighted?: boolean;
}) {
  const rankConfig = RANK_CONFIG[node.currentRank || "TRAINING_ASSOCIATE"] || RANK_CONFIG.TRAINING_ASSOCIATE;
  const hasChildren = node.children.length > 0;
  const points = parseFloat(node.totalBaseShopPoints || "0");

  return (
    <div 
      className={`flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer hover:bg-slate-50 ${
        isHighlighted ? "bg-primary/10 border border-primary/30" : "bg-white border border-slate-200"
      }`}
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

function TreeView({ 
  nodes, 
  expandedNodes, 
  toggleNode,
  onAgentClick,
  highlightedId,
  depth = 0 
}: { 
  nodes: TreeNode[]; 
  expandedNodes: Set<number>;
  toggleNode: (id: number) => void;
  onAgentClick?: (id: number) => void;
  highlightedId?: number;
  depth?: number;
}) {
  return (
    <div className="space-y-2">
      {nodes.map(node => (
        <div key={node.id}>
          <div style={{ marginLeft: `${depth * 24}px` }}>
            <AgentNode 
              node={node} 
              expanded={expandedNodes.has(node.id)}
              onToggle={() => toggleNode(node.id)}
              onAgentClick={onAgentClick}
              isHighlighted={node.id === highlightedId}
            />
          </div>
          {expandedNodes.has(node.id) && node.children.length > 0 && (
            <TreeView 
              nodes={node.children} 
              expandedNodes={expandedNodes}
              toggleNode={toggleNode}
              onAgentClick={onAgentClick}
              highlightedId={highlightedId}
              depth={depth + 1}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default function TeamHierarchy({ agents, currentUserId, onAgentClick }: TeamHierarchyProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<"tree" | "flat">("tree");

  const tree = useMemo(() => buildTree(agents), [agents]);

  const toggleNode = (id: number) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allIds = new Set(agents.map(a => a.id));
    setExpandedNodes(allIds);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  // Calculate stats
  const stats = useMemo(() => {
    const rankCounts: Record<string, number> = {};
    let totalPoints = 0;
    let activeCount = 0;

    agents.forEach(agent => {
      const rank = agent.currentRank || "TRAINING_ASSOCIATE";
      rankCounts[rank] = (rankCounts[rank] || 0) + 1;
      totalPoints += parseFloat(agent.totalBaseShopPoints || "0");
      if (agent.isActive !== false) activeCount++;
    });

    return { rankCounts, totalPoints, activeCount, totalAgents: agents.length };
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Award className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-800">
                  {stats.rankCounts["SENIOR_MARKETING_DIRECTOR"] || 0}
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Team Hierarchy</CardTitle>
              <CardDescription>Organizational structure and downline relationships</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={expandAll}>
                Expand All
              </Button>
              <Button variant="outline" size="sm" onClick={collapseAll}>
                Collapse All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <TreeView 
            nodes={tree} 
            expandedNodes={expandedNodes}
            toggleNode={toggleNode}
            onAgentClick={onAgentClick}
            highlightedId={currentUserId}
          />
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
