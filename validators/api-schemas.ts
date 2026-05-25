import { z } from "zod";

export const resumeStrategySchema = z.enum([
  "ATS-heavy",
  "recruiter-readable",
  "consulting-style",
  "contract-focused",
  "federal-focused"
]);

export const resumeGenerationRequestSchema = z.object({
  fullName: z.string().min(1),
  targetTitle: z.string().min(1),
  email: z.string().min(3),
  phone: z.string().optional().default(""),
  linkedin: z.string().optional().default(""),
  resumeText: z.string().optional().default(""),
  jobDescription: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(40, "A usable job description is required.")),
  strategy: resumeStrategySchema.optional().default("recruiter-readable")
});

export const jobSyncRequestSchema = z.object({
  profile: z.any().optional(),
  existing: z.array(z.any()).optional(),
  cycle: z.number().int().optional(),
  user: z
    .object({
      id: z.string().min(1),
      name: z.string(),
      email: z.string().email(),
      title: z.string()
    })
    .optional()
});

export const componentCreateSchema = z.object({
  role: z.string().min(1),
  technology: z.string().min(1),
  domain: z.string().min(1),
  timelineStart: z.coerce.number().int(),
  timelineEnd: z.coerce.number().int(),
  intent: z.string().min(1),
  baseLogic: z.string().min(1),
  componentType: z.string().optional(),
  variations: z.array(z.string()).optional(),
  qualityScore: z.coerce.number().optional(),
  freshnessScore: z.coerce.number().optional(),
  deprecationScore: z.coerce.number().optional(),
  tags: z.array(z.string()).optional()
});

const APPLICATION_STATUSES = [
  "Saved",
  "Applied",
  "Recruiter Viewed",
  "Interview Scheduled",
  "Rejected",
  "Offer",
  "Closed"
] as const;

const applicationStatusSchema = z.enum(APPLICATION_STATUSES);

export const applicationCreateSchema = z.object({
  jobId: z.string().min(1),
  resumeId: z.string().min(1),
  status: applicationStatusSchema.optional(),
  atsScore: z.coerce.number().optional(),
  realismScore: z.coerce.number().optional(),
  artifacts: z
    .object({
      resumeDocx: z.string(),
      jdSnapshot: z.string(),
      coverLetter: z.string()
    })
    .optional()
});

export const resumeDocxRequestSchema = z.object({
  input: z.object({
    fullName: z.string().min(1),
    jobTitle: z.string().min(1),
    email: z.string(),
    phone: z.string(),
    linkedin: z.string(),
    clients: z
      .array(
        z.object({
          id: z.string().min(1),
          clientName: z.string().min(1),
          location: z.string(),
          timeline: z.string(),
          jobTitle: z.string()
        })
      )
      .min(1)
  })
});

const mailThreadStatusSchema = z.enum([
  "draft",
  "approval_requested",
  "approved",
  "sent",
  "incoming",
  "reply_drafted"
]);

export const mailThreadCreateSchema = z.object({
  jobId: z.string().optional(),
  contactName: z.string().min(1),
  contactEmail: z.string().email(),
  company: z.string().optional(),
  subject: z.string().min(1),
  draft: z.string().min(1)
});

export const mailThreadStatusUpdateSchema = z.object({
  threadId: z.string().uuid(),
  status: mailThreadStatusSchema
});

export const mailSendSchema = z.object({
  threadId: z.string().uuid()
});
