// ===== CONFIG =====
const video = document.getElementById('video');
const statusText = document.getElementById('statusText');
const statusDot = document.getElementById('statusDot');
const aiStatus = document.getElementById('aiStatus');
const scanLine = document.getElementById('scanLine');
const faceFrame = document.getElementById('faceFrame');

// ===== START SYSTEM =====
async function startSystem() {
    try {
        aiStatus.innerText = "Loading AI Model...";

        await faceapi.nets.tinyFaceDetector.loadFromUri(
            "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/"
        );

        aiStatus.innerText = "Starting Camera...";
        startCamera();

    } catch (err) {
        console.error(err);
        aiStatus.innerText = "AI Load Failed";
    }
}

// ===== START CAMERA =====
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
        });

        video.srcObject = stream;

        video.onloadedmetadata = () => {
            video.play();
            startDetection();
        };

    } catch (err) {
        console.error(err);
        aiStatus.innerText = "Camera Error";
    }
}

// ===== FACE DETECTION LOOP =====
async function startDetection() {
    aiStatus.innerText = "System Ready";
    scanLine.style.display = "block";

    setInterval(async () => {
        const detections = await faceapi.detectAllFaces(
            video,
            new faceapi.TinyFaceDetectorOptions()
        );

        if (detections.length > 0) {
            // พบใบหน้า
            statusText.innerText = "Face Detected";
            statusText.className = "text-[11px] text-green-400 uppercase font-bold";
            statusDot.className = "w-2.5 h-2.5 rounded-full bg-green-400";

            faceFrame.classList.add("detected");

        } else {
            // ไม่พบใบหน้า
            statusText.innerText = "Scanning...";
            statusText.className = "text-[11px] text-yellow-500 uppercase font-bold";
            statusDot.className = "w-2.5 h-2.5 rounded-full bg-yellow-500";

            faceFrame.classList.remove("detected");
        }

    }, 300);
}

// ===== RUN =====
window.onload = startSystem;
