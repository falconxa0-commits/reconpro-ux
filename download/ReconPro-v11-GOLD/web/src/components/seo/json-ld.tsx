// ═══════════════════════════════════════════════════════════════
// ReconPro — JSON-LD Structured Data
// ═══════════════════════════════════════════════════════════════

const SITE_URL = "https://reconpro.dev";

/** WebApplication schema — describes ReconPro as a software application */
const webApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "ReconPro",
  description:
    "Attack surface intelligence with reconnaissance scanning, threat detection, and compliance mapping.",
  url: SITE_URL,
  applicationCategory: "SecurityApplication",
  operatingSystem: "Linux, macOS, Windows",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "Open Source — MIT License",
  },
  featureList: [
    "DNS, SSL, port, and HTTP scanning",
    "REST API with 60 endpoints",
    "Compliance mapping (SOC2, ISO27001, HIPAA, PCI-DSS, NIST, GDPR)",
    "Dashboard with 8 dedicated routes",
    "Team management and audit logging",
    "SSRF-protected scanning engine",
  ],
  softwareVersion: "0.2.0",
  programmingLanguage: "TypeScript",
  license: "https://opensource.org/licenses/MIT",
  author: {
    "@type": "Organization",
    name: "ReconPro",
    url: SITE_URL,
  },
  installUrl: `${SITE_URL}/docs`,
  screenshot: `${SITE_URL}/og-image.png`,
};

/** Organization schema — describes the project/entity */
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "ReconPro",
  alternateName: "ReconPro ASM",
  url: SITE_URL,
  logo: `${SITE_URL}/logo.svg`,
  description:
    "Open-source attack surface intelligence platform.",
  sameAs: [],
  foundingDate: "2024",
  license: "https://opensource.org/licenses/MIT",
};

/** SoftwareSourceCode schema */
const softwareSourceSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareSourceCode",
  name: "ReconPro",
  description:
    "Attack surface intelligence platform.",
  url: SITE_URL,
  codeRepository: SITE_URL,
  programmingLanguage: "TypeScript",
  runtimePlatform: "Node.js",
  license: "https://opensource.org/licenses/MIT",
  version: "0.2.0",
  author: {
    "@type": "Organization",
    name: "ReconPro",
  },
};

export function JsonLdStructuredData() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(webApplicationSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareSourceSchema),
        }}
      />
    </>
  );
}
