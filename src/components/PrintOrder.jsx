import React, { forwardRef } from "react";
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
    },
    ref
  ) => {
    const displaySubtotal = subtotal;
    const displayTotal = total;
    const hasVatItems = vatableSales > 0;
    const hasNonVatItems = nonVatableSales > 0;

    const styles = {
      receiptContainer: {
        fontFamily: "'Courier New', monospace",
        fontSize: "12px",
        lineHeight: 1.2,
        color: "#000",
        background: "#fff",
        margin: 0,
        padding: "4mm 3mm",
        boxSizing: "border-box",
        width: "auto",
        minWidth: "70mm",
        maxWidth: "100mm",
        minHeight: "auto",
        overflow: "hidden",
      },
      receipt: {
        width: "100%",
        boxSizing: "border-box",
      },
      receiptHeader: { 
        textAlign: "center", 
        marginBottom: "4px",      
        paddingBottom: "2px",
        borderBottom: "1px dashed #000"
      },
      receiptTitle: { 
        fontSize: "16px",
        fontWeight: "bold", 
        margin: "0 0 2px 0",
        textTransform: "uppercase",
        letterSpacing: "0.5px"
      },
      receiptAddress: { 
        fontSize: "10px", 
        margin: "0 0 1px 0",
        lineHeight: 1.1
      },
      receiptContact: { 
        fontSize: "10px", 
        margin: 0,
        lineHeight: 1.1
      },
      divider: { 
        border: "none", 
        borderTop: "1px dashed #000", 
        margin: "4px 0" 
      },
      receiptItemName: { 
        fontSize: "11px",
        fontWeight: "normal",
        lineHeight: 1.1
      },
      receiptItemPrice: { 
        fontSize: "11px",
        fontWeight: "normal",
        lineHeight: 1.1
      },
      textMuted: { 
        color: "#201f1fff", 
        fontSize: "10px", 
        fontWeight: "bold",
        lineHeight: 1.1
      },
      receiptTotalsStrong: { 
        fontSize: "12px", 
        fontWeight: "bold",
        lineHeight: 1.1
      },
      receiptFooter: { 
        textAlign: "center", 
        marginTop: "6px", 
        fontSize: "10px", 
        paddingTop: "2px",
        borderTop: "1px dashed #000",
        lineHeight: 1.1
      },
      flexBetween: { 
        display: "flex", 
        justifyContent: "space-between",
        alignItems: "flex-start",
        margin: "2px 0"
      },
    };

    return (
      <div ref={ref} style={styles.receiptContainer} className="receipt-container">
        {/* Embedded print styles - UNIVERSAL FOR ANY PRINTER */}
        <style>
            {`
              @media print {
                @page {
                  size: auto;
                  margin: 0 !important;
                }
                body, html {
                  width: auto !important;
                  height: auto !important;
                  margin: 0 !important;
                  padding: 0 !important;
                }
                body * {
                  visibility: hidden;
                }
                .receipt-container, .receipt-container * {
                  visibility: visible;
                }
                .receipt-container {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: auto !important;
                  margin: 0 !important;
                  padding: 4mm 3mm !important;
                  box-shadow: none !important;
                  page-break-after: avoid;
                  page-break-inside: avoid;
                }
              }
              @media screen {
                .receipt-container {
                  margin: 20px auto;
                  box-shadow: 0 0 10px rgba(0,0,0,0.1);
                }
              }
            `}
        </style>

        <div style={styles.receipt}>
          {/* Header */}
          <div style={styles.receiptHeader}>
            <h4 style={styles.receiptTitle}>KERR IT SOLUTIONS</h4>
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
              <span>John Paul Bibay</span>
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
                <div key={index} style={{ marginBottom: "3px" }}>
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
                {/* <div style={styles.flexBetween}>
                  <small style={styles.textMuted}>VAT (12%):</small>
                  <small style={styles.textMuted}>₱{formatNumber(vatAmount)}</small>
                </div> */}
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
};

export default Receipt;