// Integration binding for the conference demo. Deliberately UNCONNECTED.
//
// Do not put provider URLs, assistant IDs, API keys or webhook addresses here.
// When dot supplies a verified contract, replace these two exports with:
//   integrationConfig: { status: 'verified', contractVersion, voicePath: 'phone'|'browser',
//                        origin: 'https://<approved-origin>', disclosures: {...}, recordingOptional, pollMs }
//   transport: an object implementing every TRANSPORT_OPERATIONS entry in adapter.mjs
// and narrow the page CSP connect-src to that single origin. See README.md.
import { UNCONNECTED } from './adapter.mjs';

export const integrationConfig = UNCONNECTED;
export const transport = null;
