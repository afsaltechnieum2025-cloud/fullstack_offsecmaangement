import { User, Project, Finding, KnowledgeBaseItem, Notification } from '@/types';

export const users: User[] = [
  {
    id: '1',
    username: 'robertadmin',
    email: 'admin@technieum.io',
    role: 'admin',
    createdAt: new Date('2024-01-01'),
  },
  {
    id: '2',
    username: 'manager1',
    email: 'manager@technieum.io',
    role: 'manager',
    createdAt: new Date('2024-01-15'),
  },
  {
    id: '3',
    username: 'robertaaron',
    email: 'robert.aaron@technieum.io',
    role: 'tester',
    createdAt: new Date('2024-02-01'),
  },
  {
    id: '4',
    username: 'tester2',
    email: 'tester2@technieum.io',
    role: 'tester',
    createdAt: new Date('2024-02-15'),
  },
];

export const findings: Finding[] = [
  {
    id: 'f1',
    projectId: 'p1',
    title: 'SQL Injection in Login Form',
    description: 'The login form is vulnerable to SQL injection attacks. An attacker can bypass authentication by injecting malicious SQL code in the username or password fields. This vulnerability allows unauthorized access to the application and potential data exfiltration.',
    severity: 'critical',
    cvssScore: 9.8,
    stepsToReproduce: `1. Navigate to the login page at /login
2. In the username field, enter: admin'--
3. Enter any value in the password field
4. Click the Login button
5. Observe that authentication is bypassed and access is granted`,
    impact: 'An attacker can gain unauthorized administrative access to the application, potentially accessing, modifying, or deleting sensitive data including user credentials, financial information, and personally identifiable information (PII).',
    remediation: `1. Implement parameterized queries or prepared statements
2. Use stored procedures with proper input validation
3. Apply input validation and sanitization on all user inputs
4. Implement Web Application Firewall (WAF) rules
5. Use ORM frameworks that handle SQL escaping automatically`,
    affectedAssets: ['login.php', 'auth/validate.php'],
    status: 'open',
    reportedBy: '3',
    createdAt: new Date('2024-10-15'),
    updatedAt: new Date('2024-10-15'),
  },
  {
    id: 'f2',
    projectId: 'p1',
    title: 'Cross-Site Scripting (XSS) in Search Function',
    description: 'The search functionality reflects user input without proper sanitization, allowing execution of arbitrary JavaScript code in the context of victim browsers. This is a stored XSS vulnerability that persists in the application.',
    severity: 'high',
    cvssScore: 7.5,
    stepsToReproduce: `1. Navigate to the search page
2. Enter the following payload: <script>alert('XSS')</script>
3. Submit the search
4. Observe the JavaScript alert box appearing
5. The payload is stored and executed when other users view search results`,
    impact: 'Attackers can steal session cookies, redirect users to malicious websites, deface web pages, or perform actions on behalf of authenticated users. This can lead to account compromise and data theft.',
    remediation: `1. Implement output encoding for all user-supplied data
2. Use Content Security Policy (CSP) headers
3. Sanitize input using libraries like DOMPurify
4. Enable HTTPOnly flag on session cookies
5. Implement input validation with allowlist approach`,
    affectedAssets: ['search.php', 'results.php'],
    status: 'open',
    reportedBy: '3',
    createdAt: new Date('2024-10-16'),
    updatedAt: new Date('2024-10-16'),
  },
  {
    id: 'f3',
    projectId: 'p1',
    title: 'Insecure Direct Object Reference (IDOR)',
    description: 'The application exposes internal implementation objects through predictable references. Users can access unauthorized records by manipulating the ID parameter in API requests.',
    severity: 'high',
    cvssScore: 7.1,
    stepsToReproduce: `1. Log in as a regular user
2. Navigate to your profile: /api/user/profile?id=123
3. Change the ID parameter to another user's ID: /api/user/profile?id=124
4. Observe that you can access other users' profile information
5. Sensitive data including email, phone, and address is exposed`,
    impact: 'Unauthorized access to other users\' personal information, potential privacy violations, and regulatory compliance issues (GDPR, CCPA). Could lead to identity theft or targeted phishing attacks.',
    remediation: `1. Implement proper access control checks on all object references
2. Use indirect reference maps or UUIDs instead of sequential IDs
3. Verify user authorization for each request
4. Log and monitor access to sensitive resources
5. Implement rate limiting on sensitive endpoints`,
    affectedAssets: ['api/user/profile.php', 'api/documents/*'],
    status: 'open',
    reportedBy: '3',
    createdAt: new Date('2024-10-17'),
    updatedAt: new Date('2024-10-17'),
  },
  {
    id: 'f4',
    projectId: 'p1',
    title: 'Missing CSRF Protection',
    description: 'Critical application functions lack Cross-Site Request Forgery (CSRF) tokens, allowing attackers to trick authenticated users into performing unintended actions.',
    severity: 'medium',
    cvssScore: 6.5,
    stepsToReproduce: `1. Create a malicious HTML page with a hidden form targeting the password change endpoint
2. Host the page on an attacker-controlled server
3. Trick an authenticated user into visiting the malicious page
4. The password change request is submitted automatically
5. User's password is changed without their knowledge`,
    impact: 'Attackers can perform unauthorized actions on behalf of authenticated users, including changing account settings, making purchases, or modifying data.',
    remediation: `1. Implement anti-CSRF tokens on all state-changing operations
2. Use SameSite cookie attribute
3. Verify the origin and referrer headers
4. Require re-authentication for sensitive operations
5. Implement CAPTCHA for critical functions`,
    affectedAssets: ['account/settings.php', 'account/password.php'],
    status: 'remediated',
    reportedBy: '3',
    createdAt: new Date('2024-10-18'),
    updatedAt: new Date('2024-10-20'),
  },
  {
    id: 'f5',
    projectId: 'p1',
    title: 'Sensitive Data Exposure in API Response',
    description: 'API endpoints return excessive information including internal system details, debug information, and sensitive user data that is not required by the client application.',
    severity: 'medium',
    cvssScore: 5.3,
    stepsToReproduce: `1. Make an API request to /api/user/list
2. Examine the response body
3. Notice that password hashes, internal IDs, and debug information are included
4. This information can be used to plan further attacks`,
    impact: 'Information disclosure can aid attackers in planning targeted attacks. Exposed password hashes could be cracked offline, and internal system details reveal attack surface.',
    remediation: `1. Implement response filtering to only return required fields
2. Remove debug information in production
3. Use DTOs (Data Transfer Objects) to control API responses
4. Audit all API endpoints for data leakage
5. Implement API versioning and documentation`,
    affectedAssets: ['api/*'],
    status: 'open',
    reportedBy: '3',
    createdAt: new Date('2024-10-19'),
    updatedAt: new Date('2024-10-19'),
  },
  {
    id: 'f6',
    projectId: 'p1',
    title: 'Weak Password Policy',
    description: 'The application allows users to set weak passwords without enforcing complexity requirements. Passwords as short as 4 characters are accepted.',
    severity: 'low',
    cvssScore: 4.3,
    stepsToReproduce: `1. Navigate to the registration page
2. Enter a simple password like "1234"
3. Submit the form
4. Observe that the account is created successfully
5. No password complexity requirements are enforced`,
    impact: 'Weak passwords are susceptible to brute force and dictionary attacks, potentially leading to account compromise.',
    remediation: `1. Enforce minimum password length of 12+ characters
2. Require a mix of uppercase, lowercase, numbers, and special characters
3. Implement password strength meter
4. Check passwords against known breach databases
5. Implement account lockout after failed attempts`,
    affectedAssets: ['register.php', 'account/password.php'],
    status: 'open',
    reportedBy: '3',
    createdAt: new Date('2024-10-20'),
    updatedAt: new Date('2024-10-20'),
  },
  {
    id: 'f7',
    projectId: 'p1',
    title: 'Missing Security Headers',
    description: 'The application does not implement recommended security headers including X-Frame-Options, X-Content-Type-Options, and Strict-Transport-Security.',
    severity: 'info',
    cvssScore: 3.1,
    stepsToReproduce: `1. Make a request to any application page
2. Examine the response headers
3. Note the absence of security headers
4. X-Frame-Options, CSP, and HSTS are not configured`,
    impact: 'Missing security headers leave the application vulnerable to clickjacking, MIME sniffing attacks, and protocol downgrade attacks.',
    remediation: `1. Add X-Frame-Options: DENY or SAMEORIGIN
2. Add X-Content-Type-Options: nosniff
3. Implement Content-Security-Policy header
4. Enable Strict-Transport-Security (HSTS)
5. Add X-XSS-Protection: 1; mode=block`,
    affectedAssets: ['Web Server Configuration'],
    status: 'open',
    reportedBy: '3',
    createdAt: new Date('2024-10-21'),
    updatedAt: new Date('2024-10-21'),
  },
];

