const SCRIPT_URL = "ใส่ URL Apps Script";

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
