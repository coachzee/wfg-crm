import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, TrendingUp, Users, Calculator, Info } from "lucide-react";

// WFG Commission Structure based on official compensation grid
const COMMISSION_STRUCTURE = {
  // Base shop payout percentage
  baseShopPayout: 65,
  
  // Generational overrides (percentages)
  generationalOverrides: {
    1: 12,    // 1st generation
    2: 6,     // 2nd generation
    3: 3.5,   // 3rd generation
    4: 2.5,   // 4th generation
    5: 1.25,  // 5th generation
    6: 0.75,  // 6th generation
  } as Record<number, number>,
  
  // Total base shop override
  totalBaseShopOverride: 26,
  
  // Bonus pools
  bonusPool: 6.5,
  executivePool: 2.5,
  
  // Production multipliers for Executive All-Generation Bonus
  productionMultipliers: [
    { threshold: 10000000, multiplier: 1 },    // 10M = 1x
    { threshold: 25000000, multiplier: 2 },    // 25M = 2x
    { threshold: 50000000, multiplier: 3 },    // 50M = 3x
    { threshold: 100000000, multiplier: 4 },   // 100M = 4x
    { threshold: 250000000, multiplier: 5 },   // 250M = 5x
    { threshold: 500000000, multiplier: 6 },   // 500M = 6x
    { threshold: 1000000000, multiplier: 7 },  // 1B = 7x
  ],
};

// Rank-based commission levels
const RANK_COMMISSION_LEVELS: Record<string, { level: number; baseRate: number }> = {
  TRAINING_ASSOCIATE: { level: 1, baseRate: 25 },
  ASSOCIATE: { level: 2, baseRate: 35 },
  SENIOR_ASSOCIATE: { level: 3, baseRate: 40 },
  MARKETING_DIRECTOR: { level: 10, baseRate: 50 },
  SENIOR_MARKETING_DIRECTOR: { level: 20, baseRate: 55 },
  EXECUTIVE_MARKETING_DIRECTOR: { level: 65, baseRate: 60 },
  CEO_MARKETING_DIRECTOR: { level: 75, baseRate: 62 },
  EXECUTIVE_VICE_CHAIRMAN: { level: 87, baseRate: 64 },
  SENIOR_EXECUTIVE_VICE_CHAIRMAN: { level: 90, baseRate: 65 },
  FIELD_CHAIRMAN: { level: 95, baseRate: 65 },
  EXECUTIVE_CHAIRMAN: { level: 99, baseRate: 65 },
};

interface CommissionCalculatorProps {
  currentRank?: string;
  totalBaseShopPoints?: number;
}

