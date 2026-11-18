import { esc } from "./http";

/**
 * Plain, accessible email templates: real text (no images), high contrast, one column, lang + dir set,
 * and a text/plain twin for every message. Children never receive email; every message is addressed to a parent.
 */
export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const shell = (title: string, inner: string) => `<!doctype html>
<html lang="en" dir="ltr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;padding:24px 16px;background:#fffdf6;color:#2b2140;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5">
<div style="max-width:560px;margin:0 auto">
<p style="font-size:22px;font-weight:bold;margin:0 0 16px">BrainZippy</p>
${inner}
<hr style="border:0;border-top:1px solid #d8d2e6;margin:28px 0 12px">
<p style="font-size:13px;color:#5a5070;margin:0">BrainZippy · learning games for children. This email was sent to a parent or guardian account.</p>
</div></body></html>`;

const button = (href: string, label: string) =>
  `<p style="margin:24px 0"><a href="${esc(href)}" style="display:inline-block;background:#2468c4;color:#ffffff;font-weight:bold;text-decoration:none;padding:12px 24px;border-radius:999px">${esc(label)}</a></p>
<p style="font-size:14px;color:#5a5070">If the button does not work, copy this link into your browser:<br><span style="word-break:break-all">${esc(href)}</span></p>`;

export function magicLinkEmail(link: string, isNewAccount: boolean): RenderedEmail {
  const subject = isNewAccount ? "Confirm your BrainZippy parent account" : "Your BrainZippy sign-in link";
  const lead = isNewAccount ? "Thanks for creating a BrainZippy parent account. Confirm your email to finish." : "Here is your sign-in link for the BrainZippy parent area.";
  const html = shell(
    subject,
    `<h1 style="font-size:20px;margin:0 0 8px">${esc(subject)}</h1>
<p>${esc(lead)}</p>
${button(link, isNewAccount ? "Confirm and sign in" : "Sign in")}
<p>The link works once and expires in 15 minutes. If you did not ask for it, you can ignore this email.</p>`,
  );
  const text = `${subject}\n\n${lead}\n\nOpen this link (works once, expires in 15 minutes):\n${link}\n\nIf you did not ask for it, you can ignore this email.\n\nBrainZippy`;
  return { subject, html, text };
}

export interface DigestChild {
  label: string; // monster name, or nickname if the parent opted in
  games: { world: string; level: number; stars: number }[];
  skills: string[];
  streak: number;
  suggestion: string;
}

export function digestEmail(children: DigestChild[], dashboardUrl: string, unsubscribeUrl: string): RenderedEmail {
  const total = children.reduce((n, c) => n + c.games.length, 0);
  const subject = `Today on BrainZippy: ${total} game${total === 1 ? "" : "s"} played`;
  const sections = children
    .map((c) => {
      const games = c.games.map((g) => `<li>${esc(g.world)}: level ${g.level + 1}, ${g.stars} of 3 stars</li>`).join("");
      const skills = c.skills.length ? `<p style="margin:8px 0"><strong>Skills practised:</strong> ${esc(c.skills.join(", "))}</p>` : "";
      return `<h2 style="font-size:18px;margin:24px 0 4px">${esc(c.label)}</h2>
<ul style="padding-left:20px;margin:4px 0">${games}</ul>
${skills}
<p style="margin:8px 0"><strong>Streak:</strong> ${c.streak} day${c.streak === 1 ? "" : "s"} in a row</p>
<p style="margin:8px 0"><strong>Try next:</strong> ${esc(c.suggestion)}</p>`;
    })
    .join("");
  const html = shell(
    subject,
    `<h1 style="font-size:20px;margin:0 0 8px">${esc(subject)}</h1>
<p>Here is a short summary of today's play. Mistakes are part of learning, so we only show what was practised.</p>
${sections}
${button(dashboardUrl, "Open the parent dashboard")}
<p style="font-size:14px"><a href="${esc(unsubscribeUrl)}" style="color:#2b2140">Unsubscribe from daily summaries</a> (one click, no sign-in needed).</p>`,
  );
  const textSections = children
    .map(
      (c) =>
        `${c.label}\n${c.games.map((g) => `- ${g.world}: level ${g.level + 1}, ${g.stars} of 3 stars`).join("\n")}\n` +
        (c.skills.length ? `Skills practised: ${c.skills.join(", ")}\n` : "") +
        `Streak: ${c.streak} day${c.streak === 1 ? "" : "s"} in a row\nTry next: ${c.suggestion}\n`,
    )
    .join("\n");
  const text = `${subject}\n\n${textSections}\nParent dashboard: ${dashboardUrl}\n\nUnsubscribe from daily summaries: ${unsubscribeUrl}\n\nBrainZippy`;
  return { subject, html, text };
}
