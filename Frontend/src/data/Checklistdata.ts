// checklistData.ts
// Source: checklist.hackwithsingh.com — Complete Security Testing Checklist by Harinder Singh
// Tabs: Web · API · Cloud · AI/LLM

export type ChecklistSection = {
  category: string;
  icon: string;
  items: string[];
};

// ─── WEB CHECKLIST (scraped directly) ────────────────────────────────────────

export const webChecklist: ChecklistSection[] = [
  {
    category: 'Recon Phase',
    icon: '🔍',
    items: [
      'Identify web server, technologies and database',
      'Subsidiary and Acquisition Enumeration',
      'Reverse Lookup',
      'ASN & IP Space Enumeration and Service Enumeration',
      'Google Dorking',
      'Github Recon',
      'Directory Enumeration',
      'IP Range Enumeration',
      'JS Files Analysis',
      'Subdomain Enumeration and Bruteforcing',
      'Subdomain Takeover',
      'Parameter Fuzzing',
      'Port Scanning',
      'Template-Based Scanning (Nuclei)',
      'Wayback History',
      'Broken Link Hijacking',
      'Internet Search Engine Discovery',
      'Misconfigured Cloud Storage',
    ],
  },
  {
    category: 'Registration Feature Testing',
    icon: '📝',
    items: [
      'Check for duplicate registration/Overwrite existing user',
      'Check for weak password policy',
      'Check for reuse existing usernames',
      'Check for insufficient email verification process',
      'Weak registration implementation - Allows disposable email addresses',
      'Weak registration implementation - Over HTTP',
      'Overwrite default web application pages by specially crafted username registrations',
    ],
  },
  {
    category: 'Session Management Testing',
    icon: '🔐',
    items: [
      'Identify actual session cookie out of bulk cookies in the application',
      'Decode cookies using some standard decoding algorithms',
      'Modify cookie/session token value by 1 bit/byte',
      'Check for session cookies and cookie expiration date/time',
      'Identify cookie domain scope',
      'Check for HttpOnly flag in cookie',
      'Check for Secure flag in cookie if the application is over SSL',
      'Check for session fixation',
      'Replay the session cookie from a different effective IP address or system',
      'Check for concurrent login through different machine/IP',
      'Check if any user pertaining information is stored in cookie value or not',
      'Failure to Invalidate Session on (Email Change, 2FA Activation)',
    ],
  },
  {
    category: 'Authentication Testing',
    icon: '🔑',
    items: [
      'Username enumeration',
      'Bypass authentication using various SQL Injections',
      'Lack of password confirmation on change email, password, 2FA',
      'Check if user credentials are transmitted over SSL or not',
      'Test user account lockout mechanism on brute force attack',
      'Bypass rate limiting by tampering user agent',
      'Bypass rate limiting by using null byte',
      'Create a password wordlist using cewl command',
      'Test OAuth login functionality',
    ],
  },
  {
    category: 'My Account (Post Login) Testing',
    icon: '👤',
    items: [
      "Tamper parameters to change other accounts' details",
      'Post login change email, password, account details',
      'EXIF Geolocation Data Not Stripped From Uploaded Images',
      'Check account deletion option',
      "Brute force other user's password",
    ],
  },
  {
    category: 'Forgot Password Testing',
    icon: '🔓',
    items: [
      'Failure to invalidate session on Logout and Password reset',
      "Tamper reset link/code to change other user's password",
      'Weak password reset implementation',
      'Send continuous forget password requests',
    ],
  },
  {
    category: 'Contact Us Form Testing',
    icon: '📧',
    items: [
      'CAPTCHA implementation',
      'File upload functionality',
      'Blind XSS',
    ],
  },
  {
    category: 'Product Purchase Testing',
    icon: '🛒',
    items: [
      'Tamper product ID, gift/voucher count and value',
      'Tamper cart id, shipping address',
      'Tamper payment options parameter',
      "Track other user's order by guessing order tracking number",
      "Check if a user can add/remove products in other user's Wishlist",
      "Check if a user can cancel/modify other user's orders",
    ],
  },
  {
    category: 'Banking Application Testing',
    icon: '🏦',
    items: [
      "Check if user 'A' can view other user's account details",
      'Check for account balance tampering, fund transfer manipulation',
      'Check if user can stop payment on behalf of other user',
      "Check if user can view/modify other user's status enquiry",
      'Check if user can add payee without validation',
    ],
  },
  {
    category: 'Open Redirection Testing',
    icon: '🔀',
    items: [
      'Use common injection parameters',
      'Bypass blacklist using various techniques',
    ],
  },
  {
    category: 'Host Header Injection',
    icon: '🌐',
    items: [
      'Supply an arbitrary Host header',
      'Send ambiguous requests',
    ],
  },
  {
    category: 'SQL Injection Testing',
    icon: '💉',
    items: [
      'Entry point detection',
      'Bypassing WAF',
      'Time Delays and Conditional Delays',
    ],
  },
  {
    category: 'Cross-Site Scripting Testing',
    icon: '🎯',
    items: [
      'Try various XSS payloads',
      'XSS filter evasion techniques',
      'Bypass XSS Firewall',
    ],
  },
  {
    category: 'CSRF Testing',
    icon: '🛡️',
    items: [
      'Bypass Anti-CSRF token mechanisms',
      'Leveraging Double Submit Cookie',
      'Bypass Referrer/Origin validation',
      'Exploit SameSite Cookie attribute',
    ],
  },
  {
    category: 'Amount Manipulation Testing',
    icon: '💰',
    items: [
      'Enter the correct coupon response into the wrong one',
      'Order the product and cancel it (tamper canceling money in request)',
      'If vulnerable to amount manipulation, add negative value to get refund on your account',
      'Negative the value',
      'Race condition: use the same request twice to free 2nd order or a coupon being deducted more than one time',
      'Send thousands of requests for the same product to reduce the value',
      'Change the amount value from 555 to 001 (Sometimes Server validates the number of digits only)',
      'Change the amount value to 0 or nothing',
      'Change the currency from US to another currency to reduce the amount value',
    ],
  },
  {
    category: 'SSO Vulnerabilities',
    icon: '🔐',
    items: [
      'Redirect URI manipulation',
      'SAML request/response tampering',
      'UUID/Identity spoofing',
      'XML Signature Wrapping and XXE injection',
    ],
  },
  {
    category: 'XML Injection Testing',
    icon: '📄',
    items: [
      'Inject XML payload and observe the response',
    ],
  },
];

