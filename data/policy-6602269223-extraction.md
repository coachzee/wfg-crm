# Policy 6602269223 - ZOE DELINE

## Key Finding: Writing Agent Information

From the General tab, the **Producers** section shows:

1. **Writing Agent (100% split):**
   - Name: AUGUSTINA ARMSTRONG-OGBON
   - Producer Number: D0T7M
   - Role: Writing, Service Agent
   - Split: 100%
   - Business Phone: 469-970-3333

2. **Overwriting Agents:**
   - ZAID SHOPEJU (Producer Number: 73DXR) - Overwriting
   - WORLD FINANCIAL GROUP INC (Producer Number: 108WF) - Overwriting, Service Agency
   - TRANSAMERICA FINANCIAL ADVISORS INC (Producer Number: 700HW) - Overwriting
   - WORLD FINANCIAL GROUP INS AGENCY LLC (Producer Number: 100WF) - Overwriting

## Important Discovery

- The **Writing Agent** is NOT Zaid Shopeju for this policy - it's AUGUSTINA ARMSTRONG-OGBON
- Zaid Shopeju is listed as an **Overwriting** agent (hierarchy/upline)
- This explains why the Top Agents list was showing "Unknown" - we need to extract the actual Writing Agent from each policy

## Data to Extract for Each Policy:
1. Policy Number
2. Writing Agent Name (role = "Writing" or "Writing, Service Agent")
3. Writing Agent Producer Number
4. Writing Agent Split %
5. Target Premium (from Payment > Policy Guidelines)


## Complete Agent Information (from screenshot)

| Name | Role | Producer Number | Split |
|------|------|-----------------|-------|
| AUGUSTINA ARMSTRONG-OGBON | Writing, Service Agent | D0T7M | 100% |
| WORLD FINANCIAL GROUP INC | Overwriting, Service Agency | 108WF | - |
| (Unknown) | Overwriting | 58DNT | - |
| TRANSAMERICA FINANCIAL ADVISORS INC | Overwriting | 700HW | - |
| ZAID SHOPEJU | Overwriting | 73DXR | - |
| WORLD FINANCIAL GROUP INS AGENCY LLC | Overwriting | 100WF | - |

## Key Insight
- **Writing Agent** = AUGUSTINA ARMSTRONG-OGBON (100% split)
- **ZAID SHOPEJU** is an Overwriting agent (upline), NOT the writing agent
- This policy should be attributed to AUGUSTINA ARMSTRONG-OGBON for commission purposes


## Policy Guidelines (from Payment tab)

| Field | Value |
|-------|-------|
| **Target Premium** | **$1,228.50** |
| Monthly Minimum Premium | $53.41 |
| 7-Pay Start Date | 12/27/2025 |
| 7-Pay Premium | $10,236.10 |
| Duration 1 | $102.38 |
| Cash Value Accumulation Test | $66,491.24 |

## Summary for Policy 6602269223

- **Policy Number:** 6602269223
- **Owner:** ZOE DELINE
- **Face Amount:** $250,000
- **Billed Premium:** $102.38 (Monthly)
- **Target Premium:** $1,228.50
- **Writing Agent:** AUGUSTINA ARMSTRONG-OGBON (D0T7M) - 100% split
- **Overwriting Agent:** ZAID SHOPEJU (73DXR)

## Commission Calculation (for Writing Agent)
Target Premium × 125% × Agent Level × Split %
$1,228.50 × 1.25 × [Agent Level] × 100%
