#!/usr/bin/env python3
"""Create an immutable CodeBuild input containing only deployment sources."""
import argparse, hashlib, json, pathlib, zipfile

REPO = pathlib.Path(__file__).resolve().parents[3]
SKIP = {'.git', 'node_modules', '.output', '.tanstack', '.terraform', 'artifacts', 'tools', '__pycache__'}

def package(destination):
    repo = REPO.resolve()
    destination = pathlib.Path(destination).resolve()
    if destination.is_relative_to(repo):
        raise ValueError('Write the deployment archive outside the repository.')
    files = [repo / name for name in ('package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml')]
    files += [p for p in (repo/'intranet').rglob('*') if p.is_file() and not p.is_symlink() and not any(part in SKIP for part in p.relative_to(repo).parts)
              and not p.name.startswith('.env') and not any(suffix in p.name for suffix in ('.tfstate', '.tfplan'))
              and not p.name.endswith(('.tfvars', '.backend.hcl', '.zip', '.tsbuildinfo'))]
    with zipfile.ZipFile(destination, 'w', zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(files):
            name=path.relative_to(repo).as_posix()
            data=path.read_bytes()
            if name == 'package.json':
                manifest=json.loads(data)
                manifest['scripts'] = {}  # Root commands are not used by the isolated build.
                data=(json.dumps(manifest,indent=2)+'\n').encode()
            info=zipfile.ZipInfo(name, date_time=(2026,1,1,0,0,0))
            info.compress_type=zipfile.ZIP_DEFLATED
            archive.writestr(info, data)
    return hashlib.sha256(destination.read_bytes()).hexdigest()

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('destination',help='Archive path outside the repo, e.g. /tmp/backoffice-source.zip')
    args=parser.parse_args()
    print(package(args.destination))
