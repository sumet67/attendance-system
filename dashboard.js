const SCRIPT_URL = "ใส่ URL Apps Script";

async function loadData() {
    const res = await fetch(SCRIPT_URL);
    const data = await res.json();

    const table = document.getElementById("tableBody");
    table.innerHTML = "";

    data.reverse().forEach(row => {
        table.innerHTML += `
        <tr>
            <td>${row.date}</td>
            <td>${row.id}</td>
            <td>${row.name}</td>
            <td>${row.time}</td>
        </tr>`;
    });
}

window.onload = loadData;