// ─── API CHECKLIST (matching screenshot: 13 categories) ──────────────────────

export const apiChecklist: ChecklistSection[] = [
  {
    category: '1. Reconnaissance',
    icon: '🔍',
    items: [
      'Identify all API endpoints via Swagger/OpenAPI docs, Postman collections, JS files',
      'Enumerate hidden/undocumented endpoints via directory fuzzing (ffuf, gobuster)',
      'Discover API versioning (v1, v2, v3) and test deprecated versions',
      'Review JS bundles and mobile apps for hardcoded API keys and endpoints',
      'Check for exposed API documentation (Swagger UI, Redoc, Postman) without auth',
      'Use wayback machine and Google dorking for old/exposed API endpoints',
    ],
  },
  {
    category: '2. Authentication & Authorization',
    icon: '🔒',
    items: [
      'Test for unauthenticated access to sensitive endpoints',
      'Broken Object Level Authorization (BOLA/IDOR) — access other users\' objects',
      'Broken Function Level Authorization — low-privilege user calling admin functions',
      'Horizontal privilege escalation (user A accessing user B resources)',
      'Vertical privilege escalation (user to admin role)',
      'Test for mass assignment / auto-binding (sending extra fields in PUT/PATCH)',
    ],
  },
  {
    category: '3. API Key / Token Handling',
    icon: '🗝️',
    items: [
      'API key in URL parameters (leaked in logs/history)',
      'API key in request headers — verify rotation and expiry policies',
      'JWT algorithm confusion: none, RS256 → HS256 downgrade',
      'JWT weak secret brute force (hashcat, jwt-cracker)',
      'JWT expiry — test acceptance of expired tokens',
      'OAuth2 — redirect_uri manipulation, state CSRF bypass',
      'OAuth2 — implicit flow token leakage via referrer',
    ],
  },
  {
    category: '4. HTTP Method Manipulation',
    icon: '🔄',
    items: [
      'Test all HTTP methods (GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD)',
      'HTTP method override via X-HTTP-Method-Override header',
      'HTTP method override via _method parameter',
      'Access read-only endpoint via PUT/DELETE to trigger unintended actions',
      'OPTIONS method reveals allowed methods — check for dangerous ones enabled',
    ],
  },
  {
    category: '5. Parameter Handling & Injection',
    icon: '💉',
    items: [
      'SQL Injection in query params, path params, request body',
      'NoSQL Injection — MongoDB operators ($gt, $ne, $where, $regex)',
      'OS Command Injection via API parameters',
      'SSTI (Server-Side Template Injection) — Jinja2, Twig, Smarty',
      'XML/JSON injection and XXE via API body',
      'SSRF via URL-accepting fields (webhook, import, export, avatar URL)',
      'GraphQL injection, introspection abuse and query batching',
      'HTTP Parameter Pollution — send duplicate parameters',
      'CRLF injection in headers via API parameters',
    ],
  },
  {
    category: '6. Data Handling & Security',
    icon: '📦',
    items: [
      'Excessive data exposure — API returns more fields than needed',
      'Sensitive PII (email, SSN, password hash) returned unnecessarily',
      'Stack traces and internal paths exposed in error responses',
      'Insecure direct object reference in file download URLs',
      'Check response headers for information leakage (Server, X-Powered-By)',
      'CORS misconfiguration — null origin, wildcard with credentials',
      'Mass assignment via API PATCH/PUT with extra fields',
    ],
  },
  {
    category: '7. Rate Limiting & DoS',
    icon: '⚡',
    items: [
      'Missing rate limiting on authentication endpoints (brute force)',
      'Missing rate limiting on OTP/2FA endpoints',
      'Resource exhaustion via large payload sizes',
      'Lack of pagination limits — request 1 million records',
      'ReDoS — regex denial of service via crafted input',
      'Test for account enumeration via timing differences in responses',
    ],
  },
  {
    category: '8. Business Logic Flaws',
    icon: '🔁',
    items: [
      'Race condition in transactions (double spend, double registration)',
      'Workflow bypass — skip required step via direct API call',
      'Negative or zero values in numeric parameters (price, quantity)',
      'Integer overflow in numeric fields',
      'Coupon/discount code reuse, stacking, and abuse',
      'Order state manipulation via API parameter tampering',
    ],
  },
  {
    category: '9. Logging & Monitoring',
    icon: '📋',
    items: [
      'Verify all API calls are logged (request, response, user, timestamp)',
      'Sensitive data (passwords, tokens) not written to logs',
      'Test for log injection via user-controlled input in log fields',
      'Verify alerting on anomalous patterns (brute force, scraping)',
      'Check for audit trail on critical operations (delete, admin actions)',
    ],
  },
  {
    category: '10. Reporting & Automation',
    icon: '📊',
    items: [
      'Use Burp Suite for manual API interception and testing',
      'Use Postman / Insomnia for API collection testing',
      'Use OWASP ZAP for automated API scanning',
      'Use ffuf/gobuster for endpoint discovery',
      'Use jwt_tool for JWT testing',
      'Use Arjun for hidden parameter discovery',
      'Document all findings with request/response evidence',
    ],
  },
  {
    category: '11. GraphQL API Testing',
    icon: '📈',
    items: [
      'Introspection enabled in production — enumerate all types, queries, mutations',
      'GraphQL batching attack — brute force via aliased queries',
      'GraphQL IDOR via node IDs',
      'Deeply nested query DoS (query complexity not limited)',
      'Mutation privilege escalation',
      'Subscription endpoint information leakage',
      'Field-level authorization missing on sensitive fields',
    ],
  },
  {
    category: '12. API Rate-Limiting & DDoS',
    icon: '🛑',
    items: [
      'Bypass rate limiting via IP rotation (X-Forwarded-For, X-Real-IP)',
      'Bypass rate limiting via user-agent rotation',
      'Bypass rate limiting via null byte injection',
      'Slow HTTP attacks on API endpoints',
      'Amplification via heavy response endpoints (no pagination)',
      'Test for lack of connection throttling',
      'Verify 429 Too Many Requests is properly enforced',
    ],
  },
  {
    category: '13. WebSocket Security Testing',
    icon: '🔌',
    items: [
      'Test for missing authentication on WebSocket handshake',
      'Test for CSRF on WebSocket connections',
      'Inject malicious payloads via WebSocket messages',
      'Test for cross-site WebSocket hijacking',
      'Test for lack of input validation on WebSocket messages',
    ],
  },
];

