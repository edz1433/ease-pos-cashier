import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useSwipeable } from 'react-swipeable';
import { useReactToPrint } from "react-to-print";
import PrintOrder from "../components/PrintOrder";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Swal from "sweetalert2";

// Set up axios defaults to include CSRF token
axios.defaults.withCredentials = true;
axios.defaults.withXSRFToken = true;

// OrderItem component with swipe functionality
const OrderItem = ({ item, increaseQty, decreaseQty, removeItem, formatCurrency }) => {
  const [swiping, setSwiping] = useState(false);
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const handleIncrease = (e, id, type) => {
    e.stopPropagation();
    if (item.stockWarning && item.quantity >= item.availableStock) {
      toast.warning(`Only ${item.availableStock} ${item.type === 'retail' ? item.retail_unit_name : item.wholesale_unit_name} available!`, {
        position: "top-center",
        autoClose: 3000,
      });
      return;
    }
    increaseQty(id, type);
  };

  const handlers = useSwipeable({
    onSwiping: (eventData) => {
      if (eventData.dir === 'Left') {
        setSwiping(true);
      }
    },
    onSwipedLeft: () => {
      removeItem(item.id, item.type);
      setSwiping(false);
    },
    onSwiped: () => setSwiping(false),
    trackMouse: true
  });

  return (
    <div {...handlers} className="order-item-container">
      <div className={`order-item d-flex align-items-center p-2 mb-2 rounded ${swiping ? 'swiping' : ''}`}>
        <img src={`${API_BASE_URL}/storage/uploads/products/${item.img}` || "/assets/img/placeholder.png"} alt={item.name} className="order-item-img" />
        <div className="flex-grow-1">
          <div className="fw-bold product-name">{item.name}</div>
          <small className="text-muted">
            {formatCurrency(item.price)} x {item.quantity} {item.type === 'retail' ? item.retail_unit_name : item.wholesale_unit_name}
            {item.packaging > 1 && item.type === 'wholesale' && (
              <span> ({item.quantity * item.packaging} {item.retail_unit_name})</span>
            )}
            <br />
            {item.stockWarning && (
              <span className="text-danger">
                {item.type === 'retail' ? (
                  `Only ${item.availableStock} retail units left!`
                ) : (
                  `Only ${item.availableStock} wholesale packages left (${item.availableStock * item.packaging} retail units)!`
                )}
              </span>
            )}
          </small>
        </div>
        <div className="order-item-controls ms-2">
          <button 
            className="qty-btn" 
            onClick={(e) => handleIncrease(e, item.id, item.type)}
            disabled={item.stockWarning && item.quantity >= item.availableStock}
          >
            <i className="fas fa-chevron-up"></i>
          </button>
          <span className="qty-number">{item.quantity}</span>
          <button className="qty-btn" onClick={(e) => {
            e.stopPropagation();
            decreaseQty(item.id);
          }}>
            <i className="fas fa-chevron-down"></i>
          </button>
        </div>
      </div>
      <div className={`swipe-delete-indicator ${swiping ? 'show' : ''}`}></div>
    </div>
  );
};

