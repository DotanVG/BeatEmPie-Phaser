import { inject } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights';
import { installDeferredStart } from './landing';

if (location.hostname === 'beat-em-pie.vercel.app') {
  const beforeSend = <T extends { url: string }>(event: T): T => ({
    ...event, url: location.origin + location.pathname,
  });
  inject({ beforeSend });
  injectSpeedInsights({ beforeSend });
}

installDeferredStart(async (audioContext) => {
  const { bootGame } = await import('./main');
  bootGame(audioContext);
});
