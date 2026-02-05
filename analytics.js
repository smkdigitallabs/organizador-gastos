import { inject } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights';

// Inicializa métricas de performance e acessos (Gratuito no Vercel Hobby)
// Só ativa em produção automaticamente
inject();
injectSpeedInsights();

console.log('[Analytics] Vercel Analytics & Speed Insights inicializados');