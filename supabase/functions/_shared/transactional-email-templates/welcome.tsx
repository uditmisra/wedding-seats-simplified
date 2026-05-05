/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import { Header, Footer, styles, BRAND } from '../email-templates/_brand.tsx'
import type { TemplateEntry } from './registry.ts'

interface WelcomeProps { name?: string }

const WelcomeEmail = ({ name }: WelcomeProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to Wedding Seater</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Header />
        <Text style={label}>WELCOME</Text>
        <h1 style={styles.h1}>{name ? <>Welcome, <span style={styles.italic}>{name}.</span></> : <>A place <span style={styles.italic}>for everyone.</span></>}</h1>
        <Text style={styles.text}>
          Thanks for joining Wedding Seater. Move guests like place cards on a real plan — share a link, that's it.
        </Text>
        <Button style={styles.button} href={BRAND.url}>Open your plan →</Button>
        <Text style={styles.muted}>— The Wedding Seater team</Text>
        <Footer />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WelcomeEmail,
  subject: 'Welcome to Wedding Seater',
  displayName: 'Welcome',
  previewData: { name: 'Maya' },
} satisfies TemplateEntry

const label = { fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '10px', letterSpacing: '0.32em', color: BRAND.terracotta, margin: '0 0 14px' }
