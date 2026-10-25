const KEY="fittrack_v3";
const today=()=>new Date().toISOString().slice(0,10);
const state=JSON.parse(localStorage.getItem(KEY)||'null')||{daily:{},foods:{},workouts:[],profile:{startWeight:88,goalWeight:83},week:0};

const foods={
 Eggs:{cal:72,protein:6.3},EggWhites:{cal:52,protein:11},WholeWheatBread:{cal:80,protein:4},Paneer:{cal:265,protein:18},
 SoyaChunks:{cal:345,protein:52},Rice:{cal:130,protein:2.7},Tortilla:{cal:130,protein:4},Whey:{cal:120,protein:24},
 Milk:{cal:120,protein:8},GreekYogurt:{cal:100,protein:10},Banana:{cal:105,protein:1.3},Orange:{cal:62,protein:1.2},
 BabyCarrots:{cal:35,protein:0.8},Mayo:{cal:90,protein:0}
};
const foodLabels={Eggs:"Eggs",EggWhites:"Egg whites",WholeWheatBread:"Whole-wheat bread",Paneer:"Paneer",SoyaChunks:"Soya chunks",Rice:"Rice",
Tortilla:"Tortilla / roti",Whey:"Whey",Milk:"Milk",GreekYogurt:"Greek yogurt",Banana:"Banana",Orange:"Orange",BabyCarrots:"Baby carrots",Mayo:"Mayonnaise"};

function save(){localStorage.setItem(KEY,JSON.stringify(state));renderAll()}
function el(id){return document.getElementById(id)}
function setToday(){["dailyDate","workoutDate"].forEach(id=>el(id).value=today())}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function showTab(name){document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===name));document.querySelectorAll(".tab-panel").forEach(p=>p.classList.toggle("active",p.id===name))}
function entries(){return Object.entries(state.daily).sort((a,b)=>b[0].localeCompare(a[0]))}
function avg(a){return a.length?(a.reduce((x,y)=>x+y,0)/a.length):null}

