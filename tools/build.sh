#!/usr/bin/env bash
# Bina index.html + _app.js daripada src.html.
# Guna: tools/build.sh [DIR]   (DIR mengandungi src.html; lalai = folder semasa)
# Tailwind: guna ./tailwindcss (CLI standalone) jika ada, jika tidak npx tailwindcss@3.4.17
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
DIR="$(cd "${1:-.}" && pwd)"
TMPCFG="$(mktemp -t twcfg.XXXX).cjs"
sed "s#content: \[[^]]*\]#content: ['$DIR/src.html']#" "$HERE/tw.config.js" > "$TMPCFG"
if [ -x "$HERE/tailwindcss" ]; then TW="$HERE/tailwindcss"; else TW="npx --yes tailwindcss@3.4.17"; fi
$TW -c "$TMPCFG" -i "$HERE/in.css" -o "$DIR/_out.css" --minify 2>&1 | tail -1
rm -f "$TMPCFG"
python3 - "$DIR" <<'PY'
import re,sys,os
d=sys.argv[1]
s=open(os.path.join(d,'src.html')).read()
css=open(os.path.join(d,'_out.css')).read().strip()
assert '</style>\n</head>' in s
o=s.replace('</style>\n</head>','</style>\n<style id="tw-compiled">\n'+css+'\n</style>\n</head>',1)
open(os.path.join(d,'index.html'),'w').write(o)
m=re.findall(r'<script>(.*?)</script>',s,re.S)
app=[x for x in m if 'stockJournalApp' in x][0]
open(os.path.join(d,'_app.js'),'w').write(app)
print('index',len(o),'app.js',len(app))
PY
rm -f "$DIR/_out.css"
node --check "$DIR/_app.js" && echo SYNTAX-OK
