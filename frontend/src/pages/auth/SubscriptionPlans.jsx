import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Check, Loader2, CreditCard, ShieldCheck, Zap, Star, LayoutDashboard, ChevronRight, ArrowLeft } from 'lucide-react'
import { getAvailablePlans, subscribeToPlan, createRazorpayOrder, verifyRazorpayPayment } from '../../api/planApi'
import { useAuth } from '../../context/AuthContext'
import logo from '../../assets/trans-logo.png'
import { usePageTranslation } from '../../hooks/usePageTranslation'
import TranslatedText from '../../components/TranslatedText'

export default function SubscriptionPlans() {
  const { getTranslatedText } = usePageTranslation([
    'Fetching best plans for you...', 'Choose a Plan',
    'Pick a professional subscription to power your business workflow.',
    'Yearly Plans', 'Subscribe Now', 'Failed to create order',
    'Razorpay SDK failed to load. Are you online?', 'Payment verification failed',
    'Something went wrong with the payment process', 'mo', 'yr', 'GST', 'Skip for now',
    'Available Plans', 'Inclusive of all taxes', 'Active Plan', 'Days', 'Months', 'Years'
  ])
  const { user, login, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(null) // planId
  const [activeTab, setActiveTab] = useState('Yearly')

  useEffect(() => {
    const fetchPlans = async () => {
      if (!user?.role) return
      setLoading(true)
      const res = await getAvailablePlans({ target: user.role })
      if (res.success) {
        setPlans(res.plans)
      }
      setLoading(false)
    }
    fetchPlans()
  }, [user?.role])

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleSubscribe = async (plan) => {
    setSubmitting(plan._id);

    try {
      // 1. Create Order in Backend
      const orderRes = await createRazorpayOrder({ planId: plan._id });
      if (!orderRes.success) {
        alert(orderRes.message || getTranslatedText("Failed to create order"));
        setSubmitting(null);
        return;
      }

      // 2. Load Razorpay Script
      const isLoaded = await loadRazorpay();
      if (!isLoaded) {
        alert(getTranslatedText("Razorpay SDK failed to load. Are you online?"));
        setSubmitting(null);
        return;
      }

      // 3. Open Razorpay Checkout
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_8sYbzHWidwe5Zw",
        amount: orderRes.amount,
        currency: orderRes.currency,
        name: "TRANS Hub",
        description: `Subscription: ${orderRes.planName}`,
        image: logo,
        order_id: orderRes.orderId,
        handler: async (response) => {
          setSubmitting(plan._id); // keep loading
          
          // 4. Verify Payment in Backend
          const verifyRes = await verifyRazorpayPayment({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            planId: plan._id
          });

          if (verifyRes.success) {
            await login(verifyRes.user, verifyRes.accessToken);
            if (sessionStorage.getItem('unsaved_transport_bill')) {
              navigate('/transport/bills/new', { replace: true });
            } else if (sessionStorage.getItem('unsaved_garage_bill')) {
              navigate('/garage/bills/new', { replace: true });
            } else {
              navigate('/dashboard', { replace: true });
            }
          } else {
            alert(verifyRes.message || getTranslatedText("Payment verification failed"));
            setSubmitting(null);
          }
        },
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
          contact: user?.phone || ""
        },
        theme: {
          color: "#7C3AED",
        },
        modal: {
          ondismiss: () => setSubmitting(null)
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (e) {
      console.error("Subscription Flow Error:", e);
      alert(getTranslatedText("Something went wrong with the payment process"));
      setSubmitting(null);
    }
  };

  const filteredPlans = plans

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
        <Loader2 size={32} className="spin" color="var(--primary)" />
        <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748B' }}>{getTranslatedText('Fetching best plans for you...')}</p>
      </div>
    )
  }

  return (
    <div className="animate-fadeIn" style={{ maxWidth: 940, margin: '0 auto', paddingBottom: 60, position: 'relative' }}>
      {/* Back Button */}
      <button 
        id="btn-back-subscription"
        onClick={async () => {
          if (location.state?.fromBill || location.state?.fromProfile) {
            navigate(-1)
          } else {
            // No forced logout — user can go back to dashboard without subscribing
            navigate('/dashboard', { replace: true })
          }
        }}
        style={{
          position: 'absolute', left: 16, top: 0, width: 40, height: 40,
          borderRadius: 12, background: 'white', border: '1px solid #F1F5F9',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          zIndex: 99, color: '#64748B'
        }}
        onMouseEnter={e => {
          e.currentTarget.style.color = '#7C3AED'
          e.currentTarget.style.borderColor = '#EDE9FE'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.color = '#64748B'
          e.currentTarget.style.borderColor = '#F1F5F9'
        }}
      >
        <ArrowLeft size={20} strokeWidth={2.5} />
      </button>

      {/* Header */}
      <div className="mb-6 sm:mb-10" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ 
          width: 50, height: 50, borderRadius: 16, background: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.06)'
        }}>
          <img src={logo} alt="Logo" style={{ width: '70%', height: '70%', objectFit: 'contain' }} />
        </div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0F172A', marginBottom: 8, letterSpacing: '-0.03em' }}>
          {getTranslatedText('Choose a Plan')}
        </h2>
        <p className="text-sm sm:text-base" style={{ color: '#64748B', fontWeight: 500, maxWidth: 480, margin: '0 auto' }}>
          {getTranslatedText('Pick a professional subscription to power your business workflow.')}
        </p>

        {/* Removed tab switcher to only show yearly plans */}
        <div style={{ marginTop: 24, marginBottom: 12 }}>
          <span className="badge badge-success" style={{ padding: '8px 20px', fontSize: '0.85rem', fontWeight: 800, borderRadius: 12 }}>
            {getTranslatedText('Available Plans')} — 
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 px-4 mt-8 sm:mt-12">
        {filteredPlans.map((plan, idx) => {
          const isPro = plan.name.toLowerCase().includes('pro');
          const total = Number(plan.price) || 0
          const isActivePlan = user?.planId === plan._id && new Date(user?.subscriptionExpiry) > new Date();

          return (
            <div key={plan._id} 
              className={`relative overflow-hidden transition-all duration-200 ${submitting === plan._id ? 'scale-[0.98]' : ''} px-5 pt-5 pb-5 sm:px-8 sm:py-7 flex flex-col items-center text-center`}
              style={{ 
                background: 'white', borderRadius: 20, border: isPro ? '2px solid #7C3AED' : '1.5px solid #CBD5E1',
                boxShadow: isPro ? '0 15px 30px rgba(124, 58, 237, 0.06)' : '0 8px 20px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, marginBottom: 8 }}>
                 <div style={{ width: 26, height: 26, borderRadius: 6, background: isPro ? '#F5F3FF' : '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isPro ? '#7C3AED' : '#64748B' }}>
                   {isPro ? <Zap size={14} fill="#7C3AED" /> : <Star size={14} />}
                 </div>
                 <h3 style={{ fontSize: '0.9375rem', fontWeight: 900, color: '#1E293B', margin: 0 }}><TranslatedText>{plan.name}</TranslatedText></h3>
              </div>
              <div style={{ marginBottom: 10 }}>
                 <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4 }}>
                    <span className="text-lg sm:text-xl" style={{ fontWeight: 900, color: '#0F172A' }}>₹{total}</span>
                   <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>/ {plan.durationValue || 1} {getTranslatedText(plan.durationType || plan.interval || 'yr')}</span>
                 </div>
                 <div style={{ fontSize: '0.62rem', color: '#64748B', fontWeight: 650, marginTop: 2 }}>
                    {getTranslatedText('Inclusive of all taxes')}
                 </div>
              </div>
              <button 
                onClick={() => isActivePlan ? null : handleSubscribe(plan)} 
                disabled={!!submitting || isActivePlan} 
                className="w-full flex items-center justify-center gap-2 transition-all duration-200 mt-2"
                style={{ 
                  height: 44,
                  border: 'none', 
                  borderRadius: '24px',
                  background: isActivePlan ? '#10B981' : '#8B5CF6', 
                  color: 'white', 
                  fontSize: '0.875rem', fontWeight: 800, cursor: (submitting || isActivePlan) ? 'not-allowed' : 'pointer', 
                }}
              >
                {submitting === plan._id ? <Loader2 size={18} className="spin" /> : 
                 isActivePlan ? getTranslatedText('Active Plan') : getTranslatedText('Subscribe Now')}
              </button>
            </div>
          )
        })}
      </div>
      {/* During signup, let the user continue to the app without subscribing */}
      {!location.state?.fromBill && !location.state?.fromProfile && (
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button
            type="button"
            onClick={() => navigate('/dashboard', { replace: true })}
            style={{ background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: 16, padding: '12px 28px', fontSize: '0.875rem', fontWeight: 800, cursor: 'pointer' }}
          >
            {getTranslatedText('Skip for now')}
          </button>
        </div>
      )}
      <style>{`.spin { animation: spin 0.8s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
