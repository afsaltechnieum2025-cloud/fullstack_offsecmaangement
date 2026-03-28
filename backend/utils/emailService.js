// backend/utils/emailService.js
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send project assignment notification email
 * @param {Object} params
 * @param {string} params.toEmail     - Recipient's email
 * @param {string} params.toName      - Recipient's full name
 * @param {string} params.projectName - Project name
 * @param {string} params.clientName  - Client name
 * @param {string} params.startDate   - Project start date
 * @param {string} params.endDate     - Project end date
 * @param {string} params.assignedBy  - Manager/admin who assigned
 * @param {string} params.projectId   - Project UUID (for deep link)
 */
async function sendProjectAssignmentEmail({
  toEmail,
  toName,
  projectName,
  clientName,
  startDate,
  endDate,
  assignedBy,
  projectId,
}) {
  const portalLink     = `${process.env.APP_URL}/projects/${projectId}`;
  const formattedStart = startDate ? new Date(startDate).toDateString() : 'TBD';
  const formattedEnd   = endDate   ? new Date(endDate).toDateString()   : 'TBD';

  console.log(`[Email] Sending to: ${toEmail} | Project: ${projectName} | Assigned by: ${assignedBy}`);

  const { data, error } = await resend.emails.send({
    from:    process.env.SMTP_FROM,
    to:      [toEmail],
    subject: `[Technieum] You've been assigned: ${projectName}`,
    text:    `Hi ${toName},\n\nYou have been assigned to the project "${projectName}" (Client: ${clientName}).\n\nTimeline: ${formattedStart} → ${formattedEnd}\nAssigned by: ${assignedBy}\n\nView project: ${portalLink}\n\n— Technieum OffSec Portal`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Project Assignment</title>
</head>
<body style="margin:0;padding:0;background:#0f1117;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1117;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#1a1d27;border-radius:12px;overflow:hidden;border:1px solid #2a2d3e;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 40px;text-align:center;">
              <p style="margin:0 0 8px;color:#c4b5fd;font-size:13px;letter-spacing:2px;text-transform:uppercase;">Technieum OffSec Management Portal</p>
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;">You've been assigned to a project</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="color:#a0a3b1;font-size:15px;margin:0 0 24px;">Hi <strong style="color:#e2e8f0;">${toName}</strong>,</p>
              <p style="color:#a0a3b1;font-size:15px;margin:0 0 32px;">
                <strong style="color:#e2e8f0;">${assignedBy}</strong> has assigned you to the following engagement on the Technieum OffSec Portal:
              </p>

              <!-- Project Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1117;border-radius:10px;border:1px solid #2a2d3e;margin-bottom:32px;">
                <tr>
                  <td style="padding:24px;">
                    <table width="100%">
                      <tr>
                        <td style="padding-bottom:16px;border-bottom:1px solid #2a2d3e;">
                          <p style="margin:0 0 4px;color:#6366f1;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;">Project</p>
                          <p style="margin:0;color:#e2e8f0;font-size:18px;font-weight:600;">${projectName}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:16px 0;border-bottom:1px solid #2a2d3e;">
                          <p style="margin:0 0 4px;color:#6366f1;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;">Client</p>
                          <p style="margin:0;color:#e2e8f0;font-size:15px;">${clientName}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top:16px;">
                          <table width="100%">
                            <tr>
                              <td width="50%">
                                <p style="margin:0 0 4px;color:#6366f1;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;">Start Date</p>
                                <p style="margin:0;color:#e2e8f0;font-size:15px;">${formattedStart}</p>
                              </td>
                              <td width="50%">
                                <p style="margin:0 0 4px;color:#6366f1;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;">End Date</p>
                                <p style="margin:0;color:#e2e8f0;font-size:15px;">${formattedEnd}</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${portalLink}"
                       style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 36px;border-radius:8px;letter-spacing:0.5px;">
                      View Project →
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #2a2d3e;text-align:center;">
              <p style="margin:0;color:#4a4d61;font-size:12px;">This is an automated notification from Technieum OffSec Management Portal.</p>
              <p style="margin:8px 0 0;color:#4a4d61;font-size:12px;">© 2026 Technieum Technologies LLC, Dubai</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  });

  if (error) {
    console.error(`[Email] Resend error:`, error);
    throw new Error(`Resend error: ${error.message}`);
  }

  console.log(`[Email] ✅ Assignment notification sent to ${toEmail} | Resend ID: ${data.id}`);
  return data;
}

module.exports = { sendProjectAssignmentEmail };