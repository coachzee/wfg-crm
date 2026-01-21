import Imap from 'imap';
import { simpleParser, ParsedMail } from 'mailparser';
import * as cheerio from 'cheerio';
import { getDb } from './db';
import { agents, agentExamPrep } from '../drizzle/schema';
import { eq, and, like, or, sql } from 'drizzle-orm';

interface GmailCredentials {
  email: string;
  appPassword: string;
}

interface ExamPrepRecord {
  firstName: string;
  lastName: string;
  course: string;
  state: string | null;
  dateEnrolled: Date | null;
  lastLogin: Date | null;
  pleCompletePercent: number;
  preparedToPass: string | null;
}

interface SyncResult {
  success: boolean;
  error?: string;
  emailFound: boolean;
  emailSubject?: string;
  emailReceivedAt?: Date;
  recordsFound: number;
  recordsMatched: number;
  recordsUpdated: number;
  recordsCreated: number;
  unmatchedAgents: string[];
}

// Create IMAP connection configuration
function createImapConfig(credentials: GmailCredentials): Imap.Config {
  return {
    user: credentials.email,
    password: credentials.appPassword,
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false },
  };
}

// Get credentials from environment variables
function getXcelEmailCredentials(): GmailCredentials {
  return {
    email: process.env.MYWFG_EMAIL || 'zaidshopejuwbh@gmail.com',
    appPassword: process.env.MYWFG_APP_PASSWORD || '',
  };
}

