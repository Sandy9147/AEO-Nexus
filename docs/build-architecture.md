# AEO Nexus — Phase 6C: Build Architecture

## AI Website & Landing Page Builder MVP

---

## 1. Executive Summary & Product Objective

The **Build** module completes the core value loop of the AEO Nexus platform:

$$\text{Discover (Research)} \longrightarrow \text{Plan (Strategic Roadmaps)} \longrightarrow \textbf{Build (Visual Websites)} \longrightarrow \textbf{Publish (Hosted Subdomains)}$$

Prior to Phase 6C, business owners could research market opportunities in **Discover** and synthesize strategic roadmaps in **Plan**, but lacked an integrated, autonomous bridge to transform approved strategies into high-converting digital products.

The Build module provides:
1. **AI Autonomous Website Generation**: Generates full multi-page websites from workspace profiles or linked strategic plans.
2. **Predictable Section-Based Visual Editor**: Controlled, responsive component registry with 16 allowlisted section types (no raw code or insecure JS eval).
3. **Enterprise Publishing Engine**: Safe subdomain provisioning (`https://{subdomain}.sites.aeonexus.com`) with collision prevention and reserved name filtering.
4. **Immutable Version Snapshots**: Safe iteration where draft edits never impact active public websites until explicitly approved and published.

---

## 2. Component & Section Registry Architecture

To prevent arbitrary code execution, security vulnerabilities, and fragile broken layouts, the visual builder rejects arbitrary raw HTML/JS injection. Stored website definitions are pure, structured JSON payloads mapped to a strictly allowlisted registry of 16 responsive section components:

| Section Type | Component Responsibility | Supported Content Elements |
| :--- | :--- | :--- |
| `HERO` | High-impact above-the-fold banner | Badge, Headline, Subheadline, Primary/Secondary CTAs |
| `ANNOUNCEMENT_BAR` | Top alert & notification bar | Message text, optional hyperlink |
| `NAVIGATION` | Header navigation | Brand name/logo, page links, action CTA button |
| `LOGO_STRIP` | Social proof & partner showcase | "Trusted by" headline, partner brand logos/chips |
| `FEATURES` | Core value proposition grid | Section title, subtitle, icon + title + description cards |
| `SERVICES` | Business capability matrix | Service title, descriptions, action links |
| `ABOUT` | Company story & mission | Narrative body, quantified key metrics/stats counters |
| `IMAGE_TEXT` | Split 2-column narrative | Visual product showcase, bullet highlights, CTA |
| `GALLERY` | Responsive showcase grid | Visual showcase cards with titles and tags |
| `PROCESS_STEPS` | Phased customer journey | Numbered 1-2-3-4 step cards with clear descriptions |
| `PRICING` | Commercial tier cards | Tiers, prices, frequency, feature checkmarks, CTA buttons |
| `FAQ` | Expandable question & answer | Accordion items for objection handling |
| `TESTIMONIALS` | Customer perspective cards | Verified feedback cards (strictly non-fabricated) |
| `CONTACT` | Inquiries & lead generation | Email, phone, address, and interactive inquiry form |
| `CTA` | Full-width conversion banner | Bold call to action, subheadline, conversion button |
| `FOOTER` | Bottom brand & legal bar | Brand name, copyright, navigation links |

---

## 3. Security, Multi-Tenancy & URL Sanitization

Security is enforced at every layer of the Build pipeline:

### 3.1 URL Protocol Filtering
All links, button hrefs, and image paths pass through `WebsiteRendererService.sanitizeUrl()`:
- **Allowed Schemes**: `http:`, `https:`, `mailto:`, `tel:`, or relative paths starting with `/`.
- **Blocked Schemes**: `javascript:`, `data:`, `vbscript:`, and protocol-relative `//` URLs.
- Attempts to inject malicious URL schemes throw immediate `BadRequestException` errors.

### 3.2 XSS & Content Stripping
All text payloads pass through `sanitizeContent()`:
- Strips null bytes (`\0`).
- Removes `<script>` tags and inline event handlers (`onload=`, `onerror=`).
- Neutralizes raw HTML injection while preserving plain text and punctuation.

### 3.3 Public Gateway Payload Isolation
When public visitors request `https://{subdomain}.sites.aeonexus.com`, the API strips all internal metadata:
- Excludes: `workspaceId`, `createdById`, `planId`, `initiativeId`, `userId`, `snapshot` internal IDs.
- Outputs only: `name`, `slug`, `subdomain`, `publishedUrl`, `publishedAt`, `theme`, and sanitized `pages` with `sections`.

---

## 4. Subdomain Provisioning & Version Immutability

### 4.1 Subdomain Standards
- Subdomains must match `^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$` (3 to 63 lowercase alphanumeric characters or hyphens, not starting or ending with a hyphen).
- **Reserved Subdomains**: Prohibits platform infrastructure names (`admin`, `api`, `app`, `auth`, `login`, `www`, `public`, `sites`, `dashboard`, `support`, `billing`, etc.).
- **Global Uniqueness**: Collision check prevents any workspace from claiming an active subdomain already owned by another workspace.

### 4.2 Published Snapshot Immutability
When a website is published:
1. A new `WebsiteVersion` record is created containing a frozen, immutable snapshot of the current theme and pages.
2. A `WebsitePublication` record binds to this specific `versionId`.
3. Subsequent draft edits in the visual editor mutate draft pages, **never** the active publication snapshot.
4. The public gateway serves exclusively from `publication.version.snapshot`.
5. Only an explicit "Publish" or "Update Publication" action creates a new snapshot and updates the active publication.

### 4.3 Instant Rollback & Restoration
Users can inspect prior version snapshots and restore any version with one click. Restoring a version replaces draft pages and theme settings with the snapshot payload inside an interactive database transaction.

---

## 5. UI/UX Architecture & Responsive Simulation

The customer-facing application provides 10 dedicated routes under `/build`:

1. `/build`: Central dashboard with overview metrics, blueprints, and recent websites.
2. `/build/websites`: Directory with status tabs (`ALL`, `PUBLISHED`, `READY`, `DRAFT`) and search.
3. `/build/websites/new`: Guided wizard supporting autonomous AI generation or blank starters.
4. `/build/websites/[websiteId]`: Project hub with page counts, version history, and quick launchers.
5. `/build/websites/[websiteId]/editor`: Visual section-based canvas with device simulator.
6. `/build/websites/[websiteId]/pages`: Multi-page manager for routes, ordering, and SEO metadata.
7. `/build/websites/[websiteId]/design`: Theme palette, font pairings, and geometry controls.
8. `/build/websites/[websiteId]/assets`: Workspace media picker linked to Phase 4 assets.
9. `/build/websites/[websiteId]/preview`: Fullscreen responsive device simulator.
10. `/build/websites/[websiteId]/settings`: Hosted subdomain provisioning, unpublish, and version rollback.

### Responsive Simulation Engine
The editor and preview screens support three live viewport frames:
- **Desktop**: Full responsive width ($100\%$).
- **Tablet**: Fixed $768\text{px}$ viewport simulating iPad / tablet viewports.
- **Mobile**: Fixed $375\text{px}$ viewport simulating modern smartphone screens.
