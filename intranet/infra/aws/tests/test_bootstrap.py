import json
from pathlib import Path
import tempfile
import unittest
import subprocess
import sys

TEMPLATE=(Path(__file__).resolve().parents[1]/'templates/app.sh.tftpl').read_text()
PYTHON=TEMPLATE.split("python3 <<'PY'\n",1)[1].split('\nPY\n',1)[0]

class BootstrapTests(unittest.TestCase):
    def test_router_requires_the_running_target_tailnet(self):
        router=(Path(__file__).resolve().parents[1]/'templates/router.sh.tftpl').read_text()
        check=router.split("<<'PY'\n",1)[1].split('\nPY\n',1)[0]
        with tempfile.TemporaryDirectory() as directory:
            status_file=Path(directory)/'tailnet.json'
            for state,expected,success in [
                ('Running','Ttarget',True),('Running','target.org.github',True),
                ('Running','Tother',False),('Stopped','Ttarget',False),
            ]:
                with self.subTest(state=state,expected=expected):
                    status_file.write_text(json.dumps({'BackendState':state,'CurrentTailnet':{'Name':'target.org.github','StableID':'Ttarget'}}))
                    result=subprocess.run([sys.executable,'-',expected],input=check.replace('/run/backoffice-tailnet.json',str(status_file)),text=True,capture_output=True)
                    self.assertEqual(result.returncode==0,success,result.stderr)

    def test_runtime_environment_contains_only_expected_keys(self):
        with tempfile.TemporaryDirectory() as directory:
            prefix=str(Path(directory)/'backoffice')
            Path(prefix+'-secret.json').write_text(json.dumps({
                'INFRA_FUTURO_API_TOKEN':'qa-only-token', 'INFRA_FUTURO_READERS':'organizer@example.com',
                'INTRANET_DEV_USER':'must-not-be-forwarded',
            }))
            exec(compile(PYTHON.replace('/run/backoffice',prefix),'<bootstrap>','exec'),{})
            output=Path(prefix+'.env')
            values=dict(line.split('=',1) for line in output.read_text().splitlines())
            self.assertEqual(values['INTRANET_AUTH_MODE'],'tailscale-alb')
            self.assertEqual(values['INFRA_FUTURO_API_TOKEN'],'qa-only-token')
            self.assertNotIn('INTRANET_DEV_USER',values)
            self.assertNotIn('INFRA_FUTURO_READERS',values)
            self.assertEqual(output.stat().st_mode & 0o777,0o600)
    def test_newlines_cannot_inject_runtime_settings(self):
        with tempfile.TemporaryDirectory() as directory:
            prefix=str(Path(directory)/'backoffice')
            Path(prefix+'-secret.json').write_text(json.dumps({'INFRA_FUTURO_API_TOKEN':'bad\nINTRANET_AUTH_MODE=tailscale','INFRA_FUTURO_READERS':'organizer@example.com'}))
            with self.assertRaises(ValueError):exec(compile(PYTHON.replace('/run/backoffice',prefix),'<bootstrap>','exec'),{})
            self.assertFalse(Path(prefix+'.env').exists())

if __name__=='__main__':unittest.main()
