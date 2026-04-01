import { User, Project, Finding, KnowledgeBaseItem, Notification } from '@/types';

export const users: User[] = [
  {
    id: '1',
    username: 'admin',
    email: 'admin@technieum.io',
    role: 'admin',
    createdAt: new Date('2024-01-01'),
  },
  {
    id: '2',
    username: 'robert_manager',
    email: 'manager@technieum.io',
    role: 'manager',
    createdAt: new Date('2024-01-15'),
  },
  {
    id: '3',
    username: 'robert_tester',
    email: 'robert.tester@technieum.io',
    role: 'tester',
    createdAt: new Date('2024-02-01'),
  },
  {
    id: '4',
    username: 'rejenthompson',
    email: 'rejen.thompson@technieum.io',
    role: 'tester',
    createdAt: new Date('2024-02-15'),
  },
  {
    id: '5',
    username: 'afsal',
    email: 'afsal.mohamed@technieum.io',
    role: 'tester',
    createdAt: new Date('2024-02-15'),
  },
];

// Actual findings from fundsverifier.com pentest report
export const findings: Finding[] = [
  {
    id: 'FV-001',
    projectId: 'p1',
    title: 'Account Status Modification Without Authentication',
    description: 'The application exposes a critical vulnerability where the user account status update endpoint lacks any form of authentication or authorization controls. An unauthenticated attacker can send a PUT request to /api/user/update/{user_id} with arbitrary account status values, effectively enabling or disabling any user account on the platform without requiring valid credentials or session tokens.',
    severity: 'critical',
    cvssScore: 9.8,
    stepsToReproduce: `1. Identify the target user account ID (e.g., 692017b9bd484b9e57081e69)
2. Send a PUT request to /api/user/update/{user_id}
3. Include JSON body with userState: "inactive" or "active"
4. No authentication headers required
5. Observe the account status is changed successfully`,
    impact: 'Account Takeover Risk: Attackers can deactivate legitimate user accounts, causing denial of service to genuine users. Business Disruption: Mass account deactivation could render the platform unusable for all customers. Reputation Damage: Users losing access to their accounts erodes trust in the platform\'s security posture. Regulatory Non-Compliance: Failure to protect user accounts violates data protection regulations (GDPR, CCPA).',
    remediation: `1. Implement JWT or session-based authentication middleware on all user management endpoints
2. Enforce authorization checks to verify the requesting user has administrative privileges or owns the target account
3. Implement comprehensive audit logging to track all account status modifications with timestamps and source IP addresses
4. Add rate limiting to prevent bulk account manipulation attacks`,
    affectedAssets: ['PUT /api/user/update/{id}'],
    status: 'open',
    reportedBy: '3',
    createdAt: new Date('2025-11-21'),
    updatedAt: new Date('2025-11-21'),
  },
  {
    id: 'FV-002',
    projectId: 'p1',
    title: 'Notification Deletion Without Authentication',
    description: 'The notification deletion endpoint lacks authentication and authorization controls, allowing any unauthenticated user to permanently remove notifications belonging to other users. By enumerating or guessing notification IDs, an attacker can systematically delete critical alerts, payment confirmations, or security notifications from any user\'s account.',
    severity: 'critical',
    cvssScore: 9.1,
    stepsToReproduce: `1. Identify a notification ID (e.g., 68f603022dc488c4eedaf82d)
2. Send a DELETE request to /api/notifications/{id}
3. No authentication headers required
4. Observe the notification is permanently deleted`,
    impact: 'Data Integrity Loss: Permanent deletion of important user notifications including transaction confirmations and security alerts. Security Bypass: Attackers can delete security-related notifications (password change alerts, suspicious login warnings) to cover their tracks. User Experience Degradation: Users may miss critical updates about their accounts, transactions, or platform activities. Compliance Violations: Deletion of audit-relevant notifications may violate regulatory record-keeping requirements.',
    remediation: `1. Implement mandatory authentication tokens for all DELETE operations on user resources
2. Validate that the authenticated user owns the notification or has administrative privileges before allowing deletion
3. Implement soft-delete mechanisms with audit trails instead of permanent deletion
4. Add notification ID obfuscation using UUIDs to prevent enumeration attacks`,
    affectedAssets: ['DELETE /api/notifications/{id}'],
    status: 'open',
    reportedBy: '3',
    createdAt: new Date('2025-11-21'),
    updatedAt: new Date('2025-11-21'),
  },
  {
    id: 'FV-003',
    projectId: 'p1',
    title: 'Walkthrough Request Details Exposure',
    description: 'The 3D walkthrough request endpoint exposes sensitive property viewing request details without requiring authentication. An attacker can access confidential information including requester personal details, property information, scheduled viewing times, and contact information by simply accessing the endpoint with a valid or enumerated request ID.',
    severity: 'critical',
    cvssScore: 9.1,
    stepsToReproduce: `1. Navigate to /api/request3d/walkthrough-request/{id}
2. Use a valid or enumerated request ID (e.g., 686d266b3d0344cd9300930f)
3. No authentication required
4. Observe exposure of PII and property details`,
    impact: 'Privacy Breach: Exposure of personally identifiable information (PII) including names, contact details, and property interests. Competitive Intelligence Leak: Competitors could monitor property viewing patterns and customer interests. Physical Security Risk: Exposed scheduling information could be exploited for property-related crimes. GDPR/Data Protection Violations: Unauthorized access to personal data constitutes a reportable data breach.',
    remediation: `1. Implement mandatory authentication using secure session tokens or JWT for all data retrieval endpoints
2. Enforce ownership verification ensuring users can only access their own walkthrough requests
3. Replace sequential/predictable IDs with cryptographically random UUIDs to prevent enumeration
4. Implement request logging and anomaly detection for unauthorized access attempts`,
    affectedAssets: ['GET /api/request3d/walkthrough-request/{id}'],
    status: 'open',
    reportedBy: '3',
    createdAt: new Date('2025-11-21'),
    updatedAt: new Date('2025-11-21'),
  },
  {
    id: 'FV-004',
    projectId: 'p1',
    title: 'Unauthorized Time Slot Creation',
    description: 'The property viewing slot creation endpoint allows unauthenticated users to create arbitrary time slots for any property on the platform. This enables attackers to flood the booking system with fake availability slots, manipulate scheduling data, and disrupt legitimate property viewing coordination.',
    severity: 'critical',
    cvssScore: 9.1,
    stepsToReproduce: `1. Send POST request to /api/arrange-view/slots/add
2. Include arbitrary property ID and time slot data in JSON body
3. No authentication headers required
4. Observe successful slot creation for any property`,
    impact: 'Service Disruption: Fake booking slots can overwhelm the platform and confuse legitimate users. Data Integrity: Corrupted scheduling data affects business operations and user trust. Resource Exhaustion: Mass slot creation can consume database resources and cause performance issues.',
    remediation: `1. Implement authentication middleware requiring valid JWT tokens
2. Verify property ownership before allowing slot creation
3. Add rate limiting per user/IP to prevent mass slot creation
4. Implement CAPTCHA for slot creation to prevent automated abuse`,
    affectedAssets: ['POST /api/arrange-view/slots/add'],
    status: 'open',
    reportedBy: '3',
    createdAt: new Date('2025-11-21'),
    updatedAt: new Date('2025-11-21'),
  },
  {
    id: 'FV-005',
    projectId: 'p1',
    title: 'Asset Creation Without Authentication',
    description: 'The price/asset creation endpoint lacks authentication controls, allowing any unauthenticated user to create new asset listings on the platform with arbitrary pricing and property data.',
    severity: 'critical',
    cvssScore: 9.8,
    stepsToReproduce: `1. Send POST request to /api/price
2. Include asset/pricing data in JSON body
3. No authentication required
4. Observe successful asset creation`,
    impact: 'Fraudulent Listings: Attackers can create fake property listings with misleading pricing. Financial Fraud: Manipulated pricing data can deceive buyers and sellers. Platform Integrity: Unauthorized content undermines trust in the marketplace.',
    remediation: `1. Implement mandatory authentication for all POST operations
2. Verify user permissions before allowing asset creation
3. Add validation for pricing data ranges
4. Implement audit logging for all asset operations`,
    affectedAssets: ['POST /api/price'],
    status: 'open',
    reportedBy: '3',
    createdAt: new Date('2025-11-21'),
    updatedAt: new Date('2025-11-21'),
  },
  {
    id: 'FV-006',
    projectId: 'p1',
    title: 'Asset Deletion Without Authentication',
    description: 'The asset deletion endpoint allows unauthenticated users to permanently remove assets from the platform by simply knowing or guessing the asset ID.',
    severity: 'critical',
    cvssScore: 9.8,
    stepsToReproduce: `1. Identify target asset ID
2. Send DELETE request to /api/price/{id}
3. No authentication required
4. Asset is permanently deleted`,
    impact: 'Data Loss: Permanent deletion of legitimate asset listings. Business Disruption: Removal of active listings affects ongoing transactions. Sabotage: Competitors could delete competitor listings.',
    remediation: `1. Implement authentication middleware on all DELETE endpoints
2. Verify asset ownership before deletion
3. Implement soft-delete with recovery options
4. Add comprehensive audit logging`,
    affectedAssets: ['DELETE /api/price/{id}'],
    status: 'open',
    reportedBy: '3',
    createdAt: new Date('2025-11-21'),
    updatedAt: new Date('2025-11-21'),
  },
  {
    id: 'FV-007',
    projectId: 'p1',
    title: 'Asset Price Update Without Authentication',
    description: 'The asset price update endpoint allows any unauthenticated user to modify pricing information for any asset on the platform.',
    severity: 'critical',
    cvssScore: 9.8,
    stepsToReproduce: `1. Identify target asset ID
2. Send PUT request to /api/price/{id} with new pricing data
3. No authentication required
4. Pricing is modified`,
    impact: 'Financial Manipulation: Attackers can inflate or deflate prices. Fraud Enablement: Price manipulation can facilitate scams. Trust Erosion: Unreliable pricing damages platform credibility.',
    remediation: `1. Implement authentication for all PUT operations
2. Verify asset ownership
3. Add price change audit trails
4. Implement price change notifications to owners`,
    affectedAssets: ['PUT /api/price/{id}'],
    status: 'open',
    reportedBy: '3',
    createdAt: new Date('2025-11-21'),
    updatedAt: new Date('2025-11-21'),
  },
  {
    id: 'FV-008',
    projectId: 'p1',
    title: 'User Data Access Without Authentication',
    description: 'The user data retrieval endpoint exposes complete user profile information including sensitive personal data without requiring any authentication.',
    severity: 'critical',
    cvssScore: 9.8,
    stepsToReproduce: `1. Enumerate or guess user IDs
2. Send GET request to /api/user/{id}
3. No authentication required
4. Full user profile data exposed`,
    impact: 'Privacy Breach: Complete exposure of user PII. Identity Theft Risk: Personal data can be used for fraud. GDPR Violation: Unauthorized access to personal data is a reportable breach.',
    remediation: `1. Implement authentication on all user data endpoints
2. Limit data exposure to necessary fields only
3. Use UUIDs instead of sequential IDs
4. Implement access logging and monitoring`,
    affectedAssets: ['GET /api/user/{id}'],
    status: 'open',
    reportedBy: '3',
    createdAt: new Date('2025-11-21'),
    updatedAt: new Date('2025-11-21'),
  },
  {
    id: 'FV-009',
    projectId: 'p1',
    title: 'Unlimited Account Creation',
    description: 'The account creation endpoint lacks rate limiting and CAPTCHA protection, allowing automated mass account creation.',
    severity: 'critical',
    cvssScore: 9.1,
    stepsToReproduce: `1. Send automated POST requests to signup endpoint
2. No rate limiting detected
3. Mass accounts can be created`,
    impact: 'Resource Abuse: Platform resources consumed by fake accounts. Spam: Fake accounts can be used for spam activities. Platform Integrity: Mass fake accounts undermine genuine user base.',
    remediation: `1. Implement rate limiting per IP address
2. Add CAPTCHA verification
3. Email verification before account activation
4. Implement account creation monitoring and alerts`,
    affectedAssets: ['POST /api/user/signup'],
    status: 'open',
    reportedBy: '4',
    createdAt: new Date('2025-11-21'),
    updatedAt: new Date('2025-11-21'),
  },
  {
    id: 'FV-010',
    projectId: 'p1',
    title: 'Privileged Account Creation',
    description: 'The signup endpoint allows creation of accounts with elevated privileges (Admin, Evaluator roles) without proper authorization verification.',
    severity: 'critical',
    cvssScore: 9.8,
    stepsToReproduce: `1. Send POST request to /api/user/signup
2. Include role: "Admin" or "Evaluator" in request body
3. No authorization verification
4. Privileged account is created`,
    impact: 'Privilege Escalation: Attackers gain administrative access. Platform Control: Admin access enables complete platform compromise. Data Breach: Full access to all user and property data.',
    remediation: `1. Restrict role assignment to server-side logic only
2. Default all signups to basic user role
3. Require admin approval for elevated roles
4. Implement role-based access control verification`,
    affectedAssets: ['POST /api/user/signup'],
    status: 'open',
    reportedBy: '3',
    createdAt: new Date('2025-11-21'),
    updatedAt: new Date('2025-11-21'),
  },
  {
    id: 'FV-011',
    projectId: 'p1',
    title: 'Evaluator Slot Creation Without Auth',
    description: 'Unauthenticated users can create evaluator time slots, allowing manipulation of the evaluation scheduling system.',
    severity: 'critical',
    cvssScore: 9.1,
    stepsToReproduce: `1. Send POST to /api/arrange-view/slots/add
2. Include evaluator slot data
3. No authentication required
4. Slot created successfully`,
    impact: 'Schedule Manipulation: Fake evaluator slots disrupt legitimate bookings. Service Denial: Overwhelming the schedule system. Trust Damage: Unreliable scheduling affects user confidence.',
    remediation: `1. Implement authentication middleware
2. Verify evaluator permissions
3. Add rate limiting
4. Audit log all slot operations`,
    affectedAssets: ['POST /api/arrange-view/slots/add'],
    status: 'open',
    reportedBy: '4',
    createdAt: new Date('2025-11-21'),
    updatedAt: new Date('2025-11-21'),
  },
  {
    id: 'FV-012',
    projectId: 'p1',
    title: 'Property Deletion Without Authentication',
    description: 'The property deletion endpoint allows unauthenticated users to permanently remove property listings from the platform.',
    severity: 'critical',
    cvssScore: 9.8,
    stepsToReproduce: `1. Identify property ID
2. Send DELETE to /api/property/{id}
3. No authentication required
4. Property permanently deleted`,
    impact: 'Data Loss: Permanent loss of property listings. Business Impact: Active listings removed. Sabotage: Competitors can delete listings.',
    remediation: `1. Implement authentication on DELETE endpoints
2. Verify property ownership
3. Implement soft-delete
4. Add audit logging`,
    affectedAssets: ['DELETE /api/property/{id}'],
    status: 'open',
    reportedBy: '3',
    createdAt: new Date('2025-11-22'),
    updatedAt: new Date('2025-11-22'),
  },
  {
    id: 'FV-013',
    projectId: 'p1',
    title: 'Property Status Modification Without Auth',
    description: 'The property status update endpoint allows unauthenticated modification of property listing status (active, pending, sold, etc.).',
    severity: 'critical',
    cvssScore: 9.8,
    stepsToReproduce: `1. Identify property ID
2. Send PUT to /api/property/{id}
3. Modify status field
4. Status changed without auth`,
    impact: 'Listing Manipulation: Properties can be marked as sold when active. Fraud Enablement: Status manipulation can facilitate scams. Business Disruption: Incorrect statuses affect operations.',
    remediation: `1. Implement authentication middleware
2. Verify ownership authorization
3. Add status change notifications
4. Implement audit trails`,
    affectedAssets: ['PUT /api/property/{id}'],
    status: 'open',
    reportedBy: '3',
    createdAt: new Date('2025-11-22'),
    updatedAt: new Date('2025-11-22'),
  },
  {
    id: 'FV-014',
    projectId: 'p1',
    title: 'User Deletion From Evaluator List',
    description: 'Unauthenticated users can remove evaluators from the platform\'s evaluator list.',
    severity: 'critical',
    cvssScore: 9.1,
    stepsToReproduce: `1. Identify evaluator user ID
2. Send DELETE to /api/user/{id}
3. No authentication required
4. User removed from evaluator list`,
    impact: 'Service Disruption: Legitimate evaluators removed. Business Impact: Evaluation services compromised. Trust Damage: Platform reliability affected.',
    remediation: `1. Implement authentication for user management
2. Verify administrative privileges
3. Add confirmation workflows
4. Implement audit logging`,
    affectedAssets: ['DELETE /api/user/{id}'],
    status: 'open',
    reportedBy: '4',
    createdAt: new Date('2025-11-22'),
    updatedAt: new Date('2025-11-22'),
  },
  {
    id: 'FV-015',
    projectId: 'p1',
    title: 'Evaluator Account Status Change',
    description: 'The evaluator status endpoint allows unauthenticated modification of evaluator account status.',
    severity: 'critical',
    cvssScore: 9.1,
    stepsToReproduce: `1. Identify evaluator ID
2. Send PUT to /api/user/{id}
3. Modify account status
4. Status changed without auth`,
    impact: 'Account Takeover: Evaluator accounts disabled. Service Denial: Legitimate evaluators blocked. Business Disruption: Evaluation services affected.',
    remediation: `1. Implement authentication middleware
2. Verify admin authorization
3. Add status change notifications
4. Implement audit trails`,
    affectedAssets: ['PUT /api/user/{id}'],
    status: 'open',
    reportedBy: '3',
    createdAt: new Date('2025-11-22'),
    updatedAt: new Date('2025-11-22'),
  },
  {
    id: 'FV-016',
    projectId: 'p1',
    title: 'Buyer-Seller Details Exposure',
    description: 'The buyer-seller dashboard endpoint exposes complete transaction participant details without proper authentication.',
    severity: 'critical',
    cvssScore: 9.1,
    stepsToReproduce: `1. Navigate to /dashboard/buyer-seller
2. No authentication required
3. Full buyer and seller details exposed`,
    impact: 'Privacy Breach: Complete exposure of transaction participant PII. Financial Risk: Transaction details enable fraud. GDPR Violation: Unauthorized data access.',
    remediation: `1. Implement authentication on dashboard endpoints
2. Limit data exposure to necessary fields
3. Add access logging
4. Implement role-based access`,
    affectedAssets: ['GET /dashboard/buyer-seller'],
    status: 'open',
    reportedBy: '4',
    createdAt: new Date('2025-11-22'),
    updatedAt: new Date('2025-11-22'),
  },
  {
    id: 'FV-017',
    projectId: 'p1',
    title: 'Financial Statements Access Without Auth',
    description: 'The financial statements endpoint exposes sensitive financial data without requiring authentication.',
    severity: 'critical',
    cvssScore: 9.8,
    stepsToReproduce: `1. Navigate to /dashboard/financial-statements
2. No authentication required
3. Financial statements exposed`,
    impact: 'Financial Data Breach: Complete exposure of financial records. Fraud Enablement: Financial data enables identity theft. Regulatory Violation: Breach of financial data protection requirements.',
    remediation: `1. Implement strong authentication
2. Add authorization verification
3. Encrypt sensitive financial data
4. Implement audit logging`,
    affectedAssets: ['GET /dashboard/financial-statements'],
    status: 'open',
    reportedBy: '3',
    createdAt: new Date('2025-11-22'),
    updatedAt: new Date('2025-11-22'),
  },
  {
    id: 'FV-018',
    projectId: 'p1',
    title: 'User Financial Details Exposure',
    description: 'Individual user financial details are accessible without authentication via direct URL access.',
    severity: 'critical',
    cvssScore: 9.8,
    stepsToReproduce: `1. Enumerate user IDs
2. Access /dashboard/financial-statements/{id}
3. No authentication required
4. User financial details exposed`,
    impact: 'Privacy Breach: Individual financial records exposed. Identity Theft: Financial data enables fraud. Legal Liability: Violation of data protection laws.',
    remediation: `1. Implement authentication middleware
2. Verify user ownership of financial data
3. Use UUIDs instead of sequential IDs
4. Add access monitoring`,
    affectedAssets: ['GET /dashboard/financial-statements/{id}'],
    status: 'open',
    reportedBy: '4',
    createdAt: new Date('2025-11-22'),
    updatedAt: new Date('2025-11-22'),
  },
  {
    id: 'FV-019',
    projectId: 'p1',
    title: 'Financial Statements Modification Without Auth',
    description: 'The financial statements update endpoint allows unauthenticated modification of user financial records.',
    severity: 'critical',
    cvssScore: 9.8,
    stepsToReproduce: `1. Identify user ID
2. Send PUT to /api/user/financial-statements/{id}
3. Modify financial data
4. Changes applied without auth`,
    impact: 'Financial Fraud: Manipulated financial records. Data Integrity: Corrupted financial data. Legal Liability: Falsified financial statements.',
    remediation: `1. Implement authentication middleware
2. Verify user authorization
3. Add financial data validation
4. Implement audit trails`,
    affectedAssets: ['PUT /api/user/financial-statements/{id}'],
    status: 'open',
    reportedBy: '3',
    createdAt: new Date('2025-11-22'),
    updatedAt: new Date('2025-11-22'),
  },
  {
    id: 'FV-020',
    projectId: 'p1',
    title: 'Booking Details Exposure',
    description: 'Property viewing booking details are exposed without authentication, revealing personal and scheduling information.',
    severity: 'critical',
    cvssScore: 9.1,
    stepsToReproduce: `1. Enumerate booking IDs
2. Access /api/arrange-view/bookings/{id}
3. No authentication required
4. Booking details exposed`,
    impact: 'Privacy Breach: Personal scheduling details exposed. Physical Security: Viewing schedules enable property targeting. GDPR Violation: Unauthorized PII access.',
    remediation: `1. Implement authentication
2. Verify booking ownership
3. Use UUIDs for booking IDs
4. Add access logging`,
    affectedAssets: ['GET /api/arrange-view/bookings/{id}'],
    status: 'open',
    reportedBy: '4',
    createdAt: new Date('2025-11-23'),
    updatedAt: new Date('2025-11-23'),
  },
  {
    id: 'FV-021',
    projectId: 'p1',
    title: 'Blog Creation Without Authentication',
    description: 'The blog creation endpoint allows unauthenticated users to post arbitrary content on the platform.',
    severity: 'critical',
    cvssScore: 9.1,
    stepsToReproduce: `1. Send POST to /api/blog/add
2. Include arbitrary blog content
3. No authentication required
4. Blog post created`,
    impact: 'Content Injection: Malicious content posted. Reputation Damage: Inappropriate content on platform. SEO Impact: Spam content affects search rankings.',
    remediation: `1. Implement authentication middleware
2. Verify author permissions
3. Add content moderation
4. Implement CAPTCHA`,
    affectedAssets: ['POST /api/blog/add'],
    status: 'open',
    reportedBy: '3',
    createdAt: new Date('2025-11-23'),
    updatedAt: new Date('2025-11-23'),
  },
  {
    id: 'FV-022',
    projectId: 'p1',
    title: 'Asset Transfer Status Modification',
    description: 'The asset transfer marking endpoint allows unauthenticated modification of transfer status.',
    severity: 'critical',
    cvssScore: 9.8,
    stepsToReproduce: `1. Identify transfer ID
2. Send PUT to /api/arrange-view/mark-as-transfer
3. Modify transfer status
4. Status changed without auth`,
    impact: 'Transaction Fraud: Transfer status manipulation. Business Disruption: Incorrect transfer records. Financial Loss: Fraudulent transfers.',
    remediation: `1. Implement authentication
2. Verify transaction participant authorization
3. Add status change notifications
4. Implement audit trails`,
    affectedAssets: ['PUT /api/arrange-view/mark-as-transfer'],
    status: 'open',
    reportedBy: '4',
    createdAt: new Date('2025-11-23'),
    updatedAt: new Date('2025-11-23'),
  },
  {
    id: 'FV-023',
    projectId: 'p1',
    title: 'Unrestricted File Upload',
    description: 'File upload endpoints lack proper validation, allowing upload of potentially malicious files including executables and scripts.',
    severity: 'high',
    cvssScore: 8.6,
    stepsToReproduce: `1. Access file upload functionality
2. Upload file with malicious extension (.php, .exe, .js)
3. No file type validation
4. File uploaded successfully`,
    impact: 'Remote Code Execution: Uploaded scripts can be executed. Malware Distribution: Platform used to host malware. Server Compromise: Malicious files can compromise server.',
    remediation: `1. Implement strict file type validation
2. Check file content, not just extension
3. Store uploads outside web root
4. Scan uploads for malware`,
    affectedAssets: ['File Upload Endpoints'],
    status: 'open',
    reportedBy: '3',
    createdAt: new Date('2025-11-23'),
    updatedAt: new Date('2025-11-23'),
  },
  {
    id: 'FV-024',
    projectId: 'p1',
    title: 'User Files Publicly Accessible',
    description: 'User uploaded files stored in Cloudinary are publicly accessible without access controls.',
    severity: 'high',
    cvssScore: 7.5,
    stepsToReproduce: `1. Identify Cloudinary storage URLs
2. Access files directly via URL
3. No authentication required
4. Private user files accessible`,
    impact: 'Privacy Breach: Private documents exposed. Identity Theft: ID documents accessible. GDPR Violation: Unauthorized file access.',
    remediation: `1. Implement signed URLs with expiration
2. Add access control on storage
3. Encrypt sensitive files
4. Audit file access logs`,
    affectedAssets: ['Cloudinary Storage'],
    status: 'open',
    reportedBy: '4',
    createdAt: new Date('2025-11-23'),
    updatedAt: new Date('2025-11-23'),
  },
  {
    id: 'FV-025',
    projectId: 'p1',
    title: 'Cross-Site Scripting (XSS)',
    description: 'Multiple endpoints are vulnerable to XSS attacks due to improper input sanitization and output encoding.',
    severity: 'high',
    cvssScore: 7.1,
    stepsToReproduce: `1. Inject XSS payload in input fields
2. Payload: <script>alert('XSS')</script>
3. Submit form
4. Script executes in browser`,
    impact: 'Session Hijacking: Attacker can steal session cookies. Account Takeover: Execute actions as victim. Data Theft: Access victim\'s data.',
    remediation: `1. Implement input sanitization
2. Use output encoding
3. Add Content Security Policy headers
4. Use HTTPOnly cookies`,
    affectedAssets: ['Multiple Endpoints'],
    status: 'open',
    reportedBy: '3',
    createdAt: new Date('2025-11-24'),
    updatedAt: new Date('2025-11-24'),
  },
  {
    id: 'FV-026',
    projectId: 'p1',
    title: 'Missing Security Headers',
    description: 'The application lacks essential security headers including CSP, X-Frame-Options, and HSTS.',
    severity: 'medium',
    cvssScore: 5.3,
    stepsToReproduce: `1. Make request to any application page
2. Examine response headers
3. Note absence of security headers`,
    impact: 'Clickjacking: Application can be framed. XSS Amplification: No CSP to mitigate XSS. Protocol Downgrade: No HSTS protection.',
    remediation: `1. Add X-Frame-Options: DENY
2. Implement Content-Security-Policy
3. Enable Strict-Transport-Security
4. Add X-Content-Type-Options: nosniff`,
    affectedAssets: ['Web Server Configuration'],
    status: 'open',
    reportedBy: '4',
    createdAt: new Date('2025-11-24'),
    updatedAt: new Date('2025-11-24'),
  },
  {
    id: 'FV-027',
    projectId: 'p1',
    title: 'Sensitive Data in Error Messages',
    description: 'Application error messages reveal sensitive technical information including stack traces and database details.',
    severity: 'medium',
    cvssScore: 5.3,
    stepsToReproduce: `1. Trigger application error
2. Observe detailed error message
3. Stack traces and internal paths exposed`,
    impact: 'Information Disclosure: Internal paths and technologies revealed. Attack Planning: Error details aid attackers. Database Exposure: Query details in errors.',
    remediation: `1. Implement generic error messages for users
2. Log detailed errors server-side only
3. Disable debug mode in production
4. Configure proper error handling`,
    affectedAssets: ['Application Error Handling'],
    status: 'open',
    reportedBy: '3',
    createdAt: new Date('2025-11-24'),
    updatedAt: new Date('2025-11-24'),
  },
  {
    id: 'FV-028',
    projectId: 'p1',
    title: 'Weak Password Policy',
    description: 'The application allows weak passwords without enforcing complexity requirements.',
    severity: 'medium',
    cvssScore: 5.3,
    stepsToReproduce: `1. Navigate to registration
2. Enter weak password (e.g., "1234")
3. Account created successfully
4. No password complexity enforced`,
    impact: 'Account Compromise: Weak passwords easily guessed. Credential Stuffing: Common passwords enable attacks. Brute Force: Weak passwords quickly cracked.',
    remediation: `1. Enforce minimum 12 character passwords
2. Require mixed case, numbers, symbols
3. Check against breach databases
4. Implement account lockout`,
    affectedAssets: ['User Registration', 'Password Change'],
    status: 'open',
    reportedBy: '4',
    createdAt: new Date('2025-11-24'),
    updatedAt: new Date('2025-11-24'),
  },
  {
    id: 'FV-029',
    projectId: 'p1',
    title: 'Session Token in URL',
    description: 'Session tokens are passed in URL parameters, exposing them in browser history and server logs.',
    severity: 'low',
    cvssScore: 4.3,
    stepsToReproduce: `1. Log into application
2. Observe URL parameters
3. Session token visible in URL`,
    impact: 'Session Exposure: Tokens in browser history. Session Hijacking: Tokens visible in logs. Shoulder Surfing: Tokens visible on screen.',
    remediation: `1. Use HTTP-only cookies for session tokens
2. Remove tokens from URLs
3. Implement secure session management
4. Add session expiration`,
    affectedAssets: ['Session Management'],
    status: 'open',
    reportedBy: '3',
    createdAt: new Date('2025-11-24'),
    updatedAt: new Date('2025-11-24'),
  },
];