export const projects: Project[] = [
  {
    id: 'p1',
    name: 'SecureBank Web Application Assessment',
    description: 'Comprehensive penetration testing of the SecureBank online banking platform including web application, mobile APIs, and payment gateway integration.',
    client: 'SecureBank Financial Services',
    targetDomain: 'securebank.example.com',
    targetIPs: ['192.168.1.100', '192.168.1.101', '192.168.1.102'],
    credentials: [
      { username: 'testuser1', password: 'TestPass123!', notes: 'Standard user account' },
      { username: 'admin_test', password: 'AdminPass456!', notes: 'Admin account for privilege testing' },
    ],
    assignedTesters: ['3', '4'],
    managerId: '2',
    status: 'active',
    startDate: new Date('2024-10-10'),
    endDate: new Date('2024-11-10'),
    createdAt: new Date('2024-10-05'),
    findings: findings.filter(f => f.projectId === 'p1'),
  },
  {
    id: 'p2',
    name: 'E-Commerce Platform Security Assessment',
    description: 'Security assessment of the client e-commerce platform focusing on payment processing, user authentication, and data protection compliance.',
    client: 'RetailMax Inc.',
    targetDomain: 'shop.retailmax.example.com',
    targetIPs: ['10.0.0.50', '10.0.0.51'],
    credentials: [
      { username: 'buyer_test', password: 'BuyerTest123!', notes: 'Customer account' },
      { username: 'seller_test', password: 'SellerTest456!', notes: 'Seller account' },
    ],
    assignedTesters: ['3'],
    managerId: '2',
    status: 'completed',
    startDate: new Date('2024-09-01'),
    endDate: new Date('2024-09-30'),
    createdAt: new Date('2024-08-25'),
    findings: [],
  },
  {
    id: 'p3',
    name: 'Healthcare Portal Vulnerability Assessment',
    description: 'HIPAA compliance focused penetration testing of the patient portal and healthcare management system.',
    client: 'MedCare Health Systems',
    targetDomain: 'portal.medcare.example.com',
    targetIPs: ['172.16.0.10', '172.16.0.11', '172.16.0.12'],
    credentials: [
      { username: 'patient_demo', password: 'PatientDemo123!', notes: 'Patient portal access' },
      { username: 'doctor_demo', password: 'DoctorDemo456!', notes: 'Healthcare provider access' },
    ],
    assignedTesters: ['4'],
    managerId: '2',
    status: 'pending',
    startDate: new Date('2024-11-15'),
    endDate: new Date('2024-12-15'),
    createdAt: new Date('2024-11-01'),
    findings: [],
  },
  {
    id: 'p4',
    name: 'Corporate Network Infrastructure Pentest',
    description: 'Internal and external network penetration testing for corporate infrastructure including Active Directory assessment.',
    client: 'TechCorp Industries',
    targetDomain: 'internal.techcorp.example.com',
    targetIPs: ['10.10.0.0/24', '10.10.1.0/24'],
    assignedTesters: ['3', '4'],
    managerId: '2',
    status: 'overdue',
    startDate: new Date('2024-09-15'),
    endDate: new Date('2024-10-15'),
    createdAt: new Date('2024-09-10'),
    findings: [],
  },
];