export default function CommissionCalculator({ 
  currentRank = "TRAINING_ASSOCIATE",
  totalBaseShopPoints = 0 
}: CommissionCalculatorProps) {
  const [premiumAmount, setPremiumAmount] = useState<string>("1000");
  const [selectedRank, setSelectedRank] = useState(currentRank);
  const [generationProduction, setGenerationProduction] = useState<Record<number, string>>({
    1: "5000",
    2: "3000",
    3: "2000",
    4: "1000",
    5: "500",
    6: "250",
  });

  // Calculate personal commission
  const personalCommission = useMemo(() => {
    const premium = parseFloat(premiumAmount) || 0;
    const rankConfig = RANK_COMMISSION_LEVELS[selectedRank] || RANK_COMMISSION_LEVELS.TRAINING_ASSOCIATE;
    return (premium * rankConfig.baseRate) / 100;
  }, [premiumAmount, selectedRank]);

  // Calculate generational overrides
  const overrideCommissions = useMemo(() => {
    const overrides: { generation: number; production: number; rate: number; commission: number }[] = [];
    let totalOverride = 0;

    for (let gen = 1; gen <= 6; gen++) {
      const production = parseFloat(generationProduction[gen]) || 0;
      const rate = COMMISSION_STRUCTURE.generationalOverrides[gen];
      const commission = (production * rate) / 100;
      overrides.push({ generation: gen, production, rate, commission });
      totalOverride += commission;
    }

    return { overrides, totalOverride };
  }, [generationProduction]);

  // Get production multiplier
  const productionMultiplier = useMemo(() => {
    for (let i = COMMISSION_STRUCTURE.productionMultipliers.length - 1; i >= 0; i--) {
      if (totalBaseShopPoints >= COMMISSION_STRUCTURE.productionMultipliers[i].threshold) {
        return COMMISSION_STRUCTURE.productionMultipliers[i].multiplier;
      }
    }
    return 0;
  }, [totalBaseShopPoints]);

  const rankConfig = RANK_COMMISSION_LEVELS[selectedRank] || RANK_COMMISSION_LEVELS.TRAINING_ASSOCIATE;

  return (
    <div className="space-y-6">
      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="personal" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Personal
          </TabsTrigger>
          <TabsTrigger value="overrides" className="gap-2">
            <Users className="h-4 w-4" />
            Overrides
          </TabsTrigger>
          <TabsTrigger value="structure" className="gap-2">
            <Info className="h-4 w-4" />
            Structure
          </TabsTrigger>
        </TabsList>

        {/* Personal Commission Calculator */}
        <TabsContent value="personal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Personal Commission Calculator
              </CardTitle>
              <CardDescription>
                Calculate your commission based on premium amount and rank
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rank">Your Rank</Label>
                  <Select value={selectedRank} onValueChange={setSelectedRank}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(RANK_COMMISSION_LEVELS).map(([rank, config]) => (
                        <SelectItem key={rank} value={rank}>
                          {rank.replace(/_/g, " ")} (Level {config.level})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="premium">Premium Amount ($)</Label>
                  <Input
                    id="premium"
                    type="number"
                    value={premiumAmount}
                    onChange={(e) => setPremiumAmount(e.target.value)}
                    placeholder="Enter premium amount"
                  />
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 mt-4">
                <div className="text-center">
                  <p className="text-sm text-green-600 mb-1">Your Commission</p>
                  <p className="text-4xl font-bold text-green-800">
                    ${personalCommission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm text-green-600 mt-2">
                    {rankConfig.baseRate}% of ${parseFloat(premiumAmount || "0").toLocaleString()} premium
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Commission Rate</p>
                  <p className="text-xl font-bold">{rankConfig.baseRate}%</p>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Rank Level</p>
                  <p className="text-xl font-bold">{rankConfig.level}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Generational Overrides Calculator */}
        <TabsContent value="overrides" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Generational Override Calculator
              </CardTitle>
              <CardDescription>
                Calculate override commissions from your downline generations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((gen) => (
                  <div key={gen} className="space-y-2">
                    <Label htmlFor={`gen-${gen}`}>
                      Gen {gen} Production ($)
                      <span className="text-xs text-muted-foreground ml-1">
                        ({COMMISSION_STRUCTURE.generationalOverrides[gen]}%)
                      </span>
                    </Label>
                    <Input
                      id={`gen-${gen}`}
                      type="number"
                      value={generationProduction[gen]}
                      onChange={(e) => setGenerationProduction(prev => ({
                        ...prev,
                        [gen]: e.target.value
                      }))}
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mt-4">
                <div className="text-center">
                  <p className="text-sm text-blue-600 mb-1">Total Override Commission</p>
                  <p className="text-4xl font-bold text-blue-800">
                    ${overrideCommissions.totalOverride.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="space-y-2 mt-4">
                <h4 className="font-medium text-sm">Breakdown by Generation</h4>
                <div className="space-y-2">
                  {overrideCommissions.overrides.map((item) => (
                    <div key={item.generation} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">Gen {item.generation}</Badge>
                        <span className="text-sm text-muted-foreground">
                          ${item.production.toLocaleString()} × {item.rate}%
                        </span>
                      </div>
                      <span className="font-medium">
                        ${item.commission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Commission Structure Info */}
        <TabsContent value="structure" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>WFG Compensation Structure</CardTitle>
              <CardDescription>
                Official commission rates and bonus pools
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Base Shop Payout */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Base Shop Payout
                </h4>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-800">{COMMISSION_STRUCTURE.baseShopPayout}%</p>
                    <p className="text-sm text-green-600">Total Base Shop Payout</p>
                  </div>
                </div>
              </div>

              {/* Generational Overrides */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Generational Overrides
                </h4>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {Object.entries(COMMISSION_STRUCTURE.generationalOverrides).map(([gen, rate]) => (
                    <div key={gen} className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs text-blue-600">Gen {gen}</p>
                      <p className="text-lg font-bold text-blue-800">{rate}%</p>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  Total Override: {COMMISSION_STRUCTURE.totalBaseShopOverride}%
                </p>
              </div>

              {/* Bonus Pools */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Bonus Pools
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <p className="text-2xl font-bold text-purple-800">{COMMISSION_STRUCTURE.bonusPool}%</p>
                    <p className="text-sm text-purple-600">Monthly Bonus Pool</p>
                  </div>
                  <div className="text-center p-4 bg-amber-50 rounded-lg">
                    <p className="text-2xl font-bold text-amber-800">{COMMISSION_STRUCTURE.executivePool}%</p>
                    <p className="text-sm text-amber-600">Executive & Quarterly Pool</p>
                  </div>
                </div>
              </div>

              {/* Production Multipliers */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Executive All-Generation Bonus Multipliers
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {COMMISSION_STRUCTURE.productionMultipliers.map((item) => (
                    <div key={item.threshold} className="text-center p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs text-muted-foreground">
                        {item.threshold >= 1000000000 
                          ? `${(item.threshold / 1000000000).toFixed(0)}B` 
                          : `${(item.threshold / 1000000).toFixed(0)}M`}
                      </p>
                      <p className="text-lg font-bold">{item.multiplier}x</p>
                    </div>
                  ))}
                </div>
                {productionMultiplier > 0 && (
                  <div className="mt-3 p-3 bg-amber-50 rounded-lg text-center">
                    <p className="text-sm text-amber-600">Your Current Multiplier</p>
                    <p className="text-2xl font-bold text-amber-800">{productionMultiplier}x</p>
                    <p className="text-xs text-amber-600">
                      Based on {(totalBaseShopPoints / 1000000).toFixed(1)}M total points
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
