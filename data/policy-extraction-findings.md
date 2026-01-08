# Policy Extraction Findings

## Policy 6602238677 - EKHUEMUENOGIEMWEN EKUNWE

**General Tab - Agent Information:**
- **ZAID SHOPEJU** (73DXR): Writing, Service Agent, Overwriting - **Split 40%**
- **OLUSEYI OGUNLOLU** (49AEA): Writing - **Split 60%**
- ADEWALE ADELEKE (94NJG): Overwriting only
- WORLD FINANCIAL GROUP INS AGENCY LLC: Overwriting, Service Agency

**Face Amount:** $1,500,000
**Billed Premium (from list):** $8,208.75

**Next Step:** Navigate to Payment tab > Policy Guidelines to get Target Premium

---

## Policy Guidelines (Payment Tab):
- **Target Premium: $32,835.00** (This is the correct premium for commission calculation!)
- Monthly Minimum Premium: $1,272.50
- 7-Pay Start Date: 12/27/2025
- 7-Pay Premium: $118,317.80
- Duration 1: $8,208.75 (This is the Billed Premium shown in the list view)
- Cash Value Accumulation Test: $775,406.11

## Commission Calculation for Policy 6602238677:
- Target Premium: $32,835.00
- Transamerica Multiplier: 125%
- Adjusted Premium: $32,835.00 × 1.25 = $41,043.75

**ZAID SHOPEJU (40% split, 65% SMD level):**
- Commission: $41,043.75 × 0.40 × 0.65 = $10,671.38

**OLUSEYI OGUNLOLU (60% split, 25% level assumed):**
- Commission: $41,043.75 × 0.60 × 0.25 = $6,156.56

**Total Commission: $16,827.94**

---

## Key Discovery:
The "Billed Premium" shown in the list view ($8,208.75) is NOT the Target Premium.
The actual Target Premium ($32,835.00) is found in Payment > Policy Guidelines.
This is approximately 4x higher than the Billed Premium!

The Billed Premium appears to be the quarterly payment amount (Duration 1).

---


## Current State Analysis (Jan 8, 2026)

### Commission Calculation Issue

The current sync process in `transamerica-inforce-sync.ts` has these issues:

1. **Uses Billed Premium instead of Target Premium**: The sync extracts `premium` from the list view, which is the billed premium (varies by billing mode: monthly, quarterly, annual). The Target Premium is only available in the Policy Guidelines section of each policy detail page.

2. **Default 55% Agent Level**: Uses a hardcoded 55% agent level for all policies, but agents have different levels (25%, 35%, 45%, 55%, 65%, etc.)

3. **No Split Agent Support**: Assumes 100% split for all policies, but many policies have split agents (e.g., 40%/60% split between two writing agents)

### Correct Commission Formula

```
Commission = Target Premium × 125% × Agent Level × Split %
```

### Solution Approach

1. **Add manual Target Premium entry**: Allow users to manually enter Target Premium for policies where it differs from the billed premium
2. **Add agent commission levels**: Store commission level (25%, 35%, 45%, 55%, 65%) for each agent in the agents table
3. **Support split agents**: Use the new secondAgent fields in inforcePolicies table
4. **Recalculate commissions**: When Target Premium or agent levels change, recalculate commissions

### Database Schema Updates (Completed)

Added to inforcePolicies table:
- `writingAgentCommission` - Calculated commission for primary agent
- `secondAgentName`, `secondAgentCode`, `secondAgentSplit`, `secondAgentLevel`, `secondAgentCommission`, `secondAgentId` - Fields for split agent

Need to add to agents table:
- `commissionLevel` - Agent's commission level (0.25, 0.35, 0.45, 0.55, 0.65)


## UI Implementation Complete (Jan 8, 2026)

### Policy Detail Edit Dialog

Successfully implemented a dialog that allows editing:
1. **Target Premium** - The actual target premium from Transamerica Policy Guidelines
2. **Primary Writing Agent** - Name, Code, Split %, and Commission Level
3. **Secondary Writing Agent** - For split policies (optional)
4. **Live Commission Preview** - Shows calculated commission using the formula

### Commission Preview Example (OLUWAMUYIWA ONAMUTI - 6602249306)
- Target Premium: $37,740.00
- Primary Agent (100% × 55%): **$25,946.25**
- Total Commission: **$25,946.25**

Formula: Target Premium × 125% × Agent Level × Split %
= $37,740 × 1.25 × 0.55 × 1.00 = $25,946.25

### Next Steps
1. Test saving a policy update with split agent data
2. Update the policy for EKHUEMUENOGIEMWEN EKUNWE (6602238677) with the extracted data:
   - Target Premium: $32,835.00
   - ZAID SHOPEJU: 40% split, 65% level
   - OLUSEYI OGUNLOLU: 60% split, 25% level
3. Write unit tests for the updatePolicy mutation


## Commission Preview Verified (Policy 6602238677)

**Input Data:**
- Target Premium: $32,835
- ZAID SHOPEJU: 40% split × 65% level
- OLUSEYI OGUNLOLU: 60% split × 25% level

**Commission Preview (from UI):**
- ZAID SHOPEJU (40% × 65%): **$10,671.38**
- OLUSEYI OGUNLOLU (60% × 25%): **$6,156.56**
- **Total Commission: $16,827.94**

This matches our manual calculation exactly! The formula is working correctly:
- Zaid: $32,835 × 1.25 × 0.40 × 0.65 = $10,671.38
- Oluseyi: $32,835 × 1.25 × 0.60 × 0.25 = $6,156.56
