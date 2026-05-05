/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Img, Section, Text, Hr } from 'npm:@react-email/components@0.0.22'

export const BRAND = {
  name: 'Wedding Seater',
  tagline: 'A SEATING PLANNER · EST. 2026',
  url: 'https://weddingseater.app',
  logoUrl: 'https://bqacaxesfvbcxbmqdemz.supabase.co/storage/v1/object/public/email-assets/wedding-seater-mark.png',
  paper: '#f3eee3',
  paper2: '#ebe5d6',
  ink: '#23201a',
  ink2: '#4a4538',
  ink3: '#6e6a58',
  hairline: '#d6cfbe',
  terracotta: '#b65a36',
}

export const Header = () => (
  <Section style={headerSection}>
    <Img src={BRAND.logoUrl} alt="Wedding Seater" width="44" height="44" style={{ display: 'block', margin: '0 auto 14px' }} />
    <Text style={wordmark}>
      Wedding <span style={{ fontStyle: 'italic', color: BRAND.terracotta }}>Seater</span>
    </Text>
  </Section>
)

export const Footer = () => (
  <>
    <Hr style={hairline} />
    <Text style={footerText}>
      WEDDINGSEATER.APP
    </Text>
  </>
)

const headerSection = { textAlign: 'center' as const, padding: '8px 0 28px' }
const wordmark = {
  fontFamily: 'Newsreader, Georgia, serif',
  fontSize: '22px',
  fontWeight: 400 as const,
  letterSpacing: '-0.02em',
  color: BRAND.ink,
  textAlign: 'center' as const,
  margin: 0,
}
const hairline = { borderTop: `1px solid ${BRAND.hairline}`, margin: '40px 0 18px' }
const footerText = {
  fontFamily: 'ui-monospace, Menlo, monospace',
  fontSize: '10px',
  letterSpacing: '0.28em',
  color: BRAND.ink3,
  textAlign: 'center' as const,
  margin: 0,
}

// Shared style tokens for templates (auth + transactional)
export const styles = {
  main: { backgroundColor: BRAND.paper, fontFamily: 'Inter Tight, Helvetica, Arial, sans-serif', padding: '32px 0' },
  container: {
    backgroundColor: BRAND.paper,
    border: `1px solid ${BRAND.hairline}`,
    padding: '40px 36px',
    maxWidth: '560px',
    margin: '0 auto',
  },
  h1: {
    fontFamily: 'Newsreader, Georgia, serif',
    fontSize: '32px',
    fontWeight: 400 as const,
    letterSpacing: '-0.02em',
    color: BRAND.ink,
    margin: '0 0 18px',
    lineHeight: 1.1,
  },
  italic: { fontStyle: 'italic' as const, color: BRAND.terracotta },
  text: { fontSize: '15px', color: BRAND.ink2, lineHeight: '1.6', margin: '0 0 22px' },
  link: { color: BRAND.terracotta, textDecoration: 'underline' },
  button: {
    backgroundColor: BRAND.ink,
    color: BRAND.paper,
    fontSize: '14px',
    fontFamily: 'Newsreader, Georgia, serif',
    fontWeight: 500 as const,
    letterSpacing: '-0.005em',
    padding: '14px 26px',
    textDecoration: 'none',
    display: 'inline-block',
  },
  muted: { fontSize: '13px', color: BRAND.ink3, lineHeight: '1.55', margin: '24px 0 0' },
  code: {
    fontFamily: 'ui-monospace, Menlo, monospace',
    fontSize: '26px',
    fontWeight: 500 as const,
    letterSpacing: '0.18em',
    color: BRAND.ink,
    margin: '0 0 26px',
    textAlign: 'center' as const,
  },
}