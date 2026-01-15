# WFG Commission Structure (Official)

**Source:** US_Compensation_Brochure.pdf (Effective January 2024)

## Business Development - Fixed Products Commission Levels

| Title | Fixed Products % | WFG Direct % |
|-------|------------------|--------------|
| Training Agent (TA) | 25% | 70% |
| Agent (A) | 35% | 76% |
| Senior Agent (SA) | 45% | 82% |
| Marketing Director (MD) | 50% | 88% |
| **Senior Marketing Director (SMD)** | **65%** | 94% |
| Total Base Shop | 65% | 94% |

## Business Expansion - Generational Overrides

| Generation | Fixed Products % | WFG Direct % |
|------------|------------------|--------------|
| 1st Generation | 12% | 6% |
| 2nd Generation | 6% | - |
| 3rd Generation | 3.5% | - |
| 4th Generation | 2.5% | - |
| 5th Generation | 1.25% | - |
| 6th Generation | 0.75% | - |
| **Total Generation Override** | **26%** | 6% |

## Total Bonus Pool Contribution

| Pool | Fixed Products % | WFG Direct % |
|------|------------------|--------------|
| Bonus Pools | 6.5% | - |
| Executive & Quarterly Bonus Pools | 2.5% | - |
| **Total** | **100%** | 100% |

## Key Findings

1. **SMD (Senior Marketing Director) is 65%, NOT 55%** - This was the main error in the codebase
2. The current code had SMD at 55% which is incorrect
3. The Total Base Shop payout is 65%

## Transamerica Multiplier

From the Compensation Grid document:
- **FFIUL (Fixed Indexed Universal Life) has increased by 125 bps** to the base shop
- Commission for all Transamerica products (except FFIUL) has increased by 50 basis points
- All non-Transamerica products have increased by 100 bps

## Commission Formula

```
Commission = Target Premium × 125% × Agent Level % × Split %
```

Where Agent Level % is based on the Business Development table above.

## MyWFG Level Mapping

From the code screenshot provided:
- Level 01 = Training Associate (TA) = 25%
- Level 10 = Associate (A) = 35%
- Level 15 = Senior Associate (SA) = 45%
- Level 17 = Marketing Director (MD) = 50%
- Level 20 = Senior Marketing Director (SMD) = **65%**
- Level 65 = Executive Marketing Director (EMD) = **65%**
- Level 75 = CEO Marketing Director = **65%**
- Level 87 = Executive Vice Chairman (EVC) = **65%**
- Level 90+ = Senior Executive Vice Chairman (SEVC) = **65%**
- Level 95+ = Field Chairman (FC) = **65%**
- Level 99 = Executive Chairman (EC) = **65%**

**Note:** Once an agent reaches SMD level (65%), the base commission stays at 65% for all higher ranks. Additional income at higher ranks comes from generational overrides, bonus pools, and other incentives.

## Notes

- The compensation structure became effective January 1, 2024 with updates in April 2024
- 100% of grid compensation goes to agents (1% supervision fee reallocated from outside the grid)
- Commission amount may vary based upon product size and purchase
