/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import { Header, Footer, styles, BRAND } from './_brand.tsx'

interface Props { siteName: string; confirmationUrl: string }

export const MagicLinkEmail = ({ confirmationUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your sign-in link for Wedding Seater</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Header />
        <Text style={label}>SIGN IN</Text>
        <h1 style={styles.h1}>Your <span style={styles.italic}>link</span> is here.</h1>
        <Text style={styles.text}>Click below to sign in to Wedding Seater. This link expires shortly.</Text>
        <Button style={styles.button} href={confirmationUrl}>Sign in →</Button>
        <Text style={styles.muted}>If you didn't request this, you can safely ignore this email.</Text>
        <Footer />
      </Container>
    </Body>
  </Html>
)
export default MagicLinkEmail
const label = { fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '10px', letterSpacing: '0.32em', color: BRAND.terracotta, margin: '0 0 14px' }
