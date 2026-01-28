import { memo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Send, RefreshCw, AlertCircle, CalendarClock, X, Mail } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

// Email Tracking Widget - Shows anniversary email open/click statistics with resend capability
export const EmailTrackingWidget = memo(function EmailTrackingWidget() {
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [showResendSection, setShowResendSection] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState<{
    trackingId: string;
    recipientName: string | null;
    recipientEmail: string;
    daysSinceSent: number;
    resendCount: number;
    subject: string | null;
    relatedEntityId: string | null;
    metadata: Record<string, unknown> | null;
  } | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState({
    greetingMessage: "",
    personalNote: "",
    closingMessage: "",
  });
  const [sendOption, setSendOption] = useState<"now" | "schedule">("now");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const utils = trpc.useUtils();
  
  const { data: stats, isLoading } = trpc.dashboard.getAnniversaryEmailStats.useQuery(undefined, {
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });
  
  const { data: eligibleForResend } = trpc.dashboard.getEmailsEligibleForResend.useQuery(
    { daysThreshold: 3 },
    { enabled: showResendSection, staleTime: 60000 }
  );
  
  const resendMutation = trpc.dashboard.resendAnniversaryEmail.useMutation({
    onSuccess: () => {
      toast.success("Email resent successfully!");
      utils.dashboard.getAnniversaryEmailStats.invalidate();
      utils.dashboard.getEmailsEligibleForResend.invalidate();
      utils.dashboard.getScheduledEmails.invalidate();
      setResendingId(null);
    },
    onError: (error) => {
      toast.error(`Failed to resend: ${error.message}`);
      setResendingId(null);
    },
  });

  const scheduleMutation = trpc.dashboard.scheduleEmail.useMutation({
    onSuccess: () => {
      toast.success("Email scheduled successfully!");
      utils.dashboard.getScheduledEmails.invalidate();
      utils.dashboard.getEmailsEligibleForResend.invalidate();
      setResendingId(null);
    },
    onError: (error) => {
      toast.error(`Failed to schedule: ${error.message}`);
      setResendingId(null);
    },
  });

  const { data: scheduledEmails } = trpc.dashboard.getScheduledEmails.useQuery(
    undefined,
    { enabled: showResendSection, staleTime: 60000 }
  );

  const cancelScheduleMutation = trpc.dashboard.cancelScheduledEmail.useMutation({
    onSuccess: () => {
      toast.success("Scheduled email cancelled");
      utils.dashboard.getScheduledEmails.invalidate();
      utils.dashboard.getEmailsEligibleForResend.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to cancel: ${error.message}`);
    },
  });
  
  const getDefaultContent = (email: typeof confirmEmail) => {
    if (!email) return { greetingMessage: "", personalNote: "", closingMessage: "" };
    const policyAge = email.metadata?.policyAge ? Number(email.metadata.policyAge) : 1;
    const ordinalSuffix = (n: number) => {
      const s = ['th', 'st', 'nd', 'rd'];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };
    return {
      greetingMessage: `Congratulations on your ${ordinalSuffix(policyAge)} policy anniversary! We want to take a moment to thank you for trusting us with your family's financial protection.`,
      personalNote: "",
      closingMessage: "Thank you for being part of our family. We're honored to help protect what matters most to you.",
    };
  };

  const handleResendClick = (email: {
    trackingId: string;
    recipientName: string | null;
    recipientEmail: string;
    daysSinceSent: number;
    resendCount: number;
    subject: string | null;
    relatedEntityId: string | null;
    metadata: Record<string, unknown> | null;
  }) => {
    setConfirmEmail(email);
    setEditedContent(getDefaultContent(email));
    setIsEditMode(false);
    setSendOption("now");
    setScheduledDate("");
    setScheduledTime("");
  };

  const handleConfirmResend = () => {
    if (!confirmEmail) return;
    setResendingId(confirmEmail.trackingId);
    
    const defaultContent = getDefaultContent(confirmEmail);
    const hasCustomContent = 
      editedContent.greetingMessage !== defaultContent.greetingMessage ||
      editedContent.personalNote !== "" ||
      editedContent.closingMessage !== defaultContent.closingMessage;
    
    const customContent = hasCustomContent ? {
      greetingMessage: editedContent.greetingMessage || undefined,
      personalNote: editedContent.personalNote || undefined,
      closingMessage: editedContent.closingMessage || undefined,
    } : undefined;

    if (sendOption === "schedule" && scheduledDate && scheduledTime) {
      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
      scheduleMutation.mutate({
        trackingId: confirmEmail.trackingId,
        scheduledFor: scheduledDateTime.getTime(),
        customContent,
      });
    } else {
      resendMutation.mutate({ 
        trackingId: confirmEmail.trackingId,
        customContent,
      });
    }
    setConfirmEmail(null);
    setIsEditMode(false);
    setSendOption("now");
    setScheduledDate("");
    setScheduledTime("");
  };

  const handleCancelResend = () => {
    setConfirmEmail(null);
    setIsEditMode(false);
    setEditedContent({ greetingMessage: "", personalNote: "", closingMessage: "" });
    setSendOption("now");
    setScheduledDate("");
    setScheduledTime("");
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-purple-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Send className="h-5 w-5 text-purple-600" />
            Anniversary Email Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const { thisWeek, thisMonth, total, recentEmails } = stats;
  const weekOpenRate = thisWeek.sent > 0 ? Math.round((thisWeek.opened / thisWeek.sent) * 100) : 0;
  const monthOpenRate = thisMonth.sent > 0 ? Math.round((thisMonth.opened / thisMonth.sent) * 100) : 0;
  const totalOpenRate = total.sent > 0 ? Math.round((total.opened / total.sent) * 100) : 0;
  const totalClickRate = total.sent > 0 ? Math.round((total.clicked / total.sent) * 100) : 0;

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-indigo-50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Send className="h-5 w-5 text-purple-600" />
              Anniversary Email Tracking
            </CardTitle>
            <CardDescription>Track client engagement with anniversary greeting emails</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowResendSection(!showResendSection)}
            className="text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            {showResendSection ? "Hide" : "Show"} Resend
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <p className="text-xs text-muted-foreground">This Week</p>
            <p className="text-xl font-bold text-purple-600">{thisWeek.sent}</p>
            <p className="text-xs text-muted-foreground">sent</p>
            <div className="mt-1 flex items-center gap-1">
              <span className="text-xs text-green-600">{weekOpenRate}% opened</span>
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <p className="text-xs text-muted-foreground">This Month</p>
            <p className="text-xl font-bold text-indigo-600">{thisMonth.sent}</p>
            <p className="text-xs text-muted-foreground">sent</p>
            <div className="mt-1 flex items-center gap-1">
              <span className="text-xs text-green-600">{monthOpenRate}% opened</span>
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <p className="text-xs text-muted-foreground">All Time</p>
            <p className="text-xl font-bold text-gray-700">{total.sent}</p>
            <p className="text-xs text-muted-foreground">sent</p>
            <div className="mt-1 flex items-center gap-1">
              <span className="text-xs text-green-600">{totalOpenRate}% opened</span>
            </div>
          </div>
        </div>

        {/* Engagement Metrics */}
        <div className="bg-white rounded-lg p-3 shadow-sm">
          <p className="text-sm font-medium mb-2">Overall Engagement</p>
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Open Rate</span>
                <span className="font-medium">{totalOpenRate}%</span>
              </div>
              <Progress value={totalOpenRate} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Click Rate</span>
                <span className="font-medium">{totalClickRate}%</span>
              </div>
              <Progress value={totalClickRate} className="h-2" />
            </div>
          </div>
        </div>
        
        {/* Resend Section */}
        {showResendSection && (
          <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <p className="text-sm font-medium text-amber-800">Emails Not Opened (3+ days)</p>
            </div>
            {eligibleForResend && eligibleForResend.length > 0 ? (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {eligibleForResend.map((email) => (
                  <div key={email.trackingId} className="flex items-center justify-between bg-white rounded-lg p-2 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-amber-400" />
                      <div>
                        <p className="text-sm font-medium truncate max-w-[120px]">
                          {email.recipientName || email.recipientEmail}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {email.daysSinceSent} days ago • {email.resendCount > 0 ? `Resent ${email.resendCount}x` : "Not resent"}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResendClick({
                        ...email,
                        metadata: (email as { metadata?: Record<string, unknown> | null }).metadata ?? null,
                      })}
                      disabled={resendingId === email.trackingId || email.resendCount >= 2}
                      className="text-xs h-7"
                    >
                      {resendingId === email.trackingId ? (
                        <><RefreshCw className="h-3 w-3 mr-1 animate-spin" /> Sending...</>
                      ) : email.resendCount >= 2 ? (
                        "Max resends"
                      ) : (
                        <><Send className="h-3 w-3 mr-1" /> Resend</>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-amber-700">All recent emails have been opened!</p>
            )}

            {/* Scheduled Emails */}
            {scheduledEmails && scheduledEmails.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium text-purple-700 mb-2 flex items-center gap-1">
                  <CalendarClock className="h-4 w-4" /> Scheduled Emails ({scheduledEmails.length})
                </p>
                <div className="space-y-2">
                  {scheduledEmails.map((email) => (
                    <div key={email.id} className="flex items-center justify-between bg-purple-50 rounded-lg p-2">
                      <div className="flex items-center gap-2">
                        <CalendarClock className="h-4 w-4 text-purple-500" />
                        <div>
                          <p className="text-sm font-medium truncate max-w-[120px]">
                            {email.recipientName || email.recipientEmail}
                          </p>
                          <p className="text-xs text-purple-600">
                            {format(new Date(email.scheduledFor), 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => cancelScheduleMutation.mutate({ scheduledId: email.id })}
                        className="text-xs h-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-3 w-3 mr-1" /> Cancel
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recent Emails */}
        {recentEmails && recentEmails.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Recent Emails</p>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {recentEmails.slice(0, 5).map((email: { recipientName: string | null; recipientEmail: string; policyNumber: string | null; sentAt: Date | null; opened: boolean; clicked: boolean }, index: number) => (
                <div key={index} className="flex items-center justify-between bg-white rounded-lg p-2 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${email.opened ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <div>
                      <p className="text-sm font-medium truncate max-w-[150px]">
                        {email.recipientName || email.recipientEmail}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {email.sentAt ? format(new Date(email.sentAt), 'MMM d, h:mm a') : 'Pending'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {email.opened && (
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                        Opened
                      </Badge>
                    )}
                    {email.clicked && (
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                        Clicked
                      </Badge>
                    )}
                    {!email.opened && !email.clicked && (
                      <Badge variant="outline" className="text-xs bg-gray-50 text-gray-500">
                        Sent
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {total.sent === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <Send className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No anniversary emails sent yet</p>
            <p className="text-xs">Emails are automatically sent on policy anniversaries</p>
          </div>
        )}

        {/* Resend Confirmation Dialog */}
        <Dialog open={!!confirmEmail} onOpenChange={(open) => !open && handleCancelResend()}>
          <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-purple-600" />
                {isEditMode ? "Edit Email Content" : "Confirm Email Resend"}
              </DialogTitle>
              <DialogDescription>
                {isEditMode ? "Customize the email content before sending." : "Review the email content below before resending."}
              </DialogDescription>
            </DialogHeader>
            {confirmEmail && (
              <div className="space-y-4 py-2">
                {/* Recipient Info */}
                <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">To:</span>
                    <span className="font-medium">{confirmEmail.recipientName || confirmEmail.recipientEmail}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span className="font-mono text-xs">{confirmEmail.recipientEmail}</span>
                  </div>
                  {confirmEmail.relatedEntityId && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Policy:</span>
                      <span className="font-mono text-xs">{confirmEmail.relatedEntityId}</span>
                    </div>
                  )}
                </div>

                {/* Edit/Preview Toggle */}
                <div className="flex gap-2">
                  <Button
                    variant={isEditMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsEditMode(true)}
                    className="flex-1"
                  >
                    <Mail className="h-4 w-4 mr-2" /> Edit Content
                  </Button>
                  <Button
                    variant={!isEditMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsEditMode(false)}
                    className="flex-1"
                  >
                    Preview
                  </Button>
                </div>

                {/* Edit Mode */}
                {isEditMode ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Greeting Message</label>
                      <textarea
                        value={editedContent.greetingMessage}
                        onChange={(e) => setEditedContent(prev => ({ ...prev, greetingMessage: e.target.value }))}
                        className="w-full mt-1 p-2 text-sm border rounded-md min-h-[80px] focus:ring-2 focus:ring-purple-500"
                        placeholder="Enter greeting message..."
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Personal Note (Optional)</label>
                      <textarea
                        value={editedContent.personalNote}
                        onChange={(e) => setEditedContent(prev => ({ ...prev, personalNote: e.target.value }))}
                        className="w-full mt-1 p-2 text-sm border rounded-md min-h-[60px] focus:ring-2 focus:ring-purple-500"
                        placeholder="Add a personal touch..."
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Closing Message</label>
                      <textarea
                        value={editedContent.closingMessage}
                        onChange={(e) => setEditedContent(prev => ({ ...prev, closingMessage: e.target.value }))}
                        className="w-full mt-1 p-2 text-sm border rounded-md min-h-[60px] focus:ring-2 focus:ring-purple-500"
                        placeholder="Enter closing message..."
                      />
                    </div>
                  </div>
                ) : (
                  /* Preview Mode */
                  <div className="bg-white border rounded-lg p-4 space-y-3">
                    <div className="border-b pb-3">
                      <p className="text-xs text-muted-foreground mb-1">Subject:</p>
                      <p className="font-medium text-sm">{confirmEmail.subject || "Happy Policy Anniversary!"}</p>
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed">
                      {editedContent.greetingMessage || getDefaultContent(confirmEmail).greetingMessage}
                    </p>
                    {editedContent.personalNote && (
                      <div className="bg-purple-50 border-l-4 border-purple-500 p-3 rounded-r-md">
                        <p className="text-gray-600 text-xs italic leading-relaxed">
                          {editedContent.personalNote}
                        </p>
                      </div>
                    )}
                    <p className="text-gray-600 text-xs leading-relaxed">
                      {editedContent.closingMessage || getDefaultContent(confirmEmail).closingMessage}
                    </p>
                  </div>
                )}

                {/* Scheduling Options */}
                <div className="border rounded-lg p-3 space-y-3">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="sendOption"
                        checked={sendOption === "now"}
                        onChange={() => setSendOption("now")}
                        className="w-4 h-4 text-purple-600"
                      />
                      <Send className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium">Send Now</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="sendOption"
                        checked={sendOption === "schedule"}
                        onChange={() => setSendOption("schedule")}
                        className="w-4 h-4 text-purple-600"
                      />
                      <CalendarClock className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium">Schedule for Later</span>
                    </label>
                  </div>
                  
                  {sendOption === "schedule" && (
                    <div className="flex gap-2 pt-2">
                      <div className="flex-1">
                        <label className="text-xs text-muted-foreground block mb-1">Date</label>
                        <input
                          type="date"
                          value={scheduledDate}
                          onChange={(e) => setScheduledDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full text-sm border rounded-md p-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-muted-foreground block mb-1">Time</label>
                        <input
                          type="time"
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                          className="w-full text-sm border rounded-md p-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  {sendOption === "schedule" 
                    ? (scheduledDate && scheduledTime 
                        ? `Email will be sent on ${new Date(`${scheduledDate}T${scheduledTime}`).toLocaleString()}`
                        : "Select a date and time to schedule the email")
                    : (isEditMode ? "Switch to Preview Mode to see how your email will look." : "A new email will be sent with fresh tracking.")}
                </p>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={handleCancelResend}>
                Cancel
              </Button>
              <Button 
                onClick={handleConfirmResend} 
                className="bg-purple-600 hover:bg-purple-700"
                disabled={sendOption === "schedule" && (!scheduledDate || !scheduledTime)}
              >
                {sendOption === "schedule" ? (
                  <><CalendarClock className="h-4 w-4 mr-2" /> Schedule Email</>
                ) : (
                  <><Send className="h-4 w-4 mr-2" /> {isEditMode ? "Send Edited Email" : "Confirm Resend"}</>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
});
