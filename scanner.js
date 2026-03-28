/**
 * scanner.js - เวอร์ชันแก้ไขปัญหา "สแกนไม่ติด" และ "เปอร์เซ็นต์ไม่ขึ้น"
 */

// *** สำคัญ: นำ URL ที่ได้จากขั้นตอน Deploy ใน Apps Script มาวางที่นี่ ***
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxbfzoXvTkHDCbKV6qK-i-faXH1adNyFJ5YXjiZH7eb1llZN7BhtBBpW6boIpviHx_hKg/exec"; 

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

/**
 * 1. โหลด Model พร้อมระบบตรวจสอบความสำเร็จ
 */
async function init() {
    try {
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
        document.getElementById('aiStatus').innerText = "SYSTEM INITIALIZING...";
        
        // โหลด Models
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        
        isModelLoaded = true;
        document.getElementById('aiStatus').innerText = "AI ONLINE - READY";
        console.log("Models Loaded Successfully");
        
        await loadFaceDatabase();
        await startCamera();
    } catch (e) { 
        console.error("Model Load Error:", e);
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
        statusText.innerText = "Camera Access Denied";
    }
}

async function loadFaceDatabase() {
    if (!SCRIPT_URL || SCRIPT_URL.includes("YOUR_APPS_SCRIPT")) {
        console.warn("Script URL not found. Attendance will not work.");
        return;
    }
    try {
        const res = await fetch(`${SCRIPT_URL}?action=get_face_database`);
        const data = await res.json();
        
        if (data && data.length > 0) {
            const labeledDescriptors = data.map(m => {
                try {
                    const desc = new Float32Array(JSON.parse(m.faceData));
                    return new faceapi.LabeledFaceDescriptors(`${m.id}|${m.firstName} ${m.lastName}`, [desc]);
                } catch (err) { return null; }
            }).filter(x => x !== null);

            if (labeledDescriptors.length > 0) {
                // ปรับค่า Threshold เป็น 0.6 เพื่อให้สแกนติดง่ายขึ้น (0.4 = เข้มงวดมาก, 0.7 = หละหลวม)
                faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6); 
                console.log("Database Synced: " + labeledDescriptors.length + " users.");
            }
        } else {
            console.warn("No faces found in database.");
        }
    } catch (e) { 
        console.error("Database Error:", e);
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
                
                // เพิ่มเปอร์เซ็นต์ (เร่งความเร็วเมื่อเจอหน้าที่รู้จัก)
                scanValue += 10; 
                if (scanValue >= 100) {
                    scanValue = 100;
                    updateUIProgress();
                    await recordAttendance(id, name);
                }
            } else {
                // กรณีตรวจเจอหน้า แต่ไม่มีในฐานข้อมูล
                displayName.innerText = "UNKNOWN PERSON";
                displayID.innerText = "NOT REGISTERED";
                statusText.innerText = "UNAUTHORIZED ACCESS";
                statusDot.className = "w-2.5 h-2.5 rounded-full bg-red-500";
                // ลดเปอร์เซ็นต์ลงหากเป็นคนไม่รู้จัก
                scanValue = Math.max(0, scanValue - 15);
            }
        } else {
            statusText.innerText = "WAITING FOR DATABASE...";
        }
    } else {
        // ไม่เจอใบหน้าเลย
        faceFrame.classList.remove('detected');
        statusText.innerText = "SEARCHING FACE...";
        statusDot.className = "w-2.5 h-2.5 rounded-full bg-yellow-500";
        // ค่อยๆ ลดเปอร์เซ็นต์ลงเมื่อไม่เห็นหน้า
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
        // แสดง Overlay สำเร็จ
        document.getElementById('successOverlay').classList.remove('hidden');
        
        // ส่งข้อมูลไปยัง Google Apps Script
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // Apps Script ต้องใช้โหมดนี้
            body: JSON.stringify(payload)
        });

        statusText.innerText = "ATTENDANCE LOGGED!";
        
        // หน่วงเวลา 3 วินาทีเพื่อให้ผู้ใช้เห็นว่าสำเร็จ ก่อนจะเริ่มสแกนใหม่
        setTimeout(() => {
            document.getElementById('successOverlay').classList.add('hidden');
            scanValue = 0;
            updateUIProgress();
            isProcessing = false;
        }, 3000);

    } catch (e) {
        console.error("Recording error:", e);
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
    if (!f || !l) {
        alert("กรุณากรอกชื่อและนามสกุล");
        return;
    }

    document.getElementById('regForm').classList.add('hidden');
    document.getElementById('regProgress').classList.remove('hidden');

    let count = 0;
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
    
    const interval = setInterval(async () => {
        const d = await faceapi.detectSingleFace(video, options)
            .withFaceLandmarks().withFaceDescriptor();
        
        if (d) {
            count += 25;
            document.getElementById('regBar').style.width = count + "%";
            if (count >= 100) {
                clearInterval(interval);
                const autoId = "EMP-" + Math.floor(1000 + Math.random() * 9000);
                const payload = {
                    action: "register", id: autoId, firstName: f, lastName: l,
                    faceData: JSON.stringify(Array.from(d.descriptor))
                };
                
                try {
                    await fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
                    alert("ลงทะเบียนสำเร็จ! ID: " + autoId);
                    location.reload();
                } catch(e) {
                    alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
                    location.reload();
                }
            }
        }
    }, 400);
}

window.onload = init;
