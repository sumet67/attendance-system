/**
 * scanner.js - เวอร์ชันปรับปรุงการตรวจจับใบหน้า (Enhanced Detection)
 */

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
        
        // ใช้การโหลดแบบระบุชื่อโมเดลให้ชัดเจน
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        
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
    if (!SCRIPT_URL || SCRIPT_URL.includes("YOUR_APPS_SCRIPT")) return;
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
                faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.55); // ปรับค่า Threshold ให้แม่นยำขึ้น
                console.log("Database Synced");
            }
        }
    } catch (e) { console.error("Database Error:", e); }
}

/**
 * 2. ปรับปรุง Loop การตรวจจับ (Detection Loop)
 */
async function detectLoop() {
    if (isProcessing || isPaused || !isModelLoaded) {
        setTimeout(detectLoop, 200);
        return;
    }

    // ปรับ Options ให้ตรวจจับได้กว้างขึ้น (inputSize: 416 หรือ 512 จะแม่นกว่าแต่ช้ากว่านิดหน่อย)
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
    
    const detection = await faceapi.detectSingleFace(video, options)
        .withFaceLandmarks()
        .withFaceDescriptor();

    if (detection) {
        // เมื่อเจอใบหน้า ให้แสดงกรอบสีฟ้า
        faceFrame.classList.add('detected');
        faceFrame.style.border = "2px solid #00f2ff";
        
        if (faceMatcher) {
            const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
            
            if (bestMatch.label !== 'unknown') {
                const [id, name] = bestMatch.label.split('|');
                displayName.innerText = name;
                displayID.innerText = `ID: ${id}`;
                statusText.innerText = "IDENTIFIED";
                statusDot.className = "w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse";
                
                scanValue += 20; // เพิ่มความเร็วในการสแกน
                if (scanValue >= 100) {
                    scanValue = 100;
                    updateUIProgress();
                    await recordAttendance(id, name);
                }
            } else {
                displayName.innerText = "UNKNOWN";
                displayID.innerText = "ACCESS DENIED";
                statusText.innerText = "UNREGISTERED FACE";
                statusDot.className = "w-2.5 h-2.5 rounded-full bg-red-500";
                scanValue = Math.max(0, scanValue - 10);
            }
        }
    } else {
        // เมื่อไม่เจอใบหน้า
        faceFrame.classList.remove('detected');
        faceFrame.style.border = "1px solid rgba(255,255,255,0.2)";
        statusText.innerText = "SEARCHING FACE...";
        statusDot.className = "w-2.5 h-2.5 rounded-full bg-yellow-500";
        scanValue = Math.max(0, scanValue - 5);
    }

    updateUIProgress();
    // ปรับความถี่ในการสแกน (100ms คือ 10 ครั้งต่อวินาที)
    requestAnimationFrame(detectLoop);
}

function updateUIProgress() {
    progressBar.style.width = scanValue + "%";
    scanPercent.innerText = Math.floor(scanValue) + "%";
}

async function recordAttendance(id, fullName) {
    if (isProcessing) return;
    isProcessing = true;
    
    const [f, l] = fullName.split(' ');
    const payload = { action: "attendance", id, firstName: f, lastName: l };
    
    try {
        document.getElementById('successOverlay').classList.remove('hidden');
        
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(payload)
        });

        // หน่วงเวลาเพื่อให้ผู้ใช้เห็นข้อความแจ้งเตือน "สแกนแล้ว" จากระบบ
        setTimeout(() => {
            document.getElementById('successOverlay').classList.add('hidden');
            scanValue = 0;
            isProcessing = false;
        }, 2000);
    } catch (e) {
        isProcessing = false;
        statusText.innerText = "NETWORK ERROR";
    }
}

function openReg() { isPaused = true; document.getElementById('registration-modal').classList.remove('hidden'); }
function closeReg() { isPaused = false; document.getElementById('registration-modal').classList.add('hidden'); }

async function saveMember() {
    const f = document.getElementById('regFName').value;
    const l = document.getElementById('regLName').value;
    if (!f || !l) return;

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
                await fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
                location.reload();
            }
        }
    }, 500);
}

window.onload = init;
