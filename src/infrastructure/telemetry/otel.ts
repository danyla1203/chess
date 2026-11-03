import { NodeSDK, logs, metrics, resources } from '@opentelemetry/sdk-node';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { containerDetector } from '@opentelemetry/resource-detector-container';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-proto';
import { PrismaInstrumentation } from '@prisma/instrumentation';

const enabled = process.env.OTEL_SDK_DISABLED !== 'true';

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.WARN);

export const otelSDK = new NodeSDK({
  serviceName: process.env.OTEL_SERVICE_NAME ?? 'chess-core',
  traceExporter: new OTLPTraceExporter(),
  metricReaders: [
    new metrics.PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter(),
      exportIntervalMillis: Number(
        process.env.OTEL_METRIC_EXPORT_INTERVAL ?? 15000,
      ),
    }),
  ],
  logRecordProcessors: [
    new logs.BatchLogRecordProcessor({ exporter: new OTLPLogExporter() }),
  ],
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
      '@opentelemetry/instrumentation-dns': { enabled: false },
      '@opentelemetry/instrumentation-net': { enabled: false },
      '@opentelemetry/instrumentation-ioredis': { requireParentSpan: true },
    }),
    new PrismaInstrumentation(),
  ],
  resourceDetectors: [
    resources.envDetector,
    resources.processDetector,
    resources.hostDetector,
    containerDetector,
  ],
});

if (enabled) otelSDK.start();

export async function shutdownTelemetry(): Promise<void> {
  if (!enabled) return;
  try {
    await Promise.race([
      otelSDK.shutdown(),
      new Promise((resolve) => setTimeout(resolve, 5000).unref()),
    ]);
  } catch (err) {
    console.error('Error shutting down OpenTelemetry SDK', err);
  }
}
