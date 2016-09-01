#!/usr/bin/env python3

import requests
import json
import os

url = 'http://localhost:3000'
#url = 'http://api.earthly58.hasura-app.io'
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

def t4():
    accessToken = os.environ['LINKEDIN'] #The linkedin access token set on the env var to prevent it getting added to the git repo
    response = requests.get(url + '/linkedin-profile/' + accessToken, headers = headers)
    print(response.status_code)
    print(response.text)

def t5():
    accessToken = os.environ['FB'] #The linkedin access token set on the env var to prevent it getting added to the git repo
    response = requests.post(url + '/mutual-friends', headers = headers, data=json.dumps(
        {
            'myToken': accessToken,
            'otherId': '100001410587055' #This is a string, not an integer
        }))
    print(response.status_code)
    print(response.text)


#t1()
#t2()
#t3()
t5()
