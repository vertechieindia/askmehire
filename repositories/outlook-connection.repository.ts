import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/integrations/outlook/token-crypto";

export class OutlookConnectionRepository {
  async findByUserId(userId: string) {
    return prisma.outlookConnection.findUnique({ where: { userId } });
  }

  async upsert(params: {
    userId: string;
    tenantId: string | null;
    outlookAddress: string;
    refreshToken: string;
  }) {
    const refreshTokenEncrypted = encryptSecret(params.refreshToken);
    return prisma.outlookConnection.upsert({
      where: { userId: params.userId },
      create: {
        id: randomUUID(),
        userId: params.userId,
        tenantId: params.tenantId,
        outlookAddress: params.outlookAddress,
        refreshTokenEncrypted
      },
      update: {
        tenantId: params.tenantId,
        outlookAddress: params.outlookAddress,
        refreshTokenEncrypted
      }
    });
  }

  async deleteByUserId(userId: string) {
    return prisma.outlookConnection.deleteMany({ where: { userId } });
  }

  async touchSync(userId: string) {
    return prisma.outlookConnection.update({
      where: { userId },
      data: { lastSyncAt: new Date() }
    });
  }
}
