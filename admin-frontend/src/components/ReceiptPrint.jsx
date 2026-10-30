import React from 'react';
import { Printer, X } from 'lucide-react';

/**
 * 80mm Thermal Receipt Component
 * Formatted specifically for standard 80mm POS Thermal Printers.
 * Automatically hidden on normal screen viewing and styled exclusively for @media print.
 */
const ReceiptPrint = ({ order, onClose }) => {
  if (!order) return null;

  const formattedDate = new Date(order.createdAt || Date.now()).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const formattedTime = new Date(order.createdAt || Date.now()).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const orderId = order._id ? order._id.toString().slice(-6).toUpperCase() : 'UNKNOWN';

  // Calculate items subtotal
  const subtotal = (order.items || []).reduce(
    (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1),
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 print:p-0 print:static print:bg-transparent print:inset-auto">
      {/* Interactive modal preview on screen */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl print:hidden">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2 text-orange-400">
            <Printer className="w-5 h-5" />
            <h3 className="font-bold text-white text-base">Thermal Receipt Preview (80mm)</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="my-5 p-4 bg-white text-black font-mono text-xs rounded-xl shadow-inner max-h-[60vh] overflow-y-auto leading-tight">
          <div className="text-center font-bold text-sm tracking-wide">APURVA PIZZA HUB</div>
          <div className="text-center text-[10px] text-gray-700">Main Road Pathardewa, Deoria (UP)</div>
          <div className="text-center text-[10px] text-gray-700">Tel: +91 98765 43210</div>
          <div className="text-center text-[10px] text-gray-600 border-b border-dashed border-gray-400 pb-2 mb-2">
            GSTIN: 09AAECP1234F1Z8
          </div>

          <div className="flex justify-between font-bold">
            <span>ORDER: #{orderId}</span>
            <span>{order.status?.toUpperCase()}</span>
          </div>
          <div className="flex justify-between text-[10px] text-gray-600 mb-2">
            <span>{formattedDate}</span>
            <span>{formattedTime}</span>
          </div>

          <div className="border-t border-b border-dashed border-gray-400 py-1.5 my-2">
            <div className="font-semibold text-xs">Customer: {order.user?.name || 'Customer'}</div>
            {/* Prominent Delivery Boy Calling Box */}
            <div className="bg-black text-white p-2 rounded-md font-bold text-xs my-1.5 flex justify-between items-center tracking-wide">
              <span>📞 CALL FOR DELIVERY:</span>
              <span className="font-mono text-sm">{order.deliveryPhone || order.contactNumber || 'Not provided'}</span>
            </div>
            {order.deliveryAddress && (
              <div className="text-[11px] leading-snug mt-1"><strong>Address:</strong> {order.deliveryAddress}</div>
            )}
            {order.deliveryDistance !== undefined && order.deliveryDistance !== null && (
              <div className="text-[10px] text-gray-700 mt-1 pt-1 border-t border-dotted border-gray-300 flex justify-between">
                <span>📍 Distance: {order.deliveryDistance} km {order.deliveryLocationName ? `(${order.deliveryLocationName})` : ''}</span>
                <span className="font-bold text-black">{Number(order.deliveryFee) === 0 ? 'FREE DELIVERY (<5km)' : `Delivery Fee: ₹${order.deliveryFee}`}</span>
              </div>
            )}
            {order.customerCoords?.latitude && order.customerCoords?.longitude && (
              <div className="text-[9px] text-gray-600 mt-0.5 font-mono">
                🛰️ GPS: {order.customerCoords.latitude.toFixed(4)}, {order.customerCoords.longitude.toFixed(4)}
              </div>
            )}
          </div>

          {/* Kitchen Note Alert */}
          {order.customerNote && (
            <div className="bg-red-50 border border-red-500 text-red-700 p-1.5 rounded my-2 text-[11px] font-bold">
              KITCHEN NOTE: {order.customerNote}
            </div>
          )}

          {/* Items Header */}
          <div className="flex justify-between font-bold text-[11px] border-b border-gray-300 pb-1 mb-1">
            <span className="w-1/2">Item</span>
            <span className="w-1/6 text-center">Qty</span>
            <span className="w-1/6 text-right">Price</span>
            <span className="w-1/6 text-right">Total</span>
          </div>

          {/* Items List */}
          <div className="space-y-1.5 my-2">
            {(order.items || []).map((item, idx) => {
              const itemTotal = (Number(item.price) || 0) * (Number(item.quantity) || 1);
              return (
                <div key={idx} className="border-b border-dotted border-gray-200 pb-1">
                  <div className="flex justify-between">
                    <span className="w-1/2 font-semibold truncate">{item.name}</span>
                    <span className="w-1/6 text-center">{item.quantity}</span>
                    <span className="w-1/6 text-right">₹{item.price}</span>
                    <span className="w-1/6 text-right font-semibold">₹{itemTotal}</span>
                  </div>
                  {item.size && (
                    <div className="text-[9px] text-gray-600">Size: {item.size}</div>
                  )}
                  {item.toppings && item.toppings.length > 0 && (
                    <div className="text-[9px] text-gray-600 italic">
                      + {item.toppings.join(', ')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Financial Breakdown */}
          <div className="border-t border-dashed border-gray-400 pt-2 space-y-1 text-right">
            <div className="flex justify-between">
              <span>Items Subtotal:</span>
              <span>₹{Number(order.itemsAmount || subtotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery Fee ({order.deliveryDistance ? `${order.deliveryDistance}km` : 'Standard'}):</span>
              <span className="font-semibold">{Number(order.deliveryFee) > 0 ? `₹${Number(order.deliveryFee).toFixed(2)}` : 'FREE (₹0.00)'}</span>
            </div>
            {Number(order.platformFee || 0) > 0 && (
              <div className="flex justify-between">
                <span>Platform Fee:</span>
                <span className="font-semibold">₹{Number(order.platformFee).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-sm border-t border-black pt-1">
              <span>GRAND TOTAL:</span>
              <span>₹{Number(order.totalAmount || subtotal).toFixed(2)}</span>
            </div>
          </div>

          {/* Prominent Payment Box for Delivery Staff & Cashier */}
          <div className={`p-2.5 rounded-lg border-2 my-3 text-center font-bold ${
            order.paymentStatus === 'paid'
              ? 'border-gray-800 bg-gray-100 text-black'
              : 'border-black bg-black text-white'
          }`}>
            <div className="text-xs tracking-wider uppercase">
              {order.paymentStatus === 'paid'
                ? `✓ PREPAID (${(order.paymentMethod || 'ONLINE').toUpperCase()}) - DO NOT COLLECT CASH`
                : `⚠ CASH ON DELIVERY - COLLECT ₹${Number(order.totalAmount || subtotal).toFixed(2)}`}
            </div>
          </div>

          <div className="text-center text-[10px] text-gray-600 mt-4 border-t border-dashed border-gray-300 pt-2">
            *** THANK YOU FOR YOUR ORDER ***<br />
            Visit Again • Apurva Pizza Hub
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 flex items-center space-x-2 shadow-lg shadow-orange-500/25 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print 80mm Receipt</span>
          </button>
        </div>
      </div>

      {/* Actual Pure Printable DOM element (rendered for window.print() only) */}
      <div id="printable-receipt-area" className="hidden print:block font-mono text-black">
        <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '14px', marginBottom: '2px' }}>
          APURVA PIZZA HUB
        </div>
        <div style={{ textAlign: 'center', fontSize: '9px' }}>Main Road Pathardewa, Deoria (UP)</div>
        <div style={{ textAlign: 'center', fontSize: '9px' }}>Tel: +91 98765 43210</div>
        <div style={{ textAlign: 'center', fontSize: '9px', borderBottom: '1px dashed #000', paddingBottom: '4px', marginBottom: '4px' }}>
          GSTIN: 09AAECP1234F1Z8
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '11px' }}>
          <span>ORD #{orderId}</span>
          <span>{order.status?.toUpperCase()}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', marginBottom: '4px' }}>
          <span>{formattedDate}</span>
          <span>{formattedTime}</span>
        </div>

        <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '4px 0', margin: '4px 0', fontSize: '10px' }}>
          <div><strong>Customer:</strong> {order.user?.name || 'Walk-in Customer'}</div>
          {/* Prominent Delivery Boy Calling Box for Thermal Print */}
          <div style={{ border: '2px solid #000', padding: '3px 4px', margin: '4px 0', fontWeight: 'bold', fontSize: '12px', textAlign: 'center' }}>
            📞 DELIVERY CALL: {order.deliveryPhone || order.contactNumber || 'Not provided'}
          </div>
          {order.deliveryAddress && <div><strong>Address:</strong> {order.deliveryAddress}</div>}
          {order.deliveryDistance !== undefined && order.deliveryDistance !== null && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px', borderTop: '1px dotted #ccc', paddingTop: '2px', fontSize: '9px' }}>
              <span>📍 Dist: {order.deliveryDistance} km {order.deliveryLocationName ? `(${order.deliveryLocationName})` : ''}</span>
              <span style={{ fontWeight: 'bold' }}>{Number(order.deliveryFee) === 0 ? 'FREE DELIVERY (<5KM)' : `Delivery Fee: ₹${order.deliveryFee}`}</span>
            </div>
          )}
          {order.customerCoords?.latitude && order.customerCoords?.longitude && (
            <div style={{ fontSize: '8px', color: '#333', marginTop: '2px', fontFamily: 'monospace' }}>
              GPS: {order.customerCoords.latitude.toFixed(4)}, {order.customerCoords.longitude.toFixed(4)}
            </div>
          )}
        </div>

        {order.customerNote && (
          <div style={{ border: '2px solid #000', padding: '3px', fontWeight: 'bold', fontSize: '10px', margin: '4px 0' }}>
            *** NOTE: {order.customerNote} ***
          </div>
        )}

        {/* Items Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', margin: '4px 0' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #000', textAlign: 'left' }}>
              <th style={{ width: '50%' }}>Item</th>
              <th style={{ width: '15%', textAlign: 'center' }}>Qty</th>
              <th style={{ width: '15%', textAlign: 'right' }}>Price</th>
              <th style={{ width: '20%', textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {(order.items || []).map((item, i) => {
              const itemTotal = (Number(item.price) || 0) * (Number(item.quantity) || 1);
              return (
                <tr key={i} style={{ borderBottom: '1px dotted #ccc' }}>
                  <td style={{ padding: '2px 0' }}>
                    <div style={{ fontWeight: 'bold' }}>{item.name}</div>
                    {item.size && <div style={{ fontSize: '8px' }}>({item.size})</div>}
                    {item.toppings && item.toppings.length > 0 && (
                      <div style={{ fontSize: '8px' }}>+ {item.toppings.join(', ')}</div>
                    )}
                  </td>
                  <td style={{ textAlign: 'center', verticalAlign: 'top', padding: '2px 0' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right', verticalAlign: 'top', padding: '2px 0' }}>₹{item.price}</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold', verticalAlign: 'top', padding: '2px 0' }}>₹{itemTotal}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Total Calculations */}
        <div style={{ borderTop: '1px dashed #000', paddingTop: '4px', textAlign: 'right', fontSize: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Items Subtotal:</span>
            <span>₹{Number(order.itemsAmount || subtotal).toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Delivery Fee:</span>
            <span>{Number(order.deliveryFee) > 0 ? `₹${Number(order.deliveryFee).toFixed(2)}` : 'FREE'}</span>
          </div>
          {Number(order.platformFee || 0) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Platform Fee:</span>
              <span>₹{Number(order.platformFee).toFixed(2)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '12px', borderTop: '1px solid #000', marginTop: '2px', paddingTop: '2px' }}>
            <span>TOTAL AMOUNT:</span>
            <span>₹{Number(order.totalAmount || subtotal).toFixed(2)}</span>
          </div>
        </div>

        {/* High-Contrast Payment Block for Physical Thermal Paper */}
        <div style={{
          border: '2px solid #000',
          padding: '4px',
          margin: '6px 0',
          textAlign: 'center',
          fontWeight: 'bold',
          fontSize: '11px',
          background: order.paymentStatus === 'paid' ? '#fff' : '#000',
          color: order.paymentStatus === 'paid' ? '#000' : '#fff'
        }}>
          <div>
            {order.paymentStatus === 'paid'
              ? `*** PREPAID (${(order.paymentMethod || 'ONLINE').toUpperCase()}) - DO NOT COLLECT CASH ***`
              : `*** COLLECT CASH: ₹${Number(order.totalAmount || subtotal).toFixed(2)} ***`}
          </div>
        </div>

        <div style={{ textAlign: 'center', fontSize: '9px', marginTop: '8px', borderTop: '1px dashed #000', paddingTop: '4px' }}>
          THANK YOU FOR VISITING APURVA PIZZA HUB!<br />
          Fresh • Delicious • Made with Love
        </div>
      </div>
    </div>
  );
};

export default ReceiptPrint;
