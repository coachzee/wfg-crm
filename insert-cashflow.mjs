import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { int, mysqlTable, varchar, decimal, timestamp, uniqueIndex } from "drizzle-orm/mysql-core";

// Define the table schema inline
const monthlyTeamCashFlow = mysqlTable("monthlyTeamCashFlow", {
  id: int("id").autoincrement().primaryKey(),
  monthYear: varchar("monthYear", { length: 10 }).notNull(),
  month: int("month").notNull(),
  year: int("year").notNull(),
  superTeamCashFlow: decimal("superTeamCashFlow", { precision: 15, scale: 2 }).notNull(),
  personalCashFlow: decimal("personalCashFlow", { precision: 15, scale: 2 }).notNull(),
  agentCode: varchar("agentCode", { length: 64 }).notNull().default("73DXR"),
  agentName: varchar("agentName", { length: 255 }).notNull().default("SHOPEJU, ZAID"),
  syncedAt: timestamp("syncedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  uniqueMonthYearIdx: uniqueIndex("unique_month_year_agent").on(table.monthYear, table.agentCode),
}));

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

// Monthly cash flow data from MyWFG (Feb 2025 - Jan 2026)
const records = [
  { monthYear: "2/2025", month: 2, year: 2025, superTeamCashFlow: "3092.63", personalCashFlow: "1657.80", agentCode: "73DXR", agentName: "SHOPEJU, ZAID" },
  { monthYear: "3/2025", month: 3, year: 2025, superTeamCashFlow: "5496.92", personalCashFlow: "4025.81", agentCode: "73DXR", agentName: "SHOPEJU, ZAID" },
  { monthYear: "4/2025", month: 4, year: 2025, superTeamCashFlow: "6830.54", personalCashFlow: "5890.65", agentCode: "73DXR", agentName: "SHOPEJU, ZAID" },
  { monthYear: "5/2025", month: 5, year: 2025, superTeamCashFlow: "8168.29", personalCashFlow: "6820.06", agentCode: "73DXR", agentName: "SHOPEJU, ZAID" },
  { monthYear: "6/2025", month: 6, year: 2025, superTeamCashFlow: "35120.41", personalCashFlow: "22868.80", agentCode: "73DXR", agentName: "SHOPEJU, ZAID" },
  { monthYear: "7/2025", month: 7, year: 2025, superTeamCashFlow: "31508.35", personalCashFlow: "31870.48", agentCode: "73DXR", agentName: "SHOPEJU, ZAID" },
  { monthYear: "8/2025", month: 8, year: 2025, superTeamCashFlow: "23343.85", personalCashFlow: "15194.60", agentCode: "73DXR", agentName: "SHOPEJU, ZAID" },
  { monthYear: "9/2025", month: 9, year: 2025, superTeamCashFlow: "20779.43", personalCashFlow: "11350.79", agentCode: "73DXR", agentName: "SHOPEJU, ZAID" },
  { monthYear: "10/2025", month: 10, year: 2025, superTeamCashFlow: "62300.19", personalCashFlow: "24129.16", agentCode: "73DXR", agentName: "SHOPEJU, ZAID" },
  { monthYear: "11/2025", month: 11, year: 2025, superTeamCashFlow: "66160.33", personalCashFlow: "48242.63", agentCode: "73DXR", agentName: "SHOPEJU, ZAID" },
  { monthYear: "12/2025", month: 12, year: 2025, superTeamCashFlow: "43245.91", personalCashFlow: "22855.17", agentCode: "73DXR", agentName: "SHOPEJU, ZAID" },
  { monthYear: "1/2026", month: 1, year: 2026, superTeamCashFlow: "13523.39", personalCashFlow: "15958.85", agentCode: "73DXR", agentName: "SHOPEJU, ZAID" },
];

for (const record of records) {
  await db.insert(monthlyTeamCashFlow).values(record).onDuplicateKeyUpdate({
    set: {
      superTeamCashFlow: record.superTeamCashFlow,
      personalCashFlow: record.personalCashFlow,
    },
  });
}

console.log("Inserted", records.length, "monthly cash flow records");
await connection.end();
process.exit(0);
