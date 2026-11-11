# MAGAZIN 3D DESIGN

Haqiqiy do‘kon xonasini loyihalash uchun brauzerda ishlaydigan 3D muharrir. Yangi loyiha foydalanuvchi yuborgan qo‘l chizmasi asosida taxminiy 4 m × 8 m × 2,8 m xonada ochiladi; bir burchagida 1,4 m × 2 m ichkariga kirgan qadam bor. Orqa eshik chizmada qora bilan ko‘rsatilgan qadam devoriga joylashtiriladi; boshqaruv panelidan uni 4 m orqa devorga ko‘chirish ham mumkin. Uzun devorda kirish eshigi va ikkita katta oyna, 6 m devorda esa yuqori kichik oynalar ko‘rsatiladi. Chizmada ko‘rsatilgan 4 m × 8 m o‘lcham oldingi xabardagi 7 m × 6 m o‘lcham bilan farq qiladi; loyiha chizmaga qarab qurilgan, o‘lchamlarni o‘ng paneldan tahrirlash mumkin.

## Ishga tushirish

1. Loyihani VS Code’da oching.
2. Terminalda loyiha papkasiga o‘ting va lokal serverni ishga tushiring:

   ```sh
   python3 -m http.server 8000
   ```

3. Chrome yoki Safari’da `http://localhost:8000` manzilini oching.

Three.js importlari CDN’dan olinadi, shuning uchun dastlabki ishga tushirishda internet kerak. HTML faylni bevosita `file://` orqali ochmang; ES modullar lokal HTTP serverda ishlaydi.

## Asosiy boshqaruv

- Sichqoncha bilan orbit qiling; g‘ildirak bilan yaqinlashtiring.
- `2D reja` yuqoridan ko‘rsatadi, `Ichki` xonaga kirish rakursini ochadi.
- Jihoz kartasini bosib qo‘shing, sahnada tanlab ko‘chiring yoki o‘ng paneldan o‘lcham, koordinata, rang va aylanishni o‘zgartiring.
- Pastdagi asboblar ko‘chirish, aylantirish va masshtabni o‘zgartiradi. Jihozlar devor/pol chegarasidan tashqariga chiqmaydi.
- `Tekshirish` jihozlar to‘qnashuvini ko‘rsatadi. Xona devori, pol va shift ranglari o‘ng panelda sozlanadi.
- O‘zgarishlar avtomatik saqlanadi. `Saqlash` JSON faylni eksport qiladi; `Yuklash` JSON loyihani import qiladi. `Rasm` 3D sahnani PNG qilib saqlaydi.
- `Shift` va `Devorlar` tugmalari mos ravishda shiftni hamda devorlarni yashiradi/ko‘rsatadi.
- O‘ng paneldagi **Xona shaklini tahrirlash** bo‘limidan xona uzunligi, eni, balandligi, eshik-oynalar, mayda yuqori oynalar va chizmada ko‘rsatilgan burchak qadamini tahrirlang. O‘zgarishlar avtomatik saqlanadi va JSON loyihaga ham qo‘shiladi.
- Orqa eshik odatda chizmada qora bilan belgilangan burchak devorida bo‘ladi. **Orqa eshik joylashuvi → Devor** ro‘yxatidan uni 4 m orqa devorga ko‘chirish mumkin; eshikning eni, bo‘yi va shu devordagi o‘rni ham sozlanadi.
- Xona o‘lchamlari uchun ruxsat etilgan oraliq: eni 2–12 m, uzunligi 3–20 m, balandligi 2,2–6 m. Oyna va eshiklar devor chegarasidan tashqariga chiqmasligi uchun qiymatlar moslanadi.

## Fayllar

- `index.html` — interfeys va ES module import map.
- `style.css` — muharrir ko‘rinishi.
- `main.js` — UI, joylashuvlar, tahrirlash, to‘qnashuv tekshiruvi va kamera ko‘rinishlari.
- `scene.js` — Three.js sahnasi va renderer.
- `store.js` — chizmaga mos 4 × 8 × 2,8 m qadamli xona geometriyasi, eshik-oynalar, pol, devor, shift va yoritish.
- `furniture.js` — jihoz modellari va o‘lchamlari.
- `controls.js` — kamera, tanlash va TransformControls.
- `storage.js` — localStorage hamda JSON import/eksport.
