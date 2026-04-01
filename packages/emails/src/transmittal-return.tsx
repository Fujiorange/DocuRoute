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

export interface TransmittalReturnEmailProps {
  transmittalNumber: string
  subject: string
  senderName: string
  recipientEmail: string
  recipientName?: string
  recipientCompany?: string
  returnMessage?: string
  viewUrl: string
}

export function TransmittalReturnEmail({
  transmittalNumber,
  subject,
  senderName,
  recipientEmail,
  recipientName,
  recipientCompany,
  returnMessage,
  viewUrl,
}: TransmittalReturnEmailProps) {
  const recipientDisplayName = recipientName || recipientEmail
  const companyInfo = recipientCompany ? ` from ${recipientCompany}` : ''

  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Transmittal Returned</Heading>

          <Text style={text}>
            Hello <strong>{senderName}</strong>,
          </Text>

          <Text style={text}>
            <strong>{recipientDisplayName}</strong>
            {companyInfo} has returned transmittal <strong>{transmittalNumber}</strong>.
          </Text>

          <Section style={transmittalSection}>
            <Text style={transmittalHeading}>Transmittal Number:</Text>
            <Text style={transmittalNumber}>{transmittalNumber}</Text>

            <Text style={transmittalHeading}>Subject:</Text>
            <Text style={transmittalSubject}>{subject}</Text>
          </Section>

          {returnMessage && (
            <Section style={messageSection}>
              <Text style={messageHeading}>Reason for Return:</Text>
              <Text style={messageText}>{returnMessage}</Text>
            </Section>
          )}

          <Section style={buttonContainer}>
            <Button style={button} href={viewUrl}>
              View Transmittal Details
            </Button>
          </Section>

          <Hr style={hr} />

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
  borderLeft: '4px solid #f59e0b',
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
  margin: '0',
}

const messageSection = {
  backgroundColor: '#fef3c7',
  borderLeft: '4px solid #f59e0b',
  margin: '32px 24px',
  padding: '20px',
}

const messageHeading = {
  color: '#92400e',
  fontSize: '13px',
  fontWeight: '600',
  letterSpacing: '0.5px',
  margin: '0 0 8px',
  textTransform: 'uppercase' as const,
}

const messageText = {
  color: '#1a1a1a',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
  whiteSpace: 'pre-wrap' as const,
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

const hr = {
  borderColor: '#e5e7eb',
  margin: '32px 24px',
}

const footer = {
  color: '#9ca3af',
  fontSize: '12px',
  lineHeight: '20px',
  margin: '8px 0',
  padding: '0 24px',
}
