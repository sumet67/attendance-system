const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxuCOPWiU_-52BCVOznPZx3wIgAPtdQFPylKdcEgBn_bFHMNnTCgXTXZT3o7TiP0q0-SQ/exec";

async function loadData() {
    const res = await fetch(SCRIPT_URL);
    const data = await res.json();

    const table = document.getElementById("tableBody");

    data.reverse().forEach(row => {
        table.innerHTML += `
        <tr>
            <td>${row.name}</td>
            <td>${row.time}</td>
        </tr>`;
    });
}

window.onload = loadData;
