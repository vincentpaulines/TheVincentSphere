var bannerimages = [
  "dragonicoverlord.png",
  "evangelion.jpg",
  "richpiana.jpg", 
  "madokaandfriends.jpg",
  "yosuganosora.png",
  "pokemonblack.gif"
];

document.addEventListener('DOMContentLoaded', _ => {
  const randomIndex = Math.floor(Math.random() * bannerimages.length);
  document.getElementById('random-banner-image').src = "banners/" + bannerimages[randomIndex];
});