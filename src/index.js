// Variable initialization
let ctx, rad, arc, angVel = 0, ang = 0, spinEl, spinButtonClicked = false;
let targetAngle = null;
let slowDown = false;

// Array of predetermined winners in sequence
const guaranteedWinners = [
    "Gesang", // Pemenang pertama
    "Syahrul", // Pemenang kedua
    "Vivi", // Pemenang ketiga
    "Faqih", // Pemenang keempat
    "Ozi", // Pemenang kelima
    "Erika", // Pemenang keenam
    "Khansa", // Pemenang ketujuh
    "Elan", // Pemenang kedelapan
    "Heni", // Pemenang kesembilan
    "Rizal",
    "Fatin",
    "Wafi",
    "Ega",
    "Livia",
    // ... tambahkan pemenang lainnya sesuai urutan yang Anda inginkan
];

let currentWinnerIndex = 0; // Untuk melacak pemenang berikutnya dari guaranteedWinners

// Sectors data (order_of_prizes now just for general sorting, not specific spin order)
// Perhatikan bahwa sectors ini akan dimodifikasi (dihapus) saat pemenang terpilih.
let sectors = [
    { color: "#009925", text: "#333333", label: "Gesang", order_of_prizes: "1" },
    { color: "#EEB211", text: "#333333", label: "Heni", order_of_prizes: "9" },
    { color: "#D50F25", text: "#ffffff", label: "Syahrul", order_of_prizes: "2" },
    { color: "#3369E8", text: "#ffffff", label: "Rizal", order_of_prizes: "91" },
    { color: "#009925", text: "#333333", label: "Vivi", order_of_prizes: "3" },
    { color: "#EEB211", text: "#333333", label: "Fatin", order_of_prizes: "92" },
    { color: "#3369E8", text: "#ffffff", label: "Wafi", order_of_prizes: "93" },
    { color: "#009925", text: "#333333", label: "Ozi", order_of_prizes: "5" },
    { color: "#EEB211", text: "#333333", label: "Ega", order_of_prizes: "94" },
    { color: "#D50F25", text: "#ffffff", label: "Erika", order_of_prizes: "6" },
    { color: "#3369E8", text: "#ffffff", label: "Livia", order_of_prizes: "95" },
    { color: "#009925", text: "#333333", label: "Khansa", order_of_prizes: "7" },
    { color: "#EEB211", text: "#333333", label: "Faqih", order_of_prizes: "4" },
    { color: "#D50F25", text: "#ffffff", label: "Elan", order_of_prizes: "8" },
];

// Helpers
function normalizeAngle(angle) {
    // Memastikan sudut selalu positif dan dalam rentang 0 hingga 2*PI
    return (angle % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
}

function getIndexAtAngle(currentAngle, numSectors, arcLength) {
    // Indikator roda berada di posisi jam 12 (-Math.PI/2 radian) pada transform CSS
    // Kita perlu menyesuaikan sudut `ang` yang dihitung dari jam 3 (0 radian)
    let adjustedAngle = normalizeAngle(currentAngle + Math.PI / 2); // Putar sudut agar posisi jam 12 menjadi 0 radian

    // Karena roda berputar searah jarum jam, dan indeks sektor dihitung berlawanan arah jarum jam dari sumbu X positif,
    // kita perlu membalikkan arah perhitungan sudut untuk mendapatkan indeks yang benar.
    adjustedAngle = (2 * Math.PI) - adjustedAngle; 

    // Menghitung indeks sektor berdasarkan sudut yang disesuaikan
    return Math.floor(adjustedAngle / arcLength) % numSectors;
}

function initiateSector() {
    const diameter = ctx.canvas.width;
    rad = diameter / 2;
    // arc akan dihitung ulang di drawWheel() karena jumlah sektor bisa berubah
    arc = (2 * Math.PI) / sectors.length; 

    return () => {
        // Gunakan fungsi getIndexAtAngle yang lebih presisi
        return getIndexAtAngle(ang, sectors.length, arc);
    };
}

function drawSector(sector, i) {
    const angle = arc * i; // Sudut awal sektor
    ctx.save();
    ctx.beginPath();
    ctx.fillStyle = sector.color;
    ctx.moveTo(rad, rad);
    ctx.arc(rad, rad, rad, angle, angle + arc); // Menggambar busur sektor
    ctx.lineTo(rad, rad);
    ctx.fill();

    // Menggambar teks label di sektor
    ctx.translate(rad, rad); // Pindahkan origin ke tengah roda
    ctx.rotate(angle + arc / 2); // Putar ke tengah sektor
    ctx.textAlign = "right"; // Teks sejajar kanan
    ctx.fillStyle = sector.text;
    ctx.font = "20px 'Lato', sans-serif";
    ctx.fillText(sector.label, rad - 10, 10); // Gambar teks
    ctx.restore(); // Kembalikan state canvas
}

function rotate() {
    // Transformasi CSS untuk memutar elemen canvas.
    // ang - Math.PI / 2 membuat sektor 0 (yang biasanya di jam 3) bergeser ke jam 12.
    ctx.canvas.style.transform = `rotate(${ang - Math.PI / 2}rad)`; 
    
    const currentSector = sectors[getIndex()];
    if (currentSector) {
        spinEl.textContent = !angVel ? "SPIN" : currentSector.label;
        spinEl.style.background = currentSector.color;
        spinEl.style.color = currentSector.text;
    } else {
        // Jika tidak ada sektor tersisa
        spinEl.textContent = "SPIN";
        spinEl.style.background = "#ccc";
        spinEl.style.color = "#000";
    }
}

function frame() {
    if (slowDown) {
        let diff = targetAngle - ang;
        // Normalisasi diff agar selalu dalam rentang -PI hingga PI untuk perhitungan jarak terpendek
        diff = normalizeAngle(diff + Math.PI) - Math.PI;

        // Kondisi berhenti: jika sangat dekat dengan target dan kecepatan sangat rendah
        if (Math.abs(diff) < 0.005 && Math.abs(angVel) < 0.001) {
            angVel = 0;
            ang = targetAngle; // Pastikan berhenti tepat di target
            slowDown = false;
            spinButtonClicked = false;
            events.fire("spinEnd");
            return;
        }

        // Dekelerasi: kecepatan berkurang secara eksponensial
        angVel *= 0.96; 
        
        // Jika sudah sangat dekat dengan target, jaga kecepatan minimal agar tidak berhenti terlalu cepat
        // dan batasi kecepatan agar tidak "overshoot" atau "undershoot"
        if (Math.abs(diff) < Math.PI / 8) { // Jika dalam 1/8 putaran dari target
            angVel = Math.max(angVel, 0.005); // Menjaga kecepatan minimal
            if (angVel > 0.05) angVel = 0.05; // Membatasi kecepatan agar tidak terlalu cepat saat mendekat
        }
    }

    ang = normalizeAngle(ang + angVel); // Perbarui sudut roda
    rotate(); // Putar elemen roda secara visual
}

function engine() {
    frame(); // Jalankan satu frame animasi
    requestAnimationFrame(engine); // Minta frame berikutnya
}

function init() {
    spinEl = document.querySelector("#spin");
    ctx = document.querySelector("#wheel").getContext("2d");

    getIndex = initiateSector();
    drawWheel(); // Gambar roda pertama kali
    rotate(); // Set posisi awal roda
    engine(); // Mulai loop animasi

    spinEl.addEventListener("click", () => {
        // Hanya izinkan spin jika roda tidak sedang berputar
        if (!angVel && !spinButtonClicked) {
            if (currentWinnerIndex < guaranteedWinners.length) {
                const nextWinnerName = guaranteedWinners[currentWinnerIndex];
                // Cari sektor yang sesuai dengan pemenang berikutnya dari array sectors yang aktif
                const targetSector = sectors.find(sector => sector.label === nextWinnerName);

                if (targetSector) {
                    const targetIndex = sectors.indexOf(targetSector);
                    
                    // Hitung sudut pusat sektor target relatif terhadap sudut 0 (jam 3)
                    let sectorCenterAngle = (targetIndex * arc) + (arc / 2);
                    
                    // Kita ingin roda berhenti dengan pusat sektor target di posisi jam 12 (-Math.PI/2 radian)
                    // Karena roda berputar searah jarum jam, kita perlu menghitung sudut target yang dibalik
                    let desiredFinalAngle = normalizeAngle(-(sectorCenterAngle - Math.PI / 2));

                    // Untuk memastikan roda berputar minimal beberapa kali demi efek visual
                    const minRotations = 5; // Minimal 5 putaran penuh
                    let currentNormalizedAngle = normalizeAngle(ang);
                    
                    // Hitung targetAngle yang memastikan roda berputar beberapa kali
                    // Ini adalah kunci untuk memastikan roda selalu berhenti di target yang benar
                    targetAngle = currentNormalizedAngle + (minRotations * 2 * Math.PI) + normalizeAngle(desiredFinalAngle - currentNormalizedAngle + Math.PI) - Math.PI;

                    angVel = Math.random() * (0.5 - 0.3) + 0.3; // Kecepatan putar awal
                    spinButtonClicked = true; // Set flag bahwa tombol spin sudah ditekan
                    slowDown = true; // Mulai proses perlambatan
                } else {
                    alert(`Pemenang berikutnya '${nextWinnerName}' tidak ditemukan di roda! Mungkin sudah terpilih atau tidak ada.`);
                }
            } else {
                alert("Semua pemenang telah diambil! Roda kosong.");
                spinEl.textContent = "DONE";
                spinEl.style.background = "#ccc";
            }
        }
    });
}

// Function to draw or redraw the wheel
function drawWheel() {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); // Bersihkan canvas
    if (sectors.length > 0) { // Hanya gambar jika ada sektor
        arc = (2 * Math.PI) / sectors.length; // Hitung ulang besar busur per sektor
        sectors.forEach(drawSector); // Gambar setiap sektor
    } else {
        // Tampilkan pesan atau nonaktifkan tombol spin jika tidak ada sektor
        spinEl.textContent = "DONE";
        spinEl.style.background = "#ccc";
        spinEl.style.color = "#000";
        spinEl.removeEventListener("click", spinEl.eventListener); // Hapus event listener spin
    }
}

