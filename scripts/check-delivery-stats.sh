#!/bin/bash

echo "=== LOGIN ==="
ADMIN_TOKEN=$(curl -s http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@instamart.com","password":"Admin@123"}' | \
  node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).data?.accessToken)}catch{console.log('FAIL')}})")
echo "Token obtained: ${ADMIN_TOKEN:0:30}..."

echo ""
echo "=== DASHBOARD STATS ==="
curl -s http://localhost:4000/api/v1/admin/dashboard \
  -H "Authorization: Bearer $ADMIN_TOKEN" | node -e "
process.stdin.on('data', d => {
  try {
    const r = JSON.parse(d);
    const s = r.data?.stats || {};
    console.log('Active Delivery Persons:', s.activeDeliveryPersons);
    console.log('Pending Deliveries:', s.pendingDeliveries);
    console.log('Total Orders:', s.totalOrders);
    console.log('Total Revenue:', s.totalRevenue);
    console.log('Total Users:', s.totalUsers);
    console.log('Total Products:', s.totalProducts);
  } catch(e) { console.log('DASHBOARD_ERR:', e.message); }
});"

echo ""
echo "=== DELIVERY PERSONS LIST ==="
curl -s http://localhost:4000/api/v1/admin/delivery-persons \
  -H "Authorization: Bearer $ADMIN_TOKEN" | node -e "
const d = [];
process.stdin.on('data', c => d.push(c));
process.stdin.on('end', () => {
  try {
    const r = JSON.parse(d.join(''));
    const persons = r.data?.persons || [];
    persons.forEach((p, i) => {
      console.log('');
      console.log((i+1) + '. ' + p.firstName + ' ' + p.lastName);
      console.log('   Status: ' + p.status + ' | Type: ' + p.employmentType);
      console.log('   Vehicle: ' + p.vehicleType + ' | ' + (p.vehicleNumber || 'N/A'));
      console.log('   Deliveries: ' + p.totalDeliveries + ' | Earnings: ' + Number(p.totalEarnings || 0).toFixed(2));
      console.log('   Rating: ' + p.rating + ' | Phone: ' + p.phone);
    });
  } catch(e) { console.log('LIST_ERR:', e.message); }
});"

echo ""
echo "=== DELIVERY PERSONS STATS ==="
curl -s http://localhost:4000/api/v1/admin/delivery-persons/stats \
  -H "Authorization: Bearer $ADMIN_TOKEN" | node -e "
const d = [];
process.stdin.on('data', c => d.push(c));
process.stdin.on('end', () => {
  try {
    const r = JSON.parse(d.join(''));
    const s = r.data || {};
    console.log('Total Persons:', s.totalPersons);
    console.log('Active/Available:', s.activePersons);
    console.log('On Delivery:', s.onDelivery);
    console.log('Off Duty:', s.offDuty);
    console.log('Active Assignments:', s.activeAssignments);
    console.log('Today Assignments:', s.todayAssignments);
  } catch(e) { console.log('STATS_ERR:', e.message); }
});"

echo ""
echo "=== ACTIVITY TRACKING ==="
# Delhi store delivery persons
for PID in cmq89c5uu004h8cghyiu9f4em cmq89c5uu00548cghpebk4c8y; do
  echo ""
  echo "--- Activity for $PID ---"
  curl -s "http://localhost:4000/api/v1/admin/delivery-persons/$PID/activity" \
    -H "Authorization: Bearer $ADMIN_TOKEN" | node -e "
const d = [];
process.stdin.on('data', c => d.push(c));
process.stdin.on('end', () => {
  try {
    const r = JSON.parse(d.join(''));
    const act = r.data || [];
    if (act.length === 0) { console.log('  No activity records yet'); return; }
    act.forEach(a => {
      console.log('  Date: ' + a.date + ' | Assigned: ' + a.ordersAssigned + ' | Done: ' + a.ordersCompleted + ' | Failed: ' + a.ordersFailed + ' | Earned: ' + Number(a.earnings || 0).toFixed(2));
    });
  } catch(e) { console.log('ACT_ERR:', e.message); }
});"
done
