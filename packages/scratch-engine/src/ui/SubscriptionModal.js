import { refreshIcons } from './icons';
import { setPlan, getPlan, getAllPlans } from '../services/featureFlags';
import { showToast } from './ModeSwitcher';

const PLANS = [
  {
    id: 'free',
    name: 'Starter',
    price: 'Free',
    period: '',
    color: '#6B7280',
    features: [
      { text: 'Scratch Mode', included: true },
      { text: 'Board Mode (ESP32)', included: false },
      { text: 'Local Project Save/Load', included: true },
      { text: 'Cloud Save', included: false },
      { text: 'Code Generation (MicroPython)', included: false },
      { text: 'Code Generation (Arduino C++)', included: false },
      { text: 'Serial Monitor', included: false },
      { text: 'Compile & Upload', included: false },
      { text: 'Export .ino/.py', included: false },
      { text: 'Max Projects', included: true, detail: '3 local' },
      { text: 'Ads', included: false, detail: 'Shown' },
    ],
    cta: 'Current Plan',
    highlighted: false,
  },
  {
    id: 'maker',
    name: 'Maker',
    price: '₹199',
    period: '/mo',
    color: '#4C97FF',
    features: [
      { text: 'Scratch Mode', included: true },
      { text: 'Board Mode (ESP32)', included: true },
      { text: 'Local + Cloud Save', included: true, detail: '10 projects' },
      { text: 'Code Generation (MicroPython)', included: true },
      { text: 'Code Generation (Arduino C++)', included: true },
      { text: 'Serial Monitor', included: true },
      { text: 'Compile & Upload', included: true },
      { text: 'Export .ino/.py', included: true },
      { text: 'Community Access', included: true, detail: 'Share & download' },
      { text: 'Priority Support', included: true, detail: 'Email' },
      { text: 'No Ads', included: true },
    ],
    cta: 'Upgrade',
    highlighted: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '₹499',
    period: '/mo',
    color: '#9966FF',
    features: [
      { text: 'Everything in Maker', included: true },
      { text: 'Unlimited Cloud Projects', included: true },
      { text: 'Team/Classroom (30 students)', included: true },
      { text: 'Teacher Dashboard', included: true },
      { text: 'Custom Blocks Toolkit', included: true },
      { text: 'White-label Exports', included: true },
      { text: 'API Access', included: true },
      { text: 'Priority Support', included: true, detail: 'Chat + Email' },
    ],
    cta: 'Upgrade',
    highlighted: false,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    color: '#FF8C1A',
    features: [
      { text: 'Everything in Pro', included: true },
      { text: 'Unlimited Students', included: true },
      { text: 'Self-hosted Option', included: true },
      { text: 'Custom Branding', included: true },
      { text: 'Custom Block Development', included: true },
      { text: 'Dedicated Support', included: true },
      { text: 'SLA Guarantee', included: true },
      { text: 'On-premise Deployment', included: true },
    ],
    cta: 'Contact Us',
    highlighted: false,
  },
];

let _modalEl = null;

