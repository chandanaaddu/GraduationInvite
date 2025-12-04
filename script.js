const data = [
  {
    sno: 1,
    name: "Jasper Uncle",
    address: "1750 FM423, Frisco, TX 75033",
    time: "6:00 - 6:20 PM",
    verse: "Isaiah 9:6",
    map: "https://maps.app.goo.gl/gbrGSfHwL4eo8RXmB"
  },
  {
    sno: 2,
    name: "Vinod",
    address: "1690 FM 423, #2209 Frisco, TX 75033",
    time: "6:30 - 6:50 PM",
    verse: "Luke 2:10–11",
    map: "https://maps.app.goo.gl/gjHKpPyi87s1TeHyb"
  }
  // Add all 28 houses here
];

// Load status from local storage
function getStatus(sno) {
  return localStorage.getItem("status-" + sno) || "upcoming";
}

function setStatus(sno, status) {
  localStorage.setItem("status-" + sno, status);
  render();
}

function render() {
  const container = document.getElementById("container");
  container.innerHTML = "";

  data.forEach(item => {
    const card = document.createElement("div");
    card.className = "card";

    const status = getStatus(item.sno);

    card.innerHTML = `
      <h3>${item.sno}. ${item.name}</h3>
      <p><strong>Address:</strong> ${item.address}</p>
      <p><strong>Time:</strong> ${item.time}</p>
      <p><strong>Bible Verse:</strong> ${item.verse}</p>
      <a href="${item.map}" target="_blank">📍 Open in Google Maps</a><br><br>

      <span class="status ${status}">${status.toUpperCase()}</span><br>
      
      <button onclick="setStatus(${item.sno}, 'completed')">Mark Completed</button>
      <button onclick="setStatus(${item.sno}, 'upcoming')">Mark Upcoming</button>
      <button onclick="setStatus(${item.sno}, 'skipped')">Skip</button>
    `;

    container.appendChild(card);
  });
}

render();
