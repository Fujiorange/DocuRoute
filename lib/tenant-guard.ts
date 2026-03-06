import { getCurrentUser } from "./auth";

/**
 * Verify that a resource belongs to the authenticated user's company.
 * Call this in every API route that accesses a document, folder, project, or comment by ID.
 * Returns the resource if allowed, throws a 403-shaped error if not.
 */
export async function guardResourceAccess<T extends { companyId: string }>(
  resource: T | null,
  userCompanyId: string,
  resourceName: string = "Resource"
): Promise<T> {
  if (!resource) {
    throw Object.assign(new Error(`${resourceName} not found`), { statusCode: 404 });
  }
  if (resource.companyId !== userCompanyId) {
    // Do NOT reveal the resource exists — return 404 to prevent enumeration
    throw Object.assign(new Error(`${resourceName} not found`), { statusCode: 404 });
  }
  return resource;
}
