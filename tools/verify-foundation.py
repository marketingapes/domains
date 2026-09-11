#!/usr/bin/env python3
"""Foundation v1.2 adoption gate.

The frozen validator globs `domains/*.json` relative to its own working directory.
This repo stores manifests as `<tenant>/domain.json`. The validator is FROZEN and is
never edited to fit the repo -- instead this wrapper stages the repo's canonical 14
into the layout the frozen validator expects, in a throwaway directory, and runs the
frozen validator unmodified.

Fails if:
  * any frozen artifact's SHA-256 differs from foundation.sha256
  * the canonical tenant set is not exactly the 14
  * the frozen validator exits non-zero
  * any manifest fails schema validation
  * jsonschema is not installed (fails CLOSED - a skipped schema step is never a PASS)

Usage:  python3 tools/verify-foundation.py
"""
import hashlib, json, os, shutil, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CANON = ["BTL","NIL","DIHAC","LFMA","MA","KG","SLIQ","CGG","DDM","FPLB","PX","RI","TNT","TOSS"]
FROZEN = ["domain.schema.json", "portfolio.json", "validate.py"]

def sha(p):
    with open(p, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()

def fail(msg):
    print(f"  FAIL  {msg}")
    return 1

def main():
    os.chdir(ROOT)
    rc = 0

    # ---- 1. frozen hashes -------------------------------------------------
    print("== frozen hash comparison ==")
    manifest_path = "foundation.sha256"
    if not os.path.exists(manifest_path):
        return fail("foundation.sha256 missing - cannot prove the artifacts are frozen")
    expected = {}
    for line in open(manifest_path):
        line = line.strip()
        if not line:
            continue
        h, p = line.split(None, 1)
        expected[p.strip()] = h
    checked = 0
    for p, want in sorted(expected.items()):
        if not os.path.exists(p):
            rc = fail(f"{p} listed in foundation.sha256 but missing from the tree")
            continue
        got = sha(p)
        if got != want:
            rc = fail(f"{p} hash drift\n          expected {want}\n          actual   {got}")
        else:
            checked += 1
    print(f"  {checked}/{len(expected)} artifacts byte-identical to the frozen manifest")

    # ---- 2. exact tenant set ---------------------------------------------
    print("== canonical tenant set ==")
    present, extra = [], []
    for t in CANON:
        if os.path.exists(f"{t.lower()}/domain.json"):
            present.append(t)
        else:
            rc = fail(f"canonical tenant {t} has no {t.lower()}/domain.json")
    for d in sorted(os.listdir(".")):
        f = f"{d}/domain.json"
        if os.path.isdir(d) and os.path.exists(f) and d.upper() not in CANON:
            extra.append(d)
    for d in extra:
        print(f"  note  {d}/domain.json is present and NOT part of the canonical 14 "
              f"(excluded from the foundation; its site folder is left alone)")
    # a non-canonical manifest must never claim a canonical tenant_id
    for d in extra:
        try:
            tid = json.load(open(f"{d}/domain.json")).get("tenant_id")
        except Exception:
            tid = None
        if tid in CANON:
            rc = fail(f"{d}/domain.json claims canonical tenant_id {tid}")
    print(f"  {len(present)}/{len(CANON)} canonical manifests present")

    # ---- 3. run the FROZEN validator on a staged layout -------------------
    print("== frozen validator (staged layout) ==")
    tmp = tempfile.mkdtemp(prefix="foundation-verify-")
    try:
        os.makedirs(f"{tmp}/domains")
        for t in present:
            shutil.copyfile(f"{t.lower()}/domain.json", f"{tmp}/domains/{t.lower()}.json")
        for f in FROZEN:
            shutil.copyfile(f, f"{tmp}/{os.path.basename(f)}")
        r = subprocess.run([sys.executable, "validate.py"], cwd=tmp,
                           capture_output=True, text=True)
        for line in r.stdout.splitlines():
            print("  " + line.rstrip())
        if r.stderr.strip():
            print("  stderr:", r.stderr.strip()[:400])
        if r.returncode != 0:
            rc = fail(f"frozen validator exited {r.returncode}")

        # ---- 4. schema validation ---------------------------------------
        print("== schema validation ==")
        try:
            import jsonschema
            s = json.load(open(f"{tmp}/domain.schema.json"))
            V = jsonschema.Draft7Validator(s)
            ok = 0
            for t in present:
                errs = list(V.iter_errors(json.load(open(f"{t.lower()}/domain.json"))))
                if errs:
                    rc = fail(f"{t}: {errs[0].message[:160]}")
                else:
                    ok += 1
            print(f"  schema conformance: {ok}/{len(CANON)}")
            if ok != len(CANON):
                rc = 1
        except ImportError:
            # FAIL CLOSED. A verifier that skips schema validation must never report PASS.
            rc = fail("jsonschema is not installed - schema validation could not run "
                      "(pip install jsonschema). Refusing to report PASS without it.")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    print()
    print("FOUNDATION VERIFY:", "PASS" if rc == 0 else "FAIL")
    return rc

if __name__ == "__main__":
    sys.exit(main())