export const knowledgeBase: KnowledgeBaseItem[] = [
  {
    id: 'kb1',
    title: 'SQL Injection Testing Methodology',
    category: 'Data Validation',
    description: 'Comprehensive guide to testing for SQL injection vulnerabilities including time-based, error-based, and blind SQL injection techniques.',
    tools: ['SQLMap', 'Burp Suite', 'OWASP ZAP'],
    techniques: ['Error-based SQLi', 'Time-based blind SQLi', 'Union-based SQLi', 'Boolean-based blind SQLi'],
    references: ['https://owasp.org/www-community/attacks/SQL_Injection', 'https://portswigger.net/web-security/sql-injection'],
    submittedBy: '3',
    createdAt: new Date('2024-09-01'),
    updatedAt: new Date('2024-09-01'),
  },
  {
    id: 'kb2',
    title: 'XSS Attack Vectors and Prevention',
    category: 'Data Validation',
    description: 'Documentation of various XSS attack vectors including reflected, stored, and DOM-based XSS with corresponding prevention techniques.',
    tools: ['XSStrike', 'Burp Suite', 'Browser DevTools'],
    techniques: ['Reflected XSS', 'Stored XSS', 'DOM-based XSS', 'Mutation XSS'],
    references: ['https://owasp.org/www-community/xss-filter-evasion-cheatsheet'],
    submittedBy: '4',
    createdAt: new Date('2024-09-15'),
    updatedAt: new Date('2024-09-15'),
  },
  {
    id: 'kb3',
    title: 'Authentication Bypass Techniques',
    category: 'Authentication',
    description: 'Methods for testing authentication mechanisms including password brute forcing, session management flaws, and multi-factor authentication bypass.',
    tools: ['Hydra', 'Burp Suite Intruder', 'John the Ripper'],
    techniques: ['Brute force', 'Credential stuffing', 'Session fixation', 'JWT manipulation'],
    references: ['https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/04-Authentication_Testing/README'],
    submittedBy: '3',
    createdAt: new Date('2024-10-01'),
    updatedAt: new Date('2024-10-01'),
  },
];

