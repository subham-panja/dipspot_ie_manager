import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  sanitizeHttpUrl,
  buildChatwootSdkScriptUrl,
  resolveWidgetConfig,
  parseBooleanFlag,
} from '../src/components/chatwootWidgetUtils.ts';
import {
  normalizeChannel,
  normalizeThread,
  normalizeMessage,
  filterInboxThreads,
  sanitizeExternalUrl,
  isVisitorThread,
} from '../src/components/campaigns/inbox/inboxNormalizers.ts';
import {
  DEFAULT_WHATSAPP_CONFIG,
  DEFAULT_CHATWOOT_CONFIG,
  normalizeWhatsAppResponse,
  buildWhatsAppPatchPayload,
  normalizeChatwootResponse,
  buildChatwootPatchPayload,
  buildChatwootTestPayload,
  sanitizeChannelUrl,
} from '../src/components/settings/channelConfigUtils.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_DIR = path.resolve(__dirname, '..');
const SRC_DIR = path.join(FRONTEND_DIR, 'src');

function walkTsFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkTsFiles(fullPath));
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      results.push(fullPath);
    }
  }
  return results;
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      srv.close(() => resolve(port));
    });
  });
}

test('1. Line-count invariant: every .ts/.tsx file under frontend/src/ is strictly < 500 lines', () => {
  const files = walkTsFiles(SRC_DIR);
  assert.ok(files.length > 0, 'Expected TypeScript source files under frontend/src/');
  const violations = [];
  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lineCount = content.split('\n').length - (content.endsWith('\n') ? 1 : 0);
    if (lineCount >= 500) {
      violations.push(`${path.relative(FRONTEND_DIR, filePath)}: ${lineCount} lines`);
    }
  }
  assert.deepEqual(violations, [], `Files >= 500 lines found:\n${violations.join('\n')}`);
});

test('2. Zero hardcoded secrets/tokens and zero synthetic procurement@ emails in M3 scope', () => {
  const filesToCheck = [
    path.join(SRC_DIR, 'components/ChatwootWidget.tsx'),
    path.join(SRC_DIR, 'components/chatwootWidgetUtils.ts'),
    path.join(SRC_DIR, 'app/settings/page.tsx'),
    ...walkTsFiles(path.join(SRC_DIR, 'components/settings')),
    ...walkTsFiles(path.join(SRC_DIR, 'components/campaigns/inbox')),
  ];

  const forbiddenPatterns = [
    { name: 'Hardcoded EAAB token', regex: /EAAB/ },
    { name: 'Hardcoded placeholder phone_number_id', regex: /109849201948291/ },
    { name: 'Fake placeholder webhook URL', regex: /api\.tradepulse\.exim\/webhooks\/whatsapp/ },
    { name: 'Synthetic procurement@ email', regex: /procurement@/ },
  ];

  const hits = [];
  for (const filePath of filesToCheck) {
    const content = fs.readFileSync(filePath, 'utf8');
    for (const pat of forbiddenPatterns) {
      if (pat.regex.test(content)) {
        hits.push(`${pat.name} in ${path.relative(FRONTEND_DIR, filePath)}`);
      }
    }
  }
  assert.deepEqual(hits, [], `Forbidden patterns detected:\n${hits.join('\n')}`);
});

