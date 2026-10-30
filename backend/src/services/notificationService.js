const axios = require('axios');
const FeatureSetting = require('../models/FeatureSetting');

/**
 * Enterprise Notification Service for Apurva Pizza Hub
 * Dispatches automated multi-channel alerts (WhatsApp / SMS) based on Admin Feature Controls
 */
class NotificationService {
  /**
   * Dispatch notification on order lifecycle events
   */
  async sendOrderNotification(order, eventType, io) {
    try {
      const settings = await FeatureSetting.getOrCreateSettings();
      const customerPhone = order.deliveryPhone || order.user?.phone || '';
      const orderShortId = String(order._id).slice(-6).toUpperCase();
      const totalAmount = order.totalAmount;
      const otpText = order.deliveryOtp ? `\n🔐 Delivery Handover PIN: *${order.deliveryOtp}*` : '';

      let messageBody = '';

      switch (eventType) {
        case 'Pending':
        case 'Placed':
          const storeBaseUrl = process.env.FRONTEND_URL || 'https://planes-willow-interaction-speeds.trycloudflare.com';
          messageBody = `🍕 *Apurva Pizza Hub* - Order Confirmed!\n\nHi ${order.user?.name || 'Valued Customer'}, your order #${orderShortId} for ₹${totalAmount} has been received! Our chefs are preparing your artisan stone-oven pizza.${otpText}\n\nTrack Live: ${storeBaseUrl}/profile`;
          break;

        case 'Preparing':
          if (!settings.whatsappAlerts.notifyOnPreparing) return;
          messageBody = `🔥 *Apurva Pizza Hub* - In the Stone Oven!\n\nOrder #${orderShortId} is now baking fresh at 400°C on our stone decks. Hot & crispy delivery coming your way soon!${otpText}`;
          break;

        case 'Out for Delivery':
          if (!settings.whatsappAlerts.notifyOnDispatched) return;
          const riderName = order.rider?.name ? `with rider *${order.rider.name}*` : 'with our delivery partner';
          const riderPhone = order.rider?.phone ? ` (${order.rider.phone})` : '';
          messageBody = `🛵 *Apurva Pizza Hub* - Out for Delivery!\n\nOrder #${orderShortId} is on the way ${riderName}${riderPhone}!${otpText}\nPlease keep cash/UPI ready upon arrival.`;
          break;

        case 'Delivered':
          if (!settings.whatsappAlerts.notifyOnDelivered) return;
          const cashbackMsg = order.cashbackAwarded > 0 ? `\n🎉 You earned ₹${order.cashbackAwarded} cashback in your Hub Wallet!` : '';
          messageBody = `✅ *Apurva Pizza Hub* - Order Delivered!\n\nOrder #${orderShortId} has been successfully delivered. Enjoy your wood-fired pizza!${cashbackMsg}\n\nThank you for choosing Apurva Pizza Hub, Pathardewa.`;
          break;

        case 'Cancelled':
          messageBody = `❌ *Apurva Pizza Hub* - Order Cancelled\n\nOrder #${orderShortId} has been cancelled. ${order.cancellationReason ? `Reason: ${order.cancellationReason}.` : ''} Any prepaid amount will be refunded within 5-7 business days.`;
          break;

        default:
          return;
      }

      // 1. WhatsApp Dispatch
      if (settings.whatsappAlerts.enabled && customerPhone) {
        await this._dispatchWhatsApp(settings.whatsappAlerts, customerPhone, messageBody);
      }

      // 2. SMS Dispatch
      if (settings.smsAlerts.enabled && customerPhone) {
        await this._dispatchSms(settings.smsAlerts, customerPhone, messageBody);
      }

      // Log notification event in real-time
      if (io) {
        io.emit('notification_dispatched', {
          orderId: order._id,
          phone: customerPhone,
          eventType,
          message: messageBody,
          timestamp: new Date().toISOString()
        });
      }

      console.log(`📡 [NotificationService] Event '${eventType}' dispatched for Order #${orderShortId} to ${customerPhone}`);
    } catch (err) {
      console.warn('[NotificationService] Notification dispatch error:', err.message);
    }
  }

  /**
   * Internal WhatsApp API dispatcher
   */
  async _dispatchWhatsApp(config, phone, message) {
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    if (!config.apiKey || !config.phoneNumberId) {
      console.log(`📱 [WhatsApp Mock Dispatch] To: +${formattedPhone}\n${message}\n(Add WhatsApp Cloud API Key in Admin Panel for real SMS/WhatsApp transmission)`);
      return;
    }

    try {
      if (config.provider === 'whatsapp_cloud_api') {
        await axios.post(
          `https://graph.facebook.com/v19.0/${config.phoneNumberId}/messages`,
          {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: formattedPhone,
            type: 'text',
            text: { preview_url: true, body: message }
          },
          {
            headers: {
              Authorization: `Bearer ${config.apiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 8000
          }
        );
      }
    } catch (apiErr) {
      console.error('[NotificationService] WhatsApp Cloud API error:', apiErr.response?.data || apiErr.message);
    }
  }

  /**
   * Internal SMS API dispatcher
   */
  async _dispatchSms(config, phone, message) {
    const cleanPhone = phone.replace(/\D/g, '');
    const tenDigitPhone = cleanPhone.slice(-10);

    if (!config.apiKey) {
      console.log(`💬 [SMS Mock Dispatch] To: +91 ${tenDigitPhone}\n${message}`);
      return;
    }

    try {
      if (config.provider === 'fast2sms') {
        await axios.post(
          'https://www.fast2sms.com/dev/bulkV2',
          {
            route: 'q',
            message: message.slice(0, 160),
            flash: 0,
            numbers: tenDigitPhone
          },
          {
            headers: {
              authorization: config.apiKey
            },
            timeout: 6000
          }
        );
      }
    } catch (smsErr) {
      console.error('[NotificationService] SMS API error:', smsErr.response?.data || smsErr.message);
    }
  }
}

module.exports = new NotificationService();
