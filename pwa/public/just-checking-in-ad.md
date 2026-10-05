# FamilyBubble — Just Checking In

A ~59s 1920×1080 cinematic spot about distance, connection, and peace of mind.

File: `familybubble-just-checking-in.mp4`

## Title
FamilyBubble — Just Checking In | Stay connected to the people who matter

## Description
Family life gets busy. Sometimes you just want to know they're okay.

FamilyBubble is a private family space: check in on the people you love, see that Grandma is home, and get back to living your life.

Get started: https://familybubble.online

#FamilyBubble #JustCheckingIn #FamilyApp #StayConnected

## Voiceover

Warm, unhurried.

Family life gets busy.

Sometimes days go by… Sometimes weeks. And you realize you haven't really checked in with someone you love.

Not because something's wrong. You just want to know they're okay.

FamilyBubble isn't about constantly checking where everyone is. It's about those little moments when you just want to know.

Because sometimes… checking in is just another way of saying… I'm thinking about you.

FamilyBubble. Stay connected, wherever life takes you.

## Rebuild

```bash
# Mixkit clips + music expected in /tmp/jci (see assemble script)
bash pwa/scripts/record-just-checking-in-app.sh /tmp/jci/app-ui.mp4
bash pwa/scripts/assemble-just-checking-in-ad.sh pwa/public/familybubble-just-checking-in.mp4
```

App plates are recorded from `just-checking-in-ad.html`.
The dinner overlay is a cropped phone-UI fragment of the Grandma Home check-in
(`just-checking-in-overlay.html` / `just-checking-in-overlay.png`), captured with:

```bash
bash pwa/scripts/capture-just-checking-in-overlay.sh
```

Each Mixkit clip is used once. Do not reuse footage from earlier FamilyBubble ads
(check-in 8729 / 8733 / 51126, SOS 40640 / 4891 / 4523, okay 41323).

## Footage credits (Mixkit Stock Video Free License)

- Morning coffee of a young woman — 49916
- Woman leaving her house — 27591
- Children getting off a yellow school bus — 35960
- Morning journey to work — 22185
- Woman works on a laptop — 252
- Woman working on her laptop in coffee shop — 43246
- Mother helps her daughter study — 4790
- Children's soccer team warming up — 35981
- Elderly woman having a cup of tea — 48159
- Woman at night lying down using her cell phone — 43381
- Woman holding her phone in the car — 22544
- Elderly woman texts on mobile phone and smiles — 9143
- Father and son on a sofa playing with legos — 36161
- Two teenagers laughing at the camera — 16277
- Grandmother and child using a tablet — 22603
- Mother with her happy daughters — 4549
- Mother and her children at a dinner with grandparents — 36091
- A woman arrives to family dinner in the backyard — 23847

Music: “Thinking About You” by Arulo (Mixkit License)
