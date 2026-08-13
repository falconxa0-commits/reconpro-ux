import { extractClientIP } from '@/lib/api-protection';
// ═══════════════════════════════════════════════════════════════════════
// Wall of Shame API — Anonymized Live Incident Ticker
// GET /api/wall-of-shame?limit=50&severity=critical&industry=finance
// ═══════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/api-security';


// ── Seeded PRNG (Mulberry32) ──────────────────────────────────────────

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// ── Types ──────────────────────────────────────────────────────────────

type Severity = 'critical' | 'high' | 'medium' | 'low';
type Industry = 'fintech' | 'healthcare' | 'saas' | 'government' | 'ecommerce' | 'education' | 'energy' | 'defense';
type FindingType =
  | 'exposed_database'
  | 'env_file_leak'
  | 'api_key_exposure'
  | 'open_s3_bucket'
  | 'unauthenticated_admin'
  | 'exposed_llm_endpoint'
  | 'cloud_misconfiguration'
  | 'credential_dump'
  | 'vulnerable_dependency'
  | 'ssl_misconfiguration';

type Region = 'US-East' | 'US-West' | 'EU-West' | 'EU-Central' | 'APAC' | 'LATAM' | 'MEA';

interface Incident {
  id: string;
  timestamp: string;
  severity: Severity;
  industry: Industry;
  findingType: FindingType;
  anonymizedDescription: string;
  assetType: string;
  region: Region;
  verifiable: boolean;
}

interface Stats {
  totalToday: number;
  totalWeek: number;
  criticalThisWeek: number;
  byIndustry: Record<Industry, number>;
  byType: Record<FindingType, number>;
}

// ── Constants ──────────────────────────────────────────────────────────

const INDUSTRIES: Industry[] = ['fintech', 'healthcare', 'saas', 'government', 'ecommerce', 'education', 'energy', 'defense'];
const FINDING_TYPES: FindingType[] = [
  'exposed_database', 'env_file_leak', 'api_key_exposure', 'open_s3_bucket',
  'unauthenticated_admin', 'exposed_llm_endpoint', 'cloud_misconfiguration',
  'credential_dump', 'vulnerable_dependency', 'ssl_misconfiguration',
];
const REGIONS: Region[] = ['US-East', 'US-West', 'EU-West', 'EU-Central', 'APAC', 'LATAM', 'MEA'];

const SEVERITY_WEIGHTS: [Severity, number][] = [
  ['critical', 8], ['high', 22], ['medium', 40], ['low', 30],
];

const HOUR_WEIGHTS = [
  0.15, 0.10, 0.08, 0.06, 0.05, 0.08, 0.20, 0.60, 1.0, 1.0, 1.0, 1.0,
  1.0, 1.0, 1.0, 0.95, 0.90, 0.70, 0.50, 0.35, 0.25, 0.20, 0.18, 0.15,
];


// ── Entity Templates ───────────────────────────────────────────────────

