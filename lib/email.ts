import sgMail from "@sendgrid/mail"

if (!process.env.SENDGRID_API_KEY) {
  console.warn("SendGrid API key not found. Email functionality will not work.")
}

// Initialize SendGrid if API key is available
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
}

type EmailData = {
  to: string
  subject: string
  text: string
  html: string
}

export async function sendEmail({ to, subject, text, html }: EmailData) {
  if (!process.env.SENDGRID_API_KEY) {
    console.error("SendGrid API key not set. Cannot send email.")
    return { success: false, error: "SendGrid API key not set" }
  }

  const msg = {
    to,
    from: process.env.EMAIL_FROM || "noreply@example.com",
    subject,
    text,
    html,
  }

  try {
    await sgMail.send(msg)
    console.log(`Email sent successfully to ${to}`)
    return { success: true }
  } catch (error) {
    console.error("Error sending email:", error)
    return { success: false, error }
  }
}

export async function sendVerificationEmail(email: string, token: string) {
  const verificationUrl = `${process.env.NEXTAUTH_URL}/auth/verify-email?token=${token}`

  return sendEmail({
    to: email,
    subject: "Verify your email address",
    text: `Please verify your email address by clicking on the following link: ${verificationUrl}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h1 style="color: #333; text-align: center;">Email Verification</h1>
        <p style="color: #555; font-size: 16px;">Thank you for registering with our hotel. Please verify your email address by clicking on the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #4a90e2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Email</a>
        </div>
        <p style="color: #555; font-size: 14px;">If the button doesn't work, you can also copy and paste the following link into your browser:</p>
        <p style="word-break: break-all; color: #777; font-size: 14px;">${verificationUrl}</p>
        <p style="color: #555; font-size: 14px; margin-top: 30px;">If you didn't create an account, you can safely ignore this email.</p>
      </div>
    `,
  })
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}`

  return sendEmail({
    to: email,
    subject: "Reset your password",
    text: `Please reset your password by clicking on the following link: ${resetUrl}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h1 style="color: #333; text-align: center;">Password Reset</h1>
        <p style="color: #555; font-size: 16px;">You requested to reset your password. Click the button below to create a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #4a90e2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
        </div>
        <p style="color: #555; font-size: 14px;">If the button doesn't work, you can also copy and paste the following link into your browser:</p>
        <p style="word-break: break-all; color: #777; font-size: 14px;">${resetUrl}</p>
        <p style="color: #555; font-size: 14px; margin-top: 30px;">If you didn't request a password reset, you can safely ignore this email.</p>
      </div>
    `,
  })
}

export async function sendReservationConfirmation(
  email: string,
  reservationDetails: {
    confirmationCode: string
    checkInDate: Date
    checkOutDate: Date
    roomType: string
    totalPrice: number
    guestName: string
  },
) {
  const { confirmationCode, checkInDate, checkOutDate, roomType, totalPrice, guestName } = reservationDetails

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return sendEmail({
    to: email,
    subject: `Reservation Confirmation #${confirmationCode}`,
    text: `
      Dear ${guestName},
      
      Thank you for your reservation at our hotel.
      
      Confirmation Code: ${confirmationCode}
      Check-in: ${formatDate(checkInDate)}
      Check-out: ${formatDate(checkOutDate)}
      Room Type: ${roomType}
      Total Price: $${totalPrice.toFixed(2)}
      
      We look forward to welcoming you!
    `,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h1 style="color: #333; text-align: center;">Reservation Confirmation</h1>
        <p style="color: #555; font-size: 16px;">Dear ${guestName},</p>
        <p style="color: #555; font-size: 16px;">Thank you for your reservation at our hotel. Your booking has been confirmed.</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Confirmation Code:</strong> ${confirmationCode}</p>
          <p style="margin: 5px 0;"><strong>Check-in:</strong> ${formatDate(checkInDate)}</p>
          <p style="margin: 5px 0;"><strong>Check-out:</strong> ${formatDate(checkOutDate)}</p>
          <p style="margin: 5px 0;"><strong>Room Type:</strong> ${roomType}</p>
          <p style="margin: 5px 0;"><strong>Total Price:</strong> $${totalPrice.toFixed(2)}</p>
        </div>
        
        <p style="color: #555; font-size: 16px;">We look forward to welcoming you to our hotel. If you have any questions or special requests, please don't hesitate to contact us.</p>
        
        <div style="text-align: center; margin-top: 30px; color: #777; font-size: 14px;">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    `,
  })
}

