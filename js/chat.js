const socketChat = io("http://localhost:3000");
function openChat(theirUsername, theirDisplay){
  const overlay = document.createElement("div"); overlay.className="chat-overlay";
  overlay.innerHTML = `<div class="chat-window"><h3>Chat with ${theirDisplay}</h3><div class="messages" id="chatMessages"></div><input id="chatInput" placeholder="Type a message"><button id="chatSend">Send</button><button id="chatClose">Close</button></div>`;
  document.body.appendChild(overlay);
  const me = getUser(); socketChat.emit && socketChat.emit("join", me.username);
  fetch(`http://localhost:3000/api/messages?a=${me.username}&b=${theirUsername}`).then(r=>r.json()).then(rows=>{ const msgDiv = overlay.querySelector('#chatMessages'); rows.forEach(m=>{ const el=document.createElement('div'); el.className = m.sender===me.username ? 'msg me' : 'msg them'; el.textContent = `${m.sender}: ${m.content}`; msgDiv.appendChild(el); }); msgDiv.scrollTop = msgDiv.scrollHeight; });
  overlay.querySelector('#chatSend').addEventListener('click', ()=>{ const txt = overlay.querySelector('#chatInput').value.trim(); if(!txt) return; const payload = { sender: me.username, receiver: theirUsername, content: txt }; socketChat.emit('send_message', payload); const msgDiv = overlay.querySelector('#chatMessages'); const el = document.createElement('div'); el.className='msg me'; el.textContent = `You: ${txt}`; msgDiv.appendChild(el); overlay.querySelector('#chatInput').value=''; msgDiv.scrollTop = msgDiv.scrollHeight; });
  overlay.querySelector('#chatClose').addEventListener('click', ()=>{ socketChat.disconnect(); overlay.remove(); });
  socketChat.on('message',(m)=>{ if(!m) return; if(m.sender!==theirUsername && m.receiver!==theirUsername) return; const msgDiv = overlay.querySelector('#chatMessages'); const el = document.createElement('div'); el.className = m.sender===me.username ? 'msg me' : 'msg them'; el.textContent = `${m.sender}: ${m.content}`; msgDiv.appendChild(el); msgDiv.scrollTop = msgDiv.scrollHeight; });
}