const ENTITY_TEMPLATES: Record<Industry, string[]> = {
  fintech: [
    'Fortune 500 financial institution', 'Major US retail bank', 'European investment bank',
    'Crypto exchange (top 20 by volume)', 'Southeast Asian digital payments provider',
    'US neobank (Series D)', 'Latin American remittance platform',
    'Global payment processor', 'UK challenger bank', 'Nordic buy-now-pay-later firm',
    'African mobile money provider', 'Japanese securities firm',
    'Middle East Islamic banking group', 'Indian peer-to-peer lending platform',
    'Canadian wealth management firm', 'Australian neobank',
    'Brazilian digital wallet provider', 'Singapore-based insurtech startup',
    'German digital bank', 'South Korean mobile payment app',
    'US-based mortgage origination platform', 'Pan-European card issuer',
    'Hong Kong virtual bank', 'Israeli fintech unicorn (Series E)',
  ],
  healthcare: [
    'European healthcare provider', 'US hospital network (200+ facilities)',
    'Major health insurance company', 'Telehealth platform (10M+ users)',
    'Electronic health records vendor', 'Pharmaceutical company (top 10 global)',
    'Medical device manufacturer', 'Dental insurance provider',
    'Mental health startup (Series C)', 'US Medicare claims processor',
    'UK NHS trust', 'Japanese pharmaceutical firm',
    'Australian pathology lab network', 'Brazilian public health system contractor',
    'Canadian provincial health authority', 'Indian hospital chain (500+ beds)',
    'Swiss biotech research firm', 'US FDA-regulated medical device startup',
    'German healthtech company', 'South Korean telemedicine platform',
    'Middle East healthcare conglomerate', 'African medical supply chain platform',
    'Nordic telehealth provider', 'US long-term care facility operator',
  ],
  saas: [
    'US SaaS company (Series C)', 'Enterprise HR platform (Fortune 500 clients)',
    'Project management tool (50M+ users)', 'Customer support SaaS (top 5 global)',
    'Marketing automation platform', 'Developer tools startup (Series B)',
    'US-based CRM provider', 'European cloud collaboration suite',
    'APAC workforce management platform', 'Identity-as-a-service provider',
    'US data analytics SaaS (Series D)', 'Japanese ERP cloud vendor',
    'Brazilian business management platform', 'UK-based legal tech SaaS',
    'Israeli cybersecurity SaaS (unicorn)', 'Indian HR tech platform',
    'Canadian accounting SaaS', 'Australian compliance platform',
    'US email marketing provider (500K+ customers)', 'German cloud hosting provider',
    'Middle East government SaaS contractor', 'Singapore-based fintech SaaS',
    'US recruitment platform (Series E)', 'French collaborative software company',
  ],
  government: [
    'US federal agency', 'European Union institution',
    'UK government department', 'Australian federal government portal',
    'Canadian provincial government', 'Japanese municipal government',
    'Brazilian federal court system', 'Indian state government',
    'South Korean public service platform', 'Nordic tax authority',
    'Middle East defense ministry', 'African Union commission',
    'US state election board', 'European border agency',
    'Singapore government digital services', 'German federal ministry',
    'US Department of Defense contractor', 'UK National Health Service digital',
    'Latin American customs authority', 'APAC regional trade body',
    'US intelligence community contractor', 'Canadian border services agency',
    'Israeli government tech unit', 'Australian cyber security agency',
  ],
  ecommerce: [
    'Major online marketplace (top 10 global)', 'US-based direct-to-consumer brand',
    'European fashion e-commerce platform', 'APAC food delivery platform (unicorn)',
    'US subscription box company', 'Latin American marketplace (Series F)',
    'UK grocery delivery platform', 'Indian e-commerce giant subsidiary',
    'Japanese online retailer', 'Australian marketplace',
    'Middle East classifieds platform', 'African e-commerce startup (Series C)',
    'US-based luxury goods retailer', 'German automotive parts marketplace',
    'Canadian home goods e-commerce', 'Brazilian fashion marketplace',
    'South Korean social commerce app', 'Singapore-based marketplace',
    'US dropshipping platform (1M+ sellers)', 'Nordic furniture e-commerce',
    'Global ticketing platform', 'US-based pet supplies retailer',
    'European electronics marketplace', 'Indian social commerce startup',
  ],
  education: [
    'US university system (R1 research)', 'UK Russell Group university',
    'European online learning platform (5M+ students)', 'US K-12 school district (100K+ students)',
    'Australian university consortium', 'Japanese edtech startup (Series B)',
    'Indian edtech unicorn', 'Canadian university',
    'Latin American online education platform', 'Middle East university network',
    'US standardized testing provider', 'UK edtech company (Series C)',
    'German vocational training platform', 'African MOOC platform',
    'South Korean test prep company', 'Singapore education ministry',
    'US student loan servicer', 'Brazilian distance learning university',
    'Nordic education technology provider', 'US learning management system vendor',
    'European language learning app (50M+ users)', 'Indian online tutoring platform',
    'US college admissions platform', 'Australian TAFE network provider',
  ],
  energy: [
    'US energy utility (multi-state)', 'European oil & gas major',
    'US renewable energy operator', 'Middle East national oil company',
    'Australian mining conglomerate', 'Nordic wind energy provider',
    'Latin American state petroleum company', 'Canadian pipeline operator',
    'Japanese nuclear facility operator', 'Indian power grid operator',
    'German energy trading platform', 'UK offshore wind farm operator',
    'US smart grid technology provider', 'Brazilian hydroelectric operator',
    'APAC liquefied natural gas exporter', 'South Korean utility company',
    'US solar panel manufacturer', 'European energy trading exchange',
    'Middle East desalination plant operator', 'African energy infrastructure developer',
    'US oilfield services company', 'Canadian oil sands operator',
    'Singapore energy trading firm', 'US battery storage provider',
  ],
  defense: [
    'US defense contractor (top 10)', 'European defense ministry',
    'NATO communications system', 'Israeli defense technology firm',
    'UK defence procurement agency', 'Australian defence force contractor',
    'Japanese defense electronics manufacturer', 'US aerospace & defense company',
    'Middle East defense contractor', 'Indian defense research organization',
    'Canadian naval systems provider', 'South Korean defense conglomerate',
    'European satellite communications provider', 'US cyber warfare contractor',
    'Nordic submarine systems manufacturer', 'Brazilian aerospace company',
    'German naval systems integrator', 'Singapore defense technology firm',
    'US intelligence surveillance platform vendor', 'UK cybersecurity defense contractor',
    'Japanese missile defense contractor', 'Australian signals intelligence unit',
    'US drone manufacturer', 'European aerospace consortium',
  ],
};

