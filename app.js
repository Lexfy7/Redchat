// REDCHAT — frontend Firebase (modulaire). Remplis firebaseConfig pour activer le mode partagé.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, limit, onSnapshot, doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "REMPLACE_PAR_TON_API_KEY",
  authDomain: "REMPLACE_PAR_TON_PROJET.firebaseapp.com",
  projectId: "REMPLACE_PAR_TON_PROJECT_ID",
  storageBucket: "REMPLACE_PAR_TON_PROJET.appspot.com",
  messagingSenderId: "REMPLACE_PAR_TON_SENDER_ID",
  appId: "REMPLACE_PAR_TON_APP_ID"
};
const configured = !Object.values(firebaseConfig).some(v => v.startsWith("REMPLACE_"));
let auth=null, db=null, currentUser=null, activeRoom="general", unsubscribeMessages=null, isRegister=false;
const $=id=>document.getElementById(id);
const defaultTheme={theme:"black",accent:"#ffffff",wallpaper:"#090909",density:"comfortable",fontSize:"15"};
let preferences={...defaultTheme};
let localMessages=JSON.parse(localStorage.getItem("redchat-demo-messages")||"[]");
let rooms=["general"];
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function toast(msg){$("toast").textContent=msg;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),2300)}
function applyTheme(p){
  preferences={...defaultTheme,...p};
  const themes={black:{bg:"#090909",panel:"#111111",panel2:"#171717",panel3:"#202020",text:"#f5f5f5",muted:"#929292",line:"#292929"},midnight:{bg:"#080d18",panel:"#101827",panel2:"#172236",panel3:"#21304a",text:"#f2f5fb",muted:"#94a3b8",line:"#28364c"},light:{bg:"#f4f4f4",panel:"#ffffff",panel2:"#f0f0f0",panel3:"#e5e5e5",text:"#171717",muted:"#737373",line:"#dddddd"}};
  const t=themes[preferences.theme]||themes.black, root=document.documentElement;
  Object.entries({bg:t.bg,panel:t.panel,panel2:t.panel2,panel3:t.panel3,text:t.text,muted:t.muted,line:t.line,accent:preferences.accent, "accent-ink":contrastInk(preferences.accent),"font-size":preferences.fontSize+"px"}).forEach(([k,v])=>root.style.setProperty("--"+k,v));
  root.style.setProperty("--bg",preferences.wallpaper||t.bg);document.body.dataset.density=preferences.density;
  $("accentColor").value=preferences.accent;$("accentHex").textContent=preferences.accent.toUpperCase();$("wallpaper").value=preferences.wallpaper||t.bg;$("density").value=preferences.density;$("fontSize").value=preferences.fontSize;
  document.querySelectorAll(".theme-choice").forEach(b=>b.classList.toggle("selected",b.dataset.theme===preferences.theme));
}
function contrastInk(hex){const c=hex.replace("#","");if(c.length!==6)return "#090909";const [r,g,b]=[0,2,4].map(i=>parseInt(c.slice(i,i+2),16));return (r*299+g*587+b*114)/1000>150?"#090909":"#ffffff"}
function localPrefKey(){return "redchat-theme-"+(currentUser?.uid||"guest")}
async function savePreferences(){localStorage.setItem(localPrefKey(),JSON.stringify(preferences));if(currentUser&&db){await setDoc(doc(db,"users",currentUser.uid),{theme:preferences},{merge:true})}toast("Préférences enregistrées")}
async function loadPreferences(){let p=JSON.parse(localStorage.getItem(localPrefKey())||"null");if(currentUser&&db){try{const snap=await getDoc(doc(db,"users",currentUser.uid));if(snap.exists()&&snap.data().theme)p=snap.data().theme}catch(e){console.warn(e)}}applyTheme(p||defaultTheme)}
function showView(view){$("chatView").classList.toggle("hidden",view!=="chat");$("settingsView").classList.toggle("hidden",view!=="settings");document.querySelectorAll(".rail-btn").forEach(b=>b.classList.toggle("active",b.dataset.view===view))}
function updateUserUI(){const name=currentUser?.email?.split("@")[0]||"Invité",initial=name.slice(0,1).toUpperCase();$("sideName").textContent=name;$("sideEmail").textContent=currentUser?.email||"Mode démo";$("sideAvatar").textContent=initial;$("profileAvatar").textContent=initial;$("signOutBtn").style.display=currentUser?"grid":"none";$("accountDescription").textContent=currentUser?"Tes préférences sont associées à ton compte.":"Connecte-toi pour synchroniser tes préférences entre appareils.";$("authBtn").textContent=currentUser?"Compte connecté":"Connexion / Inscription"}
function renderRooms(){ $("roomList").innerHTML=rooms.map(r=>`<button class="room ${r===activeRoom?"active":""}" data-room="${escapeHTML(r)}"><span>#</span> ${escapeHTML(r)}</button>`).join("");document.querySelectorAll(".room").forEach(b=>b.addEventListener("click",()=>selectRoom(b.dataset.room)))}
function selectRoom(room){activeRoom=room;$("roomTitle").textContent="# "+room;$("messageInput").placeholder="Écrire un message dans #"+room+"…";renderRooms();subscribeMessages()}
function renderMessages(items){const box=$("messages");if(!items.length){box.innerHTML='<div class="empty-state"><div class="empty-icon">✳</div><h3>La conversation commence ici.</h3><p>Envoie le premier message dans ce salon.</p></div>';return}box.innerHTML=items.map(m=>{const date=m.createdAt?.toDate?m.createdAt.toDate():new Date(m.createdAt||Date.now());return `<article class="message"><div class="message-avatar">${escapeHTML((m.name||"?").slice(0,1).toUpperCase())}</div><div class="message-body"><div class="message-head"><strong>${escapeHTML(m.name||"Utilisateur")}</strong><time>${date.toLocaleString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</time></div><p class="message-text">${escapeHTML(m.text)}</p></div></article>`}).join("");box.scrollTop=box.scrollHeight}
function subscribeMessages(){if(unsubscribeMessages){unsubscribeMessages();unsubscribeMessages=null}if(db&&currentUser){const q=query(collection(db,"rooms",activeRoom,"messages"),orderBy("createdAt","asc"),limit(100));unsubscribeMessages=onSnapshot(q,s=>renderMessages(s.docs.map(d=>d.data())),e=>{console.error(e);toast("Impossible de charger les messages")})}else{renderMessages(localMessages.filter(m=>m.room===activeRoom).slice(-100))}}
async function sendMessage(text){if(db&&currentUser){await addDoc(collection(db,"rooms",activeRoom,"messages"),{text,name:currentUser.email.split("@")[0],uid:currentUser.uid,createdAt:serverTimestamp()})}else{localMessages.push({text,name:"Invité",room:activeRoom,createdAt:Date.now()});localStorage.setItem("redchat-demo-messages",JSON.stringify(localMessages));subscribeMessages()}}
$("messageForm").addEventListener("submit",async e=>{e.preventDefault();const input=$("messageInput"),text=input.value.trim();if(!text)return;input.value="";try{await sendMessage(text)}catch(err){toast("Envoi impossible : vérifie la configuration Firebase");console.error(err)}});
document.querySelectorAll(".rail-btn").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.view)));
$("openSettings").onclick=$("backToChat").onclick=()=>showView($("settingsView").classList.contains("hidden")?"settings":"chat");
$("addRoomBtn").onclick=()=>{const name=prompt("Nom du salon (lettres, chiffres et tirets)");if(!name)return;const safe=name.toLowerCase().trim().replace(/[^a-z0-9-]/g,"-").replace(/-+/g,"-").slice(0,30);if(!safe)return;if(!rooms.includes(safe))rooms.push(safe);selectRoom(safe)};
document.querySelectorAll(".theme-choice").forEach(b=>b.addEventListener("click",()=>applyTheme({...preferences,theme:b.dataset.theme,wallpaper:b.dataset.theme==="light"?"#f4f4f4":b.dataset.theme==="midnight"?"#080d18":"#090909"})));
$("accentColor").addEventListener("input",e=>applyTheme({...preferences,accent:e.target.value}));
$("wallpaper").addEventListener("input",e=>applyTheme({...preferences,wallpaper:e.target.value}));
$("density").addEventListener("change",e=>applyTheme({...preferences,density:e.target.value}));
$("fontSize").addEventListener("change",e=>applyTheme({...preferences,fontSize:e.target.value}));
$("resetAccent").onclick=()=>applyTheme({...preferences,accent:"#ffffff"});
$("saveTheme").onclick=savePreferences;
$("resetTheme").onclick=async()=>{applyTheme(defaultTheme);await savePreferences()};
function openAuth(){if(currentUser){toast("Tu es déjà connecté");return}$("authModal").classList.remove("hidden")}
$("authBtn").onclick=openAuth;$("closeAuth").onclick=()=>$("authModal").classList.add("hidden");
$("toggleAuth").onclick=()=>{isRegister=!isRegister;$("authTitle").textContent=isRegister?"Créer un compte":"Connexion";$("authSubmit").textContent=isRegister?"Créer mon compte":"Se connecter";$("toggleAuth").textContent=isRegister?"J'ai déjà un compte":"Créer un compte";$("authError").textContent=""};
$("authForm").addEventListener("submit",async e=>{e.preventDefault();if(!auth){$("authError").textContent="Firebase n'est pas configuré. Consulte README.md.";return}try{const email=$("authEmail").value,password=$("authPassword").value;if(isRegister)await createUserWithEmailAndPassword(auth,email,password);else await signInWithEmailAndPassword(auth,email,password);$("authModal").classList.add("hidden");$("authError").textContent=""}catch(err){$("authError").textContent=err.message}});
$("signOutBtn").onclick=()=>auth?signOut(auth):toast("Mode démo");
if(configured){try{const app=initializeApp(firebaseConfig);auth=getAuth(app);db=getFirestore(app);$("connectionLabel").textContent="Firebase prêt";$("authNotice").textContent="Connecté au service REDCHAT. Crée un compte pour synchroniser tes conversations.";onAuthStateChanged(auth,async user=>{currentUser=user;updateUserUI();await loadPreferences();subscribeMessages()})}catch(e){console.error(e);$("connectionLabel").textContent="Mode démo"}}else{$("connectionLabel").textContent="Mode démo";$("authNotice").textContent="Mode démo local : les messages et thèmes sont conservés sur cet appareil. Configure Firebase pour utiliser la messagerie en ligne."}
updateUserUI();applyTheme(defaultTheme);renderRooms();subscribeMessages();
