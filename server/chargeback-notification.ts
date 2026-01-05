import { notifyOwner } from "./_core/notification";

// Transamerica Policy Alert Types
export interface PolicyAlert {
  policyNumber: string;
  ownerName: string;
  alertDate: string;
  alertType: string;
}

export interface TransamericaAlerts {
  totalUnreadAlerts: number;
  reversedPremiumPayments: PolicyAlert[];
  eftRemovals: PolicyAlert[];
  lastSyncDate: string;
}

// Format currency for display
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Build notification content for chargeback alerts
function buildChargebackNotificationContent(alerts: TransamericaAlerts): string {
  const lines: string[] = [];
  
  lines.push("🚨 TRANSAMERICA CHARGEBACK ALERTS 🚨");
  lines.push("");
  lines.push(`Total Unread Alerts: ${alerts.totalUnreadAlerts}`);
  lines.push("");
  
  if (alerts.reversedPremiumPayments.length > 0) {
    lines.push("⚠️ REVERSED PREMIUM PAYMENTS:");
    alerts.reversedPremiumPayments.forEach((alert, index) => {
      lines.push(`${index + 1}. ${alert.ownerName}`);
      lines.push(`   Policy #${alert.policyNumber}`);
      lines.push(`   Date: ${alert.alertDate}`);
    });
    lines.push("");
  }
  
  if (alerts.eftRemovals.length > 0) {
    lines.push("⚠️ REMOVED FROM EFT:");
    alerts.eftRemovals.forEach((alert, index) => {
      lines.push(`${index + 1}. ${alert.ownerName}`);
      lines.push(`   Policy #${alert.policyNumber}`);
      lines.push(`   Date: ${alert.alertDate}`);
    });
    lines.push("");
  }
  
  lines.push("ACTION REQUIRED: Contact these clients immediately to prevent policy lapse and commission chargebacks.");
  lines.push("");
  lines.push(`Last Sync: ${new Date(alerts.lastSyncDate).toLocaleString()}`);
  
  return lines.join("\n");
}

// Send chargeback notification to project owner via Manus
export async function sendChargebackNotification(alerts: TransamericaAlerts): Promise<boolean> {
  // Only send notification if there are actual alerts
  if (alerts.reversedPremiumPayments.length === 0 && alerts.eftRemovals.length === 0) {
    console.log("[Chargeback Notification] No alerts to notify about");
    return true;
  }
  
  const title = `🚨 ${alerts.reversedPremiumPayments.length} Chargeback Alert(s) - Action Required`;
  const content = buildChargebackNotificationContent(alerts);
  
  try {
    const success = await notifyOwner({ title, content });
    if (success) {
      console.log("[Chargeback Notification] Successfully sent notification to owner");
    } else {
      console.warn("[Chargeback Notification] Failed to send notification");
    }
    return success;
  } catch (error) {
    console.error("[Chargeback Notification] Error sending notification:", error);
    return false;
  }
}

// Check if there are new alerts compared to previous state
export function hasNewAlerts(
  currentAlerts: TransamericaAlerts,
  previousAlerts: TransamericaAlerts | null
): boolean {
  if (!previousAlerts) {
    return currentAlerts.reversedPremiumPayments.length > 0 || currentAlerts.eftRemovals.length > 0;
  }
  
  // Check for new reversed premium payments
  const newReversals = currentAlerts.reversedPremiumPayments.filter(
    current => !previousAlerts.reversedPremiumPayments.some(
      prev => prev.policyNumber === current.policyNumber && prev.alertDate === current.alertDate
    )
  );
  
  // Check for new EFT removals
  const newEftRemovals = currentAlerts.eftRemovals.filter(
    current => !previousAlerts.eftRemovals.some(
      prev => prev.policyNumber === current.policyNumber && prev.alertDate === current.alertDate
    )
  );
  
  return newReversals.length > 0 || newEftRemovals.length > 0;
}

// Get current Transamerica alerts from the dashboard metrics
// This is the static data extracted from Transamerica portal
export function getCurrentTransamericaAlerts(): TransamericaAlerts {
  return {
    totalUnreadAlerts: 39,
    reversedPremiumPayments: [
      { policyNumber: '6602249306', ownerName: 'OLUWAMUYIWA ONAMUTI', alertDate: '01/01/2026', alertType: 'Reversed premium payment' },
      { policyNumber: '6602037542', ownerName: 'OLATUNDE OYEWANDE', alertDate: '12/27/2025', alertType: 'Reversed premium payment' },
      { policyNumber: '6602103743', ownerName: 'BEN WALKER', alertDate: '12/25/2025', alertType: 'Reversed premium payment' },
    ],
    eftRemovals: [
      { policyNumber: '6602249306', ownerName: 'OLUWAMUYIWA ONAMUTI', alertDate: '01/01/2026', alertType: 'Policy removed from Electronic Funds Transfer' },
      { policyNumber: '6602122713', ownerName: 'OLUWAKEMISOLA OYEWANDE', alertDate: '01/01/2026', alertType: 'Policy removed from Electronic Funds Transfer' },
    ],
    lastSyncDate: '2026-01-04T23:58:00Z',
  };
}