// Parse date string from XCEL format (e.g., "01/15/2026" or "Jan 15, 2026")
function parseXcelDate(dateStr: string | null): Date | null {
  if (!dateStr || dateStr.trim() === '' || dateStr === '-' || dateStr === 'N/A') {
    return null;
  }
  
  // Try MM/DD/YYYY format
  const mmddyyyy = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (mmddyyyy) {
    const [, month, day, year] = mmddyyyy;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  
  // Try "Mon DD, YYYY" format
  const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const monDdYyyy = dateStr.match(/([a-z]+)\s+(\d{1,2}),?\s*(\d{4})/i);
  if (monDdYyyy) {
    const [, monthName, day, year] = monDdYyyy;
    const monthIndex = monthNames.indexOf(monthName.toLowerCase().substring(0, 3));
    if (monthIndex >= 0) {
      return new Date(parseInt(year), monthIndex, parseInt(day));
    }
  }
  
  // Try standard Date parsing
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

// Extract state from course name (e.g., "Texas Life & Health" -> "Texas")
function extractStateFromCourse(course: string): string | null {
  // Common state patterns in XCEL course names
  const statePatterns = [
    /^(Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming)/i,
    /^(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\s/i,
  ];
  
  for (const pattern of statePatterns) {
    const match = course.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

// Parse percentage from string (e.g., "75%" -> 75, "75" -> 75)
function parsePercentage(percentStr: string | null): number {
  if (!percentStr || percentStr.trim() === '' || percentStr === '-' || percentStr === 'N/A') {
    return 0;
  }
  
  const match = percentStr.match(/(\d+)/);
  return match ? parseInt(match[1]) : 0;
}

// Parse exam prep data from XCEL Solutions HTML email
function parseXcelEmailHtml(html: string): ExamPrepRecord[] {
  const records: ExamPrepRecord[] = [];
  const $ = cheerio.load(html);
  
  // XCEL emails typically have a table with agent data
  // Look for tables with headers like "First Name", "Last Name", "Course", etc.
  $('table').each((_: number, table: any) => {
    const $table = $(table);
    const headers: string[] = [];
    
    // Get headers from first row (th or first tr with td)
    $table.find('tr:first-child th, tr:first-child td').each((_idx: number, cell: any) => {
      headers.push($(cell).text().trim().toLowerCase());
    });
    
    // Check if this looks like an exam prep table
    const hasFirstName = headers.some(h => h.includes('first') && h.includes('name'));
    const hasLastName = headers.some(h => h.includes('last') && h.includes('name'));
    const hasCourse = headers.some(h => h.includes('course'));
    
    if (!hasFirstName && !hasLastName && !hasCourse) {
      // Try alternative: look for specific column patterns
      if (headers.length >= 5) {
        // Assume standard XCEL format: First Name, Last Name, Course, Date Enrolled, Last Login, %PLE Complete, Prepared to Pass
      } else {
        return; // Skip this table
      }
    }
    
    // Find column indices
    const firstNameIdx = headers.findIndex(h => h.includes('first') && h.includes('name'));
    const lastNameIdx = headers.findIndex(h => h.includes('last') && h.includes('name'));
    const courseIdx = headers.findIndex(h => h.includes('course'));
    const dateEnrolledIdx = headers.findIndex(h => h.includes('enrolled') || h.includes('date enrolled'));
    const lastLoginIdx = headers.findIndex(h => h.includes('login') || h.includes('last log'));
    const pleCompleteIdx = headers.findIndex(h => h.includes('ple') || h.includes('complete') || h.includes('%'));
    const preparedToPassIdx = headers.findIndex(h => h.includes('prepared') || h.includes('pass'));
    
    // Parse data rows (skip header row)
    $table.find('tr').slice(1).each((_: number, row: any) => {
      const cells: string[] = [];
      $(row).find('td').each((_idx: number, cell: any) => {
        cells.push($(cell).text().trim());
      });
      
      if (cells.length < 3) return; // Skip empty rows
      
      // Extract data based on column indices or position
      const firstName = firstNameIdx >= 0 ? cells[firstNameIdx] : cells[0];
      const lastName = lastNameIdx >= 0 ? cells[lastNameIdx] : cells[1];
      const course = courseIdx >= 0 ? cells[courseIdx] : cells[2];
      
      if (!firstName || !lastName || !course) return; // Skip invalid rows
      
      const dateEnrolledStr = dateEnrolledIdx >= 0 ? cells[dateEnrolledIdx] : (cells[3] || null);
      const lastLoginStr = lastLoginIdx >= 0 ? cells[lastLoginIdx] : (cells[4] || null);
      const pleCompleteStr = pleCompleteIdx >= 0 ? cells[pleCompleteIdx] : (cells[5] || null);
      const preparedToPassStr = preparedToPassIdx >= 0 ? cells[preparedToPassIdx] : (cells[6] || null);
      
      records.push({
        firstName,
        lastName,
        course,
        state: extractStateFromCourse(course),
        dateEnrolled: parseXcelDate(dateEnrolledStr),
        lastLogin: parseXcelDate(lastLoginStr),
        pleCompletePercent: parsePercentage(pleCompleteStr),
        preparedToPass: preparedToPassStr || null,
      });
    });
  });
  
  // If no table found, try parsing plain text
  if (records.length === 0) {
    console.log('[XCEL] No table found, attempting plain text parsing...');
    // Plain text parsing logic here if needed
  }
  
  return records;
}

// Parse exam prep data from plain text email
function parseXcelEmailText(text: string): ExamPrepRecord[] {
  const records: ExamPrepRecord[] = [];
  
  // Try to find patterns like "Name: John Doe, Course: Texas Life..."
  // This is a fallback for non-HTML emails
  const lines = text.split('\n');
  let currentRecord: Partial<ExamPrepRecord> = {};
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Look for name patterns
    const nameMatch = trimmed.match(/^([A-Z][a-z]+)\s+([A-Z][a-z]+)/);
    if (nameMatch && !trimmed.includes(':')) {
      // Might be a data row
      const parts = trimmed.split(/\s{2,}|\t/); // Split by multiple spaces or tabs
      if (parts.length >= 3) {
        records.push({
          firstName: parts[0] || '',
          lastName: parts[1] || '',
          course: parts[2] || '',
          state: extractStateFromCourse(parts[2] || ''),
          dateEnrolled: parseXcelDate(parts[3] || null),
          lastLogin: parseXcelDate(parts[4] || null),
          pleCompletePercent: parsePercentage(parts[5] || null),
          preparedToPass: parts[6] || null,
        });
      }
    }
  }
  
  return records;
}

// Search for XCEL Solutions email and parse data
async function fetchXcelEmail(credentials: GmailCredentials): Promise<{
  success: boolean;
  error?: string;
  html?: string;
  text?: string;
  subject?: string;
  receivedAt?: Date;
}> {
  return new Promise((resolve) => {
    const imap = new Imap(createImapConfig(credentials));
    
    imap.once('ready', () => {
      imap.openBox('INBOX', false, (err) => {
        if (err) {
          imap.end();
          resolve({ success: false, error: `Failed to open inbox: ${err.message}` });
          return;
        }
        
        // Search for XCEL Solutions emails from the last 7 days
        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - 7);
        const sinceDateStr = sinceDate.toISOString().split('T')[0];
        
        const searchCriteria: any[] = [
          ['SINCE', sinceDateStr],
          ['SUBJECT', 'XCEL Solutions: WFG_Zaid_Shopeju_Group'],
        ];
        
        imap.search(searchCriteria, (searchErr: Error | null, results: number[]) => {
          if (searchErr) {
            imap.end();
            resolve({ success: false, error: `Search failed: ${searchErr.message}` });
            return;
          }
          
          if (!results || results.length === 0) {
            imap.end();
            resolve({ success: false, error: 'No XCEL Solutions emails found in the last 7 days' });
            return;
          }
          
          // Get the most recent email
          const latestUid = results[results.length - 1];
          const fetch = imap.fetch([latestUid], { bodies: '', markSeen: false });
          
          fetch.on('message', (msg: Imap.ImapMessage) => {
            msg.on('body', (stream: NodeJS.ReadableStream) => {
              simpleParser(stream as any, (parseErr: Error | null, parsed: ParsedMail) => {
                if (parseErr) {
                  resolve({ success: false, error: `Parse failed: ${parseErr.message}` });
                  return;
                }
                
                resolve({
                  success: true,
                  html: parsed.html || undefined,
                  text: parsed.text || undefined,
                  subject: parsed.subject,
                  receivedAt: parsed.date,
                });
              });
            });
          });
          
          fetch.once('error', (fetchErr: Error) => {
            resolve({ success: false, error: `Fetch failed: ${fetchErr.message}` });
          });
          
          fetch.once('end', () => {
            imap.end();
          });
        });
      });
    });
    
    imap.once('error', (err: Error) => {
      resolve({ success: false, error: `Connection failed: ${err.message}` });
    });
    
    imap.connect();
  });
}

// Match exam prep record to agent by name
async function matchAgentByName(firstName: string, lastName: string): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  
  // Normalize names for matching
  const normalizedFirst = firstName.toLowerCase().trim();
  const normalizedLast = lastName.toLowerCase().trim();
  
  // Try exact match first
  const exactMatch = await db.select({ id: agents.id })
    .from(agents)
    .where(
      and(
        sql`LOWER(${agents.firstName}) = ${normalizedFirst}`,
        sql`LOWER(${agents.lastName}) = ${normalizedLast}`
      )
    )
    .limit(1);
  
  if (exactMatch.length > 0) {
    return exactMatch[0].id;
  }
  
  // Try partial match (first name starts with, last name exact)
  const partialMatch = await db.select({ id: agents.id })
    .from(agents)
    .where(
      and(
        sql`LOWER(${agents.firstName}) LIKE ${normalizedFirst + '%'}`,
        sql`LOWER(${agents.lastName}) = ${normalizedLast}`
      )
    )
    .limit(1);
  
  if (partialMatch.length > 0) {
    return partialMatch[0].id;
  }
  
  // Try fuzzy match (contains)
  const fuzzyMatch = await db.select({ id: agents.id })
    .from(agents)
    .where(
      and(
        sql`LOWER(${agents.firstName}) LIKE ${'%' + normalizedFirst + '%'}`,
        sql`LOWER(${agents.lastName}) LIKE ${'%' + normalizedLast + '%'}`
      )
    )
    .limit(1);
  
  return fuzzyMatch.length > 0 ? fuzzyMatch[0].id : null;
}

// Sync exam prep data from XCEL Solutions email
export async function syncExamPrepFromEmail(): Promise<SyncResult> {
  console.log('[XCEL] Starting exam prep sync from email...');
  
  const credentials = getXcelEmailCredentials();
  
  if (!credentials.appPassword) {
    return {
      success: false,
      error: 'Gmail app password not configured',
      emailFound: false,
      recordsFound: 0,
      recordsMatched: 0,
      recordsUpdated: 0,
      recordsCreated: 0,
      unmatchedAgents: [],
    };
  }
  
  // Send email alert about credential access
  try {
    const { sendEmailAlert } = await import('./email-alert');
    await sendEmailAlert({
      subject: 'XCEL Exam Prep Sync - Credential Access',
      message: 'The system is accessing Gmail credentials to sync XCEL Solutions exam prep data.',
    });
  } catch (e) {
    console.error('[XCEL] Failed to send credential access alert:', e);
  }
  
  // Fetch XCEL email
  const emailResult = await fetchXcelEmail(credentials);
  
  if (!emailResult.success) {
    return {
      success: false,
      error: emailResult.error,
      emailFound: false,
      recordsFound: 0,
      recordsMatched: 0,
      recordsUpdated: 0,
      recordsCreated: 0,
      unmatchedAgents: [],
    };
  }
  
  console.log(`[XCEL] Found email: ${emailResult.subject}`);
  
  // Parse exam prep data from email
  let records: ExamPrepRecord[] = [];
  
  if (emailResult.html) {
    records = parseXcelEmailHtml(emailResult.html);
  }
  
  if (records.length === 0 && emailResult.text) {
    records = parseXcelEmailText(emailResult.text);
  }
  
  console.log(`[XCEL] Parsed ${records.length} exam prep records`);
  
  if (records.length === 0) {
    return {
      success: true,
      emailFound: true,
      emailSubject: emailResult.subject,
      emailReceivedAt: emailResult.receivedAt,
      recordsFound: 0,
      recordsMatched: 0,
      recordsUpdated: 0,
      recordsCreated: 0,
      unmatchedAgents: [],
    };
  }
  
  // Process each record
  const db = await getDb();
  if (!db) {
    return {
      success: false,
      error: 'Database connection failed',
      emailFound: true,
      emailSubject: emailResult.subject,
      emailReceivedAt: emailResult.receivedAt,
      recordsFound: records.length,
      recordsMatched: 0,
      recordsUpdated: 0,
      recordsCreated: 0,
      unmatchedAgents: [],
    };
  }
  let recordsMatched = 0;
  let recordsUpdated = 0;
  let recordsCreated = 0;
  const unmatchedAgents: string[] = [];
  
  for (const record of records) {
    // Try to match to an agent
    const agentId = await matchAgentByName(record.firstName, record.lastName);
    
    if (agentId) {
      recordsMatched++;
    } else {
      unmatchedAgents.push(`${record.firstName} ${record.lastName}`);
    }
    
    // Check if record already exists
    const existing = await db.select()
      .from(agentExamPrep)
      .where(
        and(
          sql`LOWER(${agentExamPrep.xcelFirstName}) = ${record.firstName.toLowerCase()}`,
          sql`LOWER(${agentExamPrep.xcelLastName}) = ${record.lastName.toLowerCase()}`,
          eq(agentExamPrep.course, record.course)
        )
      )
      .limit(1);
    
    if (existing.length > 0) {
      // Update existing record
      await db.update(agentExamPrep)
        .set({
          agentId: agentId,
          lastLogin: record.lastLogin,
          pleCompletePercent: record.pleCompletePercent,
          preparedToPass: record.preparedToPass,
          lastSyncedAt: new Date(),
          emailSubject: emailResult.subject,
          emailReceivedAt: emailResult.receivedAt,
        })
        .where(eq(agentExamPrep.id, existing[0].id));
      
      recordsUpdated++;
    } else {
      // Create new record
      const insertData: any = {
        xcelFirstName: record.firstName,
        xcelLastName: record.lastName,
        course: record.course,
        pleCompletePercent: record.pleCompletePercent,
        lastSyncedAt: new Date(),
      };
      
      if (agentId) insertData.agentId = agentId;
      if (record.state) insertData.state = record.state;
      if (record.dateEnrolled) insertData.dateEnrolled = record.dateEnrolled.toISOString().split('T')[0];
      if (record.lastLogin) insertData.lastLogin = record.lastLogin;
      if (record.preparedToPass) insertData.preparedToPass = record.preparedToPass;
      if (emailResult.subject) insertData.emailSubject = emailResult.subject;
      if (emailResult.receivedAt) insertData.emailReceivedAt = emailResult.receivedAt;
      
      await db.insert(agentExamPrep).values(insertData);
      
      recordsCreated++;
    }
  }
  
  console.log(`[XCEL] Sync complete: ${recordsMatched} matched, ${recordsUpdated} updated, ${recordsCreated} created`);
  
  return {
    success: true,
    emailFound: true,
    emailSubject: emailResult.subject,
    emailReceivedAt: emailResult.receivedAt,
    recordsFound: records.length,
    recordsMatched,
    recordsUpdated,
    recordsCreated,
    unmatchedAgents,
  };
}

// Get all exam prep records with recruiter info
export async function getExamPrepRecords() {
  const db = await getDb();
  if (!db) return [];
  
  // First get the basic records with agent info
  const records = await db.select({
    id: agentExamPrep.id,
    agentId: agentExamPrep.agentId,
    xcelFirstName: agentExamPrep.xcelFirstName,
    xcelLastName: agentExamPrep.xcelLastName,
    course: agentExamPrep.course,
    state: agentExamPrep.state,
    dateEnrolled: agentExamPrep.dateEnrolled,
    lastLogin: agentExamPrep.lastLogin,
    pleCompletePercent: agentExamPrep.pleCompletePercent,
    preparedToPass: agentExamPrep.preparedToPass,
    lastSyncedAt: agentExamPrep.lastSyncedAt,
    isActive: agentExamPrep.isActive,
    agentCode: agents.agentCode,
    agentFirstName: agents.firstName,
    agentLastName: agents.lastName,
    uplineAgentId: agents.uplineAgentId,
  })
  .from(agentExamPrep)
  .leftJoin(agents, eq(agentExamPrep.agentId, agents.id))
  .orderBy(agentExamPrep.lastSyncedAt);
  
  // Get all agents to lookup recruiter names
  const allAgents = await db.select({
    id: agents.id,
    firstName: agents.firstName,
    lastName: agents.lastName,
  }).from(agents);
  
  const agentMap = new Map(allAgents.map(a => [a.id, `${a.firstName} ${a.lastName}`]));
  
  // Add recruiter name to each record
  return records.map(record => ({
    ...record,
    recruiterName: record.uplineAgentId ? agentMap.get(record.uplineAgentId) || null : null,
  }));
}
