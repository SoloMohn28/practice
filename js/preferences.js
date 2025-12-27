const API = "http://localhost:3000/api";
const user = JSON.parse(localStorage.getItem('dm_user')||'null');
if (!user) location.href='login.html';
document.getElementById('prefForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const payload = {
    username: user.username,
    pref_gender: document.getElementById('pref_gender').value,
    pref_min_age: Number(document.getElementById('pref_min').value),
    pref_max_age: Number(document.getElementById('pref_max').value),
    pref_city: document.getElementById('pref_city').value || 'Any'
  };
  const res = await fetch(API + '/preferences', { method:'POST', headers:{"Content-Type":"application/json"}, body: JSON.stringify(payload) });
  if (res.ok){ alert('Preferences saved'); window.location='dashboard.html'; } else alert('Error');
});
