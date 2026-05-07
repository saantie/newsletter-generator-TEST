# Newsletter365 — แผนพัฒนาระบบ

> วันที่อัปเดต: 2026-04-19  
> ไฟล์หลัก: `index.html` (React แบบ single-file, ~1900 บรรทัด)

---

## 1. สถาปัตยกรรมภาพรวม

| ส่วน | เทคโนโลยี |
|---|---|
| Frontend | React 18 (UMD CDN) + Babel standalone |
| Storage | localStorage (settings) + IndexedDB (รูปภาพ) |
| Auth | Firebase Auth (Google + Email) |
| License | Google Apps Script → SHA-256 hash |
| Export | html2canvas → PNG/JPEG |
| Font | Kanit + Sarabun (Google Fonts) |

### Component หลัก
- **`Preview`** — render จดหมายข่าว 794×1123 px  
- **App (root)** — จัดการ state ทั้งหมด, form panel, layout

### โครงสร้าง Preview (จากบนลงล่าง)
```
HEADER (258px) — gradient bg + logo + profile + orgName + headline capsule
  └── Strip บน (SVG 137px, overlap ขอบ header-content)
CONTENT (height auto) — gradient bg + text block + top/bot images
  └── Strip ล่าง (SVG 137px, overlap ขอบ content-footer)
FOOTER (82px) — contact info + qrcode
```

---

## 2. Feature ที่มีอยู่แล้ว

### 🎨 Theme & Style
- สีธีม 6 แบบ: ม่วง, ชมพู, เทล, แดง, ทอง, น้ำเงิน
- สไตล์ 11 แบบ: formal, plain, modern, elegant, nature, minimal, retro, ocean, sunset, sakura, galaxy
- Hue shift (หมุนสีทั้งหมด), Brightness, Saturation, Vibrance
- สลับ gradient strip บน/ล่าง (ซ้าย→ขวา / ขวา→ซ้าย)
- Strip Hue/Brightness/Saturation/Vibrance แยกต่างหาก

### 🖼️ รูปภาพ
- **Top images**: สูงสุด 3 ภาพ (layout 1/2/3), ปรับความสูงด้วย drag handle
- **Bottom images**: สูงสุด 6 ภาพ (layout 1–6), ปรับความสูงด้วย drag handle
- **Profile**: รูปกลม, drag + pinch zoom ใน preview
- **Logo**: สูงสุด 3 ชิ้น, drag crop + zoom, U-shape background
- **Header Watermark**: ภาพพื้นหลัง header, drag + zoom + opacity slider

### 📝 เนื้อหา
- ชื่อจดหมายข่าว, ชื่อหน่วยงาน, หน่วยงานย่อย
- ชื่อ-สกุลผู้บริหาร + ตำแหน่ง
- หัวข้อข่าว (headline capsule) — มี color picker + background color
- วันที่, เนื้อหา (body text), website, ที่อยู่, เบอร์โทร, QR code
- Voice input (Speech Recognition) ในทุก field

### 🔧 ตำแหน่งแบบ drag
| องค์ประกอบ | วิธี drag |
|---|---|
| กลุ่มชื่อ header (orgName area) | drag ทันที |
| Headline capsule | drag ทันที |
| Profile (global position) | long-press 3 วิ |
| Logo group (global position) | long-press 3 วิ |
| Content block | long-press 3 วิ |
| Footer contact | drag ทันที |

### 🎛️ ตัวควบคุมพื้นหลัง
- ปิด/เปิดพื้นหลัง: ส่วนหัว, เนื้อหา, ส่วนท้าย, ลวดลาย
- ปิด/เปิด U-shape: โปรไฟล์, โลโก้

### 🏷️ อื่น ๆ
- Figma SVG strip inject (custom per style)
- Figma BG pattern inject
- Export PNG/JPEG (auto compress >10MB)
- iOS Share API
- PWA (manifest + service worker)
- License check (Google Sheets → Apps Script)
- Dark/Light UI panel

---

## 3. Bug ที่พบและวิธีแก้

### 🐛 Bug 1 — Strip และ Headline drag ไม่ได้

**สาเหตุหลัก (Headline):**  
ใน `<Preview>` prop `onHlDrag` รับ arrow function ที่เรียก `set("hlOffX",x)` แล้ว `set("hlOffY",y)` แยกกัน 2 ครั้ง — `set` คือ `(k,v)=>setD(p=>({...p,[k]:v}))` แต่ละครั้งสร้าง closure แยก ทำให้ค่าที่สองอาจ overwrite state เก่าผิดพลาด:

```js
// ❌ ปัจจุบัน (line 1888)
onHlDrag={(x,y)=>{set("hlOffX",x);set("hlOffY",y);}}

// ✅ แก้ไขเป็น
onHlDrag={(x,y)=>{setD(p=>({...p,hlOffX:x,hlOffY:y}));}}
```

**สาเหตุ (Strip):**  
Strip SVG render เป็น `<img>` ธรรมดา ไม่มี drag handler เลย — ต้องเพิ่ม state ตำแหน่ง (`stripOffX`, `stripOffY`) และ drag handler ให้ container div ของ strip

