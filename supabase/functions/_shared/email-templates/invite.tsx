/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import { Header, Footer, styles, BRAND } from './_brand.tsx'

interface Props {
  siteName: string
  siteUrl: string
  confirmationUrl: string
  inviterName?: string
  recipientName?: string
}

export const InviteEmail = ({ confirmationUrl, inviterName, recipientName }: Props) => {
  const greeting = recipientName ? `Hi ${recipientName},` : 'Hi there,'
  const intro = inviterName
    ? `${inviterName} has invited you to help plan their seating chart on Wedding Seater.`
    : `You've been invited to help plan a seating chart on Wedding Seater.`
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{inviterName ? `${inviterName} invited you to Wedding Seater` : "You've been invited to Wedding Seater"}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Header />
          <Text style={label}>INVITATION</Text>
          <h1 style={styles.h1}>A seat <span style={styles.italic}>at the table.</span></h1>
          <Text style={styles.text}>{greeting}</Text>
          <Text style={styles.text}>{intro} Accept your invitation to jump in.</Text>
          <Button style={styles.button} href={confirmationUrl}>Accept invitation →</Button>
          <Text style={styles.muted}>If this wasn't meant for you, no need to do anything.</Text>
          <Footer />
        </Container>
      </Body>
    </Html>
  )
}
export default InviteEmail
const label = { fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '10px', letterSpacing: '0.32em', color: BRAND.terracotta, margin: '0 0 14px' }