// ── Finding Description Templates ──────────────────────────────────────

const FINDING_TEMPLATES: Record<FindingType, ((entity: string) => string)[]> = {
  exposed_database: [
    (e) => `Unprotected MongoDB instance belonging to ${e} exposed 2.4M customer records`,
    (e) => `Publicly accessible PostgreSQL database at ${e} contained PII of 890K patients`,
    (e) => `${e} left Elasticsearch cluster open — 15M log entries with session tokens`,
    (e) => `Unauthenticated MySQL database at ${e} leaked 4.2M financial transaction records`,
    (e) => `Redis instance at ${e} exposed without auth, containing live session data`,
    (e) => `${e} had a publicly readable CouchDB with 1.1M internal documents`,
    (e) => `Exposed Microsoft SQL Server at ${e} contained employee salary data`,
    (e) => `${e} leaked customer database through misconfigured GraphQL introspection`,
    (e) => `Unprotected Cassandra cluster at ${e} exposed 3.8M payment records`,
    (e) => `${e} database backup publicly downloadable — 7.1M rows of structured PII`,
    (e) => `Open Firebase Realtime DB at ${e} leaked real-time location data of 500K users`,
    (e) => `${e} exposed DynamoDB table containing API audit logs with tokens`,
    (e) => `Unprotected MariaDB instance at ${e} contained 2.9M insurance claims`,
    (e) => `${e} SQLite database with credentials found in public GitHub repository`,
    (e) => `Exposed InfluxDB at ${e} leaked infrastructure monitoring data with internal IPs`,
    (e) => `${e} ClickHouse instance accessible without auth — 6.3M event records`,
    (e) => `Publicly accessible Oracle DB at ${e} contained HR records of 45K employees`,
    (e) => `${e} exposed Neo4j graph database with organizational structure and access policies`,
    (e) => `Unauthenticated TimescaleDB at ${e} leaked 18 months of sensor telemetry`,
    (e) => `${e} CockroachDB cluster open to internet — contained billing records`,
  ],
  env_file_leak: [
    (e) => `.env file committed to public repo at ${e} contained production database credentials`,
    (e) => `${e} leaked AWS_ACCESS_KEY_ID and SECRET_KEY in .env on public GitHub`,
    (e) => `Environment file at ${e} exposed Stripe secret key and webhook endpoint`,
    (e) => `${e} .env.local pushed to npm package — contained MongoDB URI and JWT secret`,
    (e) => `Public GitLab repo at ${e} had .env with SendGrid API key and admin password`,
    (e) => `${e} Docker Compose file with hardcoded env vars leaked to Docker Hub`,
    (e) => `.env.production at ${e} found in public S3 bucket — contained DB and Redis passwords`,
    (e) => `${e} leaked Twilio auth token in .env file on public Bitbucket repository`,
    (e) => `CI/CD pipeline config at ${e} had embedded production env vars in public repo`,
    (e) => `${e} Kubernetes deployment YAML with env secrets committed to public GitHub`,
    (e) => `.env.backup file at ${e} on public web server contained 12 API keys`,
    (e) => `${e} leaked Salesforce credentials in .env file on developer's public portfolio site`,
    (e) => `Terraform state file at ${e} in public repo contained environment secrets`,
    (e) => `${e} .env file on publicly indexed FTP server contained JWT signing key`,
    (e) => `Public documentation repo at ${e} included .env.example with real values`,
    (e) => `${e} leaked Datadog API key in .env file of public Helm chart`,
    (e) => `Env file at ${e} found in archived public repository — contained SMTP credentials`,
    (e) => `${e} publicly exposed .env with OAuth client secret and refresh token`,
    (e) => `GitHub Actions workflow at ${e} leaked environment variables in build logs`,
    (e) => `${e} .env.staging committed to public repo — contained same credentials as production`,
  ],
  api_key_exposure: [
    (e) => `GitHub personal access token with repo:scope found at ${e} — still active`,
    (e) => `${e} exposed AWS IAM access key in client-side JavaScript bundle`,
    (e) => `Slack bot token leaked in ${e} public code snippet — full workspace access`,
    (e) => `${e} hardcoded Stripe API key in mobile application binary`,
    (e) => `OpenAI API key found in ${e} public Jupyter notebook — $2,400 in unauthorized usage`,
    (e) => `${e} exposed Google Cloud service account key in public storage bucket`,
    (e) => `SendGrid API key at ${e} found in public Postman collection`,
    (e) => `${e} leaked GitHub OAuth app client_secret in client-side code`,
    (e) => `Twilio API key at ${e} exposed in public Swagger documentation`,
    (e) => `${e} hardcoded Algolia admin API key in publicly accessible config file`,
    (e) => `Firebase project config with API key at ${e} found in decompiled Android APK`,
    (e) => `${e} exposed Mapbox secret token in public GitHub gist`,
    (e) => `Shopify API credentials at ${e} leaked in public Stack Overflow answer`,
    (e) => `${e} exposed DigitalOcean personal access token in public Docker image`,
    (e) => `Cloudflare API token at ${e} found in public nginx configuration`,
    (e) => `${e} leaked PagerDuty service key in public incident response playbook`,
    (e) => `GitHub Actions PAT at ${e} with write:packages scope found in forked repo`,
    (e) => `${e} exposed Mailgun API key in public email template repository`,
    (e) => `Zoom API secret at ${e} found in publicly accessible meeting bot code`,
    (e) => `${e} leaked Azure AD application secret in public ARM template`,
    (e) => `Anthropic API key at ${e} found in public LangChain configuration file`,
  ],
  open_s3_bucket: [
    (e) => `Publicly readable S3 bucket at ${e} contained 3.2M customer documents`,
    (e) => `${e} S3 bucket with "public-read" ACL exposed 890GB of backup data`,
    (e) => `S3 bucket at ${e} contained database dumps with plaintext passwords`,
    (e) => `${e} exposed S3 bucket with employee W-2 tax forms (47K files)`,
    (e) => `Publicly writable S3 bucket at ${e} accepted uploads for 3 days before detection`,
    (e) => `${e} S3 bucket with sensitive medical imaging files had public access`,
    (e) => `Archived S3 bucket at ${e} still accessible — contained 5 years of financial reports`,
    (e) => `${e} S3 static hosting bucket exposed internal API documentation and architecture diagrams`,
    (e) => `S3 bucket at ${e} with "authenticated-read" but public listing exposed file metadata`,
    (e) => `${e} development S3 bucket in production account exposed 1.8M user records`,
    (e) => `Public S3 bucket at ${e} contained VM images with embedded credentials`,
    (e) => `${e} S3 bucket with video recordings of customer support calls was publicly accessible`,
    (e) => `Cross-account S3 bucket access at ${e} exposed data to unauthorized AWS account`,
    (e) => `${e} S3 bucket containing encrypted backups but with public key also stored in bucket`,
    (e) => `S3 access log bucket at ${e} was itself publicly readable — metadata of all S3 operations`,
    (e) => `${e} legacy S3 bucket from acquired company still public — contained PII`,
    (e) => `S3 bucket at ${e} with litigation hold documents exposed to public internet`,
    (e) => `${e} S3 bucket for ML training data contained real customer conversations`,
    (e) => `Public S3 bucket at ${e} had 4.7M driver's license scans`,
    (e) => `${e} S3 bucket with signed URLs leaked in public code — bypassed access controls`,
  ],
  unauthenticated_admin: [
    (e) => `Admin panel at ${e} accessible without authentication — full user management`,
    (e) => `${e} GraphQL Playground exposed in production with introspection enabled`,
    (e) => `phpMyAdmin at ${e} accessible on default credentials — root/no password`,
    (e) => `${e} Strapi CMS admin panel exposed without authentication`,
    (e) => `Jenkins instance at ${e} with no authentication — 340 build jobs accessible`,
    (e) => `${e} Kubernetes dashboard exposed without auth — full cluster access`,
    (e) => `Admin API at ${e} returned all user data without authentication via IDOR`,
    (e) => `${e} Grafana instance on default admin/admin credentials — 89 dashboards exposed`,
    (e) => `WordPress admin at ${e} accessible via default admin/password credentials`,
    (e) => `${e} exposed pgAdmin interface without authentication on port 5050`,
    (e) => `Admin panel at ${e} protected by HTTP Basic but credentials were admin/admin`,
    (e) => `${e} Airflow webserver on default credentials — 200+ DAGs visible`,
    (e) => `SonarQube at ${e} accessible without login — source code quality metrics exposed`,
    (e) => `${e} RabbitMQ management UI on default guest/guest — full queue control`,
    (e) => `Admin API at ${e} had broken JWT validation — empty token accepted`,
    (e) => `${e} exposed Supabase Studio without authentication`,
    (e) => `Portainer at ${e} on default credentials — full Docker host control`,
    (e) => `${e} admin console bypassed via HTTP method override (X-HTTP-Method-Override)`,
    (e) => `Metabase at ${e} accessible on default credentials — 45 database queries exposed`,
    (e) => `${e} Firebase Auth configuration allowed unauthenticated admin SDK access`,
  ],
  exposed_llm_endpoint: [
    (e) => `Unprotected LLM API at ${e} allowed arbitrary prompt injection with system context`,
    (e) => `${e} exposed internal RAG pipeline — full document corpus retrievable via API`,
    (e) => `LangServe endpoint at ${e} had no auth — could extract system prompt and knowledge base`,
    (e) => `${e} ChatGPT wrapper API leaked conversation history of all users`,
    (e) => `Unauthenticated vector database at ${e} exposed all embedding metadata and chunks`,
    (e) => `${e} LLM evaluation endpoint accessible without auth — could manipulate benchmark scores`,
    (e) => `Fine-tuned model API at ${e} had no rate limiting — extraction attack feasible`,
    (e) => `${e} exposed Pinecone index containing proprietary training data`,
    (e) => `LLM gateway at ${e} bypassed via API key in URL query parameter`,
    (e) => `${e} AI chatbot endpoint leaked system instructions via carefully crafted input`,
    (e) => `Hugging Face inference endpoint at ${e} publicly accessible — proprietary model exposed`,
    (e) => `${e} RAG endpoint allowed retrieval of source documents including confidential memos`,
    (e) => `Unprotected OpenAI proxy at ${e} leaked org-level usage and model configurations`,
    (e) => `${e} LLM application exposed tool-use definitions revealing internal API endpoints`,
    (e) => `Weaviate instance at ${e} without auth — full vector store of customer queries accessible`,
    (e) => `${e} exposed LLM logging endpoint — could read all model inputs and outputs`,
    (e) => `Anthropic API proxy at ${e} had no auth — direct model access with org billing`,
    (e) => `${e} AI agent with tool-calling exposed internal function schemas and API routes`,
    (e) => `Unauthenticated LLM benchmark endpoint at ${e} leaked proprietary evaluation datasets`,
    (e) => `${e} exposed ChromaDB collection containing proprietary document embeddings`,
  ],
  cloud_misconfiguration: [
    (e) => `${e} AWS security group allowed 0.0.0.0/0 inbound on port 3306 (MySQL)`,
    (e) => `${e} GCP storage bucket had uniform bucket-level access disabled — ACLs exploitable`,
    (e) => `Azure blob container at ${e} configured for public blob access`,
    (e) => `${e} AWS S3 bucket policy allowed any authenticated AWS user full access`,
    (e) => `${e} CloudFormation stack exposed parameters in public S3 template`,
    (e) => `${e} EKS cluster had public endpoint enabled with anonymous auth`,
    (e) => `Terraform state at ${e} stored in public backend — entire infrastructure definition exposed`,
    (e) => `${e} AWS IAM role with *:* permissions attached to publicly accessible Lambda`,
    (e) => `${e} Docker API exposed on TCP port 2375 without TLS — full host access`,
    (e) => `${e} Kubernetes etcd exposed on public IP without client cert auth`,
    (e) => `${e} AWS SNS topic publicly subscribable — received sensitive event notifications`,
    (e) => `${e} GCP compute disk snapshot publicly accessible — contained full OS image with data`,
    (e) => `${e} Azure Key Vault access policy granted to "Everyone" group`,
    (e) => `${e} CloudFront distribution had origin accessible directly, bypassing WAF`,
    (e) => `${e} AWS ElasticSearch domain open access — cluster metadata and indices exposed`,
    (e) => `${e} Azure App Service had CORS wildcard allowing cross-origin data theft`,
    (e) => `${e} GCP Cloud Functions with --allow-unauthenticated flag accessing private data`,
    (e) => `${e} AWS SSM Parameter Store with public read access — 200+ secrets exposed`,
    (e) => `${e} Lambda function at ${e} with environment variables containing production DB credentials`,
    (e) => `${e} had public RDP (3389) exposed to internet via security group misconfiguration`,
  ],
  credential_dump: [
    (e) => `${e} leaked 12,000 plaintext credentials in public code repository`,
    (e) => `Full credential dump from ${e} found on a paste site — 45K accounts`,
    (e) => `${e} employee password dump in publicly accessible Confluence export`,
    (e) => `Service account credentials for ${e} found in publicly indexed log file`,
    (e) => `${e} leaked SSH private keys in public Docker image on Docker Hub`,
    (e) => `Kerberos ticket cache from ${e} found in public network capture (pcap) file`,
    (e) => `${e} database credential rotation script with hardcoded current passwords in public repo`,
    (e) => `Windows DPAPI backup keys at ${e} exposed in publicly accessible file share`,
    (e) => `${e} leaked .npmrc with registry auth token for private package feed`,
    (e) => `${e} OAuth refresh tokens for 8,000 users found in public backup file`,
    (e) => `SSH known_hosts and private keys at ${e} in public GitHub user profile`,
    (e) => `${e} leaked .pem certificate files with private keys in public S3 bucket`,
    (e) => `${e} VPN credentials for 500 employees leaked via public configuration file`,
    (e) => `${e} exposed password hash dump (NTLM) in publicly accessible backup`,
    (e) => `${e} .kube/config with cluster credentials found in public repository`,
    (e) => `${e} leaked service mesh mTLS certificates in public documentation`,
    (e) => `Credential rotation log at ${e} exposed in public monitoring dashboard`,
    (e) => `${e} hard-coded database passwords in compiled Java class file on public Maven repo`,
    (e) => `${e} leaked AWS temporary credentials with active sessions in public CI artifact`,
  ],
  vulnerable_dependency: [
    (e) => `${e} running Log4j 2.14.1 — remote code execution via JNDI lookup`,
    (e) => `${e} using Spring4Shell-affected Spring Framework version — RCE possible`,
    (e) => `${e} running OpenSSL 1.1.1 with CVE-2024-5535 — heap buffer overflow`,
    (e) => `${e} jQuery 1.x with known XSS in .html() — affects 340 pages`,
    (e) => `${e} Apache Struts 2.5 with known OGNL injection vulnerability`,
    (e) => `${e} running vulnerable lodash version (<4.17.21) — prototype pollution`,
    (e) => `${e} using axios 0.21.1 with SSRF vulnerability`,
    (e) => `${e} Podman/Kubernetes image with known CVE-2024-21626 — container escape`,
    (e) => `${e} running Exim 4.90 with critical RCE (CVE-2023-42115)`,
    (e) => `${e} using vulnerable Newtonsoft.Json with type confusion vulnerability`,
    (e) => `${e} Django application with CVE-2024-53908 — SQL injection in JSONField`,
    (e) => `${e} running affected libwebp — heap buffer overflow in WebP decoding`,
    (e) => `${e} Python pip dependency with typosquatting supply chain attack`,
    (e) => `${e} using compromised npm package (crossenv) — token exfiltration`,
    (e) => `${e} running Apache HTTPD 2.4.49 with path traversal CVE-2021-41773`,
    (e) => `${e} vulnerable to CVE-2024-3094 in xz-utils — backdoor in SSH`,
    (e) => `${e} using React DOM with known cross-site scripting vulnerability`,
    (e) => `${e} running PostgreSQL driver with authentication bypass (CVE-2024-10979)`,
    (e) => `${e} using glibc with buffer overflow (CVE-2024-33599)`,
    (e) => `${e} Ruby on Rails with CVE-2024-26141 — possible RCE via Active Storage`,
  ],
  ssl_misconfiguration: [
    (e) => `${e} using self-signed TLS certificate in production — no trust chain`,
    (e) => `${e} SSL certificate expired 47 days ago — still serving HTTPS traffic`,
    (e) => `${e} supports TLS 1.0 and 1.1 — vulnerable to BEAST and POODLE attacks`,
    (e) => `${e} using weak cipher suites (RC4, DES, EXPORT grade)`,
    (e) => `${e} certificate chain incomplete — intermediate CA missing`,
    (e) => `${e} HSTS header missing — vulnerable to SSL stripping attacks`,
    (e) => `${e} TLS certificate using SHA-1 signature algorithm — cryptographically weak`,
    (e) => `${e} mixed content — loading HTTP resources on HTTPS page`,
    (e) => `${e} using 1024-bit RSA key — insufficient key length for modern standards`,
    (e) => `${e} certificate hostname mismatch — serving cert for different domain`,
    (e) => `${e} OCSP stapling not enabled — certificate revocation not checked`,
    (e) => `${e} HTTPS redirect loop detected due to misconfigured certificate`,
    (e) => `${e} TLS 1.3 downgraded to 1.2 due to misconfigured server`,
    (e) => `${e} using DHE key exchange with 768-bit parameters — weak`,
    (e) => `${e} certificate transparency logs missing — no public audit trail`,
    (e) => `${e} serves both HTTP and HTTPS — sensitive cookies sent over HTTP`,
    (e) => `${e} using wildcard certificate for unrelated subdomains`,
    (e) => `${e} CSR revealed organization details not matching actual entity`,
    (e) => `${e} SSL renegotiation not disabled — vulnerable to DoS`,
    (e) => `${e} using ECDSA with P-192 curve — insufficient for security`,
  ],
};

