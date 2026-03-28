// ===== CONFIG =====
const SCRIPT_URL = "ใส่ URL Apps Script ตรงนี้";

const video = document.getElementById('video');
const statusText = document.getElementById('statusText');
const statusDot = document.getElementById('statusDot');
const aiStatus = document.getElementById('aiStatus');

let lastScan = 0;

// ===== START SYSTEM =====
async function startSystem() {
    aiStatus.innerText = "Loading AI...";

    await faceapi.nets.tinyFaceDetector.loadFromUri(
        "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/"
    );

    aiStatus.innerText = "Starting Camera...";
    startCamera();
}

// ===== CAMERA =====
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;

        video.onloadedmetadata = () => {
            video.play();
            detectLoop();
        };
    } catch (err) {
        aiStatus.innerText = "Camera Error";
        console.error(err);
    }
}

// ===== DETECT LOOP =====
async function detectLoop() {
    aiStatus.innerText = "System Ready";

    setInterval(async () => {
        const detections = await faceapi.detectAllFaces(
            video,
            new faceapi.TinyFaceDetectorOptions()
        );

        if (detections.length > 0) {
            statusText.innerText = "Face Detected";
            statusText.style.color = "lime";
            statusDot.style.background = "lime";

            const now = Date.now();

            if (now - lastScan > 5000) {
                lastScan = now;
                sendData();
            }

        } else {
            statusText.innerText = "Scanning...";
            statusText.style.color = "yellow";
            statusDot.style.background = "yellow";
        }

    }, 500);
}

// ===== SEND TO GOOGLE SHEET =====
async function sendData() {
    try {
        await fetch(SCRIPT_URL, {
            method: "POST",
            body: JSON.stringify({
                id: "EMP001",
                name: "Demo User",
                time: new Date().toLocaleString()
            })
        });

        console.log("ส่งข้อมูลแล้ว");
    } catch (err) {
        console.error("ส่งข้อมูลล้มเหลว", err);
    }
}

// ===== RUN =====
window.onload = startSystem;