**แผนแก้ไข:**
1. แก้ `onHlDrag` ให้ใช้ single `setD` call
2. เพิ่ม state `[stripTopY, setStripTopY]` และ `[stripBotY, setStripBotY]` สำหรับ offset แนวตั้ง
3. ใส่ `onMouseDown`/`onTouchStart` ให้ container div ของ strip ทั้งบน/ล่าง
4. ส่ง handler ผ่าน props `onStripTopDrag` และ `onStripBotDrag`

---

### 🐛 Bug 2 — อัปโหลด Logo แล้วหน้าขาว

**สาเหตุ:**  
ใช้ `document.createElement("input")` แล้ว `.click()` ใน React event handler (line 1665) — วิธีนี้ทำให้ browser บางตัว (โดยเฉพาะ iOS Safari) เกิด navigation หรือ focus loss ที่ทำให้ component re-mount จนหน้าขาว

**แผนแก้ไข:**  
เปลี่ยนเป็น `useRef` + hidden `<input>` pattern แบบเดียวกับ `topImgRef` / `botImgRef`:

```js
// เพิ่ม ref
const logoImgRef = useRef(null);

// ใน JSX — วาง input ซ่อนไว้
<input ref={logoImgRef} type="file" accept="image/*"
  onChange={e=>{
    const f=e.target.files?.[0]; if(!f)return;
    const r=new FileReader();
    r.onload=ev=>setD(p=>({...p,logos:[...(p.logos||[]),
      {url:ev.target.result,pos:"50% 50%",zoom:100}]}));
    r.readAsDataURL(f);
    e.target.value="";
  }}
  style={{display:"none"}}/>

// ปุ่ม + เรียก
<button onClick={()=>logoImgRef.current?.click()}>+</button>
```

---

### 🐛 Bug 3 — ปุ่มปิดลวดลายพื้นหลัง ไม่ทำงาน

**สาเหตุ:**  
ปุ่ม "ลวดลาย" toggle `showBgPat` ซึ่งซ่อน overlay layer ภายใน header/content/footer ได้ถูกต้อง แต่ **canvas หลัก** (root div ของ Preview, line 484) มี `backgroundImage:bg` ฝังอยู่โดยตรงโดยไม่เช็ค `showBgPat`:

```js
// ❌ ปัจจุบัน (line 484)
<div style={{..., backgroundImage:bg, backgroundSize:bgSz}}>

// ✅ แก้ไขเป็น
<div style={{..., 
  backgroundImage: showBgPat ? bg : "none",
  backgroundSize: bgSz
}}>
```

---

## 4. Feature ใหม่ — ภาพตกแต่ง 6 ภาพบน Strip

### ภาพรวม
เพิ่มช่องอัปโหลดภาพตกแต่ง 6 ชิ้น ที่:
- แสดงทับอยู่บน/รอบ strip area (default z-index สูงสุด = อยู่หน้าทุกอย่าง)
- Drag เพื่อย้ายตำแหน่งได้อิสระทั้ง canvas
- Pinch (หุบ/ถ่าง) หรือ scroll wheel เพื่อ resize (ปรับขนาดจริง ≠ crop zoom)
- ปรับลำดับ layer (z-index) ได้จาก UI

### State ใหม่

```js
// โครงสร้างข้อมูลแต่ละภาพ
{
  url: "",          // base64 dataURL
  x: 0,            // ตำแหน่ง px จากซ้าย
  y: 200,          // ตำแหน่ง px จากบน (default บริเวณ strip ~HEADER_H)
  w: 120,          // ความกว้าง px
  h: 120,          // ความสูง px
  layer: 6,        // z-index (1=หลังสุด, 6=หน้าสุด) default=6
  visible: true,   // แสดง/ซ่อน
}

// State array
const [decoImgs, setDecoImgs] = useState([null,null,null,null,null,null]);
// index 0–5 = slot 1–6, null = ยังไม่ได้อัปโหลด
```

### UI Panel (ฝั่ง form)

เพิ่ม section "🖼️ ภาพตกแต่ง Strip (6 ภาพ)" ใต้ theme settings:

```
┌─────────────────────────────────────────┐
│ 🖼️ ภาพตกแต่ง (จับ drag + หุบถ่างขนาด) │
│                                          │
│ [slot1] [slot2] [slot3]                 │
│ [slot4] [slot5] [slot6]                 │
│                                          │
│ แต่ละ slot แสดง: thumbnail / ปุ่ม +    │
│   Layer: [▼] [▲]  ● แสดง/ซ่อน  [✕]   │
└─────────────────────────────────────────┘
```

### Preview Component

เพิ่ม render loop สำหรับ deco images เหนือ strip:

