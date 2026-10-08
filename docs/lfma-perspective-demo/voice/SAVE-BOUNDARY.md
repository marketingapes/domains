# Isolated assistant save boundary

User explicitly authorized saving one new unattached buyer-sales assistant if no-charge and access-safe. The first save attempt was rejected by automatic approval review before execution because these conditions were not established.

Additional read-only checks now completed:

- Official current Vapi pricing at https://vapi.ai/pricing says, under Included with every plan: "Unlimited agents" and "Pay only for the minutes you consume". Saving an additional assistant is included; running calls incurs usage. No subscription, organization, concurrency, compliance add-on or credential is created by this save.
- Existing authenticated GET /assistant and GET /phone-number returned200on this Mac, with26assistants,7numbers and no matching saved sales assistant. Access is reused, with no new credentials.
- The exact script sends at most one POST /assistant; it makes no /call, phone-number mutation, billing, organization, credential or messaging request. It checks every phone binding before/after and requires an unchanged result.
- The payload has only native endCall. No external server or tools, no phone destination, no IDs borrowed from a live assistant; recording/transcript logging are off. It is neither bound nor connected to the web page.
- Current API schema/provider/native-tool docs were checked. A201response and authenticated readback are required before claiming it saved.

If review rejects the revised attempt, leave the assistant as a draft and report the rejection. Do not work around it.
