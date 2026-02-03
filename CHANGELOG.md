# 📝 Changelog

## [Fixed] - 2026-02-03

### 🐛 Bug Fixes

#### 1. แก้ปัญหาข้อความ "กลับ 3" ตกบรรทัดบนมือถือ
- **ปัญหา**: ข้อความ "100 x กลับ 3" แสดงผลเป็น 2 บรรทัด
- **แก้ไข**: เพิ่ม `white-space: nowrap` ใน `renderUndergroundPreview()`
- **ไฟล์**: `app.js` (บรรทัด ~1095)
- **ผลลัพธ์**: ข้อความแสดงในบรรทัดเดียวกันทั้งหมด

#### 2. แก้ปัญหา html2canvas Error
- **ปัญหา**: `InvalidStateError: canvas element with a width or height of 0`
- **สาเหตุ**: Background patterns ที่ซับซ้อนทำให้ html2canvas render ไม่ได้
- **แก้ไข**: เพิ่ม `onclone` callback เพื่อลบ background patterns ออกก่อน render
- **ไฟล์**: `app.js` (ฟังก์ชัน `saveImage()`)
- **ผลลัพธ์**: บันทึกรูปได้สำเร็จ

#### 3. แก้ปัญหา CORS และ Service Worker (สำหรับ GitHub Pages)
- **ปัญหา**: เปิดผ่าน `file://` ทำให้เกิด CORS error
- **แก้ไข**: ออกแบบให้ใช้งานบน GitHub Pages (HTTPS)
- **ผลลัพธ์**: ไม่มี CORS error เมื่อโฮสต์บน GitHub Pages

### 📦 Changes

- ✅ ปรับปรุง `app.js` - แก้ปัญหา text wrapping และ html2canvas
- ✅ อัปเดต `README.md` - เพิ่มคำแนะนำสำหรับ GitHub Pages
- ✅ เพิ่ม `CHANGELOG.md` - บันทึกการเปลี่ยนแปลง

### 🗑️ Removed

- ❌ ลบไฟล์ local server ที่ไม่จำเป็น (start-server.bat, etc.)
- ❌ ลบไฟล์ทดสอบ (test-server.html)
- ❌ ลบ warning script สำหรับ file:// protocol

---

## [Initial] - 2026

### ✨ Features

- 📝 บันทึกหวยรัฐบาล (6 ตัวตรง, เลขหน้า 3 ตัว, เลขท้าย 3 ตัว, เลขท้าย 2 ตัว)
- 📝 บันทึกหวยใต้ดิน (3 ตัวบน, 2 ตัวบน, 2 ตัวล่าง, วิ่งบน, วิ่งล่าง)
- 💰 คำนวณราคาเต็งและโต๊ด รองรับกลับ 3 และกลับ 6
- 📊 Dashboard แสดงสรุปยอดเงิน
- 🖼️ บันทึกเป็นรูปภาพ PNG
- 📋 คัดลอกเป็นข้อความ
- 🔍 ค้นหาและกรองรายการ
- 💾 LocalStorage - เก็บข้อมูลในเครื่อง
- 📱 PWA - ติดตั้งเป็นแอปได้
- 🔌 ทำงานออฟไลน์ด้วย Service Worker
- 🎨 UI/UX สวยงามด้วยธีมสีทองศักดิ์สิทธิ์
- 📱 Responsive Design
- 🎮 Custom Numpad
- 📳 Haptic Feedback

---

**Developed by PUNN**
