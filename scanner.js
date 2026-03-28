/**
 * scanner.js - เวอร์ชันแก้ปัญหา "สแกนไม่ติด" และ "ดึงฐานข้อมูลไม่ได้"
 */

// *** สำคัญที่สุด: ตรวจสอบ URL นี้ให้ถูกต้อง (ต้องลงท้ายด้วย /exec) ***
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwAAlkW_ly5xbkMZRHICPylIMFcgQDd4DXyvlVK_NmyHobW9WE1j3lLchdGFEEktLWCZA/exec"; 

const video = document.getElementById('video');
const faceFrame = document.getElementById('faceFrame');
const progressBar = document.getElementById('progressBar');
const statusText = document.getElementById('statusText');
const statusDot = document.getElementById('statusDot');
const displayName = document.getElementById('displayName');
const displayID = document.getElementById('displayID');
const scanPercent = document.getElementById('scanPercent');

let faceMatcher = null;
let isModelLoaded = false;
let isProcessing = false;
let isPaused = false;
let scanValue = 0;
let dbUserCount = 0;

/**
 * 1. โหลด Model พร้อมระบบตรวจสอบความสำเร็จ
 */
async function init() {
    try {
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
        document.getElementById('aiStatus').innerText = "SYSTEM INITIALIZING...";
        
        // โหลด Models ทั้งหมด
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        
        isModelLoaded = true;
        document.getElementById('aiStatus').innerText = "AI ONLINE - READY";
        console.log("✅ Models Loaded Successfully");
        
        await loadFaceDatabase();
        await startCamera();
    } catch (e) { 
        console.error("❌ Model Load Error:", e);
        document.getElementById('aiStatus').innerText = "AI OFFLINE (RELOAD NEEDED)";
        statusText.innerText = "Error: Check Connection";
    }
}

async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 640 }, 
                height: { ideal: 480 }, 
                facingMode: "user" 
            } 
        });
        video.srcObject = stream;
        video.onloadedmetadata = () => {
            document.getElementById('scanLine').style.display = 'block';
            detectLoop();
        };
    } catch (e) {
        console.error("❌ Camera Error:", e);
        statusText.innerText = "Camera Access Denied";
    }
}

/**
 * ดึงฐานข้อมูลใบหน้าจาก Google Sheets
 */
async function loadFaceDatabase() {
    if (!SCRIPT_URL || SCRIPT_URL.includes("YOUR_APPS_SCRIPT")) {
        console.warn("⚠️ SCRIPT_URL is missing!");
        return;
    }
    try {
        console.log("📡 Fetching face database...");
        const res = await fetch(`${SCRIPT_URL}?action=get_face_database`);
        const data = await res.json();
        
        if (data && data.length > 0) {
            const labeledDescriptors = data.map(m => {
                try {
                    if (!m.faceData) return null;
                    const desc = new Float32Array(JSON.parse(m.faceData));
                    return new faceapi.LabeledFaceDescriptors(`${m.id}|${m.firstName} ${m.lastName}`, [desc]);
                } catch (err) { return null; }
            }).filter(x => x !== null);

            if (labeledDescriptors.length > 0) {
                // ปรับ Threshold เป็น 0.5 (ให้จำหน้าง่ายขึ้น ลดโอกาสติด Unknown)
                faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.5); 
                dbUserCount = labeledDescriptors.length;
                console.log(`✅ Database Synced: ${dbUserCount} users.`);
            }
        } else {
            console.warn("⚠️ No faces found in database (ชีต Members อาจจะว่าง)");
        }
    } catch (e) { 
        console.error("❌ Database Error:", e);
        statusText.innerText = "DB Sync Failed";
    }
}

/**
 * 2. Loop การตรวจจับใบหน้า
 */
