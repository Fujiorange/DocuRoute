/**
 * Reusable pagination utility for API endpoints
 * Provides consistent pagination across all list endpoints
 */

export interface PaginationParams {
  page?: number
  limit?: number
  maxLimit?: number
}

export interface PaginationResult<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
    hasMore: boolean
  }
}

/**
 * Parse and validate pagination query parameters
 * @param searchParams - URLSearchParams from request
 * @param defaults - Default values for page and limit
 * @returns Validated pagination parameters
 */
export function parsePaginationParams(
  searchParams: URLSearchParams,
  defaults = { page: 1, limit: 50, maxLimit: 100 }
): { page: number; limit: number; skip: number } {
  const page = Math.max(1, parseInt(searchParams.get('page') || String(defaults.page)))
  const limit = Math.min(
    Math.max(1, parseInt(searchParams.get('limit') || String(defaults.limit))),
    defaults.maxLimit
  )
  const skip = (page - 1) * limit

  return { page, limit, skip }
}

/**
 * Build pagination response object
 * @param data - Array of results
 * @param total - Total count of records
 * @param page - Current page number
 * @param limit - Items per page
 * @returns Formatted pagination response
 */
export function buildPaginationResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginationResult<T> {
  const pages = Math.ceil(total / limit)
  const hasMore = page < pages

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      pages,
      hasMore,
    },
  }
}

/**
 * Helper to execute paginated query with count
 * Runs findMany and count in parallel for efficiency
 * @param findMany - Prisma findMany query function
 * @param count - Prisma count query function
 * @param page - Current page number
 * @param limit - Items per page
 * @returns Formatted pagination response
 */
export async function executePaginatedQuery<T>(
  findMany: () => Promise<T[]>,
  count: () => Promise<number>,
  page: number,
  limit: number
): Promise<PaginationResult<T>> {
  const [data, total] = await Promise.all([findMany(), count()])
  return buildPaginationResponse(data, total, page, limit)
}
