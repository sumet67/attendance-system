const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyPoRuN97fOiJJrk-G3gOA8iPC-5VeAEnQxf_y0IhYxe3uEZKIJlF6TXNckdtDBYHIVHw/exec";

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