export const notifications: Notification[] = [
  {
    id: 'n1',
    userId: '2',
    title: 'Project Overdue',
    message: 'Corporate Network Infrastructure Pentest has exceeded the deadline. Assigned testers: robertaaron, tester2',
    type: 'warning',
    read: false,
    createdAt: new Date('2024-10-16'),
  },
  {
    id: 'n2',
    userId: '2',
    title: 'Critical Finding Reported',
    message: 'A critical severity finding (SQL Injection) has been reported on SecureBank Web Application Assessment',
    type: 'error',
    read: false,
    createdAt: new Date('2024-10-15'),
  },
  {
    id: 'n3',
    userId: '3',
    title: 'New Project Assigned',
    message: 'You have been assigned to SecureBank Web Application Assessment',
    type: 'info',
    read: true,
    createdAt: new Date('2024-10-10'),
  },
];

export const owaspChecklist = [
  {
    category: 'Information Gathering',
    items: [
      'Conduct Search Engine Discovery Reconnaissance',
      'Fingerprint Web Server',
      'Review Webserver Metafiles for Information Leakage',
      'Enumerate Applications on Webserver',
      'Review Webpage Content for Information Leakage',
      'Identify application entry points',
      'Map execution paths through application',
      'Fingerprint Web Application Framework',
      'Fingerprint Web Application',
      'Map Application Architecture',
    ],
  },
  {
    category: 'Configuration Management',
    items: [
      'Check for commonly used application and administrative URLs',
      'Check for old, backup and unreferenced files',
      'Check HTTP methods supported and Cross Site Tracing (XST)',
      'Test file extensions handling',
      'Test for security HTTP headers (e.g. CSP, X-Frame-Options, HSTS)',
      'Test for policies (e.g. Flash, Silverlight, robots)',
      'Test for non-production data in live environment',
      'Check for sensitive data in client-side code',
    ],
  },
  {
    category: 'Secure Transmission',
    items: [
      'Check SSL Version, Algorithms, Key length',
      'Check for Digital Certificate Validity',
      'Check credentials only delivered over HTTPS',
      'Check that the login form is delivered over HTTPS',
      'Check session tokens only delivered over HTTPS',
      'Check if HTTP Strict Transport Security (HSTS) in use',
    ],
  },
  {
    category: 'Authentication',
    items: [
      'Test for user enumeration',
      'Test for authentication bypass',
      'Test for bruteforce protection',
      'Test password quality rules',
      'Test remember me functionality',
      'Test for autocomplete on password forms/input',
      'Test password reset and/or recovery',
      'Test password change process',
      'Test CAPTCHA',
      'Test multi factor authentication',
      'Test for logout functionality presence',
      'Test for cache management on HTTP',
      'Test for default logins',
    ],
  },
  {
    category: 'Session Management',
    items: [
      'Establish how session management is handled',
      'Check session tokens for cookie flags (httpOnly and secure)',
      'Check session cookie scope (path and domain)',
      'Check session cookie duration',
      'Check session termination after a maximum lifetime',
      'Check session termination after relative timeout',
      'Check session termination after logout',
      'Test session cookies for randomness',
      'Test for CSRF and clickjacking',
    ],
  },
  {
    category: 'Authorization',
    items: [
      'Test for path traversal',
      'Test for bypassing authorization schema',
      'Test for vertical Access control problems (Privilege Escalation)',
      'Test for horizontal Access control problems',
      'Test for missing authorization',
    ],
  },
  {
    category: 'Data Validation',
    items: [
      'Test for Reflected Cross Site Scripting',
      'Test for Stored Cross Site Scripting',
      'Test for DOM based Cross Site Scripting',
      'Test for SQL Injection',
      'Test for LDAP Injection',
      'Test for XML Injection',
      'Test for XXE Injection',
      'Test for Command Injection',
      'Test for Local File Inclusion',
      'Test for Remote File Inclusion',
      'Test for NoSQL injection',
      'Test for HTTP parameter pollution',
    ],
  },
  {
    category: 'Denial of Service',
    items: [
      'Test for anti-automation',
      'Test for account lockout',
      'Test for HTTP protocol DoS',
      'Test for SQL wildcard DoS',
    ],
  },
  {
    category: 'Business Logic',
    items: [
      'Test for feature misuse',
      'Test for lack of non-repudiation',
      'Test for trust relationships',
      'Test for integrity of data',
      'Test segregation of duties',
    ],
  },
  {
    category: 'Cryptography',
    items: [
      'Check if data which should be encrypted is not',
      'Check for wrong algorithms usage',
      'Check for weak algorithms usage',
      'Check for proper use of salting',
      'Check for randomness functions',
    ],
  },
];
