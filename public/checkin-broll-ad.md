# FamilyBubble Check-in B-roll advert

A ~28s 1920×1080 advert for **Check in**: real-life Mixkit B-roll, then the FamilyBubble map chip, then home.

File: `familybubble-checkin-broll-ad.mp4`

## Cut

| Time | Shot | Line |
| --- | --- | --- |
| 0:00–0:08 | Walking up to the front door after school → close-up tap on a phone | Just got home. / One tap to check in. |
| 0:08–0:18 | App plates | Check in → Checking in… → Checked in + pin + memo |
| 0:18–0:23 | Kid running in the door, parent behind | Your family knows you’re safe. |
| 0:23–0:28 | End card | FamilyBubble · familybubble.online |

## Title
FamilyBubble Check in — One tap. You’re on the map.

## Description
Just got home. One tap to check in.

FamilyBubble Check in drops your live pin on the family map and posts a memo to the bubble.

Get started: https://familybubble.online

0:00 Just got home
0:08 One tap to check in
0:18 Your family knows you’re safe
0:23 familybubble.online

#FamilyBubble #CheckIn #FamilySafety #StayConnected

## Voiceover (optional, ~28s)

Just got home.
One tap to check in.
Your pin drops on the family map.
They know you’re safe.
FamilyBubble. familybubble.online

## Footage credits (Mixkit Free License)

- Arriving home after school: https://mixkit.co/free-stock-video/mother-coming-home-after-picking-up-her-daughter-from-school-8729/
- Close-up tap on a phone: https://mixkit.co/free-stock-video/close-up-of-a-woman-texting-quickly-51126/
- Coming through the door: https://mixkit.co/free-stock-video/mother-and-daughter-coming-home-8733/

App UI is recorded from `checkin-ad-app.html`.

## Rebuild

```bash
# 1) Download Mixkit 720p clips into /tmp/checkin as arrive-home.mp4, tap-phone.mp4, come-home.mp4
# 2) Record app plates
bash pwa/scripts/record-checkin-ad-app.sh /tmp/checkin/app-checkin.mp4
# 3) Assemble
bash pwa/scripts/assemble-checkin-broll-ad.sh pwa/public/familybubble-checkin-broll-ad.mp4
```