test('3. chatwootWidgetUtils: URL sanitization, SDK URL builder & widget config resolution', () => {
  assert.equal(sanitizeHttpUrl('http://localhost:3001/'), 'http://localhost:3001');
  assert.equal(sanitizeHttpUrl('https://chat.tradepulse.example/app/'), 'https://chat.tradepulse.example/app');
  assert.equal(sanitizeHttpUrl('javascript:alert(1)'), '');
  assert.equal(sanitizeHttpUrl('data:text/html,<script>alert(1)</script>'), '');
  assert.equal(sanitizeHttpUrl(''), '');

  assert.equal(buildChatwootSdkScriptUrl('http://localhost:3001/'), 'http://localhost:3001/packs/js/sdk.js');
  assert.equal(buildChatwootSdkScriptUrl('javascript:alert(1)'), '');

  // Offline & unconfigured -> graceful no-op
  const offlineEmpty = resolveWidgetConfig({ backendConfig: null, envBaseUrl: '', envWebsiteToken: '' });
  assert.equal(offlineEmpty.enabled, false);

  // Offline with env fallback
  const offlineEnv = resolveWidgetConfig({
    backendConfig: null,
    envBaseUrl: 'http://localhost:3001/',
    envWebsiteToken: 'tok_env_123',
  });
  assert.equal(offlineEnv.enabled, true);
  assert.equal(offlineEnv.baseUrl, 'http://localhost:3001');
  assert.equal(offlineEnv.websiteToken, 'tok_env_123');

  // Backend disabled overrides env
  const backendDisabled = resolveWidgetConfig({
    backendConfig: { enabled: false, base_url: 'http://localhost:3001', website_token: 'tok_db' },
    envBaseUrl: 'http://localhost:3001',
    envWebsiteToken: 'tok_env_123',
  });
  assert.equal(backendDisabled.enabled, false);

  // Backend enabled with HMAC identity
  const backendHmac = resolveWidgetConfig({
    backendConfig: {
      enabled: true,
      base_url: 'https://chat.example.com/',
      website_token: 'tok_db',
      identifier: 'lead_99',
      identifier_hash: 'hmac_abc',
      name: 'Al Baraka Foods',
    },
  });
  assert.equal(backendHmac.enabled, true);
  assert.equal(backendHmac.baseUrl, 'https://chat.example.com');
  assert.equal(backendHmac.identifier, 'lead_99');
  assert.equal(backendHmac.identifierHash, 'hmac_abc');

  // String boolean flags must not evaluate "false" / "0" / "no" as truthy
  assert.equal(parseBooleanFlag('false'), false);
  assert.equal(parseBooleanFlag('0'), false);
  assert.equal(parseBooleanFlag('no'), false);
  assert.equal(parseBooleanFlag('true'), true);

  for (const falsyVal of ['false', 'FALSE', '0', 'no', 'off', '']) {
    const strDisabled = resolveWidgetConfig({
      backendConfig: { enabled: falsyVal, base_url: 'http://localhost:3001', website_token: 'tok_db' },
    });
    assert.equal(strDisabled.enabled, false, `Expected enabled=false for "${falsyVal}"`);
  }

  const strEnabled = resolveWidgetConfig({
    backendConfig: { enabled: 'true', base_url: 'http://localhost:3001', website_token: 'tok_db' },
  });
  assert.equal(strEnabled.enabled, true);

  // Unsafe URL rejected
  const unsafe = resolveWidgetConfig({
    backendConfig: { enabled: true, base_url: 'javascript:alert(1)', website_token: 'tok_db' },
  });
  assert.equal(unsafe.enabled, false);
  assert.equal(unsafe.baseUrl, '');
});

test('4. inboxNormalizers: channel mapping, legacy/visitor thread normalization & null-safe filtering', () => {
  assert.equal(normalizeChannel('Channel::WebWidget'), 'Website');
  assert.equal(normalizeChannel('web_widget'), 'Website');
  assert.equal(normalizeChannel('webwidget'), 'Website');
  assert.equal(normalizeChannel('Website Live Chat'), 'Website');
  assert.equal(normalizeChannel('Channel::Whatsapp'), 'WhatsApp');
  assert.equal(normalizeChannel('wa'), 'WhatsApp');
  assert.equal(normalizeChannel('Channel::Email'), 'Email');

  // Numeric lead_id: 0 and empty string thread_id fallback
  const zeroLead = normalizeThread({ lead_id: 0, company_name: 'Zero Corp' });
  assert.equal(zeroLead.thread_id, '0');
  assert.equal(zeroLead.lead_id, 0);
  assert.equal(isVisitorThread(zeroLead), false);

  const emptyThreadId = normalizeThread({ thread_id: '', lead_id: 42, company_name: 'Delta Foods' });
  assert.equal(emptyThreadId.thread_id, '42');
  assert.equal(emptyThreadId.lead_id, 42);

  const emptyVisitorFallback = normalizeThread({
    thread_id: '',
    lead_id: '',
    is_visitor_thread: true,
    chatwoot_conversation_id: 205,
  });
  assert.equal(emptyVisitorFallback.thread_id, 'cw_conv_205');
  assert.equal(isVisitorThread(emptyVisitorFallback), true);

  // Legacy backend shape without thread_id/last_message/latest_intent
  const legacyThread = normalizeThread({
    lead_id: 42,
    company_name: 'Nile Grain Imports',
    country: 'Egypt',
    latest_channel: 'Channel::WebWidget',
    latest_message: 'Need 500 MT CIF Alexandria',
    intent: 'RFQ / Spot Quote',
    latest_timestamp: '2026-11-26T09:00:00Z',
    chatwoot_url: 'javascript:alert(1)',
  });
  assert.equal(legacyThread.thread_id, '42');
  assert.equal(legacyThread.latest_channel, 'Website');
  assert.equal(legacyThread.last_message, 'Need 500 MT CIF Alexandria');
  assert.equal(legacyThread.latest_intent, 'RFQ / Spot Quote');
  assert.equal(legacyThread.badge_color, 'emerald');
  assert.equal(legacyThread.chatwoot_url, '');

  // Visitor thread shape
  const visitorThread = normalizeThread({
    thread_id: 'cw_conv_108',
    lead_id: 'cw_conv_108',
    latest_channel: 'Website',
    is_visitor_thread: true,
    chatwoot_conversation_id: 108,
    chatwoot_url: 'http://localhost:3001/app/accounts/1/conversations/108',
  });
  assert.equal(visitorThread.is_visitor_thread, true);
  assert.equal(isVisitorThread(visitorThread), true);
  assert.equal(visitorThread.chatwoot_synced, true);
  assert.equal(
    sanitizeExternalUrl(visitorThread.chatwoot_url),
    'http://localhost:3001/app/accounts/1/conversations/108'
  );

  // Null-safe & case-insensitive filtering
  const filtered = filterInboxThreads([legacyThread, visitorThread], 'alexandria', 'Website', 'RFQ');
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].thread_id, '42');

  const lowercaseNeg = normalizeThread({ lead_id: 77, latest_intent: 'price negotiation' });
  const lowercaseRfq = normalizeThread({ lead_id: 78, latest_intent: 'high rfq interest' });
  const lowercaseUnsub = normalizeThread({ lead_id: 79, latest_intent: 'unsubscribe requested' });
  assert.equal(filterInboxThreads([lowercaseNeg], '', 'All', 'Negotiation').length, 1);
  assert.equal(filterInboxThreads([lowercaseRfq], '', 'All', 'RFQ').length, 1);
  assert.equal(filterInboxThreads([lowercaseUnsub], '', 'All', 'Unsubscribe').length, 1);

  const msg = normalizeMessage({ content: 'Hello', channel: 'webwidget', direction: 'inbound' }, visitorThread);
  assert.equal(msg.channel, 'Website');
  assert.equal(msg.direction, 'inbound');
});

