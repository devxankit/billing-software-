const SoftwarePlan = require("../models/SoftwarePlan");
const SoftwareSale = require("../models/SoftwareSale");
const User = require("../models/User");
const tokenService = require("../services/token.service");
const authController = require("./auth.controller");
const razorpayUtil = require("../utils/razorpay.util");


async function getAvailablePlans(req, res, next) {
  try {
    const { target } = req.query; // e.g., 'transport' or 'garage'
    const query = { isActive: true };
    if (target) query.target = target;
    
    const plans = await SoftwarePlan.find(query).sort({ price: 1 });
    return res.json({ success: true, plans });
  } catch (e) {
    next(e);
  }
}

async function subscribeToPlan(req, res, next) {
  try {
    const { planId, paymentMode } = req.body;
    const plan = await SoftwarePlan.findById(planId);
    if (!plan) return res.status(404).json({ success: false, message: "Plan not found" });

    // Paid plans must go through Razorpay (create-order → verify-payment)
    if ((Number(plan.price) || 0) > 0) {
      return res.status(402).json({ success: false, message: "Payment required for this plan" });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // A free plan can be claimed only once per account
    const alreadyClaimed = await SoftwareSale.exists({ owner: user._id, planName: plan.name, totalAmount: 0 });
    if (alreadyClaimed) {
      return res.status(409).json({ success: false, message: "This free plan has already been used on your account" });
    }

    let start = new Date();
    if (user.subscriptionActive && user.subscriptionExpiry && new Date(user.subscriptionExpiry) > start) {
      start = new Date(user.subscriptionExpiry);
    }
    const expiryDate = new Date(start);
    if (plan.durationType === 'Days') {
      expiryDate.setDate(expiryDate.getDate() + (plan.durationValue || 1));
    } else if (plan.durationType === 'Months') {
      expiryDate.setMonth(expiryDate.getMonth() + (plan.durationValue || 1));
    } else if (plan.durationType === 'Years') {
      expiryDate.setFullYear(expiryDate.getFullYear() + (plan.durationValue || 1));
    } else {
      if (plan.interval === "Monthly") {
        expiryDate.setMonth(expiryDate.getMonth() + 1);
      } else {
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      }
    }

    const total = Number(plan.price) || 0;

    const sale = await SoftwareSale.create({
      owner: user._id, 
      transporter: user._id,
      planName: plan.name,
      totalAmount: total,
      amountPaid: total,
      status: "paid",
      purchaseDate: new Date(),
      expiryDate,
      paymentHistory: [{
        amount: total,
        mode: paymentMode || "upi",
        transactionId: `FREE_${user._id}_${Date.now()}`
      }]
    });

    user.subscriptionActive = true;
    user.subscriptionExpiry = expiryDate;
    user.allowedVehicles = 0; // Unlimited as requested
    user.planId = plan._id;
    await user.save();

    const referralService = require("../services/referral.service");
    await referralService.processReferralReward(user._id);

    const accessToken = tokenService.signAccessToken(user);

    return res.json({ 
      success: true, 
      message: "Subscription successful", 
      subscriptionExpiry: expiryDate,
      accessToken,
      user: authController.userDto({ ...user.toObject(), planId: plan })
    });
  } catch (e) {
    next(e);
  }
}

async function createOrder(req, res, next) {
  try {
    const { planId } = req.body;
    const plan = await SoftwarePlan.findById(planId);
    if (!plan) return res.status(404).json({ success: false, message: "Plan not found" });

    const total = Number(plan.price) || 0;

    let order;
    try {
      order = await razorpayUtil.createRazorpayOrder(total, `receipt_${Date.now()}`, {
        planId: String(plan._id),
        userId: String(req.user.id),
      });
    } catch (rzpErr) {
      console.error("Razorpay Error Details:", rzpErr);
      return res.status(500).json({ 
        success: false, 
        message: "Failed to connect to Razorpay. Please check if RAZORPAY_KEY_ID and SECRET are correct in .env" 
      });
    }
    
    return res.json({ 
      success: true, 
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      planName: plan.name
    });
  } catch (e) {
    next(e);
  }
}

async function verifyPayment(req, res, next) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId } = req.body;

    const isValid = razorpayUtil.verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      return res.status(400).json({ success: false, message: "Invalid payment signature" });
    }

    const plan = await SoftwarePlan.findById(planId);
    if (!plan) return res.status(404).json({ success: false, message: "Plan not found" });

    // The signed order must have been created for this user, this plan and this plan's price
    let order;
    try {
      order = await razorpayUtil.fetchRazorpayOrder(razorpay_order_id);
    } catch (fetchErr) {
      console.error("Razorpay order fetch failed:", fetchErr);
      return res.status(502).json({ success: false, message: "Could not confirm payment with Razorpay. Please contact support." });
    }
    const expectedPaise = Math.round((Number(plan.price) || 0) * 100);
    if (
      order?.notes?.planId !== String(plan._id) ||
      order?.notes?.userId !== String(req.user.id) ||
      Number(order?.amount) !== expectedPaise
    ) {
      return res.status(400).json({ success: false, message: "Payment does not match the selected plan" });
    }

    // Each payment can activate a subscription only once
    const alreadyUsed = await SoftwareSale.exists({ "paymentHistory.transactionId": razorpay_payment_id });
    if (alreadyUsed) {
      return res.status(409).json({ success: false, message: "This payment has already been applied" });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    let start = new Date();
    if (user.subscriptionActive && user.subscriptionExpiry && new Date(user.subscriptionExpiry) > start) {
      start = new Date(user.subscriptionExpiry);
    }
    const expiryDate = new Date(start);
    if (plan.durationType === 'Days') {
      expiryDate.setDate(expiryDate.getDate() + (plan.durationValue || 1));
    } else if (plan.durationType === 'Months') {
      expiryDate.setMonth(expiryDate.getMonth() + (plan.durationValue || 1));
    } else if (plan.durationType === 'Years') {
      expiryDate.setFullYear(expiryDate.getFullYear() + (plan.durationValue || 1));
    } else {
      if (plan.interval === "Monthly") {
        expiryDate.setMonth(expiryDate.getMonth() + 1);
      } else {
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      }
    }

    const total = Number(plan.price) || 0;

    const sale = await SoftwareSale.create({
      owner: user._id,
      transporter: user._id,
      planName: plan.name,
      totalAmount: total,
      amountPaid: total,
      status: "paid",
      purchaseDate: new Date(),
      expiryDate,
      paymentHistory: [{
        amount: total,
        mode: "razorpay",
        transactionId: razorpay_payment_id
      }]
    });

    user.subscriptionActive = true;
    user.subscriptionExpiry = expiryDate;
    user.allowedVehicles = 0; // Unlimited as requested
    user.planId = plan._id;
    await user.save();

    const referralService = require("../services/referral.service");
    await referralService.processReferralReward(user._id);

    const accessToken = tokenService.signAccessToken(user);

    return res.json({ 
      success: true, 
      message: "Subscription successful", 
      subscriptionExpiry: expiryDate,
      accessToken,
      user: authController.userDto({ ...user.toObject(), planId: plan })
    });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  getAvailablePlans,
  subscribeToPlan,
  createOrder,
  verifyPayment
};
