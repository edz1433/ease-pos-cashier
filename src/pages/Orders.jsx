import React, { useRef, useState, useEffect } from "react";
import { useReactToPrint } from "react-to-print";
import axios from "axios";
import { format, parseISO, isToday, isBefore } from "date-fns";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

const SalesTable = ({ user }) => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState(format(new Date(), "yyyy-MM-dd"));
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const componentRef = useRef();
  const navigate = useNavigate();

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: `Sales_Report_${dateFilter}`,
    pageStyle: `
      @page { size: auto; margin: 5mm; }
      @media print {
        body { font-size: 12px; }
        table { width: 100%; border-collapse: collapse; }
        .badge { color: white !important; padding: 3px 6px; border-radius: 3px; }
        .card-header, .card-tools { display: none; }
        .action-buttons { display: none; }
        tr { page-break-inside: avoid; }
      }
    `,
  });

  useEffect(() => {
    console.log("User object:", user);
    console.log("User role:", user?.role);
  }, [user]);


  useEffect(() => {
    fetchSales();
  }, [dateFilter]);

  const fetchSales = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(
        `${API_BASE_URL}/api/sales/${dateFilter}`
      );
      setSales(response.data?.data || response.data || []);
    } catch (err) {
      console.error("Error fetching sales:", err);
      setError(err.response?.data?.message || "Failed to fetch sales data");
      setSales([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrReturn = async (saleId, currentStatus) => {
    // Check if user has permission to perform this action on previous dates
    if (isPreviousDate(dateFilter) && !isAdmin) {
      Swal.fire({
        icon: 'warning',
        title: 'Access Denied',
        text: 'Only administrators can modify previous date records.',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    setActionLoading(prev => ({ ...prev, [saleId]: true }));
    
    try {
      const actionText = currentStatus === 1 ? "return" : "cancel";
      const actionConfirmText = currentStatus === 1 
        ? "This will return the order and restock inventory." 
        : "This will cancel the unpaid order.";
      
      const result = await Swal.fire({
        title: `Are you sure you want to ${actionText} this order?`,
        text: actionConfirmText,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: `Yes, ${actionText} it!`,
        cancelButtonText: 'No, keep it'
      });

      if (!result.isConfirmed) {
        setActionLoading(prev => ({ ...prev, [saleId]: false }));
        return;
      }

      const response = await axios.post(`${API_BASE_URL}/api/sales/${saleId}/cancel-or-return`);
      
      if (response.data.status === 'success') {
        const message = response.data.message || 
          (response.data.data.status === 3 
            ? 'Order has been cancelled successfully.' 
            : 'Order has been returned successfully.');
        
        Swal.fire('Success!', message, 'success');
        // Refresh the sales list
        fetchSales();
      } else {
        throw new Error(response.data.message || 'Failed to process order');
      }
    } catch (err) {
      console.error("Error processing order:", err);
      Swal.fire('Error!', err.response?.data?.message || 'Failed to process order', 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [saleId]: false }));
    }
  };

  // Check if the selected date is a previous date (not today)
  const isPreviousDate = (dateString) => {
    try {
      const selectedDate = parseISO(dateString);
      return isBefore(selectedDate, new Date()) && !isToday(selectedDate);
    } catch (e) {
      return false;
    }
  };

  // Check user roles - ONLY ADMIN (role 1) can edit previous dates
  const isAdmin = Number(user?.role) == 1;

  // Check if editing is allowed for the current date
  const isEditingAllowed = () => {
    if (isPreviousDate(dateFilter)) {
      return isAdmin; // Only allow admins to edit previous dates
    }
    return true; // Allow editing for today's date for all roles
  };

  // Check if action buttons should be shown
  const shouldShowActionButtons = (saleStatus) => {
    if (isPreviousDate(dateFilter)) {
      return isAdmin; // Only show action buttons for admins on previous dates
    }
    return saleStatus === 1 || saleStatus === 2; // Show action buttons for today's date based on status
  };

  const handleRowClick = (saleId, status) => {
    // Only allow editing for active orders (not cancelled or returned)
    if (status !== 3 && status !== 4) {
      // Check if editing is allowed for the current date
      if (isEditingAllowed()) {
        navigate(`/edit-sales/${saleId}`);
      } else {
        Swal.fire({
          icon: 'warning',
          title: 'Access Denied',
          text: 'Only administrators can edit previous date records.',
          confirmButtonColor: '#3085d6',
        });
      }
    }
  };

  const filteredSales = sales.filter(
    (sale) =>
      (sale.transaction_number?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (sale.customer?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (sale.table_no?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status) => {
    switch (status) {
      case 1: return <span className="badge bg-success">Paid</span>;
      case 2: return <span className="badge bg-warning">Unpaid</span>;
      case 3: return <span className="badge bg-danger">Cancelled</span>;
      case 4: return <span className="badge bg-info">Returned</span>;
      case 5: return <span className="badge bg-secondary">Partially Returned</span>;
      default: return <span className="badge bg-secondary">Unknown</span>;
    }
  };

  const getPaymentBadge = (method) => {
    if (!method) return <span className="badge bg-secondary">-</span>;
    
    switch (method.toLowerCase()) {
      case "cash": return <span className="badge bg-primary">Cash</span>;
      case "card": return <span className="badge bg-info">Card</span>;
      case "gcash": return <span className="badge bg-success">GCash</span>;
      case "bank transfer": return <span className="badge bg-warning">Bank Transfer</span>;
      default: return <span className="badge bg-secondary">{method}</span>;
    }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-PH", { 
      style: "currency", 
      currency: "PHP", 
      minimumFractionDigits: 2 
    }).format(amount || 0);

  const formatDate = (dateString) => {
    try { 
      return format(parseISO(dateString), "MMM d, yyyy"); 
    } catch (e) { 
      return dateString || "-"; 
    }
  };

  const formatTime = (dateString) => {
    try { 
      return format(parseISO(dateString), "h:mm a"); 
    } catch (e) { 
      return dateString || "-"; 
    }
  };

  const calculateTotals = (field) =>
    filteredSales.reduce((sum, sale) => {
      if (typeof sale[field] === 'number') return sum + sale[field];
      if (typeof sale[field] === 'string') {
        const numericString = sale[field].replace(/[^\d.-]/g, '');
        return sum + (parseFloat(numericString) || 0);
      }
      return sum;
    }, 0);

  return (
    <div className="col-12">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Daily Sales</h3>
          <div className="card-tools">
            <div className="input-group input-group-sm" style={{ width: 350 }}>
              <input type="date" className="form-control" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} max={format(new Date(), "yyyy-MM-dd")} />
              <input type="text" className="form-control float-right" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              <div className="input-group-append">
                <button className="btn btn-default" onClick={handlePrint} disabled={loading || filteredSales.length === 0}>
                  <i className="fas fa-print"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="card-body table-responsive p-0" style={{ height: 600 }}>
          <div ref={componentRef}>
            <div className="p-3">
              <p><strong>Date:</strong> {formatDate(dateFilter)}</p>
              <p><strong>Total Transactions:</strong> {filteredSales.length}</p>
              {isPreviousDate(dateFilter) && !isAdmin && (
                <p className="text-warning">
                  <small>
                    <i className="fas fa-exclamation-triangle mr-1"></i>
                    Viewing previous date. Editing is restricted to administrators only.
                  </small>
                </p>
              )}
            </div>

            <table className="table table-head-fixed text-nowrap">
              <thead>
                <tr>
                  <th>Date/Time</th>
                  <th>Transaction #</th>
                  <th>Customer</th>
                  <th>Payment Method</th>
                  <th className="text-end">Total</th>
                  <th className="text-end">Discount</th>
                  <th className="text-end">Amount Paid</th>
                  <th className="text-end">Change</th>
                  <th>Status</th>
                  <th className="action-buttons">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="10" className="text-center py-4"><div className="spinner-border text-primary" role="status"><span className="sr-only">Loading...</span></div></td></tr>
                ) : error ? (
                  <tr><td colSpan="10" className="text-center text-danger py-4">{error}</td></tr>
                ) : filteredSales.length === 0 ? (
                  <tr><td colSpan="10" className="text-center py-4">No sales found for this date</td></tr>
                ) : (
                  filteredSales.map((sale) => (
                    <tr key={sale.id} className="hover-row">
                      <td 
                        onClick={() => handleRowClick(sale.id, sale.status)}
                        style={{ cursor: (sale.status !== 3 && sale.status !== 4 && isEditingAllowed()) ? "pointer" : "default" }}
                      >
                        {formatDate(sale.date)} <br /><small>{formatTime(sale.created_at)}</small>
                      </td>
                      <td 
                        onClick={() => handleRowClick(sale.id, sale.status)}
                        style={{ cursor: (sale.status !== 3 && sale.status !== 4 && isEditingAllowed()) ? "pointer" : "default" }}
                      >
                        {sale.transaction_number || "-"}
                      </td>
                      <td 
                        onClick={() => handleRowClick(sale.id, sale.status)}
                        style={{ cursor: (sale.status !== 3 && sale.status !== 4 && isEditingAllowed()) ? "pointer" : "default" }}
                      >
                        {sale.customer || "Walk-in"}
                      </td>
                      <td 
                        onClick={() => handleRowClick(sale.id, sale.status)}
                        style={{ cursor: (sale.status !== 3 && sale.status !== 4 && isEditingAllowed()) ? "pointer" : "default" }}
                      >
                        {getPaymentBadge(sale.payment_method)}
                      </td>
                      <td 
                        className="text-end" 
                        onClick={() => handleRowClick(sale.id, sale.status)}
                        style={{ cursor: (sale.status !== 3 && sale.status !== 4 && isEditingAllowed()) ? "pointer" : "default" }}
                      >
                        {formatCurrency(sale.total)}
                      </td>
                      <td 
                        className="text-end" 
                        onClick={() => handleRowClick(sale.id, sale.status)}
                        style={{ cursor: (sale.status !== 3 && sale.status !== 4 && isEditingAllowed()) ? "pointer" : "default" }}
                      >
                        {formatCurrency(sale.discount)}
                      </td>
                      <td 
                        className="text-end" 
                        onClick={() => handleRowClick(sale.id, sale.status)}
                        style={{ cursor: (sale.status !== 3 && sale.status !== 4 && isEditingAllowed()) ? "pointer" : "default" }}
                      >
                        {formatCurrency(sale.amt_tendered)}
                      </td>
                      <td 
                        className="text-end" 
                        onClick={() => handleRowClick(sale.id, sale.status)}
                        style={{ cursor: (sale.status !== 3 && sale.status !== 4 && isEditingAllowed()) ? "pointer" : "default" }}
                      >
                        {formatCurrency(sale.amount_change)}
                      </td>
                      <td 
                        onClick={() => handleRowClick(sale.id, sale.status)}
                        style={{ cursor: (sale.status !== 3 && sale.status !== 4 && isEditingAllowed()) ? "pointer" : "default" }}
                      >
                        {getStatusBadge(sale.status)}
                      </td>
                      <td className="action-buttons">
                        <div className="btn-group btn-group-sm">
                          {shouldShowActionButtons(sale.status) && (
                            <>
                              {(sale.status === 1) && (
                                <button
                                  className="btn btn-danger"
                                  onClick={() => handleCancelOrReturn(sale.id, sale.status)}
                                  disabled={actionLoading[sale.id]}
                                  title="Return Order"
                                >
                                  {actionLoading[sale.id] ? (
                                    <div className="spinner-border spinner-border-sm" role="status">
                                      <span className="sr-only">Loading...</span>
                                    </div>
                                  ) : (
                                    <i className="fas fa-undo"></i>
                                  )}
                                </button>
                              )}
                              {(sale.status === 2) && (
                                <button
                                  className="btn btn-danger"
                                  onClick={() => handleCancelOrReturn(sale.id, sale.status)}
                                  disabled={actionLoading[sale.id]}
                                  title="Cancel Order"
                                >
                                  {actionLoading[sale.id] ? (
                                    <div className="spinner-border spinner-border-sm" role="status">
                                      <span className="sr-only">Loading...</span>
                                    </div>
                                  ) : (
                                    <i className="fas fa-times"></i>
                                  )}
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {!loading && !error && filteredSales.length > 0 && (
                <tfoot>
                  <tr className="bg-light">
                    <td colSpan="4" className="text-end"><strong>Totals:</strong></td>
                    <td className="text-end"><strong>{formatCurrency(calculateTotals("total"))}</strong></td>
                    <td className="text-end"><strong>{formatCurrency(calculateTotals("discount"))}</strong></td>
                    <td className="text-end"><strong>{formatCurrency(calculateTotals("amt_tendered"))}</strong></td>
                    <td className="text-end"><strong>{formatCurrency(calculateTotals("amount_change"))}</strong></td>
                    <td></td>
                    <td className="action-buttons"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesTable;