# FamilyBubble Check-in B-roll advert

A ~29s 1920×1080 advert for **Check in**, shown as it works in the mobile app.

File: `familybubble-checkin-broll-ad.mp4`

No on-screen script captions. The phone UI and Check in popup carry the story.

## Cut

| Time | Shot |
| --- | --- |
| 0:00–0:08 | Walking up to the front door after school → close-up tap on a phone |
| 0:08–0:21 | Mobile Map: Check in chip → popup overlay (Checking in…) → Ada pin + Checked in memo |
| 0:21–0:25 | Kid running in the door, parent behind |
| 0:25–0:29 | End card — FamilyBubble · familybubble.online |

## Title
FamilyBubble Check in — One tap. You’re on the map.

## Description
Just got home. One tap to check in.

FamilyBubble Check in drops your live pin on the family globe and posts a memo to the bubble.

Get started: https://familybubble.online

#FamilyBubble #CheckIn #FamilySafety #StayConnected

## Footage credits (Mixkit Free License)

- Arriving home after school: https://mixkit.co/free-stock-video/mother-coming-home-after-picking-up-her-daughter-from-school-8729/
- Close-up tap on a phone: https://mixkit.co/free-stock-video/close-up-of-a-woman-texting-quickly-51126/
- Coming through the door: https://mixkit.co/free-stock-video/mother-and-daughter-coming-home-8733/

App UI is recorded from `checkin-ad-app.html` (mobile Map view + Check in popup).

## Rebuild

```bash
bash pwa/scripts/record-checkin-ad-app.sh /tmp/checkin/app-checkin.mp4
bash pwa/scripts/assemble-checkin-broll-ad.sh pwa/public/familybubble-checkin-broll-ad.mp4
```