// Displays the modal with the winning message
function showWinModal(message) {
    const modalMessage = document.querySelector("#modalMessage");
    const modal = document.querySelector("#winModal");

    modalMessage.textContent = message;
    modal.style.display = "block";
}

const events = {
    listeners: {},
    addListener(eventName, fn) {
        this.listeners[eventName] = this.listeners[eventName] || [];
        this.listeners[eventName].push(fn);
    },
    fire(eventName, ...args) {
        if (this.listeners[eventName]) {
            this.listeners[eventName].forEach(fn => fn(...args));
        }
    },
};

// Handles spin end event: menampilkan modal pemenang
events.addListener("spinEnd", () => {
    const winningSector = sectors[getIndex()]; // Dapatkan sektor yang berhenti di indikator
    if (winningSector) {
        showWinModal(`${winningSector.label}`);
    } else {
        console.error("Tidak ada sektor yang terpilih, ini seharusnya tidak terjadi!");
    }
});

// Pastikan DOM sudah dimuat sebelum memanipulasi elemen
document.addEventListener("DOMContentLoaded", () => {
    // Buat elemen modal secara dinamis
    const modal = document.createElement("div");
    modal.id = "winModal";
    modal.style.display = "none";
    modal.innerHTML = `
        <div class="modal-content">
            <h2>We have a winner!</h2>
            <p style="font-size: 1.5rem;" id="modalMessage"></p>
            <button id="closeModal">Close</button>
        </div>
    `;
    document.body.appendChild(modal);

    // Event listener untuk tombol "Close" pada modal
    const closeModal = document.querySelector("#closeModal");
    closeModal.addEventListener("click", () => {
        const winningSectorLabel = document.querySelector("#modalMessage").textContent;
        // Cari sektor yang labelnya cocok dengan yang diumumkan di modal
        const winningSector = sectors.find(sector => sector.label === winningSectorLabel);
        
        if (winningSector) {
            const index = sectors.indexOf(winningSector);
            if (index !== -1) {
                sectors.splice(index, 1); // Hapus sektor yang sudah memenangkan dari array
            }
        }
        
        currentWinnerIndex++; // Majukan indeks ke pemenang berikutnya di daftar
        drawWheel(); // Gambar ulang roda dengan sektor yang tersisa
        rotate(); // Perbarui tampilan tombol spin (teks dan warna)
        modal.style.display = "none"; // Sembunyikan modal
        updateTextarea(); // Perbarui konten textarea di sidebar
    });

    // Inisialisasi aplikasi setelah DOM dimuat
    init();
    updateTextarea(); // Perbarui textarea awal
});

// Updates the textarea with the sector labels
function updateTextarea() {
    const entriesTextArea = document.querySelector("#entriesTextArea");
    entriesTextArea.value = sectors.map(sector => sector.label).join("\n");
}