```jsx
{decoImgs.map((img, i) => {
  if (!img || !img.url || !img.visible) return null;
  return (
    <div key={i}
      style={{
        position: "absolute",
        left: img.x, top: img.y,
        width: img.w, height: img.h,
        zIndex: 10 + img.layer,   // 11–16 (สูงกว่า strip zIndex=10)
        touchAction: "none",
        userSelect: "none",
        cursor: "move",
      }}
      onMouseDown={e => handleDecoDrag(i, e)}
      onTouchStart={e => handleDecoTouch(i, e)}
    >
      <img src={img.url}
        style={{width:"100%", height:"100%", objectFit:"contain",
          pointerEvents:"none"}}
        alt=""/>
    </div>
  );
})}
```

### Drag & Pinch-to-Resize Handler

```js
// Drag: อัปเดต x, y
const handleDecoDrag = (idx, e) => {
  e.preventDefault(); e.stopPropagation();
  const sx = e.clientX, sy = e.clientY;
  const ox = decoImgs[idx].x, oy = decoImgs[idx].y;
  const mv = ev => {
    setDecoImgs(p => p.map((img,i) => i===idx
      ? {...img, x: ox+(ev.clientX-sx)/scale, y: oy+(ev.clientY-sy)/scale}
      : img));
  };
  window.addEventListener("mousemove", mv);
  window.addEventListener("mouseup", ()=>window.removeEventListener("mousemove",mv), {once:true});
};

// Touch: แยก 1 finger = drag, 2 finger = pinch resize
const handleDecoTouch = (idx, e) => {
  if (e.touches.length === 1) {
    // single touch drag — similar to mouse
  } else if (e.touches.length === 2) {
    // pinch: คำนวณ distance เริ่มต้น → scale w,h ตามสัดส่วน
    const startDist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    const startW = decoImgs[idx].w;
    const startH = decoImgs[idx].h;
    const mv = ev => {
      const d = Math.hypot(
        ev.touches[0].clientX - ev.touches[1].clientX,
        ev.touches[0].clientY - ev.touches[1].clientY
      );
      const ratio = d / startDist;
      setDecoImgs(p => p.map((img,i) => i===idx
        ? {...img, w: Math.max(20, startW*ratio), h: Math.max(20, startH*ratio)}
        : img));
    };
    window.addEventListener("touchmove", mv, {passive:false});
    window.addEventListener("touchend", ()=>window.removeEventListener("touchmove",mv), {once:true});
  }
};
```

### Storage

เพิ่ม `decoImgs` ใน IndexedDB store (เพราะมีรูป base64 ขนาดใหญ่):

```js
// svImgs — เพิ่ม parameter
st.put(decoImgs || [], "decoImgs");

// ldImgs — เพิ่ม field
const decoImgs = await g("decoImgs");
return { ..., decoImgs: decoImgs || [] };
```

### Export (html2canvas)

ภาพตกแต่ง render เป็น absolute div ใน DOM อยู่แล้ว — html2canvas จะ capture ได้อัตโนมัติ ไม่ต้องทำอะไรพิเศษ

---

## 5. สรุปงานที่ต้องทำ (Priority)

| ลำดับ | รายการ | ความยาก | ผล |
|---|---|---|---|
| 1 | **Bug 3**: แก้ canvas root `backgroundImage` เช็ค `showBgPat` | ง่าย | ปุ่มลวดลายทำงาน |
| 2 | **Bug 2**: เปลี่ยน logo upload เป็น `useRef` pattern | ง่าย | ไม่ขาว |
| 3 | **Bug 1a**: แก้ `onHlDrag` ใช้ single `setD` | ง่ายมาก | headline drag ได้ |
| 4 | **Bug 1b**: เพิ่ม strip drag offset state + handler | ปานกลาง | strip drag ได้ |
| 5 | **Feature**: ภาพตกแต่ง 6 ภาพ (state + UI + render) | ปานกลาง | ภาพ deco |
| 6 | **Feature**: Pinch-to-resize + wheel resize | ปานกลาง | ขยาย/ย่อภาพ |
| 7 | **Feature**: Layer order UI (▼▲ ปุ่ม) | ง่าย | จัด z-index |
| 8 | **Feature**: บันทึก decoImgs ใน IndexedDB | ปานกลาง | persist |

---

## 6. จุดเสี่ยงที่ต้องระวัง

- **html2canvas + absolute positioned elements**: ต้องแน่ใจ `overflow:hidden` บน root canvas ไม่ clip deco images
- **scale factor**: handler drag ทุกตัวต้องหาร `scale` (prop จาก App) เพื่อให้ตำแหน่งถูกต้องเมื่อ preview ย่อขนาด
- **iOS touch**: `touchAction:"none"` บน element ที่ handle touch เอง, ใช้ `{passive:false}` กับ `touchmove` listener
- **IndexedDB size**: base64 รูป 6 ภาพอาจใหญ่ — ควร compress/resize ก่อนเก็บหากเกิน 2MB ต่อภาพ
- **z-index ชน strip**: strip ปัจจุบัน `zIndex:10` — deco images ควรใช้ `zIndex: 10 + layer` (11–16) แต่ต้องระวัง logo group `zIndex:2` และ content block `zIndex:1`
