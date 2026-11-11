# MAGAZIN 3D DESIGN

Haqiqiy do‘kon xonasini loyihalash uchun brauzerda ishlaydigan 3D muharrir. Yangi loyiha bo‘sh, 7 m uzunlik × 4 m en × 2,8 m balandlikdagi xona bilan ochiladi. Kirish tomonida oynali fasad va o‘ngroqda eshik, orqa devorda esa kichik ichki eshik bor. Pol, ranglar va shift chiroqlari yuborilgan suratlar asosida taxminan chizilgan; suratlarning o‘zidan aniq metrni o‘lchab bo‘lmaydi. Jihozlar katalogdan ixtiyoriy qo‘shiladi yoki tayyor joylashuv tanlanadi.

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

## Fayllar

- `index.html` — interfeys va ES module import map.
- `style.css` — muharrir ko‘rinishi.
- `main.js` — UI, joylashuvlar, tahrirlash, to‘qnashuv tekshiruvi va kamera ko‘rinishlari.
- `scene.js` — Three.js sahnasi va renderer.
- `store.js` — 4 × 7 × 2,8 m 3D xona (7 × 4 × 2,8 m o‘lcham), oynali kirish fasadi, pol, devor, shift va yoritish.
- `furniture.js` — jihoz modellari va o‘lchamlari.
- `controls.js` — kamera, tanlash va TransformControls.
- `storage.js` — localStorage hamda JSON import/eksport.
