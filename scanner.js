// ===== CONFIG =====
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwzWrYAmYGat5KF3WCsVEAlzz5SEzDGa8XtfZ45KhL7FrdXT3TivqNeCLQHwctKRFzi5Q/exec";

let labeledDescriptors = [];
let faceMatcher;
let lastScan = 0;

// ===== START =====
async function init() {
    document.getElementById("aiStatus").innerText = "Loading AI...";

    await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri("https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/"),
        faceapi.nets.faceLandmark68Net.loadFromUri("https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/"),
        faceapi.nets.faceRecognitionNet.loadFromUri("https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/")
    ]);

    await loadMembers();

    startCamera();
}

// ===== LOAD MEMBERS =====
async function loadMembers() {
    const res = await fetch(SCRIPT_URL + "?action=members");
    const members = await res.json();

    labeledDescriptors = members.map(m => {
        return new faceapi.LabeledFaceDescriptors(
            m.name,
            [new Float32Array(m.descriptor)]
        );
    });

    faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.5);
}

// ===== CAMERA =====
async function startCamera() {
    const video = document.getElementById("video");

    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;

    video.onloadedmetadata = () => {
        video.play();
        detectLoop();
    };
}

// ===== DETECT =====
async function detectLoop() {
    const video = document.getElementById("video");

    setInterval(async () => {
        const detection = await faceapi
            .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (detection) {
            const match = faceMatcher.findBestMatch(detection.descriptor);

            if (match.label !== "unknown") {
                handleCheck(match.label);
            }

        }

    }, 800);
}

// ===== CHECK IN/OUT =====
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

    console.log("Check:", name);
}

// ===== REGISTER =====
async function registerFace(name) {
    const video = document.getElementById("video");

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
    location.reload();
}

window.onload = init;
