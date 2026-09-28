const KEY="moneyTrackData";
const defaultData={version:1,accounts:{cash:0,upi:0,bank:0,other:0},transactions:[],people:[],settings:{dark:false}};

let data=load();
const $=id=>document.getElementById(id);
const accountNames={cash:"Cash",upi:"UPI",bank:"Bank",other:"Other"};
const accountIcons={cash:"💵",upi:"📱",bank:"🏦",other:"💳"};
const typeNames={income:"Income",expense:"Expense",given:"Money Given",received:"Money Received",transfer:"Transfer"};

function clone(o){return JSON.parse(JSON.stringify(o))}
function load(){try{const x=JSON.parse(localStorage.getItem(KEY));return x?{...clone(defaultData),...x,accounts:{...defaultData.accounts,...x.accounts},people:Array.isArray(x.people)?x.people:[],transactions:Array.isArray(x.transactions)?x.transactions:[],settings:{...defaultData.settings,...x.settings}}:clone(defaultData)}catch{return clone(defaultData)}}
function save(){localStorage.setItem(KEY,JSON.stringify(data))}
function money(n){return new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:2}).format(Number(n)||0)}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,8)}
function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200)}
function personName(id){return data.people.find(p=>p.id===id)?.name||""}

function balanceFromTransactions(){
  const b={...data.accounts};
  for(const t of data.transactions){
    if(t.type==="income"||t.type==="received") b[t.account]=(b[t.account]||0)+t.amount;
    else if(t.type==="expense"||t.type==="given") b[t.account]=(b[t.account]||0)-t.amount;
    else if(t.type==="transfer"){b[t.account]=(b[t.account]||0)-t.amount;b[t.toAccount]=(b[t.toAccount]||0)+t.amount}
  }
  return b;
}
function currentBalances(){return balanceFromTransactions()}