const ASSET_TYPES: Record<FindingType, string[]> = {
  exposed_database: ['Database Server', 'NoSQL Cluster', 'Data Warehouse', 'Document Store', 'Graph Database'],
  env_file_leak: ['Source Repository', 'CI/CD Pipeline', 'File Server', 'Docker Image', 'Config Repository'],
  api_key_exposure: ['Client Application', 'API Gateway', 'Source Code', 'Mobile App', 'Documentation Site'],
  open_s3_bucket: ['Cloud Storage', 'Backup Archive', 'Static Hosting', 'Data Lake', 'CDN Origin'],
  unauthenticated_admin: ['Web Application', 'Admin Panel', 'DevOps Tool', 'Monitoring Dashboard', 'CMS Platform'],
  exposed_llm_endpoint: ['AI Service', 'RAG Pipeline', 'Vector Database', 'Chatbot API', 'Model Endpoint'],
  cloud_misconfiguration: ['Cloud Infrastructure', 'Container Platform', 'IaC Template', 'Serverless Function', 'Cloud Storage'],
  credential_dump: ['Source Repository', 'Backup Archive', 'Configuration Store', 'Log Aggregator', 'Package Registry'],
  vulnerable_dependency: ['Web Application', 'API Server', 'Container Image', 'Build Pipeline', 'Mobile Backend'],
  ssl_misconfiguration: ['Web Server', 'Load Balancer', 'API Gateway', 'CDN Endpoint', 'Mail Server'],
};

