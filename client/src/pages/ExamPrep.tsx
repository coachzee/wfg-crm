import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { RefreshCw, Search, GraduationCap, BookOpen, Clock, CheckCircle2, AlertCircle, User, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function ExamPrep() {
  const [searchTerm, setSearchTerm] = useState("");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  const { data: examPrepRecords, isLoading, refetch } = trpc.mywfg.getExamPrepRecords.useQuery();
  
  const syncMutation = trpc.mywfg.syncExamPrep.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`Sync completed! Found ${result.recordsFound} records, matched ${result.recordsMatched} agents.`);
        if (result.unmatchedAgents.length > 0) {
          toast.warning(`${result.unmatchedAgents.length} agents could not be matched: ${result.unmatchedAgents.slice(0, 3).join(", ")}${result.unmatchedAgents.length > 3 ? "..." : ""}`);
        }
        refetch();
      } else {
        toast.error(result.error || "Sync failed");
      }
    },
    onError: (error) => {
      toast.error(`Sync failed: ${error.message}`);
    },
  });
  
  // Get unique states for filter
  const uniqueStates = Array.from(new Set(examPrepRecords?.map(r => r.state).filter(Boolean) || []));
  
  // Filter records
  const filteredRecords = useMemo(() => {
    return examPrepRecords?.filter(record => {
      const matchesSearch = searchTerm === "" || 
        `${record.xcelFirstName} ${record.xcelLastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.agentCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.course.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesState = stateFilter === "all" || record.state === stateFilter;
      
      const matchesStatus = statusFilter === "all" ||
        (statusFilter === "matched" && record.agentId) ||
        (statusFilter === "unmatched" && !record.agentId) ||
        (statusFilter === "prepared" && record.preparedToPass?.toLowerCase() === "yes") ||
        (statusFilter === "not-prepared" && record.preparedToPass?.toLowerCase() !== "yes");
      
      return matchesSearch && matchesState && matchesStatus;
    }) || [];
  }, [examPrepRecords, searchTerm, stateFilter, statusFilter]);
  
  // Separate and sort records: In Progress (sorted by most recent login) and Completed (sorted by most recent login)
  const { inProgressRecords, completedRecords } = useMemo(() => {
    const sortByLastLogin = (a: any, b: any) => {
      const dateA = a.lastLogin ? new Date(a.lastLogin).getTime() : 0;
      const dateB = b.lastLogin ? new Date(b.lastLogin).getTime() : 0;
      return dateB - dateA; // Most recent first
    };
    
    const inProgress = filteredRecords
      .filter(r => (r.pleCompletePercent || 0) < 100)
      .sort(sortByLastLogin);
    
    const completed = filteredRecords
      .filter(r => (r.pleCompletePercent || 0) >= 100)
      .sort(sortByLastLogin);
    
    return { inProgressRecords: inProgress, completedRecords: completed };
  }, [filteredRecords]);
  
  // Calculate summary stats
  const totalRecords = examPrepRecords?.length || 0;
  const matchedRecords = examPrepRecords?.filter(r => r.agentId).length || 0;
  const preparedCount = examPrepRecords?.filter(r => r.preparedToPass?.toLowerCase() === "yes").length || 0;
  const avgProgress = totalRecords > 0 
    ? Math.round((examPrepRecords?.reduce((sum, r) => sum + (r.pleCompletePercent || 0), 0) || 0) / totalRecords)
    : 0;
  
  const getProgressColor = (percent: number) => {
    if (percent >= 80) return "bg-green-500";
    if (percent >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };
  
  const getStatusBadge = (prepared: string | null, progress: number | null) => {
    if (progress === 100) {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>;
    }
    if (prepared?.toLowerCase() === "yes") {
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Ready</Badge>;
    }
    return <Badge variant="outline" className="text-orange-600 border-orange-300">In Progress</Badge>;
  };

  // Render a table for a section
  const renderTable = (records: typeof filteredRecords, sectionTitle: string, icon: React.ReactNode, bgColor: string) => (
    <Card className="mb-6">
      <CardHeader className={`${bgColor} rounded-t-lg`}>
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <CardTitle className="text-lg">{sectionTitle}</CardTitle>
            <CardDescription className="text-gray-600">
              {records.length} {records.length === 1 ? 'agent' : 'agents'} • Sorted by most recent login
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {records.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No agents in this section
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Agent Code</TableHead>
                  <TableHead>Recruiter</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Enrolled</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {record.xcelFirstName?.[0]}{record.xcelLastName?.[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{record.xcelFirstName} {record.xcelLastName}</p>
                          {!record.agentId && (
                            <p className="text-xs text-orange-500 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Not matched
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {record.agentCode ? (
                        <Badge variant="outline">{record.agentCode}</Badge>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {record.recruiterName ? (
                        <span className="text-sm">{record.recruiterName}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{record.course}</p>
                        {record.state && (
                          <p className="text-xs text-gray-500">{record.state}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {record.dateEnrolled ? (
                        <span className="text-sm">
                          {(() => {
                            const dateStr = String(record.dateEnrolled);
                            const dateMatch = dateStr.match(/([A-Za-z]+\s+\d{1,2},?\s+\d{4})/);
                            return dateMatch ? dateMatch[1] : dateStr.split(' ').slice(0, 3).join(' ');
                          })()}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {record.lastLogin ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="h-3 w-3 text-gray-400" />
                          {format(new Date(record.lastLogin as string | Date), "MMM d, yyyy")}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="w-24">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{record.pleCompletePercent}%</span>
                        </div>
                        <Progress 
                          value={record.pleCompletePercent || 0} 
                          className="h-2"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(record.preparedToPass, record.pleCompletePercent)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agent Exam Prep</h1>
          <p className="text-gray-500 mt-1">Track your team's license exam preparation progress</p>
        </div>
        <Button 
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? "animate-spin" : ""}`} />
          {syncMutation.isPending ? "Syncing..." : "Sync from Email"}
        </Button>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Studying</p>
                <p className="text-2xl font-bold">{totalRecords}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Matched to Agents</p>
                <p className="text-2xl font-bold">{matchedRecords}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <User className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Prepared to Pass</p>
                <p className="text-2xl font-bold">{preparedCount}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg. Progress</p>
                <p className="text-2xl font-bold">{avgProgress}%</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                <GraduationCap className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, agent code, or course..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {uniqueStates.map(state => (
                  <SelectItem key={state} value={state || "unknown"}>{state}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="matched">Matched to Agent</SelectItem>
                <SelectItem value="unmatched">Unmatched</SelectItem>
                <SelectItem value="prepared">Prepared to Pass</SelectItem>
                <SelectItem value="not-prepared">Not Yet Prepared</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : filteredRecords.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <GraduationCap className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Exam Prep Records</h3>
              <p className="text-gray-500 mb-4">
                {totalRecords === 0 
                  ? "Click 'Sync from Email' to fetch exam prep data from XCEL Solutions emails."
                  : "No records match your current filters."}
              </p>
              {totalRecords === 0 && (
                <Button onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? "animate-spin" : ""}`} />
                  Sync Now
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* In Progress Section */}
          {renderTable(
            inProgressRecords,
            "In Progress",
            <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-orange-600" />
            </div>,
            "bg-orange-50"
          )}
          
          {/* Completed Section */}
          {renderTable(
            completedRecords,
            "Completed",
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>,
            "bg-green-50"
          )}
        </>
      )}
    </div>
  );
}
