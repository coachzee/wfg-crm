import { useState, memo, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Calendar, 
  Clock, 
  DollarSign, 
  FileText, 
  RefreshCw,
  Search,
  CalendarDays,
  CalendarRange,
  Gift,
  AlertCircle,
  Filter,
  X,
  CheckCircle,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

// Stats card component
const StatsCard = memo(function StatsCard({ 
  icon: Icon, 
  label, 
  value, 
  subtext,
  color,
  onClick
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string | number; 
  subtext: string;
  color: string;
  onClick?: () => void;
}) {
  return (
    <Card 
      className={`card-hover overflow-hidden ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-0">
        <div className={`p-5 ${color}`}>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium opacity-80">{label}</p>
              <p className="text-3xl font-bold">{value}</p>
              <p className="text-xs opacity-70">{subtext}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-white/80 dark:bg-black/20 flex items-center justify-center">
              <Icon className="h-6 w-6" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

// Anniversary row component
const AnniversaryRow = memo(function AnniversaryRow({ 
  policy,
  onScheduleReview,
  isCreatingTask
}: { 
  policy: any;
  onScheduleReview?: (policy: any) => void;
  isCreatingTask?: boolean;
}) {
  const daysUntil = policy.daysUntilAnniversary;
  const isUrgent = daysUntil <= 7;
  const isUpcoming = daysUntil <= 14;
  
  return (
    <div className="flex items-center gap-4 p-4 rounded-lg transition-colors hover:bg-muted/50 border-b last:border-b-0">
      {/* Days Until Badge */}
      <div className={`h-14 w-14 rounded-xl flex flex-col items-center justify-center font-bold text-sm ${
        isUrgent ? 'bg-red-100 text-red-700 dark:bg-red-900/30' :
        isUpcoming ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30' :
        'bg-blue-100 text-blue-700 dark:bg-blue-900/30'
      }`}>
        <span className="text-lg">{daysUntil}</span>
        <span className="text-[10px] opacity-70">days</span>
      </div>
      
      {/* Policy Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold truncate">{policy.ownerName}</span>
          {isUrgent && (
            <Badge variant="destructive" className="text-xs">Urgent</Badge>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {policy.policyNumber}
          </span>
          <span className="flex items-center gap-1">
            <Gift className="h-3 w-3" />
            {policy.policyAge} year{policy.policyAge !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
      
      {/* Product & Face Amount */}
      <div className="hidden md:block text-right">
        <p className="text-sm font-medium">{policy.productType || 'Life Insurance'}</p>
        <p className="text-sm text-muted-foreground">
          ${policy.faceAmount?.toLocaleString() || '0'} face
        </p>
      </div>
      
      {/* Premium */}
      <div className="hidden lg:block text-right">
        <p className="text-sm font-medium">
          ${policy.premium?.toLocaleString() || '0'}
        </p>
        <p className="text-xs text-muted-foreground">
          Premium
        </p>
      </div>
      
      {/* Anniversary Date */}
      <div className="hidden lg:block text-right">
        <p className="text-sm font-medium">
          {format(new Date(policy.anniversaryDate), 'MMM d, yyyy')}
        </p>
        <p className="text-xs text-muted-foreground">
          Anniversary
        </p>
      </div>
      
      {/* Writing Agent */}
      <div className="hidden xl:block text-right min-w-[120px]">
        <p className="text-sm font-medium truncate">{policy.writingAgentName || '-'}</p>
        <p className="text-xs text-muted-foreground">{policy.writingAgentCode || ''}</p>
      </div>
      
      {/* Action Button */}
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => onScheduleReview?.(policy)}
        disabled={isCreatingTask}
        className="shrink-0"
      >
        {isCreatingTask ? (
          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
        ) : (
          <Calendar className="h-4 w-4 mr-1" />
        )}
        Schedule Review
      </Button>
    </div>
  );
});

export default function PolicyAnniversaries() {
  const [selectedPeriod, setSelectedPeriod] = useState<'7' | '30' | '60' | '90'>('30');
  const [searchQuery, setSearchQuery] = useState('');
  const [creatingTaskForPolicy, setCreatingTaskForPolicy] = useState<string | null>(null);
  
  // Filter states
  const [policyTypeFilter, setPolicyTypeFilter] = useState<string>('all');
  const [premiumMinFilter, setPremiumMinFilter] = useState<string>('');
  const [premiumMaxFilter, setPremiumMaxFilter] = useState<string>('');
  const [dateFromFilter, setDateFromFilter] = useState<string>('');
  const [dateToFilter, setDateToFilter] = useState<string>('');
  
  // Fetch anniversary data
  const { data: anniversaries, isLoading, refetch, isRefetching } = trpc.dashboard.getAnniversaries.useQuery(
    { daysAhead: parseInt(selectedPeriod) },
    { staleTime: 30000 }
  );
  
  const { data: summary } = trpc.dashboard.getAnniversarySummary.useQuery(undefined, {
    staleTime: 30000
  });
  
  // Task creation mutation
  const createTaskMutation = trpc.dashboard.createPolicyReviewTask.useMutation({
    onSuccess: (data, variables) => {
      toast.success(`Review task created for ${variables.ownerName}`, {
        description: `Task scheduled for 7 days before anniversary (${variables.anniversaryDate})`,
        icon: <CheckCircle className="h-4 w-4 text-green-500" />,
      });
      setCreatingTaskForPolicy(null);
    },
    onError: (error) => {
      toast.error('Failed to create task', {
        description: error.message,
      });
      setCreatingTaskForPolicy(null);
    },
  });
  
  // Get unique policy types for filter
  const policyTypes = useMemo(() => {
    if (!anniversaries) return [];
    const types = new Set(anniversaries.map(p => p.productType || 'Unknown').filter(Boolean));
    return Array.from(types).sort();
  }, [anniversaries]);
  
  // Check if any filters are active
  const hasActiveFilters = policyTypeFilter !== 'all' || premiumMinFilter || premiumMaxFilter || dateFromFilter || dateToFilter;
  
  // Clear all filters
  const clearFilters = () => {
    setPolicyTypeFilter('all');
    setPremiumMinFilter('');
    setPremiumMaxFilter('');
    setDateFromFilter('');
    setDateToFilter('');
  };
  
  // Filter anniversaries
  const filteredAnniversaries = useMemo(() => {
    if (!anniversaries) return [];
    
    return anniversaries.filter(policy => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          policy.ownerName?.toLowerCase().includes(query) ||
          policy.policyNumber?.toLowerCase().includes(query) ||
          policy.writingAgentName?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      
      // Policy type filter
      if (policyTypeFilter !== 'all') {
        const policyType = policy.productType || 'Unknown';
        if (policyType !== policyTypeFilter) return false;
      }
      
      // Premium range filter
      if (premiumMinFilter) {
        const minPremium = parseFloat(premiumMinFilter);
        if (!isNaN(minPremium) && (policy.premium || 0) < minPremium) return false;
      }
      if (premiumMaxFilter) {
        const maxPremium = parseFloat(premiumMaxFilter);
        if (!isNaN(maxPremium) && (policy.premium || 0) > maxPremium) return false;
      }
      
      // Anniversary date range filter
      if (dateFromFilter) {
        const fromDate = new Date(dateFromFilter);
        const anniversaryDate = new Date(policy.anniversaryDate);
        if (anniversaryDate < fromDate) return false;
      }
      if (dateToFilter) {
        const toDate = new Date(dateToFilter);
        const anniversaryDate = new Date(policy.anniversaryDate);
        if (anniversaryDate > toDate) return false;
      }
      
      return true;
    });
  }, [anniversaries, searchQuery, policyTypeFilter, premiumMinFilter, premiumMaxFilter, dateFromFilter, dateToFilter]);
  
  // Handle schedule review - create task
  const handleScheduleReview = (policy: any) => {
    setCreatingTaskForPolicy(policy.policyNumber);
    createTaskMutation.mutate({
      policyNumber: policy.policyNumber,
      ownerName: policy.ownerName,
      anniversaryDate: format(new Date(policy.anniversaryDate), 'yyyy-MM-dd'),
      policyAge: policy.policyAge,
      faceAmount: policy.faceAmount || 0,
      premium: policy.premium || 0,
      productType: policy.productType,
    });
  };
  
  // Calculate stats
  const urgentCount = anniversaries?.filter(p => p.daysUntilAnniversary <= 7).length || 0;
  const totalFaceAmount = filteredAnniversaries.reduce((sum, p) => sum + (p.faceAmount || 0), 0);
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <CalendarDays className="h-8 w-8 text-primary" />
            Policy Anniversaries
          </h1>
          <p className="text-muted-foreground mt-1">
            Track upcoming policy anniversaries and schedule client reviews
          </p>
        </div>
        <Button 
          onClick={() => refetch()} 
          disabled={isRefetching}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          icon={AlertCircle}
          label="This Week"
          value={summary?.thisWeek || 0}
          subtext="Urgent - Contact Now"
          color="bg-gradient-to-br from-red-500/10 to-red-600/5 text-red-700 dark:text-red-400"
          onClick={() => setSelectedPeriod('7')}
        />
        <StatsCard
          icon={Calendar}
          label="This Month"
          value={summary?.thisMonth || 0}
          subtext="Next 30 days"
          color="bg-gradient-to-br from-amber-500/10 to-amber-600/5 text-amber-700 dark:text-amber-400"
          onClick={() => setSelectedPeriod('30')}
        />
        <StatsCard
          icon={CalendarRange}
          label="Next 60 Days"
          value={summary?.next60Days || 0}
          subtext="Plan ahead"
          color="bg-gradient-to-br from-blue-500/10 to-blue-600/5 text-blue-700 dark:text-blue-400"
          onClick={() => setSelectedPeriod('60')}
        />
        <StatsCard
          icon={DollarSign}
          label="Total Face Amount"
          value={`$${(totalFaceAmount / 1000000).toFixed(1)}M`}
          subtext={`${filteredAnniversaries.length} policies`}
          color="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 text-emerald-700 dark:text-emerald-400"
        />
      </div>
      
      {/* Main Content */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" />
                Upcoming Anniversaries
              </CardTitle>
              <CardDescription>
                Policies with anniversaries in the next {selectedPeriod} days
              </CardDescription>
            </div>
            
            {/* Search & Filters */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search client or policy..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-[200px]"
                />
              </div>
              
              {/* Filter Popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" className="relative">
                    <Filter className="h-4 w-4" />
                    {hasActiveFilters && (
                      <span className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Filters</h4>
                      {hasActiveFilters && (
                        <Button variant="ghost" size="sm" onClick={clearFilters}>
                          <X className="h-3 w-3 mr-1" />
                          Clear
                        </Button>
                      )}
                    </div>
                    
                    {/* Policy Type Filter */}
                    <div className="space-y-2">
                      <Label>Policy Type</Label>
                      <Select value={policyTypeFilter} onValueChange={setPolicyTypeFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          {policyTypes.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Premium Range Filter */}
                    <div className="space-y-2">
                      <Label>Premium Range</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          placeholder="Min"
                          value={premiumMinFilter}
                          onChange={(e) => setPremiumMinFilter(e.target.value)}
                          className="w-full"
                        />
                        <span className="text-muted-foreground">-</span>
                        <Input
                          type="number"
                          placeholder="Max"
                          value={premiumMaxFilter}
                          onChange={(e) => setPremiumMaxFilter(e.target.value)}
                          className="w-full"
                        />
                      </div>
                    </div>
                    
                    {/* Anniversary Date Range Filter */}
                    <div className="space-y-2">
                      <Label>Anniversary Date Range</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="date"
                          value={dateFromFilter}
                          onChange={(e) => setDateFromFilter(e.target.value)}
                          className="w-full"
                        />
                        <span className="text-muted-foreground">-</span>
                        <Input
                          type="date"
                          value={dateToFilter}
                          onChange={(e) => setDateToFilter(e.target.value)}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 mt-3">
              {policyTypeFilter !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  Type: {policyTypeFilter}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setPolicyTypeFilter('all')} />
                </Badge>
              )}
              {(premiumMinFilter || premiumMaxFilter) && (
                <Badge variant="secondary" className="gap-1">
                  Premium: ${premiumMinFilter || '0'} - ${premiumMaxFilter || '∞'}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => { setPremiumMinFilter(''); setPremiumMaxFilter(''); }} />
                </Badge>
              )}
              {(dateFromFilter || dateToFilter) && (
                <Badge variant="secondary" className="gap-1">
                  Date: {dateFromFilter || 'Any'} - {dateToFilter || 'Any'}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => { setDateFromFilter(''); setDateToFilter(''); }} />
                </Badge>
              )}
            </div>
          )}
        </CardHeader>
        
        <CardContent>
          {/* Period Tabs */}
          <Tabs value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as any)} className="mb-4">
            <TabsList>
              <TabsTrigger value="7" className="gap-1">
                <Clock className="h-3 w-3" />
                This Week
                {urgentCount > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 px-1.5">{urgentCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="30">This Month</TabsTrigger>
              <TabsTrigger value="60">60 Days</TabsTrigger>
              <TabsTrigger value="90">90 Days</TabsTrigger>
            </TabsList>
          </Tabs>
          
          {/* Anniversary List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredAnniversaries.length === 0 ? (
            <div className="text-center py-12">
              <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">No upcoming anniversaries</p>
              <p className="text-sm text-muted-foreground/70">
                {searchQuery || hasActiveFilters ? 'Try adjusting your search or filters' : `No policy anniversaries in the next ${selectedPeriod} days`}
              </p>
              {hasActiveFilters && (
                <Button variant="link" onClick={clearFilters} className="mt-2">
                  Clear all filters
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredAnniversaries.map((policy) => (
                <AnniversaryRow 
                  key={policy.id} 
                  policy={policy}
                  onScheduleReview={handleScheduleReview}
                  isCreatingTask={creatingTaskForPolicy === policy.policyNumber}
                />
              ))}
            </div>
          )}
          
          {/* Summary Footer */}
          {filteredAnniversaries.length > 0 && (
            <div className="mt-6 pt-4 border-t flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Showing {filteredAnniversaries.length} anniversaries in the next {selectedPeriod} days
              </span>
              <span>
                Total Face Amount: ${totalFaceAmount.toLocaleString()}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Tips Card */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-6">
          <h3 className="font-semibold flex items-center gap-2 mb-3">
            <Gift className="h-5 w-5 text-primary" />
            Policy Review Best Practices
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Contact clients 2-4 weeks before their policy anniversary to schedule a review
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Review coverage needs, beneficiary updates, and any life changes
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Discuss additional coverage opportunities for family protection
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Use anniversaries as referral opportunities - ask for introductions
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
