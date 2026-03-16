// utils/mailer.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   Number(process.env.SMTP_PORT) || 587,
  secure: false, // true for port 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send project assignment notification email
 *
 * @param {object} params
 * @param {string} params.toEmail      - recipient email address
 * @param {string} params.username     - recipient's username
 * @param {string} params.projectName  - name of the project
 * @param {string} params.clientName   - client name
 * @param {string} [params.startDate]  - project start date (optional)
 * @param {string} [params.endDate]    - project end date (optional)
 */
async function sendAssignmentEmail({ toEmail, username, projectName, clientName, startDate, endDate }) {
  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not set';

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          background: #0a0a0a;
          padding: 32px 16px;
        }
        .wrapper {
          max-width: 560px;
          margin: 0 auto;
          background: #111111;
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid #1e1e1e;
        }
        .header {
          background: linear-gradient(135deg, #6d28d9 0%, #2563eb 100%);
          padding: 32px 32px 28px;
        }
        .logo {
          font-size: 20px;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: -0.5px;
          margin-bottom: 16px;
        }
        .logo span { color: #c4b5fd; }
        .header h1 {
          color: #ffffff;
          font-size: 20px;
          font-weight: 700;
          letter-spacing: -0.3px;
          line-height: 1.3;
        }
        .header p {
          color: rgba(255,255,255,0.65);
          font-size: 12px;
          margin-top: 6px;
        }
        .body { padding: 28px 32px; }
        .greeting {
          color: #e2e8f0;
          font-size: 15px;
          margin-bottom: 12px;
        }
        .message {
          color: #94a3b8;
          font-size: 13.5px;
          line-height: 1.65;
          margin-bottom: 24px;
        }
        .card {
          background: #0d0d0d;
          border: 1px solid #1e1e1e;
          border-radius: 10px;
          overflow: hidden;
          margin-bottom: 24px;
        }
        .card-title {
          padding: 12px 16px;
          background: #161616;
          border-bottom: 1px solid #1e1e1e;
          color: #64748b;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .card-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 11px 16px;
          border-bottom: 1px solid #161616;
        }
        .card-row:last-child { border-bottom: none; }
        .card-label {
          color: #475569;
          font-size: 12px;
        }
        .card-value {
          color: #cbd5e1;
          font-size: 13px;
          font-weight: 500;
          text-align: right;
          max-width: 60%;
        }
        .badge {
          display: inline-block;
          background: rgba(109,40,217,0.15);
          color: #a78bfa;
          border: 1px solid rgba(109,40,217,0.3);
          border-radius: 20px;
          padding: 2px 10px;
          font-size: 11px;
          font-weight: 600;
        }
        .cta {
          text-align: center;
          margin-bottom: 8px;
        }
        .cta-note {
          color: #475569;
          font-size: 12px;
          line-height: 1.5;
          text-align: center;
        }
        .divider {
          border: none;
          border-top: 1px solid #1a1a1a;
          margin: 24px 0;
        }
        .footer {
          padding: 18px 32px 24px;
          text-align: center;
        }
        .footer p {
          color: #334155;
          font-size: 11px;
          line-height: 1.6;
        }
      </style>
    </head>
    <body>
      <div class="wrapper">

        <!-- Header -->
        <div class="header">
          <div class="logo">TECHNI<span>EUM</span></div>
          <h1>You've been assigned to a project</h1>
          <p>Security Operations Management Platform</p>
        </div>

        <!-- Body -->
        <div class="body">
          <p class="greeting">Hi <strong style="color:#e2e8f0;">${username}</strong> 👋</p>
          <p class="message">
            You have been assigned as a <strong style="color:#c4b5fd;">Tester</strong> on the following
            penetration testing engagement. Please review the details below and begin your assessment
            as scheduled.
          </p>

          <!-- Project Details Card -->
          <div class="card">
            <div class="card-title">Project Details</div>
            <div class="card-row">
              <span class="card-label">Project Name</span>
              <span class="card-value">${projectName}</span>
            </div>
            <div class="card-row">
              <span class="card-label">Client</span>
              <span class="card-value">${clientName}</span>
            </div>
            <div class="card-row">
              <span class="card-label">Start Date</span>
              <span class="card-value">${formatDate(startDate)}</span>
            </div>
            <div class="card-row">
              <span class="card-label">End Date</span>
              <span class="card-value">${formatDate(endDate)}</span>
            </div>
            <div class="card-row">
              <span class="card-label">Your Role</span>
              <span class="card-value"><span class="badge">Tester</span></span>
            </div>
          </div>

          <hr class="divider" />

          <p class="cta-note">
            Log in to <strong style="color:#a78bfa;">Technieum</strong> to view the full project scope,
            findings dashboard, and assigned checklist.
          </p>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p>Technieum &middot; Security Operations Management</p>
          <p>This is an automated notification — please do not reply to this email.</p>
        </div>

      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from:    `"Technieum" <${process.env.SMTP_USER}>`,
    to:      toEmail,
    subject: `[Technieum] You've been assigned to: ${projectName}`,
    html,
  });
}

module.exports = { sendAssignmentEmail };