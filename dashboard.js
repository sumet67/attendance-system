const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwzWrYAmYGat5KF3WCsVEAlzz5SEzDGa8XtfZ45KhL7FrdXT3TivqNeCLQHwctKRFzi5Q/exec";

async function loadData() {
    const res = await fetch(SCRIPT_URL);
    const data = await res.json();

    const table = document.getElementById("tableBody");
    table.innerHTML = "";

    data.reverse().forEach(row => {
        table.innerHTML += `
        <tr>
            <td>${row.name}</td>
            <td>${row.time}</td>
        </tr>`;
    });
}

window.onload = loadData;