async function detectLoop() {
    if (isProcessing || isPaused || !isModelLoaded) {
        requestAnimationFrame(detectLoop);
        return;
    }

    // ใช้การตรวจจับแบบ Tiny (เร็วและประหยัดทรัพยากร)
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
    
    const detection = await faceapi.detectSingleFace(video, options)
        .withFaceLandmarks()
        .withFaceDescriptor();

    if (detection) {
        faceFrame.classList.add('detected');
        
        if (faceMatcher) {
            const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
            
            if (bestMatch.label !== 'unknown') {
                const [id, name] = bestMatch.label.split('|');
                displayName.innerText = name;
                displayID.innerText = `ID: ${id}`;
                statusText.innerText = "VERIFYING IDENTITY...";
                statusDot.className = "w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse";
                
                // เพิ่มเปอร์เซ็นต์ (เร่งความเร็ว)
                scanValue += 8; 
                if (scanValue >= 100) {
                    scanValue = 100;
                    updateUIProgress();
                    await recordAttendance(id, name);
                }
            } else {
                // กรณีตรวจเจอหน้า แต่ AI บอกว่าไม่เหมือนใครในฐานข้อมูลเลย
                displayName.innerText = "UNKNOWN PERSON";
                displayID.innerText = "NOT IN DATABASE";
                statusText.innerText = "UNAUTHORIZED ACCESS";
                statusDot.className = "w-2.5 h-2.5 rounded-full bg-red-500";
                scanValue = Math.max(0, scanValue - 10);
            }
        } else {
            // กรณีลืมตั้ง URL หรือดึง DB ไม่มา
            statusText.innerText = dbUserCount === 0 ? "NO USERS IN DB" : "SYNCING DB...";
        }
    } else {
        // ไม่เจอใบหน้าเลย (AI มองไม่เห็นหน้า)
        faceFrame.classList.remove('detected');
        statusText.innerText = "SEARCHING FACE...";
        statusDot.className = "w-2.5 h-2.5 rounded-full bg-yellow-500";
        scanValue = Math.max(0, scanValue - 5);
        displayName.innerText = "READY TO SCAN";
        displayID.innerText = "WAIT FOR IDENTITY";
    }

    updateUIProgress();
    requestAnimationFrame(detectLoop);
}

function updateUIProgress() {
    progressBar.style.width = scanValue + "%";
    scanPercent.innerText = Math.floor(scanValue) + "%";
}

/**
 * 3. บันทึกข้อมูลเข้า Google Sheets
 */
async function recordAttendance(id, fullName) {
    if (isProcessing) return;
    isProcessing = true;
    
    statusText.innerText = "RECORDING DATA...";
    const [f, l] = fullName.split(' ');
    const payload = { action: "attendance", id, firstName: f, lastName: l };
    
    try {
        document.getElementById('successOverlay').classList.remove('hidden');
        
        // ส่งข้อมูลแบบ POST
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(payload)
        });

        // หน่วงเวลาให้ผู้ใช้เห็นว่าสำเร็จ
        setTimeout(() => {
            document.getElementById('successOverlay').classList.add('hidden');
            scanValue = 0;
            updateUIProgress();
            isProcessing = false;
        }, 3000);

    } catch (e) {
        console.error("❌ Recording error:", e);
        statusText.innerText = "NETWORK ERROR";
        isProcessing = false;
    }
}

/**
 * 4. การลงทะเบียนใหม่
 */
function openReg() { isPaused = true; document.getElementById('registration-modal').classList.remove('hidden'); }
function closeReg() { isPaused = false; document.getElementById('registration-modal').classList.add('hidden'); }

async function saveMember() {
    const f = document.getElementById('regFName').value;
    const l = document.getElementById('regLName').value;
    if (!f || !l) return;

    document.getElementById('regForm').classList.add('hidden');
    document.getElementById('regProgress').classList.remove('hidden');

    let count = 0;
    const interval = setInterval(async () => {
        const d = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
        if (d) {
            count += 20;
            document.getElementById('regBar').style.width = count + "%";
            if (count >= 100) {
                clearInterval(interval);
                const autoId = "EMP-" + Math.floor(1000 + Math.random() * 9000);
                const payload = {
                    action: "register", id: autoId, firstName: f, lastName: l,
                    faceData: JSON.stringify(Array.from(d.descriptor))
                };
                await fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
                alert("สำเร็จ! กรุณารอระบบรีโหลด");
                location.reload();
            }
        }
    }, 400);
}

window.onload = init;
