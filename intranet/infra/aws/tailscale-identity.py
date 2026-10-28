"""Private, read-only identity lookup. Only the app security group can reach it."""
import http.server
import ipaddress
import json
import subprocess
import sys
from urllib.parse import parse_qs, urlsplit

TAILNET = ipaddress.ip_network('100.64.0.0/10')

def lookup(ip, runner=subprocess.run):
    address = ipaddress.ip_address(ip)
    if address not in TAILNET:
        raise ValueError('Not a Tailscale IPv4 address')
    result = runner(['tailscale', 'whois', '--json', str(address)], capture_output=True, text=True, timeout=2, check=True)
    data = json.loads(result.stdout)
    node, user = data.get('Node', {}), data.get('UserProfile', {})
    login = user.get('LoginName')
    if node.get('Tags') or not user.get('ID') or not isinstance(login, str) or not login or any(c.isspace() for c in login) or ',' in login:
        raise ValueError('Personal identity required')
    addresses = [ipaddress.ip_interface(value).ip for value in node.get('Addresses', [])]
    if address not in addresses:
        raise ValueError('Identity address mismatch')
    return {'ip': str(address), 'login': login.lower()}

class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        url = urlsplit(self.path)
        query = parse_qs(url.query)
        if url.path != '/identity' or set(query) != {'ip'} or len(query['ip']) != 1:
            self.reply(404, {'error': 'Not found'})
            return
        try:
            result = lookup(query['ip'][0])
        except (ValueError, subprocess.CalledProcessError):
            self.reply(401, {'error': 'Personal Tailscale identity required'})
        except (OSError, subprocess.TimeoutExpired):
            self.reply(503, {'error': 'Identity unavailable'})
        else:
            self.reply(200, result)

    def reply(self, status, payload):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass  # Do not log identities, queries, or Tailscale responses.

if __name__ == '__main__':
    http.server.ThreadingHTTPServer((sys.argv[1], 3101), Handler).serve_forever()
