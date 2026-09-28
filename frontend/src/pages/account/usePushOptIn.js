import { useState, useEffect } from 'react';
import { isPushSupported, getPushSubscriptionStatus, enablePushNotifications } from '../../utils/pushNotifications';

export const usePushOptIn = () => {
  // Push notification opt-in ('checking' | 'not-subscribed' | 'subscribed' | 'denied' | 'unsupported')
  const [pushStatus, setPushStatus] = useState('checking');
  const [enablingPush, setEnablingPush] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) {
      setPushStatus('unsupported');
      return;
    }
    getPushSubscriptionStatus().then(setPushStatus);
  }, []);

  const handleEnablePush = async () => {
    setEnablingPush(true);
    const result = await enablePushNotifications();
    setPushStatus(result === 'granted' ? 'subscribed' : result);
    setEnablingPush(false);
  };

  return {
    pushStatus,
    setPushStatus,
    enablingPush,
    setEnablingPush,
    handleEnablePush
  };
};
