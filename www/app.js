const KEY="moneytrack_v1";
const defaultData={theme:"light",accounts:[{id:id(),name:"Cash",type:"Cash",bank:"",app:"",opening:0}],people:[],transactions:[]};
let data=load(); let currentPage="dashboard"; let editingTx=null, editingAccount=null, editingPerson=null;

function id(){return Math.random().toString(36).slice(2,10)+Date.now().toString(36)}
function load(){try{const x=JSON.parse(localStorage.getItem(KEY));return x&&x.accounts&&x.transactions?x:structuredClone(defaultData)}catch{return structuredClone(defaultData)}}
function save(){localStorage.setItem(KEY,JSON.stringify(data))}
function money(n){return new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:2}).format(Number(n)||0)}
function esc(s=""){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function fmtDate(d){return new Date(d+"T00:00:00").toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}
function today(){return new Date().toISOString().slice(0,10)}
function accountName(id){return data.accounts.find(a=>a.id===id)?.name||"Deleted account"}
function personName(id){return data.people.find(p=>p.id===id)?.name||"—"}
function txType(t){return {income:"Income",expense:"Expense",given:"Money given",received:"Money received",transfer:"Transfer"}[t]||t}
function signedAmount(t){return ["income","received"].includes(t)?Number(t.amount):-Number(t.amount)}
function accountBalance(a){return Number(a.opening||0)+data.transactions.filter(t=>t.accountId===a.id).reduce((s,t)=>s+signedAmount(t),0)-data.transactions.filter(t=>t.type==="transfer"&&t.toAccountId===a.id).reduce((s,t)=>s+Number(t.amount),0)}
function totals(tx=data.transactions){return {income:tx.filter(t=>t.type==="income").reduce((s,t)=>s+Number(t.amount),0),expense:tx.filter(t=>t.type==="expense").reduce((s,t)=>s+Number(t.amount),0),given:tx.filter(t=>t.type==="given").reduce((s,t)=>s+Number(t.amount),0),received:tx.filter(t=>t.type==="received").reduce((s,t)=>s+Number(t.amount),0)}}
function totalBalance(){return data.accounts.reduce((s,a)=>s+accountBalance(a),0)}
function personBalance(p){return data.transactions.filter(t=>t.personId===p.id).reduce((s,t)=>s+(t.type==="given"?Number(t.amount):t.type==="received"?-Number(t.amount):0),0)}
function showToast(msg){const x=document.getElementById("toast");x.textContent=msg;x.classList.add("show");setTimeout(()=>x.classList.remove("show"),2200)}
function go(page){currentPage=page;document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));document.getElementById("page-"+page).classList.add("active");document.querySelectorAll(".nav-item").forEach(x=>x.classList.toggle("active",x.dataset.page===page));document.getElementById("pageTitle").textContent=page[0].toUpperCase()+page.slice(1);document.getElementById("pageEyebrow").textContent=page==="dashboard"?"Overview":"MoneyTrack";document.getElementById("sidebar").classList.remove("open");render()}
function render(){renderDashboard();renderAccounts();renderPeople();renderReports();renderSettings();document.body.classList.toggle("dark",data.theme==="dark");document.getElementById("darkToggle").checked=data.theme==="dark"}
function renderDashboard(){
 const t=totals(), bal=totalBalance();
 document.getElementById("summaryCards").innerHTML=[
  card("Total balance",money(bal),"Across all accounts","▣"),
  card("Total income",money(t.income),"Money coming in","↗","positive"),
  card("Total expenses",money(t.expense),"Money spent","↘","negative"),
  card("Given / received",money(t.given-t.received),t.given>=t.received?"Net given":"Net received","⇄",t.given>=t.received?"negative":"positive")
 ].join("");
 const recent=[...data.transactions].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6);
 document.getElementById("recentTransactions").innerHTML=recent.length?recent.map(txHtml).join(""):empty("No transactions yet","Add your first transaction to start tracking.");
 document.getElementById("accountSnapshot").innerHTML=data.accounts.length?data.accounts.map(a=>`<div class="transaction"><div class="tx-icon">₹</div><div class="tx-main"><b>${esc(a.name)}</b><span>${esc(a.type)}${a.app?" · "+esc(a.app):""}</span></div><div class="amount">${money(accountBalance(a))}</div></div>`).join(""):empty("No accounts","Create an account first.");
}
function card(label,value,meta,symbol,cls=""){return `<div class="summary-card"><div class="symbol">${symbol}</div><div class="label">${label}</div><div class="value ${cls}">${value}</div><div class="meta">${meta}</div></div>`}
function txHtml(t){let cls=t.type==="income"||t.type==="received"?"positive":t.type==="expense"||t.type==="given"?"negative":"neutral";let sign=["income","received"].includes(t.type)?"+":"-";return `<div class="transaction"><div class="tx-icon">${t.type==="expense"?"−":t.type==="income"?"↗":t.type==="transfer"?"⇄":"₹"}</div><div class="tx-main"><b>${esc(t.description||txType(t))}</b><span>${fmtDate(t.date)} · ${esc(accountName(t.accountId))}${t.personId?" · "+esc(personName(t.personId)):""}</span></div><div class="amount ${cls}">${t.type==="transfer"?"":sign+money(t.amount)}</div></div>`}
function empty(title,msg){return `<div class="empty"><strong>${title}</strong>${msg}</div>`}
function renderAccounts(){
 const el=document.getElementById("accountsGrid");
 el.innerHTML=data.accounts.length?data.accounts.map(a=>`<div class="account-card"><div class="account-top"><div class="account-icon">${a.type==="UPI"?"U":"₹"}</div><div><button class="text-btn" onclick="openAccount('${a.id}')">Edit</button> <button class="text-btn" onclick="deleteAccount('${a.id}')">Delete</button></div></div><h3>${esc(a.name)}</h3><div class="account-type">${esc(a.type)}${a.bank?" · "+esc(a.bank):""}${a.app?" · "+esc(a.app):""}</div><div class="balance">${money(accountBalance(a))}</div><div class="account-actions"><button class="soft-btn" onclick="openTx('${a.id}')">Add transaction</button></div></div>`).join(""):empty("No accounts","Add Cash, UPI, or another account.");
}
function renderPeople(){
 const balances=data.people.map(personBalance), owed=balances.filter(x=>x<0).reduce((s,x)=>s+Math.abs(x),0), owedToYou=balances.filter(x=>x>0).reduce((s,x)=>s+x,0);
 document.getElementById("peopleSummary").innerHTML=[card("Owed to you",money(owedToYou),"Outstanding","↑","positive"),card("You owe",money(owed),"Outstanding","↓","negative"),card("People tracked",data.people.length,"Contacts","♙")].join("");
 document.getElementById("peopleList").innerHTML=data.people.length?data.people.map(p=>{let b=personBalance(p);return `<div class="transaction"><div class="tx-icon">${esc(p.name.charAt(0).toUpperCase())}</div><div class="tx-main"><b>${esc(p.name)}</b><span>${esc(p.note||"No note")} · ${data.transactions.filter(t=>t.personId===p.id).length} records</span></div><div><div class="amount ${b>=0?"positive":"negative"}">${b>=0?"+":"-"}${money(Math.abs(b))}</div><div style="text-align:right;margin-top:4px"><button class="text-btn" onclick="openPerson('${p.id}')">Edit</button> <button class="text-btn" onclick="deletePerson('${p.id}')">Delete</button></div></div></div>`}).join(""):empty("No people added","Add someone to track money given or received.");
}
function filteredTx(){
 let tx=[...data.transactions];
 const range=document.getElementById("reportRange")?.value||"all", now=new Date();
 if(range==="month")tx=tx.filter(t=>{let d=new Date(t.date);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()});
 if(range==="year")tx=tx.filter(t=>new Date(t.date).getFullYear()===now.getFullYear());
 const q=(document.getElementById("searchTx")?.value||"").toLowerCase(), type=document.getElementById("typeFilter")?.value||"all";
 if(q)tx=tx.filter(t=>`${t.description} ${t.notes} ${accountName(t.accountId)} ${personName(t.personId)}`.toLowerCase().includes(q));
 if(type!=="all")tx=tx.filter(t=>t.type===type);
 return tx;
}
function renderReports(){
 const tx=filteredTx(), t=totals(tx);
 document.getElementById("reportSummary").innerHTML=[card("Income",money(t.income),"Selected period","↗","positive"),card("Expenses",money(t.expense),"Selected period","↘","negative"),card("Given",money(t.given),"Money lent","↑","negative"),card("Received",money(t.received),"Money received","↓","positive")].join("");
 const cats={};tx.filter(x=>x.type==="expense").forEach(x=>cats[x.category||"Other"]=(cats[x.category||"Other"]||0)+Number(x.amount)); renderBars("categoryChart",cats);
 const ac={};data.accounts.forEach(a=>ac[a.name]=accountBalance(a));renderBars("accountChart",ac);
 const tbody=document.getElementById("transactionTable");let sorted=tx.sort((a,b)=>b.date.localeCompare(a.date));
 tbody.innerHTML=sorted.length?sorted.map(t=>`<tr><td>${fmtDate(t.date)}</td><td><b>${esc(t.description||txType(t))}</b><br><small class="muted">${esc(t.notes||"")}</small></td><td><span class="badge">${txType(t)}</span></td><td>${esc(accountName(t.accountId))}</td><td>${esc(personName(t.personId))}</td><td class="${["income","received"].includes(t.type)?"positive":t.type==="transfer"?"neutral":"negative"}">${t.type==="transfer"?money(t.amount):(["income","received"].includes(t.type)?"+":"-")+money(t.amount)}</td><td><button class="text-btn" onclick="openTx(null,'${t.id}')">Edit</button> <button class="text-btn" onclick="deleteTx('${t.id}')">Delete</button></td></tr>`).join(""):`<tr><td colspan="7">${empty("No matching transactions","Try another filter or add a transaction.")}</td></tr>`;
}
function renderBars(id,obj){const el=document.getElementById(id), entries=Object.entries(obj).filter(([,v])=>v>0), max=Math.max(...entries.map(x=>x[1]),1);el.innerHTML=entries.length?entries.map(([k,v])=>`<div class="bar-row"><div class="bar-label"><span>${esc(k)}</span><b>${money(v)}</b></div><div class="bar-track"><div class="bar-fill" style="width:${v/max*100}%"></div></div></div>`).join(""):empty("No data","There is not enough data for this breakdown yet.")}
function renderSettings(){document.getElementById("dataCount").innerHTML=`<span>${data.accounts.length} accounts</span><span>${data.people.length} people</span><span>${data.transactions.length} transactions</span>`}

