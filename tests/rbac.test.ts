import { describe, expect, it } from "vitest";
import { requirePermission, roleHasPermission } from "@/lib/auth/rbac";
import { ForbiddenError } from "@/lib/http/api-errors";

describe("roleHasPermission", () => {
  it("grants platform scope for super admin", () => {
    expect(roleHasPermission("SUPER_ADMIN", "candidate:generate_resume")).toBe(true);
  });

  it("denies privileged actions for individual candidate", () => {
    expect(roleHasPermission("INDIVIDUAL_CANDIDATE", "components:create")).toBe(false);
  });

  it("allows candidate resume generation for tenant candidate", () => {
    expect(roleHasPermission("TENANT_CANDIDATE", "candidate:generate_resume")).toBe(true);
  });
});

describe("requirePermission", () => {
  it("throws when permission is missing", () => {
    expect(() => requirePermission("TENANT_CANDIDATE", "components:create")).toThrow(ForbiddenError);
  });

  it("does not throw when permission is present", () => {
    expect(() => requirePermission("ADMIN_OPS", "components:create")).not.toThrow();
  });
});
