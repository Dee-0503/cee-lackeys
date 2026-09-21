import {readFileSync} from 'node:fs';
const key=readFileSync('/run/secrets/openai_api_key','utf8').trim();
for(const model of [process.env.OPENAI_MODEL,process.env.OPENAI_MODEL_SUPPORT]) {
  try {
    const r=await fetch(`${process.env.OPENAI_BASE_URL.replace(/\/$/,'')}/responses`,{
      method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},
      body:JSON.stringify({model,input:'请用中文回复：测试成功',max_output_tokens:128,store:false}),
      signal:AbortSignal.timeout(60000)
    });
    const j=await r.json();
    const texts=(j.output??[]).flatMap(x=>x.content??[]).filter(x=>x.type==='output_text').map(x=>x.text).join('');
    console.log(JSON.stringify({model,http:r.status,status:j.status,hasText:!!texts,hasChinese:/[\u4e00-\u9fff]/.test(texts),errorCode:j.error?.code,errorType:j.error?.type}));
  } catch { console.log(JSON.stringify({model,result:'transport_or_parse_failure'})); }
}
