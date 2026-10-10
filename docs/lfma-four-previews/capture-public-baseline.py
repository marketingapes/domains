import hashlib,json,urllib.request,urllib.error,datetime
from pathlib import Path
base='https://lawfirmmarketingapes.com'
paths=['/','/demo/','/perspective-demo/','/perspective-demo/app.js','/perspective-demo/config.json','/perspective-demo/style.css','/perspective-preview/','/perspective-preview/app.js','/perspective-preview/config.json','/perspective-preview/style.css','/portal/','/paraquat-pilot/','/assets/portal/ape-logo.jpg','/perspective-options/story.html','/perspective-options/build.html','/perspective-options/test.html','/perspective-options/offer.html']
results=[]
for route in paths:
 req=urllib.request.Request(base+route,headers={'User-Agent':'LFMA-approved-preview-release-check/1.0','Cache-Control':'no-cache'})
 try:
  with urllib.request.urlopen(req,timeout=30) as response:status=response.status;body=response.read()
 except urllib.error.HTTPError as error:status=error.code;body=error.read()
 results.append({'path':route,'status':status,'sha256':hashlib.sha256(body).hexdigest(),'bytes':len(body)})
 print(route,status)
Path('docs/lfma-four-previews/public-before.json').write_text(json.dumps({'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'base':base,'assets':results},indent=2)+'\n')
