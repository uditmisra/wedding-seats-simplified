/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import { Header, Footer, styles, BRAND } from './_brand.tsx'

interface Props { siteName: string; oldEmail: string; email: string; newEmail: string; confirmationUrl: string }

export const EmailChangeEmail = ({ oldEmail, newEmail, confirmationUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email change for Wedding Seater</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Header />
        <Text style={label}>EMAIL CHANGE</Text>
        <h1 style={styles.h1}>Confirm your <span style={styles.italic}>new</span> email.</h1>
        <Text style={styles.text}>
          You asked to change your Wedding Seater email from <strong style={{ color: BRAND.ink }}>{oldEmail}</strong> to <strong style={{ color: BRAND.ink }}>{newEmail}</strong>.
        </Text>
        <Button style={styles.button} href={confirmationUrl}>Confirm change →</Button>
        <Text style={styles.muted}>If you didn't request this, you can safely ignore this email.</Text>
        <Footer />
      </Container>
    </Body>
  </Html>
)
export default EmailChangeEmail
const label = { fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '10px', letterSpacing: '0.32em', color: BRAND.terracotta, margin: '0 0 14px' }