export function showSubscriptionModal() {
  if (_modalEl) {
    _modalEl.classList.add('open');
    return;
  }

  const currentPlan = getPlan();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay subscription-overlay';
  overlay.id = 'subscriptionModal';

  const content = document.createElement('div');
  content.className = 'subscription-modal';
  content.style.cssText = `
    background: var(--modal-bg);
    border-radius: 16px;
    max-width: 960px;
    width: 95%;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: var(--shadow-lg);
    padding: 32px;
  `;

  content.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;">
      <div>
        <h2 style="margin:0;font-size:22px;font-weight:800;color:var(--text-primary);letter-spacing:-0.5px;">Choose Your Plan</h2>
        <p style="margin:4px 0 0;font-size:13px;color:var(--text-muted);">Unlock all features with Maker or Pro</p>
      </div>
      <button class="modal-close" id="closeSubscriptionBtn" style="width:32px;height:32px;border:1px solid var(--border);background:var(--bg-secondary);border-radius:8px;font-size:18px;color:var(--text-secondary);cursor:pointer;display:flex;align-items:center;justify-content:center;">
        <i data-lucide="x" style="width:18px;height:18px;"></i>
      </button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;" class="plan-grid">
      ${PLANS.map(plan => {
        const isCurrent = plan.id === currentPlan;
        const isEnterprise = plan.id === 'enterprise';
        return `
          <div style="
            background: var(--bg-secondary);
            border: 2px solid ${plan.highlighted ? plan.color : 'var(--border)'};
            border-radius: 14px;
            padding: 20px;
            display:flex;
            flex-direction:column;
            position:relative;
            ${plan.highlighted ? 'box-shadow: 0 4px 24px rgba(76,151,255,0.2);' : ''}
          " class="plan-card">
            ${plan.highlighted ? `<div style="position:absolute;top:-10px;left:50%;transform:translateX(-50%);background:${plan.color};color:#fff;font-size:10px;font-weight:700;padding:3px 12px;border-radius:20px;text-transform:uppercase;letter-spacing:0.5px;">Popular</div>` : ''}
            <div style="text-align:center;margin-bottom:16px;${plan.highlighted ? 'margin-top:8px;' : ''}">
              <div style="font-size:14px;font-weight:700;color:var(--text-primary);margin-bottom:4px;">${plan.name}</div>
              <div style="font-size:28px;font-weight:800;color:${plan.color};">${plan.price}<span style="font-size:13px;font-weight:500;color:var(--text-muted);">${plan.period}</span></div>
            </div>
            <div style="flex:1;display:flex;flex-direction:column;gap:8px;margin-bottom:16px;">
              ${plan.features.map(f => `
                <div style="display:flex;align-items:center;gap:8px;font-size:12px;">
                  <span style="color:${f.included ? '#4CAF50' : 'var(--text-muted)'};flex-shrink:0;">
                    ${f.included ? '<i data-lucide="check" style="width:14px;height:14px;"></i>' : '<i data-lucide="x" style="width:14px;height:14px;"></i>'}
                  </span>
                  <span style="color:var(--text-secondary);">
                    ${f.text}${f.detail ? ` <span style="color:var(--text-muted);font-size:11px;">(${f.detail})</span>` : ''}
                  </span>
                </div>
              `).join('')}
            </div>
            <button class="plan-cta" data-plan="${plan.id}" style="
              width:100%;
              padding: 10px;
              border: none;
              border-radius: 8px;
              font-size: 13px;
              font-weight: 700;
              cursor: pointer;
              background: ${isCurrent ? 'var(--bg-tertiary)' : plan.color};
              color: ${isCurrent ? 'var(--text-muted)' : '#fff'};
              transition: all 0.15s;
              font-family: var(--font-ui);
            " ${isCurrent ? 'disabled' : ''}>
              ${isCurrent ? 'Current Plan' : isEnterprise ? 'Contact Sales' : plan.cta}
            </button>
          </div>
        `;
      }).join('')}
    </div>
    <div style="margin-top:20px;text-align:center;font-size:12px;color:var(--text-muted);">
      <span>Annual plans available at 20% discount. All plans include a 14-day free Pro trial.</span>
    </div>
  `;

  overlay.appendChild(content);
  document.body.appendChild(overlay);
  _modalEl = overlay;

  refreshIcons();

  requestAnimationFrame(() => overlay.classList.add('open'));

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeSubscriptionModal();
  });

  document.getElementById('closeSubscriptionBtn')?.addEventListener('click', closeSubscriptionModal);

  content.querySelectorAll('.plan-cta').forEach(btn => {
    btn.addEventListener('click', () => {
      const planId = btn.dataset.plan;
      if (planId === getPlan()) return;

      if (planId === 'enterprise') {
        showToast('Contact TechyGuide at enterprise@techyguide.in');
        return;
      }

      setPlan(planId);
      showToast(`Switched to ${PLANS.find(p => p.id === planId)?.name} plan!`);
      closeSubscriptionModal();
      updatePlanBadge();

      window.dispatchEvent(new CustomEvent('plan-changed', { detail: { plan: planId } }));
    });
  });
}

export function closeSubscriptionModal() {
  if (_modalEl) {
    _modalEl.classList.remove('open');
    setTimeout(() => {
      if (_modalEl && _modalEl.parentNode) _modalEl.parentNode.removeChild(_modalEl);
      _modalEl = null;
    }, 200);
  }
}

export function updatePlanBadge() {
  const badge = document.getElementById('planBadge');
  if (badge) {
    const plan = getPlan();
    const names = { free: 'Starter', maker: 'Maker', pro: 'Pro' };
    badge.textContent = names[plan] || plan;
    badge.className = `plan-badge plan-badge--${plan}`;
  }
}
