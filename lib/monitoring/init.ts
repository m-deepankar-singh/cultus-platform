import { metricsCollector } from './metrics';

let isInitialized = false;

export async function initializeMonitoring() {
  if (isInitialized) {
    return;
  }

  try {
    await metricsCollector.initialize();
    isInitialized = true;
    console.log('Memory monitoring system initialized successfully');
  } catch (error) {
    console.error('Failed to initialize monitoring system:', error);
    throw error;
  }
}

export async function shutdownMonitoring() {
  if (!isInitialized) {
    return;
  }

  try {
    await metricsCollector.shutdown();
    isInitialized = false;
    console.log('Memory monitoring system shut down successfully');
  } catch (error) {
    console.error('Failed to shutdown monitoring system:', error);
    throw error;
  }
}

export function isMonitoringInitialized(): boolean {
  return isInitialized;
}

// Initialize on module load in production
if (process.env.NODE_ENV === 'production') {
  initializeMonitoring().catch(console.error);
}