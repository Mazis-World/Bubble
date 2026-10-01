# FamilyBubble SOS B-roll advert

A ~28s 1920×1080 advert: real-life Mixkit B-roll, then the FamilyBubble SOS flow, then family seeing the phone.

File: `familybubble-sos-broll-ad.mp4`

## Cut

| Time | Shot | Line |
| --- | --- | --- |
| 0:00–0:08 | Night city walk → person on their phone | When something feels wrong… / You shouldn’t have to wait. |
| 0:08–0:18 | App plates | Hold SOS 3 seconds → Sending countdown → family SOS ALERT |
| 0:18–0:23 | Family on the sofa with a phone | Your family sees it. Instantly. |
| 0:23–0:28 | End card on the SOS ALERT screen | FamilyBubble · familybubble.online |

## Title
FamilyBubble SOS — Hold 3 seconds. Your family is notified.

## Description
When something feels wrong, you shouldn’t have to wait.

FamilyBubble SOS is a 3-second hold — not a casual tap. Your bubble sees the alert with live location.

Get started: https://familybubble.online

0:00 When something feels wrong
0:08 Hold SOS for 3 seconds
0:18 Your family sees it
0:23 familybubble.online

#FamilyBubble #SOS #FamilySafety #StayConnected

## Voiceover (optional, ~28s)

When something feels wrong — you shouldn’t have to wait.
Hold SOS for three seconds.
Your family is alerted — with your live location.
They see it. Instantly.
FamilyBubble. familybubble.online

## Footage credits (Mixkit Free License)

Commercial-use B-roll. Do not re-upload the raw Mixkit files as your own stock.

- Night walk: https://mixkit.co/free-stock-video/night-walk-through-the-streets-of-a-big-city-40640/
- Woman walking with phone: https://mixkit.co/free-stock-video/woman-walking-down-the-street-watching-her-cell-phone-4891/
- Family on smartphone: https://mixkit.co/free-stock-video/family-making-a-video-call-on-smartphone-4523/

App UI is recorded from `sos-ad-app.html` (FamilyBubble SOS hold → countdown → family alert).

## Rebuild

```bash
# 1) Download Mixkit 720p clips into /tmp/broll as night-walk.mp4, walk-phone.mp4, family-call.mp4
# 2) Record app plates
bash pwa/scripts/record-sos-ad-app.sh /tmp/broll/app-sos.mp4
# 3) Assemble
bash pwa/scripts/assemble-sos-broll-ad.sh pwa/public/familybubble-sos-broll-ad.mp4
```
