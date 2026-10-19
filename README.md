# Banphrucity. — ระบบจองสถานที่

แอปภาษาไทย ใช้ TH Sarabun ฝังไว้ในตัวแอป รองรับเดสก์ท็อป มือถือและแท็บเล็ต
ข้อมูลอยู่ใน Cloudflare D1 และไฟล์อยู่ใน R2; ขณะนี้ใช้ฐานข้อมูลจำลองในเครื่อง ยังไม่ได้เผยแพร่


## เริ่มจาก Repository นี้

ต้องมี Node.js 22.13 ขึ้นไปและ npm

1. ติดตั้งไลบรารี: npm ci
2. สร้างแอปครั้งแรก: npm run build
3. เตรียม D1 ในเครื่องตามลำดับ:
   - node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_neat_whistler.sql
   - node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_goofy_wolfsbane.sql
4. เปิดแอป: npm run dev
5. เปิด http://127.0.0.1:5173/auth และสร้าง Super admin คนแรก

ไฟล์ .openai/hosting.json ใน Repository เป็นค่า binding ตั้งต้น ไม่มี Site ID ของเครื่องต้นทาง
โค้ดนี้ยังไม่ได้ Deploy ขึ้น Cloudflare และไม่รวมฐานข้อมูลหรือบัญชีผู้ใช้จากเครื่องต้นทาง

## เข้าสู่ระบบ
- เปิด http://127.0.0.1:5173/auth
- เมื่อ clone Repository ใหม่ ให้สร้างบัญชี Super admin ผ่านหน้า /auth; บัญชีและรหัสผ่านจากเครื่องต้นทางไม่ได้รวมใน Git
- ระบบใช้ Username/Password จริง เลิกใช้บัญชีจำลอง Seedy และไม่จำเป็นต้องมีบัญชี ChatGPT
- ชื่อผู้ใช้เป็นอีเมล หรือชื่อ 3–32 ตัวอักษร a-z, 0-9, จุด, ขีดกลาง หรือขีดล่าง ไม่แยกตัวพิมพ์ใหญ่/เล็ก
- รหัสผ่าน 6–128 ตัวอักษร แยกตัวพิมพ์ใหญ่/เล็ก ไม่บังคับเปลี่ยนรหัสผ่านครั้งแรก

## สิทธิ์
- Super admin: เพิ่ม Admin กำหนดชื่อผู้ใช้/รหัสผ่าน แก้ไขบัญชี ระงับ/เปิดใช้งาน รีเซ็ตรหัสผ่าน จัดการสถานที่ และจัดการรายการจองทั้งหมด
- Admin: ดูรายการจอง อนุมัติ/ไม่อนุมัติ แก้ไข และยกเลิกการจอง ไม่มีสิทธิ์จัดการบัญชีผู้ดูแล จัดการสถานที่ หรือลบรายการจอง
- เฉพาะ Super admin เห็น Audit Log และหน้าจัดการ Admin
- ผู้ที่ไม่ล็อกอินดูสถานที่และช่วงเวลาถูกจองได้ แต่ไม่เห็นชื่อ/ข้อมูลติดต่อผู้จอง

## เปลี่ยนชื่อผู้ใช้และรหัสผ่านภายหลัง
1. กด “บัญชีของฉัน” มุมขวาบน
2. เปลี่ยนชื่อผู้ใช้หรือชื่อที่แสดง
3. ใส่รหัสผ่านปัจจุบัน
4. ใส่รหัสผ่านใหม่ถ้าต้องการเปลี่ยน หรือเว้นว่างเพื่อคงเดิม
5. บันทึก ระบบจะออกจากระบบในอุปกรณ์อื่นทั้งหมด และคงการเข้าสู่ระบบในอุปกรณ์นี้ไว้

## จัดการ Admin
Super admin เข้าเมนู “จัดการ Admin” แล้วระบุ Username ชื่อที่แสดง และรหัสผ่าน
Admin ใช้ข้อมูลที่กำหนดให้เข้าสู่ระบบได้ทันที
สามารถแก้ไขชื่อบัญชี ตั้งรหัสผ่านใหม่ หรือระงับบัญชีภายหลังได้
รหัสผ่านเดิมจะไม่แสดงและไม่สามารถเรียกดูได้

## ข้อมูลและความปลอดภัย
- รหัสผ่านเก็บเป็น scrypt hash พร้อม salt สุ่ม แยกต่อบัญชี ไม่เก็บข้อความรหัสผ่านหรือเขียนลง Audit Log
- Session token สุ่ม 256 บิต เก็บเฉพาะ SHA-256 ของ token ใน D1
- Cookie ใช้ HttpOnly, SameSite=Lax และ Secure เมื่อให้บริการผ่าน HTTPS
- Session อายุ 12 ชั่วโมง ตรวจการระงับบัญชีและสิทธิ์จาก D1 ทุกครั้ง
- จำกัดการลองเข้าสู่ระบบ และตรวจ Origin สำหรับคำขอแก้ไขข้อมูล
- เปลี่ยนรหัสผ่าน/ชื่อบัญชีหรือระงับบัญชีจะยกเลิก session เดิม
- ข้อมูล Sample 3 สถานที่และ 5 รายการจองแยกจากข้อมูลใช้งานจริงด้วยป้าย SAMPLE

