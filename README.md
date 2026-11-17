# আয়নাঘর (AynaGhor)

রাতের মিরপুর ১০-এ একটি first-person browser thriller। Three.js দিয়ে বানানো, কোনো build step নেই।

**খেলুন:** https://danial-hossain.github.io/AynaGhor/

## অবস্থা
- [x] Step 0: মিরপুর ১০-এর map, রাতের রাস্তা, হাঁটা ও collision
- [ ] Step 1: Act 1 (ঘর থেকে পালানো)
- [ ] Step 2: Intro
- [ ] Step 3: Act 2 (বাড়ি, stealth)
- [ ] Step 4: Act 3 (মিরপুরের রাত)
- [ ] Step 5: ৫টি ending, sound, save

## Local-এ চালানো
```
python3 -m http.server 8000     # তারপর http://localhost:8000
python3 tools/build_map.py      # map আবার বানাতে (assets/mirpur.glb, assets/mirpur.json)
node tools/test_step0.mjs       # headless test (Playwright লাগে)
```

## Credits
- Map data © OpenStreetMap contributors (ODbL). Building-এর উচ্চতা বেশিরভাগ আন্দাজ করা।
- Three.js r160 (MIT), Hind Siliguri font (SIL OFL), দুটোই repo-তে vendor করা।
- সব sound Web Audio API দিয়ে তৈরি।
