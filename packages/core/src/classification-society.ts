/**
 * Classification Society API Client - Extensible Architecture
 *
 * Phase 3 ready: When classification societies (ABS, DNV, LR, BV) expose APIs,
 * DocuRoute can submit packages automatically and receive webhook status updates.
 *
 * Current implementation: Manual submission with webhook readiness.
 */

import { prismaAdmin } from '@docuroute/db'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ClassSocietySubmission {
  id: string
  companyId: string
  projectId?: string
  societyCode: string
  packageTitle: string
  submissionType: string
  documentIds: string[]
  pdfPackageKey?: string
  coverLetterKey?: string
  zipPackageKey?: string
  classReferenceNumber?: string
  metadata?: Record<string, any>
}

export interface SubmitPackageResponse {
  reference: string
  status: string
  submittedAt?: Date
}

export interface StatusResponse {
  status: string
  details?: any
  lastUpdated?: Date
}

export interface WebhookResult {
  event: string
  submissionId: string
  status?: string
}

// ─── ClassSocietyClient Interface ────────────────────────────────────────────

/**
 * Interface for classification society API clients.
 * Each society (ABS, DNV, LR, BV) implements this interface.
 */
export interface ClassSocietyClient {
  /**
   * Submit a package to the classification society.
   * Phase 3: Implement when society API is available.
   *
   * @throws Error if API is not yet available
   */
  submitPackage(submission: ClassSocietySubmission): Promise<SubmitPackageResponse>

  /**
   * Get current status of a submission from the society.
   * Phase 3: Implement when society API is available.
   *
   * @throws Error if API is not yet available
   */
  getStatus(reference: string): Promise<StatusResponse>

  /**
   * Handle webhook payload from the classification society.
   * Updates submission status in database based on webhook data.
   */
  handleWebhook(payload: any): Promise<WebhookResult>
}

// ─── ABS Client Implementation ───────────────────────────────────────────────

/**
 * ABS (American Bureau of Shipping) Client
 * MyFreedom API - Currently in pilot phase
 */
export class ABSClient implements ClassSocietyClient {
  async submitPackage(submission: ClassSocietySubmission): Promise<SubmitPackageResponse> {
    // Phase 3: Implement when ABS MyFreedom API is available
    // Example implementation:
    // const response = await fetch('https://api.abs.org/submissions', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${process.env.ABS_API_KEY}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({
    //     packageTitle: submission.packageTitle,
    //     submissionType: submission.submissionType,
    //     documents: submission.documentIds
    //   })
    // })
    throw new Error('ABS MyFreedom API not yet available. Use manual submission.')
  }

  async getStatus(reference: string): Promise<StatusResponse> {
    // Phase 3: Implement when ABS MyFreedom API is available
    // Example implementation:
    // const response = await fetch(`https://api.abs.org/submissions/${reference}`, {
    //   headers: { 'Authorization': `Bearer ${process.env.ABS_API_KEY}` }
    // })
    throw new Error('ABS MyFreedom API not yet available.')
  }

  async handleWebhook(payload: any): Promise<WebhookResult> {
    // Parse ABS webhook payload
    const reference = payload.submissionId || payload.referenceNumber
    const status = payload.status // Expected: 'APPROVED', 'REJECTED', 'IN_REVIEW', 'PENDING'

    if (!reference) {
      throw new Error('Invalid ABS webhook: missing submission reference')
    }

    // Map ABS status to DocuRoute status
    let docuRouteStatus: string
    switch (status) {
      case 'APPROVED':
        docuRouteStatus = 'CONFIRMED'
        break
      case 'REJECTED':
        docuRouteStatus = 'REJECTED'
        break
      case 'IN_REVIEW':
      case 'PENDING':
        docuRouteStatus = 'MANUALLY_SUBMITTED'
        break
      default:
        docuRouteStatus = 'MANUALLY_SUBMITTED'
    }

    // Update submission in database
    await prismaAdmin.classSocietySubmission.update({
      where: { classReferenceNumber: reference },
      data: {
        status: docuRouteStatus,
        webhookReceivedAt: new Date(),
        webhookPayload: payload,
        updatedAt: new Date()
      }
    })

    return {
      event: 'status_update',
      submissionId: reference,
      status: docuRouteStatus
    }
  }
}

// ─── DNV Client Implementation ───────────────────────────────────────────────

/**
 * DNV (Det Norske Veritas) Client
 * Veristar Portal - API planned
 */
export class DNVClient implements ClassSocietyClient {
  async submitPackage(submission: ClassSocietySubmission): Promise<SubmitPackageResponse> {
    throw new Error('DNV Veristar API not yet available. Use manual submission.')
  }

  async getStatus(reference: string): Promise<StatusResponse> {
    throw new Error('DNV Veristar API not yet available.')
  }

