import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: string;
    tenantId: string | null;
    portalKey: string | null;
  }

  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: string;
      tenantId: string | null;
      portalKey: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    tenantId?: string | null;
    portalKey?: string | null;
    actorSub?: string;
  }
}
