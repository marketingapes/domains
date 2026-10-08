// Owner-only offline receipt from a connector-read snapshot. Not a public/private HTTP endpoint.
import { readFile, writeFile } from 'node:fs/promises';
import { createReadOnlySheetAdapter } from './read-only-adapter.mjs';
if(!process.argv.includes('--owner-snapshot'))throw Error('Explicit owner-snapshot review required.');
const input=process.argv[process.argv.indexOf('--input')+1],output=process.argv[process.argv.indexOf('--output')+1];
if(!input||!output||input===output)throw Error('Separate input and output files required.');
const snapshot=JSON.parse(await readFile(input,'utf8'));
if(snapshot.spreadsheet_id!=='1FET1WpeS8bDfPJlkym3lNXYLBaFBhwOtz4kUTl_hDe8')throw Error('Unexpected workbook.');
const [headers,...rows]=snapshot.sheets.CurrentState.values;
const actor={serverVerified:true,access:'OWNER_READ_ONLY',subject:'owner-snapshot-review',tenantId:'phillips',
 stateIds:rows.map(r=>r[headers.indexOf('state_id')]),taskIds:[],expiresAt:new Date(Date.now()+60_000).toISOString()};
const adapter=createReadOnlySheetAdapter({enabled:true,resolveActor:async()=>actor,readRange:async({sheet_name})=>snapshot.sheets[sheet_name]});
const result=await adapter.read({});result.read_at=snapshot.read_at;result.source_read_mode='AUTHORIZED_CONNECTOR_SNAPSHOT_NOT_RUNTIME_CONNECTED';
await writeFile(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({verified_states:result.current_state.length,assigned_tasks:result.tasks.length,visible_requests:result.approval_requests.length,decisions_enabled:false,runtime_connected:false}));
