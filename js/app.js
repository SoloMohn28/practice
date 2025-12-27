const API = "http://localhost:3000/api";
function setUser(obj){ localStorage.setItem("dm_user", JSON.stringify(obj)); }
function getUser(){ return JSON.parse(localStorage.getItem("dm_user")||"null"); }

// REGISTER
document.getElementById("registerForm")?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const payload = {
    username: document.getElementById("username").value.trim(),
    password: document.getElementById("password").value,
    gender: document.getElementById("gender").value,
    age: Number(document.getElementById("age").value) || 18,
    city: document.getElementById("city").value || "Any",
    display_name: document.getElementById("display_name").value || undefined
  };
  const res = await fetch("http://localhost:3000/api/register", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(payload) });
  if (res.ok) { alert("Registered! Please login."); location.href="login.html"; } else { alert("Register error: "+await res.text()); }
});

// LOGIN
document.getElementById("loginForm")?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const payload = { username: document.getElementById("username").value, password: document.getElementById("password").value };
  const res = await fetch("http://localhost:3000/api/login", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(payload) });
  if (res.ok){ const user = await res.json(); setUser(user); location.href="dashboard.html"; } else alert("Invalid credentials");
});

// PROFILE EDIT + PHOTO UPLOAD (minimal)
document.getElementById("profileForm")?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const user = getUser(); if(!user) return location.href="login.html";
  let photoUrl = "";
  const fileInput = document.getElementById("photoFile");
  if (fileInput && fileInput.files && fileInput.files[0]) {
    const fd = new FormData(); fd.append("photo", fileInput.files[0]);
    const r = await fetch("http://localhost:3000/upload-photo", { method:"POST", body: fd });
    const j = await r.json(); photoUrl = j.url;
  }
  const payload = {
    username: user.username,
    display_name: document.getElementById("display_name").value || user.display_name,
    age: Number(document.getElementById("age").value) || user.age,
    gender: document.getElementById("gender").value || user.gender,
    city: document.getElementById("city").value || user.city,
    bio: document.getElementById("bio")?.value || "",
    photo: photoUrl || user.photo || ""
  };
  const res = await fetch("http://localhost:3000/api/profile/update", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(payload) });
  if (res.ok) { alert("Profile updated"); setUser(payload); location.href="dashboard.html"; } else alert("Error: "+await res.text());
});

// logout
document.getElementById("logoutBtn")?.addEventListener("click", ()=>{ localStorage.removeItem("dm_user"); location.href="index.html"; });