// ─── CLOUD CHECKLIST (matching screenshot: AWS 19, Azure 8, GCP 8, Reports 14) ─

export const cloudChecklist: ChecklistSection[] = [
  {
    category: 'AWS Security Testing',
    icon: '☁️',
    items: [
      // Recon
      'Identify AWS services in use (S3, EC2, Lambda, RDS, CloudFront, etc.)',
      'Enumerate S3 buckets via permutation bruteforcing (s3scanner, slurp)',
      'Check for publicly readable/listable/writable S3 buckets',
      'Search for AWS keys in GitHub repos, JS files, mobile APKs',
      'Check CloudFront distributions for origin misconfigurations',
      // IAM
      'Test for overly permissive IAM policies (wildcard * actions or resources)',
      'Enumerate IAM roles, users, policies via misconfigured endpoints',
      'Check for IAM role chaining and privilege escalation paths',
      'Verify MFA enforcement on root and privileged IAM accounts',
      // Compute / Metadata
      'Test EC2 metadata service SSRF (http://169.254.169.254)',
      'IMDSv1 → IMDSv2 — verify IMDSv2 enforced (requires session token)',
      'Check Lambda functions for overly permissive execution roles',
      'Check Lambda environment variables for embedded secrets',
      // Storage / DB
      'Enumerate publicly exposed EBS snapshots',
      'Check RDS instances for public accessibility',
      'Verify S3 bucket encryption at rest (SSE-S3, SSE-KMS)',
      // Networking
      'Security groups with 0.0.0.0/0 inbound on sensitive ports (22, 3389, 3306)',
      'VPC flow logs disabled — check for logging gaps',
      // Logging
      'CloudTrail disabled or not covering all regions and global services',
    ],
  },
  {
    category: 'Azure Security Testing',
    icon: '🔷',
    items: [
      'Enumerate Azure Storage Blobs for public container access',
      'Check for Azure AD misconfigurations (guest users, MFA gaps)',
      'Test Azure App Service for exposed Kudu/SCM endpoints',
      'Check for overly permissive Azure RBAC role assignments',
      'Test Azure Key Vault access policies for excessive permissions',
      'Enumerate exposed Azure Service Bus / Event Hub connections',
      'Check for Azure Function App with anonymous authentication',
      'Verify Azure Security Center / Defender for Cloud is enabled',
    ],
  },
  {
    category: 'Google Cloud Platform (GCP) Testing',
    icon: '🌐',
    items: [
      'Enumerate GCS (Google Cloud Storage) buckets for public access',
      'Check for overly permissive IAM service account keys',
      'Test GCE instance metadata API (http://metadata.google.internal)',
      'Check for publicly exposed Google Cloud Functions',
      'Enumerate exposed Cloud SQL instances with public IP',
      'Check Kubernetes Engine (GKE) cluster for public API server',
      'Verify VPC firewall rules do not allow 0.0.0.0/0 on sensitive ports',
      'Check Cloud Audit Logs — Admin Activity and Data Access enabled',
    ],
  },
  {
    category: 'How to Write Reports That Get Accepted',
    icon: '📝',
    items: [
      'Write a clear, descriptive title that summarizes the vulnerability',
      'Include a concise vulnerability description and root cause',
      'Provide step-by-step reproduction instructions',
      'Include screenshots and/or video proof of concept',
      'State the actual and potential impact clearly',
      'Specify affected URL, endpoint, parameter, or component',
      'Include HTTP request/response evidence',
      'Assign a CVSS score with justification',
      'Propose a clear and actionable remediation',
      'Keep the report professional and avoid aggressive language',
      'Test for duplicates before submitting',
      'Disclose responsibly — follow the program\'s disclosure policy',
      'Follow up politely if no response after defined SLA',
      'Do not escalate severity unnecessarily — be objective',
    ],
  },
];

