import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/integrations/gmail/token-crypto";

export class GmailConnectionRepository {
  async findByUserId(userId: string) {
    return prisma.gmailConnection.findUnique({ where: { userId } });
  }

  async upsert(params: {
    userId: string;
    tenantId: string | null;
    gmailAddress: string;
    refreshToken: string;
  }) {
    const refreshTokenEncrypted = encryptSecret(params.refreshToken);
    return prisma.gmailConnection.upsert({
      where: { userId: params.userId },
      create: {
        id: randomUUID(),
        userId: params.userId,
        tenantId: params.tenantId,
        gmailAddress: params.gmailAddress,
        refreshTokenEncrypted
      },
      update: {
        tenantId: params.tenantId,
        gmailAddress: params.gmailAddress,
        refreshTokenEncrypted
      }
    });
  }

  async deleteByUserId(userId: string) {
    return prisma.gmailConnection.deleteMany({ where: { userId } });
  }

  async touchSync(userId: string, historyId?: string) {
    return prisma.gmailConnection.update({
      where: { userId },
      data: {
        lastSyncAt: new Date(),
        ...(historyId ? { historyId } : {})
      }
    });
  }
}
