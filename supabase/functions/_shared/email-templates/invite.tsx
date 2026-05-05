/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import { Header, Footer, styles, BRAND } from './_brand.tsx'

interface Props { siteName: string; siteUrl: string; confirmationUrl: string }

export const InviteEmail = ({ confirmationUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been invited to Wedding Seater</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Header />
        <Text style={label}>INVITATION</Text>
        <h1 style={styles.h1}>A seat <span style={styles.italic}>at the table.</span></h1>
        <Text style={styles.text}>You've been invited to join Wedding Seater. Accept your invitation to get started.</Text>
        <Button style={styles.button} href={confirmationUrl}>Accept invitation →</Button>
        <Text style={styles.muted}>If this wasn't meant for you, no need to do anything.</Text>
        <Footer />
      </Container>
    </Body>
  </Html>
)
export default InviteEmail
const label = { fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '10px', letterSpacing: '0.32em', color: BRAND.terracotta, margin: '0 0 14px' }
