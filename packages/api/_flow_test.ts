const BASE = "http://localhost:4000/api/v1";

async function api(path: string, options?: any) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  const body = await res.json();
  return { status: res.status, ...body };
}

async function main() {
  console.log("\n=== 1. LOGIN AS CUSTOMER ===");
  const customerLogin = await api("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "customer@example.com", password: "Customer@123" }),
  });
  if (!customerLogin.success) { console.error("Customer login failed:", customerLogin.message); return; }
  const customerToken = customerLogin.data.accessToken;
  console.log("✅ Customer logged in");

  console.log("\n=== 2. GET STORES ===");
  const storesRes = await api("/stores");
  if (!storesRes.success) { console.error("Failed to get stores:", storesRes.message); return; }
  const stores = storesRes.data;
  console.log(`Found ${stores.length} stores`);
  const targetStore = stores[0];
  console.log(`Using store: ${targetStore.name} (${targetStore.id})`);

  console.log("\n=== 3. GET PRODUCTS ===");
  const productsRes = await api("/products", {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  if (!productsRes.success) { console.error("Failed to get products:", productsRes.message); return; }
  const products = productsRes.data?.products || productsRes.data || [];
  if (products.length === 0) { console.error("No products found"); return; }
  const product = products[0];
  console.log(`Using product: ${product.name} (slug: ${product.slug}, id: ${product.id}) - ₹${product.price}`);

  console.log("\n=== 4. ADD TO CART ===");
  const cartRes = await api("/cart/items", {
    method: "POST",
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ productId: product.id, quantity: 2 }),
  });
  if (!cartRes.success) { console.error("Failed to add to cart:", JSON.stringify(cartRes)); return; }
  console.log("✅ Added to cart");

  console.log("\n=== 5. CREATE ORDER ===");
  const addressesRes = await api("/users/addresses", {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  let addressId: string;
  if (addressesRes.success && addressesRes.data?.length > 0) {
    addressId = addressesRes.data[0].id;
    console.log(`Using existing address: ${addressId}`);
  } else {
    const addrRes = await api("/users/addresses", {
      method: "POST",
      headers: { Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({
        label: "Home",
        addressLine1: "123 Test Street",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400001",
        lat: 19.076, lng: 72.8777,
        isDefault: true,
      }),
    });
    if (!addrRes.success) { console.error("Failed to create address:", addrRes.message); return; }
    addressId = addrRes.data.id;
    console.log(`Created address: ${addressId}`);
  }

  const orderRes = await api("/orders", {
    method: "POST",
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ addressId, storeId: targetStore.id, notes: "Test order" }),
  });
  if (!orderRes.success) { console.error("Failed to create order:", orderRes.message); return; }
  const order = orderRes.data;
  console.log(`✅ Order created: ${order.orderNumber} (${order.id}) - Status: ${order.status} - Store: ${order.storeId}`);

  console.log("\n=== 6. ADMIN CONFIRM ORDER ===");
  const adminLogin = await api("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "admin@instamart.com", password: "Admin@123" }),
  });
  if (!adminLogin.success) { console.error("Admin login failed:", adminLogin.message); return; }
  const adminToken = adminLogin.data.accessToken;
  console.log("✅ Admin logged in");

  const confirmRes = await api(`/admin/orders/${order.id}/status`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ status: "CONFIRMED" }),
  });
  if (!confirmRes.success) { console.error("Failed to confirm order:", confirmRes.message); return; }
  console.log(`✅ Order confirmed: ${confirmRes.data.status}`);

  const prepareRes = await api(`/admin/orders/${order.id}/status`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ status: "PREPARING" }),
  });
  if (!prepareRes.success) { console.error("Failed to start preparing:", prepareRes.message); return; }
  console.log(`✅ Order preparing: ${prepareRes.data.status}`);

  console.log("\n=== 7. GET AVAILABLE DELIVERY PERSONS ===");
  const availRes = await api(`/admin/delivery-persons/available?storeId=${order.storeId}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (!availRes.success) { console.error("Failed to get available persons:", availRes.message); return; }
  const available = availRes.data;
  console.log(`Available drivers for store ${order.storeId}: ${available.length}`);
  if (available.length === 0) { console.error("NO AVAILABLE DRIVERS — test cannot proceed"); return; }
  available.forEach((p: any) => console.log(`  ${p.firstName} ${p.lastName} (${p.phone}) - ⭐${p.rating} - ${p.totalDeliveries} deliveries`));

  const driver = available[0];
  console.log(`\nSelecting: ${driver.firstName} ${driver.lastName}`);

  console.log("\n=== 8. ASSIGN DELIVERY PERSON ===");
  const assignRes = await api(`/admin/orders/${order.id}/assign-delivery`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ deliveryPersonId: driver.id }),
  });
  if (!assignRes.success) { console.error("Failed to assign driver:", assignRes.message); return; }
  const assignment = assignRes.data;
  console.log(`✅ Driver assigned! Assignment ID: ${assignment.id} - Status: ${assignment.status}`);

  console.log("\n=== 9. UPDATE DELIVERY STATUS: PICKED_UP ===");
  const pickedUpRes = await api(`/admin/delivery-assignments/${assignment.id}/status`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ status: "PICKED_UP" }),
  });
  if (!pickedUpRes.success) { console.error("Failed:", pickedUpRes.message); return; }
  console.log(`✅ Status: ${pickedUpRes.data.status}`);

  console.log("\n=== 10. UPDATE DELIVERY STATUS: IN_TRANSIT ===");
  const transitRes = await api(`/admin/delivery-assignments/${assignment.id}/status`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ status: "IN_TRANSIT" }),
  });
  if (!transitRes.success) { console.error("Failed:", transitRes.message); return; }
  console.log(`✅ Status: ${transitRes.data.status}`);

  console.log("\n=== 11. UPDATE DELIVERY STATUS: DELIVERED ===");
  const deliveredRes = await api(`/admin/delivery-assignments/${assignment.id}/status`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ status: "DELIVERED" }),
  });
  if (!deliveredRes.success) { console.error("Failed:", deliveredRes.message); return; }
  console.log(`✅ Order delivered! Status: ${deliveredRes.data.status}, Payment: ${deliveredRes.data.paymentStatus}`);

  console.log("\n=== 12. VERIFY FINAL ORDER STATE ===");
  const finalOrderRes = await api(`/admin/orders/${order.id}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (finalOrderRes.success) {
    const o = finalOrderRes.data;
    console.log(`Order ${o.orderNumber}: Status=${o.status}, Payment=${o.paymentStatus}`);
    console.log(`Delivery: ${o.deliveryAssignment?.status} by ${o.deliveryAssignment?.deliveryPerson?.firstName} ${o.deliveryAssignment?.deliveryPerson?.lastName}`);
  }

  console.log("\n🎉 FULL FLOW COMPLETED SUCCESSFULLY!");
}

main().catch(console.error);
