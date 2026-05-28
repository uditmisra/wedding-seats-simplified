## Plan: Verify weddingseater.app in Google Search Console

You've connected "Udit's Search Console" at the workspace level but it isn't linked to this project yet. Here's what I'll do once you switch to build mode:

### 1. Link the connector to this project
Call `standard_connectors--connect` with the Google Search Console connector so the gateway credentials become available in this project's sandbox.

### 2. Request a META verification token
Hit the Site Verification API for `https://weddingseater.app/` to get a `google-site-verification` meta tag token.

### 3. Embed the verification tag
Add the returned `<meta name="google-site-verification" content="..." />` tag into `index.html` inside `<head>`. This is the only verification method that works for a Lovable app (DNS / file upload / Analytics aren't available to me).

### 4. Publish
You'll need to publish so the tag is live on `weddingseater.app` — Google fetches the production URL, not the preview. I'll prompt you with the publish action.

### 5. Verify with Google
After publish, call the verify endpoint. On success Google marks the site verified.

### 6. Add site to Search Console + submit sitemap
- `PUT /webmasters/v3/sites/https%3A%2F%2Fweddingseater.app%2F` to register the property.
- `PUT /webmasters/v3/sites/.../sitemaps/https%3A%2F%2Fweddingseater.app%2Fsitemap.xml` to submit the existing sitemap.

### 7. Mark the SEO finding fixed
Update the Google Search Console SEO finding to `fixed` with the verification details.

### Notes
- Step 5 will fail until step 4 (publish) completes — Google can't fetch the meta tag from the preview URL.
- I'll pause between step 3 and step 5 to confirm you've published.
- Only `weddingseater.app` will be verified; the `www.` and `.lovable.app` variants are separate properties if you ever want them.
