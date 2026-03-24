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

export interface InviteEmailProps {
  companyName: string
  inviterName: string
  roleName: string
  roleDescription?: string
  acceptUrl: string
  expiresAt: string
}

export function InviteEmail({
  companyName,
  inviterName,
  roleName,
  roleDescription,
  acceptUrl,
  expiresAt,
}: InviteEmailProps) {
  const expiryDate = new Date(expiresAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>You've been invited to DocuRoute</Heading>

          <Text style={text}>
            <strong>{inviterName}</strong> has invited you to join <strong>{companyName}</strong>{' '}
            on DocuRoute  the document management system for regulated heavy industries.
          </Text>

          <Section style={roleSection}>
            <Text style={roleHeading}>Your role:</Text>
            <Text style={roleName}>{roleName}</Text>
            {roleDescription && <Text style={roleDesc}>{roleDescription}</Text>}
          </Section>

          <Section style={buttonContainer}>
            <Button style={button} href={acceptUrl}>
              Accept Invitation
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={expiryText}>
            ð This invitation expires on <strong>{expiryDate}</strong>
          </Text>

          <Text style={footer}>
            If you did not expect this invitation, you can safely ignore this email.
          </Text>

          <Text style={footer}>
            DocuRoute  Document management for shipbuilding, construction, and marine engineering.
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

const roleSection = {
  backgroundColor: '#f8f9fa',
  borderLeft: '4px solid #3b82f6',
  margin: '32px 24px',
  padding: '20px',
}

const roleHeading = {
  color: '#6b7280',
  fontSize: '13px',
  fontWeight: '600',
  letterSpacing: '0.5px',
  margin: '0 0 8px',
  textTransform: 'uppercase' as const,
}

const roleName = {
  color: '#1a1a1a',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '0 0 8px',
}

const roleDesc = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '22px',
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
