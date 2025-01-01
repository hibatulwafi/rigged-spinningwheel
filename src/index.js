// Variable initialization
let ctx, rad, arc, angVel = 0, ang = 0, spinEl, spinButtonClicked = false;
let targetAngle = null;
let slowDown = false;

// Sectors data
const sectors = [
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
//3,4,5,8,9,11
// Helpers
function normalizeAngle(angle) {
  return (angle + 2 * Math.PI) % (2 * Math.PI);
}

function getSmallestOrderSector() {
  return sectors.reduce((prev, curr) => (
    curr.order_of_prizes < prev.order_of_prizes ? curr : prev
  ));
}

function initiateSector() {
  const diameter = ctx.canvas.width;
  rad = diameter / 2;
  arc = (2 * Math.PI) / sectors.length;

  return () => {
    const index = Math.floor((sectors.length - (ang / (2 * Math.PI)) * sectors.length) % sectors.length);
    return index >= 0 ? index : index + sectors.length;
  };
}

function drawSector(sector, i) {
  const angle = arc * i;
  ctx.save();
  ctx.beginPath();
  ctx.fillStyle = sector.color;
  ctx.moveTo(rad, rad);
  ctx.arc(rad, rad, rad, angle, angle + arc);
  ctx.lineTo(rad, rad);
  ctx.fill();

  ctx.translate(rad, rad);
  ctx.rotate(angle + arc / 2);
  ctx.textAlign = "right";
  ctx.fillStyle = sector.text;
  ctx.font = "20px 'Lato', sans-serif";
  ctx.fillText(sector.label, rad - 10, 10);
  ctx.restore();
}

function rotate() {
  ctx.canvas.style.transform = `rotate(${ang - Math.PI / 2}rad)`;  // Update posisi
  const currentSector = sectors[getIndex()];
  if (currentSector) {
    spinEl.textContent = !angVel ? "SPIN" : currentSector.label;
    spinEl.style.background = currentSector.color;
    spinEl.style.color = currentSector.text;
  } else {
    spinEl.textContent = "SPIN";
    spinEl.style.background = "#ccc";
    spinEl.style.color = "#000";
  }
}


function frame() {
  if (slowDown) {
    const diff = normalizeAngle(targetAngle - ang);

    if (diff < 0.1 && angVel < 0.1) {
      angVel = 0;
      ang = targetAngle;
      slowDown = false;
      spinButtonClicked = false;
      events.fire("spinEnd");
      return;
    }

    angVel *= 0.98; // Smooth deceleration
    if (diff < Math.PI / 4) {
      angVel = Math.max(angVel, 0.02); // Prevent stopping prematurely
    }
  }

  ang = normalizeAngle(ang + angVel);
  rotate();
}

function engine() {
  frame();
  requestAnimationFrame(engine);
}

function init() {
  spinEl = document.querySelector("#spin");
  ctx = document.querySelector("#wheel").getContext("2d");

  getIndex = initiateSector();
  sectors.forEach(drawSector);
  rotate();
  engine();

  spinEl.addEventListener("click", () => {
    if (!angVel && !spinButtonClicked) {
      const smallestOrderSector = getSmallestOrderSector();
      if (smallestOrderSector) {
        const targetIndex = sectors.indexOf(smallestOrderSector);
        const currentSectorIndex = getIndex();

        let relativeTargetAngle = arc * (targetIndex - currentSectorIndex);
        if (relativeTargetAngle < 0) relativeTargetAngle += 2 * Math.PI;

        targetAngle = normalizeAngle(ang + relativeTargetAngle);
        angVel = Math.random() * (0.5 - 0.3) + 0.3;
        spinButtonClicked = true;
        slowDown = true;
      }
    }
  });
}

// Initialize
init();

// Displays the modal with the winning message
function showWinModal(message) {
  const modalMessage = document.querySelector("#modalMessage");
  const modal = document.querySelector("#winModal");

  modalMessage.textContent = message;
  modal.style.display = "block";
}

// Retrieves a sector by its prize order
function getSectorByOrder(order) {
  return sectors.find(sector => sector.order_of_prizes === order);
}

// Updates the textarea with the sector labels
function updateTextarea() {
  const entriesTextArea = document.querySelector("#entriesTextArea");
  entriesTextArea.value = sectors.map(sector => sector.label).join("\n");
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

// Handles spin end event
events.addListener("spinEnd", () => {
  const smallestOrderSector = getSmallestOrderSector();
  if (smallestOrderSector) {
    // Menampilkan modal dengan pesan kemenangan
    showWinModal(`${smallestOrderSector.label}`);

    // Hapus sektor yang telah dipilih
    const index = sectors.indexOf(smallestOrderSector);
    if (index !== -1) sectors.splice(index, 1);


  } else {
    console.error("Tidak ada sektor yang tersisa!");
  }
});

// Create modal element
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

// Close modal button
const closeModal = document.querySelector("#closeModal");
closeModal.addEventListener("click", () => {
  // Re-init sektor dan gambar ulang roda
  getIndex = initiateSector();
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  sectors.forEach(drawSector);
  rotate();
  modal.style.display = "none";
});