test('5. channelConfigUtils: WhatsApp & Chatwoot payload building and masked-secret preservation', () => {
  assert.equal(DEFAULT_WHATSAPP_CONFIG.access_token, '');
  assert.equal(DEFAULT_WHATSAPP_CONFIG.phone_number_id, '');
  assert.equal(DEFAULT_WHATSAPP_CONFIG.webhook_url, '');
  assert.equal(DEFAULT_CHATWOOT_CONFIG.enabled, false);
  assert.equal(sanitizeChannelUrl('javascript:void(0)'), '');

  const waState = normalizeWhatsAppResponse({
    configured: true,
    provider: 'meta_cloud_api',
    phone_number_id: '555000111',
    business_account_id: '999000222',
    webhook_url: 'https://crm.example/api/omnichannel/chatwoot/webhook',
    has_access_token: true,
    masked_access_token: '••••••••1234',
    access_token: 'SHOULD_BE_STRIPPED',
  });
  assert.equal(waState.access_token, '');
  assert.equal(waState.has_access_token, true);
  assert.equal(waState.masked_access_token, '••••••••1234');

  // Saving without re-entering secret does not send access_token
  const waPatchNoSecret = buildWhatsAppPatchPayload({ ...waState, access_token: '••••••••1234' });
  assert.equal('access_token' in waPatchNoSecret, false);
  assert.equal(waPatchNoSecret.phone_number_id, '555000111');

  // Clearing secret sends clear_access_token: true
  const waPatchClear = buildWhatsAppPatchPayload(waState, {
    clear_access_token: true,
    clear_webhook_verify_token: false,
  });
  assert.equal(waPatchClear.clear_access_token, true);

  const cwState = normalizeChatwootResponse({
    configured: true,
    enabled: true,
    base_url: 'http://localhost:3001',
    public_url: 'http://localhost:3001',
    account_id: '1',
    website_token: 'web_tok_1',
    has_api_token: true,
    masked_api_token: '••••••••abcd',
    channels: { email: true, whatsapp: false, website: true },
  });
  assert.equal(cwState.api_access_token, '');
  assert.equal(cwState.channels?.website, true);

  const cwPatch = buildChatwootPatchPayload(
    { ...cwState, api_access_token: 'new_secret_token', email_inbox_id: '7' },
    { clear_api_token: false, clear_webhook_secret: true, clear_website_hmac_secret: false }
  );
  assert.equal(cwPatch.api_access_token, 'new_secret_token');
  assert.equal(cwPatch.clear_webhook_secret, true);
  assert.equal(cwPatch.email_inbox_id, '7');

  const cwTest = buildChatwootTestPayload({ ...cwState, api_access_token: '••••abcd' });
  assert.equal('api_access_token' in cwTest, false);
  assert.equal(cwTest.base_url, 'http://localhost:3001');

  // Whitespace-only account_id and inbox IDs trim cleanly to ""
  const cwWhitespace = buildChatwootPatchPayload({
    ...cwState,
    account_id: '   ',
    email_inbox_id: '  ',
    whatsapp_inbox_id: '\t',
    website_inbox_id: ' 9 ',
  });
  assert.equal(cwWhitespace.account_id, '');
  assert.equal(cwWhitespace.email_inbox_id, '');
  assert.equal(cwWhitespace.whatsapp_inbox_id, '');
  assert.equal(cwWhitespace.website_inbox_id, '9');

  const cwTestWhitespace = buildChatwootTestPayload({ ...cwState, account_id: '   ' });
  assert.equal(cwTestWhitespace.account_id, '');
});