export const projects: Project[] = [
  {
    id: 'p1',
    name: 'FundsVerifier Web Application Assessment',
    description: 'Comprehensive security assessment of the FundsVerifier real estate platform focusing on authentication, authorization, and data protection vulnerabilities.',
    client: 'FundsVerifier',
    targetDomain: 'fundsverifier.com',
    targetIPs: ['51.112.251.34'],
    credentials: [
      { username: 'testuser1', password: 'TestPass123!', notes: 'Standard user account' },
      { username: 'evaluator_test', password: 'EvalTest456!', notes: 'Evaluator account for testing' },
    ],
    assignedTesters: ['3', '4'],
    managerId: '2',
    status: 'active',
    startDate: new Date('2025-11-21'),
    endDate: new Date('2025-11-25'),
    createdAt: new Date('2025-11-20'),
    findings: findings.filter(f => f.projectId === 'p1'),
  },
];

export const knowledgeBase: KnowledgeBaseItem[] = [
  {
    id: 'kb1',
    title: 'Broken Access Control Testing',
    category: 'Authorization',
    description: 'Methodology for testing authentication bypass and authorization flaws including IDOR, privilege escalation, and missing function-level access controls.',
    tools: ['Burp Suite', 'Autorize Extension', 'OWASP ZAP'],
    techniques: ['IDOR Testing', 'Horizontal Privilege Escalation', 'Vertical Privilege Escalation', 'JWT Manipulation'],
    references: ['https://owasp.org/Top10/A01_2021-Broken_Access_Control/'],
    submittedBy: '2',
    createdAt: new Date('2025-09-01'),
    updatedAt: new Date('2025-09-01'),
  },
  {
    id: 'kb2',
    title: 'API Security Testing',
    category: 'API Security',
    description: 'Comprehensive guide to testing REST APIs for common vulnerabilities including missing authentication, rate limiting bypass, and data exposure.',
    tools: ['Postman', 'Burp Suite', 'Insomnia'],
    techniques: ['Endpoint Enumeration', 'Parameter Tampering', 'Mass Assignment', 'Rate Limit Testing'],
    references: ['https://owasp.org/www-project-api-security/'],
    submittedBy: '2',
    createdAt: new Date('2025-09-15'),
    updatedAt: new Date('2025-09-15'),
  },
];

