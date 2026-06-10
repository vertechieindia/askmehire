import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { EXTERNAL_CONNECTOR_PLATFORMS, type ExternalConnectorPlatform } from "@/lib/integrations/jobs/types";
import { getSyncConnectorMeta } from "@/lib/integrations/jobs/connector-meta";

export class JobConnectorRepository {
  async ensureDefaults(tenantId: string) {
    for (const portal of EXTERNAL_CONNECTOR_PLATFORMS) {
      const meta = getSyncConnectorMeta(portal);
      if (!meta) {
        continue;
      }
      const existing = await prisma.jobConnector.findFirst({
        where: { tenantId, portalName: portal }
      });
      if (existing) {
        continue;
      }
      await prisma.jobConnector.create({
        data: {
          id: randomUUID(),
          tenantId,
          portalName: portal,
          authMode: meta.authMode,
          applyMode: meta.applyMode,
          status: "not_connected",
          refreshEverySeconds: meta.refreshEverySeconds,
          safetyControls: meta.safetyControls
        }
      });
    }
  }

  async listForTenant(tenantId: string) {
    await this.ensureDefaults(tenantId);
    return prisma.jobConnector.findMany({
      where: { tenantId, portalName: { in: [...EXTERNAL_CONNECTOR_PLATFORMS] } },
      orderBy: { portalName: "asc" }
    });
  }

  async getForTenant(tenantId: string, portal: ExternalConnectorPlatform) {
    await this.ensureDefaults(tenantId);
    return prisma.jobConnector.findFirst({
      where: { tenantId, portalName: portal }
    });
  }

  async connect(tenantId: string, portal: ExternalConnectorPlatform, credentialRef?: string | null) {
    await this.ensureDefaults(tenantId);
    const row = await prisma.jobConnector.findFirst({ where: { tenantId, portalName: portal } });
    if (!row) {
      throw new Error(`Connector not found: ${portal}`);
    }
    return prisma.jobConnector.update({
      where: { id: row.id },
      data: {
        status: "connected",
        credentialRef: credentialRef ?? row.credentialRef,
        lastSyncedAt: row.lastSyncedAt
      }
    });
  }

  async disconnect(tenantId: string, portal: ExternalConnectorPlatform) {
    await this.ensureDefaults(tenantId);
    const row = await prisma.jobConnector.findFirst({ where: { tenantId, portalName: portal } });
    if (!row) {
      throw new Error(`Connector not found: ${portal}`);
    }
    return prisma.jobConnector.update({
      where: { id: row.id },
      data: { status: "not_connected", credentialRef: null }
    });
  }

  async markSynced(tenantId: string, portal: ExternalConnectorPlatform) {
    const row = await prisma.jobConnector.findFirst({ where: { tenantId, portalName: portal } });
    if (!row) {
      return null;
    }
    return prisma.jobConnector.update({
      where: { id: row.id },
      data: { lastSyncedAt: new Date() }
    });
  }
}
