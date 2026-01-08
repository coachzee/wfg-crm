# Policy Data Extraction Plan

## Data to Extract from Each Policy

### From General Tab > Agent Information:
1. Writing Agent Name (Role = "Writing" or "Writing, Service Agent")
2. Writing Agent Producer Number
3. Writing Agent Split %
4. Second Writing Agent (if split policy)
5. Second Agent Producer Number
6. Second Agent Split %

### From Payment Tab > Policy Guidelines:
1. Target Premium

## Extraction Process

Since we're already logged in and on the policy list, we can:
1. Use the browser to navigate to each policy
2. Extract the data from the page content
3. Store in a JSON file
4. Then bulk update the database

## Policy List URL Pattern
- List: https://lifeaccess.transamerica.com/app/lifeaccess#/display/PolicyList?type=inforce
- Detail: https://lifeaccess.transamerica.com/app/lifeaccess#/display/Inforce/{policyId}/Inforce

## Current Progress
- Extracted policy 6602269223: Writing Agent = AUGUSTINA ARMSTRONG-OGBON, Target Premium = $1,228.50
