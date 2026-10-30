const PolicySetting = require('../models/PolicySetting');
const ContactMessage = require('../models/ContactMessage');

/**
 * @desc    Get all public store policies & contact information
 * @route   GET /api/policies
 * @access  Public
 */
exports.getPublicPolicies = async (req, res, next) => {
  try {
    const policies = await PolicySetting.getOrCreatePolicy();
    return res.status(200).json({
      success: true,
      data: policies
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single policy by slug
 * @route   GET /api/policies/:slug
 * @access  Public
 */
exports.getPolicyBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const policies = await PolicySetting.getOrCreatePolicy();

    let title = '';
    let content = '';

    switch (slug.toLowerCase()) {
      case 'refund-policy':
      case 'cancellation-refund':
      case 'cancellation':
      case 'refund':
        title = 'Cancellation & Refund Policy';
        content = policies.refundPolicy;
        break;

      case 'shipping-policy':
      case 'delivery-policy':
      case 'delivery':
      case 'shipping':
        title = 'Shipping & Delivery Policy';
        content = policies.shippingPolicy;
        break;

      case 'terms-and-conditions':
      case 'terms':
      case 'terms-of-service':
        title = 'Terms & Conditions';
        content = policies.termsAndConditions;
        break;

      case 'privacy-policy':
      case 'privacy':
        title = 'Privacy Policy';
        content = policies.privacyPolicy;
        break;

      case 'about-us':
      case 'about':
        title = 'About Us';
        content = policies.aboutUs;
        break;

      case 'contact-us':
      case 'contact':
        return res.status(200).json({
          success: true,
          data: {
            title: 'Contact Us',
            contact: policies.contact,
            updatedAt: policies.updatedAt
          }
        });

      default:
        return res.status(404).json({
          success: false,
          message: `Policy page '${slug}' not found.`
        });
    }

    return res.status(200).json({
      success: true,
      data: {
        slug,
        title,
        content,
        contact: policies.contact,
        updatedAt: policies.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update store policies & contact information
 * @route   PUT /api/policies
 * @access  Private (Admin Only)
 */
exports.updatePolicies = async (req, res, next) => {
  try {
    let policy = await PolicySetting.getOrCreatePolicy();

    const {
      contact,
      refundPolicy,
      shippingPolicy,
      termsAndConditions,
      privacyPolicy,
      aboutUs
    } = req.body;

    if (contact && typeof contact === 'object') {
      policy.contact = {
        ...policy.contact.toObject(),
        ...contact
      };
    }

    if (refundPolicy !== undefined) policy.refundPolicy = refundPolicy;
    if (shippingPolicy !== undefined) policy.shippingPolicy = shippingPolicy;
    if (termsAndConditions !== undefined) policy.termsAndConditions = termsAndConditions;
    if (privacyPolicy !== undefined) policy.privacyPolicy = privacyPolicy;
    if (aboutUs !== undefined) policy.aboutUs = aboutUs;

    await policy.save();

    return res.status(200).json({
      success: true,
      message: 'Store policies and contact details updated successfully.',
      data: policy
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset policies to Razorpay-compliant standard templates
 * @route   POST /api/policies/reset
 * @access  Private (Admin Only)
 */
exports.resetPoliciesToDefault = async (req, res, next) => {
  try {
    let policy = await PolicySetting.getOrCreatePolicy();
    const defaults = PolicySetting.getDefaults();

    policy.contact = defaults.contact;
    policy.refundPolicy = defaults.refundPolicy;
    policy.shippingPolicy = defaults.shippingPolicy;
    policy.termsAndConditions = defaults.termsAndConditions;
    policy.privacyPolicy = defaults.privacyPolicy;
    policy.aboutUs = defaults.aboutUs;

    await policy.save();

    return res.status(200).json({
      success: true,
      message: 'All policies successfully reset to Razorpay-compliant standard templates.',
      data: policy
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Submit customer enquiry/message from Contact Us page
 * @route   POST /api/policies/contact
 * @access  Public
 */
exports.submitContactMessage = async (req, res, next) => {
  try {
    const { name, phone, email, subject, message } = req.body;

    if (!name || !phone || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, phone number, and message are required.'
      });
    }

    const newContact = await ContactMessage.create({
      name: name.trim(),
      phone: phone.trim(),
      email: email ? email.trim() : '',
      subject: subject ? subject.trim() : 'General Inquiry',
      message: message.trim(),
      status: 'Pending'
    });

    console.log(`📩 [CONTACT US] New inquiry #${newContact._id} from ${name} (${phone}): ${subject || 'General'}`);

    return res.status(201).json({
      success: true,
      message: 'Thank you! Your message has been received. Our team will contact you shortly.',
      data: newContact
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all customer inquiries
 * @route   GET /api/policies/contact/messages
 * @access  Private (Admin Only)
 */
exports.getContactMessages = async (req, res, next) => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      count: messages.length,
      data: messages
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reply / Resolve customer inquiry
 * @route   PUT /api/policies/contact/messages/:id/reply
 * @access  Private (Admin Only)
 */
exports.replyContactMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { responseText, status = 'Resolved' } = req.body;

    if (!responseText || !responseText.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Response text is required.'
      });
    }

    const contactMsg = await ContactMessage.findById(id);
    if (!contactMsg) {
      return res.status(404).json({
        success: false,
        message: 'Customer message not found.'
      });
    }

    contactMsg.adminResponse = responseText.trim();
    contactMsg.status = status;
    contactMsg.respondedAt = new Date();
    contactMsg.respondedBy = req.user?.name || req.user?.role || 'Admin Management';

    await contactMsg.save();

    return res.status(200).json({
      success: true,
      message: 'Response recorded successfully.',
      data: contactMsg
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a customer inquiry
 * @route   DELETE /api/policies/contact/messages/:id
 * @access  Private (Admin Only)
 */
exports.deleteContactMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const contactMsg = await ContactMessage.findByIdAndDelete(id);
    if (!contactMsg) {
      return res.status(404).json({
        success: false,
        message: 'Customer message not found.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Customer message deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};
