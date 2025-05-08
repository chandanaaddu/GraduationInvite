const countdownEl = document.getElementById("countdown");
const eventTime = new Date("May 9, 2025 12:00:00 CST").getTime();

const timer = setInterval(() => {
  const now = new Date().getTime();
  const gap = eventTime - now;

  if (gap < 0) {
    clearInterval(timer);
    countdownEl.innerHTML = "🎉 It's Graduation Time!";
    return;
  }

  const days = Math.floor(gap / (1000 * 60 * 60 * 24));
  const hours = Math.floor((gap / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((gap / (1000 * 60)) % 60);
  const seconds = Math.floor((gap / 1000) % 60);

  countdownEl.innerHTML = `
    <strong>${days}</strong> Days 
    <strong>${hours}</strong> Hours 
    <strong>${minutes}</strong> Minutes 
    <strong>${seconds}</strong> Seconds
  `;
}, 1000);

