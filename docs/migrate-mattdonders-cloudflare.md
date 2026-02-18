# Prompt: Migrate mattdonders.com from IONOS → Cloudflare

Use this prompt in a new Claude Code session (or Claude.ai) when ready to perform the migration.

---

## The Prompt

I need to migrate mattdonders.com from IONOS to Cloudflare DNS. This domain hosts Google Workspace email (Gmail, Calendar, Drive, etc.) so preserving email deliverability is the #1 priority — nothing can break.

Here is what I need you to do, step by step:

### Phase 1 — Inventory (do this first, don't touch anything yet)
1. Help me export every existing DNS record from IONOS before we change anything. Walk me through where to find the full DNS zone in the IONOS control panel and what to screenshot/copy.
2. List the exact records Google Workspace requires:
   - MX records (all 5, with correct priorities)
   - SPF TXT record
   - DKIM TXT record (I need to find the selector — help me look it up)
   - DMARC TXT record (if present)
   - Google site verification TXT record (if present)
3. Identify any other records that might be present (A, CNAME, subdomains, etc.)

### Phase 2 — Cloudflare Setup (before changing nameservers)
1. Walk me through adding mattdonders.com to Cloudflare (free plan)
2. When Cloudflare imports DNS records automatically, help me verify EVERY Google Workspace record imported correctly — compare against the inventory from Phase 1
3. For any record that didn't import correctly, fix it before proceeding
4. Set ALL Google Workspace records (MX, SPF, DKIM, DMARC) to DNS-only (grey cloud, NOT proxied) — proxying mail records breaks email
5. Keep the TTL low (300s) on all records for the first 48 hours so we can roll back fast if needed

### Phase 3 — Nameserver Cutover
1. Walk me through changing nameservers at IONOS to Cloudflare's nameservers
2. Explain what to expect during propagation (up to 48h, usually faster)
3. Tell me how to verify propagation is complete using dig/nslookup

### Phase 4 — Verification
1. After propagation, verify MX records are resolving correctly: `dig MX mattdonders.com`
2. Send a test email to and from the Google Workspace account
3. Check mail-tester.com or MXToolbox to confirm SPF/DKIM/DMARC are all passing
4. Verify no other services broke (website, subdomains, etc.)

### Phase 5 — Post-migration cleanup
1. Lower TTLs can be raised back to 3600 once everything is confirmed working
2. Add kitchenventory tunnel: `kitchen.mattdonders.com` CNAME → Cloudflare Tunnel
3. Document what's now in Cloudflare DNS

### Constraints & guardrails
- Do NOT change nameservers until Phase 2 is 100% verified
- Do NOT proxy (orange cloud) any MX, SPF, DKIM, or DMARC records — ever
- Do NOT delete the IONOS DNS zone until 1 week after successful cutover
- If anything looks wrong during verification, STOP and roll back by switching nameservers back to IONOS
- Remind me to check Google Workspace Admin console after cutover to confirm no alerts

My IONOS login is at ionos.com. I have admin access to Google Workspace at admin.google.com. I have a Cloudflare account at cloudflare.com. The domain registrar is IONOS (I'm keeping registration there for now, just moving DNS).
