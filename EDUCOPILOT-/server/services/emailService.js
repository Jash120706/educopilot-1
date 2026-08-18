const nodemailer = require('nodemailer');

/**
 * Send test invitation emails to students.
 * Supports configurable SMTP settings, falling back to console logs if credentials are not configured.
 */
const sendTestInvitations = async ({
  testTitle,
  accessCode,
  emails,
  subject,
  durationMinutes,
  courseId,
  professorName,
}) => {
  const emailUser = process.env.EMAIL_USER || 'educopilot8@gmail.com';
  const emailPass = process.env.EMAIL_PASS;
  const appUrl = process.env.APP_URL || 'http://localhost:5173';

  console.log(`[EmailService] Processing invitations for "${testTitle}" to ${emails.length} students...`);

  // Build the email template content
  const emailSubject = `Invitation to take Exam: ${testTitle}`;
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          background-color: #f8fafc;
          margin: 0;
          padding: 20px;
          color: #1e293b;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        }
        .header {
          background-color: #2563eb;
          color: #ffffff;
          padding: 24px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
        }
        .content {
          padding: 24px;
          line-height: 1.6;
        }
        .details-box {
          background-color: #f1f5f9;
          border-left: 4px solid #2563eb;
          padding: 16px;
          margin: 20px 0;
          border-radius: 0 8px 8px 0;
        }
        .details-row {
          margin-bottom: 8px;
        }
        .details-row:last-child {
          margin-bottom: 0;
        }
        .label {
          font-weight: bold;
          color: #475569;
          display: inline-block;
          width: 120px;
        }
        .code-container {
          text-align: center;
          margin: 24px 0;
        }
        .access-code {
          font-family: monospace;
          background-color: #fef3c7;
          border: 2px dashed #f59e0b;
          color: #b45309;
          padding: 10px 20px;
          font-size: 18px;
          font-weight: bold;
          border-radius: 8px;
          display: inline-block;
          letter-spacing: 1px;
        }
        .btn-container {
          text-align: center;
          margin: 24px 0;
        }
        .btn {
          background-color: #2563eb;
          color: #ffffff !important;
          padding: 12px 28px;
          text-decoration: none;
          font-weight: bold;
          border-radius: 8px;
          display: inline-block;
          box-shadow: 0 4px 6px -1px rgba(37,99,235,0.2);
        }
        .instructions {
          background-color: #fafafa;
          border: 1px solid #eaeaea;
          padding: 16px;
          border-radius: 8px;
          font-size: 13px;
        }
        .footer {
          background-color: #f8fafc;
          padding: 16px;
          text-align: center;
          font-size: 12px;
          color: #64748b;
          border-top: 1px solid #e2e8f0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>EduCopilot Assessment Portal</h1>
        </div>
        <div class="content">
          <p>Hello Student,</p>
          <p>Your professor has invited you to take the following online examination:</p>
          
          <div class="details-box">
            <div class="details-row"><span class="label">Test Name:</span> <strong>${testTitle}</strong></div>
            <div class="details-row"><span class="label">Course ID:</span> ${courseId || 'N/A'}</div>
            <div class="details-row"><span class="label">Subject:</span> ${subject || 'General'}</div>
            <div class="details-row"><span class="label">Professor:</span> Prof. ${professorName || 'N/A'}</div>
            <div class="details-row"><span class="label">Duration:</span> ${durationMinutes} Minutes</div>
          </div>
          
          <p>Please use this secure access code to unlock and attempt the test:</p>
          
          <div class="code-container">
            <div class="access-code">${accessCode}</div>
          </div>

          <div class="btn-container">
            <a href="${appUrl}" target="_blank" class="btn">Go to Assessment Portal</a>
          </div>

          <div class="instructions">
            <strong>Instructions to attempt the test:</strong>
            <ol style="margin-top: 8px; margin-bottom: 0; padding-left: 20px;">
              <li>Click the button above or navigate to the web application URL.</li>
              <li>Log in with your Student account credentials.</li>
              <li>From the sidebar, select the <strong>Prof Exams</strong> workspace.</li>
              <li>Enter the Access Code <strong>${accessCode}</strong> and click <strong>Unlock & Start Exam</strong>.</li>
            </ol>
          </div>
        </div>
        <div class="footer">
          <p>This is an automated notification from EduCopilot.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
    Hello Student,
    
    Your professor has invited you to take the following online examination:
    
    Test Name: ${testTitle}
    Course ID: ${courseId || 'N/A'}
    Subject: ${subject || 'General'}
    Professor: Prof. ${professorName || 'N/A'}
    Duration: ${durationMinutes} Minutes
    
    Secure Access Code: ${accessCode}
    
    Go to Assessment Portal: ${appUrl}
    
    Instructions:
    1. Open the portal.
    2. Log in with your Student account.
    3. Select "Prof Exams" from the sidebar menu.
    4. Enter the Access Code "${accessCode}" to unlock and start the exam.
    
    Regards,
    EduCopilot team
  `;

  // If no password is provided in .env, log to console instead of throwing errors
  if (!emailPass) {
    console.log(`[EmailService] [FALLBACK LOGGER] SMTP not fully configured (missing EMAIL_PASS). Listing generated email details:`);
    console.log(`--------------------------------------------------`);
    console.log(`From: ${emailUser}`);
    console.log(`Subject: ${emailSubject}`);
    console.log(`Recipients (${emails.length}):`, emails.join(', '));
    console.log(`App Link: ${appUrl}`);
    console.log(`Access Code: ${accessCode}`);
    console.log(`--------------------------------------------------`);
    return { success: true, count: emails.length, loggedOnly: true };
  }

  // Set up Nodemailer transporter for Gmail using SSL port 465
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: emailUser,
      pass: emailPass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  let sentCount = 0;
  let lastError = null;
  for (const email of emails) {
    try {
      await transporter.sendMail({
        from: `"EduCopilot Portal" <${emailUser}>`,
        to: email,
        subject: emailSubject,
        text: textContent,
        html: htmlContent,
      });
      sentCount++;
    } catch (err) {
      console.error(`[EmailService] Failed to send email to ${email}:`, err.message);
      lastError = err.message;
    }
  }

  console.log(`[EmailService] Successfully sent ${sentCount} / ${emails.length} invitation emails.`);

  if (sentCount === 0 && emails.length > 0) {
    throw new Error(lastError || 'Failed to send test invitation email via Gmail SMTP.');
  }

  return { success: true, count: sentCount, loggedOnly: false };
};

/**
 * Send lecture notes and course study materials to students via email.
 */
const sendSharedNotesEmail = async ({
  notesTitle,
  topic,
  subject,
  notesContent,
  emails,
  professorName,
  courseId,
  attachments = [],
}) => {
  const emailUser = process.env.EMAIL_USER || 'educopilot8@gmail.com';
  const emailPass = process.env.EMAIL_PASS;
  const appUrl = process.env.APP_URL || 'http://localhost:5173';

  console.log(`[EmailService] Processing shared notes "${notesTitle}" for ${emails.length} recipients...`);

  const emailSubject = `Lecture Notes & Study Material: ${notesTitle || topic || 'Course Study Material'}`;

  // Format markdown symbols for email HTML output
  const formattedBody = (notesContent || '')
    .replace(/\n\n/g, '</p><p style="margin-bottom: 12px;">')
    .replace(/\n/g, '<br/>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-family:monospace;">$1</code>');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
        .container { max-width: 650px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .header { background-color: #2563eb; color: #ffffff; padding: 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 700; }
        .content { padding: 24px; line-height: 1.6; }
        .details-box { background-color: #f1f5f9; border-left: 4px solid #2563eb; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0; }
        .details-row { margin-bottom: 8px; }
        .details-row:last-child { margin-bottom: 0; }
        .label { font-weight: bold; color: #475569; display: inline-block; width: 130px; }
        .notes-container { background-color: #ffffff; border: 1px solid #cbd5e1; padding: 20px; border-radius: 8px; font-size: 14px; color: #334155; margin: 20px 0; }
        .btn-container { text-align: center; margin: 24px 0; }
        .btn { background-color: #2563eb; color: #ffffff !important; padding: 12px 28px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37,99,235,0.2); }
        .footer { background-color: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>EduCopilot Course Notes & Study Material</h1>
        </div>
        <div class="content">
          <p>Hello Student,</p>
          <p>Prof. <strong>${professorName || 'Instructor'}</strong> has shared lecture notes and study material with your class:</p>
          
          <div class="details-box">
            <div class="details-row"><span class="label">Notes Title:</span> <strong>${notesTitle}</strong></div>
            <div class="details-row"><span class="label">Topic / Concept:</span> ${topic || 'General'}</div>
            <div class="details-row"><span class="label">Course / Subject:</span> ${subject || courseId || 'N/A'}</div>
            <div class="details-row"><span class="label">Instructor:</span> Prof. ${professorName || 'N/A'}</div>
          </div>
          
          <h3 style="color:#1e293b; margin-top:24px;">Lecture Notes Content:</h3>
          <div class="notes-container">
            <p style="margin-top: 0;">${formattedBody}</p>
          </div>

          <div class="btn-container">
            <a href="${appUrl}" target="_blank" class="btn">Open Student Learning Portal</a>
          </div>
        </div>
        <div class="footer">
          <p>This study material was dispatched via EduCopilot Teaching Suite.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
    Hello Student,
    
    Prof. ${professorName || 'Instructor'} has shared lecture notes and study material with your class:
    
    Title: ${notesTitle}
    Topic: ${topic || 'General'}
    Course: ${subject || courseId || 'N/A'}
    Instructor: Prof. ${professorName || 'N/A'}
    
    Notes Content:
    --------------------------------------------------
    ${notesContent}
    --------------------------------------------------
    
    Access Student Portal: ${appUrl}
    
    Regards,
    EduCopilot Team
  `;

  // Fallback logger if no EMAIL_PASS configured
  if (!emailPass) {
    console.log(`[EmailService] [FALLBACK LOGGER] SMTP missing EMAIL_PASS. Shared notes preview:`);
    console.log(`--------------------------------------------------`);
    console.log(`From: ${emailUser}`);
    console.log(`Subject: ${emailSubject}`);
    console.log(`Recipients (${emails.length}):`, emails.join(', '));
    console.log(`Notes Title: ${notesTitle}`);
    console.log(`--------------------------------------------------`);
    return { success: true, count: emails.length, loggedOnly: true };
  }

  // Set up Nodemailer transporter for Gmail using SSL port 465
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: emailUser,
      pass: emailPass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  let sentCount = 0;
  let lastError = null;
  for (const email of emails) {
    try {
      await transporter.sendMail({
        from: `"EduCopilot Teaching Suite" <${emailUser}>`,
        to: email,
        subject: emailSubject,
        text: textContent,
        html: htmlContent,
        attachments: Array.isArray(attachments) ? attachments : [],
      });
      sentCount++;
    } catch (err) {
      console.error(`[EmailService] Failed to send notes email to ${email}:`, err.message);
      lastError = err.message;
    }
  }

  console.log(`[EmailService] Successfully sent ${sentCount} / ${emails.length} notes emails.`);

  if (sentCount === 0 && emails.length > 0) {
    throw new Error(lastError || 'Failed to send notes email via Gmail SMTP. Please check recipient addresses or Gmail credentials.');
  }

  return { success: true, count: sentCount, loggedOnly: false };
};

/**
 * Send OTP verification code to user for password recovery
 */
const sendOtpEmail = async ({ email, otp, userName }) => {
  const emailUser = process.env.EMAIL_USER || 'educopilot8@gmail.com';
  const emailPass = process.env.EMAIL_PASS;

  console.log(`[EmailService] Sending OTP verification email to ${email}...`);

  const emailSubject = `EduCopilot Password Reset OTP`;
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
        .container { max-width: 500px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .header { background-color: #2563eb; color: #ffffff; padding: 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 18px; font-weight: 700; }
        .content { padding: 24px; line-height: 1.6; }
        .code-container { text-align: center; margin: 24px 0; }
        .otp-code { font-family: monospace; background-color: #f1f5f9; border: 1px solid #e2e8f0; color: #2563eb; padding: 12px 24px; font-size: 24px; font-weight: bold; border-radius: 8px; display: inline-block; letter-spacing: 2px; }
        .footer { background-color: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>EduCopilot Password Recovery</h1>
        </div>
        <div class="content">
          <p>Hello ${userName || 'User'},</p>
          <p>We received a request to reset your password. Please use the following One-Time Password (OTP) to complete the verification process:</p>
          <div class="code-container">
            <div class="otp-code">${otp}</div>
          </div>
          <p>This OTP is valid for 15 minutes. If you did not request this, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>This is an automated notification from EduCopilot.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
    Hello ${userName || 'User'},
    
    We received a request to reset your password. Please use the following One-Time Password (OTP) to complete the verification process:
    
    OTP: ${otp}
    
    This OTP is valid for 15 minutes. If you did not request this, please ignore this email.
    
    Regards,
    EduCopilot Team
  `;

  if (!emailPass) {
    console.log(`[EmailService] [FALLBACK LOGGER] SMTP not configured (missing EMAIL_PASS). Listing generated OTP email:`);
    console.log(`--------------------------------------------------`);
    console.log(`To: ${email}`);
    console.log(`Subject: ${emailSubject}`);
    console.log(`OTP Code: ${otp}`);
    console.log(`--------------------------------------------------`);
    return { success: true, loggedOnly: true };
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: emailUser,
      pass: emailPass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  await transporter.sendMail({
    from: `"EduCopilot Portal" <${emailUser}>`,
    to: email,
    subject: emailSubject,
    text: textContent,
    html: htmlContent,
  });

  console.log(`[EmailService] OTP email successfully sent to ${email}.`);
  return { success: true, loggedOnly: false };
};

module.exports = {
  sendTestInvitations,
  sendSharedNotesEmail,
  sendOtpEmail,
};
