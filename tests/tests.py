#!/usr/bin/env python3

import requests
import json

url = 'http://localhost:3000'
headers = {'Content-Type': 'application/json'}

def t1():
    response = requests.post(url + '/checkin/request', headers = headers, data = json.dumps({
        'from': 21,
        'from_username': 'rahul',
        'to': 25,
        'flight_id': 9774,
        'flight_time': '2016-09-23T12:00:00Z'
    }))
    print(response.status_code)
    print(response.text)

def t2():
    response = requests.post(url + '/checkin/update', headers = headers, data = json.dumps({
        'from': 25,
        'to': 21,
        'flight_id': 9774,
        'flight_time': '2016-09-23T12:00:00Z',
        'request_type': 'accepted'
    }))
    print(response.status_code)
    print(response.text)

def t3():
    response = requests.post(url + '/like', headers = headers, data = json.dumps({
        'from_user': 25,
        'to_user': 21,
        'from_username': 'rahul',
        'to_username': 'jaison'
    }))
    print(response.status_code)
    print(response.text)

#t1()
#t2()
t3()
