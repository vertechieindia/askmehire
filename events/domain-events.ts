import { createLogger } from "@/lib/log/logger";
import { tryEnqueueDomainEvent } from "@/lib/queue/enqueue";

const log = createLogger({ subsystem: "domain-events" });

export type DomainEvent =
  | {
      type: "resume.generated";
      tenantId: string;
      requestId: string;
      payload: { resumeId: string; role: string; domain: string };
    }
  | {
      type: "jobs.synced";
      tenantId: string;
      requestId: string;
      payload: { userId: string; count: number };
    }
  | {
      type: "component.created";
      tenantId: string;
      requestId: string;
      payload: { componentId: string };
    }
  | {
      type: "application.created";
      tenantId: string;
      requestId: string;
      payload: { applicationId: string };
    };

export async function emitDomainEvent(event: DomainEvent): Promise<void> {
  log.info({ event }, "domain_event");
  await tryEnqueueDomainEvent(event);
}
