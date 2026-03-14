import QRCode from 'qrcode'
import { QRVerificationStatus, EngineeringDiscipline, IssuePurpose, DocumentStatus } from '@docuroute/types'
import { isDocumentSafeForConstruction } from './utils'

/**
 * generateVerificationQRCode
 *
 * Uses qrcode package (CommonJS require for watermark-child.js compatibility)
 * Error correction: 'H' (high - 30% of code can be damaged)
 * Size: 200x200px
 * Returns: base64 PNG data URI
 */
export async function generateVerificationQRCode(
  documentId: string,
  revisionId: string
): Promise<string> {
  const baseUrl = process.env.QR_VERIFICATION_BASE_URL || 'https://docuroute.io'
  const url = `${baseUrl}/verify/${documentId}?rev=${revisionId}`

  try {
    const dataUrl = await QRCode.toDataURL(url, {
      errorCorrectionLevel: 'H',
      width: 200,
      margin: 1,
    })
    return dataUrl
  } catch (error) {
    console.error('Failed to generate QR code:', error)
    throw new Error('QR code generation failed')
  }
}

/**
 * buildVerificationStatus
 *
 * Constructs the QRVerificationStatus object for the /verify/:documentId route.
 * Calls isDocumentSafeForConstruction() from utils.ts to determine safety.
 */
export function buildVerificationStatus(
  document: {
    id: string
    documentCode: string
    status: DocumentStatus
    discipline: EngineeringDiscipline
  },
  revision: {
    revisionCode: string
    issuePurpose: IssuePurpose
    status: string
  },
  project: {
    name: string
  },
  latestRevisionCode?: string
): QRVerificationStatus {
  const isSafe = isDocumentSafeForConstruction(
    document.status,
    revision.issuePurpose
  )

  let headline: string
  let headlineColour: 'green' | 'red' | 'amber' | 'blue'

  if (isSafe) {
    headline = 'SAFE FOR CONSTRUCTION'
    headlineColour = 'green'
  } else if (document.status === DocumentStatus.SUPERSEDED) {
    headline = 'SUPERSEDED  DO NOT USE'
    headlineColour = 'red'
  } else if (document.status === DocumentStatus.QUARANTINED) {
    headline = 'QUARANTINED'
    headlineColour = 'red'
  } else if (revision.issuePurpose === IssuePurpose.FOR_REVIEW) {
    headline = 'FOR REVIEW ONLY'
    headlineColour = 'amber'
  } else if (revision.issuePurpose === IssuePurpose.FOR_INFORMATION) {
    headline = 'FOR INFORMATION'
    headlineColour = 'blue'
  } else {
    headline = 'NOT APPROVED FOR CONSTRUCTION'
    headlineColour = 'amber'
  }

  return {
    isSafe,
    headline,
    headlineColour,
    documentCode: document.documentCode,
    revisionCode: revision.revisionCode,
    issuePurpose: revision.issuePurpose,
    status: document.status,
    discipline: document.discipline,
    projectName: project.name,
    verifiedAt: new Date().toISOString(),
    latestRevisionCode,
  }
}
