# งาน 2: ใช้งานได้โดยไม่ต้องล็อกอิน + สมัครสมาชิก

วันที่: 2026-11-09 · สถานะ: รออนุมัติ · ต่อยอดจาก branch `feat/restyle-top-nav` (PR #11)

## เจตนา

Tewtopia ควรให้ความรู้สึกเหมือน spires.co: คนที่เพิ่งเข้ามาดูติวเตอร์ได้ทันทีโดยไม่ต้องสมัคร
และถูกขอให้ล็อกอินหรือสมัครเฉพาะตอนจะ "ติดต่อ" กัน (ปุ่มติดต่อ/รับคำขอมากับงาน 3)
ตอนนี้ทุกหน้าใต้ `/main` บังคับล็อกอิน และไม่มีหน้าสมัครเลย ต้องสร้างบัญชีจาก Supabase Dashboard เอง

## เป้าหมาย

1. **ทุกคน (ไม่ล็อกอิน) ดูรายชื่อติวเตอร์ได้** — ชื่อที่แสดง, headline, วิชา, ระดับที่สอน, ราคา/ชม., ประสบการณ์ (ปี), รูปแบบการสอน, about
2. **หน้า auth หน้าเดียวทำได้ทั้งล็อกอินและสมัคร** — ลิงก์ "Don't have an account? Create one" สลับเป็นฟอร์มสมัครในหน้าเดิม
3. **สมัครแล้วเลือก role ทันที** — "I'm a student" / "I'm a tutor"
4. **ล็อกอินหรือสมัครเสร็จแล้วพากลับหน้าที่มา** — รองรับ `?next=` เพื่อให้งาน 3 ใช้ได้ทันที
5. **แถบเมนูของคนไม่ล็อกอิน** — โลโก้, tab "Find tutors", ปุ่ม "Log in" ปุ่มเดียว (ไม่มีปุ่ม Sign up แยก)

## ไม่อยู่ในงานนี้

- ปุ่มติดต่อติวเตอร์, การส่งคำขอ, บอร์ดคำขอหาติวเตอร์, การจับคู่ (งาน 3)
- หน้ารายละเอียดติวเตอร์แยกรายคน (การ์ดในหน้า list แสดงรายละเอียดเบื้องต้นครบแล้ว — ถ้าต้องมี จะมากับงาน 3 พร้อมปุ่มติดต่อ)
- ระบบสองภาษา, ค้นหา/กรองติวเตอร์, ลืมรหัสผ่าน, ล็อกอินด้วย Google
- ระบบ admin

## สิ่งที่ห้ามเกิด (anti-goals)

- **อีเมล หรือข้อมูลส่วนตัวของใครหลุดไปถึงคนที่ไม่ล็อกอิน** — แม้ว่าหน้าเว็บจะดูทำงานถูกต้องก็ถือว่าล้มเหลว
- ผู้ใช้ตั้ง role ตัวเองเป็น `admin` ได้ผ่านการสมัคร
- `?next=` ถูกใช้พาคนออกไปเว็บอื่น (open redirect)

## สิ่งที่ตัดสินใจแล้ว

### จากผู้ใช้
- คนไม่ล็อกอินดูรายชื่อติวเตอร์ + ราคา + รายละเอียดเบื้องต้นได้
- ขอให้ล็อกอินตอนจะติดต่อกันเท่านั้น
- แถบเมนูมีแค่ "Log in"; การสมัครอยู่ในหน้าเดียวกับล็อกอิน
- เลือก student/tutor ตั้งแต่ตอนสมัคร
- **ติวเตอร์โผล่ใน Find tutors อัตโนมัติเมื่อกรอกข้อมูลจำเป็นครบ** — อย่างน้อย: เรทราคา, วิชาที่สอน, ระดับที่สอน
  (ไม่ต้องไปเปิด Public ใน Settings เอง)

### เงื่อนไขการแสดงติวเตอร์ (ผมกำหนดรายละเอียด ผู้ใช้ตรวจได้)
- view `public_tutor_cards` แสดงติวเตอร์เมื่อ **ครบทุกข้อ**:
  `profiles.role = 'tutor'`, `display_name` ไม่ว่าง, `tutor_profiles.hourly_rate > 0`,
  มีวิชาอย่างน้อย 1 วิชา, มีระดับที่สอนอย่างน้อย 1 ระดับ,
  และ `user_settings.profile_visibility` **ไม่ใช่** `private` (ไม่มีแถว settings = ถือว่าแสดง)
- ค่าเริ่มต้นของ `profile_visibility` สำหรับติวเตอร์ที่สมัครใหม่ = `public`; ติวเตอร์ซ่อนตัวเองได้ด้วยการตั้งเป็น `private`
  (`matched_only` ยังไม่มีความหมายจนกว่าจะมีการจับคู่ในงาน 3 — ระหว่างนี้ถือว่าแสดง และแก้คำอธิบายในหน้า Settings ให้ตรง)
- **ระดับที่สอนเป็นข้อมูลใหม่** — เพิ่มคอลัมน์ `tutor_profiles.teaching_levels text[]` (ค่าว่าง `{}`)
  ค่าที่เลือกได้ (checkbox ในหน้า Tutor profile, ห้ามพิมพ์อิสระ):
  `primary` (Primary · ประถม), `lower_secondary` (Lower secondary · ม.ต้น), `upper_secondary` (Upper secondary · ม.ปลาย),
  `university` (University), `adult` (Adult learners)
  แสดงเป็นป้ายบนการ์ดติวเตอร์
- หน้า Tutor profile แสดงสถานะ "Visible to students" / "Hidden — still missing: …" บอกว่าขาดข้อมูลอะไร
- ติวเตอร์ที่สมัครเสร็จถูกพาไป `/main/tutor-profile` อยู่แล้ว จึงเห็นทันทีว่าต้องกรอกอะไร
- การยืนยันอีเมล: **ปิดไว้ช่วงพัฒนา** (ตั้งใน Supabase Dashboard), จะเปิดพร้อมต่อ SMTP (เช่น Resend) ก่อนเปิดใช้จริง — **โค้ดต้องรองรับทั้งสองแบบโดยไม่ต้องแก้**

### จากผม (ผู้ใช้ตรวจได้)
- **ข้อมูลสาธารณะส่งผ่าน view `public_tutor_cards`** ที่ select เฉพาะคอลัมน์ที่ปลอดภัย (ไม่มี `email`) กรองตาม "เงื่อนไขการแสดงติวเตอร์" ด้านบน แล้ว `grant select` ให้ `anon` และ `authenticated`
  ห้ามเปิด policy ให้ `anon` อ่านตาราง `profiles`/`user_settings`/`tutor_profiles` ตรงๆ
- **หน้า Find tutors ย้ายไป `/tutors`** (นอก `/main` ที่บังคับล็อกอิน) — `/main/tutors` redirect ไป `/tutors`
  หน้านี้แสดงแถบเมนูตามสถานะ: ล็อกอินอยู่ = เมนูเต็ม, ไม่ล็อกอิน = เมนูแบบ guest
  ติวเตอร์ที่ล็อกอินอยู่ก็เข้าดูได้ (ตอนนี้ถูก redirect ออก)
- **tab ของคนล็อกอิน** — "Find tutors" ชี้ไป `/tutors` สำหรับนักเรียน; ติวเตอร์ยังเห็น "Tutor profile" เหมือนเดิม
- **แถว `profiles` สร้างอัตโนมัติด้วย trigger บน `auth.users`** ตอนสมัคร โดยอ่าน `role` และ `display_name` จาก user metadata ที่ส่งมากับ `signUp`
  trigger ยอมรับเฉพาะ `student`/`tutor` (ค่าอื่นหรือไม่มีค่า = `student`) — กัน anti-goal เรื่อง admin
  ถ้าเป็น tutor ให้สร้างแถว `tutor_profiles` ว่างไว้ด้วย; ทุกคนได้แถว `user_settings` ค่าเริ่มต้น
  (ตอนนี้ไม่มี trigger นี้ แถว profile ถูกสร้างตอนผู้ใช้กดบันทึกหน้า Profile ครั้งแรก)
- **ฟอร์มสมัคร** มี: เลือก role (2 การ์ดใหญ่กดเลือก), ชื่อที่แสดง, อีเมล, รหัสผ่าน (อย่างน้อย 8 ตัว)
- **หลังสมัคร/ล็อกอินสำเร็จ:**
  - ถ้ามี `next` ที่ถูกต้อง → ไปที่นั่น
  - ไม่มี `next`: student → `/tutors`, tutor → `/main/tutor-profile` (กรอกโปรไฟล์ติวเตอร์ต่อ); ล็อกอินปกติ → `/main/dashboard`
- **`next` ที่ถูกต้อง** = path ภายในเท่านั้น: ขึ้นต้นด้วย `/` แต่ไม่ใช่ `//` และไม่มี `\` — นอกนั้นทิ้ง
- **กรณียืนยันอีเมลเปิดอยู่:** `signUp` จะไม่คืน session → แสดงข้อความ "Check your email to confirm your account" ในหน้าเดิม
  ลิงก์ในอีเมลชี้ไป route ใหม่ `/auth/callback` ที่แลก code เป็น session แล้ว redirect ตาม `next` (ส่ง `next` ผ่าน `emailRedirectTo`)
- **ใช้ `getSessionUser`/`getCurrentUserProfile` เดิม** สำหรับตรวจสถานะล็อกอินในหน้าสาธารณะ — คืน `null` ได้โดยไม่ redirect
- สไตล์ตามงาน 1 (ใช้ `ui` tokens และ `TopNav` เดิม)
- **ทุกคน (ทั้งล็อกอินและไม่ล็อกอิน) อ่านข้อมูลติวเตอร์ผ่าน `public_tutor_cards` เท่านั้น** — เมื่อมีหน้าสมัครแบบเปิด
  ใครก็เป็น `authenticated` ได้ในไม่กี่วินาที จึงต้องลบ policy "Authenticated users can view public tutor profiles"
  (บน `profiles`, เปิดคอลัมน์ `email`), "…public tutor cards" (บน `tutor_profiles`) และ "…public settings rows"
  (บน `user_settings`) ออก และเปลี่ยน `listVisibleTutorsForStudents` ไปอ่านจาก view
  (ตรวจแล้ว: ไม่มีโค้ดอื่นใช้ policy เหล่านี้)
- **ปิดช่องที่ผู้ใช้ตั้ง role ตัวเองเป็น `admin`** ผ่าน API ด้วย — เพิ่ม trigger `before update` บน `profiles`
  ที่ปฏิเสธการเปลี่ยน `role` เป็น/จาก `admin` เมื่อไม่ได้ทำผ่าน service role
  (หน้า Profile ส่งแค่ student/tutor อยู่แล้ว จึงไม่กระทบ)
- **ปุ่ม "Get Started" ในหน้าแรกชี้ไป `/tutors`** แทน `/auth` — ตรงกับเจตนา "เข้ามาแล้วเห็นติวเตอร์ทันที";
  โลโก้ของ guest ยังชี้ไป `/`

## ข้อจำกัด

- Next.js 15 App Router, Supabase (`@supabase/ssr`), Tailwind v4 — ไม่เพิ่ม dependency ใหม่
- `supabase/schema.sql` ต้องรันซ้ำได้ (idempotent) เหมือนเดิม: `create or replace`, `drop ... if exists`
- ผู้ใช้เดิมที่ยังไม่มีแถว `profiles` ต้องยังใช้งานได้ (โค้ดเดิม fallback เป็น default profile อยู่แล้ว)
- ไม่มีระบบ test อัตโนมัติในโปรเจกต์ — ตรวจด้วย build, lint, typecheck และทดลองกับ Supabase จริง

## ปล่อยให้ผู้สร้างตัดสินใจ

- ชื่อไฟล์/component, การแบ่ง component ของฟอร์มล็อกอินกับสมัคร
- ข้อความ UI ที่ไม่ได้ระบุ, ข้อความ error
- จะทำ view เป็น `view` ธรรมดา (owner privileges) หรือฟังก์ชัน `security definer` — ขอแค่ anon เห็นเฉพาะคอลัมน์ที่ระบุ
- จะเก็บ `next` ระหว่างสลับโหมดล็อกอิน/สมัครด้วย query string หรือ state

## การตรวจรับ

1. เปิด `/tutors` แบบไม่ล็อกอิน เห็นติวเตอร์ที่กรอกข้อมูลครบพร้อมราคาและระดับ; ไม่มีอีเมลใน HTML หรือใน response ของ Supabase
1a. ติวเตอร์ที่ยังไม่ใส่ราคา/วิชา/ระดับ หรือตั้ง `private` ไม่โผล่ใน `/tutors`; พอกรอกครบแล้วโผล่ทันทีโดยไม่ต้องแก้ Settings
2. ใช้ publishable key เรียก `profiles`, `user_settings`, `tutor_profiles` ตรงๆ แบบ anon แล้วได้ 0 แถว
3. สมัครเป็น student → ล็อกอินอัตโนมัติ (เมื่อปิดยืนยันอีเมล) → ไป `/tutors`; มีแถว `profiles` role student
4. สมัครเป็น tutor → ไป `/main/tutor-profile`; มีแถว `profiles` role tutor + `tutor_profiles`
5. ส่ง `role: 'admin'` ใน metadata ด้วยมือ → ได้ role student
6. `/auth?next=//evil.com` และ `/auth?next=https://evil.com` → ไม่ redirect ออกนอกเว็บ
7. `/auth?next=/tutors` → ล็อกอินเสร็จกลับมา `/tutors`
8. `npm run build`, `tsc --noEmit`, `npm run lint` ผ่าน