export const notifications: Notification[] = [
  {
    id: 'n1',
    userId: '2',
    title: 'Critical Finding Reported',
    message: '22 Critical severity findings have been reported on FundsVerifier Web Application Assessment',
    type: 'error',
    read: false,
    createdAt: new Date('2025-11-25'),
  },
  {
    id: 'n2',
    userId: '3',
    title: 'Project Assigned',
    message: 'You have been assigned to FundsVerifier Web Application Assessment',
    type: 'info',
    read: true,
    createdAt: new Date('2025-11-20'),
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
      'Test for privilege escalation',
      'Test for Insecure Direct Object References',
    ],
  },
  {
    category: 'Data Validation',
    items: [
      'Test for Reflected Cross Site Scripting',
      'Test for Stored Cross Site Scripting',
      'Test for DOM based Cross Site Scripting',
      'Test for Cross Site Flashing',
      'Test for HTML Injection',
      'Test for SQL Injection',
      'Test for LDAP Injection',
      'Test for ORM Injection',
      'Test for XML Injection',
      'Test for XXE Injection',
      'Test for SSI Injection',
      'Test for XPath Injection',
      'Test for XQuery Injection',
      'Test for IMAP/SMTP Injection',
      'Test for Code Injection',
      'Test for Expression Language Injection',
      'Test for Command Injection',
      'Test for Overflow (Stack, Heap and Integer)',
      'Test for Format String',
      'Test for incubated vulnerabilities',
      'Test for HTTP Splitting/Smuggling',
      'Test for HTTP Incoming Requests',
      'Test for HTTP Parameter Pollution',
      'Test for auto-binding',
      'Test for Mass Assignment',
      'Test for NULL/Invalid Session Cookie',
    ],
  },
  {
    category: 'Denial of Service',
    items: [
      'Test for Anti-automation',
      'Test for Account Lockout',
      'Test for HTTP Protocol DoS',
      'Test for SQL Wildcard DoS',
    ],
  },
  {
    category: 'Business Logic',
    items: [
      'Test business logic data validation',
      'Test ability to forge requests',
      'Test integrity checks',
      'Test for process timing',
      'Test number of times a function can be used limits',
      'Testing for the circumvention of work flows',
      'Test defenses against application misuse',
      'Test upload of unexpected file types',
      'Test upload of malicious files',
      'Test payment functionality',
    ],
  },
  {
    category: 'Cryptography',
    items: [
      'Check if data which should be encrypted is not',
      'Check for wrong algorithms usage depending on context',
      'Check for weak algorithms usage',
      'Check for proper use of salting',
      'Check for randomness functions',
    ],
  },
];
