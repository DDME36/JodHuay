# JodHuay - จดหวย

แอปพลิเคชันจดบันทึกหวยใต้ดินและหวยรัฐบาล พร้อมระบบบันทึกเป็นรูปภาพและแชร์

**Developed by PUNN**

## โครงสร้างโปรเจค

```
JodHuay/
├── index.html              # หน้าหลักของแอป
├── app.js                  # JavaScript หลัก
├── styles.css              # CSS เดิมของแอป (legacy)
├── manifest.json           # PWA manifest
├── sw.js                   # Service Worker
├── README.md               # เอกสารนี้
│
├── assets/                 # ไฟล์รูปภาพและสื่อ
│   ├── icon-192.png       # ไอคอน PWA ขนาด 192px
│   ├── icon-512.png       # ไอคอน PWA และ maskable ขนาด 512px
│   └── apple-touch-icon.png # ไอคอนสำหรับ iOS
│
├── css/                    # CSS แบบแยกส่วนสำหรับพัฒนาต่อ
│   ├── tokens.css         # สี ตัวแปร และ foundation
│   ├── workflow.css       # ข้อมูลโพย เครื่องมือ และ preview
│   ├── responsive.css     # การแสดงผลตามขนาดหน้าจอ
│   ├── sacred-theme.css   # ธีมพุทธศิลป์และ ambient motion
│   ├── motion.css         # ระบบ animation และ motion preference
│   ├── tailwind-built.css # Tailwind CSS ที่ build สำหรับ production
│   └── export-sheet.css   # ใบโพยสำหรับบันทึกและแชร์เป็นรูป
│
└── tests/
    └── browser-smoke.mjs  # ทดสอบ flow หลักผ่าน Chromium DevTools
```

## คุณสมบัติ

### หวยรัฐบาล
- บันทึกเลข 6 ตัวตรง, เลขหน้า 3 ตัว, เลขท้าย 3 ตัว, เลขท้าย 2 ตัว
- ระบุจำนวนใบ
- ค้นหาและกรองรายการ

### หวยใต้ดิน
- บันทึกเลข 3 ตัวบน, 2 ตัวบน, 2 ตัวล่าง, วิ่งบน, วิ่งล่าง
- ระบุราคาเต็งและโต๊ด
- รองรับกลับ 3 และกลับ 6
- แสดงยอดรวมเงิน
- ค้นหาและกรองตามประเภท

### ฟีเจอร์เพิ่มเติม
- ข้อมูลหัวโพยแบบเปิดใช้เมื่อต้องการ: ชื่อลูกค้า ชื่อแม่ค้า/ผู้รับ และงวดวันที่
- บันทึกเป็นรูปภาพ (PNG)
- คัดลอกเป็นข้อความ
- แชร์รายการ
- สำรองและกู้คืนข้อมูลเป็น JSON จากหน้าแอป
- PWA - ติดตั้งเป็นแอปได้
- ทำงานออฟไลน์
- แป้นตัวเลขแบบกำหนดเอง
- Haptic feedback บนมือถือ

## การติดตั้ง

### ใช้งานบน Windows

ดับเบิลคลิก `start-jodhuay.cmd` ระบบจะเปิดแอปที่ `http://127.0.0.1:4173` อัตโนมัติ ห้ามเปิด `index.html` โดยตรง เพราะ Manifest และ Service Worker ไม่รองรับ `file://`

หากมีการแก้คลาส Tailwind ให้รัน `npm install` หนึ่งครั้ง และใช้ `npm run build` เพื่อสร้าง `css/tailwind-built.css`

### ใช้งานออนไลน์ (แนะนำ)
เปิดเบราว์เซอร์ไปที่ URL ที่โฮสต์บน GitHub Pages

### ติดตั้งเป็น PWA บนมือถือ
1. เปิดเว็บไซต์ในเบราว์เซอร์
2. เลือก "เพิ่มไปยังหน้าจอหลัก" (Add to Home Screen)
3. ใช้งานเหมือนแอปปกติ - ทำงานออฟไลน์ได้!

## เทคโนโลยีที่ใช้

- **HTML5** - โครงสร้างหน้าเว็บ
- **CSS3** - การออกแบบและอนิเมชัน
- **JavaScript (Modern ES)** - ตรรกะของแอป
- **Tailwind CSS** - ยูทิลิตี้ CSS
- **html2canvas** - แปลง HTML เป็นรูปภาพ
- **Service Worker** - ทำงานออฟไลน์
- **LocalStorage** - เก็บข้อมูล

## การพัฒนา

### การ Deploy บน GitHub Pages

1. Fork หรือ Clone repository นี้
2. ไปที่ Settings → Pages
3. เลือก Source: Deploy from a branch
4. เลือก Branch: main (หรือ master) → folder: / (root)
5. กด Save
6. รอสักครู่ เว็บไซต์จะพร้อมใช้งานที่ `https://[username].github.io/[repo-name]`

### การแก้ไขโค้ด

1. แก้ไขไฟล์ `app.js`, `styles.css`, หรือ `index.html` ตามต้องการ
2. สไตล์ใหม่ควรเพิ่มใน `css/` ตามหมวด แทนการเพิ่มทุกอย่างใน `styles.css`
3. เพิ่มเวอร์ชัน cache ใน `sw.js` เมื่อเปลี่ยน asset ที่ต้องใช้แบบออฟไลน์
4. รีเฟรชเบราว์เซอร์

## ใบอนุญาต

© JodHuay - สงวนลิขสิทธิ์

---

**Developer:** PUNN  
**Version:** 1.2.1  
**Last Updated:** 2026