function openModal(content){document.getElementById("modal").innerHTML=content;document.getElementById("modalBackdrop").classList.add("open")}
function closeModal(){document.getElementById("modalBackdrop").classList.remove("open")}
function accountOptions(selected=""){return data.accounts.map(a=>`<option value="${a.id}" ${a.id===selected?"selected":""}>${esc(a.name)}</option>`).join("")}
function personOptions(selected=""){return `<option value="">No person</option>`+data.people.map(p=>`<option value="${p.id}" ${p.id===selected?"selected":""}>${esc(p.name)}</option>`).join("")}
function openTx(accountId=null,txId=null){
 const t=txId?data.transactions.find(x=>x.id===txId):null; editingTx=txId;
 const transfer=t?.type==="transfer";
 openModal(`<h2>${t?"Edit":"Add"} transaction</h2><div class="modal-sub">Record income, expenses, personal lending, receiving, or transfers.</div>
 <div class="form-grid">
 <div class="field"><label>TYPE</label><select id="fType" onchange="toggleTxFields()"><option value="expense" ${t?.type==="expense"?"selected":""}>Expense</option><option value="income" ${t?.type==="income"?"selected":""}>Income</option><option value="given" ${t?.type==="given"?"selected":""}>Money given</option><option value="received" ${t?.type==="received"?"selected":""}>Money received</option><option value="transfer" ${transfer?"selected":""}>Transfer</option></select></div>
 <div class="field"><label>AMOUNT (₹)</label><input id="fAmount" type="number" min="0" step="0.01" value="${t?.amount||""}" placeholder="0.00"></div>
 <div class="field"><label>DATE</label><input id="fDate" type="date" value="${t?.date||today()}"></div>
 <div class="field"><label>ACCOUNT</label><select id="fAccount">${accountOptions(t?.accountId||accountId||data.accounts[0]?.id||"")}</select></div>
 <div class="field" id="toAccountWrap" style="display:${transfer?"block":"none"}"><label>TO ACCOUNT</label><select id="fToAccount">${accountOptions(t?.toAccountId||"")}</select></div>
 <div class="field" id="categoryWrap"><label>CATEGORY</label><select id="fCategory">${["Food","Transport","Shopping","Bills","Education","Health","Entertainment","Salary","Freelance","Other"].map(x=>`<option ${t?.category===x?"selected":""}>${x}</option>`).join("")}</select></div>
 <div class="field" id="personWrap" style="display:${["given","received"].includes(t?.type)?"block":"none"}"><label>PERSON</label><select id="fPerson">${personOptions(t?.personId||"")}</select></div>
 <div class="field full"><label>DESCRIPTION</label><input id="fDescription" value="${esc(t?.description||"")}" placeholder="e.g. Grocery shopping"></div>
 <div class="field full"><label>NOTES</label><textarea id="fNotes" placeholder="Optional details">${esc(t?.notes||"")}</textarea></div>
 </div><div class="modal-actions"><button class="soft-btn" onclick="closeModal()">Cancel</button><button class="primary-btn" onclick="saveTx()">Save transaction</button></div>`);
}
function toggleTxFields(){const type=document.getElementById("fType").value;document.getElementById("personWrap").style.display=["given","received"].includes(type)?"block":"none";document.getElementById("toAccountWrap").style.display=type==="transfer"?"block":"none";document.getElementById("categoryWrap").style.display=type==="expense"?"block":"none"}
function saveTx(){
 const type=document.getElementById("fType").value, amount=Number(document.getElementById("fAmount").value);
 if(!amount||amount<0)return showToast("Enter a valid amount.");
 const tx={id:editingTx||id(),type,amount,date:document.getElementById("fDate").value,accountId:document.getElementById("fAccount").value,toAccountId:type==="transfer"?document.getElementById("fToAccount").value:"",category:type==="expense"?document.getElementById("fCategory").value:"",personId:["given","received"].includes(type)?document.getElementById("fPerson").value:"",description:document.getElementById("fDescription").value.trim(),notes:document.getElementById("fNotes").value.trim()};
 if(type==="transfer"&&(!tx.toAccountId||tx.toAccountId===tx.accountId))return showToast("Choose a different destination account.");
 if(editingTx){const i=data.transactions.findIndex(x=>x.id===editingTx);data.transactions[i]=tx}else data.transactions.push(tx);save();closeModal();render();showToast("Transaction saved.");editingTx=null;
}
function deleteTx(tid){if(confirm("Delete this transaction? This cannot be undone.")){data.transactions=data.transactions.filter(t=>t.id!==tid);save();render();showToast("Transaction deleted.")}}
function openAccount(aid=null){const a=aid?data.accounts.find(x=>x.id===aid):null;editingAccount=aid;openModal(`<h2>${a?"Edit":"Add"} account</h2><div class="modal-sub">Create a balance source for your transactions.</div><div class="form-grid"><div class="field full"><label>ACCOUNT NAME</label><input id="aName" value="${esc(a?.name||"")}" placeholder="e.g. Main Cash"></div><div class="field"><label>TYPE</label><select id="aType" onchange="toggleAccountFields()"><option ${a?.type==="Cash"?"selected":""}>Cash</option><option ${a?.type==="UPI"?"selected":""}>UPI</option><option ${a?.type==="Other"?"selected":""}>Other</option></select></div><div class="field"><label>OPENING BALANCE (₹)</label><input id="aOpening" type="number" step="0.01" value="${a?.opening||0}"></div><div class="field" id="bankWrap"><label>BANK NAME</label><input id="aBank" value="${esc(a?.bank||"")}" placeholder="BOB, Kotak, etc."></div><div class="field" id="appWrap"><label>ONLINE APP NAME</label><input id="aApp" value="${esc(a?.app||"")}" placeholder="GPay, PhonePe, Kotak, etc."></div></div><div class="modal-actions"><button class="soft-btn" onclick="closeModal()">Cancel</button><button class="primary-btn" onclick="saveAccount()">Save account</button></div>`);toggleAccountFields()}
function toggleAccountFields(){const upi=document.getElementById("aType").value==="UPI";document.getElementById("bankWrap").style.display=upi?"block":"none";document.getElementById("appWrap").style.display=upi?"block":"none"}
function saveAccount(){const name=document.getElementById("aName").value.trim();if(!name)return showToast("Enter an account name.");const a={id:editingAccount||id(),name,type:document.getElementById("aType").value,opening:Number(document.getElementById("aOpening").value)||0,bank:document.getElementById("aBank").value.trim(),app:document.getElementById("aApp").value.trim()};if(editingAccount)data.accounts[data.accounts.findIndex(x=>x.id===editingAccount)]=a;else data.accounts.push(a);save();closeModal();render();showToast("Account saved.");editingAccount=null}
function deleteAccount(aid){if(data.accounts.length===1)return showToast("Keep at least one account.");if(data.transactions.some(t=>t.accountId===aid||t.toAccountId===aid))return showToast("This account has transactions. Delete those first.");if(confirm("Delete this account?")){data.accounts=data.accounts.filter(a=>a.id!==aid);save();render();showToast("Account deleted.")}}
function openPerson(pid=null){const p=pid?data.people.find(x=>x.id===pid):null;editingPerson=pid;openModal(`<h2>${p?"Edit":"Add"} person</h2><div class="modal-sub">Track money you give to or receive from this person.</div><div class="form-grid"><div class="field full"><label>NAME</label><input id="pName" value="${esc(p?.name||"")}" placeholder="e.g. Rahul"></div><div class="field full"><label>NOTE</label><input id="pNote" value="${esc(p?.note||"")}" placeholder="Optional note"></div></div><div class="modal-actions"><button class="soft-btn" onclick="closeModal()">Cancel</button><button class="primary-btn" onclick="savePerson()">Save person</button></div>`)}
function savePerson(){const name=document.getElementById("pName").value.trim();if(!name)return showToast("Enter a name.");const p={id:editingPerson||id(),name,note:document.getElementById("pNote").value.trim()};if(editingPerson)data.people[data.people.findIndex(x=>x.id===editingPerson)]=p;else data.people.push(p);save();closeModal();render();showToast("Person saved.");editingPerson=null}
function deletePerson(pid){if(data.transactions.some(t=>t.personId===pid))return showToast("This person has transaction records. Remove those first.");if(confirm("Delete this person?")){data.people=data.people.filter(p=>p.id!==pid);save();render();showToast("Person deleted.")}}
function download(name,text,type){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function exportJSON(){download("moneytrack-backup.json",JSON.stringify(data,null,2),"application/json")}
function exportCSV(){const rows=[["Date","Type","Description","Amount","Account","Person","Category","Notes"],...data.transactions.map(t=>[t.date,txType(t),t.description,t.amount,accountName(t.accountId),personName(t.personId),t.category,t.notes])];download("moneytrack-transactions.csv",rows.map(r=>r.map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(",")).join("\n"),"text/csv")}
document.querySelectorAll(".nav-item").forEach(b=>b.addEventListener("click",()=>go(b.dataset.page)));
document.addEventListener("click",e=>{const p=e.target.closest("[data-page-jump]");if(p)go(p.dataset.pageJump)});
document.getElementById("quickAdd").onclick=()=>openTx();document.getElementById("heroAdd").onclick=()=>openTx();document.getElementById("fab").onclick=()=>openTx();document.getElementById("addAccount").onclick=()=>openAccount();document.getElementById("addPerson").onclick=()=>openPerson();document.getElementById("menuBtn").onclick=()=>document.getElementById("sidebar").classList.toggle("open");
document.getElementById("themeBtn").onclick=()=>{data.theme=data.theme==="dark"?"light":"dark";save();render()};document.getElementById("darkToggle").onchange=e=>{data.theme=e.target.checked?"dark":"light";save();render()};
document.getElementById("reportRange").onchange=renderReports;document.getElementById("searchTx").oninput=renderReports;document.getElementById("typeFilter").onchange=renderReports;
document.getElementById("exportJson").onclick=exportJSON;document.getElementById("exportCsv").onclick=exportCSV;document.getElementById("importJsonBtn").onclick=()=>document.getElementById("importJson").click();
document.getElementById("importJson").onchange=e=>{const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);if(!x.accounts||!x.transactions)throw Error();data=x;save();render();showToast("Backup imported.")}catch{showToast("Invalid MoneyTrack JSON backup.")}};r.readAsText(file);e.target.value=""};
document.getElementById("resetData").onclick=()=>{if(confirm("Reset ALL MoneyTrack data? This permanently removes accounts, people, and transactions from this browser.")){data=structuredClone(defaultData);save();render();showToast("All data reset.")}};
document.getElementById("modalBackdrop").onclick=e=>{if(e.target.id==="modalBackdrop")closeModal()};
render();
