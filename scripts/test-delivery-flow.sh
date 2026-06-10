#!/bin/bash
set -e

echo "=== LOGIN ==="
CUSTOMER_TOKEN=$(curl -s http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"customer@example.com","password":"Customer@123"}' | \
  node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).data?.accessToken)}catch{console.log('FAIL')}})")
echo "Customer token: ${CUSTOMER_TOKEN:0:30}..."

STORE_ID="cmq89c5mf00018cgh0dx6wfd9"
ADDRESS_ID="cmq7v0gcv000813xv09nmstlb"

echo ""
echo "=== ADD PRODUCT TO CART ==="
CART_ADD=$(curl -s -X POST "http://localhost:4000/api/v1/cart/items" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -d '{"productId":"cmq7ujhvr003wz0nc7a6x6nyw","quantity":2,"storeId":"'$STORE_ID'"}')
echo "Cart add: $(echo $CART_ADD | node -e "process.stdin.on('data',d=>{try{const r=JSON.parse(d);console.log(r.success?'OK':'FAIL',r.message||'')}catch(e){console.log('PARSE_ERR')}})" )"

echo ""
echo "=== PLACE ORDER ==="
ORDER_RESULT=$(curl -s -X POST "http://localhost:4000/api/v1/orders?storeId=$STORE_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -d '{"addressId":"'$ADDRESS_ID'","paymentMethod":"COD","notes":"Delivery test order"}')

echo "$ORDER_RESULT" | node -e "
process.stdin.on('data', d => {
  try {
    const r = JSON.parse(d);
    if (r.success && r.data) {
      console.log('ORDER_ID=' + r.data.id);
      console.log('ORDER_NUMBER=' + r.data.orderNumber);
      console.error('Status:', r.data.status);
    } else {
      console.log('FAILED: ' + (r.message || 'unknown'));
      process.exit(1);
    }
  } catch(e) { console.log('PARSE_ERR: ' + e.message); process.exit(1); }
});" > /tmp/new_order_vars.sh

source /tmp/new_order_vars.sh
echo "Order placed: $ORDER_NUMBER (ID: $ORDER_ID)"

echo ""
echo "=== ADMIN LOGIN + MARK OUT_FOR_DELIVERY ==="
ADMIN_TOKEN=$(curl -s http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@instamart.com","password":"Admin@123"}' | \
  node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).data?.accessToken)}catch{console.log('FAIL')}})")
echo "Admin token: ${ADMIN_TOKEN:0:30}..."

curl -s -X PUT "http://localhost:4000/api/v1/admin/orders/$ORDER_ID/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"status":"CONFIRMED"}' > /dev/null && echo "1. CONFIRMED"

curl -s -X PUT "http://localhost:4000/api/v1/admin/orders/$ORDER_ID/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"status":"PREPARING"}' > /dev/null && echo "2. PREPARING"

curl -s -X PUT "http://localhost:4000/api/v1/admin/orders/$ORDER_ID/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"status":"OUT_FOR_DELIVERY"}' > /dev/null && echo "3. OUT_FOR_DELIVERY"

echo ""
echo "=== GET AVAILABLE DELIVERY PERSONS ==="
AVAILABLE=$(curl -s "http://localhost:4000/api/v1/admin/delivery-persons/available?storeId=$STORE_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
echo "$AVAILABLE" | node -e "
process.stdin.on('data', d => {
  try {
    const r = JSON.parse(d);
    const persons = r.data || [];
    if (persons.length > 0) {
      console.error('Available: ' + persons.length);
      persons.forEach((p, i) => console.error('  ' + (i+1) + '. ' + p.firstName + ' ' + p.lastName));
      console.log('PERSON_ID=' + persons[0].id);
    } else {
      console.log('NO_AVAILABLE');
      process.exit(1);
    }
  } catch(e) { console.log('ERR: ' + e.message); process.exit(1); }
});" >> /tmp/new_order_vars.sh

source /tmp/new_order_vars.sh
echo "Using: $PERSON_ID"

echo ""
echo "=== ASSIGN DELIVERY ==="
ASSIGN=$(curl -s -X POST "http://localhost:4000/api/v1/admin/orders/$ORDER_ID/assign-delivery" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"deliveryPersonId":"'$PERSON_ID'"}')
echo "$(echo $ASSIGN | node -e "process.stdin.on('data',d=>{try{const r=JSON.parse(d);console.log(r.success?'ASSIGNED':'FAIL',r.message||'')}catch(e){console.log('PARSE_ERR')}})" )"

ASSIGNMENT_ID=$(echo "$ASSIGN" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).data?.id||'')}catch(e){}})")
echo "Assignment: $ASSIGNMENT_ID"

echo ""
echo "=== TRANSITIONS ==="
curl -s -X PUT "http://localhost:4000/api/v1/admin/delivery-persons/assignments/$ASSIGNMENT_ID/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"status":"PICKED_UP"}' > /dev/null && echo "4. PICKED_UP"

curl -s -X PUT "http://localhost:4000/api/v1/admin/delivery-persons/assignments/$ASSIGNMENT_ID/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"status":"IN_TRANSIT"}' > /dev/null && echo "5. IN_TRANSIT"

curl -s -X PUT "http://localhost:4000/api/v1/admin/delivery-persons/assignments/$ASSIGNMENT_ID/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"status":"DELIVERED"}' > /dev/null && echo "6. DELIVERED"

echo ""
echo "=== VERIFY ORDER ==="
ORDER_CHECK=$(curl -s "http://localhost:4000/api/v1/orders/$ORDER_ID" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN")
echo "$ORDER_CHECK" | node -e "process.stdin.on('data',d=>{try{const r=JSON.parse(d);console.log('Order:',r.data?.orderNumber,'Status:',r.data?.status)}catch(e){}})" 

echo ""
echo "=== VERIFY PERSON STATS ==="
PERSON_STATS=$(curl -s "http://localhost:4000/api/v1/admin/delivery-persons/$PERSON_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
echo "$PERSON_STATS" | node -e "
process.stdin.on('data', d => {
  try {
    const r = JSON.parse(d);
    const p = r.data || {};
    console.log(p.firstName + ' ' + p.lastName + ':');
    console.log('  totalDeliveries:', p.totalDeliveries);
    console.log('  totalEarnings:', p.totalEarnings);
    console.log('  status:', p.status);
  } catch(e) { console.log('ERR:', e.message); }
});"

echo ""
echo "=== VERIFY NOT AVAILABLE ==="
AFTER=$(curl -s "http://localhost:4000/api/v1/admin/delivery-persons/available?storeId=$STORE_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
echo "$AFTER" | node -e "
process.stdin.on('data', d => {
  try {
    const r = JSON.parse(d);
    console.log('Available persons after:', (r.data||[]).length);
  } catch(e) { console.log('ERR:', e.message); }
});"

echo ""
echo "=== FULL FLOW TEST COMPLETE ==="
