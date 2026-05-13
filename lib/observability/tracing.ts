import { trace } from "@opentelemetry/api";

export async function registerOtelIfConfigured(): Promise<void> {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!endpoint) {
    return;
  }
  const { NodeSDK } = await import("@opentelemetry/sdk-node");
  const { OTLPTraceExporter } = await import("@opentelemetry/exporter-trace-otlp-http");
  const { resourceFromAttributes } = await import("@opentelemetry/resources");

  const exporter = new OTLPTraceExporter({ url: `${endpoint.replace(/\/$/, "")}/v1/traces` });
  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      "service.name": process.env.OTEL_SERVICE_NAME ?? "askmehire"
    }),
    traceExporter: exporter
  });
  await sdk.start();
}

export function getTracer() {
  return trace.getTracer("askmehire");
}
