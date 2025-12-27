const socket = io("http://localhost:3000");
const user = getUser();
if (!user && window.location.pathname.endsWith('dashboard.html')) location.href='login.html';
if (user && document.getElementById("displayName")) document.getElementById("displayName").innerText = user.display_name || user.username;
socket.emit && socket.emit("join", user?.username || "");

// load people with filters
async function loadPeople(){
  const gender = document.getElementById("filterGender")?.value || "Any";
  const minAge = document.getElementById("filterMinAge")?.value || "";
  const maxAge = document.getElementById("filterMaxAge")?.value || "";
  const city = document.getElementById("filterCity")?.value || "";
  const q = new URLSearchParams({ gender, minAge, maxAge, city, me: user?.username }).toString();
  const res = await fetch(`http://localhost:3000/api/users?${q}`);
  const rows = await res.json();
  const peopleDiv = document.getElementById("people"); peopleDiv.innerHTML = "";
  rows.forEach(p=>{
    const card = document.createElement('div'); card.className='card';
    card.innerHTML = `<img src="${p.photo||'https://via.placeholder.com/80'}" style="width:80px;height:80px;object-fit:cover"><br><b>${p.display_name||p.username}</b><br>${p.age} • ${p.gender} • ${p.city}<p>${p.bio||''}</p><button class="likeBtn">💖 Like</button> <button class="chatBtn">Chat</button>`;
    card.querySelector('.likeBtn').onclick = async ()=>{ const r = await fetch('http://localhost:3000/api/like',{ method:'POST', headers:{"Content-Type":"application/json"}, body: JSON.stringify({ from: user.username, to: p.username }) }); const j = await r.json(); alert(j.message || (j.match ? 'Match!' : 'Liked')); loadMatches(); };
    card.querySelector('.chatBtn').onclick = ()=> openChat(p.username, p.display_name||p.username);
    peopleDiv.appendChild(card);
  });
}

async function loadMatches(){
  const res = await fetch(`http://localhost:3000/api/matches?username=${user.username}`);
  const rows = await res.json();
  const matchesDiv = document.getElementById('matches'); matchesDiv.innerHTML = "";
  rows.forEach(m=>{ const btn = document.createElement('div'); btn.className='match'; btn.innerHTML = `${m} <button onclick="openChat('${m}','${m}')">Chat</button>`; matchesDiv.appendChild(btn); });
}

document.getElementById('applyFilters')?.addEventListener('click', loadPeople);
window.loadPeople = loadPeople; window.loadMatches = loadMatches;
loadPeople(); loadMatches();
socket.on('match',(payload)=>{ if(payload?.with){ alert('New match with '+payload.with); loadMatches(); } });
