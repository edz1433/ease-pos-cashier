import React, { forwardRef, useState, useEffect } from "react";
import PropTypes from "prop-types";

// Helper function to format numbers with commas
const formatNumber = (num) =>
  Number(num).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Receipt component
const Receipt = forwardRef(
  (
    {
      orderNumber = "N/A",
      date = new Date().toLocaleDateString(),
      items = [],
      subtotal = 0,
      discount = 0,
      total = 0,
      amountTendered = 0,
      change = 0,
      customerName = "",
      tableNo = "",
      vatableSales = 0,
      vatAmount = 0,
      nonVatableSales = 0,
      paperWidth = 109, // default to 110mm
    },
    ref
  ) => {
    const displaySubtotal = subtotal;
    const displayTotal = total;
    const hasVatItems = vatableSales > 0;
    const hasNonVatItems = nonVatableSales > 0;

    const [isPrinting, setIsPrinting] = useState(false);

    // Handle print event
    useEffect(() => {
      const handleBeforePrint = () => setIsPrinting(true);
      const handleAfterPrint = () => setIsPrinting(false);

      window.addEventListener('beforeprint', handleBeforePrint);
      window.addEventListener('afterprint', handleAfterPrint);

      return () => {
        window.removeEventListener('beforeprint', handleBeforePrint);
        window.removeEventListener('afterprint', handleAfterPrint);
      };
    }, []);

    const styles = {
      receiptContainer: {
        fontFamily: "monospace",
        fontSize: isPrinting ? "12px" : "14px", // bigger base font
        lineHeight: 1.4,                        // slightly more spacing
        color: "#000",
        background: "#fff",
        margin: 0,
        padding: "5mm",                          // keeps content away from edges
        boxSizing: "border-box",
        width: `${paperWidth}mm`,
        minHeight: "auto",
        overflow: "visible",
        display: "block",
      },
      receipt: {
        width: "100%",
        boxSizing: "border-box",
      },
      receiptHeader: { 
        textAlign: "center", 
        marginBottom: "6px",      
        paddingBottom: "2px",
        borderBottom: "1px dashed #000"
      },
      receiptTitle: { 
        fontSize: isPrinting ? "18px" : "20px", // larger title
        fontWeight: "bold", 
        margin: "0 0 4px 0",
        textTransform: "uppercase"
      },
      receiptAddress: { 
        fontSize: isPrinting ? "12px" : "14px", 
        margin: "0 0 2px 0" 
      },
      receiptContact: { 
        fontSize: isPrinting ? "12px" : "14px", 
        margin: 0
      },
      divider: { 
        border: "none", 
        borderTop: "1px dashed #000", 
        margin: "6px 0" 
      },
      receiptItemName: { 
        fontSize: isPrinting ? "12px" : "14px",
        fontWeight: "normal" 
      },
      receiptItemPrice: { 
        fontSize: isPrinting ? "12px" : "14px",
        fontWeight: "normal" 
      },
      textMuted: { 
        color: "#201f1fff", 
        fontSize: isPrinting ? "11px" : "12px", 
        fontWeight: "bold" 
      },
      receiptTotalsStrong: { 
        fontSize: isPrinting ? "14px" : "16px", 
        fontWeight: "bold" 
      },
      receiptFooter: { 
        textAlign: "center", 
        marginTop: "10px", 
        fontSize: isPrinting ? "12px" : "14px", 
        paddingTop: "2px",
        borderTop: "1px dashed #000"
      },
      flexBetween: { 
        display: "flex", 
        justifyContent: "space-between",
        alignItems: "flex-start",
        margin: "4px 0"
      },
    };

    return (
      <div ref={ref} style={styles.receiptContainer} className="receipt-container">
        {/* Embedded print styles */}
        <style>
            {`
              @media print {
                @page {
                  size: ${paperWidth}mm auto;
                  margin: 0; /* remove all default printer margins */
                }
                html, body {
                  margin: 0 !important;
                  padding: 0 !important;
                  width: ${paperWidth}mm !important;
                  height: auto !important;
                }
                .receipt-container {
                  width: ${paperWidth}mm !important;
                  max-width: ${paperWidth}mm !important;
                  margin: 0 !important;
                  padding: 0 !important; /* remove padding to align perfectly */
                  box-shadow: none !important;
                  overflow: visible !important;
                  page-break-after: avoid;
                  page-break-inside: avoid;
                }
              }
            `}
        </style>

        <div style={styles.receipt}>
          {/* Header */}
          <div style={styles.receiptHeader}>
            <h4 style={styles.receiptTitle}>KER IT SOLUTIONS</h4>
            <p style={styles.receiptAddress}>Poblacion, Mabinay, Negros Oriental</p>
            <p style={styles.receiptContact}>+63 906 308 4301</p>
          </div>

          {/* Order Info */}
          <div>
            <div style={styles.flexBetween}>
              <span>Invoice #:</span>
              <span>{orderNumber}</span>
            </div>
            <div style={styles.flexBetween}>
              <span>Cashier:</span>
              <span>KERR DEVERO</span>
            </div>
            <div style={styles.flexBetween}>
              <span>Date:</span>
              <span>{date}</span>
            </div>
            {customerName && (
              <div style={styles.flexBetween}>
                <span>Customer:</span>
                <span>{customerName}</span>
              </div>
            )}
            {tableNo && (
              <div style={styles.flexBetween}>
                <span>Table #:</span>
                <span>{tableNo}</span>
              </div>
            )}
          </div>

          <hr style={styles.divider} />

          {/* Items */}
          <div>
            {items.map((item, index) => {
              const price = Number(item.price) || 0;
              const qty = Number(item.quantity) || 0;
              const itemTotal = price * qty;
              const unitName =
                item.type === "retail" ? item.retail_unit_name : item.wholesale_unit_name;

              return (
                <div key={index} style={{ marginBottom: "5px" }}>
                  <div style={styles.flexBetween}>
                    <span style={styles.receiptItemName}>
                      {qty} {unitName} {item.name}
                    </span>
                    <span style={styles.receiptItemPrice}>₱{formatNumber(itemTotal)}</span>
                  </div>
                  <div style={styles.flexBetween}>
                    <small style={styles.textMuted}>
                      @ ₱{formatNumber(price)}/{unitName}
                    </small>
                  </div>
                </div>
              );
            })}
          </div>

          <hr style={styles.divider} />

          {/* Totals */}
          <div>
            <div style={styles.flexBetween}>
              <span>Subtotal:</span>
              <span>₱{formatNumber(displaySubtotal)}</span>
            </div>

            {hasVatItems && (
              <>
                <div style={styles.flexBetween}>
                  <small style={styles.textMuted}>VATable Sales:</small>
                  <small style={styles.textMuted}>₱{formatNumber(vatableSales)}</small>
                </div>
                <div style={styles.flexBetween}>
                  <small style={styles.textMuted}>VAT (12%):</small>
                  <small style={styles.textMuted}>₱{formatNumber(vatAmount)}</small>
                </div>
              </>
            )}

            {hasNonVatItems && (
              <div style={styles.flexBetween}>
                <small style={styles.textMuted}>Non-VATable Sales:</small>
                <small style={styles.textMuted}>₱{formatNumber(nonVatableSales)}</small>
              </div>
            )}

            <div style={styles.flexBetween}>
              <span>Discount:</span>
              <span>-₱{formatNumber(discount)}</span>
            </div>

            <div style={styles.flexBetween}>
              <strong style={styles.receiptTotalsStrong}>Total Amount:</strong>
              <strong style={styles.receiptTotalsStrong}>₱{formatNumber(displayTotal)}</strong>
            </div>

            <div style={styles.flexBetween}>
              <span>Cash:</span>
              <span>₱{formatNumber(amountTendered)}</span>
            </div>

            <div style={styles.flexBetween}>
              <span>Change:</span>
              <span>₱{formatNumber(change)}</span>
            </div>
          </div>

          <hr style={styles.divider} />

          {/* Footer */}
          <div style={styles.receiptFooter}>
            <p>Thank you for your purchase!</p>
            <small>Please come again</small>
          </div>
        </div>
      </div>
    );
  }
);

Receipt.propTypes = {
  orderNumber: PropTypes.string,
  date: PropTypes.string,
  items: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      type: PropTypes.string,
      price: PropTypes.number.isRequired,
      quantity: PropTypes.number.isRequired,
      vatable: PropTypes.number,
      retail_unit_name: PropTypes.string,
      wholesale_unit_name: PropTypes.string,
    })
  ),
  subtotal: PropTypes.number,
  discount: PropTypes.number,
  total: PropTypes.number,
  amountTendered: PropTypes.number,
  change: PropTypes.number,
  customerName: PropTypes.string,
  tableNo: PropTypes.string,
  vatableSales: PropTypes.number,
  vatAmount: PropTypes.number,
  nonVatableSales: PropTypes.number,
  paperWidth: PropTypes.number, // mm
};

export default Receipt;