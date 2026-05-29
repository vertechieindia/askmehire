import type { MailThread } from "@/lib/portal";

export type MailReplyTemplate = {
  id: string;
  label: string;
  body: string;
  contexts: Array<"incoming" | "follow_up" | "scheduling" | "general">;
};

function fillTemplate(body: string, thread: MailThread, jobTitle?: string): string {
  return body
    .replace(/\{contactName\}/g, thread.contactName.split(" ")[0] || thread.contactName)
    .replace(/\{company\}/g, thread.company || "your company")
    .replace(/\{subject\}/g, thread.subject)
    .replace(/\{jobTitle\}/g, jobTitle || "the role");
}

export const MAIL_REPLY_TEMPLATES: MailReplyTemplate[] = [
  {
    id: "thanks-interested",
    label: "Thanks — interested",
    contexts: ["incoming", "general"],
    body: "Hi {contactName},\n\nThank you for reaching out. I am very interested and would welcome a chance to discuss how my background fits {company}.\n\nBest regards"
  },
  {
    id: "schedule-call",
    label: "Schedule a call",
    contexts: ["incoming", "scheduling"],
    body: "Hi {contactName},\n\nThanks for your message. I am available for a brief call this week — please share a few times that work for you and I will confirm.\n\nBest regards"
  },
  {
    id: "share-summary",
    label: "Share experience summary",
    contexts: ["incoming", "general"],
    body: "Hi {contactName},\n\nHappy to share more detail. My recent work aligns with {jobTitle} through hands-on delivery, cross-team collaboration, and production support in regulated environments. I can send a tailored summary if helpful.\n\nBest regards"
  },
  {
    id: "follow-up-application",
    label: "Follow up on application",
    contexts: ["follow_up", "general"],
    body: "Hi {contactName},\n\nI wanted to follow up on my application for {jobTitle} at {company}. I remain very interested and would appreciate any update on next steps.\n\nThank you,\n"
  },
  {
    id: "availability-soon",
    label: "Available this week",
    contexts: ["scheduling", "incoming"],
    body: "Hi {contactName},\n\nThank you for the note. I can make time for a conversation this week — mornings or early afternoons work best on my side.\n\nBest regards"
  }
];

export function suggestReplyTemplates(thread: MailThread, jobTitle?: string, limit = 4): Array<MailReplyTemplate & { bodyFilled: string }> {
  const last = thread.lastMessage.toLowerCase();
  const isIncoming = thread.direction === "incoming" || thread.status === "incoming";
  const wantsSchedule = /schedule|call|interview|meet|availability|time slot/.test(last);
  const wantsDetail = /summary|experience|background|detail|share/.test(last);

  const scored = MAIL_REPLY_TEMPLATES.map((template) => {
    let score = 0;
    if (isIncoming && template.contexts.includes("incoming")) score += 2;
    if (!isIncoming && template.contexts.includes("follow_up")) score += 2;
    if (wantsSchedule && template.contexts.includes("scheduling")) score += 3;
    if (wantsDetail && template.id === "share-summary") score += 3;
    if (template.contexts.includes("general")) score += 1;
    return { template, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ template }) => ({
      ...template,
      bodyFilled: fillTemplate(template.body, thread, jobTitle)
    }));
}
