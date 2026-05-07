/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import { Header, Footer, styles, BRAND } from '../email-templates/_brand.tsx'
import type { TemplateEntry } from './registry.ts'

interface GrandfatherProps { name?: string }

const GrandfatherEmail = ({ name }: GrandfatherProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You're in — your chart stays free</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Header />
        <Text style={label}>YOU'RE IN</Text>
        <h1 style={styles.h1}>{name ? <>Hi <span style={styles.italic}>{name}</span> —</> : <>A quick <span style={styles.italic}>note.</span></>}</h1>
        <Text style={styles.text}>
          We're introducing a small one-time fee (£10) for new Wedding Seater accounts.
          You got in early, so your chart stays completely free — unlimited tables, exports,
          sharing, everything. No action needed.
        </Text>
        <Text style={styles.text}>
          Go finish that seating chart.
        </Text>
        <Text style={styles.muted}>— The Wedding Seater team</Text>
        <Footer />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: GrandfatherEmail,
  subject: "You're in — your chart stays free",
  displayName: 'Grandfather notice',
  previewData: { name: 'Maya' },
} satisfies TemplateEntry

const label = { fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '10px', letterSpacing: '0.32em', color: BRAND.terracotta, margin: '0 0 14px' }