  async handleWebhook(payload: any): Promise<WebhookResult> {
    const reference = payload.referenceId || payload.submissionId
    const status = payload.approvalStatus || payload.status

    if (!reference) {
      throw new Error('Invalid DNV webhook: missing submission reference')
    }

    let docuRouteStatus: string
    switch (status) {
      case 'APPROVED':
      case 'ACCEPTED':
        docuRouteStatus = 'CONFIRMED'
        break
      case 'REJECTED':
      case 'DECLINED':
        docuRouteStatus = 'REJECTED'
        break
      default:
        docuRouteStatus = 'MANUALLY_SUBMITTED'
    }

    await prismaAdmin.classSocietySubmission.update({
      where: { classReferenceNumber: reference },
      data: {
        status: docuRouteStatus,
        webhookReceivedAt: new Date(),
        webhookPayload: payload,
        updatedAt: new Date()
      }
    })

    return {
      event: 'status_update',
      submissionId: reference,
      status: docuRouteStatus
    }
  }
}

// ─── Lloyd's Register Client Implementation ──────────────────────────────────

/**
 * Lloyd's Register Client
 * MOVE Portal - API planned
 */
export class LRClient implements ClassSocietyClient {
  async submitPackage(submission: ClassSocietySubmission): Promise<SubmitPackageResponse> {
    throw new Error('Lloyd\'s Register MOVE API not yet available. Use manual submission.')
  }

  async getStatus(reference: string): Promise<StatusResponse> {
    throw new Error('Lloyd\'s Register MOVE API not yet available.')
  }

  async handleWebhook(payload: any): Promise<WebhookResult> {
    const reference = payload.caseNumber || payload.submissionId
    const status = payload.status

    if (!reference) {
      throw new Error('Invalid LR webhook: missing submission reference')
    }

    let docuRouteStatus: string
    switch (status) {
      case 'APPROVED':
      case 'CERTIFIED':
        docuRouteStatus = 'CONFIRMED'
        break
      case 'REJECTED':
      case 'NOT_APPROVED':
        docuRouteStatus = 'REJECTED'
        break
      default:
        docuRouteStatus = 'MANUALLY_SUBMITTED'
    }

    await prismaAdmin.classSocietySubmission.update({
      where: { classReferenceNumber: reference },
      data: {
        status: docuRouteStatus,
        webhookReceivedAt: new Date(),
        webhookPayload: payload,
        updatedAt: new Date()
      }
    })

    return {
      event: 'status_update',
      submissionId: reference,
      status: docuRouteStatus
    }
  }
}

// ─── Bureau Veritas Client Implementation ────────────────────────────────────

/**
 * Bureau Veritas Client
 * Approval Explorer - API planned
 */
export class BVClient implements ClassSocietyClient {
  async submitPackage(submission: ClassSocietySubmission): Promise<SubmitPackageResponse> {
    throw new Error('Bureau Veritas Approval Explorer API not yet available. Use manual submission.')
  }

  async getStatus(reference: string): Promise<StatusResponse> {
    throw new Error('Bureau Veritas Approval Explorer API not yet available.')
  }

  async handleWebhook(payload: any): Promise<WebhookResult> {
    const reference = payload.dossierNumber || payload.submissionId
    const status = payload.approvalState || payload.status

    if (!reference) {
      throw new Error('Invalid BV webhook: missing submission reference')
    }

    let docuRouteStatus: string
    switch (status) {
      case 'APPROVED':
      case 'VALIDATED':
        docuRouteStatus = 'CONFIRMED'
        break
      case 'REJECTED':
      case 'REFUSED':
        docuRouteStatus = 'REJECTED'
        break
      default:
        docuRouteStatus = 'MANUALLY_SUBMITTED'
    }

    await prismaAdmin.classSocietySubmission.update({
      where: { classReferenceNumber: reference },
      data: {
        status: docuRouteStatus,
        webhookReceivedAt: new Date(),
        webhookPayload: payload,
        updatedAt: new Date()
      }
    })

    return {
      event: 'status_update',
      submissionId: reference,
      status: docuRouteStatus
    }
  }
}

// ─── Factory Function ────────────────────────────────────────────────────────

/**
 * Get classification society client based on society code.
 *
 * @param societyCode - Society code ('ABS', 'DNV', 'LR', 'BV')
 * @returns ClassSocietyClient implementation for the society
 * @throws Error if society code is unknown
 */
export function getClassSocietyClient(societyCode: string): ClassSocietyClient {
  switch (societyCode.toUpperCase()) {
    case 'ABS':
      return new ABSClient()
    case 'DNV':
      return new DNVClient()
    case 'LR':
      return new LRClient()
    case 'BV':
      return new BVClient()
    default:
      throw new Error(`Unknown classification society: ${societyCode}`)
  }
}