// ── Incident Generation ────────────────────────────────────────────────

function pickSeverity(rng: () => number): Severity {
  const r = rng() * 100;
  let cum = 0;
  for (const [sev, weight] of SEVERITY_WEIGHTS) {
    cum += weight;
    if (r < cum) return sev;
  }
  return 'low';
}

function pickIndustry(rng: () => number): Industry {
  return INDUSTRIES[Math.floor(rng() * INDUSTRIES.length)];
}

function pickFindingType(rng: () => number): FindingType {
  return FINDING_TYPES[Math.floor(rng() * FINDING_TYPES.length)];
}

function pickRegion(rng: () => number): Region {
  return REGIONS[Math.floor(rng() * REGIONS.length)];
}

function pickEntity(rng: () => number, industry: Industry): string {
  const entities = ENTITY_TEMPLATES[industry];
  return entities[Math.floor(rng() * entities.length)];
}

function pickDescription(rng: () => number, ft: FindingType, entity: string): string {
  const templates = FINDING_TEMPLATES[ft];
  const tpl = templates[Math.floor(rng() * templates.length)];
  return tpl(entity);
}

function pickAssetType(rng: () => number, ft: FindingType): string {
  const types = ASSET_TYPES[ft];
  return types[Math.floor(rng() * types.length)];
}

