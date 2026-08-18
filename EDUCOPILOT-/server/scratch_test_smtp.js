const nodemailer = require('nodemailer');
require('dotenv').config();

const run = async () => {
  const emailUser = process.env.EMAIL_USER || 'educopilot8@gmail.com';
  const emailPass = process.env.EMAIL_PASS;

  console.log('--- SMTP Diagnostic Tool ---');
  console.log('EMAIL_USER:', emailUser);
  console.log('EMAIL_PASS length:', emailPass ? emailPass.length : 0);
  console.log('EMAIL_PASS exists:', !!emailPass);

  if (!emailPass) {
    console.error('ERROR: EMAIL_PASS is missing in your .env file! Please add it and restart the server.');
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });

  console.log('Verifying SMTP connection...');
  try {
    await transporter.verify();
    console.log('SUCCESS: SMTP connection verified successfully! Your credentials are correct.');
    
    console.log('Sending a test email to yourself...');
    const info = await transporter.sendMail({
      from: `"EduCopilot Test" <${emailUser}>`,
      to: emailUser,
      subject: 'EduCopilot SMTP Test Email',
      text: 'If you receive this, your Gmail SMTP connection is working perfectly!',
    });
    console.log('SUCCESS: Test email sent! Message ID:', info.messageId);
    process.exit(0);
  } catch (err) {
    console.error('ERROR: SMTP connection failed!');
    console.error('Error Message:', err.message);
    console.error('Full Error details:', err);
    process.exit(1);
  }
};

run();
