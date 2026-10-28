import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import zipfile

spec=importlib.util.spec_from_file_location('package_source', Path(__file__).resolve().parents[1]/'package-source.py')
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class PackageTests(unittest.TestCase):
    def test_excludes_secrets_local_commands_and_generated_files(self):
        with tempfile.TemporaryDirectory() as directory:
            base=Path(directory)
            repo=base/'repo'
            fixture={
                'package.json':json.dumps({'scripts':{'dev':'vite','local:utility':'LOCAL_TOOL_CANARY'}}),
                'pnpm-lock.yaml':'lockfileVersion: 9.0\n',
                'pnpm-workspace.yaml':'packages: [intranet]\n',
                'intranet/apps/backoffice/src/index.ts':'export {}',
                'intranet/apps/backoffice/.env.local':'SECRET_CANARY',
                'intranet/apps/backoffice/node_modules/private.txt':'SECRET_CANARY',
                'intranet/apps/backoffice/.output/private.txt':'SECRET_CANARY',
                'intranet/infra/aws/production.tfvars':'SECRET_CANARY',
                'intranet/infra/aws/production.backend.hcl':'SECRET_CANARY',
                'intranet/infra/aws/terraform.tfstate.backup':'SECRET_CANARY',
                'intranet/infra/aws/.terraform/providers/private.txt':'SECRET_CANARY',
                'tools/local-utility/index.mjs':'LOCAL_TOOL_CANARY',
            }
            for name,content in fixture.items():
                path=repo/name; path.parent.mkdir(parents=True,exist_ok=True);path.write_text(content)
            previous=module.REPO
            module.REPO=repo
            try:
                first=base/'first.zip';second=base/'second.zip'
                self.assertEqual(module.package(first),module.package(second))
                with zipfile.ZipFile(first) as archive:
                    self.assertIn('intranet/apps/backoffice/src/index.ts',archive.namelist())
                    content=b'\n'.join(archive.read(name) for name in archive.namelist())
                    self.assertNotIn(b'SECRET_CANARY',content)
                    self.assertNotIn(b'LOCAL_TOOL_CANARY',content)
                with self.assertRaises(ValueError):module.package(repo/'bad.zip')
            finally: module.REPO=previous

if __name__=='__main__':unittest.main()
