// The welcome email a member gets once, when their account is created on
// their first login. Table layout with inline styles so it renders the same in
// Gmail, Outlook and phone mail apps. The greeting is "Hi Folks" because the
// account has no real name yet at that point.
//
// Kept free of "@/..." imports so Node can load it directly in tests.

export type WelcomeEmail = { to: string; subject: string; html: string; text: string };

export function buildWelcomeEmail(to: string, siteUrl: string): WelcomeEmail {
  const site = siteUrl.replace(/\/$/, "");
  const subject = "Welcome to FlatFolks 🏠";
  const intro = "Whether you're looking for a room, searching for a flatmate, or sharing a space with others, FlatFolks makes it easier to connect with people and find the right fit — without brokerage.";
  const steps = [
    { icon: "🔍", title: "Looking for a room or flatmate?", body: "Explore available rooms, flats and flatmates across Delhi, Noida, Greater Noida, Gurgaon and Ghaziabad.", label: "Find a Room", href: `${site}/search`, color: "#2563eb" },
    { icon: "🏠", title: "Have a room to share?", body: "Post your listing for free and connect with people looking for a place to stay.", label: "List Your Room for Free", href: `${site}/property?intent=flatmate`, color: "#15803d" },
    { icon: "👤", title: "Make your profile yours", body: "Complete your profile to help others get to know you better.", label: "Complete My Profile", href: `${site}/profile`, color: "#2563eb" },
  ];
  const closing = "We're glad to have you in the FlatFolks community. Here's to finding the right place and the right people! 💙";
  const footnote = "You're getting this email because you just created a FlatFolks account with this email address. If this wasn't you, you can ignore this email.";

  const font = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;";
  const stepRows = steps.map((step) => `
          <tr><td style="padding:0 32px 18px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;">
              <tr><td style="padding:18px 20px;${font}">
                <p style="margin:0;font-size:16px;font-weight:700;color:#0f172a;">${step.icon}&nbsp; ${step.title}</p>
                <p style="margin:6px 0 14px;font-size:14px;line-height:21px;color:#475569;">${step.body}</p>
                <a href="${step.href}" style="display:inline-block;background:${step.color};color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:11px 20px;border-radius:999px;">👉 ${step.label}</a>
              </td></tr>
            </table>
          </td></tr>`).join("");

  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;">
    <tr><td align="center" style="padding:28px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;">
        <tr><td style="padding:28px 32px 8px;${font}">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="width:44px;height:44px;background:#4f46e5;background-image:linear-gradient(135deg,#2563eb,#7c3aed);border-radius:12px;text-align:center;font-size:22px;line-height:44px;">🏠</td>
            <td style="padding-left:12px;font-size:24px;font-weight:800;color:#111a3a;letter-spacing:-0.5px;">Flat<span style="color:#2563eb;">Folks</span></td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:20px 32px 4px;${font}">
          <p style="margin:0;font-size:20px;font-weight:700;color:#0f172a;">Hi Folks,</p>
          <p style="margin:12px 0 0;font-size:15px;line-height:23px;color:#334155;">Welcome to <b style="color:#0f172a;">FlatFolks!</b> 🏠 Your account is ready, and we're excited to help you find a place to call home.</p>
          <p style="margin:12px 0 0;font-size:15px;line-height:23px;color:#334155;">${intro}</p>
          <p style="margin:22px 0 12px;font-size:15px;font-weight:700;color:#0f172a;">Here's how you can get started:</p>
        </td></tr>${stepRows}
        <tr><td style="padding:4px 32px 28px;${font}">
          <p style="margin:0;font-size:15px;line-height:23px;color:#334155;">${closing}</p>
          <p style="margin:14px 0 0;font-size:15px;line-height:23px;color:#334155;">Happy house hunting!<br><b style="color:#0f172a;">Team FlatFolks</b><br><a href="${site}/" style="color:#2563eb;">${site}/</a></p>
        </td></tr>
      </table>
      <p style="max-width:520px;margin:16px auto 0;${font}font-size:12px;line-height:18px;color:#64748b;text-align:center;">${footnote}</p>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    "Hi Folks,",
    "",
    "Welcome to FlatFolks! 🏠 Your account is ready, and we're excited to help you find a place to call home.",
    "",
    intro,
    "",
    "Here's how you can get started:",
    "",
    ...steps.flatMap((step) => [`${step.icon} ${step.title}`, step.body, `👉 ${step.label}: ${step.href}`, ""]),
    closing,
    "",
    "Happy house hunting!",
    "",
    "Team FlatFolks",
    `${site}/`,
    "",
    footnote,
  ].join("\n");

  return { to, subject, html, text };
}
