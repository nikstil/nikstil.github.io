// Change these words to things you like
const likes = ["art", "games", "anime", "movies", "fashion"];
let current = 0;

// The current year in the footer
const showYear = () => {
  document.querySelector("#year").textContent = new Date().getFullYear();
};

// "I like ..." shows the next word
const showNextLike = () => {
  current = (current + 1) % likes.length;
  document.querySelector("#like").textContent = likes[current];
};

const init = () => {
  showYear();
  setInterval(showNextLike, 1500);
};

init();
