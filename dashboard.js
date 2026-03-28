/**
 * dashboard.js - ควบคุมการดึงข้อมูลประวัติการสแกน
 */

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzse7Kb_86YM_4p8lw1NBMxx9YnQAfN5ks6f0d0nQh8uhGtLM7p3tJi0tIwM4io7Y43zg/exec";

async function loadData() {
    if (SCRIPT_URL.includes("YOUR_APPS_SCRIPT")) return;
    
    const tableBody = document.getElementById('tableBody');
    const loader = document.getElementById('loader');
    loader.style.display = 'block';
    tableBody.innerHTML = '';

    try {
        const response = await fetch(`${SCRIPT_URL}?action=read`);
        const data = await response.json();
        
        loader.style.display = 'none';
        let done = 0, active = 0;
        let unique = new Set();
        const today = new Date().toLocaleDateString('th-TH');

        data.reverse().forEach(row => {
            unique.add(row.id);
            if (row.date === today) {
                if (row.status === "Completed") done++;
                else active++;
            }

            const tr = document.createElement('tr');
            tr.className = "hover:bg-white/5 transition";
            tr.innerHTML = `
                <td class="p-4 text-gray-500">${row.date}</td>
                <td class="p-4 text-cyan-400 font-mono font-bold">${row.id}</td>
                <td class="p-4 font-medium">${row.fullName}</td>
                <td class="p-4 text-green-400">${row.checkIn}</td>
                <td class="p-4 text-orange-400">${row.checkOut}</td>
                <td class="p-4 text-center">
                    <span class="status-pill ${row.status === 'Completed' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'}">
                        ${row.status}
                    </span>
                </td>
            `;
            tableBody.appendChild(tr);
        });

        document.getElementById('countTotal').innerText = unique.size;
        document.getElementById('countDone').innerText = done;
        document.getElementById('countActive').innerText = active;

    } catch (e) {
        loader.innerHTML = '<span class="text-red-500">Error Loading Data</span>';
    }
}

window.onload = loadData;
