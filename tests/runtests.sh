#!/usr/bin/env bash
# Jalankan semua suite ujian dalam folder semasa (perlu _app.js dan Code.gs)
fail=0
for f in logic*.js gas_test*.js; do
  out=$(node "$f" 2>&1); rc=$?
  nf=$(echo "$out" | grep -c '^FAIL')
  last=$(echo "$out" | tail -1)
  if [ $rc -ne 0 ] || [ "$nf" -gt 0 ]; then echo "GAGAL  $f ($nf FAIL, rc=$rc)"; echo "$out" | grep -E 'FAIL|Error' | head -5; fail=1
  else echo "LULUS  $f  [$(echo "$out" | grep -c '^ok')] $last" | cut -c1-110; fi
done
[ $fail -eq 0 ] && echo "=== SEMUA SUITE LULUS ===" || { echo "=== ADA KEGAGALAN ==="; exit 1; }
