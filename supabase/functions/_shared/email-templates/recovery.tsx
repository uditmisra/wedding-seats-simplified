/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import { Header, Footer, styles, BRAND } from './_brand.tsx'

interface Props { siteName: string; confirmationUrl: string }

export const RecoveryEmail = ({ confirmationUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reset your password for Wedding Seater</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Header />
        <Text style={label}>RESET</Text>
        <h1 style={styles.h1}>Set a <span style={styles.italic}>new</span> password.</h1>
        <Text style={styles.text}>We received a request to reset your password. Click below to choose a new one.</Text>
        <Button style={styles.button} href={confirmationUrl}>Reset password →</Button>
        <Text style={styles.muted}>If you didn't ask for this, you can safely ignore this email — your password won't change.</Text>
        <Footer />
      </Container>
    </Body>
  </Html>
)
export default RecoveryEmail
const label = { fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '10px', letterSpacing: '0.32em', color: BRAND.terracotta, margin: '0 0 14px' }
