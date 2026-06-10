import { adzunaJobAdapter } from "@/lib/integrations/jobs/adzuna.adapter";
import { greenhouseJobAdapter } from "@/lib/integrations/jobs/greenhouse.adapter";
import { jsearchJobAdapter } from "@/lib/integrations/jobs/jsearch.adapter";
import { joobleJobAdapter } from "@/lib/integrations/jobs/jooble.adapter";
import { leverJobAdapter } from "@/lib/integrations/jobs/lever.adapter";
import type { JobConnectorAdapter } from "@/lib/integrations/jobs/types";

export const JOB_CONNECTOR_ADAPTERS: Record<JobConnectorAdapter["portal"], JobConnectorAdapter> = {
  Greenhouse: greenhouseJobAdapter,
  Lever: leverJobAdapter,
  Adzuna: adzunaJobAdapter,
  JSearch: jsearchJobAdapter,
  Jooble: joobleJobAdapter
};

export function getJobConnectorAdapter(portal: JobConnectorAdapter["portal"]) {
  return JOB_CONNECTOR_ADAPTERS[portal];
}
