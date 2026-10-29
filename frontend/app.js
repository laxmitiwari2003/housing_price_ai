const API = "https://housing-price-ai-vhdr.vercel.app/api";
let token = localStorage.getItem("estate_token") || "";
let user = JSON.parse(localStorage.getItem("estate_user") || "null");
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

function toast(msg, error=false){ const el=document.createElement("div"); el.className="toast"+(error?" error":""); el.textContent=msg; $("#toast").appendChild(el); setTimeout(()=>el.remove(),2800); }
function money(v){ return new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(Number(v)||0); }
async function api(path, options={}){
  const headers={"Content-Type":"application/json",...(options.headers||{})};
  if(token) headers.Authorization=`Bearer ${token}`;
  const r=await fetch(API+path,{...options,headers});
  let data={}; try{data=await r.json()}catch{}
  if(!r.ok) throw new Error(data.detail||"Request failed");
  return data;
}
function setUser(u,t){user=u;token=t||token;localStorage.setItem("estate_user",JSON.stringify(u));localStorage.setItem("estate_token",token);}
function logout(){localStorage.removeItem("estate_user");localStorage.removeItem("estate_token"); token=""; user=null; showLogin();}
function showLogin(){
  document.body.innerHTML=`<main class="auth-shell">
    <section class="auth-visual"><div class="auth-brand"><div class="brand-mark">E</div><div><strong>EstateIQ</strong><small>Housing intelligence</small></div></div>
      <div class="auth-copy"><span class="eyebrow">SMARTER PROPERTY DECISIONS</span><h1>Your next move<br><em>starts with insight.</em></h1><p>Estimate property values, organize listings and keep every decision in one beautiful workspace.</p>
      <div class="auth-points"><span>✦ AI-powered valuations</span><span>⌂ Property portfolio</span><span>◷ Personal prediction history</span></div></div>
      <div class="auth-foot">Built for buyers, owners and real-estate teams.</div></section>
    <section class="auth-panel"><div class="auth-card"><div class="mobile-brand"><div class="brand-mark">E</div><strong>EstateIQ</strong></div>
      <div class="auth-tabs"><button type="button" class="auth-tab active" id="signinTab">Sign in</button><button type="button" class="auth-tab" id="signupTab">Create account</button></div>
      <span class="eyebrow" id="authEyebrow">WELCOME BACK</span><h2 id="authTitle">Sign in to your workspace</h2><p id="authSubtitle">Access your saved properties and valuations.</p>
      <form id="authForm"><div id="nameField" class="auth-field hidden"><label>Full name<input name="name" autocomplete="name" placeholder="Your name" minlength="2"></label></div>
      <label>Email address<input type="email" name="email" autocomplete="email" placeholder="you@example.com" required></label>
      <label>Password <span class="password-wrap"><input id="authPassword" type="password" name="password" autocomplete="current-password" placeholder="Enter your password" minlength="6" required><button type="button" id="togglePassword" class="password-toggle" aria-label="Show password">Show</button></span></label>
      <button class="primary full auth-submit" id="authSubmit">Sign in <span>→</span></button><div id="authError" class="auth-error" role="alert"></div></form>
      <div class="auth-divider"><span>OR TRY THE DEMO</span></div><button type="button" class="demo-button" id="demoLogin">Use demo admin account</button>
      <small class="login-hint">New here? Create a free user account. Your predictions and history are tied to your account.</small>
    </div></section></main>`;
  let mode="login";
  const form=$("#authForm");
  function setMode(next){
    mode=next;$("#signinTab").classList.toggle("active",mode==="login");$("#signupTab").classList.toggle("active",mode==="register");
    $("#nameField").classList.toggle("hidden",mode!=="register");form.elements.name.required=mode==="register";
    $("#authEyebrow").textContent=mode==="login"?"WELCOME BACK":"GET STARTED";
    $("#authTitle").textContent=mode==="login"?"Sign in to your workspace":"Create your account";
    $("#authSubtitle").textContent=mode==="login"?"Access your saved properties and valuations.":"Join EstateIQ to save predictions and manage your properties.";
    $("#authSubmit").innerHTML=mode==="login"?'Sign in <span>→</span>':'Create account <span>→</span>';
    $("#authPassword").autocomplete=mode==="login"?"current-password":"new-password";
    $("#authError").textContent="";
  }
  $("#signinTab").onclick=()=>setMode("login");$("#signupTab").onclick=()=>setMode("register");
  $("#togglePassword").onclick=()=>{const p=$("#authPassword");p.type=p.type==="password"?"text":"password";$("#togglePassword").textContent=p.type==="password"?"Show":"Hide"};
  $("#demoLogin").onclick=()=>{form.elements.email.value="admin@example.com";form.elements.password.value="Admin@123";setMode("login");form.requestSubmit()};
  form.onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(form));const endpoint=mode==="login"?"/auth/login":"/auth/register";$("#authSubmit").disabled=true;$("#authSubmit").textContent=mode==="login"?"Signing in…":"Creating account…";$("#authError").textContent="";
    try{const r=await api(endpoint,{method:"POST",body:JSON.stringify(d)});setUser(r.user,r.token);location.reload()}
    catch(x){$("#authError").textContent=x.message||"Could not complete your request."}
    finally{$("#authSubmit").disabled=false;$("#authSubmit").innerHTML=mode==="login"?'Sign in <span>→</span>':'Create account <span>→</span>'}
  };
}
function nav(){
  $$(".nav-item").forEach(b=>b.onclick=()=>openPage(b.dataset.page));
  $$("[data-page-jump]").forEach(b=>b.onclick=()=>openPage(b.dataset.pageJump));
}
function openPage(name){
  $$(".content").forEach(x=>x.classList.add("page-hidden"));
  const page=$("#"+name+"Page"); if(page) page.classList.remove("page-hidden");
  $$(".nav-item").forEach(x=>x.classList.toggle("active",x.dataset.page===name));
  const labels={dashboard:["Overview","Dashboard"],predict:["Valuation engine","Predict price"],properties:["Portfolio","Properties"],history:["Audit trail","Prediction history"],admin:["Control center","Admin dashboard"]};
  $("#pageKicker").textContent=labels[name][0];$("#pageTitle").textContent=labels[name][1];
  if(name==="properties") loadProperties(); if(name==="history") loadHistory(); if(name==="admin") loadAdmin(); if(name==="predict") loadPropertyOptions();
  $("#sidebar").classList.remove("open");document.body.classList.remove("sidebar-open");
}
function userUI(){
  $("#userName").textContent=user?.name||"User";$("#userRole").textContent=user?.role||"User";$("#avatar").textContent=(user?.name||"U")[0].toUpperCase();
  if(user?.role!=="admin") $$(".admin-only").forEach(x=>x.style.display="none");
}
async function loadDashboard(){
  try{
    const props=await api("/properties"); $("#statProperties").textContent=props.items.length;$("#statAvailable").textContent=props.items.filter(x=>x.status==="Available").length;
    const hist=await api("/predictions");$("#statPredictions").textContent=hist.items.length;
    const avg=hist.items.length?hist.items.reduce((a,x)=>a+Number(x.predicted_price),0)/hist.items.length:0;$("#statAverage").textContent=money(avg);
    if(hist.items[0]) $("#heroPrediction").textContent=money(hist.items[0].predicted_price);
    renderPredictions(hist.items.slice(0,5),"recentPredictions");
    renderMonthlyChart(hist.items);
  }catch(e){toast(e.message,true)}
}
function renderMonthlyChart(items){
  const el=$("#monthlyChart"); if(!el)return;
  const now=new Date(), months=[];
  for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);months.push({key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`,label:d.toLocaleDateString("en-IN",{month:"short"}),count:0});}
  const byKey=new Map(months.map(m=>[m.key,m]));
  items.forEach(item=>{const d=new Date(item.created_at);if(!Number.isNaN(d.getTime())){const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;if(byKey.has(key))byKey.get(key).count++;}});
  const max=Math.max(1,...months.map(m=>m.count));
  el.innerHTML=months.map(m=>`<div class="month-column"><div class="month-bar-track"><div class="month-bar" style="height:${Math.max(m.count?8:2,(m.count/max)*100)}%" title="${m.count} valuation${m.count===1?"":"s"}"></div></div><strong>${m.count}</strong><span>${m.label}</span></div>`).join("");
  el.setAttribute("aria-label",months.map(m=>`${m.label}: ${m.count} valuations`).join(", "));
}
function renderPredictions(items,id){
  if(!items.length){$("#"+id).innerHTML='<div class="empty">No predictions yet.</div>';return}
  $("#"+id).innerHTML=`<table class="data-table"><thead><tr><th>Property</th><th>Inputs</th><th>Estimate</th><th>Date</th></tr></thead><tbody>${items.map(x=>`<tr><td>${x.property_title||"Standalone"}</td><td>${x.area_sqft} sq ft · ${x.bedrooms} bd</td><td><b>${money(x.predicted_price)}</b></td><td>${new Date(x.created_at).toLocaleDateString()}</td></tr>`).join("")}</tbody></table>`;
}
const INDIAN_CITIES = ["Ahmedabad","Amritsar","Bengaluru","Bhopal","Chandigarh","Chennai","Coimbatore","Delhi","Dehradun","Dewas","Faridabad","Ghaziabad","Gurugram","Guwahati","Gwalior","Hyderabad","Indore","Jaipur","Jabalpur","Kanpur","Kochi","Kolkata","Lucknow","Ludhiana","Mumbai","Mysuru","Nagpur","Nashik","Noida","Patna","Pune","Raipur","Rajkot","Ranchi","Surat","Thane","Tiruchirappalli","Udaipur","Ujjain","Vadodara","Varanasi","Vijayawada","Visakhapatnam"];
let allProperties=[];
let selectedCompare=new Set();
let favorites=new Set(JSON.parse(localStorage.getItem("estate_favorites")||"[]").map(String));
let lastValuation=null;
let favoritesOnly=false;
function escapeHTML(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
async function loadProperties(){
  try{
    const q=encodeURIComponent($("#propertySearch").value||""),s=encodeURIComponent($("#statusFilter").value||"");
    const r=await api(`/properties?q=${q}&status=${s}`);allProperties=r.items||[];
    const cities=[...new Set([...INDIAN_CITIES,...allProperties.map(x=>x.location).filter(Boolean)])].sort();const citySelect=$("#cityFilter");
    if(citySelect){const previous=citySelect.value;citySelect.innerHTML='<option value="">All locations</option>'+cities.map(c=>`<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join("");citySelect.value=cities.includes(previous)?previous:"";}
    renderProperties(allProperties);
  }catch(e){toast(e.message,true)}
}
function renderProperties(items){
 const city=$("#cityFilter")?.value||"",type=$("#typeFilter")?.value||"",price=Number($("#priceFilter")?.value||0);
 let shown=items.filter(x=>(!city||x.location===city)&&(!type||x.property_type===type)&&(!price||(!Number(x.asking_price)||Number(x.asking_price)<=price))&&(!favoritesOnly||favorites.has(String(x.id))));
 $("#propertyCount").textContent=`${shown.length} propert${shown.length===1?"y":"ies"} found`;
 $("#compareCount").textContent=selectedCompare.size?`${selectedCompare.size} selected · choose up to 3`:"Select up to 3 homes to compare";
 $("#compareBtn").disabled=selectedCompare.size<2;
 $("#propertyCards").innerHTML=shown.length?shown.map(x=>{
   const image=x.photo_url?`<img src="${escapeHTML(x.photo_url)}" alt="${escapeHTML(x.title)}" loading="lazy" onerror="this.style.display='none'">`:"";
   const priceText=Number(x.asking_price)>0?money(x.asking_price):"Price not listed";
   return `<article class="property-card"><div class="property-photo">${image}<span class="property-status badge ${x.status==='Sold'?'sold':''}">${escapeHTML(x.status||'Available')}</span><button class="favorite-btn ${favorites.has(String(x.id))?'is-favorite':''}" onclick="toggleFavorite(${x.id})" aria-label="Toggle favorite">${favorites.has(String(x.id))?'♥':'♡'}</button><label class="compare-check"><input type="checkbox" ${selectedCompare.has(String(x.id))?'checked':''} onchange="toggleCompare(${x.id},this.checked)"> Compare</label></div><div class="property-card-body"><h3>${escapeHTML(x.title)}</h3><div class="property-location">⌖ ${escapeHTML(x.location)} · ${escapeHTML(x.property_type)}</div><div class="property-price-row"><div class="property-price">${priceText}<small>${Number(x.asking_price)>0?money(Number(x.asking_price)/Math.max(1,Number(x.area_sqft)||1))+' / sq ft':'Add asking price for comparisons'}</small></div><span class="badge">${Number(x.area_sqft)||0} sq ft</span></div><div class="property-facts"><span>▦ ${x.bedrooms} beds</span><span>◫ ${x.bathrooms} baths</span><span>⌑ ${x.parking_spaces} parking</span></div><div class="property-card-actions"><button class="card-primary" onclick="predictProperty(${x.id})">Value this home</button><button class="card-secondary" onclick="viewProperty(${x.id})">Details</button></div></div></article>`;
 }).join(''):'<div class="empty-market"><strong>No matching properties</strong><p>Try changing your filters or add a property to your portfolio.</p></div>';
 $("#propertyTable").innerHTML=shown.length?`<table class="data-table"><thead><tr><th>Property</th><th>Location</th><th>Type</th><th>Size</th><th>Asking price</th><th>Status</th><th>Actions</th></tr></thead><tbody>${shown.map(x=>`<tr><td><b>${escapeHTML(x.title)}</b></td><td>${escapeHTML(x.location)}</td><td>${escapeHTML(x.property_type)}</td><td>${x.area_sqft} sq ft</td><td>${Number(x.asking_price)>0?money(x.asking_price):'—'}</td><td><span class="badge ${x.status==='Sold'?'sold':''}">${escapeHTML(x.status)}</span></td><td><div class="actions"><button class="mini" onclick='editProperty(${JSON.stringify(x).replace(/'/g,"&#39;")})'>Edit</button><button class="mini" onclick="deleteProperty(${x.id})">Delete</button></div></td></tr>`).join('')}</tbody></table>`:'<div class="empty">No property records found.</div>';
}
function toggleFavorite(id){const key=String(id);favorites.has(key)?favorites.delete(key):favorites.add(key);localStorage.setItem('estate_favorites',JSON.stringify([...favorites]));renderProperties(allProperties);toast(favorites.has(key)?'Added to favorites':'Removed from favorites');}
function toggleCompare(id,checked){const key=String(id);if(checked&&selectedCompare.size>=3){toast('You can compare up to 3 properties');renderProperties(allProperties);return;}checked?selectedCompare.add(key):selectedCompare.delete(key);renderProperties(allProperties);}
async function viewProperty(id){const x=allProperties.find(p=>String(p.id)===String(id));if(!x)return;const asking=Number(x.asking_price)>0?money(x.asking_price):'Not listed';$('#propertyDetailsContent').innerHTML=`<h2>${escapeHTML(x.title)}</h2><p class="property-location">⌖ ${escapeHTML(x.location)} · ${escapeHTML(x.property_type)} · ${escapeHTML(x.status)}</p>${x.photo_url?`<img class="details-photo" src="${escapeHTML(x.photo_url)}" alt="${escapeHTML(x.title)}" onerror="this.style.display='none'">`:''}<div class="compare-grid"><div class="compare-cell"><p>Asking price</p><strong>${asking}</strong></div><div class="compare-cell"><p>Area</p><strong>${Number(x.area_sqft).toLocaleString('en-IN')} sq ft</strong></div><div class="compare-cell"><p>Price per sq ft</p><strong>${Number(x.asking_price)>0?money(Number(x.asking_price)/Math.max(1,Number(x.area_sqft))):'—'}</strong></div></div><p>${escapeHTML(x.description||'No description added yet.')}</p><div class="property-facts"><span>▦ ${x.bedrooms} bedrooms</span><span>◫ ${x.bathrooms} bathrooms</span><span>⌑ ${x.parking_spaces} parking spaces</span></div><p><a class="map-link" href="https://www.openstreetmap.org/search?query=${encodeURIComponent(x.location)}" target="_blank" rel="noopener">↗ View location on OpenStreetMap</a></p><h3>Valuation history</h3><div id="detailHistory" class="table-wrap"><div class="empty">Loading valuation history…</div></div><button class="primary" onclick="predictProperty(${x.id})">Create valuation for this property →</button>`;$('#detailsModal').classList.remove('hidden');try{const h=await api('/predictions');const rows=(h.items||[]).filter(p=>String(p.property_id)===String(id));$('#detailHistory').innerHTML=rows.length?`<table class="data-table"><thead><tr><th>Date</th><th>Inputs</th><th>Estimated value</th></tr></thead><tbody>${rows.map(p=>`<tr><td>${new Date(p.created_at).toLocaleDateString()}</td><td>${p.area_sqft} sq ft · ${p.bedrooms} bed</td><td><b>${money(p.predicted_price)}</b></td></tr>`).join('')}</tbody></table>`:'<div class="empty">No saved valuations for this property yet.</div>';}catch(e){$('#detailHistory').innerHTML='<div class="empty">Sign in and connect to the API to view saved valuation history.</div>';}}
async function predictProperty(id){const x=allProperties.find(p=>String(p.id)===String(id));if(!x)return;$('#detailsModal')?.classList.add('hidden');openPage('predict');const f=$('#predictionForm');f.elements.area_sqft.value=x.area_sqft;$('#areaRange').value=Math.max(300,Math.min(6000,Number(x.area_sqft)));$('#bedroomRange').value=x.bedrooms;$('#bathroomRange').value=x.bathrooms;$('#parkingRange').value=x.parking_spaces;await loadPropertyOptions();f.elements.property_id.value=x.id;syncSliders();}
function showCompare(){const items=allProperties.filter(x=>selectedCompare.has(String(x.id)));if(items.length<2){toast('Select at least two properties');return;}const keys=[['Asking price',x=>Number(x.asking_price)>0?money(x.asking_price):'Not listed'],['Area',x=>`${x.area_sqft} sq ft`],['Price per sq ft',x=>Number(x.asking_price)>0?money(Number(x.asking_price)/Math.max(1,Number(x.area_sqft))):'Not available'],['Bedrooms',x=>x.bedrooms],['Bathrooms',x=>x.bathrooms],['Parking',x=>x.parking_spaces],['Status',x=>x.status]];$('#compareContent').innerHTML=`<div class="compare-grid">${items.map(x=>`<div class="compare-cell"><h3>${escapeHTML(x.title)}</h3><p>⌖ ${escapeHTML(x.location)}</p><strong>${Number(x.asking_price)>0?money(x.asking_price):'Price not listed'}</strong><p>${escapeHTML(x.property_type)} · ${x.area_sqft} sq ft</p></div>`).join('')}</div>${keys.map(([label,fn])=>`<div class="compare-row"><span>${label}</span>${items.map(x=>`<span>${escapeHTML(fn(x))}</span>`).join('')}${items.length<3?'<span>—</span>':''}</div>`).join('')}<p class="form-note">Comparison uses listing data entered by users. Missing asking prices are not estimated or fabricated.</p>`;$('#compareModal').classList.remove('hidden');}
function editProperty(x){$("#propertyModal").classList.remove("hidden");$("#modalTitle").textContent="Edit property";const f=$("#propertyForm");Object.keys(x).forEach(k=>{if(f.elements[k])f.elements[k].value=x[k]})}
async function deleteProperty(id){if(!confirm("Delete this property?"))return;try{await api("/properties/"+id,{method:"DELETE"});toast("Property deleted");loadProperties();}catch(e){toast(e.message,true)}}
function showPropertyModal(){$("#propertyModal").classList.remove("hidden");$("#modalTitle").textContent="Add property";$("#propertyForm").reset();$("#propertyForm").elements.id.value=""}
async function saveProperty(e){e.preventDefault();const f=Object.fromEntries(new FormData(e.target));["area_sqft","bedrooms","bathrooms","parking_spaces","asking_price"].forEach(k=>f[k]=Number(f[k]||0));f.photo_url=f.photo_url||"";try{const id=f.id;delete f.id;await api("/properties"+(id?"/"+id:""),{method:id?"PUT":"POST",body:JSON.stringify(f)});toast(id?"Property updated":"Property added");$("#propertyModal").classList.add("hidden");loadProperties();loadPropertyOptions()}catch(x){toast(x.message,true)}}
async function loadPropertyOptions(){try{const r=await api("/properties");$("#predictionProperty").innerHTML='<option value="">Standalone prediction</option>'+r.items.map(x=>`<option value="${x.id}">${x.title} — ${x.location}</option>`).join("")}catch(e){}}
function downloadCSV(filename,rows){const csv=rows.map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);}
async function runPrediction(e){e.preventDefault();const f=Object.fromEntries(new FormData(e.target));["area_sqft","bedrooms","bathrooms","parking_spaces"].forEach(k=>f[k]=Number(f[k]));if(!f.property_id)delete f.property_id;else f.property_id=Number(f.property_id);const result=$('#predictionResult');result.innerHTML='<span class="eyebrow">CALCULATING ESTIMATE</span><div class="result-empty">Running your valuation…</div><div class="loading-line"></div>';try{const r=await api("/predict",{method:"POST",body:JSON.stringify(f)});const props=allProperties.length?allProperties:(await api('/properties')).items;allProperties=props;const comparable=props.filter(x=>Number(x.asking_price)>0&&Number(x.area_sqft)>0).map(x=>({...x,pricePerSqft:Number(x.asking_price)/Number(x.area_sqft),distance:Math.abs(Number(x.area_sqft)-f.area_sqft)})).sort((a,b)=>a.distance-b.distance).slice(0,3);const pps=Number(r.predicted_price)/Math.max(1,f.area_sqft);lastValuation={...f,prediction_id:r.prediction_id,predicted_price:r.predicted_price,created_at:new Date().toISOString()};result.innerHTML=`<span class="eyebrow">ESTIMATED PROPERTY VALUE</span><div class="result-price">${money(r.predicted_price)}</div><div class="result-caption">Valuation #${r.prediction_id} · Saved to your prediction history</div><div class="result-metrics"><div class="result-metric"><small>Estimated price / sq ft</small><strong>${money(pps)}</strong></div><div class="result-metric"><small>Property size</small><strong>${f.area_sqft.toLocaleString('en-IN')} sq ft</strong></div></div><div class="result-actions"><button id="exportValuationBtn">↓ Export valuation CSV</button><button id="compareValuationBtn">⇄ Compare with listings</button></div>${comparable.length?`<div class="comparable-list"><h4>Closest listed properties by area</h4>${comparable.map(x=>`<div class="comparable-row"><span>${escapeHTML(x.title)} · ${x.area_sqft} sq ft</span><span>${money(x.asking_price)}<br><small>${money(x.pricePerSqft)} / sq ft</small></span></div>`).join('')}</div>`:'<div class="comparable-list"><h4>No comparable asking prices yet</h4><div class="comparable-row"><span>Add asking prices to property records to enable comparison.</span></div></div>'}<p class="result-disclaimer">Important: this is a model-generated estimate, not a guaranteed market or sale price. Comparable values are user-entered asking prices, not verified transactions.</p>`;$('#exportValuationBtn').onclick=()=>downloadCSV(`estateiq-valuation-${r.prediction_id}.csv`,[['Metric','Value'],['Prediction ID',r.prediction_id],['Area sq ft',f.area_sqft],['Bedrooms',f.bedrooms],['Bathrooms',f.bathrooms],['Parking spaces',f.parking_spaces],['Estimated value INR',r.predicted_price],['Estimated price per sq ft INR',Math.round(pps)],['Created at',lastValuation.created_at],['Disclaimer','Indicative estimate only; not guaranteed market price']]);$('#compareValuationBtn').onclick=()=>{openPage('properties');if(comparable.length){selectedCompare=new Set(comparable.slice(0,3).map(x=>String(x.id)));renderProperties(allProperties);showCompare();}};toast('Valuation saved to history');loadDashboard()}catch(x){result.innerHTML=`<span class="eyebrow">VALUATION UNAVAILABLE</span><div class="result-empty">We could not calculate this estimate.</div><p class="result-disclaimer">${escapeHTML(x.message)}. Check that the API is running and the model is installed.</p>`;toast(x.message,true)}}
function syncSliders(){const area=Number($('#areaInput').value||1500),beds=Number($('#bedroomRange').value),baths=Number($('#bathroomRange').value),parking=Number($('#parkingRange').value);$('#areaRange').value=Math.max(Number($('#areaRange').min),Math.min(Number($('#areaRange').max),area));$('#areaValue').textContent=`${area.toLocaleString('en-IN')} sq ft`;$('#bedroomValue').textContent=beds;$('#bathroomValue').textContent=baths;$('#parkingValue').textContent=parking;$('#liveSummary').innerHTML=`<span>YOUR PROPERTY SNAPSHOT</span><strong>${area.toLocaleString('en-IN')} sq ft · ${beds} bed · ${baths} bath</strong><small>${parking} parking space${parking===1?'':'s'}</small>`;}
async function loadHistory(){try{const r=await api("/predictions");$("#historyTable").innerHTML=r.items.length?`<table class="data-table"><thead><tr><th>Property</th><th>Area</th><th>Bedrooms</th><th>Bathrooms</th><th>Parking</th><th>Predicted price</th><th>Created</th></tr></thead><tbody>${r.items.map(x=>`<tr><td>${x.property_title||"Standalone"}</td><td>${x.area_sqft}</td><td>${x.bedrooms}</td><td>${x.bathrooms}</td><td>${x.parking_spaces}</td><td><b>${money(x.predicted_price)}</b></td><td>${new Date(x.created_at).toLocaleString()}</td></tr>`).join("")}</tbody></table>`:'<div class="empty">No prediction history yet.</div>'}catch(e){toast(e.message,true)}}
async function loadAdmin(){
  try{
    const r=await api("/admin/stats");$("#adminUsers").textContent=r.users;$("#adminProperties").textContent=r.properties;$("#adminPredictions").textContent=r.predictions;$("#adminSold").textContent=r.sold;
    const usersResponse=await api("/admin/users");const records=usersResponse.items||[];
    $("#adminUsersTable").innerHTML=records.length?`<table class="data-table"><thead><tr><th>User</th><th>Email</th><th>Role</th><th>Joined</th><th>Properties</th><th>Predictions</th></tr></thead><tbody>${records.map(u=>`<tr><td><b>${escapeHTML(u.name)}</b><small class="table-subline">ID #${u.id}</small></td><td>${escapeHTML(u.email)}</td><td><span class="badge ${u.role==="admin"?"admin-badge":""}">${escapeHTML(u.role)}</span></td><td>${u.created_at?new Date(u.created_at).toLocaleDateString("en-IN"):"—"}</td><td>${u.property_count||0}</td><td>${u.prediction_count||0}</td></tr>`).join("")}</tbody></table>`:'<div class="empty">No user records found.</div>';
  }catch(e){toast(e.message,true)}
}
async function init(){
  if(!user||!token){showLogin();return}
  nav();userUI();$("#logoutBtn").onclick=logout;$("#menuBtn").onclick=()=>{const opened=$("#sidebar").classList.toggle("open");document.body.classList.toggle("sidebar-open",opened);$("#menuBtn").setAttribute("aria-expanded",String(opened));};document.addEventListener("click",e=>{if(document.body.classList.contains("sidebar-open")&&!$("#sidebar").contains(e.target)&&e.target!==$("#menuBtn")){ $("#sidebar").classList.remove("open");document.body.classList.remove("sidebar-open");$("#menuBtn").setAttribute("aria-expanded","false");}});$("#refreshBtn").onclick=loadDashboard;
  const applyTheme=theme=>{document.body.classList.toggle("dark-mode",theme==="dark");localStorage.setItem("estate_theme",theme);$("#themeBtn").textContent=theme==="dark"?"☀":"◐";$("#themeBtn").title=theme==="dark"?"Switch to light theme":"Switch to dark theme";$("#themeBtn").setAttribute("aria-label",$("#themeBtn").title);};
  applyTheme(localStorage.getItem("estate_theme")==="dark"?"dark":"light");
  $("#themeBtn").onclick=()=>applyTheme(document.body.classList.contains("dark-mode")?"light":"dark");
  $("#exportHistoryBtn").onclick=async()=>{try{const r=await api("/predictions");const rows=[["Property","Area sq ft","Bedrooms","Bathrooms","Parking spaces","Predicted price INR","Created"],...r.items.map(x=>[x.property_title||"Standalone",x.area_sqft,x.bedrooms,x.bathrooms,x.parking_spaces,x.predicted_price,x.created_at])];const csv=rows.map(row=>row.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\\n");const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="estateiq-prediction-history.csv";a.click();URL.revokeObjectURL(url);toast("History exported")}catch(e){toast(e.message,true)}};
  if($("#exportUsersBtn"))$("#exportUsersBtn").onclick=async()=>{try{const r=await api("/admin/users");const rows=[["ID","Name","Email","Role","Joined","Properties","Predictions"],...(r.items||[]).map(u=>[u.id,u.name,u.email,u.role,u.created_at,u.property_count,u.prediction_count])];const csv=rows.map(row=>row.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\\n");const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="estateiq-user-records.csv";a.click();URL.revokeObjectURL(url);toast("User records exported")}catch(e){toast(e.message,true)}};
  $("#predictionForm").onsubmit=runPrediction;$("#propertyForm").onsubmit=saveProperty;$("#addPropertyBtn").onclick=showPropertyModal;$("#closeModal").onclick=()=>$("#propertyModal").classList.add("hidden");
  $('#areaRange').oninput=()=>{$('#areaInput').value=$('#areaRange').value;syncSliders()};$('#areaInput').oninput=syncSliders;$('#bedroomRange').oninput=syncSliders;$('#bathroomRange').oninput=syncSliders;$('#parkingRange').oninput=syncSliders;syncSliders();
  $("#propertySearch").oninput=loadProperties;$("#statusFilter").onchange=loadProperties;$('#cityFilter').onchange=()=>renderProperties(allProperties);$('#typeFilter').onchange=()=>renderProperties(allProperties);$('#priceFilter').onchange=()=>renderProperties(allProperties);$('#favoritesOnlyBtn').onclick=()=>{favoritesOnly=!favoritesOnly;$('#favoritesOnlyBtn').textContent=favoritesOnly?'♥ Showing favorites':'♡ Favorites';renderProperties(allProperties)};$('#compareBtn').onclick=showCompare;$('#closeCompare').onclick=()=>$('#compareModal').classList.add('hidden');$('#closeDetails').onclick=()=>$('#detailsModal').classList.add('hidden');$('#detailsModal').onclick=e=>{if(e.target.id==='detailsModal')$('#detailsModal').classList.add('hidden')};$('#compareModal').onclick=e=>{if(e.target.id==='compareModal')$('#compareModal').classList.add('hidden')};
  loadDashboard();
}
init();
