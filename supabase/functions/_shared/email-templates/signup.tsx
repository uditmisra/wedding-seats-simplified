/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import { Header, Footer, styles, BRAND } from './_brand.tsx'

interface Props { siteName: string; siteUrl: string; recipient: string; confirmationUrl: string }

export const SignupEmail = ({ confirmationUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email for Wedding Seater</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Header />
        <Text style={label}>WELCOME</Text>
        <h1 style={styles.h1}>A place <span style={styles.italic}>for everyone.</span></h1>
        <Text style={styles.text}>
          Thanks for joining Wedding Seater. Confirm your email to start your seating chart — drag, don't spreadsheet.
        </Text>
        <Button style={styles.button} href={confirmationUrl}>Confirm email →</Button>
        <Text style={styles.muted}>If you didn't sign up, you can safely ignore this email.</Text>
        <Footer />
      </Container>
    </Body>
  </Html>
)
export default SignupEmail
const label = { fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '10px', letterSpacing: '0.32em', color: BRAND.terracotta, margin: '0 0 14px' }