export default function Menu() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("hot");

  const [orderItems, setOrderItems] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [amountTendered, setAmountTendered] = useState(0);
  const [orderNumber, setOrderNumber] = useState("");
  const [loadingOrderNumber, setLoadingOrderNumber] = useState(true);
  const [customerName, setCustomerName] = useState("");
  const [tableNo, setTableNo] = useState("");

  const barcodeInputRef = useRef(null);

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const fixedCategory = { id: "hot", name: "Hot", icon: "fas fa-fire" };

  const componentRef = useRef();
  const handlePrint = useReactToPrint({
    contentRef: componentRef, 
    documentTitle: `Order_${orderNumber}`,  
    // onAfterPrint: () => toast.success("Receipt printed successfully", { position: "top-center" }),
  });

  // Format currency ₱
  const formatCurrency = (value) => {
    return `₱${Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
    })}`;
  };

  // Helper to extract sequence number
  const getSequenceNumber = (transactionNumber) => {
    if (!transactionNumber) return '';
    const parts = transactionNumber.split('-');
    return parts.length > 1 ? parts[1] : transactionNumber;
  };

  // Fetch next transaction number from API
  const fetchNextTransactionNumber = async () => {
    try {
      setLoadingOrderNumber(true);
      const response = await axios.get(`${API_BASE_URL}/api/next-transaction-number`);
      if (response.data.transaction_number) {
        setOrderNumber(response.data.transaction_number);
      }
    } catch (error) {
      console.error("Error fetching transaction number:", error);
      // Fallback to local timestamp if API fails
      const timestamp = new Date().getTime();
      setOrderNumber(`LOCAL-${timestamp}`);
      toast.error("Failed to fetch order number, using local fallback", { position: "top-center" });
    } finally {
      setLoadingOrderNumber(false);
    }
  };

  // Initialize order number
  useEffect(() => {
    fetchNextTransactionNumber();
  }, []);

  // Calculate VAT and non-VAT totals
  const calculateVatBreakdown = () => {
    let vatableTotal = 0;
    let nonVatableTotal = 0;
    let vatableAmount = 0;
    let vatAmount = 0;

    orderItems.forEach(item => {
      const itemTotal = item.price * item.quantity;
      if (item.vatable === 1) {
        vatableTotal += itemTotal;
      } else {
        nonVatableTotal += itemTotal;
      }
    });

    // Calculate VAT (assuming 12% VAT rate)
    if (vatableTotal > 0) {
      vatableAmount = vatableTotal / 1.12;
      vatAmount = vatableTotal - vatableAmount;
    }

    return {
      vatableTotal,
      nonVatableTotal,
      vatableAmount,
      vatAmount,
      total: vatableTotal + nonVatableTotal
    };
  };

  // Helper function to reset order state
  const resetOrder = async () => {
    setOrderItems([]);
    setDiscount(0);
    setAmountTendered(0);
    setCustomerName("");
    setTableNo("");
    setPaymentMethod("Cash"); // Reset payment method to default
    await fetchNextTransactionNumber();
    
    // Refresh products
    const url = selectedCategory !== "hot" 
      ? `${API_BASE_URL}/api/products/${Number(selectedCategory)}`
      : `${API_BASE_URL}/api/products`;
    const productRes = await axios.get(url);
    setProducts(productRes.data);
    
    // Refocus on barcode input after reset
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  };

  // Handle checkout
  const handleCheckout = async (status = 1) => {
    if (orderItems.length === 0) {
      toast.warning("Please add items to your cart before checkout", { position: "top-center" });
      return;
    }

    // Calculate the total amount due
    const totalDue = total - discount;
    
    // Validate amount tendered only for completed orders (status 1)
    if (status === 1) {
      if (amountTendered <= 0) {
        toast.warning("Please enter the amount tendered by the customer", { position: "top-center" });
        return;
      }
      
      if (amountTendered < totalDue) {
        toast.warning(`Amount tendered (${formatCurrency(amountTendered)}) is less than the total due (${formatCurrency(totalDue)})`, { 
          position: "top-center",
          autoClose: 4000,
        });
        return;
      }
    }

    // Check stock availability (frontend validation only)
    const outOfStockItems = [];
    
    for (const item of orderItems) {
      const product = products.find(p => p.id === item.id);
      if (!product) continue;

      const packaging = product.packaging || 1;
      const totalAvailable = product.rqty + (product.wqty * packaging);
      const required = item.type === 'retail' ? item.quantity : item.quantity * packaging;

      if (required > totalAvailable) {
        outOfStockItems.push({
          name: item.name,
          requested: item.type === 'retail' 
            ? `${item.quantity} ${product.retail_unit_name}`
            : `${item.quantity} ${product.wholesale_unit_name} (${item.quantity * packaging} ${product.retail_unit_name})`,
          available: `${product.rqty} ${product.retail_unit_name} + ${product.wqty} ${product.wholesale_unit_name} (${product.wqty * packaging} ${product.retail_unit_name})`,
        });
      }
    }

    if (outOfStockItems.length > 0) {
      const itemList = outOfStockItems.map(item => 
        `${item.name}: Needed ${item.requested}, Available ${item.available}`
      ).join('\n');
      
      toast.error(`Insufficient Stock:\n${itemList}`, {
        position: "top-center",
        autoClose: 5000,
      });
      return;
    }

    try {
      const today = new Date().toISOString().split("T")[0];
      const vatBreakdown = calculateVatBreakdown();

      // For "Next" orders (status 2), set amount tendered to 0 and change to 0
      const amtTendered = status === 2 ? 0 : amountTendered;
      const amountChange = status === 2 ? 0 : change;

      const payload = {
        transaction_number: orderNumber,
        date: today,
        total: vatBreakdown.total,
        discount: discount,
        amt_tendered: amtTendered,
        amount_change: amountChange,
        customer: customerName || null,
        table_no: tableNo || null,
        vatable_sales: vatBreakdown.vatableAmount,
        vat_amount: vatBreakdown.vatAmount,
        non_vatable_sales: vatBreakdown.nonVatableTotal,
        payment_method: paymentMethod,
        status: status,
        items: orderItems.map((item) => {
          const product = products.find(p => p.id === item.id);
          const packaging = product?.packaging || 1;
          
          return {
            product_id: item.id,
            capital: item.capital || 0,
            price: item.price,
            price_type: item.type,
            quantity: item.quantity,
            subtotal: item.price * item.quantity,
            vatable: item.vatable,
            packaging: packaging,
            retail_equivalent: item.type === 'wholesale' ? item.quantity * packaging : item.quantity
          };
        }),
      };

      // Single API call that handles both checkout and inventory updates
      const res = await axios.post(`${API_BASE_URL}/api/checkout`, payload);

      if (res.data.status === "success") {
        if (status === 1) { // Only show print option for completed orders (status 1)
          Swal.fire({
            showCancelButton: true,
            confirmButtonText: "Print Receipt",
            cancelButtonText: "No, Thanks",
            confirmButtonColor: "#fc204f",
            cancelButtonColor: "#6c757d",
            title: "Order Updated",
            text: "Order has been successfully updated",
            icon: "success"
          }).then(async (result) => {
            if (result.isConfirmed) {
              handlePrint();
              await resetOrder();
            } else {
              // Clear the order when "No, Thanks" is clicked
              await resetOrder();
            }
          });
        } else { // For status 2 (next), just reset the order
          await resetOrder();
          toast.success("Order has been saved for later processing", { position: "top-center" });
        }
      } else {
        throw new Error(res.data.message || "Failed to save order");
      }
    } catch (err) {
      console.error("Checkout Error:", err);
      toast.error(err.response?.data?.message || err.message || "Failed to process order", {
        position: "top-center",
        autoClose: 5000,
      });
    }
  };

  const increaseQty = (id, type) => {
    setOrderItems((prev) => {
      const product = products.find(p => p.id === id);
      const packaging = product.packaging || 1;
      
      // Calculate total available retail stock
      const availableRetailStock = product.rqty + (product.wqty * packaging);
      
      // Calculate current retail quantity in cart
      const currentCartRetailQty = prev
        .filter(item => item.id === id)
        .reduce((sum, item) => {
          return sum + (item.type === 'retail' ? item.quantity : item.quantity * packaging);
        }, 0);
      
      return prev.map((item) => {
        if (item.id === id && item.type === type) {
          const newQty = item.quantity + 1;
          const newRetailQty = type === 'retail' ? newQty : newQty * packaging;
          
          // Check if we have enough stock
          if (currentCartRetailQty + (type === 'retail' ? 1 : packaging) > availableRetailStock) {
            toast.warning(`Cannot add more ${product.product_name} - only ${availableRetailStock - currentCartRetailQty} retail units available`, {
              position: "top-center",
            });
            return item;
          }
          
          return { 
            ...item, 
            quantity: newQty,
            availableStock: type === 'retail' 
              ? product.rqty - (currentCartRetailQty - (item.quantity * (type === 'retail' ? 1 : packaging)))
              : product.wqty - Math.floor((currentCartRetailQty - (item.quantity * packaging)) / packaging),
            stockWarning: type === 'retail'
              ? newQty > product.rqty
              : newQty > product.wqty
          };
        }
        return item;
      });
    });
  };

  const decreaseQty = (id) => {
    setOrderItems((prev) =>
      prev.map((item) =>
        item.id === id && item.quantity > 1
          ? { 
              ...item, 
              quantity: item.quantity - 1,
              stockWarning: false // Reset warning when decreasing
            }
          : item
      )
    );
  };

  const removeItem = (id, type) => {
    setOrderItems((prev) => 
      prev.filter(item => !(item.id === id && item.type === type))
    );
  };

  // Add item to cart with stock check
  const addToCart = (product, type) => {
    const price = type === 'retail' ? product.r_price : product.w_price;
    const unitName = type === 'retail' ? product.retail_unit_name : product.wholesale_unit_name;
    const packaging = product.packaging || 1;

    // Calculate available stock in retail units
    let availableRetailStock = product.rqty;
    if (product.wqty > 0) {
      availableRetailStock += product.wqty * packaging;
    }

    // Calculate current retail quantity in cart
    const currentCartRetailQty = orderItems
      .filter(item => item.id === product.id)
      .reduce((sum, item) => {
        if (item.type === 'retail') {
          return sum + item.quantity;
        } else { // wholesale
          return sum + (item.quantity * packaging);
        }
      }, 0);

    // Calculate remaining available retail stock
    const remainingRetailStock = availableRetailStock - currentCartRetailQty;

    if (remainingRetailStock <= 0) {
      toast.warning(`No more ${product.product_name} available!`, { position: "top-center" });
      return;
    }

    // For wholesale items, check if at least 1 full package can be added
    if (type === 'wholesale' && remainingRetailStock < packaging) {
      toast.warning(`Not enough stock for a full wholesale package (needs ${packaging} retail units)`, {
        position: "top-center",
      });
      return;
    }

    setOrderItems((prev) => {
      const existing = prev.find(item => item.id === product.id && item.type === type);
      
      if (existing) {
        return prev.map(item => 
          item.id === product.id && item.type === type
            ? { 
                ...item, 
                quantity: item.quantity + 1,
                availableStock: type === 'retail' 
                  ? product.rqty - (currentCartRetailQty - (item.quantity * (item.type === 'retail' ? 1 : packaging)))
                  : product.wqty - Math.floor((currentCartRetailQty - (item.quantity * packaging)) / packaging),
                stockWarning: type === 'retail'
                  ? (item.quantity + 1) > product.rqty
                  : (item.quantity + 1) > product.wqty
              }
            : item
        );
      }
      
      return [
        ...prev,
        {
          id: product.id,
          name: product.product_name,
          capital: product.capital || 0,
          price: price,
          quantity: 1,
          type: type,
          vatable: product.vatable,
          retail_unit_name: product.retail_unit_name,
          wholesale_unit_name: product.wholesale_unit_name,
          img: product.image || "/assets/img/placeholder.png",
          availableStock: type === 'retail' ? product.rqty : product.wqty,
          stockWarning: false,
          packaging: packaging
        }
      ];
    });
  };

  // Handle barcode scanning - UPDATED VERSION
  const handleBarcodeScan = async (barcode) => {
    if (!barcode) return;
    
    try {
      // Use the correct API endpoint with the full path
      const res = await axios.get(`${API_BASE_URL}/api/products-by-barcode/${barcode}`);
      
      // Check if response contains a product object and type
      if (res.data && res.data.product && res.data.type) {
        const { product, type } = res.data;
        
        // Calculate total available retail stock
        const packaging = product.packaging || 1;
        const availableRetailStock = product.rqty + (product.wqty * packaging);
        
        // Calculate current retail quantity in cart
        const currentCartRetailQty = orderItems
          .filter(item => item.id === product.id)
          .reduce((sum, item) => {
            if (item.type === 'retail') {
              return sum + item.quantity;
            } else { // wholesale
              return sum + (item.quantity * packaging);
            }
          }, 0);
        
        // Calculate remaining available retail stock
        const remainingRetailStock = availableRetailStock - currentCartRetailQty;
        
        if (remainingRetailStock <= 0) {
          toast.warning(`No more ${product.product_name} available!`, { position: "top-center" });
          return;
        }
        
        // If barcode was found as wholesale type
        if (type === 'wholesale') {
          // Check if we have enough wholesale stock
          if (product.wqty <= 0) {
            toast.warning(`No wholesale packages of ${product.product_name} available!`, { position: "top-center" });
            return;
          }
          
          // Check if at least 1 full package can be added
          if (remainingRetailStock < packaging) {
            toast.warning(`Not enough stock for a full wholesale package (needs ${packaging} retail units)`, {
              position: "top-center",
            });
            return;
          }
          
          addToCart(product, "wholesale");
          return;
        }
        
        // If barcode was found as retail type
        if (type === 'retail') {
          // Check if we have enough retail stock
          if (product.rqty <= 0) {
            toast.warning(`No retail units of ${product.product_name} available!`, { position: "top-center" });
            return;
          }
          
          addToCart(product, "retail");
          return;
        }
      } else {
        toast.warning("No product found for this barcode", { position: "top-center" });
      }
    } catch (err) {
      console.error("Barcode scan error:", err);
      toast.error("Failed to lookup product by barcode", { position: "top-center" });
    }
  };

  // Fetch categories
  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/categories`)
      .then((res) => setCategories(res.data))
      .catch(console.error)
      .finally(() => setLoadingCategories(false));
  }, [API_BASE_URL]);

  // Fetch products
  useEffect(() => {
    setLoadingProducts(true);
    let url = `${API_BASE_URL}/api/products`;
    if (selectedCategory !== "hot") {
      url += `/${Number(selectedCategory)}`;
    }
    axios
      .get(url)
      .then((res) => setProducts(res.data))
      .catch(() => setProducts([]))
      .finally(() => setLoadingProducts(false));
  }, [selectedCategory, API_BASE_URL]);

  // Auto-focus barcode input on component mount
  useEffect(() => {
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, []);

  if (loadingCategories) return <div>Loading categories...</div>;

  const allCategories = [fixedCategory, ...categories];

  const vatBreakdown = calculateVatBreakdown();
  const total = vatBreakdown.total;
  const change = Math.max(0, amountTendered - (total - discount));

  return (
    <div className="d-flex">
      {/* Toast Container */}
      <ToastContainer
        position="top-center"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      
      {/* Hidden PrintOrder Component */}
      <div style={{ display: "none" }}>
        <PrintOrder
          ref={componentRef}
          orderNumber={orderNumber}
          date={new Date().toLocaleDateString("en-PH")}
          items={orderItems}
          subtotal={total}
          discount={discount}
          total={total - discount}
          amountTendered={amountTendered}
          change={change}
          customerName={customerName}
          tableNo={tableNo}
          vatableSales={vatBreakdown.vatableAmount}
          vatAmount={vatBreakdown.vatAmount}
          nonVatableSales={vatBreakdown.nonVatableTotal}
        />
      </div>

      {/* Main Menu Content */}
      <div className="flex-grow-1 container-fluid cashier-body">
        {/* Category Buttons */}
        <div className="d-flex flex-wrap gap-2 mb-3">
          {allCategories.map((category) => (
            <button
              key={category.id}
              className={`category-btn ${
                selectedCategory === category.id ? "active" : ""
              }`}
              onClick={() => setSelectedCategory(category.id)}
            >
              <i className={category.icon}></i>
              <div className="label">{category.name}</div>
            </button>
          ))}
        </div>

        {/* Products */}
        <div className="menu-scroll">
          <div className="row">
            {loadingProducts ? (
              <div>Loading products...</div>
            ) : products.length === 0 ? (
              <div>No products found.</div>
            ) : (
              products.map((product) => (
                <div key={product.id} className="col-12 col-md-4 col-lg-3 mb-4">
                  <div className="menu-item">
                    <img
                      src={
                        `${API_BASE_URL}/storage/uploads/products/${product.image}` || "/assets/img/placeholder.png"
                      }
                      alt={product.image}
                      style={{
                        maxHeight: "150px",
                        objectFit: "cover",
                        width: "100%",
                      }}
                    />
                    <div className="font-weight-bold product-name-menu">
                      {product.product_name}
                    </div>

                    {/* Retail Price Button */}
                    {product.r_price && (
                      <button
                        className={`btn btn-sm btn-primary primary-radius w-100 mt-2 button-price d-flex justify-content-between align-items-center m-2 ${
                          (product.rqty + (product.wqty * (product.packaging || 1))) <= 0 ? 'disabled' : ''
                        }`}
                        onClick={() => addToCart(product, "retail")}
                        disabled={(product.rqty + (product.wqty * (product.packaging || 1))) <= 0}
                      >
                        <div>
                          <span>{formatCurrency(product.r_price)}</span>
                          <span className="ms-2 text-white">
                            ({product.rqty})
                          </span>
                        </div>
                        <span className="circle-icon bg-white text-primary rounded-circle d-flex justify-content-center align-items-center"
                          style={{ width: "24px", height: "24px" }}>
                          <i className="fas fa-plus"></i>
                        </span>
                      </button>
                    )}
                    {/* Wholesale Price Button */}
                    {product.w_price && product.w_price > 0 && product.packaging > 1 && (
                      <button
                        className={`btn btn-sm btn-success primary-radius w-100 mt-2 button-price d-flex justify-content-between align-items-center m-2 ${
                          product.wqty <= 0 ? 'disabled' : ''
                        }`}
                        onClick={() => addToCart(product, "wholesale")}
                        disabled={product.wqty <= 0}
                      >
                        <div>
                          <span>{formatCurrency(product.w_price)}</span>
                          {product.wqty <= 0 ? (
                            <span className="ms-2 text-white"></span>
                          ) : (
                            <span className="ms-2 text-white">
                              ({product.wqty}) 
                            </span>
                          )}
                        </div>
                        <span className="circle-icon bg-white text-success rounded-circle d-flex justify-content-center align-items-center"
                          style={{ width: "24px", height: "24px" }}>
                          <i className="fas fa-plus"></i>
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          <br></br><br></br><br></br><br></br><br></br><br></br><br></br>
        </div>
      </div>

      {/* Order Sidebar */}
      <aside className="order-sidebar">
        <div className="order-box">
          <div className="order-header">
            <span>Order #{loadingOrderNumber ? "Loading..." : getSequenceNumber(orderNumber)}</span>
            <span className="order-date">
              {new Date().toLocaleDateString("en-PH", {
                weekday: "long",
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>

          {/* Customer & Barcode Input */}
          <div className="mb-3">
            <div className="input-group input-group-sm mb-2">
              <span className="input-group-text bg-light border-0">
                <i className="fas fa-barcode text-dark"></i>
              </span>
              <input
                ref={barcodeInputRef}
                type="text"
                className="form-control border-0"
                placeholder="Scan barcode"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleBarcodeScan(e.target.value);
                    e.target.value = "";
                  }
                }}
                autoFocus
              />
            </div>
              
            <div className="input-group input-group-sm mb-2">
              <span className="input-group-text bg-light border-0 text-primary">
                <i className="fas fa-user text-dark"></i>
              </span>
              <input
                type="text"
                className="form-control border-0"
                placeholder="Customer Name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            <div className="input-group input-group-sm" style={{ display: 'none' }}>
              <span className="input-group-text bg-light border-0 text-primary">
                <i className="fas fa-chair text-dark"></i>
              </span>
              <input
                type="text"
                className="form-control border-0 table-input"
                placeholder="Table #"
                value={tableNo}
                onChange={(e) => setTableNo(e.target.value)}
              />
            </div>
          </div>

          {/* Order Items */}
          <div className="order-scrollable flex-grow-1 overflow-auto">
            {orderItems.map((item) => (
              <OrderItem
                key={`${item.id}-${item.type}`}
                item={item}
                increaseQty={increaseQty}
                decreaseQty={decreaseQty}
                removeItem={removeItem}
                formatCurrency={formatCurrency}
              />
            ))}
          </div>

          {/* Totals & Actions */}
          <div className="pt-3 border-top mt-3">
            <div className="d-flex justify-content-between mb-2">
              <span className="span-text">Subtotal:</span>
              <strong className="text-dark">{formatCurrency(total)}</strong>
            </div>
            
            {/* VAT Breakdown (only show if there are VATable items) */}
            {vatBreakdown.vatableAmount > 0 && (
              <>
                <div className="d-flex justify-content-between mb-1 small">
                  <span className="span-text">VATable Sales:</span>
                  <span>{formatCurrency(vatBreakdown.vatableAmount)}</span>
                </div>
                <div className="d-flex justify-content-between mb-1 small">
                  <span className="span-text">VAT (12%):</span>
                  <span>{formatCurrency(vatBreakdown.vatAmount)}</span>
                </div>
              </>
            )}
            
            {/* Non-VAT Breakdown (only show if there are non-VATable items) */}
            {vatBreakdown.nonVatableTotal > 0 && (
              <div className="d-flex justify-content-between mb-1 small">
                <span className="span-text">Non-VATable Sales:</span>
                <span>{formatCurrency(vatBreakdown.nonVatableTotal)}</span>
              </div>
            )}
            
            <div className="d-flex justify-content-between mb-2 align-items-center">
              <span className="span-text">Discount:</span>
              <input
                type="number"
                className="form-control form-control-sm w-50 text-end"
                value={discount}
                min="0"
                max={total}
                onChange={(e) => {
                  const value = Number(e.target.value) || 0;
                  setDiscount(Math.min(total, Math.max(0, value)));
                }}
              />
            </div>
            <div className="d-flex justify-content-between mb-2">
              <span className="span-text">Total:</span>
              <strong className="text-primary">{formatCurrency(total - discount)}</strong>
            </div>
            <div className="d-flex justify-content-between mb-2">
              <span className="span-text">Amount Tendered:</span>
              <input
                type="number"
                className="form-control form-control-sm w-50 text-end"
                value={amountTendered}
                min="0"
                onChange={(e) => setAmountTendered(Math.max(0, Number(e.target.value) || 0))}
              />
            </div>
            <div className="d-flex justify-content-between mb-3">
              <span className="span-text">Change:</span>
              <strong className="text-success">{formatCurrency(change)}</strong>
            </div>

            <div className="d-grid gap-2">
              <button
                className="btn btn-primary w-100 primary-radius"
                onClick={() => handleCheckout(1)}
                disabled={loadingOrderNumber || orderItems.length === 0}
              >
                {loadingOrderNumber ? (
                  <span>Loading...</span>
                ) : (
                  <>
                    <i className="fas fa-shopping-cart"></i> Checkout
                  </>
                )}
              </button>
              <button
                className="btn btn-outline-danger w-100 primary-radius"
                onClick={async () => {
                  await handleCheckout(2);
                  // The resetOrder is already called inside handleCheckout for status 2
                }}
                disabled={loadingOrderNumber || orderItems.length === 0}
              >
                {loadingOrderNumber ? (
                  <span>Loading...</span>
                ) : (
                  <>
                    <i className="fas fa-shopping-cart"></i> Next
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}