/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Seatly'

interface WelcomeProps {
  name?: string
}

const WelcomeEmail = ({ name }: WelcomeProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {name ? `Welcome, ${name}.` : 'Welcome.'}
        </Heading>
        <Text style={text}>
          Thanks for joining {SITE_NAME}. Your seating chart is just a few drags away.
        </Text>
        <Text style={footer}>— The {SITE_NAME} team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WelcomeEmail,
  subject: 'Welcome to Seatly',
  displayName: 'Welcome',
  previewData: { name: 'Maya' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter Tight, Helvetica, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontFamily: 'Newsreader, Georgia, serif', fontSize: '32px', fontWeight: 400 as const, letterSpacing: '-0.01em', color: 'hsl(50, 14%, 15%)', margin: '0 0 18px' }
const text = { fontSize: '15px', color: 'hsl(46, 12%, 39%)', lineHeight: '1.55', margin: '0 0 22px' }
const footer = { fontSize: '12px', color: 'hsl(45, 12%, 54%)', margin: '32px 0 0' }