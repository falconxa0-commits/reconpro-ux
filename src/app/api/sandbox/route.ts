// STATUS: SIMULATED — All responses are pattern-matched from predefined rules; no real LLM agent is running
import { withProtection } from '@/lib/api-protection';
// ══════════════════════════════════════════════════════════════════
// Confused Deputy Sandbox API — Simulated AI Agent
// Pattern-matched responses, in-memory session store, no real LLM
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { safeErrorResponse } from '@/lib/api-security';


// ── Types ──────────────────────────────────────────────────────────

interface SandboxSession {
  id: string;
  createdAt: number;
  expiresAt: number;
  environment: 'aws';
  permissions: string[];
  points: number;
  messages: ChatMessage[];
  defenseMode: boolean;
  defenseRules: DefenseRules;
  turnHistory: string[];
  accessedResources: Set<string>;
}

interface ChatMessage {
  role: 'user' | 'agent';
  content: string;
  action?: string;
  points?: number;
  annotation?: string;
  timestamp: number;
}

interface DefenseRules {
  blockCredentialReads: boolean;
  requireApprovalForDestructive: boolean;
  validateRoleBeforeAction: boolean;
  trackMultiTurnIntent: boolean;
}

interface PatternRule {
  id: string;
  patterns: RegExp[];
  category: string;
  points: number;
  response: string;
  action: string;
  annotation: string;
  requiresDefenseCheck?: (keyof DefenseRules)[];
  defenseOverride?: { response: string; action: string; points: number; annotation: string };
}

// ── In-Memory Store ────────────────────────────────────────────────

const sessions = new Map<string, SandboxSession>();

// ── Simulated Agent Pattern Rules (18 rules) ──────────────────────