test('6. Production Next.js SSR route smoke test (/, /settings, /campaigns/inbox, /track)', async () => {
  const buildIdPath = path.join(FRONTEND_DIR, '.next', 'BUILD_ID');
  assert.ok(fs.existsSync(buildIdPath), 'Expected .next/BUILD_ID — run npm run build before verify_chatwoot_ui.mjs');

  const mockApiPort = await getFreePort();
  const nextPort = await getFreePort();

  const mockServer = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    const url = req.url || '';
    if (url.startsWith('/api/config/chatwoot')) {
      res.end(JSON.stringify({ configured: false, enabled: false, base_url: 'http://localhost:3001', public_url: 'http://localhost:3001', account_id: '1', channels: { email: false, whatsapp: false, website: false } }));
    } else if (url.startsWith('/api/config/whatsapp')) {
      res.end(JSON.stringify({ configured: false, provider: 'meta_cloud_api', phone_number_id: '', business_account_id: '', webhook_url: '' }));
    } else if (url.startsWith('/api/omnichannel/chatwoot/widget-config')) {
      res.end(JSON.stringify({ enabled: false, base_url: '', website_token: '', identifier: '', identifier_hash: '' }));
    } else if (url.startsWith('/api/omnichannel/chatwoot/status')) {
      res.end(JSON.stringify({ configured: false, enabled: false, reachable: false }));
    } else if (url.startsWith('/api/omnichannel/threads')) {
      res.end(JSON.stringify({ threads: [], total: 0 }));
    } else {
      res.end(JSON.stringify({}));
    }
  });

  await new Promise((resolve) => mockServer.listen(mockApiPort, '127.0.0.1', resolve));

  const nextBin = path.join(FRONTEND_DIR, 'node_modules', '.bin', 'next');
  const nextProc = spawn(nextBin, ['start', '-p', String(nextPort), '-H', '127.0.0.1'], {
    cwd: FRONTEND_DIR,
    env: {
      ...process.env,
      NEXT_PUBLIC_API_URL: `http://127.0.0.1:${mockApiPort}/api`,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    // Wait for Next.js server readiness
    const baseUrl = `http://127.0.0.1:${nextPort}`;
    let ready = false;
    for (let i = 0; i < 40; i++) {
      try {
        const probe = await fetch(`${baseUrl}/settings`);
        if (probe.status === 200) {
          ready = true;
          break;
        }
      } catch {
        // retry
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    assert.ok(ready, 'Next.js production server failed to become ready');

    const routes = [
      { path: '/', expectedText: 'TradePulse' },
      { path: '/settings', expectedText: 'System Settings' },
      { path: '/settings?tab=chatwoot', expectedText: 'System Settings' },
      { path: '/settings?tab=whatsapp', expectedText: 'System Settings' },
      { path: '/campaigns/inbox', expectedText: 'Omnichannel' },
      { path: '/track', expectedText: 'TradePulse' },
    ];

    for (const route of routes) {
      const response = await fetch(`${baseUrl}${route.path}`);
      assert.equal(response.status, 200, `Expected HTTP 200 for ${route.path}`);
      const html = await response.text();
      assert.ok(html.includes(route.expectedText), `Expected "${route.expectedText}" in ${route.path}`);
      assert.equal(html.includes('Application error: a client-side exception'), false);
      assert.equal(html.includes('__next_error__'), false);
    }
  } finally {
    nextProc.kill('SIGTERM');
    await new Promise((resolve) => {
      const timer = setTimeout(() => {
        nextProc.kill('SIGKILL');
        resolve();
      }, 3000);
      nextProc.once('exit', () => {
        clearTimeout(timer);
        resolve();
      });
    });
    await new Promise((resolve) => mockServer.close(resolve));
  }
});