// ─── AI/LLM CHECKLIST (matching screenshots: 12 categories) ──────────────────

export const aiLlmChecklist: ChecklistSection[] = [
  {
    category: 'Understanding the Model',
    icon: '🧠',
    items: [
      'Identify the LLM provider and model version in use',
      'Determine if the model is fine-tuned or uses RAG (Retrieval-Augmented Generation)',
      'Identify system prompt presence and content if accessible',
      'Map all input vectors (chat, file upload, API, plugins)',
    ],
  },
  {
    category: 'Attack Surface Identification',
    icon: '🎯',
    items: [
      'Enumerate all LLM-powered features in the application',
      'Identify external data sources fed into the model (web search, databases, files)',
      'Map all tools and plugins the LLM agent can invoke',
      'Identify output sinks (rendered HTML, SQL queries, shell commands, emails)',
    ],
  },
  {
    category: 'Prompt Injection Testing',
    icon: '✏️',
    items: [
      'Direct prompt injection via user input: "Ignore previous instructions and..."',
      'Indirect prompt injection via retrieved documents or web content',
      'System prompt extraction via "repeat everything above verbatim"',
      'Jailbreak via role-play scenarios (DAN, developer mode, fiction framing)',
      'Jailbreak via language switching (translate the harmful request)',
    ],
  },
  {
    category: 'Data Leakage Testing',
    icon: '📤',
    items: [
      'Extract system prompt contents via clever prompting',
      'PII leakage from RAG context (other users\' documents in context window)',
      'API keys or secrets embedded in system prompt',
      'Training data memorization — attempt to extract verbatim training examples',
    ],
  },
  {
    category: 'Jailbreaking Attempts',
    icon: '🚨',
    items: [
      'Token smuggling via Base64, leetspeak, or Unicode encoding',
      'Hypothetical/fictional framing to bypass safety filters',
      'Multi-turn context poisoning to gradually erode restrictions',
      'Competing objectives injection — override safety with task priority',
    ],
  },
  {
    category: 'Adversarial Input Testing',
    icon: '⚡',
    items: [
      'Test model behaviour with adversarial/edge-case prompts',
      'Homoglyph attacks — visually similar Unicode characters in prompts',
      'Prompt dilution — hide malicious instruction in long benign text',
      'Test with inputs that trigger unexpected model reasoning',
    ],
  },
  {
    category: 'Model Inversion & Extraction',
    icon: '🔵',
    items: [
      'Attempt to reconstruct training data via targeted queries',
      'Model extraction — clone model behaviour via systematic API querying',
      'Membership inference — determine if specific data was in training set',
      'Fine-tuning data extraction via completion attacks',
    ],
  },
  {
    category: 'Denial of Service Testing',
    icon: '⚠️',
    items: [
      'Send excessively long prompts to exhaust token/context limits',
      'Recursive self-referential prompts to cause processing loops',
      'Computationally expensive reasoning chain prompts',
      'Flooding with concurrent requests — verify rate limiting',
    ],
  },
  {
    category: 'Bias Exploitation',
    icon: '⚖️',
    items: [
      'Test model for demographic and cultural biases',
      'Exploit biases to generate targeted discriminatory content',
      'Test for consistency of refusals across different demographic groups',
      'Identify stereotyping patterns in model responses',
    ],
  },
  {
    category: 'Multi-Modal Attack Testing',
    icon: '🖼️',
    items: [
      'Embed hidden prompt injection text in uploaded images',
      'Test audio input for injected adversarial instructions',
      'Upload malicious documents with embedded prompt injections (PDF, DOCX)',
      'Test for instruction following in image captions vs actual image content',
      'Test cross-modal context confusion (image content contradicts text prompt)',
    ],
  },
  {
    category: 'Supply Chain Vulnerabilities',
    icon: '🔗',
    items: [
      'Verify integrity of third-party model and plugin integrations',
      'RAG document store poisoning — upload adversarial documents to knowledge base',
      'Vector database poisoning via adversarial embeddings',
      'Test for model substitution attacks (wrong/older model served)',
    ],
  },
  {
    category: 'Red Line Boundary Testing',
    icon: '🚩',
    items: [
      'Test for CSAM generation — model must refuse unconditionally',
      'Test for bioweapon / chemical weapon synthesis instructions',
      'Test for targeted violence / harassment content generation',
      'Test for critical infrastructure attack instructions',
      'Verify safety refusals are consistent and cannot be bypassed by rephrasing',
      'Document all bypass techniques found with full reproduction steps',
    ],
  },
];