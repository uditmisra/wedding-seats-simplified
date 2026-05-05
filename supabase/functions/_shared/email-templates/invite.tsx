/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been invited to join {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>You've been invited</Heading>
        <Text style={text}>
          You've been invited to join{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          . Click the button below to accept the invitation and create your
          account.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Accept Invitation
        </Button>
        <Text style={footer}>
          If you weren't expecting this invitation, you can safely ignore this
          email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter Tight, Helvetica, Arial, sans-serif' }
const container = { padding: '20px 25px' }
const h1 = {
  fontFamily: 'Newsreader, Georgia, serif',
  fontSize: '28px',
  fontWeight: 400 as const,
  letterSpacing: '-0.01em',
  color: 'hsl(50, 14%, 15%)',
  margin: '0 0 20px',
}
const text = { fontSize: '15px', color: 'hsl(46, 12%, 39%)', lineHeight: '1.55', margin: '0 0 24px' }
const link = { color: 'hsl(15, 55%, 46%)', textDecoration: 'underline' }
const button = {
  backgroundColor: 'hsl(50, 14%, 15%)',
  color: 'hsl(41, 40%, 92%)',
  fontSize: '14px',
  borderRadius: '999px',
  padding: '13px 24px',
  textDecoration: 'none',
  fontWeight: 500 as const,
}
const footer = { fontSize: '12px', color: 'hsl(45, 12%, 54%)', margin: '32px 0 0', lineHeight: '1.5' }
