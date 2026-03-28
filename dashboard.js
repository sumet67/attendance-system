/**
 * dashboard.js - ปรับปรุงการดึงข้อมูลและการแสดงผลให้เสถียรขึ้น
 */

// *** สำคัญ: ต้องนำ URL จากการ Deploy (New Deployment) ใน Apps Script มาใส่ที่นี่ ***
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxYlzp_OForA0YcMAfE6P3Q3wOH4dDPcdKhenjOUQT6mSATm-p3AzwUMuhNsFcx5mPyhQ/exec"; 

async function loadData() {
    const tableBody = document.getElementById('tableBody');
    const loader = document.getElementById('loader');
    const errorMsg = document.getElementById('error-msg');
    
    if (SCRIPT_URL.includes("XXXXXXXXXXXX")) {
        loader.style.display = 'none';
        errorMsg.classList.remove('hidden');
        errorMsg.innerText = "กรุณาใส่ SCRIPT_URL ในไฟล์ dashboard.js";
        return;
    }

    loader.style.display = 'block';
    errorMsg.classList.add('hidden');
    tableBody.innerHTML = '';

    try {
        const response = await fetch(`${SCRIPT_URL}?action=read`);
        const data = await response.json();
        
        loader.style.display = 'none';
        
        if (!data || data.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" class="p-10 text-center text-gray-600 cyber-font text-[10px]">NO ATTENDANCE DATA FOUND TODAY</td></tr>';
            return;
        }

        let done = 0, active = 0;
        let uniqueIds = new Set();
        
        // รับวันที่ปัจจุบันในรูปแบบที่ตรงกับใน Sheet (เช่น 28/3/2569)
        const now = new Date();
        const d = now.getDate();
        const m = now.getMonth() + 1;
        const yBE = now.getFullYear() + 543;
        const todayStr = `${d}/${m}/${yBE}`;

        // แสดงข้อมูลล่าสุดไว้บนสุด
        data.reverse().forEach(row => {
            uniqueIds.add(row.id);
            
            // เช็คสถานะสำหรับสรุปผลด้านบน (เฉพาะของวันนี้)
            if (row.date.includes(todayStr)) {
                if (row.status === "Completed") done++;
                else active++;
            }

            const tr = document.createElement('tr');
            tr.className = "hover:bg-white/[0.02] transition-colors";
            
            // รวมชื่อถ้าใน JSON ส่งมาแยกกัน หรือใช้ fullName ถ้ามีมาให้แล้ว
            const fullName = row.fullName || `${row.firstName || ''} ${row.lastName || ''}`.trim();

            tr.innerHTML = `
                <td class="p-4 text-gray-500 text-xs">${row.date}</td>
                <td class="p-4 text-cyan-400 font-mono font-bold text-xs">${row.id}</td>
                <td class="p-4 font-medium">${fullName}</td>
                <td class="p-4 text-green-400 font-mono">${row.checkIn}</td>
                <td class="p-4 ${row.checkOut === '-' ? 'text-gray-700 italic' : 'text-orange-400 font-mono'}">
                    ${row.checkOut === '-' ? 'Waiting...' : row.checkOut}
                </td>
                <td class="p-4 text-center">
                    <span class="status-pill ${
                        row.status === 'Completed' 
                        ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                        : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                    }">
                        ${row.status === 'Completed' ? 'เรียบร้อย' : 'กำลังทำงาน'}
                    </span>
                </td>
            `;
            tableBody.appendChild(tr);
        });

        document.getElementById('countTotal').innerText = uniqueIds.size;
        document.getElementById('countDone').innerText = done;
        document.getElementById('countActive').innerText = active;

    } catch (e) {
        console.error("Dashboard Load Error:", e);
        loader.style.display = 'none';
        errorMsg.classList.remove('hidden');
        errorMsg.innerText = "การเชื่อมต่อผิดพลาด: " + e.message;
    }
}

// โหลดข้อมูลทันทีที่เปิดหน้า
window.onload = loadData;
