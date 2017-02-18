#!/usr/bin/env python3

import json
import requests
import os, sys

if not os.environ['TOKEN']:
    print ('Expecting API token as env var TOKEN')
    print ('Usage: TOKEN=<...> ./delete-users.py')
    sys.exit(1)

url = 'http://auth.earthly58.hasura-app.io'
headers = {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + os.environ['TOKEN']}

response = requests.get(url + '/admin/users', headers = headers)
print(response.status_code)

if response.status_code != 200:
    sys.exit(1)

users = json.loads(response.text)

users = [u for u in users['users'] if ('admin' not in u['roles'])]
users = [u['id'] for u in users]
print (users)

y = input('Please confirm if you want to delete these users (y/n): ')
if y.strip() == 'y':
    for u in users:
        response = requests.post(url + '/admin/user/delete', headers = headers, data=json.dumps({'hasura_id': u}))
        print (response.status_code)
        print (response.text)
