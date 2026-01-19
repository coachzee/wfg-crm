# MyWFG Upline Leaders Report Structure

## URL Pattern
`https://www.mywfg.com/reports-UplineLeaders?AgentID={AGENT_CODE}`

## Report Sections

### 1. Leader Section (Direct Upline)
- **Relation**: "Leader"
- **Name**: Direct upline name
- **Associate ID**: Upline agent code
- **Title Level**: e.g., "EMD (65)"

### 2. Upline Senior Marketing Directors Section
Table with columns:
- **Generation**: 1, 2, 3, 4... (1 = direct upline SMD)
- **Upline Percent**: Percentage (e.g., 100%, 75%, 18.75%)
- **Name**: Full name
- **Associate ID**: Agent code
- **Title Level**: Rank level number

## Example Data for Agent 73DXR (Zaid Shopeju)
- Direct Leader: Adeleke, Adewale (94NJG) - EMD (65)
- Gen 1: Adeleke, Adewale (94NJG) - 100%
- Gen 2: Tita, Emmanuel (57QXE) - 100%
- Gen 3: Fombo, Daniel (49JHJ) - 75%
- Gen 3: Kwende, Martin (505JD) - 18.75%
- Gen 3: Nguyen, Andy (3330T) - 6.25%
- Gen 4: Kwende, Martin (505JD) - 42.1875%
- Gen 4: Nguyen, Alicia (1200Z) - 3.125%
- Gen 4: Rance, Zack (12ZKT) - ?%

## Strategy for Extracting Hierarchy
1. For each agent in our database, run the Upline Leaders report
2. Extract the "Leader" row to get direct upline (uplineAgentId)
3. Store the upline agent code in the agents table
4. This creates the parent-child relationships for the org chart

## Key Insight
The "Leader" field shows the DIRECT upline for any agent.
We only need this one field to build the complete hierarchy tree.
