import importlib.util
import json
from pathlib import Path
from types import SimpleNamespace
import unittest

spec = importlib.util.spec_from_file_location('identity', Path(__file__).resolve().parents[1]/'tailscale-identity.py')
identity = importlib.util.module_from_spec(spec)
spec.loader.exec_module(identity)

class IdentityTests(unittest.TestCase):
    def test_personal_identity_comes_from_whois_for_the_exact_address(self):
        calls = []
        def runner(args, **kwargs):
            calls.append(args)
            self.assertTrue(kwargs['check'])
            return SimpleNamespace(stdout=json.dumps({'Node': {'Addresses': ['100.100.1.2/32']}, 'UserProfile': {'ID': 123, 'LoginName': 'ORGANIZER@github'}}))
        self.assertEqual(identity.lookup('100.100.1.2', runner), {'ip':'100.100.1.2','login':'organizer@github'})
        self.assertEqual(calls, [['tailscale', 'whois', '--json', '100.100.1.2']])

    def test_non_tailnet_addresses_cannot_invoke_whois(self):
        for ip in ['127.0.0.1','10.203.0.10','100.63.1.2','100.128.1.2','::1','100.100.1.2;id']:
            with self.subTest(ip=ip), self.assertRaises(ValueError):
                identity.lookup(ip, lambda *a,**k:self.fail('WhoIs must not be called'))

    def test_service_nodes_missing_owners_and_address_mismatch_are_denied(self):
        for node,user in [
            ({'Tags':['tag:service'],'Addresses':['100.100.1.2/32']},{'ID':123,'LoginName':'organizer@github'}),
            ({'Addresses':['100.100.1.3/32']},{'ID':123,'LoginName':'organizer@github'}),
            ({'Addresses':['100.100.1.2/32']},{'LoginName':'organizer@github'}),
            ({'Addresses':['100.100.1.2/32']},{'ID':123,'LoginName':'bad,organizer@github'}),
        ]:
            with self.subTest(node=node,user=user), self.assertRaises(ValueError):
                identity.lookup('100.100.1.2',lambda *a,**k:SimpleNamespace(stdout=json.dumps({'Node':node,'UserProfile':user})))

if __name__=='__main__':unittest.main()
