const SCRIPT_URL = "ใส่ URL Apps Script";

const video = document.getElementById("video");
const canvas = document.getElementById("overlay");
const statusText = document.getElementById("statusText");
const aiStatus = document.getElementById("aiStatus");

let faceMatcher;
let lastScan = 0;

// ===== INIT =====
async function init() {
    aiStatus.innerText = "Loading AI...";

    await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri("https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/"),
        faceapi.nets.faceLandmark68Net.loadFromUri("https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/"),
        faceapi.nets.faceRecognitionNet.loadFromUri("https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/")
    ]);

    aiStatus.innerText = "Loading Members...";
    await loadMembers();

    startCamera();
}

// ===== LOAD MEMBERS =====
async function loadMembers() {
    try {
        const res = await fetch(SCRIPT_URL + "?action=members");
        const members = await res.json();

        const labeled = members.map(m =>
            new faceapi.LabeledFaceDescriptors(
                m.name,
                [new Float32Array(m.descriptor)]
            )
        );

        faceMatcher = new faceapi.FaceMatcher(labeled, 0.5);

    } catch {
        faceMatcher = null;
    }
}

// ===== CAMERA =====
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;

        video.onloadedmetadata = () => {
            video.play();

            setTimeout(() => {
                const displaySize = {
                    width: video.videoWidth,
                    height: video.videoHeight
                };

                canvas.width = displaySize.width;
                canvas.height = displaySize.height;

                faceapi.matchDimensions(canvas, displaySize);

                detectLoop(displaySize);
                aiStatus.innerText = "System Ready";

            }, 800);
        };

    } catch (err) {
        aiStatus.innerText = "Camera Error";
        console.error(err);
    }
}

// ===== DETECT LOOP =====
function detectLoop(displaySize) {
    setInterval(async () => {

        if (video.readyState !== 4) return;

        const detections = await faceapi
            .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptors();

        const resized = faceapi.resizeResults(detections, displaySize);

        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (resized.length > 0) {
            faceapi.draw.drawDetections(canvas, resized);
            statusText.innerText = "Face Detected";
            statusText.style.color = "lime";

            if (faceMatcher) {
                const match = faceMatcher.findBestMatch(detections[0].descriptor);

                if (match.label !== "unknown") {
                    handleCheck(match.label);
                }
            }

        } else {
            statusText.innerText = "Scanning...";
            statusText.style.color = "yellow";
        }

    }, 700);
}

// ===== CHECK =====
async function handleCheck(name) {
    const now = Date.now();

    if (now - lastScan < 5000) return;
    lastScan = now;

    await fetch(SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify({
            action: "check",
            name: name,
            time: new Date().toLocaleString()
        })
    });

    console.log("Checked:", name);
}

// ===== REGISTER =====
async function registerFace(name) {
    const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

    if (!detection) {
        alert("ไม่พบใบหน้า");
        return;
    }

    await fetch(SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify({
            action: "register",
            name: name,
            descriptor: Array.from(detection.descriptor)
        })
    });

    alert("ลงทะเบียนสำเร็จ");
}

window.onload = init;
