(() => {
  'use strict';
  const heading=document.querySelector('#payment-heading');
  const status=document.querySelector('#payment-status');
  const retry=document.querySelector('#payment-retry');
  const sessionId=new URLSearchParams(location.search).get('session_id');
  async function verify() {
    retry.hidden=true;
    heading.textContent='Checking payment';
    status.textContent='Please wait while we confirm your payment with Stripe.';
    if(!/^cs_(live|test)_[A-Za-z0-9]+$/.test(sessionId || '')) {
      heading.textContent='Payment reference unavailable';
      status.textContent='We cannot confirm a payment from this link. Contact the store if you have already paid.';
      return;
    }
    try {
      const response=await fetch(`/api/checkout?session_id=${encodeURIComponent(sessionId)}`,{cache:'no-store',signal:AbortSignal.timeout(25000)});
      const result=await response.json();
      if(!response.ok)throw new Error();
      const pending=!result.paid && result.status==='complete';
      heading.textContent=result.paid?'Payment confirmed':pending?'Payment pending':'Payment not confirmed';
      status.textContent=result.paid
        ? 'Thank you. Stripe has confirmed your payment. Keep your payment receipt for reference.'
        : pending
          ? 'Your payment is awaiting confirmation. Check again or contact the store before paying again.'
          : 'Your payment has not been confirmed yet. Check again or contact the store before making another payment.';
      retry.hidden=result.paid;
    } catch {
      heading.textContent='Unable to verify payment';
      status.textContent='We could not check your payment right now. Try again or contact the store before making another payment.';
      retry.hidden=false;
    }
  }
  retry.addEventListener('click',verify);
  verify();
})();