function render(){
  const b=currentBalances();
  const total=Object.values(b).reduce((a,v)=>a+v,0);
  const income=data.transactions.filter(t=>t.type==="income").reduce((a,t)=>a+t.amount,0);
  const expense=data.transactions.filter(t=>t.type==="expense").reduce((a,t)=>a+t.amount,0);
  $("dashBalance").textContent=money(total);$("dashIncome").textContent=money(income);$("dashExpense").textContent=money(expense);$("dashCount").textContent=data.transactions.length;
  renderAccounts(b);renderRecent();renderCategories();renderTransactions();renderPeople();renderReports();renderPersonOptions();applyTheme();
}
function renderAccounts(b=currentBalances()){
  const html=Object.keys(accountNames).map(k=>`<div class="account-card"><div class="account-top"><div><div class="account-icon">${accountIcons[k]}</div></div><span class="muted">${accountNames[k]}</span></div><p>Current balance</p><h3>${money(b[k])}</h3></div>`).join("");
  $("dashAccounts").innerHTML=html;$("accountsPageGrid").innerHTML=html;
}
function renderRecent(){
  const list=[...data.transactions].sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt).slice(0,6);
  $("recentList").innerHTML=list.length?list.map(t=>transactionMini(t)).join(""):`<div class="empty">No transactions yet. Add your first one.</div>`;
}
function transactionMini(t){
  const positive=["income","received"].includes(t.type), person=personName(t.personId);
  return `<div class="category-row"><div><div class="transaction-name">${typeNames[t.type]}${person?" · "+esc(person):""}</div><div class="transaction-sub">${esc(t.category||"Other")} · ${esc(t.date)}</div></div><strong class="${positive?"amount-income":"amount-expense"}">${positive?"+":"-"}${money(t.amount)}</strong></div>`;
}
function renderCategories(){
  const map={};data.transactions.filter(t=>t.type==="expense").forEach(t=>map[t.category]=(map[t.category]||0)+t.amount);
  const arr=Object.entries(map).sort((a,b)=>b[1]-a[1]);
  $("categorySummary").innerHTML=arr.length?arr.slice(0,8).map(([k,v])=>`<div class="category-row"><span>${esc(k)}</span><strong>${money(v)}</strong></div>`).join(""):`<div class="empty">No expense data yet.</div>`;
}
function filteredTransactions(){
  const q=$("searchTransactions").value.trim().toLowerCase(), type=$("filterType").value, acc=$("filterAccount").value, month=$("filterDate").value;
  return [...data.transactions].filter(t=>{
    const hay=[t.category,t.note,t.type,t.account,personName(t.personId)].join(" ").toLowerCase();
    return (!q||hay.includes(q))&&(type==="all"||t.type===type)&&(acc==="all"||t.account===acc)&&(!month||t.date.startsWith(month));
  }).sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt);
}
function renderTransactions(){
  const rows=filteredTransactions();
  $("transactionTable").innerHTML=rows.length?rows.map(t=>{
    const pos=["income","received"].includes(t.type);
    const account=t.type==="transfer"?`${accountNames[t.account]} → ${accountNames[t.toAccount]}`:accountNames[t.account];
    return `<tr><td>${esc(t.date)}</td><td><div class="transaction-name">${typeNames[t.type]}</div><div class="transaction-sub">${esc(t.category)}${t.note?" · "+esc(t.note):""}</div></td><td>${esc(personName(t.personId)||"—")}</td><td>${account}</td><td class="${pos?"amount-income":"amount-expense"}">${pos?"+":"-"}${money(t.amount)}</td><td><div class="row-actions"><button class="icon-action" data-edit-t="${t.id}">✏️</button><button class="icon-action" data-delete-t="${t.id}">🗑️</button></div></td></tr>`;
  }).join(""):`<tr><td colspan="6"><div class="empty">No transactions match your filters.</div></td></tr>`;
}
function renderPersonOptions(){
  const sel=$("transactionPerson"), old=sel.value;
  sel.innerHTML='<option value="">No person / Personal</option>'+data.people.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join("");
  if(data.people.some(p=>p.id===old))sel.value=old;
}
function renderPeople(){
  $("peopleGrid").innerHTML=data.people.length?data.people.map(p=>{
    const given=data.transactions.filter(t=>t.personId===p.id&&t.type==="given").reduce((a,t)=>a+t.amount,0);
    const received=data.transactions.filter(t=>t.personId===p.id&&t.type==="received").reduce((a,t)=>a+t.amount,0);
    return `<div class="person-card"><div class="person-head"><div class="avatar">${esc(p.name.charAt(0).toUpperCase())}</div><div><h3>${esc(p.name)}</h3><div class="muted">${esc(p.relation||"Contact")}</div></div></div><div class="person-stats"><div class="person-stat"><small>Given</small><strong>${money(given)}</strong></div><div class="person-stat"><small>Received</small><strong>${money(received)}</strong></div></div><div class="muted">${esc(p.phone||"No phone")} ${p.email?" · "+esc(p.email):""}</div><div class="person-actions"><button class="secondary" data-edit-p="${p.id}">Edit</button><button class="danger" data-delete-p="${p.id}">Delete</button></div></div>`;
  }).join(""):`<div class="panel"><div class="empty">No people added yet. Add contacts to connect transactions with real people.</div></div>`;
}
function renderReports(){
  const income=data.transactions.filter(t=>t.type==="income").reduce((a,t)=>a+t.amount,0), expense=data.transactions.filter(t=>t.type==="expense").reduce((a,t)=>a+t.amount,0), given=data.transactions.filter(t=>t.type==="given").reduce((a,t)=>a+t.amount,0), received=data.transactions.filter(t=>t.type==="received").reduce((a,t)=>a+t.amount,0);
  $("reportIncome").textContent=money(income);$("reportExpense").textContent=money(expense);$("reportGiven").textContent=money(given);$("reportReceived").textContent=money(received);
  const map={};data.transactions.filter(t=>t.type==="expense").forEach(t=>map[t.category]=(map[t.category]||0)+t.amount);const cats=Object.entries(map).sort((a,b)=>b[1]-a[1]);const max=cats[0]?.[1]||1;
  $("reportCategories").innerHTML=cats.length?cats.map(([k,v])=>`<div class="bar-row"><div class="bar-label"><span>${esc(k)}</span><strong>${money(v)}</strong></div><div class="bar-track"><div class="bar-fill" style="width:${v/max*100}%"></div></div></div>`).join(""):`<div class="empty">No expense data yet.</div>`;
  const months=[];const now=new Date();for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1),key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;months.push([key,d.toLocaleString("en-IN",{month:"short",year:"numeric"})])}
  const vals=months.map(([k,label])=>{const inc=data.transactions.filter(t=>t.date.startsWith(k)&&t.type==="income").reduce((a,t)=>a+t.amount,0),exp=data.transactions.filter(t=>t.date.startsWith(k)&&t.type==="expense").reduce((a,t)=>a+t.amount,0);return [label,inc,exp]});const mmax=Math.max(1,...vals.map(x=>Math.max(x[1],x[2])));
  $("monthlyReport").innerHTML=vals.map(x=>`<div class="bar-row"><div class="bar-label"><span>${x[0]}</span><strong>${money(x[1]-x[2])}</strong></div><div class="bar-track"><div class="bar-fill" style="width:${Math.max(2,Math.abs(x[1]-x[2])/mmax*100)}%"></div></div><div class="transaction-sub">Income ${money(x[1])} · Expense ${money(x[2])}</div></div>`).join("");
}
function showPage(page){
  document.querySelectorAll(".page").forEach(x=>x.classList.toggle("active",x.id==="page-"+page));
  document.querySelectorAll(".nav-item[data-page]").forEach(x=>x.classList.toggle("active",x.dataset.page===page));
  const names={dashboard:["Dashboard","Your money at a glance."],transactions:["Transactions","Search, filter and manage every transaction."],accounts:["Accounts","Manage your cash and online balances."],people:["People","Contacts and money exchanged with them."],reports:["Reports","Understand where your money goes."],settings:["Settings","Backup and customize your tracker."]};
  $("pageTitle").textContent=names[page][0];$("pageSubtitle").textContent=names[page][1];$("sidebar").classList.remove("open");
  window.scrollTo({top:0,behavior:"smooth"});
}
function openModal(id){$(id).classList.add("show")}
function closeModal(id){$(id).classList.remove("show")}
function resetTransaction(){ $("transactionForm").reset();$("transactionId").value="";$("transactionDate").value=today();$("toAccountWrap").classList.add("hidden");$("transactionModalTitle").textContent="Add Transaction"}
function openTransaction(id=null){
  resetTransaction();renderPersonOptions();
  if(id){const t=data.transactions.find(x=>x.id===id);if(!t)return;$("transactionModalTitle").textContent="Edit Transaction";$("transactionId").value=t.id;Object.entries({transactionType:t.type,transactionAmount:t.amount,transactionAccount:t.account,transactionCategory:t.category,transactionPerson:t.personId||"",transactionDate:t.date,transactionNote:t.note||""}).forEach(([k,v])=>$(k).value=v);if(t.type==="transfer"){$("toAccountWrap").classList.remove("hidden");$("toAccount").value=t.toAccount}}
  openModal("transactionModal");
}
function transactionSubmit(e){
  e.preventDefault();
  const type=$("transactionType").value, amount=Number($("transactionAmount").value), account=$("transactionAccount").value, toAccount=$("toAccount").value;
  if(amount<=0)return toast("Enter a valid amount.");
  if(type==="transfer"&&account===toAccount)return toast("Transfer accounts must be different.");
  const id=$("transactionId").value;
  const item={id:id||uid(),type,amount,account,toAccount:type==="transfer"?toAccount:"",category:$("transactionCategory").value,personId:$("transactionPerson").value,date:$("transactionDate").value,note:$("transactionNote").value.trim(),createdAt:id?(data.transactions.find(t=>t.id===id)?.createdAt||Date.now()):Date.now()};
  if(id){const i=data.transactions.findIndex(t=>t.id===id);data.transactions[i]=item}else data.transactions.push(item);
  save();closeModal("transactionModal");render();toast(id?"Transaction updated":"Transaction saved");
}
function openPerson(id=null){
  $("personForm").reset();$("personId").value="";$("personModalTitle").textContent="Add Person";
  if(id){const p=data.people.find(x=>x.id===id);if(!p)return;$("personModalTitle").textContent="Edit Person";$("personId").value=p.id;$("personName").value=p.name;$("personPhone").value=p.phone||"";$("personEmail").value=p.email||"";$("personRelation").value=p.relation||"";$("personNotes").value=p.notes||""}
  openModal("personModal");
}
function personSubmit(e){e.preventDefault();const id=$("personId").value,item={id:id||uid(),name:$("personName").value.trim(),phone:$("personPhone").value.trim(),email:$("personEmail").value.trim(),relation:$("personRelation").value.trim(),notes:$("personNotes").value.trim()};if(!item.name)return; if(id){const i=data.people.findIndex(p=>p.id===id);data.people[i]=item}else data.people.push(item);save();closeModal("personModal");render();toast(id?"Person updated":"Person added")}
function openBalances(){const b=data.accounts;$("startCash").value=b.cash||0;$("startUpi").value=b.upi||0;$("startBank").value=b.bank||0;$("startOther").value=b.other||0;openModal("balancesModal")}
function balanceSubmit(e){e.preventDefault();data.accounts={cash:Number($("startCash").value)||0,upi:Number($("startUpi").value)||0,bank:Number($("startBank").value)||0,other:Number($("startOther").value)||0};save();closeModal("balancesModal");render();toast("Starting balances saved")}
function deleteTransaction(id){if(!confirm("Delete this transaction? This cannot be undone."))return;data.transactions=data.transactions.filter(t=>t.id!==id);save();render();toast("Transaction deleted")}
function deletePerson(id){if(!confirm("Delete this person? Existing transactions will remain but lose the contact link."))return;data.people=data.people.filter(p=>p.id!==id);data.transactions.forEach(t=>{if(t.personId===id)t.personId=""});save();render();toast("Person deleted")}
function exportJson(){const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});download(blob,"moneytrack-backup.json")}
function exportCsv(){const head=["Date","Type","Amount","Account","To Account","Category","Person","Note"];const rows=data.transactions.map(t=>[t.date,typeNames[t.type],t.amount,accountNames[t.account],accountNames[t.toAccount]||"",t.category,personName(t.personId),t.note]);const csv=[head,...rows].map(r=>r.map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(",")).join("\n");download(new Blob([csv],{type:"text/csv"}),"moneytrack-transactions.csv")}
function download(blob,name){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click();URL.revokeObjectURL(a.href)}
function importJson(file){const reader=new FileReader();reader.onload=()=>{try{const x=JSON.parse(reader.result);if(!x.accounts||!Array.isArray(x.transactions)||!Array.isArray(x.people))throw Error();data={...clone(defaultData),...x};save();render();toast("Backup imported")}catch{toast("Invalid MoneyTrack backup file")}};reader.readAsText(file)}
function applyTheme(){document.body.classList.toggle("dark",!!data.settings.dark);$("darkMode").checked=!!data.settings.dark}

