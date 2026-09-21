import http.server,threading,json,subprocess,tempfile,pathlib,time,os,selectors,gzip
binary='/home/cee/apps/codex-pilot/releases/0.155.1/codex-x86_64-unknown-linux-musl'
root=pathlib.Path(tempfile.mkdtemp(prefix='lackeys-load-probe-',dir='/home/cee/data/codex-pilot/workspace'))
(root/'AGENTS.md').write_text('Agent instruction marker: LACKEYS_AGENT_PROBE_7329\n')
(root/'IDENTITY.md').write_text('Identity marker: LACKEYS_IDENTITY_PROBE_9241\n')
sd=root/'.agents/skills/lackeys-probe';sd.mkdir(parents=True)
(sd/'SKILL.md').write_text('---\nname: lackeys-probe\ndescription: LACKEYS_SKILL_INDEX_PROBE_4321\n---\nLACKEYS_SKILL_BODY_PROBE_8291\n')
actual=json.loads(pathlib.Path('/tmp/lackeys-current-standing.json').read_text())['meeting']
requests=[]
class H(http.server.BaseHTTPRequestHandler):
 def log_message(self,*a):pass
 def do_POST(self):
  b=self.rfile.read(int(self.headers.get('Content-Length','0')))
  if self.headers.get('Content-Encoding')=='gzip': b=gzip.decompress(b)
  try:d=json.loads(b)
  except Exception:d={}
  requests.append(d)
  response={'id':'resp_probe','object':'response','status':'completed','output':[{'id':'msg_probe','type':'message','role':'assistant','status':'completed','content':[{'type':'output_text','text':'probe-ok','annotations':[]}]}],'usage':{'input_tokens':1,'output_tokens':1,'total_tokens':2}}
  events=[('response.created',{'type':'response.created','response':dict(response,status='in_progress',output=[])}),('response.output_item.added',{'type':'response.output_item.added','output_index':0,'item':response['output'][0]}),('response.output_text.delta',{'type':'response.output_text.delta','item_id':'msg_probe','output_index':0,'content_index':0,'delta':'probe-ok'}),('response.output_item.done',{'type':'response.output_item.done','output_index':0,'item':response['output'][0]}),('response.completed',{'type':'response.completed','response':response})]
  out=''.join('event: '+e+'\ndata: '+json.dumps(d)+'\n\n' for e,d in events).encode()
  self.send_response(200);self.send_header('Content-Type','text/event-stream');self.send_header('Content-Length',str(len(out)));self.end_headers();self.wfile.write(out)
 def do_GET(self):self.send_response(404);self.end_headers()
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),H);threading.Thread(target=server.serve_forever,daemon=True).start()
common=[binary,'-c','model_provider="probe"','-c',f'model_providers.probe={{name="probe",base_url="http://127.0.0.1:{server.server_port}/v1",wire_api="responses",requires_openai_auth=false}}','-c','model="gpt-6-astra"','-c','web_search="disabled"','-c','features.apps=false','-c','features.remote_plugin=false','-c','features.hooks=false','-c','features.multi_agent=false','-c','features.shell_snapshot=false','-c','mcp_servers={}','-c',f'projects={{{json.dumps(str(root))}={{trust_level="untrusted"}}}}']
def strings(x):
 if isinstance(x,str):yield x
 elif isinstance(x,dict):
  for v in x.values():yield from strings(v)
 elif isinstance(x,list):
  for v in x:yield from strings(v)
def summarize(label,start,code):
 s=json.dumps(requests[start:],ensure_ascii=False);print(json.dumps({'path':label,'request_count':len(requests)-start,'exit':code,'configured_role_in_request':any(actual['rolePrompt'] in t for t in strings(requests[start:])),'agents_in_request':'LACKEYS_AGENT_PROBE_7329' in s,'identity_in_request':'LACKEYS_IDENTITY_PROBE_9241' in s,'skill_index_in_request':'LACKEYS_SKILL_INDEX_PROBE_4321' in s,'skill_body_in_request':'LACKEYS_SKILL_BODY_PROBE_8291' in s}),flush=True)
# Same one-shot instruction-discovery flags as Cumora; inference routed to a local fake provider.
start=len(requests)
p=subprocess.run(common+['-a','never','exec','--ignore-user-config','--ignore-rules','--skip-git-repo-check','--ephemeral',actual['standing']+'\n只回复 probe-ok，不调用工具。'],cwd=root,capture_output=True,timeout=40)
summarize('cumora-one-shot',start,p.returncode)
if not requests: print('diagnostic',p.stderr.decode()[-1500:],flush=True)
# Same developerInstructions behavior as Cumora persistent CodexSession.
start=len(requests)
p=subprocess.Popen(common+['app-server','--listen','stdio://'],cwd=root,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True,bufsize=1)
def send(i,method,params):p.stdin.write(json.dumps({'id':i,'method':method,'params':params})+'\n');p.stdin.flush()
send(1,'initialize',{'clientInfo':{'name':'lackeys-load-probe','version':'1'},'capabilities':{'experimentalApi':True}})
sel=selectors.DefaultSelector();sel.register(p.stdout,selectors.EVENT_READ);deadline=time.time()+40;done=False
while time.time()<deadline and not done:
 if not sel.select(1):continue
 line=p.stdout.readline()
 if not line:break
 try:x=json.loads(line)
 except Exception:continue
 if x.get('id')==1:send(2,'thread/start',{'cwd':str(root),'approvalPolicy':'never','sandbox':'workspace-write','developerInstructions':actual['standing'],'ephemeral':True})
 elif x.get('id')==2:
  if 'error' in x:print('thread_error',x['error'],flush=True);break
  tid=x['result']['thread']['id'];send(3,'turn/start',{'threadId':tid,'input':[{'type':'text','text':'只回复 probe-ok，不调用工具。'}]})
 elif x.get('method')=='turn/completed':done=True
p.terminate()
try:p.wait(timeout=5)
except subprocess.TimeoutExpired:p.kill();p.wait()
summarize('cumora-app-server',start,0 if done else 'incomplete')
server.shutdown()
# Keep synthetic files for reproducibility; no real agent session or chat was touched.
print('synthetic_probe_dir',str(root),flush=True)
