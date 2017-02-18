#!/usr/bin/env python3

import json
import requests
import os, sys

if not os.environ['TOKEN']:
    print ('Expecting API token as env var TOKEN')
    print ('Usage: TOKEN=<...> ./delete-data.py')
    sys.exit(1)

url = 'http://data.earthly58.hasura-app.io'
headers = {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + os.environ['TOKEN']}

tables = ['like', 'message', 'checkin', 'user_flight', 'user_education', 'user_interest', 'user_experience', 'user']

print (tables)
y = input('Please confirm if you want to delete data from these tables (y/n): ')
if y.strip() == 'y':
    for t in tables:
        response = requests.post(url + '/api/1/table/' + t + '/delete', headers = headers, data=json.dumps({'where': {}}))
        print (response.status_code)
        print (response.text)
