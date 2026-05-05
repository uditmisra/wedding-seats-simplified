/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import { Header, Footer, styles, BRAND } from '../email-templates/_brand.tsx'
import type { TemplateEntry } from './registry.ts'

interface ShareInviteProps {
  recipientName?: string
  inviterName?: string
  planName?: string
  planUrl: string
  message?: string
}

const ShareInviteEmail = ({ recipientName, inviterName, planName, planUrl, message }: ShareInviteProps) => {
  const greeting = recipientName ? `Hi ${recipientName},` : 'Hi there,'
  const who = inviterName || 'Someone'
  const what = planName ? <><span style={styles.italic}>{planName}</span></> : 'their seating plan'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{`${who} shared a seating plan with you`}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Header />
          <Text style={label}>SHARED WITH YOU</Text>
          <h1 style={styles.h1}>
            A seat <span style={styles.italic}>at the table.</span>
          </h1>
          <Text style={styles.text}>{greeting}</Text>
          <Text style={styles.text}>
            {who} invited you to view {what} on Wedding Seater. Open the plan to see who's sitting where.
          </Text>
          {message ? (
            <Text style={quote}>“{message}”</Text>
          ) : null}
          <Button style={styles.button} href={planUrl}>Open the plan →</Button>
          <Text style={styles.muted}>
            Anyone with the link can view this plan. Forward it gently.
          </Text>
          <Footer />
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ShareInviteEmail,
  subject: (data: Record<string, any>) => {
    const who = data?.inviterName || 'Someone'
    const plan = data?.planName ? `: ${data.planName}` : ''
    return `${who} shared a seating plan with you${plan}`
  },
  displayName: 'Share invite',
  previewData: {
    recipientName: 'Alex',
    inviterName: 'Maya',
    planName: 'Maya & Jordan · 14.09.2026',
    planUrl: 'https://weddingseater.app/plan/PLM-2840',
    message: "Have a peek — let me know if I've got Aunt Linda in the wrong corner.",
  },
} satisfies TemplateEntry

const label = { fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '10px', letterSpacing: '0.32em', color: BRAND.terracotta, margin: '0 0 14px' }
const quote = {
  fontFamily: 'Newsreader, Georgia, serif',
  fontStyle: 'italic' as const,
  fontSize: '16px',
  lineHeight: '1.55',
  color: BRAND.ink2,
  borderLeft: `2px solid ${BRAND.terracotta}`,
  padding: '4px 0 4px 14px',
  margin: '0 0 26px',
}