function generateIncident(rng: () => number, timestamp: Date, id: string): Incident {
  const industry = pickIndustry(rng);
  const findingType = pickFindingType(rng);
  const severity = pickSeverity(rng);
  const entity = pickEntity(rng, industry);
  const region = pickRegion(rng);

  return {
    id,
    timestamp: timestamp.toISOString(),
    severity,
    industry,
    findingType,
    anonymizedDescription: pickDescription(rng, findingType, entity),
    assetType: pickAssetType(rng, findingType),
    region,
    verifiable: rng() > 0.25,
  };
}

/**
 * Generate incidents for a given time window.
 * Uses minute-level seed so it's deterministic per-minute (no flicker on refresh).
 * Average rate: ~4.2 incidents/hour weighted by business hours.
 */
function generateIncidents(
  since: Date,
  until: Date,
  seedPrefix: string = 'wos',
): Incident[] {
  const incidents: Incident[] = [];
  const minute = 60 * 1000;
  let cursor = new Date(since);
  cursor.setSeconds(0, 0);
  cursor.setMinutes(cursor.getMinutes() + 1);

  while (cursor < until) {
    const minuteKey = `wos:${Math.floor(cursor.getTime() / minute)}`;
    const seed = hashCode(minuteKey);
    const rng = mulberry32(seed);

    const hour = cursor.getUTCHours();
    const hourWeight = HOUR_WEIGHTS[hour];
    const expectedIncidents = 0.07 * hourWeight;

    if (rng() < expectedIncidents) {
      const id = `inc-${Math.floor(cursor.getTime() / minute)}-${Math.floor(rng() * 1000)}`;
      const jitteredTs = new Date(cursor.getTime() + Math.floor(rng() * 60000));
      incidents.push(generateIncident(rng, jitteredTs, id));
    }

    cursor = new Date(cursor.getTime() + minute);
  }

  return incidents;
}

