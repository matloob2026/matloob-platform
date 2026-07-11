/**
 * Email templates — plain-text + HTML, Arabic content, RTL layout.
 * AuthService builds the `MailMessage` for each flow using these
 * instead of ad-hoc inline strings, so both the dev (ConsoleMailer)
 * and production (ResendMailer) paths render the same content
 * consistently through the one `Mailer` interface — see
 * src/lib/mailer/mailer.interface.ts.
 */

const BRAND = "مطلوب";
const BRAND_COLOR = "#0f2a4a"; // matches navy-950 in tailwind.config

function layout(bodyHtml: string, preheader: string): string {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body style="margin:0;padding:0;background-color:#f4f6f8;font-family:Tahoma,Arial,sans-serif;">
    <span style="display:none;max-height:0;overflow:hidden;">${preheader}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background-color:${BRAND_COLOR};padding:20px 32px;text-align:right;">
                <span style="color:#ffffff;font-size:20px;font-weight:bold;">${BRAND}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;text-align:right;color:#1a1a1a;font-size:15px;line-height:1.8;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;text-align:right;color:#8a8f98;font-size:12px;border-top:1px solid #eef0f2;">
                إذا لم تطلب هذه الرسالة، يمكنك تجاهلها بأمان.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function button(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0;">
    <tr>
      <td style="border-radius:8px;background-color:${BRAND_COLOR};">
        <a href="${href}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;border-radius:8px;">${label}</a>
      </td>
    </tr>
  </table>`;
}

export function verificationEmailTemplate(link: string): { subject: string; text: string; html: string } {
  const subject = "أكّد بريدك الإلكتروني في مطلوب";
  const text = `مرحباً بك في مطلوب!\n\nلتفعيل حسابك، افتح الرابط التالي خلال 24 ساعة:\n${link}\n\nإذا لم تطلب ذلك، يمكنك تجاهل هذه الرسالة.`;
  const html = layout(
    `<p style="margin:0 0 12px;font-size:17px;font-weight:bold;">مرحباً بك في ${BRAND}!</p>
     <p style="margin:0 0 8px;">لتفعيل حسابك، اضغط على الزر أدناه. الرابط صالح لمدة 24 ساعة.</p>
     ${button("تفعيل الحساب", link)}
     <p style="margin:16px 0 0;font-size:13px;color:#5a6270;">أو انسخ هذا الرابط: <br/><span style="word-break:break-all;">${link}</span></p>`,
    "أكّد بريدك الإلكتروني لتفعيل حسابك في مطلوب"
  );
  return { subject, text, html };
}

export function passwordResetEmailTemplate(link: string): { subject: string; text: string; html: string } {
  const subject = "إعادة تعيين كلمة المرور في مطلوب";
  const text = `تلقينا طلباً لإعادة تعيين كلمة المرور.\n\nالرابط صالح لمدة ساعة واحدة:\n${link}\n\nإذا لم تطلب ذلك، يمكنك تجاهل هذه الرسالة.`;
  const html = layout(
    `<p style="margin:0 0 12px;font-size:17px;font-weight:bold;">إعادة تعيين كلمة المرور</p>
     <p style="margin:0 0 8px;">تلقينا طلباً لإعادة تعيين كلمة المرور لحسابك. الرابط صالح لمدة ساعة واحدة.</p>
     ${button("إعادة تعيين كلمة المرور", link)}
     <p style="margin:16px 0 0;font-size:13px;color:#5a6270;">أو انسخ هذا الرابط: <br/><span style="word-break:break-all;">${link}</span></p>`,
    "إعادة تعيين كلمة المرور لحسابك في مطلوب"
  );
  return { subject, text, html };
}
