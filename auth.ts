import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { writeAuditEvent } from "@/lib/auth/audit";

const loginEmailLimiter = new RateLimiterMemory({ points: 8, duration: 900 });

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(512)
});

function auditTenantId(user: { tenantId: string | null }): string | null {
  if (user.tenantId) {
    return user.tenantId;
  }
  const d = process.env.DEFAULT_TENANT_ID?.trim();
  if (d && /^[0-9a-f-]{36}$/i.test(d)) {
    return d;
  }
  return null;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8,
    updateAge: 60 * 15
  },
  providers: [
    Credentials({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      authorize: async (credentials) => {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }
        const email = parsed.data.email.trim().toLowerCase();
        try {
          await loginEmailLimiter.consume(email, 1);
        } catch {
          return null;
        }

        const user = await prisma.user.findFirst({
          where: { email: { equals: email, mode: "insensitive" } }
        });
        if (!user?.passwordHash) {
          return null;
        }
        if (user.status !== "active") {
          return null;
        }
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          const tid = auditTenantId(user);
          if (tid) {
            await writeAuditEvent({
              tenantId: tid,
              actorId: user.id,
              action: "auth.login.blocked",
              entityType: "user",
              entityId: user.id,
              payload: { reason: "account_locked" },
              severity: "warning"
            });
          }
          return null;
        }

        const valid = await verifyPassword(user.passwordHash, parsed.data.password);
        if (!valid) {
          const fails = user.failedLoginAttempts + 1;
          const lockedUntil = fails >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : user.lockedUntil;
          await prisma.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: fails, lockedUntil }
          });
          const tid = auditTenantId(user);
          if (tid) {
            await writeAuditEvent({
              tenantId: tid,
              actorId: user.id,
              action: "auth.login.failed",
              entityType: "user",
              entityId: user.id,
              payload: { fails },
              severity: fails >= 5 ? "warning" : "info"
            });
          }
          return null;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: 0, lockedUntil: null }
        });
        const tid = auditTenantId(user);
        if (tid) {
          await writeAuditEvent({
            tenantId: tid,
            actorId: user.id,
            action: "auth.login.success",
            entityType: "user",
            entityId: user.id
          });
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
          portalKey: user.portalKey,
          image: user.image ?? undefined
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email ?? undefined;
        token.name = user.name ?? undefined;
        token.role = user.role;
        token.tenantId = user.tenantId;
        token.portalKey = user.portalKey ?? null;
        token.actorSub = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = (token.role as string) ?? "INDIVIDUAL_CANDIDATE";
        session.user.tenantId = (token.tenantId as string | null) ?? null;
        session.user.portalKey = (token.portalKey as string | null) ?? null;
      }
      return session;
    }
  }
});
