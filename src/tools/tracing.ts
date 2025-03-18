import { NodeSDK } from '@opentelemetry/sdk-node';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import * as process from 'process';
import { dockerCGroupV1Detector } from '@opentelemetry/resource-detector-docker';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { PrismaInstrumentation } from '@prisma/instrumentation';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

const metricReader = new PeriodicExportingMetricReader({
  exportIntervalMillis: 60000,
  exporter: new OTLPMetricExporter({
    url: process.env.OTEL_METRIC_EXPORTER_URL,
    headers: {},
  }),
});
const traceExporter = new OTLPTraceExporter({
  url: process.env.OTEL_TRACE_EXPORTER_URL,
  headers: {},
});
const instrumentations = [
  getNodeAutoInstrumentations(),
  new PrismaInstrumentation(),
];

export const otelSDK = new NodeSDK({
  serviceName: 'chesser',
  traceExporter,
  metricReader,
  instrumentations,
  resourceDetectors: [dockerCGroupV1Detector],
});

process.on('SIGTERM', () => {
  otelSDK
    .shutdown()
    .then(
      () => console.log('SDK shut down successfully'),
      (err) => console.log('Error shutting down SDK', err),
    )
    .finally(() => process.exit(0));
});
