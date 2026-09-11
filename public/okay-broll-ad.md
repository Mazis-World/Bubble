# FamilyBubble — When they're okay, you're okay.

A ~34s 1920×1080 spot in the spirit of Life360’s Elevator ad: dark-comedy household disaster, a basic FamilyBubble **Check in**, then unearned calm.

File: `familybubble-okay-broll-ad.mp4`

## Cut

| Time | Shot |
| --- | --- |
| 0:00 | Dad is still under the collapsed wardrobe. |
| 0:04 | Kid walking up to the front door. |
| 0:07 | Close-up tap on a phone. |
| 0:09 | FamilyBubble Map: Check in → Checking in… → Liam pin + memo. |
| 0:21 | Lock screen: `📍 Liam checked in at Home` / `They're okay.` |
| 0:25 | Same wreckage. Everyone is fine now. `He also fed the dog.` |
| 0:28 | Victory dance in the kitchen. |
| 0:31 | End card — When they're okay, you're okay. FamilyBubble · familybubble.online |

## Title
FamilyBubble — When they're okay, you're okay.

## Description
The wardrobe fell. Nobody moved.

Then Liam checked in at Home.

They're okay.

FamilyBubble Check in is one tap on the family map. Your bubble sees it. You can go back to whatever disaster you were in.

Get started: https://familybubble.online

#FamilyBubble #CheckIn #FamilySafety #WhenTheyreOkay

## Voiceover (optional)

The shelf can wait.
Liam just checked in at Home.
They're okay.
He also fed the dog.
FamilyBubble.

## Footage credits (Mixkit Free License)

Commercial-use B-roll. Do not re-upload the raw Mixkit files as your own stock.

- Arriving home after school: https://mixkit.co/free-stock-video/mother-coming-home-after-picking-up-her-daughter-from-school-8729/
- Close-up tap on a phone: https://mixkit.co/free-stock-video/close-up-of-a-woman-texting-quickly-51126/
- Coming through the door: https://mixkit.co/free-stock-video/mother-and-daughter-coming-home-8733/
- Man dancing in a retro kitchen: https://mixkit.co/free-stock-video/man-dancing-in-a-retro-kitchen-41323/

App UI is recorded from `okay-ad-app.html` (mobile Map + Check in). Notification plate is `okay-lock.html`.

## Rebuild

```bash
# Mixkit 720p clips in /tmp/okay as arrive-home.mp4, tap-phone.mp4, come-home.mp4, dance-kitchen.mp4
bash pwa/scripts/record-okay-ad.sh
bash pwa/scripts/assemble-okay-broll-ad.sh pwa/public/familybubble-okay-broll-ad.mp4
```
