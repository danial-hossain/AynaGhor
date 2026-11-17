# আয়নাঘর (AynaGhor)

রাতের মিরপুর ১০-এ একটি first-person browser thriller। Three.js দিয়ে বানানো, কোনো build step নেই।

**খেলুন:** https://danial-hossain.github.io/AynaGhor/

## খেলার ধাপ
1. **শুরু:** রাতের মিরপুর ১০-এ হাঁটতে হাঁটতে একটা লেনদেন দেখে ফেলা, তারপর অপহরণ
2. **প্রথম অঙ্ক (ঘর):** দেশলাই, আয়নায় উল্টো লেখা কোড, আলমারি, আয়নার পেছনের ফোকর
3. **দ্বিতীয় অঙ্ক (বাড়ি):** টর্চ হাতে অপহরণকারীকে এড়িয়ে পালানো, হিসাবের খাতা, আরেক বন্দি, গেট অথবা ছাদ
4. **তৃতীয় অঙ্ক (মিরপুরের রাত):** পুলিশের জিপ, খোঁজের মাত্রা, কাকে বিশ্বাস করবেন, সাইবার ক্যাফেতে আপলোড
5. **৫টি সমাপ্তি**, একটি গোপন (তিনটি আয়নার লেখা খুঁজে পেলে)

Control: WASD, মাউস, Shift দৌড়, C বসা, E ধরা/কথা বলা, F দেশলাই (রাস্তায় F = ফোন), Tab সঙ্গের জিনিস, F3 তথ্য।

## Local-এ চালানো
```
python3 -m http.server 8000     # তারপর http://localhost:8000
python3 tools/build_map.py      # map আবার বানাতে (assets/mirpur.glb, assets/mirpur.json)
node tools/test_act1.mjs        # headless test (Playwright লাগে); test_act2, test_act3-ও আছে
```

## Credits
- Map data © OpenStreetMap contributors (ODbL). Building-এর উচ্চতা বেশিরভাগ আন্দাজ করা।
- Three.js r160 (MIT), Hind Siliguri font (SIL OFL), দুটোই repo-তে vendor করা।
- সব sound Web Audio API দিয়ে তৈরি।
