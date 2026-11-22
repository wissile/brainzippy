import { PageHead, Section } from "../components";
import { SITE } from "../entity";

/**
 * /privacy: the early-access privacy notice (prerendered). It describes exactly what this build does, from its feature
 * flags (SITE.features, src/site/flags.ts), so it never describes a feature that is switched off. Production is
 * guest-only (D-030): no accounts, no email collection, no payments, no reminders. Facts checked against the code:
 *  - device: localStorage "bz.v1" (profile incl. optional first name, monster, monster name, age band, progress),
 *    "bz.features" (which features are on), cached game files; "Delete all progress" (src/app/screens.tsx) clears the
 *    profile and progress, the reminder device id and the service worker's prefs cache;
 *  - Worker: guest-only production writes nothing to D1 (tests/unit/launch-flags.test.ts), invocation logs are off
 *    (wrangler.jsonc), error lines carry no IP address; Workers Logs keeps them up to 3 days on Workers Free and
 *    7 on Paid (https://developers.cloudflare.com/workers/observability/logs/workers-logs/).
 * Update this page (and docs/legal/PRIVACY_POLICY_DRAFT.md) whenever any of that changes.
 */
export const PRIVACY_UPDATED = "2026-11-22";
/** True when the build has no accounts, payments or friends: the notice then says "guest play only". */
export const privacyGuestOnly = () => !SITE.features.accounts && !SITE.features.billing && !SITE.features.friends;
export const privacyDescription = () =>
  privacyGuestOnly()
    ? "What BrainZippy does with information in early access: guest play only, no accounts or email, no ads or trackers, and progress stays on your device."
    : "What BrainZippy does with information in early access: progress stays on your device, no ads or trackers, plus features still being tested.";
export const PRIVACY_LABEL = "Early-access privacy notice. A full policy will be published before accounts or payments are switched on.";

export function PrivacyPage() {
  const f = SITE.features;
  const testing = [f.accounts && "grown-up accounts", f.billing && "payments", f.friends && "friends and challenges"].filter((x): x is string => typeof x === "string");
  const mail = <a href={`mailto:${SITE.email}`}>{SITE.email}</a>;
  return (
    <>
      <PageHead title="Privacy notice" lead="What BrainZippy does with information while it is in early access, in plain words." art="hoot" />
      <Section title="Early access">
        <p className="notice" data-testid="privacy-label"><strong>{PRIVACY_LABEL}</strong></p>
        <p>Last updated {PRIVACY_UPDATED}. {privacyGuestOnly() ? "This notice covers brainzippy.com as it works today: guest play only." : "This notice covers guest play."}</p>
      </Section>
      <Section title="The short version" className="tinted">
        <ul data-testid="privacy-short">
          {!f.accounts && <li><strong>No accounts and no email.</strong> Nobody signs up, and the games never ask for an email address.</li>}
          {!f.billing && <li><strong>No payments.</strong> Every game is free while we're in early access; there is nothing to buy.</li>}
          <li><strong>No ads and no trackers.</strong> We don't show ads, and there are no analytics or third-party tracking scripts.</li>
          <li><strong>No chat.</strong> Children can't contact anyone, and nobody can contact them.</li>
          <li><strong>We never ask for photos or location.</strong></li>
        </ul>
      </Section>
      <Section title="What stays on your device">
        <p>Your child's progress, their monster, the monster's name and their first name (if you typed one) are saved <strong>in this browser on this device</strong>. They are not sent to us.</p>
        <p>The browser also keeps copies of game files so the games can work offline, and a note of which optional features are switched on. Neither contains anything about your child.</p>
        <p>
          <strong>Delete all progress</strong> on the <a href="/grown-ups">grown-ups page</a> removes the progress, the monster and the names from this device
          {f.push ? ", and turns off and forgets any daily reminder" : ""}. Clearing this site's data in your browser settings removes everything, including the offline game files.
        </p>
      </Section>
      <Section title="What reaches our server" className="tinted">
        <p>Cloudflare hosts BrainZippy. When you open the site, your browser's requests go through Cloudflare's network, which handles technical information such as your IP address to deliver the pages and protect the site from attacks, as described in Cloudflare's own privacy policy.</p>
        <p>
          Our own server code stores nothing about guest players. It keeps no record of visits: automatic request logging is switched off.
          If something goes wrong, it may write a short error note (what failed, without your IP address), which Cloudflare deletes within a week.
        </p>
      </Section>
      {f.push && (
        <Section title="Daily reminders (optional)">
          <p>A grown-up can choose to get one notification a day on this device. Only then, we store a random device number, the address your browser gives us for sending notifications, the hour you picked and your time zone. No names.</p>
          <p>The monster's name used in the notification text stays on this device. Turning reminders off, or deleting all progress, removes the reminder from our server; one that hasn't been refreshed for 180 days is deleted automatically.</p>
        </Section>
      )}
      {testing.length > 0 && (
        <Section title="Features being tested here">
          <p data-testid="privacy-testing">This copy of BrainZippy has {testing.join(", ")} switched on for testing. This notice doesn't cover them yet, so please don't enter real personal information here.</p>
        </Section>
      )}
      <Section title="Emailing us" className={f.push ? "tinted" : ""}>
        <p>You can write to us at {mail}. We use your email address and message only to reply to you.</p>
        <p data-testid="privacy-child-email"><strong>If a child emails us,</strong> we reply to a grown-up, not to the child, and we delete the child's message.</p>
      </Section>
      <Section title="Questions" className={f.push ? "" : "tinted"}>
        <p>Questions about privacy, or anything else: {mail}.</p>
      </Section>
    </>
  );
}
