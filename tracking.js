/* Halaman pelacakan terpisah. Data lokal bekerja pada browser/perangkat yang sama.
   Untuk sinkronisasi lintas HP diperlukan backend/database online. */
const money=n=>'Rp'+Number(n||0).toLocaleString('id-ID');
const $=id=>document.getElementById(id);
const STEPS=['Pesanan diterima','Sedang dibuat','Pengemasan','Siap diambil'];
let currentOrder=null,lastSignature='';
function getLocalOrders(){try{return JSON.parse(localStorage.getItem('kd22_orders')||'[]')}catch{return[]}}
function getSnapshot(){const raw=new URLSearchParams(location.search).get('data');if(!raw)return null;try{return JSON.parse(raw)}catch{return null}}
const params=new URLSearchParams(location.search),orderId=params.get('id')||getSnapshot()?.id,snapshot=getSnapshot();
function resolveOrder(){const local=getLocalOrders().find(o=>o.id===orderId);$('syncNotice').classList.toggle('hidden',!!local);return local||snapshot;}
function fmtDate(value){if(!value)return '-';return new Date(value).toLocaleString('id-ID',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Jakarta'});}
function toast(msg){const t=$('trackToast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600);}
function render(){const o=resolveOrder();if(!o){$('queueNumber').textContent='Tidak ditemukan';$('refreshLabel').textContent='Data tidak tersedia';$('currentStatus').textContent='Data pesanan tidak ditemukan. Pastikan barcode berasal dari KEDAI DAUS 22.';return;}currentOrder=o;
 $('queueNumber').textContent=o.queue||'D---';$('buyerName').textContent='Pemesan: '+(o.name||'Pelanggan');$('orderTime').textContent=fmtDate(o.created);const items=Array.isArray(o.items)?o.items:[];$('itemCount').textContent=items.reduce((s,i)=>s+Number(i.qty||0),0)+' item';$('orderItems').innerHTML=items.length?items.map(i=>`<div class="item-row"><div><b>${i.name||'Menu'}</b><small>${Number(i.qty||0)} × ${money(i.price)}</small></div><b>${money(Number(i.qty||0)*Number(i.price||0))}</b></div>`).join(''):'<div class="loading">Rincian item tidak tersedia pada barcode ini.</div>';$('orderTotal').textContent=money(o.total);$('paymentMethod').textContent=o.paymentMethod||'Menunggu kasir';$('paymentStatus').textContent=o.paymentStatus||'Belum dibayar';
 const cancelled=!!o.cancelled||o.status==='cancelled';$('cancelNotice').classList.toggle('hidden',!cancelled);
 const status=Number.isInteger(o.status)?o.status:0;
 $('processList').innerHTML=STEPS.map((label,i)=>`<div class="process-step ${i<status?'done':i===status&&!cancelled?'current':''}"><div class="process-dot">${i<status?'✓':i+1}</div><div><b>${label}</b><small>${cancelled?'Dibatalkan':i<status?'Selesai':i===status?'Sedang berlangsung':'Menunggu proses sebelumnya'}</small></div></div>`).join('');
 if(cancelled){$('currentStatus').textContent='Pesanan dibatalkan oleh pihak kedai.';}else if(o.customerConfirmed){$('currentStatus').textContent='Pesanan sudah diambil dan dikonfirmasi pembeli.';}else if(status===3){$('currentStatus').textContent='Pesanan siap diambil. Silakan datang ke kasir.';}else{$('currentStatus').textContent=(STEPS[status]||STEPS[0])+'. Mohon tunggu pembaruan dari kedai.';}
 const paymentIsPaid=(o.paymentStatus||'')==='Lunas';$('paymentWaitNotice').classList.toggle('hidden',cancelled||status!==3||paymentIsPaid||!!o.customerConfirmed);$('customerConfirmArea').classList.toggle('hidden',cancelled||status!==3||!paymentIsPaid||!!o.customerConfirmed);$('confirmedNotice').classList.toggle('hidden',!o.customerConfirmed||cancelled);
 $('confirmReceivedBtn').disabled=!!o.customerConfirmed;
 $('refreshLabel').textContent=localStorage.getItem('kd22_orders')?'Periksa otomatis':'Data barcode';
 const signature=JSON.stringify({status:o.status,cancelled:o.cancelled,confirmed:o.customerConfirmed,payment:o.paymentStatus,total:o.total,items:o.items});if(lastSignature&&signature!==lastSignature){try{const a=new Audio('assets/sounds/status-update.wav');a.volume=.45;a.play().catch(()=>{});}catch{}}lastSignature=signature;
}
function confirmReceived(){const orders=getLocalOrders();const found=orders.find(o=>o.id===orderId);if(!currentOrder||currentOrder.cancelled||Number(currentOrder.status)!==3)return toast('Konfirmasi hanya tersedia setelah pesanan siap diambil.');if((currentOrder.paymentStatus||'')!=='Lunas')return toast('Tunggu kasir mencatat pembayaran sebagai Lunas.');if(currentOrder.customerConfirmed)return toast('Konfirmasi sudah pernah dikirim.');if(!confirm('Konfirmasi bahwa pesanan sudah Anda ambil dan sudah Anda bayar?'))return;
 const stamp=new Date().toISOString();if(found){found.customerConfirmed=true;found.customerConfirmedAt=stamp;found.customerConfirmationText='Pembeli menyatakan pesanan sudah diambil dan dibayar.';localStorage.setItem('kd22_orders',JSON.stringify(orders));localStorage.setItem('kd22_last_event',JSON.stringify({at:Date.now(),orderId:found.id,message:'Pembeli mengonfirmasi pesanan sudah diambil dan dibayar.'}));currentOrder=found;toast('Konfirmasi dicatat.');}
 else{currentOrder.customerConfirmed=true;currentOrder.customerConfirmedAt=stamp;toast('Konfirmasi tersimpan pada HP ini. Belum tersinkron ke panel penjual karena database online belum dipasang.');}
 render();
}
$('confirmReceivedBtn').addEventListener('click',confirmReceived);$('refreshBtn').addEventListener('click',()=>{render();toast('Status diperiksa kembali.');});
window.addEventListener('storage',e=>{if(e.key==='kd22_orders')render();});
render();setInterval(render,3000);
