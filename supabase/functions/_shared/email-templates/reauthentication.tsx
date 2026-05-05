/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import { Header, Footer, styles, BRAND } from './_brand.tsx'

interface Props { token: string }

export const ReauthenticationEmail = ({ token }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Wedding Seater verification code</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Header />
        <Text style={label}>VERIFY</Text>
        <h1 style={styles.h1}>Confirm <span style={styles.italic}>it's you.</span></h1>
        <Text style={styles.text}>Use the code below to confirm your identity:</Text>
        <Text style={styles.code}>{token}</Text>
        <Text style={styles.muted}>This code expires shortly. If you didn't request it, you can safely ignore this email.</Text>
        <Footer />
      </Container>
    </Body>
  </Html>
)
export default ReauthenticationEmail
const label = { fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '10px', letterSpacing: '0.32em', color: BRAND.terracotta, margin: '0 0 14px' }
