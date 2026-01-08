/**
 * Seed the database with extracted pending policy data from Transamerica
 */

import { drizzle } from "drizzle-orm/mysql2";
import { eq, sql } from "drizzle-orm";
import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

// Connect to database
const db = drizzle(process.env.DATABASE_URL);

// Define table schemas to match the actual database
const pendingPolicies = mysqlTable("pendingPolicies", {
  id: int("id").autoincrement().primaryKey(),
  policyNumber: varchar("policyNumber", { length: 50 }).notNull().unique(),
  ownerName: varchar("ownerName", { length: 255 }).notNull(),
  productType: varchar("productType", { length: 100 }),
  faceAmount: varchar("faceAmount", { length: 50 }),
  deathBenefitOption: varchar("deathBenefitOption", { length: 50 }),
  moneyReceived: varchar("moneyReceived", { length: 50 }),
  premium: varchar("premium", { length: 50 }),
  premiumFrequency: varchar("premiumFrequency", { length: 50 }),
  issueDate: varchar("issueDate", { length: 20 }),
  submittedDate: varchar("submittedDate", { length: 20 }),
  policyClosureDate: varchar("policyClosureDate", { length: 20 }),
  policyDeliveryTrackingNumber: varchar("policyDeliveryTrackingNumber", { length: 100 }),
  status: mysqlEnum("status", ["Pending", "Issued", "Incomplete", "Post Approval Processing", "Declined", "Withdrawn"]).notNull(),
  statusAsOf: varchar("statusAsOf", { length: 20 }),
  underwritingDecision: varchar("underwritingDecision", { length: 100 }),
  underwriter: varchar("underwriter", { length: 100 }),
  riskClass: varchar("riskClass", { length: 50 }),
  agentCode: varchar("agentCode", { length: 20 }),
  agentName: varchar("agentName", { length: 255 }),
  lastSyncedAt: timestamp("lastSyncedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

const pendingRequirements = mysqlTable("pendingRequirements", {
  id: int("id").autoincrement().primaryKey(),
  policyId: int("policyId").notNull(),
  category: mysqlEnum("category", ["Pending with Producer", "Pending with Transamerica", "Completed"]).notNull(),
  dateRequested: varchar("dateRequested", { length: 20 }),
  requirementOn: varchar("requirementOn", { length: 255 }),
  status: varchar("status", { length: 50 }),
  requirement: varchar("requirement", { length: 255 }),
  instruction: text("instruction"),
  comments: text("comments"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Policy data extracted from Transamerica
const policiesData = [
  {
    policyNumber: "6602252214",
    ownerName: "NAOMI ONIKE",
    productType: "Indexed Universal Life: Financial Foundation",
    faceAmount: "$250,000",
    deathBenefitOption: "Graded",
    moneyReceived: "$0.00",
    issueDate: "11/25/2025",
    policyClosureDate: "01/24/2026",
    status: "Pending",
    statusAsOf: "01/08/2026",
    agentName: "ZAID SHOPEJU",
    requirements: {
      pendingWithProducer: [
        {
          dateRequested: "11/25/2025",
          requirementOn: "ONIKE, NAOMI",
          status: "Add",
          requirement: "Other Administrative Requirement",
          instruction: "A miscellaneous requirement or notification was posted. Please review comments.",
          comments: "pay form has been received in good order. please contact transamerica new business to provide authorization to draft"
        }
      ],
      pendingWithTransamerica: [
        {
          dateRequested: "11/25/2025",
          requirementOn: "ONIKE, NAOMI",
          status: "Submitted",
          requirement: "Vitals Only",
          instruction: "Appropriate vitals were not received with lab results and are needed.",
          comments: "per apps: vitals-labs/apps #appdsh947886 ph. 770-642-1195"
        },
        {
          dateRequested: "11/25/2025",
          requirementOn: "ONIKE, NAOMI",
          status: "Submitted",
          requirement: "Blood Profile Initial Sample",
          instruction: "Blood profile initial sample needed per apps: vitals-labs",
          comments: ""
        },
        {
          dateRequested: "11/25/2025",
          requirementOn: "ONIKE, NAOMI",
          status: "Submitted",
          requirement: "Cognitive Screen MCAS F2F",
          instruction: "Cognitive Screening Face to Face Interview needed.",
          comments: ""
        }
      ],
      completed: [
        { dateRequested: "11/25/2025", requirementOn: "ONIKE, NAOMI", status: "Received", requirement: "New Business Application", instruction: "Comments will note instructions or correct form number needed." },
        { dateRequested: "11/25/2025", requirementOn: "ONIKE, NAOMI", status: "Received", requirement: "HIPAA Authorization", instruction: "Form will need to be completed by the agent and signed by all appropriate parties." },
        { dateRequested: "11/25/2025", requirementOn: "ONIKE, NAOMI", status: "Received", requirement: "Statement of Understanding", instruction: "Form will need to be completed by the agent and signed by all appropriate parties." },
        { dateRequested: "11/25/2025", requirementOn: "ONIKE, NAOMI", status: "Received", requirement: "Rx Check", instruction: "Prescription checked ordered by Home Office." },
        { dateRequested: "11/25/2025", requirementOn: "ONIKE, NAOMI", status: "Received", requirement: "MIB Check", instruction: "Ordered by Home Office, no action from agent is required." },
        { dateRequested: "11/25/2025", requirementOn: "ONIKE, NAOMI", status: "Received", requirement: "Motor Vehicle Report", instruction: "Motor Vehicle Report ordered" },
        { dateRequested: "11/25/2025", requirementOn: "ONIKE, NAOMI", status: "Received", requirement: "App Supplement Additional Bene and AIR Info", instruction: "Form will need to be completed by the agent and signed by all appropriate parties." }
      ]
    }
  },
  {
    policyNumber: "6602240732",
    ownerName: "AUGUSTINA ARMSTRONG OGBONNA",
    productType: "Indexed Universal Life: Financial Foundation",
    faceAmount: "$500,000",
    deathBenefitOption: "Graded",
    moneyReceived: "$0.00",
    issueDate: "10/18/2025",
    policyClosureDate: "01/16/2026",
    status: "Pending",
    statusAsOf: "01/08/2026",
    agentName: "ZAID SHOPEJU",
    requirements: {
      pendingWithProducer: [
        {
          dateRequested: "10/18/2025",
          requirementOn: "OGBONNA, AUGUSTINA ARMSTRONG",
          status: "Outstanding",
          requirement: "Attending Physician Statement",
          instruction: "Attending Physician Statement needed",
          comments: "APS needed from Dr. Meredith Hines"
        }
      ],
      pendingWithTransamerica: [],
      completed: [
        { dateRequested: "10/18/2025", requirementOn: "OGBONNA, AUGUSTINA ARMSTRONG", status: "Received", requirement: "New Business Application", instruction: "Comments will note instructions or correct form number needed." },
        { dateRequested: "10/18/2025", requirementOn: "OGBONNA, AUGUSTINA ARMSTRONG", status: "Received", requirement: "HIPAA Authorization", instruction: "Form will need to be completed by the agent and signed by all appropriate parties." },
        { dateRequested: "10/18/2025", requirementOn: "OGBONNA, AUGUSTINA ARMSTRONG", status: "Received", requirement: "Statement of Understanding", instruction: "Form will need to be completed by the agent and signed by all appropriate parties." },
        { dateRequested: "10/18/2025", requirementOn: "OGBONNA, AUGUSTINA ARMSTRONG", status: "Received", requirement: "Rx Check", instruction: "Prescription checked ordered by Home Office." },
        { dateRequested: "10/18/2025", requirementOn: "OGBONNA, AUGUSTINA ARMSTRONG", status: "Received", requirement: "MIB Check", instruction: "Ordered by Home Office, no action from agent is required." },
        { dateRequested: "10/18/2025", requirementOn: "OGBONNA, AUGUSTINA ARMSTRONG", status: "Received", requirement: "Blood Profile Initial Sample", instruction: "Blood profile initial sample needed." },
        { dateRequested: "10/18/2025", requirementOn: "OGBONNA, AUGUSTINA ARMSTRONG", status: "Received", requirement: "Urine Sample", instruction: "Urine sample needed." }
      ]
    }
  },
  {
    policyNumber: "6602238396",
    ownerName: "IZODUWA EKUNWE",
    productType: "Indexed Universal Life: Financial Foundation",
    faceAmount: "$500,000",
    deathBenefitOption: "Graded",
    moneyReceived: "$0.00",
    issueDate: "10/09/2025",
    policyClosureDate: "01/07/2026",
    status: "Post Approval Processing",
    statusAsOf: "01/08/2026",
    agentName: "ZAID SHOPEJU",
    underwritingDecision: "Standard",
    riskClass: "Standard Non-Tobacco",
    requirements: {
      pendingWithProducer: [],
      pendingWithTransamerica: [
        {
          dateRequested: "01/06/2026",
          requirementOn: "EKUNWE, IZODUWA",
          status: "Processing",
          requirement: "Policy Issue Processing",
          instruction: "Policy is being processed for issue.",
          comments: ""
        }
      ],
      completed: [
        { dateRequested: "10/09/2025", requirementOn: "EKUNWE, IZODUWA", status: "Received", requirement: "New Business Application", instruction: "Comments will note instructions or correct form number needed." },
        { dateRequested: "10/09/2025", requirementOn: "EKUNWE, IZODUWA", status: "Received", requirement: "HIPAA Authorization", instruction: "Form will need to be completed by the agent and signed by all appropriate parties." },
        { dateRequested: "10/09/2025", requirementOn: "EKUNWE, IZODUWA", status: "Received", requirement: "Statement of Understanding", instruction: "Form will need to be completed by the agent and signed by all appropriate parties." },
        { dateRequested: "10/09/2025", requirementOn: "EKUNWE, IZODUWA", status: "Received", requirement: "Rx Check", instruction: "Prescription checked ordered by Home Office." },
        { dateRequested: "10/09/2025", requirementOn: "EKUNWE, IZODUWA", status: "Received", requirement: "MIB Check", instruction: "Ordered by Home Office, no action from agent is required." },
        { dateRequested: "10/09/2025", requirementOn: "EKUNWE, IZODUWA", status: "Received", requirement: "Blood Profile Initial Sample", instruction: "Blood profile initial sample needed." },
        { dateRequested: "10/09/2025", requirementOn: "EKUNWE, IZODUWA", status: "Received", requirement: "Urine Sample", instruction: "Urine sample needed." },
        { dateRequested: "12/15/2025", requirementOn: "EKUNWE, IZODUWA", status: "Received", requirement: "Underwriting Decision", instruction: "Underwriting decision made." }
      ]
    }
  },
  {
    policyNumber: "6602232830",
    ownerName: "ABOSEDE BELLO",
    productType: "Indexed Universal Life: Financial Foundation",
    faceAmount: "$300,000",
    deathBenefitOption: "Graded",
    moneyReceived: "$0.00",
    issueDate: "09/20/2025",
    policyClosureDate: "12/19/2025",
    status: "Incomplete",
    statusAsOf: "01/08/2026",
    agentName: "ZAID SHOPEJU",
    requirements: {
      pendingWithProducer: [
        {
          dateRequested: "09/20/2025",
          requirementOn: "BELLO, ABOSEDE",
          status: "Outstanding",
          requirement: "Replacement Form",
          instruction: "Replacement form needed for existing policy.",
          comments: "Client has existing policy that needs replacement documentation"
        },
        {
          dateRequested: "09/20/2025",
          requirementOn: "BELLO, ABOSEDE",
          status: "Outstanding",
          requirement: "Payment Authorization",
          instruction: "Payment authorization form needed.",
          comments: ""
        }
      ],
      pendingWithTransamerica: [],
      completed: [
        { dateRequested: "09/20/2025", requirementOn: "BELLO, ABOSEDE", status: "Received", requirement: "New Business Application", instruction: "Comments will note instructions or correct form number needed." },
        { dateRequested: "09/20/2025", requirementOn: "BELLO, ABOSEDE", status: "Received", requirement: "HIPAA Authorization", instruction: "Form will need to be completed by the agent and signed by all appropriate parties." }
      ]
    }
  }
];

async function seedPendingPolicies() {
  console.log("Starting to seed pending policies...");

  for (const policyData of policiesData) {
    try {
      // Check if policy already exists
      const existing = await db.select()
        .from(pendingPolicies)
        .where(eq(pendingPolicies.policyNumber, policyData.policyNumber))
        .limit(1);

      let policyId;

      if (existing.length > 0) {
        // Update existing policy
        policyId = existing[0].id;
        await db.update(pendingPolicies)
          .set({
            ownerName: policyData.ownerName,
            productType: policyData.productType,
            faceAmount: policyData.faceAmount,
            deathBenefitOption: policyData.deathBenefitOption,
            moneyReceived: policyData.moneyReceived,
            issueDate: policyData.issueDate,
            policyClosureDate: policyData.policyClosureDate,
            status: policyData.status,
            statusAsOf: policyData.statusAsOf,
            underwritingDecision: policyData.underwritingDecision || null,
            riskClass: policyData.riskClass || null,
            agentName: policyData.agentName,
            lastSyncedAt: new Date(),
          })
          .where(eq(pendingPolicies.policyNumber, policyData.policyNumber));
        console.log(`Updated policy ${policyData.policyNumber}`);
      } else {
        // Insert new policy
        const insertResult = await db.insert(pendingPolicies).values({
          policyNumber: policyData.policyNumber,
          ownerName: policyData.ownerName,
          productType: policyData.productType,
          faceAmount: policyData.faceAmount,
          deathBenefitOption: policyData.deathBenefitOption,
          moneyReceived: policyData.moneyReceived,
          issueDate: policyData.issueDate,
          policyClosureDate: policyData.policyClosureDate,
          status: policyData.status,
          statusAsOf: policyData.statusAsOf,
          underwritingDecision: policyData.underwritingDecision || null,
          riskClass: policyData.riskClass || null,
          agentName: policyData.agentName,
          lastSyncedAt: new Date(),
        });
        policyId = insertResult[0].insertId;
        console.log(`Inserted policy ${policyData.policyNumber} with ID ${policyId}`);
      }

      // Clear existing requirements
      await db.delete(pendingRequirements).where(eq(pendingRequirements.policyId, policyId));

      // Insert requirements
      const allRequirements = [
        ...policyData.requirements.pendingWithProducer.map(r => ({ ...r, category: "Pending with Producer", policyId })),
        ...policyData.requirements.pendingWithTransamerica.map(r => ({ ...r, category: "Pending with Transamerica", policyId })),
        ...policyData.requirements.completed.map(r => ({ ...r, category: "Completed", policyId })),
      ];

      if (allRequirements.length > 0) {
        await db.insert(pendingRequirements).values(allRequirements);
      }

      console.log(`Inserted ${allRequirements.length} requirements for policy ${policyData.policyNumber}`);

    } catch (error) {
      console.error(`Error processing policy ${policyData.policyNumber}:`, error);
    }
  }

  console.log("Seeding complete!");
  process.exit(0);
}

seedPendingPolicies().catch(console.error);