// ── Stats Calculation ──────────────────────────────────────────────────

function computeStats(weekIncidents: Incident[]): Stats {
  const now = new Date();
  const todayStart = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  const todayIncidents = weekIncidents.filter(i => new Date(i.timestamp) >= todayStart);

  const byIndustry = {} as Record<Industry, number>;
  const byType = {} as Record<FindingType, number>;

  for (const ind of INDUSTRIES) byIndustry[ind] = 0;
  for (const ft of FINDING_TYPES) byType[ft] = 0;

  for (const inc of weekIncidents) {
    byIndustry[inc.industry]++;
    byType[inc.findingType]++;
  }

  return {
    totalToday: todayIncidents.length,
    totalWeek: weekIncidents.length,
    criticalThisWeek: weekIncidents.filter(i => i.severity === 'critical').length,
    byIndustry,
    byType,
  };
}

// ── Route Handler ──────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { allowed } = checkRateLimit(extractClientIP(request), 30, 60000);
  if (!allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  const { searchParams } = request.nextUrl;
  const limitParam = searchParams.get('limit');
  const severityFilter = searchParams.get('severity') as Severity | null;
  const industryFilter = searchParams.get('industry') as Industry | null;

  const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 50, 1), 200) : 50;

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const allIncidents = generateIncidents(weekAgo, now);

  let filtered = allIncidents;
  if (severityFilter && ['critical', 'high', 'medium', 'low'].includes(severityFilter)) {
    filtered = filtered.filter(i => i.severity === severityFilter);
  }
  if (industryFilter && INDUSTRIES.includes(industryFilter)) {
    filtered = filtered.filter(i => i.industry === industryFilter);
  }

  filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const incidents = filtered.slice(0, limit);
  const stats = computeStats(allIncidents);

  return NextResponse.json({ incidents, stats });
}
