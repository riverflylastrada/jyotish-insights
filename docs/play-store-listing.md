# Google Play Store listing — Acharya Jyotish

Copy-paste source for the Play Console listing + a checklist. App package:
`com.acharyajyotish.app`. Category: **Lifestyle**.

---

## App name (max 30 chars)
Pick one:
- `Acharya Jyotish` (15)
- `Acharya Jyotish: Kundli & AI` (28)
- `Acharya Jyotish — Vedic Astro` (29)

## Short description (max 80 chars)
`Free Kundli, AI astrology readings, Panchang & daily Vedic guidance.` (67)

## Full description (max 4000 chars)
```
Acharya Jyotish brings authentic Vedic astrology (Jyotish) to your phone — a free, accurate Kundli (birth chart) and AI-powered readings rooted in the classical texts.

Generate your free Kundli in seconds from your date, time, and place of birth, then explore your chart in depth — the way a real astrologer would.

WHAT YOU GET
• Free, accurate Kundli — precise sidereal calculations with your Lagna (ascendant), planets, houses, nakshatra, and divisional charts (Navamsa D9, Dasamsa D10, and more).
• Eight Gurus, one verdict — ask a question and eight classical schools of astrology (Parashari, Jaimini, KP, Phaladeepika, Saravali and more) reason through your chart, synthesised by a Master Acharya.
• Vimshottari Dasha — your personalised planetary timeline showing when events ripen.
• Yogas & Doshas — auspicious combinations and challenges, with their strengths and cancellations — read honestly, never with fear.
• Today's Panchang — daily tithi, nakshatra, yoga, karana, Rahu Kaal, sunrise and sunset for your location.
• Transits, Sade Sati, Ashtakavarga, remedies, compatibility (Guna Milan), Prashna (horary), and more.

WHY ACHARYA JYOTISH
• Accuracy first — astronomical, sidereal calculations, not generic sun-sign horoscopes.
• Classical reasoning shown — see the rule behind every reading, so you learn why it holds.
• Anti-fear — a calm, educational approach to doshas and remedies.

Whether you're new to Jyotish or a serious student, Acharya Jyotish is your pocket astrologer. Generate your free chart today.

Acharya Jyotish is for guidance and education and is not a substitute for professional advice.
```

## Graphics needed (you must create these)
- **App icon:** 512×512 PNG (32-bit, with alpha). Use the brand mark.
- **Feature graphic:** 1024×500 PNG/JPG (no transparency). Shown at top of listing.
- **Phone screenshots:** 2–8, PNG/JPG, 16:9 or 9:16, min 320px side. Capture: chart view, a guru reading, Panchang, dashas.
- (Optional) 7-inch & 10-inch tablet screenshots.

## Contact details
- **Email:** a monitored inbox (set one on acharyajyotish.com, or use your Gmail for now).
- **Website:** https://acharyajyotish.com
- **Privacy policy:** https://acharyajyotish.com/privacy

---

## Console checklist (Dashboard → "Set up your app")
1. **App access** — the app needs login → provide Google a **test account** (email + password) under App access → "All or some functionality is restricted".
2. **Ads** — declare whether the app shows ads (currently No).
3. **Content rating** — complete the questionnaire (Reference/Lifestyle; no objectionable content → likely "Everyone/PEGI 3").
4. **Target audience** — 18+ (or 13+); not designed for children.
5. **Data safety** — declare data collected & shared:
   - Personal info: **Email address** (account; required).
   - "Other info": **date/time/place of birth** (app functionality; required) — declare as collected, encrypted in transit, user can request deletion.
   - App activity: **in-app interactions** (questions/usage) for app functionality.
   - Mark: data encrypted in transit; users can request deletion (email contact).
   - **Not sold** to third parties.
6. **Government apps / Financial features / Health** — No.
7. **Store settings** — category **Lifestyle**, tags (astrology, kundli, horoscope, panchang).
8. **Privacy policy** — paste https://acharyajyotish.com/privacy.

## Release
- Build the signed `.aab` via the **Android Release (AAB)** GitHub Action (Actions → Run workflow).
- Start on the **Internal testing** track → add your email as a tester → install & verify.
- Then promote to **Production** (Organisation accounts are generally exempt from the 20-tester/14-day closed-testing requirement).
- Complete **Android developer verification** (sidebar) early — org accounts may need a D-U-N-S number and it can take days.

## App signing
- Use **Play App Signing** (default, recommended): Google holds the app signing key; the keystore you create is your **upload key**. Keep it backed up — it's how you authenticate future updates.