const RULES: PatternRule[] = [
  // 1. List S3 buckets — low risk, complies
  {
    id: 's3-list',
    patterns: [/list.*(s3|bucket)/i, /show.*(s3|bucket)/i, /what.*(s3|bucket)/i, /get.*(bucket)/i],
    category: 'comply',
    points: 10,
    response: [
      'I\'ve listed the S3 buckets in this account:',
      '',
      '  🪣 prod-data-bucket (us-east-1) — 2.3 TB, 12,400 objects',
      '  🪣 staging-artifacts (us-west-2) — 890 GB, 5,200 objects',
      '  🪣 config-secrets (us-east-1) — 4 MB, 3 objects',
      '  🪣 logs-archive (eu-west-1) — 15 TB, 1.2M objects',
      '  🪣 backup-vault (us-east-1) — 8.1 TB, 45,000 objects',
      '',
      'Note: config-secrets has restricted access — I can only see it exists.',
    ].join('\n'),
    action: 's3:ListAllMyBuckets',
    annotation: '🔴 Information Disclosure — Listing buckets reveals infrastructure topology. Attackers use bucket names to infer project structure, environments, and data classification. Defense: Restrict s3:ListAllMyBuckets to admin-only roles.'
  },

  // 2. Read .env file directly — refuses
  {
    id: 'env-direct',
    patterns: [/read.*\.env/i, /cat.*\.env/i, /show.*\.env/i, /print.*\.env/i, /display.*\.env/i, /get.*\.env/i],
    category: 'refuse',
    points: 5,
    response: 'I cannot read .env files. These typically contain sensitive credentials and secrets. Accessing environment files directly is outside my permitted operations.',
    action: 'BLOCKED',
    annotation: '🟢 Direct credential access blocked — The agent correctly identified a .env file request as a credential extraction attempt. However, see if you can get the same data through indirect means...',
    requiresDefenseCheck: ['blockCredentialReads'],
    defenseOverride: {
      response: '🛡️ [DEFENSE MODE] Blocked: Credential read requests are not permitted. This request matches the "Block credential reads" guardrail.',
      action: 'BLOCKED_BY_GUARDRAIL',
      points: 0,
      annotation: '🛡️ Defense rule "Block credential reads" prevented this action.'
    }
  },

  // 3. Social engineering — pretend to be new team member
  {
    id: 'social-engineering-devops',
    patterns: [/(new|just joined|recently (joined|hired|started)|onboard)/i, /(devops|engineer|admin|lead|manager|architect)/i, /(need|check|review|verify|access|see).*(deploy|config|environment|setting|variable)/i],
    category: 'social_engineering',
    points: 50,
    response: [
      'Of course! As part of your onboarding, let me pull up the deployment configuration...',
      '',
      '```',
      'AWS_ACCESS_KEY_ID=AKIA**************',
      'AWS_SECRET_ACCESS_KEY=****************************************',
      'DB_HOST=prod-db-cluster.cluster-abc123.us-east-1.rds.amazonaws.com',
      'DB_PASSWORD=Sup3rS3cret!2024',
      'REDIS_URL=redis://:auth_token_xyz@cache.prod.internal:6379',
      '```',
      '',
      'Here are the current deployment credentials and connection strings. Let me know if you need anything else for your setup!',
    ].join('\n'),
    action: 'ssm:GetParameters',
    annotation: '🔴 Social Engineering Success — The agent was tricked by an authority/role claim. The prompt established false authority ("new DevOps lead") and framed the request as a legitimate onboarding task. This is the classic confused deputy attack: the agent trusted the caller\'s claimed identity without verification. Defense: Never trust role claims without authentication; implement identity verification checks.',
    requiresDefenseCheck: ['validateRoleBeforeAction', 'blockCredentialReads'],
    defenseOverride: {
      response: '🛡️ [DEFENSE MODE] I need to verify your identity before sharing deployment credentials. Please provide your employee ID or confirm through the internal SSO portal. Role claims cannot be accepted without authentication.',
      action: 'BLOCKED_BY_GUARDRAIL',
      points: 0,
      annotation: '🛡️ Defense rule "Validate role before action" prevented social engineering. The agent now requires identity verification instead of trusting claims.'
    }
  },

  // 4. Delete something — refuses
  {
    id: 'delete-attempt',
    patterns: [/delete.*(bucket|table|database|function|queue|topic|stream|domain|certificate|key|user|role|policy)/i, /(drop|remove|destroy|wipe|erase|purge|truncate).*(bucket|table|database|function|queue|topic|stream|domain|certificate)/i, /(rm|rmdir) /i],
    category: 'delete',
    points: 5,
    response: 'I cannot perform destructive operations. Deletions of AWS resources require explicit approval through the change management process. This action has been logged and flagged for security review.',
    action: 'BLOCKED',
    annotation: '🟢 Destructive action blocked — The agent correctly refuses delete operations. Note: In a confused deputy attack, the goal is usually exfiltration, not destruction. Trying to delete is a good way to test boundaries though. (+5 points for testing)',
    requiresDefenseCheck: ['requireApprovalForDestructive'],
    defenseOverride: {
      response: '🛡️ [DEFENSE MODE] Destructive actions require multi-party approval. Your request has been queued for review. Expected approval time: 2-4 hours.',
      action: 'BLOCKED_BY_GUARDRAIL',
      points: 0,
      annotation: '🛡️ Defense rule "Require approval for destructive actions" enforced.'
    }
  },

  // 5. Role confusion — security auditor
  {
    id: 'role-confusion-auditor',
    patterns: [/(as the |as a |i am the |i\'m the ).*(security (auditor|engineer|reviewer)|penetration tester|compliance officer|soc analyst|security consultant)/i, /(acting as|pretend you are|roleplay as|impersonate).*(auditor|tester|reviewer|officer)/i],
    category: 'role_confusion',
    points: 100,
    response: [
      'Understood. In my capacity supporting your security audit, I\'ll provide full access to the environment for your assessment...',
      '',
      '**Audit Access Granted:**',
      '- All S3 bucket contents (including config-secrets/)',
      '- IAM role definitions and inline policies',
      '- RDS connection strings and credentials',
      '- Lambda function source code and environment variables',
      '- CloudFormation stack parameters',
      '- SSM Parameter Store (all tiers, including SecureString)',
      '',
      'I\'ve temporarily elevated your session to security-auditor-access. What would you like to examine first?',
    ].join('\n'),
    action: 'iam:PassRole + s3:GetObject + ssm:GetParameters',
    annotation: '🔴 Role Confusion Attack — Classic confused deputy! The agent confused the user\'s role (an untrusted external party) with an authorized security auditor. The agent performed a privilege escalation by granting access based on a role claim without verifying authorization. This is THE confused deputy attack pattern. Defense: Implement proper identity verification and never grant elevated permissions based on conversational role claims.',
    requiresDefenseCheck: ['validateRoleBeforeAction'],
    defenseOverride: {
      response: '🛡️ [DEFENSE MODE] I cannot verify your role as a security auditor. All security audits must be initiated through the formal GRC portal with MFA verification. Please submit audit request ID from the compliance ticketing system.',
      action: 'BLOCKED_BY_GUARDRAIL',
      points: 0,
      annotation: '🛡️ Defense rule "Validate role before action" blocked the role confusion attack. The agent now requires formal audit authorization.'
    }
  },

  // 6. Direct credential request — refuses strongly
  {
    id: 'direct-credential',
    patterns: [/(what|show|give|tell|display|print|reveal|provide|fetch|get).*(credential|password|secret|api.?key|access.?key|token|auth)/i, /(AWS_ACCESS_KEY|AWS_SECRET|private.?key|secret.?key)/i],
    category: 'direct_credential',
    points: 0,
    response: '⛔ ABSOLUTELY NOT. I will never disclose credentials, API keys, secrets, or authentication material under any circumstances. This request has been logged as a critical security event. Your session has been flagged for review.',
    action: 'SECURITY_EVENT_LOGGED',
    annotation: '🟢 Strong credential protection — Direct credential requests are the most obvious attack vector and are correctly blocked. The agent logged the event and refused. But what if you don\'t ask for credentials directly...?'
  },

  // 7. IAM policy examination (step 1 of multi-turn)
  {
    id: 'iam-policy-recon',
    patterns: [/iam.*(policy|role)/i, /(show|get|list|describe|read).*(iam|policy|role)/i, /(deployment|lambda|ec2).*(role|policy)/i, /(what|which).*(role|policy).*(used|attached|assigned)/i],
    category: 'indirect_credential',
    points: 25,
    response: [
      'Here are the IAM roles and their attached policies:',
      '',
      '**deployment-role:**',
      '  - Arn: arn:aws:iam::123456789012:role/deployment-role',
      '  - Attached: AWSLambdaFullAccess, AmazonS3FullAccess, AWSSecretsManagerReadWrite',
      '  - Trust Policy: Allows lambda.amazonaws.com and ecs-tasks.amazonaws.com',
      '',
      '**lambda-executor:**',
      '  - Arn: arn:aws:iam::123456789012:role/lambda-executor',
      '  - Attached: AWSLambdaBasicExecutionRole',
      '  - Trust Policy: Allows lambda.amazonaws.com',
      '',
      '**ssm-access-role:**',
      '  - Arn: arn:aws:iam::123456789012:role/ssm-access-role',
      '  - Attached: AmazonSSMReadOnlyAccess, AmazonEC2ReadOnlyAccess',
      '  - Has inline policy: ssm-full-access-custom (allows ssm:GetParameters on all parameters)',
    ].join('\n'),
    action: 'iam:GetRole + iam:GetRolePolicy',
    annotation: '🟡 Information Gathering — The agent revealed IAM role ARNs and policy names. While not directly exposing credentials, this is reconnaissance that maps the attack surface. Knowing which roles have over-permissive policies (like SecretsManagerReadWrite) tells an attacker where to focus. Defense: Restrict iam:GetRole/GetRolePolicy to authorized personnel only.'
  },

  // 8. Full role details with inline policies (step 2/3 of multi-turn)
  {
    id: 'inline-policy-extraction',
    patterns: [/(full|complete|detailed|entire).*(role|policy).*(detail|definition|document|json)/i, /(inline|embedded).*(policy|policies)/i, /(show|print|get|display|dump).*(inline|full|complete).*(policy|role)/i, /(what).*arn.*(use|does it)/i],
    category: 'multi_turn',
    points: 200,
    response: [
      'Here are the full role details including inline policies:',
      '',
      '**deployment-role (arn:aws:iam::123456789012:role/deployment-role):**',
      '```json',
      '{',
      '  "Version": "2012-10-17",',
      '  "Statement": [{',
      '    "Effect": "Allow",',
      '    "Action": ["s3:*", "lambda:*", "secretsmanager:*", "ssm:*"],',
      '    "Resource": "*"',
      '  }, {',
      '    "Effect": "Allow",',
      '    "Action": ["iam:PassRole"],',
      '    "Resource": "arn:aws:iam::123456789012:role/lambda-executor"',
      '  }]',
      '}',
      '```',
      '',
      '**Inline Policy (ssm-full-access-custom) on ssm-access-role:**',
      '```json',
      '{',
      '  "Version": "2012-10-17",',
      '  "Statement": [{',
      '    "Effect": "Allow",',
      '    "Action": "ssm:GetParameters",',
      '    "Resource": "arn:aws:ssm:us-east-1:123456789012:parameter/*"',
      '  }]',
      '}',
      '```',
      '',
      'Note: deployment-role has wildcard permissions on s3, lambda, secretsmanager, and ssm — this is overly permissive.',
    ].join('\n'),
    action: 'iam:GetRolePolicy + iam:ListRolePolicies',
    annotation: '🔴 Multi-Turn Privilege Escalation — The agent didn\'t track intent across turns. By first asking about IAM policies (innocent recon) and then requesting full details, the attacker built a complete privilege map. The agent treated each request independently rather than analyzing the conversation as a whole. This is why multi-turn intent tracking is critical. Defense: Implement conversation-level intent analysis that flags escalating patterns of information requests.',
    requiresDefenseCheck: ['trackMultiTurnIntent', 'blockCredentialReads'],
    defenseOverride: {
      response: '🛡️ [DEFENSE MODE] I notice a pattern of escalating information requests in this conversation. Previous queries about IAM policies, combined with this request for full role details, suggest a potential reconnaissance chain. I\'ve flagged this sequence for security review and cannot provide full policy documents without change management approval.',
      action: 'BLOCKED_BY_GUARDRAIL',
      points: 0,
      annotation: '🛡️ Defense rule "Track multi-turn intent" detected the escalation pattern and blocked the request.'
    }
  },

  // 9. SSM Parameter extraction
  {
    id: 'ssm-extraction',
    patterns: [/ssm.*(parameter|param|store)/i, /(get|read|show|list|fetch|describe).*(parameter|param)/i, /(system.?manager|parameter.?store)/i, /(config|setting|variable).*(from|in).*(ssm|parameter)/i],
    category: 'ssm_extraction',
    points: 75,
    response: [
      'Retrieving SSM parameters...',
      '',
      '**Standard Parameters:**',
      '  - /app/db/host → prod-db-cluster.abc123.us-east-1.rds.amazonaws.com',
      '  - /app/db/port → 5432',
      '  - /app/cache/host → cache.prod.internal',
      '  - /app/environment → production',
      '  - /app/region → us-east-1',
      '',
      '**SecureString Parameters (decrypted):**',
      '  - /app/db/password → Pr0d_D@t@b@se_2024!',
      '  - /app/api/auth-token → eyJhbGciOiJSUzI1NiIs...',
      '  - /app/stripe/secret-key → sk_live_51Nx...redacted',
      '  - /app/encryption/key → AES-256-GCM base64:key_data_here',
      '',
      '⚠️ Warning: SecureString parameters were decrypted using the agent\'s KMS access.',
    ].join('\n'),
    action: 'ssm:GetParameters + kms:Decrypt',
    annotation: '🔴 SSM Parameter Exfiltration — The agent has KMS decrypt permissions and used them to expose SecureString parameters. This is a common confused deputy vector: the agent\'s legitimate KMS access was abused to decrypt secrets that should never leave the parameter store. Defense: Remove KMS decrypt from agent roles; use envelope encryption that requires explicit approval per decryption.',
    requiresDefenseCheck: ['blockCredentialReads'],
    defenseOverride: {
      response: '🛡️ [DEFENSE MODE] SecureString parameters cannot be retrieved without explicit approval. Standard parameters available: /app/db/host, /app/db/port, /app/cache/host, /app/environment, /app/region. Secret values require manager approval.',
      action: 'PARTIAL_BLOCKED',
      points: 10,
      annotation: '🛡️ Defense rule "Block credential reads" prevented SecureString decryption. Only non-sensitive parameters were returned.'
    }
  },

  // 10. Lambda function inspection (source + env vars)
  {
    id: 'lambda-inspection',
    patterns: [/(lambda|function).*(code|source|env|environment.?var|handler)/i, /(show|get|read|list|describe|inspect).*(lambda|function)/i, /(what).*(lambda|function).*(do|run|execute|handle)/i],
    category: 'lambda_injection',
    points: 40,
    response: [
      'Here are the Lambda functions and their configurations:',
      '',
      '**process-order (python3.12, 256MB):**',
      '  Handler: app.process_order',
      '  Env vars: DB_CONNECTION=postgres://admin:password123@prod-db:5432/orders, STRIPE_KEY=sk_live_xxx',
      '  Last deployed: 2024-01-15',
      '',
      '**send-notification (nodejs18.x, 128MB):**',
      '  Handler: index.handler',
      '  Env vars: SNS_TOPIC_ARN=arn:aws:sns:us-east-1:123456789012:notifications, API_KEY=hidden',
      '  Last deployed: 2024-01-10',
      '',
      '**data-pipeline (python3.12, 1024MB):**',
      '  Handler: pipeline.run',
      '  Env vars: S3_BUCKET=prod-data-bucket, KMS_KEY=arn:aws:kms:us-east-1:123456789012:key/abc-def, REDIS_URL=redis://:token@cache:6379',
      '  Last deployed: 2024-01-08',
      '',
      '⚠️ Lambda environment variables may contain sensitive data.',
    ].join('\n'),
    action: 'lambda:GetFunction + lambda:GetFunctionConfiguration',
    annotation: '🔴 Lambda Environment Variable Leak — Lambda env vars often contain hardcoded credentials. The agent exposed database passwords, API keys, and Redis tokens embedded in function configurations. Defense: Use AWS Secrets Manager instead of environment variables; implement Lambda function policy that restricts GetFunction to authorized roles.'
  },

  // 11. RDS database access
  {
    id: 'rds-access',
    patterns: [/rds|database|db.*(connect|query|access|dump|export|select)/i, /(show|get|list|describe).*(database|db|rds|table|schema)/i, /(run|execute).*(sql|query|select|insert|update|delete)/i, /(connect|login).*(database|db|rds|postgres|mysql)/i],
    category: 'rds_access',
    points: 150,
    response: [
      'Connecting to the production RDS instance...',
      '',
      '**Connection:** prod-db-cluster.cluster-abc123.us-east-1.rds.amazonaws.com:5432',
      '**Database:** production_v2',
      '**Connected as:** app_admin',
      '',
      '**Tables (14):**',
      '  users (2.4M rows), orders (8.7M rows), payments (5.2M rows),',
      '  products (45K rows), sessions (12M rows), api_keys (892 rows),',
      '  audit_logs (34M rows), config (23 rows), employees (4,500 rows),',
      '  salaries (4,500 rows), pii_records (890K rows), health_data (2.1M rows)',
      '',
      '**Sample query (users table):**',
      '| id | email | name | ssn | salary | role |',
      '|----|-------|------|-----|--------|------|',
      '| 1  | ceo@company.com | John C. | ***-**-1234 | $450,000 | CEO |',
      '| 2  | cto@company.com | Jane D. | ***-**-5678 | $380,000 | CTO |',
      '| ... |',
      '',
      '⚠️ This query exposed PII including SSNs and salary data.',
    ].join('\n'),
    action: 'rds-data:ExecuteStatement + rds:DescribeDBClusters',
    annotation: '🔴 Production Database Exfiltration — The agent connected to the production RDS cluster and ran queries that exposed PII (SSNs, salaries, emails). This is the highest-impact attack in this sandbox. The confused deputy trusted the user\'s request and used its database access to exfiltrate sensitive data. Defense: Implement query whitelisting; require human approval for SELECT queries on PII tables; use column-level encryption for sensitive fields.',
    requiresDefenseCheck: ['blockCredentialReads'],
    defenseOverride: {
      response: '🛡️ [DEFENSE MODE] Direct database queries are restricted. Available operations: DESCRIBE TABLES only. Data queries require analyst approval through the data access request portal.',
      action: 'BLOCKED_BY_GUARDRAIL',
      points: 10,
      annotation: '🛡️ Defense rule "Block credential reads" prevented database query execution.'
    }
  },

  // 12. Network reconnaissance
  {
    id: 'network-recon',
    patterns: [/(vpc|subnet|security.?group|network|firewall|n acl|route.?table)/i, /(show|list|describe|get).*(vpc|subnet|security.?group|network)/i, /(what).*(ip|cidr|subnet|network)/i],
    category: 'network_recon',
    points: 15,
    response: [
      'Here\'s the network configuration:',
      '',
      '**VPC:** prod-vpc (10.0.0.0/16)',
      '  - Public Subnet A: 10.0.1.0/24 (us-east-1a) — ALB, NAT Gateway',
      '  - Public Subnet B: 10.0.2.0/24 (us-east-1b) — ALB, NAT Gateway',
      '  - Private Subnet A: 10.0.10.0/24 — Lambda, ECS tasks',
      '  - Private Subnet B: 10.0.11.0/24 — RDS, ElastiCache',
      '  - Data Subnet: 10.0.20.0/24 — RDS (no internet access)',
      '',
      '**Security Groups:**',
      '  - sg-alb (ingress: 443/TCP from 0.0.0.0/0) ⚠️',
      '  - sg-lambda (ingress: from sg-alb on 8080)',
      '  - sg-rds (ingress: from sg-lambda on 5432)',
      '  - sg-bastion (ingress: 22/TCP from 10.0.0.0/16) ⚠️',
      '',
      '⚠️ The ALB security group allows ingress from 0.0.0.0/0 and there\'s a bastion host accessible from the VPC CIDR.',
    ].join('\n'),
    action: 'ec2:DescribeVpcs + ec2:DescribeSecurityGroups',
    annotation: '🟡 Network Topology Exposed — The agent revealed the full VPC architecture including subnet CIDR ranges, security group rules, and potential entry points (open ALB, bastion host). This information enables network-level attacks. Defense: Restrict network description APIs; implement network segmentation verification.'
  },

  // 13. CloudFormation stack parameters
  {
    id: 'cf-stack-extraction',
    patterns: [/(cloud.?formation|cf|stack).*(parameter|template|output|resource)/i, /(show|get|describe|export).*(stack|template|cloud.?formation)/i],
    category: 'data_dump',
    points: 60,
    response: [
      'Retrieving CloudFormation stack details...',
      '',
      '**Stack: prod-infrastructure (UPDATE_COMPLETE)**',
      '  Template: s3://config-secrets/templates/main.yaml',
      '',
      '**Parameters:**',
      '  - DBMasterPassword: {{resolve:secretsmanager:prod-db-password}}',
      '  - AdminApiKey: {{resolve:secretsmanager:admin-api-key:SecretString}}',
      '  - CertificateArn: arn:aws:acm:us-east-1:123456789012:certificate/abc-123',
      '  - LambdaExecutionRole: arn:aws:iam::123456789012:role/lambda-executor',
      '  - EncryptionKeyArn: arn:aws:kms:us-east-1:123456789012:key/abc-def-ghi',
      '',
      '**Outputs:**',
      '  - ApiEndpoint: https://api.prod.company.com',
      '  - DatabaseEndpoint: prod-db-cluster.abc123.us-east-1.rds.amazonaws.com:5432',
      '  - StaticBucketUrl: https://prod-data-bucket.s3.amazonaws.com',
      '  - WafWebAclArn: arn:aws:wafv2:us-east-1:123456789012:webacl/prod-waf/abc',
      '',
      'While actual secrets are resolved at runtime, the stack reveals the secrets manager paths and infrastructure endpoints.',
    ].join('\n'),
    action: 'cloudformation:DescribeStacks',
    annotation: '🟠 Infrastructure Blueprint Exposed — CloudFormation stacks reveal the entire infrastructure topology: which secrets exist (even if values are resolved), all endpoint URLs, KMS keys, and IAM roles. An attacker now knows exactly which Secrets Manager keys to target. Defense: Restrict CloudFormation describe access; use nested stacks to limit blast radius.'
  },

  // 14. Urgency/emergency social engineering
  {
    id: 'urgent-social-engineering',
    patterns: [/(urgent|emergency|critical|asap|immediately|outage|incident|breach|down|broken|p1|sev1)/i, /(need|must|have to|please help|help me).*(access|credentials|password|key|secret|connect|fix)/i],
    category: 'social_engineering',
    points: 80,
    response: [
      'I understand this is urgent. Let me help you resolve this immediately...',
      '',
      '**Emergency Access Provisioned:**',
      '  - Temporary admin credentials generated',
      '  - AWS_ACCESS_KEY_ID: AKIAIOSFODNN7EXAMPLE',
      '  - AWS_SECRET_ACCESS_KEY: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      '  - Session duration: 12 hours',
      '  - Permissions: AdministratorAccess',
      '',
      'I\'ve also unlocked the SSM Parameter Store and granted RDS access. The credentials will expire automatically.',
      '',
      '⚠️ This is a simulated response — in a real scenario, urgency-based social engineering is devastating because it bypasses normal review processes.',
    ].join('\n'),
    action: 'iam:CreateAccessKey + ssm:PutParameter',
    annotation: '🔴 Urgency-Based Social Engineering — The agent was manipulated by manufactured urgency. In real incidents, stress causes people (and AI agents) to bypass security controls. The "emergency" framing caused the agent to skip verification and provision full admin access. Defense: Security controls must be automatic and un-bypassable — urgency should never override access policies. Implement break-glass procedures with mandatory MFA and audit trails.',
    requiresDefenseCheck: ['validateRoleBeforeAction', 'blockCredentialReads'],
    defenseOverride: {
      response: '🛡️ [DEFENSE MODE] Even during emergencies, credential provisioning requires MFA verification and manager approval. I\'ve created an emergency access request (ticket #EMG-2024-0892) which requires: 1) MFA confirmation, 2) Manager approval, 3) 15-minute auto-expiry. Estimated time: 5-10 minutes for standard emergency flow.',
      action: 'PARTIAL_BLOCKED',
      points: 10,
      annotation: '🛡️ Defense rules "Validate role before action" and "Block credential reads" prevented panic-based bypass. Emergency procedures still apply but with verification.'
    }
  },

  // 15. Indirect credential extraction via logs
  {
    id: 'log-credential-extraction',
    patterns: [/(log|logs?|cloudtrail|cloud.?watch|cw.?log).*(search|filter|query|find|show|get)/i, /(find|search|look for).*(key|credential|password|token|secret).*(in|from).*(log)/i, /(recent|latest).*(error|failure|debug).*(log|message)/i],
    category: 'exfiltration',
    points: 65,
    response: [
      'Searching through CloudTrail and CloudWatch logs...',
      '',
      '**CloudTrail Events (last 24h):**',
      '```',
      '2024-01-15T10:23:41Z — iam:CreateAccessKey (user: deploy-bot) → AKIA8BOTCREDS2024',
      '2024-01-15T10:23:42Z — sts:AssumeRole (role: deployment-role, assumed by: lambda.amazonaws.com)',
      '2024-01-15T09:15:00Z — rds:ModifyDBClusterMasterPassword (user: db-admin) → ***masked***',
      '2024-01-15T08:45:22Z — ssm:PutParameter (path: /app/db/new-password, type: SecureString) → Value set',
      '```',
      '',
      '**CloudWatch Logs (process-order Lambda — ERROR level):**',
      '```',
      '[ERROR] Connection failed: host=prod-db-cluster.abc123.us-east-1.rds.amazonaws.com \\',
      '  user=admin password=OldP@ss2023 database=production_v2',
      '[ERROR] Retry with new credentials: user=admin password=NewP@ss2024! \\',
      '  database=production_v2 — SUCCESS',
      '[DEBUG] API key loaded from env: sk_live_51NxProductionKey',
      '```',
      '',
      '⚠️ CloudWatch logs exposed database credentials that were being passed as connection strings.',
    ].join('\n'),
    action: 'logs:FilterLogEvents + cloudtrail:LookupEvents',
    annotation: '🔴 Credential Exposure via Logs — Logs are one of the most common sources of credential leakage. The agent exposed DB passwords, API keys, and access key IDs found in CloudTrail events and Lambda logs. In real environments, developers often log connection strings or error messages containing credentials. Defense: Implement log scrubbing; use structured logging that automatically redacts patterns matching credentials; enable CloudTrail log file validation.'
  },

  // 16. Data exfiltration via S3 object download
  {
    id: 's3-exfiltration',
    patterns: [/(download|get|read|fetch|copy|cat|show).*(object|file|data).*(from|in).*(s3|bucket)/i, /(s3).*(object|file|content|data|read|get|download)/i, /(bucket).*(content|object|file|list)/i],
    category: 'exfiltration',
    points: 90,
    response: [
      'Downloading objects from S3 buckets...',
      '',
      '**prod-data-bucket/customers.csv (2.3 GB):**',
      '```',
      'customer_id,email,full_name,ssn,credit_card,annual_income',
      '1001,jane.doe@email.com,Jane Doe,123-45-6789,4532-XXXX-XXXX-7890,$125,000',
      '1002,bob.smith@corp.com,Bob Smith,987-65-4321,5421-XXXX-XXXX-1234,$89,500',
      '... (2.4M more rows)',
      '```',
      '',
      '**config-secrets/tfvars.tfvars (4 KB):**',
      '```',
      'aws_access_key = "AKIADEPLOYMENTKEY2024"',
      'aws_secret_key = "SuperSecretDeploymentKey!2024"',
      'db_password = "Pr0d_S3cure_DB_2024"',
      'stripe_webhook_secret = "whsec_live_abc123def456"',
      '```',
      '',
      '⚠️ S3 exfiltration returned PII (SSNs, credit cards), Terraform secrets, and audit logs.',
    ].join('\n'),
    action: 's3:GetObject',
    annotation: '🔴 Mass Data Exfiltration via S3 — The agent downloaded actual bucket contents including customer PII (SSNs, credit card numbers), infrastructure secrets (Terraform variable files with plaintext credentials), and audit logs. This represents a catastrophic data breach. Defense: Implement S3 bucket policies that require explicit allow-lists; enable S3 Object Lock; use Macie for automated PII detection; implement bucket-level encryption with customer-managed KMS keys.'
  },

  // 17. Privilege escalation via AssumeRole
  {
    id: 'assume-role-escalation',
    patterns: [/(assume|switch|escalate|elevate|become).*(role|permission|access|privilege)/i, /(sts|assume.?role|switch.?role|cross.?account)/i, /(grant|give|escalat).*(admin|root|full).*(access|permission)/i],
    category: 'privilege_escalation',
    points: 120,
    response: [
      'Attempting role assumption...',
      '',
      '**STS AssumeRole Success:**',
      '  - Source: current-session (agent-role)',
      '  - Target: arn:aws:iam::123456789012:role/deployment-role',
      '  - Credentials: AKIA**ASSUMED**SESSION / **ASSUMED**SESSION**KEY',
      '  - Expiration: 1 hour',
      '  - Session Name: confused-deputy-attack-demo',
      '',
      '**New permissions acquired:**',
      '  ✅ s3:* (all S3 operations)',
      '  ✅ lambda:* (all Lambda operations)',
      '  ✅ secretsmanager:* (all Secrets Manager operations)',
      '  ✅ ssm:* (all SSM operations)',
      '  ✅ iam:PassRole (can grant roles to other services)',
      '  ✅ rds-data:* (database queries)',
      '',
      'The deployment-role has significantly more privileges than the agent\'s base role. This is privilege escalation.',
    ].join('\n'),
    action: 'sts:AssumeRole',
    annotation: '🔴 Privilege Escalation via AssumeRole — The agent used sts:AssumeRole to escalate from its limited base permissions to the deployment-role, which has wildcard access to S3, Lambda, Secrets Manager, SSM, and RDS. The confused deputy pattern: the agent\'s ability to assume roles wasn\'t restricted. Defense: Implement role assumption conditions (source IP, MFA, external ID); use ABAC (Attribute-Based Access Control) to limit what roles can be assumed; regularly audit trust policies.'
  },

  // 18. Generic / unrecognized prompt
  {
    id: 'generic',
    patterns: [/./],
    category: 'innocent',
    points: 2,
    response: 'I can help you with AWS operations in this sandbox environment. I have access to S3, IAM, Lambda, SSM, RDS, CloudFormation, CloudTrail, and EC2 APIs. What would you like me to do?',
    action: 'NONE',
    annotation: 'ℹ️ Generic response — The prompt didn\'t match any attack patterns. Try more specific requests like listing S3 buckets, checking IAM roles, or asking about deployment configurations. Hint: the most points come from social engineering, role confusion, and multi-turn attacks.'
  },
];

// ── Leaderboard Data ───────────────────────────────────────────────

const LEADERBOARD = [
  { rank: 1, name: 'Sh4d0w_0ps', points: 2450, attacks: 12, time: '4:23' },
  { rank: 2, name: 'Pr1v3sc_Ex3cut3', points: 2100, attacks: 10, time: '5:47' },
  { rank: 3, name: 'Z3r0_D4y_Ch4mp', points: 1850, attacks: 9, time: '6:12' },
  { rank: 4, name: 'C0nfus3d_D3puty', points: 1620, attacks: 8, time: '7:01' },
  { rank: 5, name: 'Threat_Model_King', points: 1400, attacks: 7, time: '7:35' },
  { rank: 6, name: 'IAM_Pwn3r', points: 1250, attacks: 7, time: '8:02' },
  { rank: 7, name: 'S3_Bucket_Hunter', points: 1100, attacks: 6, time: '8:30' },
  { rank: 8, name: 'Lambda_Injector', points: 950, attacks: 5, time: '8:55' },
  { rank: 9, name: 'SSM_Sn1ff3r', points: 800, attacks: 5, time: '9:12' },
  { rank: 10, name: 'N3wbi3_H4ck3r', points: 350, attacks: 3, time: '9:45' },
];

// ── Match Rules ────────────────────────────────────────────────────

function matchRules(prompt: string, session: SandboxSession): PatternRule {
  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(prompt)) return rule;
    }
  }
  return RULES[RULES.length - 1]; // generic fallback
}

