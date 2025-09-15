import React, { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import { useSwipeable } from 'react-swipeable';
import { useReactToPrint } from "react-to-print";
import PrintOrder from "../components/PrintOrder";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Swal from "sweetalert2";
import "../components/PaymentMethod.css";

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

// Payment Method Modal Component
const PaymentMethodModal = ({ isOpen, onClose, paymentMethod, setPaymentMethod }) => {
  if (!isOpen) return null;

  const methods = [
    { id: 'cash', name: 'Cash', icon: 'fas fa-money-bill-wave' },
    { id: 'gcash', name: 'GCash', icon: 'fas fa-mobile-alt' },
    { id: 'bank', name: 'Bank Transfer', icon: 'fas fa-university' }
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h5 className="modal-title">Select Payment Method</h5>
          <button type="button" className="close-btn" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="modal-body">
          <div className="payment-methods">
            {methods.map((method) => (
              <div
                key={method.id}
                className={`payment-method ${paymentMethod === method.name ? 'selected' : ''}`}
                onClick={() => {
                  setPaymentMethod(method.name);
                  onClose();
                }}
              >
                <div className="payment-icon">
                  <i className={method.icon}></i>
                </div>
                <div className="payment-name">{method.name}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <small className="text-muted">Press F2 to open this dialog</small>
        </div>
      </div>
    </div>
  );
};

// Product Search Modal Component
const ProductSearchModal = ({ 
  isOpen, 
  onClose, 
  allProducts, 
  addToCart, 
  formatCurrency, 
  orderItems
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [priceType, setPriceType] = useState('retail');

  if (!isOpen) return null;

  // Filter products based on search term
  const filteredProducts = allProducts.filter(product =>
    product.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.barcode.includes(searchTerm)
  );

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    setQuantity(1);
    // Set default price type based on product availability
    if (product.r_price && product.r_price > 0) {
      setPriceType('retail');
    } else if (product.w_price && product.w_price > 0) {
      setPriceType('wholesale');
    }
  };

  // Calculate current retail quantity in cart for a specific product
  const getCurrentCartRetailQty = (productId) => {
    const packaging = allProducts.find(p => p.id === productId)?.packaging || 1;
    
    return orderItems
      .filter(item => item.id === productId)
      .reduce((sum, item) => {
        if (item.type === 'retail') {
          return sum + item.quantity;
        } else { // wholesale
          return sum + (item.quantity * packaging);
        }
      }, 0);
  };

  // Calculate available stock considering what's already in cart
  const getAvailableStockConsideringCart = (product, type) => {
    const packaging = product.packaging || 1;
    const currentCartRetailQty = getCurrentCartRetailQty(product.id);
    
    if (type === 'retail') {
      const totalAvailable = product.rqty + (product.wqty * packaging);
      return Math.max(0, totalAvailable - currentCartRetailQty);
    } else {
      // For wholesale, we need to calculate how many full packages are available
      const totalAvailableRetail = product.rqty + (product.wqty * packaging);
      const availableRetailAfterCart = totalAvailableRetail - currentCartRetailQty;
      return Math.max(0, Math.floor(availableRetailAfterCart / packaging));
    }
  };

  const handleAddToCart = () => {
    if (!selectedProduct) return;
    
    const packaging = selectedProduct.packaging || 1;
    const availableStock = getAvailableStockConsideringCart(selectedProduct, priceType);
    
    if (quantity <= 0) {
      toast.warning("Please enter a valid quantity", { position: "top-center" });
      return;
    }
    
    if (quantity > availableStock) {
      toast.warning(`Only ${availableStock} ${priceType === 'retail' ? 'retail units' : 'wholesale packages'} available!`, {
        position: "top-center",
      });
      return;
    }

    // Add the product to cart with selected quantity and price type
    addToCart(selectedProduct, priceType, quantity);
    
    // Close the modal
    onClose();
    setSelectedProduct(null);
    
    // Show success message
    toast.success(`${quantity} ${selectedProduct.product_name} added to cart`, {
      position: "top-center",
      autoClose: 1000,
    });
  };

  const getPrice = (product, type) => {
    if (type === 'retail') {
      return product.r_price || 0;
    } else {
      return product.w_price || 0;
    }
  };

  // Get max quantity based on selected price type and current cart
  const getMaxQuantity = (product, type) => {
    return getAvailableStockConsideringCart(product, type);
  };

  return (
    <div className="modal-backdrop" onClick={() => { setSelectedProduct(null); onClose(); }}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
        <div className="modal-header">
          <h5 className="modal-title">Search Products (F1)</h5>
          <button type="button" className="close-btn" onClick={() => { setSelectedProduct(null); onClose(); }}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="modal-body">
          <div className="mb-3">
            <input
              type="text"
              className="form-control"
              placeholder="Search by name or barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>

          {selectedProduct ? (
            <div className="selected-product-details">
              <h6>Selected Product:</h6>
              <div className="card p-3 mb-3">
                <div className="row">
                  <div className="col-md-4">
                    <img
                      src={`${process.env.REACT_APP_API_BASE_URL}/storage/uploads/products/${selectedProduct.image}` || "/assets/img/placeholder.png"}
                      alt={selectedProduct.product_name}
                      className="img-fluid rounded"
                      style={{ maxHeight: '150px', objectFit: 'cover' }}
                    />
                  </div>
                  <div className="col-md-8">
                    <h5>{selectedProduct.product_name}</h5>
                    <p className="mb-1">Model: {selectedProduct.model}</p>
                    <p className="mb-1">Barcode: {selectedProduct.barcode}</p>
                    <p className="mb-1 text-muted small">
                      Already in cart: {getCurrentCartRetailQty(selectedProduct.id)} retail units
                    </p>
                    
                    <div className="row mt-3">
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Price Type:</label>
                          <select
                            className="form-control"
                            value={priceType}
                            onChange={(e) => {
                              setPriceType(e.target.value);
                              setQuantity(1); // Reset quantity when changing type
                            }}
                          >
                            {selectedProduct.r_price > 0 && (
                              <option value="retail">
                                Retail ({formatCurrency(selectedProduct.r_price)}) - Available: {getAvailableStockConsideringCart(selectedProduct, 'retail')}
                              </option>
                            )}
                            {selectedProduct.w_price > 0 && (
                              <option value="wholesale">
                                Wholesale ({formatCurrency(selectedProduct.w_price)}) - Available: {getAvailableStockConsideringCart(selectedProduct, 'wholesale')}
                              </option>
                            )}
                          </select>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Quantity:</label>
                          <input
                            type="number"
                            className="form-control"
                            min="1"
                            max={getMaxQuantity(selectedProduct, priceType)}
                            value={quantity}
                            onChange={(e) => {
                              const newValue = Math.max(1, parseInt(e.target.value) || 1);
                              const maxQty = getMaxQuantity(selectedProduct, priceType);
                              setQuantity(Math.min(newValue, maxQty));
                            }}
                          />
                          <small className="text-muted">
                            Max: {getMaxQuantity(selectedProduct, priceType)} available
                            {priceType === 'wholesale' && selectedProduct.packaging > 1 && 
                              ` (${quantity * selectedProduct.packaging} retail units)`
                            }
                          </small>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3">
                      <strong>Total: {formatCurrency(getPrice(selectedProduct, priceType) * quantity)}</strong>
                    </div>

                    <div className="mt-3 d-flex gap-2">
                      <button
                        className="btn btn-secondary"
                        onClick={() => setSelectedProduct(null)}
                      >
                        Back to Search
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={handleAddToCart}
                        disabled={quantity > getMaxQuantity(selectedProduct, priceType) || quantity <= 0}
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="product-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {filteredProducts.length === 0 ? (
                <div className="text-center py-3">
                  {searchTerm ? 'No products found' : 'Start typing to search products'}
                </div>
              ) : (
                filteredProducts.map(product => {
                  const availableRetail = getAvailableStockConsideringCart(product, 'retail');
                  const availableWholesale = getAvailableStockConsideringCart(product, 'wholesale');
                  const isOutOfStock = availableRetail <= 0 && availableWholesale <= 0;
                  
                  return (
                    <div
                      key={product.id}
                      className={`card p-3 mb-2 cursor-pointer ${isOutOfStock ? 'opacity-50' : ''}`}
                      onClick={() => !isOutOfStock && handleProductSelect(product)}
                      style={{ cursor: isOutOfStock ? 'not-allowed' : 'pointer' }}
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="flex-grow-1">
                          <strong>{product.product_name}</strong>
                          <div>Model: {product.model}</div>
                          <div>Barcode: {product.barcode}</div>
                          <div className="d-flex gap-3 mt-1">
                            {product.r_price > 0 && (
                              <span className={`badge ${availableRetail > 0 ? 'bg-primary' : 'bg-secondary'}`}>
                                Retail: {formatCurrency(product.r_price)} (Available: {availableRetail})
                              </span>
                            )}
                            {product.w_price > 0 && (
                              <span className={`badge ${availableWholesale > 0 ? 'bg-success' : 'bg-secondary'}`}>
                                Wholesale: {formatCurrency(product.w_price)} (Available: {availableWholesale})
                              </span>
                            )}
                          </div>
                          {isOutOfStock && (
                            <span className="badge bg-danger mt-1">Out of Stock</span>
                          )}
                        </div>
                        <div>
                          <i className="fas fa-chevron-right"></i>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <small className="text-muted">
            {selectedProduct ? 'Adjust quantity and price type before adding to cart' : 'Select a product to add it to cart'}
          </small>
        </div>
      </div>
    </div>
  );
};

export default function Menu() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]); // For search modal
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
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false); // For product search modal

  const barcodeInputRef = useRef(null);

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const fixedCategory = { id: "hot", name: "Hot", icon: "fas fa-fire" };

  const componentRef = useRef();
  const handlePrint = useReactToPrint({
    contentRef: componentRef, 
    documentTitle: `Order_${orderNumber}`,  
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

// Fetch all products for search modal
const fetchAllProducts = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/all-products`);
    
    // Transform the API data to match expected structure
    const transformedProducts = transformProductData(response.data);
    setAllProducts(transformedProducts);
  } catch (error) {
    console.error("Error fetching all products:", error);
    toast.error("Failed to load products for search", { position: "top-center" });
  }
};

// Helper function to transform API data
const transformProductData = (apiProducts) => {
  const productMap = {};
  
  apiProducts.forEach(product => {
    if (!productMap[product.id]) {
      productMap[product.id] = {
        id: product.id,
        barcode: product.barcode,
        product_name: product.product_name,
        model: product.model,
        packaging: parseInt(product.packaging) || 1,
        capital: parseFloat(product.capital) || 0,
        vatable: product.vatable,
        image: product.image,
        retail_unit_name: product.unit_name || 'pc',
        wholesale_unit_name: product.unit_name || 'pkg',
        // Initialize both price types as 0
        r_price: 0,
        w_price: 0,
        rqty: 0,
        wqty: 0,
        type: 'both' // Default to both if we have both types
      };
    }
    
    // Update the product based on type
    if (product.type === 'retail') {
      productMap[product.id].r_price = parseFloat(product.price) || 0;
      productMap[product.id].rqty = parseInt(product.qty) || 0;
    } else if (product.type === 'wholesale') {
      productMap[product.id].w_price = parseFloat(product.price) || 0;
      productMap[product.id].wqty = parseInt(product.qty) || 0;
      productMap[product.id].wholesale_unit_name = product.unit_name || 'pkg';
    }
    
    // Determine the product type
    if (productMap[product.id].r_price > 0 && productMap[product.id].w_price > 0) {
      productMap[product.id].type = 'both';
    } else if (productMap[product.id].r_price > 0) {
      productMap[product.id].type = 'retail';
    } else if (productMap[product.id].w_price > 0) {
      productMap[product.id].type = 'wholesale';
    }
  });
  
  return Object.values(productMap);
};

  //DisableBrowserShortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Disable F1 to F12
      if (e.keyCode >= 112 && e.keyCode <= 123) {
        e.preventDefault();
        e.stopPropagation();

        switch (e.keyCode) {
          case 112: // F1
            setShowProductModal(true);
            fetchAllProducts(); // Load products when opening modal
            console.log('F1 pressed - Product Search modal opened');
            break;

          case 113: // F2
            setShowPaymentModal(true);
            console.log('F2 pressed - Payment Method modal opened');
            break;

          case 115: // F4
            console.log('F4 pressed');
            break;

          default:
            console.log(`Function key ${e.keyCode} pressed`);
            break;
        }
      }

      // Disable other browser shortcuts
      if (e.ctrlKey || e.altKey || e.metaKey) {
        // Ctrl+R / F5
        if (e.keyCode === 82 || e.keyCode === 116) {
          e.preventDefault();
          toast.warning('Refresh is disabled in POS mode', { position: 'top-center' });
        }
        // Ctrl+N
        if (e.keyCode === 78) e.preventDefault();
        // Ctrl+W
        if (e.keyCode === 87) e.preventDefault();
      }

      // Disable F5 refresh
      if (e.keyCode === 116) {
        e.preventDefault();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);

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
  const addToCart = (product, type, quantity = 1) => {
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

    // Calculate required retail units for the new items
    const requiredRetailUnits = type === 'retail' ? quantity : quantity * packaging;

    // Check if we have enough stock for the requested quantity
    if (requiredRetailUnits > remainingRetailStock) {
      const availableUnits = type === 'retail' 
        ? Math.floor(remainingRetailStock)
        : Math.floor(remainingRetailStock / packaging);
      
      toast.warning(`Only ${availableUnits} ${type === 'retail' ? 'retail units' : 'wholesale packages'} available!`, {
        position: "top-center",
      });
      return;
    }

    // For wholesale items, check if we have enough wholesale packages
    if (type === 'wholesale' && quantity > product.wqty) {
      toast.warning(`Only ${product.wqty} wholesale packages available!`, {
        position: "top-center",
      });
      return;
    }

    // For retail items, check if we have enough retail units
    if (type === 'retail' && quantity > product.rqty) {
      toast.warning(`Only ${product.rqty} retail units available!`, {
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
                quantity: item.quantity + quantity,
                availableStock: type === 'retail' 
                  ? product.rqty - (currentCartRetailQty - (item.quantity * (item.type === 'retail' ? 1 : packaging)) + (type === 'retail' ? quantity : quantity * packaging))
                  : product.wqty - Math.floor((currentCartRetailQty - (item.quantity * packaging) + (type === 'retail' ? quantity : quantity * packaging)) / packaging),
                stockWarning: type === 'retail'
                  ? (item.quantity + quantity) > product.rqty
                  : (item.quantity + quantity) > product.wqty
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
          quantity: quantity,
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

  // Handle barcode scanning
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
      
      {/* Payment Method Modal */}
      <PaymentMethodModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
      />
      
      {/* Product Search Modal */}
      <ProductSearchModal
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
        allProducts={allProducts}
        addToCart={addToCart}
        formatCurrency={formatCurrency}
        orderItems={orderItems} // Pass the current cart items
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
          paymentMethod={paymentMethod}
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
            
            {/* Payment Method Display */}
            <div className="input-group input-group-sm mb-2">
              <span className="input-group-text bg-light border-0">
                <i className="fas fa-credit-card text-dark"></i>
              </span>
              <div className="form-control border-0 d-flex align-items-center justify-content-between">
                <span>{paymentMethod}</span>
                <small className="text-muted">F2</small>
              </div>
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