document.addEventListener("click",e=>{
  const nav=e.target.closest("[data-page]");if(nav){e.preventDefault();showPage(nav.dataset.page);return}
  const target=e.target.closest("[data-page-target]");if(target){showPage(target.dataset.pageTarget);return}
  const close=e.target.closest("[data-close]");if(close){closeModal(close.dataset.close);return}
  const et=e.target.closest("[data-edit-t]");if(et)openTransaction(et.dataset.editT);
  const dt=e.target.closest("[data-delete-t]");if(dt)deleteTransaction(dt.dataset.deleteT);
  const ep=e.target.closest("[data-edit-p]");if(ep)openPerson(ep.dataset.editP);
  const dp=e.target.closest("[data-delete-p]");if(dp)deletePerson(dp.dataset.deleteP);
});
$("quickAdd").onclick=()=>openTransaction();$("mobileAdd").onclick=()=>openTransaction();$("addPersonBtn").onclick=()=>openPerson();$("editStartingBalances").onclick=openBalances;
$("transactionForm").onsubmit=transactionSubmit;$("personForm").onsubmit=personSubmit;$("balancesForm").onsubmit=balanceSubmit;
$("transactionType").onchange=()=>{$("toAccountWrap").classList.toggle("hidden",$("transactionType").value!=="transfer")};
["searchTransactions","filterType","filterAccount","filterDate"].forEach(id=>$(id).addEventListener("input",renderTransactions));
$("clearFilters").onclick=()=>{$("searchTransactions").value="";$("filterType").value="all";$("filterAccount").value="all";$("filterDate").value="";renderTransactions()};
$("exportData").onclick=exportJson;$("exportCsv").onclick=exportCsv;$("importData").onchange=e=>e.target.files[0]&&importJson(e.target.files[0]);
$("darkMode").onchange=e=>{data.settings.dark=e.target.checked;save();applyTheme()};
$("resetData").onclick=()=>{if(confirm("Clear ALL MoneyTrack data from this browser?")){data=clone(defaultData);save();render();toast("All data cleared")}};
$("menuBtn").onclick=()=>$("sidebar").classList.toggle("open");
document.querySelectorAll(".modal").forEach(m=>m.addEventListener("click",e=>{if(e.target===m)closeModal(m.id)}));
render();

// Close the mobile sidebar when clicking outside it.
document.addEventListener("click", event => {
    const sidebar = document.getElementById("sidebar");
    const menu = document.getElementById("menuBtn");
    if (sidebar.classList.contains("open") &&
        !sidebar.contains(event.target) &&
        !menu.contains(event.target)) {
        sidebar.classList.remove("open");
    }
});