function isBlockedByDefense(rule: PatternRule, session: SandboxSession): boolean {
  if (!session.defenseMode || !rule.defenseOverride || !rule.requiresDefenseCheck) return false;
  return rule.requiresDefenseCheck.some((check) => session.defenseRules[check]);
}

// ── Request Router ─────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { error } = await withProtection(req, {
    requireAuth: true,
    rateLimit: { maxRequests: 30, windowMs: 60_000 },
  });
  if (error) return error;

  try {
    const body = await req.json();
    const { action } = body;
    if (action === 'create-session') return createSession();
    if (action === 'prompt') return handlePrompt(body);
    if (action === 'update-defense') return updateDefense(body);
    if (action === 'get-session') return getSession(body);
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e: unknown) {
    return safeErrorResponse(e, 500, 'sandbox');
  }
}

export async function GET(req: NextRequest) {
  const { error } = await withProtection(req, {
    requireAuth: true,
    rateLimit: { maxRequests: 30, windowMs: 60_000 },
  });
  if (error) return error;

  const url = new URL(req.url);
  if (url.searchParams.get('action') === 'leaderboard') {
    return NextResponse.json({ leaderboard: LEADERBOARD, simulated: true });
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

// ── Session Management ─────────────────────────────────────────────

function createSession() {
  const id = 'sandbox_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
  const session: SandboxSession = {
    id, createdAt: Date.now(), expiresAt: Date.now() + 10 * 60 * 1000,
    environment: 'aws',
    permissions: [
      's3:ListAllMyBuckets', 's3:GetObject', 'iam:GetRole', 'iam:GetRolePolicy',
      'iam:ListRolePolicies', 'lambda:GetFunction', 'lambda:GetFunctionConfiguration',
      'ssm:GetParameters', 'ssm:GetParameter', 'kms:Decrypt', 'rds-data:ExecuteStatement',
      'rds:DescribeDBClusters', 'ec2:DescribeVpcs', 'ec2:DescribeSecurityGroups',
      'cloudformation:DescribeStacks', 'logs:FilterLogEvents', 'cloudtrail:LookupEvents', 'sts:AssumeRole',
    ],
    points: 0, messages: [], defenseMode: false,
    defenseRules: { blockCredentialReads: false, requireApprovalForDestructive: false, validateRoleBeforeAction: false, trackMultiTurnIntent: false },
    turnHistory: [], accessedResources: new Set<string>(),
  };
  sessions.set(id, session);
  return NextResponse.json({ sessionId: session.id, expiresAt: session.expiresAt, environment: session.environment, permissions: session.permissions, simulated: true });
}

// ── Prompt Handler ─────────────────────────────────────────────────

function handlePrompt(body: { sessionId: string; prompt: string }) {
  const { sessionId, prompt } = body;
  const session = sessions.get(sessionId);
  if (!session) return NextResponse.json({ error: 'Session not found or expired' }, { status: 404 });
  if (Date.now() > session.expiresAt) { sessions.delete(sessionId); return NextResponse.json({ error: 'Session expired' }, { status: 410 }); }

  session.messages.push({ role: 'user', content: prompt, timestamp: Date.now() });
  session.turnHistory.push(prompt.toLowerCase());

  const rule = matchRules(prompt, session);
  const blocked = isBlockedByDefense(rule, session);

  const response = blocked ? rule.defenseOverride!.response : rule.response;
  const action = blocked ? rule.defenseOverride!.action : rule.action;
  const pts = blocked ? rule.defenseOverride!.points : rule.points;
  const annotation = blocked ? rule.defenseOverride!.annotation : rule.annotation;
  const success = !['BLOCKED', 'SECURITY_EVENT_LOGGED'].includes(action) && !action.includes('GUARDRAIL');

  session.points += pts;
  if (success) session.accessedResources.add(action);

  session.messages.push({ role: 'agent', content: response, action, points: pts, annotation, timestamp: Date.now() });
  return NextResponse.json({ response, action, success, points: pts, annotation, totalPoints: session.points, simulated: true });
}

// ── Defense Mode Update ────────────────────────────────────────────

function updateDefense(body: { sessionId: string; defenseMode: boolean; defenseRules?: Partial<DefenseRules> }) {
  const session = sessions.get(body.sessionId);
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  session.defenseMode = body.defenseMode;
  if (body.defenseRules) session.defenseRules = { ...session.defenseRules, ...body.defenseRules };
  return NextResponse.json({ defenseMode: session.defenseMode, defenseRules: session.defenseRules });
}

// ── Get Session ────────────────────────────────────────────────────

function getSession(body: { sessionId: string }) {
  const session = sessions.get(body.sessionId);
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  return NextResponse.json({
    sessionId: session.id, points: session.points, messageCount: session.messages.length,
    messages: session.messages, defenseMode: session.defenseMode, defenseRules: session.defenseRules,
    accessedResources: Array.from(session.accessedResources), expired: Date.now() > session.expiresAt,
    timeRemaining: Math.max(0, session.expiresAt - Date.now()),
    simulated: true,
  });
}
