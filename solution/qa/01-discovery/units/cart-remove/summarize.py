import json,re,sys
t=sys.stdin.read()
status=t.split('\n',1)[0].strip()
hdr,_,body=t.replace('\r','').partition('\n\n')
loc=[l for l in hdr.split('\n') if l.lower().startswith(('location','content-type','set-cookie'))]
loc=[re.sub(r'=[^;]+;','=<v>;',l,1) if l.lower().startswith('set-cookie') else l for l in loc]
print(status, loc)
try:
    d=json.loads(body)
    out={k:(v if not isinstance(v,str) or len(v)<120 else '<%d chars>'%len(v)) for k,v in d.items() if k!='$type'}
    print(' json:',out)
    if 'cartHtml' in d:
        print(' lines left:',re.findall(r"cartItemId=(\d+)'",d['cartHtml']),'subtotal:',re.findall(r'Subtotal.*?<td[^>]*>([^<]+)',d.get('totalsHtml',''),re.S))
except Exception as e:
    print(' body(non-json,%d bytes):'%len(body), re.sub(r'\s+',' ',body)[:200])
