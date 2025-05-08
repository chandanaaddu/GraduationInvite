const countdown = document.getElementById("countdown");
const eventDate = new Date("May 9, 2025 12:00:00").getTime();

const interval = setInterval(() => {
  const now = new Date().getTime();
  const distance = eventDate - now;

  if (distance < 0) {
    clearInterval(interval);
    countdown.innerHTML = "🎓 It's Graduation Time!";
    return;
  }

  const days = Math.floor(distance / (1000 * 60 * 60 * 24));
  const hours = Math.floor((distance / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((distance / (1000 * 60)) % 60);
  const seconds = Math.floor((distance / 1000) % 60);

  countdown.innerHTML = `Countdown: ${days}d ${hours}h ${minutes}m ${seconds}s`;
}, 1000);
