const API = "http://localhost:3000/api";
let currentCandidate = null;
const user = JSON.parse(localStorage.getItem('dm_user')||'null');
if (!user) location.href = 'login.html';
async function loadCandidate(){
  const res = await fetch(`http://localhost:3000/api/swipe_candidate?me=${user.username}`);
  const data = await res.json();
  const card = document.getElementById('swipeCard');
  if (!data.candidate){ card.innerHTML = '<p>No more candidates — try changing preferences.</p>'; currentCandidate = null; return; }
  currentCandidate = data.candidate;
  card.innerHTML = `<div class="card"><img src="${data.candidate.photo||'https://via.placeholder.com/150'}" style="width:150px;height:150px;object-fit:cover"><h3>${data.candidate.display_name||data.candidate.username}</h3><p>${data.candidate.age} • ${data.candidate.gender} • ${data.candidate.city}</p><p>${data.candidate.bio||''}</p></div>`;
}
document.getElementById('yesBtn').addEventListener('click', async ()=>{
  if (!currentCandidate) return;
  const res = await fetch('http://localhost:3000/api/like',{ method:'POST', headers:{"Content-Type":"application/json"}, body: JSON.stringify({ from: user.username, to: currentCandidate.username }) });
  const j = await res.json();
  alert(j.message || (j.match ? "It's a match!" : "Liked"));
  await loadCandidate();
});
document.getElementById('noBtn').addEventListener('click', async ()=>{
  if (!currentCandidate) return;
  await fetch('http://localhost:3000/api/pass',{ method:'POST', headers:{"Content-Type":"application/json"}, body: JSON.stringify({ from: user.username, to: currentCandidate.username }) });
  await loadCandidate();
});
loadCandidate();
