# Notification QA Matrix

Use this matrix to validate push notifications, fallbacks, and in-app attention across supported platforms.

| Scenario | Browser / App | OS | Steps | Expected |
| --- | --- | --- | --- | --- |
| Push interrupt alert | Chrome 122 | macOS 14 | Start a timer, let interrupt fire, keep tab unfocused | Notification arrives with Stop/Snooze/Switch buttons; clicking Stop stops timer |
| Push interrupt alert | Edge 122 | Windows 11 | Repeat scenario above | Notification delivered; buttons post message to app |
| Push interrupt alert | Safari 17 (PWA) | macOS 14 | Install PWA, start timer, allow interrupt | Push delivered; clicking Switch prompts project switch |
| Push budget warning | Chrome 122 | macOS 14 | Configure low budget, exceed threshold | Notification copy mentions project & remaining budget |
| Push overrun | Android Chrome | Android 14 | Start timer, allow overrun | Notification arrives with Stop/Snooze |
| Pomodoro break reminder | Chrome 122 | macOS 14 | Enable Pomodoro in Settings, run timer | Break reminder arrives at configured interval |
| Email fallback | Chrome 122 | macOS 14 | Disable push, enable email fallback, trigger interrupt | Email delivered with deep link |
| SMS fallback | Chrome 122 | macOS 14 | Disable push, enable SMS fallback | SMS delivered with timer link |
| Slack fallback | Chrome 122 | macOS 14 | Enable webhook fallback | Slack message posted with buttons |
| Quiet hours | Chrome 122 | macOS 14 | Enable quiet hours spanning current time | No push sent; fallback skipped |
| Do Not Disturb | Chrome 122 | macOS 14 in Focus mode | Trigger interrupt while DND enabled | No push/fallback until DND off |
| iOS PWA limitation | Safari 17 | iOS 17 PWA | Attempt to enable push | Document limitation, ensure UI copy explains |
| Escalation delay | Chrome 122 | macOS 14 | Enable fallback and set 1 minute delay | Fallback triggers after delay if timer unacknowledged |

Document results in the project wiki after each release.
