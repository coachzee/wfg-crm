# MyWFG Hierarchy Tool Findings

## Key Discovery
The **Associate Details** tab in the Hierarchy Tool contains the upline information!

## Fields Found:
- **Recruiter**: ADEWALE ADELEKE (direct recruiter)
- **Upline SMD**: ADEWALE ADELEKE (upline Senior Marketing Director)
- **Upline CEO**: EMMANUEL TITA (upline CEO)

## URL Pattern:
`https://www.mywfg.com/Wfg.HierarchyTool/HierarchyDetails/LoadHierarchyToolMain?agentcodenumber={AGENT_CODE}`

## Extraction Strategy:
1. Navigate to the Hierarchy Tool URL with agent code
2. Click on "ASSOCIATE DETAILS" tab
3. Extract the "Recruiter" field - this is the direct upline
4. The Recruiter name can be matched to an agent in our database

## Important Notes:
- The Recruiter field shows the NAME, not the agent code
- We need to match by name to find the upline agent ID
- The Upline SMD and Upline CEO provide additional hierarchy context
