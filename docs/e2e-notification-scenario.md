# E2E Notification Scenario

This end-to-end scenario verifies that push delivery, service worker actions, and fallback escalation operate together.

1. **Prepare**
   - Set `VAPID_*` keys locally and in Convex deployment.
   - Configure fallback credentials (SendGrid/Twilio/Slack) with test accounts.
   - Build the app (`npm run build`) and start locally with `npm run dev`.

2. **Enable push**
   - Sign in, start a timer, accept the contextual notification prompt.
   - Confirm the service worker is registered with the current version (`Application → Service Workers`).

3. **Trigger interrupt push**
   - Allow the timer to idle until the interrupt fires.
   - Accept the push notification on desktop; ensure `stop`, `snooze`, `switch` actions post messages back to the app.

4. **Verify deep linking**
   - From a cold browser state, click the notification title. The app should open to `/modern?alert=interrupt` and display the interrupt modal.

5. **Check fallback escalation**
   - Disable push (toggle off in Settings) but keep email/SMS/Slack enabled.
   - Trigger another interrupt. Confirm fallback channels receive alerts within the configured delay and include deep links.

6. **Pomodoro workflow**
   - Enable Pomodoro and start a focus session. Wait for the break reminder push and ensure acknowledging switches the app state.

7. **Budget warning**
   - Start a project near its budget threshold, run timer past warning, confirm push + fallback.

8. **Quiet hours & DND**
   - Enable quiet hours covering the current time. Ensure neither push nor fallback send.
   - Disable quiet hours, enable OS Do Not Disturb, repeat to confirm suppression.

9. **Service worker update**
   - Bump `package.json` version, rebuild, reload app. Confirm the worker re-registers with the new query parameter and old worker goes redundant.

Record results (pass/fail, screenshots, logs) alongside the QA matrix for release sign-off.
