import { APPLICATIONS, INTELLIGENCE_COMPONENTS, JOB_LISTINGS } from "@/lib/catalog";
import type { ApplicationRecord, JobListing, ResumeComponent } from "@/lib/types";

export const componentStore: ResumeComponent[] = [...INTELLIGENCE_COMPONENTS];
export const jobStore: JobListing[] = [...JOB_LISTINGS];
export const applicationStore: ApplicationRecord[] = [...APPLICATIONS];
