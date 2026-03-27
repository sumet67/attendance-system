/**
 * scanner.js - ควบคุมการทำงานของหน้าสแกนใบหน้า
 */

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwt7Db8-Ok1J3MRmVzgthN4QkokmQhwumJdCNFT9qGH6Ry12H7u3QnxQkP-6DDjJigdqA/exec"; 

const video = document.getElementById('video');
const faceFrame = document.getElementById('faceFrame');
const progressBar = document.getElementById('progressBar');
const statusText = document.getElementById('statusText');
const statusDot = document.getElementById('statusDot');
const displayName = document.getElementById('displayName');
const displayID = document.getElementById('displayID');

let faceMatcher = null;
let isModelLoaded = false;
let isProcessing = false;
let isPaused = false;
let scanValue = 0;

// เริ่มต้นระบบ
async function init() {
    try {
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        isModelLoaded = true;
        document.getElementById('aiStatus').innerText = "AI IDENTITY ACTIVE";
        loadFaceDatabase();
        startCamera();
    } catch (e) { 
        document.getElementById('aiStatus').innerText = "SYSTEM ERROR";
    }
}

// เปิดกล้อง
async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    video.onloadedmetadata = () => detectLoop();
}

// โหลดฐานข้อมูลใบหน้าจาก Google Sheets
async function loadFaceDatabase() {
    if (SCRIPT_URL.includes("YOUR_APPS_SCRIPT")) return;
    try {
        const res = await fetch(`${SCRIPT_URL}?action=get_face_database`);
        const data = await res.json();
        if (data.length > 0) {
            const labeledDescriptors = data.map(m => {
                const desc = new Float32Array(JSON.parse(m.faceData));
                return new faceapi.LabeledFaceDescriptors(`${m.id}|${m.firstName} ${m.lastName}`, [desc]);
            }).filter(x => x);
            faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.5);
        }
    } catch (e) { console.error("Database Load Failed"); }
}

// ลูปตรวจจับใบหน้า
async function detectLoop() {
    setInterval(async () => {
        if (isProcessing || isPaused || !isModelLoaded) return;

        const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
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
                    statusText.innerText = "Verified: " + name;
                    statusDot.className = "w-3 h-3 rounded-full bg-green-500 animate-pulse";
                    
                    scanValue += 10;
                    if (scanValue >= 100) await recordAttendance(id, name);
                } else {
                    displayName.innerText = "Unknown Person";
                    statusText.innerText = "Unauthorized Face";
                    statusDot.className = "w-3 h-3 rounded-full bg-red-500";
                    scanValue = 0;
                }
            }
        } else {
            faceFrame.classList.remove('detected');
            statusText.innerText = "Scanning Area...";
            statusDot.className = "w-3 h-3 rounded-full bg-yellow-500";
            scanValue = Math.max(0, scanValue - 5);
        }
        progressBar.style.width = scanValue + "%";
    }, 200);
}

// บันทึกเวลาเข้า-ออก
async function recordAttendance(id, fullName) {
    isProcessing = true;
    const [f, l] = fullName.split(' ');
    const payload = { action: "attendance", id, firstName: f, lastName: l };
    
    try {
        const res = await fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
        document.getElementById('successOverlay').classList.remove('hidden');
        statusText.innerText = "Attendance Logged";
        setTimeout(() => {
            document.getElementById('successOverlay').classList.add('hidden');
            scanValue = 0;
            isProcessing = false;
        }, 3000);
    } catch (e) { isProcessing = false; }
}

// ฟังก์ชันเปิด-ปิด Modal ลงทะเบียน
function openReg() { isPaused = true; document.getElementById('registration-modal').style.display = 'flex'; }
function closeReg() { isPaused = false; document.getElementById('registration-modal').style.display = 'none'; }

// บันทึกสมาชิกใหม่
async function saveMember() {
    const f = document.getElementById('regFName').value;
    const l = document.getElementById('regLName').value;
    if (!f || !l) return alert("กรุณาระบุชื่อ-นามสกุล");

    document.getElementById('regForm').classList.add('hidden');
    document.getElementById('regProgress').classList.remove('hidden');

    let count = 0;
    const interval = setInterval(async () => {
        const d = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks().withFaceDescriptor();
        
        if (d) {
            count += 25;
            document.getElementById('regBar').style.width = count + "%";
            if (count >= 100) {
                clearInterval(interval);
                const id = "EMP-" + Math.floor(1000 + Math.random() * 9000);
                const payload = {
                    action: "register",
                    id, firstName: f, lastName: l,
                    faceData: JSON.stringify(Array.from(d.descriptor))
                };
                await fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
                alert("ลงทะเบียนสำเร็จ!");
                location.reload();
            }
        }
    }, 500);
}

window.onload = init;
