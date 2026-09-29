const axios = require("axios");

/**
 * SMSIndiaHub Service
 * Documentation: https://www.smsindiahub.in/sms-api/
 */

async function sendSms(phone, message, options = {}) {
  const apiKey = process.env.SMSINDIAHUB_API_KEY;
  const senderId = options.senderId || process.env.SMSINDIAHUB_SENDER_ID || "SMSHUB";

  if (!apiKey) {
    console.log("------------------------------------------");
    console.log(`[MOCK SMS] To: ${phone}`);
    console.log(`[MOCK SMS] Msg: ${message}`);
    console.log("------------------------------------------");
    return { success: true, message: "Mock SMS sent" };
  }

  try {
    const msisdn = phone.length === 10 ? `91${phone}` : phone;
    let url = `http://cloud.smsindiahub.in/vendorsms/pushsms.aspx?APIKey=${apiKey}&msisdn=${msisdn}&sid=${senderId}&msg=${encodeURIComponent(message)}&fl=0&gwid=2`;
    
    if (options.peid) url += `&peid=${options.peid}`;
    if (options.templateId) url += `&templateid=${options.templateId}`;
    
    // Never log or return `url`: it contains the API key and the message (OTP)
    const response = await axios.get(url);
    return { success: true, response: response.data };
  } catch (error) {
    console.error(`[SMS SERVICE ERROR] Request Failed! Error: ${error.message}`);
    if (error.response) {
      console.error(`[SMS SERVICE ERROR] Response Data:`, error.response.data);
      console.error(`[SMS SERVICE ERROR] Response Status:`, error.response.status);
    }
    return { success: false, error: error.message };
  }
}

async function sendOtpSms(phone, otp) {
  const message = `Welcome to the trans powered by Appzeto. Your OTP for registration is ${otp}.BGADEC`;
  
  return sendSms(phone, message, {
    senderId: "BGADEC",
    peid: "1001164203633432409",
    templateId: "1007282516644508833"
  });
}

module.exports = { sendSms, sendOtpSms };
