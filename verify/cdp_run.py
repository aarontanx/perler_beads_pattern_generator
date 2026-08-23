import json, time, urllib.request, sys
from websockets.sync.client import connect

def run_cdp(nav_url, wait_titles=('PARITY_DONE','PARITY_ERROR'), expr_out='document.getElementById("out").textContent', max_wait_s=120):
    ver = json.load(urllib.request.urlopen('http://127.0.0.1:9337/json/version'))
    with connect(ver['webSocketDebuggerUrl'], max_size=200*1024*1024) as ws:
        sid=[0]
        def send(method,**params):
            sid[0]+=1; ws.send(json.dumps({'id':sid[0],'method':method,'params':params}))
            while True:
                m=json.loads(ws.recv(timeout=120))
                if m.get('id')==sid[0]:
                    if 'error' in m: raise RuntimeError(m['error'])
                    return m.get('result',{})
        infos=[t for t in json.load(urllib.request.urlopen('http://127.0.0.1:9337/json/list')) if t['type']=='page']
        tgt=[t for t in infos if 'parity_runner' in t.get('url','')][0]
        sess=send('Target.attachToTarget',targetId=tgt['id'],flatten=True)['sessionId']
        mid=[9000]
        def p(method,**params):
            mid[0]+=1
            ws.send(json.dumps({'id':mid[0],'method':method,'params':params,'sessionId':sess}))
            while True:
                m=json.loads(ws.recv(timeout=180))
                if m.get('id')==mid[0]:
                    if 'error' in m: raise RuntimeError(m['error'])
                    return m.get('result',{})
        p('Page.enable')
        if nav_url:
            p('Page.navigate', url=nav_url)
        title=''
        deadline = time.time() + max_wait_s
        while time.time() < deadline:
            time.sleep(0.5)
            ev = p('Runtime.evaluate', expression='document.title', returnByValue=True)
            title = ev['result']['value']
            if title in wait_titles: break
        out = p('Runtime.evaluate', expression=expr_out, returnByValue=True)['result']['value']
        return title, out

if __name__ == '__main__':
    url = sys.argv[1] if len(sys.argv) > 1 else None
    title, out = run_cdp(url)
    body = out.replace('DONE ','',1) if isinstance(out,str) and out.startswith('DONE') else out
    open('/home/aaron/perler_review/verify/parity_result.json','w').write(body or '')
    print((out or '')[:9000])