function renderDashboard(){
 const e=entries(), weights=e.map(x=>Number(x[1].weight)).filter(Boolean), cals=e.map(x=>Number(x[1].calories)).filter(Boolean), prots=e.map(x=>Number(x[1].protein)).filter(Boolean);
 const current=weights[0]??state.profile.startWeight;
 el("statWeight").textContent=current.toFixed(1)+" kg"; el("statLost").textContent=Math.max(0,state.profile.startWeight-current).toFixed(1)+" kg";
 el("statCal").textContent=avg(cals)?.toFixed(0)??"—"; el("statProtein").textContent=avg(prots)?.toFixed(0)+" g"??"—";
 el("statStrength").textContent=e.filter(x=>x[1].strength).length; el("statBadminton").textContent=e.filter(x=>x[1].badminton).length; el("daysLogged").textContent=e.length+" days logged";
 const pct=Math.max(0,Math.min(100,(state.profile.startWeight-current)/(state.profile.startWeight-state.profile.goalWeight)*100)); el("goalBar").style.width=pct+"%";
 drawChart(weights.slice(0,30).reverse());
 el("dashboardWeekly").innerHTML=e.slice(0,7).map(x=>`<div class="food-row"><span>${x[0]}</span><strong>${x[1].weight?x[1].weight+" kg":"—"} • ${x[1].calories||0} kcal</strong></div>`).join("")||'<p class="muted">Start logging to see your week.</p>';
}
function drawChart(weights){
 const c=el("weightChart"),ctx=c.getContext("2d"),w=c.clientWidth||600,h=230,dpr=devicePixelRatio||1;c.width=w*dpr;c.height=h*dpr;ctx.scale(dpr,dpr);ctx.clearRect(0,0,w,h);
 if(weights.length<2){ctx.fillStyle="#94a3b8";ctx.font="14px system-ui";ctx.fillText("Log at least two weights to see your trend.",20,110);return}
 const min=Math.min(...weights)-1,max=Math.max(...weights)+1;ctx.strokeStyle="#cbd5e1";ctx.beginPath();ctx.moveTo(35,15);ctx.lineTo(35,h-25);ctx.lineTo(w-15,h-25);ctx.stroke();
 ctx.strokeStyle="#111827";ctx.lineWidth=3;ctx.beginPath();
 weights.forEach((v,i)=>{const x=35+i*(w-55)/(weights.length-1),y=15+(max-v)*(h-40)/(max-min);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke();
}
function renderDaily(){
 const rows=entries().slice(0,14);el("dailyTable").innerHTML=rows.length?`<table class="data-table"><thead><tr><th>Date</th><th>Weight</th><th>Calories</th><th>Protein</th><th>Water</th><th>Training</th></tr></thead><tbody>${rows.map(([d,x])=>`<tr><td>${d}</td><td>${x.weight||"—"}</td><td>${x.calories||"—"}</td><td>${x.protein||"—"}</td><td>${x.water||"—"}</td><td>${[x.strength?"Strength":"",x.badminton?"Badminton":""].filter(Boolean).join(" + ")||"—"}</td></tr>`).join("")}</tbody></table>`:'<p class="muted">No daily logs yet.</p>';
}
function foodTotals(date=today()){const list=state.foods[date]||[];return {cal:list.reduce((s,x)=>s+x.cal*x.qty,0),protein:list.reduce((s,x)=>s+x.protein*x.qty,0)}}
function renderNutrition(){
 const date=today(), list=state.foods[date]||[],t=foodTotals(date);el("foodCal").textContent=Math.round(t.cal);el("foodProtein").textContent=Math.round(t.protein);
 el("foodList").innerHTML=list.length?list.map((x,i)=>`<div class="food-row"><span>${foodLabels[x.food]} × ${x.qty}</span><span>${Math.round(x.cal*x.qty)} kcal • ${Math.round(x.protein*x.qty)}g <button class="danger" onclick="removeFood(${i})">×</button></span></div>`).join(""):'<p class="muted">No food logged today.</p>';
}
function renderFoodOptions(){el("foodSelect").innerHTML=Object.keys(foods).map(k=>`<option value="${k}">${foodLabels[k]} — ${foods[k].cal} kcal / ${foods[k].protein}g protein</option>`).join("");el("foodCards").innerHTML=Object.keys(foods).slice(0,8).map(k=>`<div class="food-card" onclick="quickFood('${k}')"><strong>${foodLabels[k]}</strong><br><small>${foods[k].cal} kcal • ${foods[k].protein}g protein</small></div>`).join("")}
function addFood(food,qty){state.foods[today()]??=[];state.foods[today()].push({food,qty:Number(qty),cal:foods[food].cal,protein:foods[food].protein});save()}
function quickFood(k){addFood(k,1)}
function removeFood(i){state.foods[today()].splice(i,1);save()}
function renderWorkout(){
 const rows=state.workouts.slice().reverse().slice(0,20);el("workoutTable").innerHTML=rows.length?`<table class="data-table"><thead><tr><th>Date</th><th>Split</th><th>Exercise</th><th>Weight</th><th>Sets</th><th>Reps</th><th>Badminton</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${x.date}</td><td>${esc(x.split)}</td><td>${esc(x.exercise||"—")}</td><td>${x.weight||"—"}</td><td>${x.sets||"—"}</td><td>${x.reps||"—"}</td><td>${x.badminton?"Yes":"No"}</td></tr>`).join("")}</tbody></table>`:'<p class="muted">No workouts yet.</p>';
}
function weekStart(i){const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-d.getDay()+1-i*7);return d}
function renderWeeks(){
 const sel=el("weekSelect");sel.innerHTML=Array.from({length:8},(_,i)=>`<option value="${i}">Week ${i+1}</option>`).join("");sel.value=state.week;
 const s=weekStart(Number(state.week)),dates=[];for(let i=0;i<7;i++){const d=new Date(s);d.setDate(s.getDate()+i);dates.push(d.toISOString().slice(0,10))}
 const rows=dates.map(d=>[d,state.daily[d]]), valid=rows.map(x=>x[1]).filter(Boolean),weights=valid.map(x=>+x.weight).filter(Boolean),cals=valid.map(x=>+x.calories).filter(Boolean),prots=valid.map(x=>+x.protein).filter(Boolean);
 el("weekDays").textContent=valid.length;el("weekWeight").textContent=avg(weights)?.toFixed(1)+" kg"??"—";el("weekCalories").textContent=avg(cals)?.toFixed(0)??"—";el("weekProtein").textContent=avg(prots)?.toFixed(0)+" g"??"—";
 el("weekTable").innerHTML=`<table class="data-table"><thead><tr><th>Date</th><th>Weight</th><th>Calories</th><th>Protein</th><th>Workout</th></tr></thead><tbody>${rows.map(([d,x])=>`<tr><td>${d}</td><td>${x?.weight||"—"}</td><td>${x?.calories||"—"}</td><td>${x?.protein||"—"}</td><td>${x?[x.strength?"Strength":"",x.badminton?"Badminton":""].filter(Boolean).join(" + ")||"—":"—"}</td></tr>`).join("")}</tbody></table>`;
}
function renderAll(){renderDashboard();renderDaily();renderNutrition();renderWorkout();renderWeeks()}

document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>showTab(b.dataset.tab)));
document.querySelectorAll("[data-jump]").forEach(b=>b.addEventListener("click",()=>showTab(b.dataset.jump)));

el("dailyForm").addEventListener("submit",e=>{e.preventDefault();const d=el("dailyDate").value;state.daily[d]={weight:+el("dailyWeight").value||null,calories:+el("dailyCalories").value||null,protein:+el("dailyProtein").value||null,water:+el("dailyWater").value||null,sleep:+el("dailySleep").value||null,steps:+el("dailySteps").value||null,strength:el("dailyStrength").checked,badminton:el("dailyBadminton").checked,notes:el("dailyNotes").value};save()});
el("addFood").addEventListener("click",()=>addFood(el("foodSelect").value,el("foodQty").value));
el("clearFood").addEventListener("click",()=>{if(confirm("Clear today's food?")){delete state.foods[today()];save()}});
el("workoutForm").addEventListener("submit",e=>{e.preventDefault();state.workouts.push({date:el("workoutDate").value,split:el("workoutSplit").value,exercise:el("exerciseName").value,weight:+el("exerciseWeight").value||null,sets:+el("exerciseSets").value||null,reps:+el("exerciseReps").value||null,badminton:el("workoutBadminton").checked,completed:el("workoutCompleted").checked});save()});
el("weekSelect").addEventListener("change",()=>{state.week=+el("weekSelect").value;save()});
el("exportBtn").addEventListener("click",()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="fittrack-backup.json";a.click();URL.revokeObjectURL(a.href)});
el("resetBtn").addEventListener("click",()=>{if(confirm("Reset all FitTrack data?")){localStorage.removeItem(KEY);location.reload()}});

setToday();renderFoodOptions();renderAll();