## ย้ายขึ้น Cloudflare
ยังไม่ได้สร้างฐานข้อมูลออนไลน์หรือเผยแพร่ในรอบนี้
1. Build แอป แล้วเชื่อม Worker กับ D1 binding DB และ R2 binding BUCKET
2. ใช้ SQL migration ใน drizzle/ ตามลำดับ รวม 0000 และ 0001 กับฐานข้อมูลออนไลน์
3. ตั้ง Secret ชื่อ BOOTSTRAP_TOKEN ใน Cloudflare เป็นค่าสุ่มที่เจ้าของเก็บไว้
4. เปิด /auth ของเว็บออนไลน์ กรอกรหัสอนุญาต BOOTSTRAP_TOKEN และกำหนดบัญชี Super admin คนแรก
5. หลังมี Super admin แล้ว ระบบไม่อนุญาตให้ตั้งค่าแรกซ้ำ สามารถนำ BOOTSTRAP_TOKEN ออกได้
6. บัญชีใน local D1 ไม่ถูกคัดลอกไป D1 ออนไลน์อัตโนมัติ ZIP ไม่รวมฐานข้อมูล session หรือแฮชรหัสผ่านบัญชีที่ตั้งไว้
7. ถ้าใช้ Sites เป็นโฮสต์ การเข้าถึงไซต์ยังขึ้นกับนโยบายการแชร์ของ Sites ด้วย; เมื่อโฮสต์บนบัญชี Cloudflare ของตนเอง ระบบ Username/Password ตรวจตัวตนได้โดยไม่ใช้ header จาก Sites

## เปิดในเครื่อง
ดับเบิลคลิก Start-App.cmd แล้วเปิด http://127.0.0.1:5173/
ถ้าแอปเปิดอยู่แล้ว ไม่ต้องเปิดซ้ำ
ZIP รวมซอร์สและฟอนต์ ไม่รวม node_modules, D1 local, session, หรือรหัสผ่านบัญชีจริง
ข้อมูลในเครื่องนี้อยู่ใน .wrangler/state ของโฟลเดอร์แอป

## ตรวจสอบ
- node node_modules/typescript/bin/tsc --noEmit
- node tests/integration.mjs — รับข้อมูลล็อกอินผ่าน stdin แบบไม่แสดง ต้องรันกับ local dev เท่านั้น
- ทดสอบการเข้าสู่ระบบจริง สิทธิ์ Super admin/Admin การเปลี่ยนชื่อผู้ใช้และรหัสผ่าน ยกเลิก session เก่า รีเซ็ต ระงับ/เปิดใช้งาน Logout CSRF และการปลอม header
- ใช้บัญชี Admin ชั่วคราวในการทดสอบและล้างเฉพาะข้อมูลทดสอบออก

## เอกสารอ้างอิง
- https://developers.cloudflare.com/d1/worker-api/d1-database/
- https://developers.cloudflare.com/workers/runtime-apis/web-crypto/
- https://github.com/paulmillr/noble-hashes

## รายละเอียดการจองในปฏิทิน
เลือกวันที่ในปฏิทินเพื่อดูชื่อกิจกรรม ผู้จอง จำนวนผู้เข้าร่วม เวลา สถานะและหมายเหตุ
กด “ดูรายละเอียดการจอง” เพื่อดู VENUE BOOKING แบบเต็ม รวมเบอร์โทร อีเมล และเอกสารแนบ
ผู้ดูแลสามารถเปิดแบบแก้ไขได้จากหน้านี้ ส่วนผู้ไม่ล็อกอินจะเห็นเพียงสถานที่ ช่วงเวลาและสถานะ

## Super admin สำหรับ Cloudflare

Repository นี้มี workflow แบบสั่งรันเองชื่อ Create initial administrator accounts ในแท็บ Actions
ค่าบัญชีเริ่มต้นเก็บใน Repository Secrets ได้แก่ SUPER_ADMIN_USERNAME, SUPER_ADMIN_PASSWORD และ SUPER_ADMIN_NAME; ไม่มีรหัสผ่านในซอร์ส
ผู้ดูแลต้องเพิ่ม CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_DATABASE_ID และ CLOUDFLARE_API_TOKEN ที่มีสิทธิ์เขียน D1 ของแอปนี้ก่อน
หลังสร้าง D1 และใช้ SQL migration ครบแล้ว จึงกด Run workflow เพื่อสร้าง Super admin คนแรก
สคริปต์จะไม่สร้างหรือเปลี่ยนบัญชีเมื่อมีบัญชีอยู่แล้ว จึงไม่เขียนทับรหัสผ่านที่แก้ภายหลัง
หลังตั้งบัญชีสำเร็จสามารถลบ SUPER_ADMIN_PASSWORD ออกจาก Repository Secrets ได้; บัญชีที่สร้างใน D1 ยังคงใช้งานได้
workflow นี้ไม่ Deploy เว็บและไม่ทำงานอัตโนมัติเมื่อ push โค้ด

