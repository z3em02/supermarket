import { useState, useEffect } from 'react';
import { getApiUrl } from '../../utils/api';
import { getCsrfToken } from '../../utils/csrf';

export const useCouponCode = ({ cart, isAr }) => {
  const [showCouponField, setShowCouponField] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState('');

  // Coupon Validation Handler
  const handleApplyCoupon = async (e) => {
    if (e) e.preventDefault();
    const clean = couponInput.trim().toUpperCase();
    if (!clean) return;

    try {
      setValidatingCoupon(true);
      setCouponError('');
      const apiUrl = getApiUrl();

      const res = await fetch(`${apiUrl}/api/coupons/validate`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() || '' },
        body: JSON.stringify({
          code: clean,
          items: cart.map(i => ({ productId: i.productId, quantity: i.quantity }))
        })
      });

      const data = await res.json();
      if (!res.ok || !data.valid) {
        throw new Error(data.error || (isAr ? 'رمز الكوبون غير صالح' : 'Ungültiger Gutscheincode'));
      }

      setAppliedCoupon({
        code: data.coupon.code,
        discountType: data.coupon.discountType,
        discountValue: data.coupon.discountValue,
        discountAmount: data.discountAmount,
        isFreeShipping: data.isFreeShipping
      });
      setCouponInput('');
    } catch (err) {
      setCouponError(err.message || 'Gutschein konnte nicht angewendet werden');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError('');
  };

  // Revalidate coupon when cart items change
  useEffect(() => {
    if (appliedCoupon && cart.length > 0) {
      const apiUrl = getApiUrl();

      fetch(`${apiUrl}/api/coupons/validate`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() || '' },
        body: JSON.stringify({
          code: appliedCoupon.code,
          items: cart.map(i => ({ productId: i.productId, quantity: i.quantity }))
        })
      })
        .then(r => r.json())
        .then(data => {
          if (data.valid) {
            setAppliedCoupon(prev => ({
              ...prev,
              discountAmount: data.discountAmount,
              isFreeShipping: data.isFreeShipping
            }));
          } else {
            setAppliedCoupon(null);
            setCouponError(data.error);
          }
        })
        .catch(() => {});
    }
  }, [cart]);

  return {
    showCouponField,
    setShowCouponField,
    couponInput,
    setCouponInput,
    appliedCoupon,
    setAppliedCoupon,
    validatingCoupon,
    setValidatingCoupon,
    couponError,
    setCouponError,
    handleApplyCoupon,
    handleRemoveCoupon
  };
};
