// emailService.js
// Uses EmailJS REST API directly via fetch — no SDK loading needed.
// This is more reliable in Vite/React apps than loading the SDK dynamically.
//
// YOUR .env file must have:
//   VITE_EMAILJS_SERVICE_ID=service_xxxxxxx
//   VITE_EMAILJS_TEMPLATE_ID=template_xxxxxxx
//   VITE_EMAILJS_PUBLIC_KEY=xxxxxxxxxxxxxxxxxxxxxx

const DIGITAL_SAMBA_LINK = "https://sarveshsurve.digitalsamba.com/demo-room";
const EMAILJS_API_URL = "https://api.emailjs.com/api/v1.0/email/send";

function getEmailConfig() {
  const serviceId  = import.meta.env.VITE_EMAILJS_SERVICE_ID  || "";
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || "";
  const publicKey  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY  || "";

  console.log("[EmailJS] Service ID:", serviceId  ? "loaded" : "MISSING");
  console.log("[EmailJS] Template ID:", templateId ? "loaded" : "MISSING");
  console.log("[EmailJS] Public Key:", publicKey  ? "loaded" : "MISSING");

  if (!serviceId || !templateId || !publicKey) {
    throw new Error("EmailJS config missing. Check your .env file.");
  }

  return { serviceId, templateId, publicKey };
}

export async function sendSelectionEmail({ name, email, role, domain, overallScore }) {
  console.log("[EmailJS] Sending to:", email);

  const { serviceId, templateId, publicKey } = getEmailConfig();

  const interviewDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString(
    "en-IN",
    { weekday: "long", year: "numeric", month: "long", day: "numeric" }
  );

  const templateParams = {
    to_name:        name,
    to_email:       email,
    name:           name,
    email:          email,
    role:           role,
    domain:         domain,
    score:          `${overallScore}%`,
    interview_link: DIGITAL_SAMBA_LINK,
    interview_date: interviewDate,
    title:          `${role} Interview`,
  };

  const body = {
    service_id:      serviceId,
    template_id:     templateId,
    user_id:         publicKey,
    template_params: templateParams,
  };

  try {
    const response = await fetch(EMAILJS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();
    console.log("[EmailJS] Status:", response.status, "| Body:", responseText);

    if (response.ok) {
      console.log("[EmailJS] Email sent successfully to", email);
      return { success: true };
    } else {
      console.error("[EmailJS] Failed:", response.status, responseText);
      return { success: false, error: `${response.status}: ${responseText}` };
    }
  } catch (err) {
    console.error("[EmailJS] Network error:", err.message);
    return { success: false, error: err.message };
  }
}