บัญชี Admin เริ่มต้นใช้ INITIAL_ADMIN_USERNAME, INITIAL_ADMIN_PASSWORD และ INITIAL_ADMIN_NAME ใน GitHub Secrets
workflow จะสร้าง Super admin และ Admin เริ่มต้น โดยไม่แก้ไขข้อมูลล็อกอินของบัญชีที่มีอยู่แล้ว
เมื่อเปลี่ยนชื่อผู้ใช้หรือรหัสผ่านในเว็บภายหลัง การรัน workflow อีกครั้งจะไม่ย้อนกลับไปใช้ค่าตั้งต้น

## Deploy เว็บผ่าน GitHub Actions

workflow ชื่อ Deploy to Cloudflare ทำงานเมื่อกด Run workflow เท่านั้น โดย Build เว็บ ใช้ migration สร้างบัญชีเริ่มต้นถ้ายังไม่มี แล้วเผยแพร่ Worker พร้อมไฟล์เว็บ
ก่อนใช้ต้องสร้าง D1 ชื่อ banpru-revenue-db และเปิด R2 พร้อมสร้าง bucket ชื่อ banpru-revenue-files ในบัญชีเดียวกัน
เพิ่ม Secrets ชื่อ CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_DATABASE_ID, CLOUDFLARE_API_TOKEN และ Secrets บัญชีเริ่มต้นที่ระบุข้างต้น
API token ต้องมีสิทธิ์แก้ไข Workers Scripts, D1 และเข้าถึง R2 ของบัญชีเป้าหมาย; ใช้สิทธิ์เฉพาะบัญชีที่ต้องการ
ไฟล์ตั้งค่า Deploy สร้างด้วย npm run cloudflare:prepare หลัง Build และไม่ถูกเก็บใน Git
การรันซ้ำรักษาบัญชีและรหัสผ่านที่เปลี่ยนผ่านเว็บแล้ว

## เปลี่ยนรูปแบนเนอร์หน้าแรก

Super admin เข้า จัดการสถานที่ → รูปแบนเนอร์หน้าแรก เลือก JPEG, PNG หรือ WebP ไม่เกิน 10 MB ดูภาพตัวอย่างแล้วกด บันทึกรูปแบนเนอร์
รูปแสดงทางขวาบนหน้าจอใหญ่ และใต้ข้อความแบนเนอร์บนมือถือ โดยครอปภาพจากตรงกลาง
กด กลับไปใช้ภาพตัวอย่าง เพื่อนำรูปออกได้ ค่ารูปเก็บใน D1 และไฟล์เก็บใน R2; Admin ทั่วไปเปลี่ยนรูปไม่ได้
ก่อนใช้กับฐานข้อมูลเดิม ให้ใช้ migration drizzle/0002_sweet_spitfire.sql เพิ่มเติม; workflow Deploy to Cloudflare จะใช้ migration นี้ด้วย
ทดสอบด้วย node tests/banner.mjs โดยรับข้อมูลบัญชีทดสอบ Super admin และ Admin ผ่าน stdin ที่ซ่อนข้อมูล และใช้กับ local dev เท่านั้น

## เริ่มใช้งานแบบฟรี โดยยังไม่เปิด R2

ตั้ง R2_ENABLED=false ก่อน npm run cloudflare:prepare เพื่อ Deploy เฉพาะ Workers + D1 โดยไม่สร้าง R2 subscription
หน้าเว็บจะปิดปุ่มอัปโหลดแบนเนอร์และรูปสถานที่ และไม่แสดงช่องแนบเอกสารการจอง การจัดการสถานที่และการจองยังทำงานได้
GitHub Actions workflow Deploy to Cloudflare เริ่มต้นโดยไม่เปิด R2; เมื่อเปิด R2 และสร้าง bucket แล้วจึงเลือก enable_r2 ตอน Run workflow
บัญชีออนไลน์สร้างผ่านสคริปต์ provisioning ซึ่งรักษาชื่อผู้ใช้และรหัสผ่านที่แก้ภายหลัง การอัปเดตเว็บไม่คัดลอก local D1 หรือข้อมูล SAMPLE ไปออนไลน์

## ที่อยู่เว็บออนไลน์

ชื่อเว็บที่กำหนดคือ https://revenue.banphru.workers.dev โดยใช้ Worker ชื่อ revenue
เมื่อ Deploy ผ่าน GitHub ให้ใช้บัญชีเจ้าของเว็บและฐานข้อมูลเดิม เพื่อรักษาบัญชีและรายการจอง
การ Deploy ครั้งแรกสร้างฐานข้อมูลใหม่ที่ว่าง ไม่มีสถานที่หรือรายการจอง SAMPLE จากเครื่อง ผู้ดูแลเพิ่มสถานที่ผ่านเว็บได้
ขณะนี้เลือกไม่เปิด R2 จึงยังอัปโหลดรูปและเอกสารไม่ได้; สามารถเปิด R2 ภายหลังโดยไม่ต้องย้ายฐานข้อมูล
