# MyWFG.com Data Structure Analysis

## Overview
This document captures the complete data structure of all relevant reports available on mywfg.com for integration with the Wealth Builders Haven CRM.

**Account:** ZAID - 73DXR
**Analysis Date:** January 4, 2026

---

## 1. Downline Status Report
**URL:** https://www.mywfg.com/reports-downline-status
**Purpose:** View all team members and their status

### Filter Options:
- Associate ID (your agent code)
- Team (SMD Base, etc.)
- Type (Active, Inactive, All)
- As of Date
- Title Level

### Data Columns:
| Column | Description | Example |
|--------|-------------|---------|
| First Name | Agent's first name | Jeftha, Fredrick |
| Last Name | Agent's last name | Amoah, Chukwuedo |
| Bulletin Name | Display name | Same as first name |
| Associate ID | **Unique Agent Code** | E6U2T, D3T9L, E5R1E |
| Title Level | Rank level | 01 |
| Comm Level | Commission level | 01 |
| Downline % | Percentage | 100 |
| MD Approval | Approval date | 09/28/2, 01/07/2 |

### Sample Data:
- Jeftha Amoah (E6U2T) - Approved 09/28/2
- Fredrick Chukwuedo (D3T9L) - Approved 01/07/2
- Modupeola Dada (E5R1E) - Approved 08/30/2
- Shedrack Davies (E5C8X) - Approved 08/19/2
- And 30+ more team members...

---

## 2. Commissions Summary Report
**URL:** https://www.mywfg.com/reports-commissions-summary
**Purpose:** View commission breakdown by period

### Data Columns:
(To be documented)

---

## 3. Custom Reports
**URL:** https://www.mywfg.com/reports-custom
**Purpose:** Create flexible custom queries

### Available Fields:
(To be documented)

---

## 4. Payment Report
**URL:** https://www.mywfg.com/reports-payment
**Purpose:** View who gets paid and payment details

### Data Columns:
(To be documented)

---

## 5. Total Cash Flow Report
**URL:** https://www.mywfg.com/reports-total-cash-flow
**Purpose:** View 12-month cash flow summary

### Data Columns:
(To be documented)

---

## 6. Points and Recruits Report
**URL:** https://www.mywfg.com/reports-points-recruits
**Purpose:** Track recruitment metrics and points

### Data Columns:
(To be documented)

---

## 7. Net License Report
**URL:** https://www.mywfg.com/reports-net-license
**Purpose:** Track net licensed agents

### Data Columns:
(To be documented)

---

## 8. Licenses and Appointments Report
**URL:** https://www.mywfg.com/reports-licenses-appointments
**Purpose:** Track agent licensing status

### Data Columns:
(To be documented)

---

## 9. Policy History Report
**URL:** https://www.mywfg.com/reports-policy-history
**Purpose:** View policy records

### Data Columns:
(To be documented)

---

## 10. Business by Products Report
**URL:** https://www.mywfg.com/reports-business-by-products
**Purpose:** View sales breakdown by product type

### Data Columns:
(To be documented)

---

## Dashboard Key Metrics (MY BUSINESS Page)
**URL:** https://www.mywfg.com (MY BUSINESS tab)

### Available Metrics:
- **MY LAST COMMISSION:** $14,126.47 (as of 12/30/25)
- **Points:** 12,760
- **Recruits:** 3
- **Net Recruits:** 0

### Team Summary:
- Active Associates: 91
- Life Licensed Associates: 27
- Securities Licensed Assoc.: 0
- IAR Associates: 0

---

## Integration Strategy

### Priority Data for CRM:
1. **Agent Data** - From Downline Status
2. **Production Data** - From Commissions Summary, Total Cash Flow
3. **License Status** - From Licenses and Appointments
4. **Recruitment Metrics** - From Points and Recruits
5. **Payment History** - From Payment Report

### Recommended Sync Schedule:
- Daily: Agent status, new recruits
- Weekly: Commission data, production metrics
- Monthly: Full team analysis, cash flow reports

