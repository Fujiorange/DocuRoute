import * as React from 'react'
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Button,
  Hr,
} from '@react-email/components'

export interface TransmittalEmailProps {
  transmittalNumber: string
  subject: string
  message?: string
  senderCompany: string
  senderName: string
  recipientName?: string
  documentCount: number
  documents: Array<{
    documentCode?: string
    title?: string
    filename: string
    revisionCode: string
  }>
  acknowledgeUrl: string
  expiresAt?: string
}

export function TransmittalEmail({
  transmittalNumber,
  subject,
  message,
  senderCompany,
  senderName,
  recipientName,
  documentCount,
  documents,
  acknowledgeUrl,
  expiresAt,
}: TransmittalEmailProps) {
  const expiryDate = expiresAt
    ? new Date(expiresAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Document Transmittal</Heading>

          {recipientName && (
            <Text style={text}>
              Hello <strong>{recipientName}</strong>,
            </Text>
          )}

          <Text style={text}>
            <strong>{senderName}</strong> from <strong>{senderCompany}</strong> has sent you a
            document transmittal via DocuRoute.
          </Text>

          <Section style={transmittalSection}>
            <Text style={transmittalHeading}>Transmittal Number:</Text>
            <Text style={transmittalNumber}>{transmittalNumber}</Text>

            <Text style={transmittalHeading}>Subject:</Text>
            <Text style={transmittalSubject}>{subject}</Text>

            {message && (
              <>
                <Text style={transmittalHeading}>Message:</Text>
                <Text style={transmittalMessage}>{message}</Text>
              </>
            )}
          </Section>

          <Section style={documentsSection}>
            <Text style={documentsHeading}>
              Documents Included ({documentCount}):
            </Text>
            {documents.map((doc, idx) => (
              <Section key={idx} style={documentItem}>
                <Text style={documentName}>
                  {doc.documentCode || doc.title || doc.filename}
                </Text>
                <Text style={documentRevision}>Rev {doc.revisionCode}</Text>
                {doc.documentCode && doc.title && (
                  <Text style={documentFilename}>{doc.filename}</Text>
                )}
              </Section>
            ))}
          </Section>

          <Section style={buttonContainer}>
            <Button style={button} href={acknowledgeUrl}>
              View & Acknowledge Documents
            </Button>
          </Section>

          <Text style={noteText}>
            No login required – click the button above to view the documents and download them.
            You will be able to acknowledge receipt or return the transmittal with comments.
          </Text>

          <Hr style={hr} />

          {expiryDate && (
            <Text style={expiryText}>
              This transmittal link expires on <strong>{expiryDate}</strong>
            </Text>
          )}

          <Text style={footer}>
            If you did not expect this transmittal, please contact <strong>{senderCompany}</strong> directly.
          </Text>

          <Text style={footer}>
            DocuRoute – Document management for shipbuilding, construction, and marine engineering.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
}

const h1 = {
  color: '#1a1a1a',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '40px 0 24px',
  padding: '0 24px',
  lineHeight: '1.4',
}

const text = {
  color: '#404040',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
  padding: '0 24px',
}

const transmittalSection = {
  backgroundColor: '#f8f9fa',
  borderLeft: '4px solid #3b82f6',
  margin: '32px 24px',
  padding: '20px',
}

const transmittalHeading = {
  color: '#6b7280',
  fontSize: '12px',
  fontWeight: '600',
  letterSpacing: '0.5px',
  margin: '16px 0 4px',
  textTransform: 'uppercase' as const,
}

const transmittalNumber = {
  color: '#1a1a1a',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '0 0 16px',
}

const transmittalSubject = {
  color: '#1a1a1a',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 16px',
}

const transmittalMessage = {
  color: '#404040',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
  whiteSpace: 'pre-wrap' as const,
}

const documentsSection = {
  margin: '32px 24px',
  padding: '20px',
  backgroundColor: '#fafafa',
  borderRadius: '6px',
}

const documentsHeading = {
  color: '#1a1a1a',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 16px',
}

const documentItem = {
  margin: '12px 0',
  padding: '12px',
  backgroundColor: '#ffffff',
  borderRadius: '4px',
  borderLeft: '3px solid #10b981',
}

const documentName = {
  color: '#1a1a1a',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 4px',
}

const documentRevision = {
  color: '#3b82f6',
  fontSize: '13px',
  fontWeight: '600',
  margin: '0 0 4px',
}

const documentFilename = {
  color: '#6b7280',
  fontSize: '12px',
  margin: '0',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#3b82f6',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
}

const noteText = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '16px 0',
  padding: '0 24px',
  fontStyle: 'italic' as const,
}

const hr = {
  borderColor: '#e5e7eb',
  margin: '32px 24px',
}

const expiryText = {
  color: '#dc2626',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '16px 0',
  padding: '0 24px',
}

const footer = {
  color: '#9ca3af',
  fontSize: '12px',
  lineHeight: '20px',
  margin: '8px 0',
  padding: '0 24px',
}
