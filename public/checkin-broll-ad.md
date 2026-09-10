# FamilyBubble Check-in B-roll advert

A ~28s 1920×1080 advert for **Check in**: real-life Mixkit B-roll, then the FamilyBubble **globe Map view** with a Check in overlay, then home.

File: `familybubble-checkin-broll-ad.mp4`

No on-screen script captions. The app UI and overlay carry the story; the end card is the only title.

## Cut

| Time | Shot |
| --- | --- |
| 0:00–0:08 | Walking up to the front door after school → close-up tap on a phone |
| 0:08–0:20 | Globe Map view: Check in chip → overlay “Checking in…” → Ada pin + Checked in memo |
| 0:20–0:24 | Kid running in the door, parent behind |
| 0:24–0:28 | End card — FamilyBubble · familybubble.online |

## Title
FamilyBubble Check in — One tap. You’re on the map.

## Description
Just got home. One tap to check in.

FamilyBubble Check in drops your live pin on the family globe and posts a memo to the bubble.

Get started: https://familybubble.online

#FamilyBubble #CheckIn #FamilySafety #StayConnected

## Voiceover (optional, ~28s)

Just got home.
One tap to check in.
Your pin drops on the family globe.
They know you’re safe.
FamilyBubble. familybubble.online

## Footage credits (Mixkit Free License)

- Arriving home after school: https://mixkit.co/free-stock-video/mother-coming-home-after-picking-up-her-daughter-from-school-8729/
- Close-up tap on a phone: https://mixkit.co/free-stock-video/close-up-of-a-woman-texting-quickly-51126/
- Coming through the door: https://mixkit.co/free-stock-video/mother-and-daughter-coming-home-8733/

App UI is recorded from `checkin-ad-app.html` (globe Map view + Check in overlay).

## Rebuild

```bash
# 1) Download Mixkit 720p clips into /tmp/checkin as arrive-home.mp4, tap-phone.mp4, come-home.mp4
# 2) Record app plates (needs Chrome + Xvfb; serves pwa/public over localhost)
bash pwa/scripts/record-checkin-ad-app.sh /tmp/checkin/app-checkin.mp4
# 3) Assemble (no bottom captions)
bash pwa/scripts/assemble-checkin-broll-ad.sh pwa/public/familybubble-checkin-broll-ad.mp4
```
