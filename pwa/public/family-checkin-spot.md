# FamilyBubble — Family Bubble Check-In (15s)

A 15-second 1920×1080 spot: the family walks into a venue, checks everyone in together, and gets back to the fun.

File: `familybubble-family-checkin-spot.mp4`

## Cut

| Time | Shot | On-screen | VO |
| --- | --- | --- | --- |
| 0:00–0:03 | Family walking toward the venue. Parent has a phone; home screen shows **Family Bubble Check-In**. | Checking in with the whole family? | “Checking in with the whole family?” |
| 0:03–0:06 | Close-up: parent opens the app and taps Family Bubble Check-In. Phone ~40–50% of frame. | One check-in. Everyone included. | “Make it simple.” |
| 0:06–0:10 | Full-screen: select family members, then cut back to the family. | Select your family → Check in | “Select your family and check everyone in together.” |
| 0:10–0:13 | Kids run ahead through the entrance. Subtle logo badge. | Less time checking in. More time together. | “Less time checking in. More time together.” |
| 0:13–0:15 | End card: family hero left, app UI right. | FAMILY BUBBLE CHECK-IN / One family. One simple check-in. | “Family Bubble Check-In.” |

## Title
FamilyBubble — Family Bubble Check-In

## Description
Checking in with the whole family?

One check-in. Everyone included.

Select your family and check everyone in together.

Less time checking in. More time together.

Family Bubble Check-In.

Get started: https://familybubble.online

#FamilyBubble #FamilyCheckIn #CheckIn #FamilyTime

## Voiceover

Checking in with the whole family?
Make it simple.
Select your family and check everyone in together.
Less time checking in. More time together.
Family Bubble Check-In.

## Rebuild

App UI is recorded from `family-checkin-ad-app.html` (home card → select family → check in).

```bash
# Record the app plate (Xvfb + Chrome)
bash pwa/scripts/record-family-checkin-ad.sh

# Voiceover (edge-tts) — write vo1.wav … vo5.wav into /tmp/famcheck
# then:
bash pwa/scripts/assemble-family-checkin-spot.sh pwa/public/familybubble-family-checkin-spot.mp4
```

Stills live in `pwa/public/ad-assets/family-checkin/`.
