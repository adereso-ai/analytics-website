import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { getCredentials, isGaConfigured } from "../src/lib/config.ts";

const keys = [
  "GOOGLE_AUTH_USE_ADC",
  "GA4_SERVICE_ACCOUNT_JSON",
  "GOOGLE_CLIENT_EMAIL",
  "GOOGLE_PRIVATE_KEY",
  "GOOGLE_APPLICATION_CREDENTIALS",
  "GA4_PROPERTY_ID",
];
const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

beforeEach(() => {
  for (const key of keys) delete process.env[key];
});

afterEach(() => {
  for (const key of keys) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
});

test("managed identity configures GA4 without a downloaded credential", () => {
  process.env.GOOGLE_AUTH_USE_ADC = "true";
  process.env.GA4_PROPERTY_ID = "123456789";
  assert.deepEqual(getCredentials(), { kind: "adc" });
  assert.equal(isGaConfigured(), true);
});

test("explicit ADC mode ignores a legacy credential still present in the environment", () => {
  process.env.GOOGLE_AUTH_USE_ADC = "true";
  process.env.GA4_SERVICE_ACCOUNT_JSON = '{"project_id":"legacy-project"}';
  process.env.GOOGLE_CLIENT_EMAIL = "legacy@example.com";
  process.env.GOOGLE_PRIVATE_KEY = "unused-legacy-value";
  assert.deepEqual(getCredentials(), { kind: "adc" });
});

test("existing deployments keep their credential selection when ADC is not enabled", () => {
  process.env.GA4_SERVICE_ACCOUNT_JSON = '{"project_id":"legacy-project"}';
  assert.deepEqual(getCredentials(), {
    kind: "json",
    json: '{"project_id":"legacy-project"}',
  });
});

test("disabling ADC preserves legacy authentication", () => {
  process.env.GOOGLE_AUTH_USE_ADC = "false";
  process.env.GA4_SERVICE_ACCOUNT_JSON = '{"project_id":"legacy-project"}';
  assert.equal(getCredentials()?.kind, "json");
});
