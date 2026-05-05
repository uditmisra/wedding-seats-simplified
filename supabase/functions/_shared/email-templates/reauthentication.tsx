/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Confirm reauthentication</Heading>
        <Text style={text}>Use the code below to confirm your identity:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          This code will expire shortly. If you didn't request this, you can
          safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

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
const codeStyle = {
  fontFamily: 'Geist Mono, Courier, monospace',
  fontSize: '24px',
  fontWeight: 500 as const,
  letterSpacing: '0.16em',
  color: 'hsl(50, 14%, 15%)',
  margin: '0 0 30px',
}
const footer = { fontSize: '12px', color: 'hsl(45, 12%, 54%)', margin: '32px 0 0', lineHeight: '1.5' }
